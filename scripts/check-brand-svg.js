'use strict';

/**
 * Fail-closed allow-list for brand SVG masters (ADR-011).
 * An unset or empty document is denied. A directory with zero SVGs passes.
 * Anything that is not on the allow-list is rejected.
 */

const fs = require('fs');
const path = require('path');

const MAX_SVG_BYTES = 8192;
const SVG_NS = 'http://www.w3.org/2000/svg';

const ELEMENTS = new Set(['svg', 'g', 'path', 'rect']);
const ATTRIBUTES = new Set([
  'xmlns',
  'viewBox',
  'd',
  'fill',
  'stroke',
  'x',
  'y',
  'width',
  'height',
  'rx',
  'transform',
  'data-role',
  'data-part',
]);

/** Canon signatures plus the two field neutrals. none and currentColor are not used. */
const PALETTE = new Set([
  '#8B5CF6',
  '#B4A7F2',
  '#D92B3A',
  '#F0A020',
  '#E13D9E',
  '#121214',
  '#F7F7F5',
]);

const NUMBER = '-?(?:\\d+\\.\\d+|\\d+|\\.\\d+)';
const PATH_DATA = /^[MLHVCSQTAZmlhvcsqtaz0-9\s,.\-+]+$/;
const TRANSFORM = new RegExp(
  `^translate\\(${NUMBER} ${NUMBER}\\) scale\\(${NUMBER}\\)$`,
);

function forbiddenNeedles() {
  return [
    ['/', 'Users', '/'].join(''),
    ['/', 'home', '/'].join(''),
    ['C:', '\\', 'Users'].join(''),
    ['Library', '/'].join(''),
    ['canva', '.', 'com'].join(''),
    ['google', '.', 'com/'].join(''),
    'googleusercontent',
  ];
}

function add(hits, hit) {
  if (!hits.includes(hit)) hits.push(hit);
}

function isPaletteColour(value) {
  return PALETTE.has(value.trim().toUpperCase());
}

function validateAttribute(element, name, value, hits) {
  if (/^on/i.test(name) || /:on/i.test(name)) {
    add(hits, 'handler');
    return;
  }
  if (name.includes(':')) {
    add(hits, 'namespace');
    return;
  }
  if (!ATTRIBUTES.has(name)) {
    add(hits, 'attribute');
    return;
  }
  if (name === 'xmlns' && element !== 'svg') {
    add(hits, 'attribute');
  }
  if (name === 'xmlns' && value !== SVG_NS) add(hits, 'namespace');
  if (name === 'viewBox' && !new RegExp(`^${NUMBER} ${NUMBER} ${NUMBER} ${NUMBER}$`).test(value)) {
    add(hits, 'attribute');
  }
  if (name === 'd' && !PATH_DATA.test(value)) add(hits, 'attribute');
  if ((name === 'fill' || name === 'stroke') && !isPaletteColour(value)) add(hits, 'colour');
  if (['x', 'y', 'width', 'height', 'rx'].includes(name) && !new RegExp(`^${NUMBER}$`).test(value)) {
    add(hits, 'attribute');
  }
  if (name === 'transform' && !TRANSFORM.test(value)) add(hits, 'attribute');
  if (name === 'data-role' && value !== 'text') add(hits, 'attribute');
  if (name === 'data-part' && value !== 'wordmark') add(hits, 'attribute');
}

function checkSvg(bytes) {
  if (bytes === undefined || bytes === null || bytes === '') {
    return { ok: false, hits: ['unset or empty'] };
  }
  const buf = Buffer.isBuffer(bytes) ? bytes : Buffer.from(String(bytes));
  if (buf.length === 0) return { ok: false, hits: ['unset or empty'] };
  const hits = [];
  if (buf.length > MAX_SVG_BYTES) add(hits, 'oversize');
  const text = buf.toString('utf8');
  if (text.includes('\uFEFF')) add(hits, 'bom');
  if (text.trim() === '') {
    add(hits, 'unset or empty');
    return { ok: false, hits };
  }
  for (const needle of forbiddenNeedles()) {
    if (text.includes(needle)) add(hits, 'pattern');
  }
  if (/javascript\s*:/i.test(text)) add(hits, 'javascript');
  if (/data\s*:/i.test(text)) add(hits, 'data-uri');
  if (/<!--/.test(text)) add(hits, 'comment');
  if (/<!DOCTYPE|<!ENTITY/i.test(text)) add(hits, 'doctype');
  if (/<\?/.test(text)) add(hits, 'processing-instruction');
  if (/url\s*\(\s*(?!#)/i.test(text)) add(hits, 'external-url');

  let index = 0;
  const length = text.length;

  function skipSpace() {
    while (index < length && /\s/.test(text[index])) index += 1;
  }

  function parseTag() {
    if (text.startsWith('<!--', index)) {
      add(hits, 'comment');
      const end = text.indexOf('-->', index + 4);
      index = end < 0 ? length : end + 3;
      return { comment: true };
    }
    if (text.startsWith('<!', index) || text.startsWith('<?', index)) {
      add(hits, 'doctype');
      index = length;
      return null;
    }
    const closing = text[index + 1] === '/';
    index += closing ? 2 : 1;
    const nameMatch = /^[A-Za-z][\w:.-]*/.exec(text.slice(index));
    if (!nameMatch) {
      add(hits, 'element');
      index = length;
      return null;
    }
    const name = nameMatch[0];
    index += name.length;
    if (name.includes(':') || !ELEMENTS.has(name)) add(hits, 'element');
    const attrs = {};
    while (index < length) {
      skipSpace();
      if (text.startsWith('/>', index)) {
        index += 2;
        return { name, closing, self: true, attrs };
      }
      if (text[index] === '>') {
        index += 1;
        return { name, closing, self: false, attrs };
      }
      const attrMatch = /^[A-Za-z_:][\w:.-]*/.exec(text.slice(index));
      if (!attrMatch) {
        add(hits, 'attribute');
        index = length;
        return null;
      }
      const attrName = attrMatch[0];
      index += attrName.length;
      skipSpace();
      if (text[index] !== '=') {
        add(hits, 'attribute');
        index = length;
        return null;
      }
      index += 1;
      skipSpace();
      const quote = text[index];
      if (quote !== '"') {
        add(hits, 'attribute');
        index = length;
        return null;
      }
      index += 1;
      const end = text.indexOf('"', index);
      if (end < 0) {
        add(hits, 'attribute');
        index = length;
        return null;
      }
      const value = text.slice(index, end);
      index = end + 1;
      if (Object.hasOwn(attrs, attrName)) add(hits, 'attribute');
      attrs[attrName] = value;
      validateAttribute(closing ? '' : name, attrName, value, hits);
    }
    add(hits, 'element');
    return null;
  }

  skipSpace();
  if (index >= length || text[index] !== '<') add(hits, 'text');
  const root = index < length && text[index] === '<' ? parseTag() : null;
  if (!root || root.comment || root.closing || root.name !== 'svg') add(hits, 'root');
  else {
    if (!Object.hasOwn(root.attrs, 'xmlns')) add(hits, 'xmlns');
    if (!Object.hasOwn(root.attrs, 'viewBox')) add(hits, 'viewBox');
    if (!root.self) {
      const stack = ['svg'];
      while (stack.length > 0 && index < length) {
        skipSpace();
        if (index >= length) break;
        if (text[index] !== '<') {
          const next = text.indexOf('<', index);
          const chunk = text.slice(index, next < 0 ? length : next);
          if (chunk.trim() !== '') add(hits, 'text');
          index = next < 0 ? length : next;
          continue;
        }
        const tag = parseTag();
        if (!tag) break;
        if (tag.comment) continue;
        if (tag.closing) {
          if (stack[stack.length - 1] !== tag.name) add(hits, 'element');
          else stack.pop();
        } else if (!tag.self) stack.push(tag.name);
      }
      if (stack.length > 0) add(hits, 'element');
    }
  }
  skipSpace();
  if (index < length && text.slice(index).trim() !== '') add(hits, 'text');

  return { ok: hits.length === 0, hits };
}

function listSvgFiles(dir) {
  if (dir === undefined || dir === null || String(dir).trim() === '') {
    return { ok: false, hits: ['unset or empty'], files: [] };
  }
  const root = String(dir);
  if (!fs.existsSync(root)) {
    return { ok: false, hits: [`missing ${root}`], files: [] };
  }
  const files = [];
  function walk(current) {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.isFile() && entry.name.endsWith('.svg')) files.push(full);
    }
  }
  walk(root);
  files.sort();
  const hits = [];
  for (const file of files) {
    let bytes;
    try {
      bytes = fs.readFileSync(file);
    } catch (err) {
      hits.push(`${path.relative(root, file)}: unreadable`);
      continue;
    }
    const result = checkSvg(bytes);
    const rel = path.relative(root, file);
    for (const hit of result.hits) hits.push(`${rel}: ${hit}`);
  }
  return { ok: hits.length === 0, hits, files };
}

module.exports = {
  MAX_SVG_BYTES,
  PALETTE,
  checkSvg,
  listSvgFiles,
};
