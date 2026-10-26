'use strict';

/**
 * Text-only brand SVG gate (ADR-011).
 * An unset or empty document is denied. A directory with zero SVGs passes.
 */

const fs = require('fs');
const path = require('path');

const MAX_SVG_BYTES = 8192;

function checkSvg(bytes) {
  if (bytes === undefined || bytes === null || bytes === '') {
    return { ok: false, hits: ['unset or empty'] };
  }
  const buf = Buffer.isBuffer(bytes) ? bytes : Buffer.from(String(bytes));
  if (buf.length === 0) {
    return { ok: false, hits: ['unset or empty'] };
  }
  const hits = [];
  if (buf.length > MAX_SVG_BYTES) hits.push('oversize');
  const text = buf.toString('utf8');
  if (text.trim() === '') hits.push('unset or empty');
  if (/<image(?:\s|\/|>)/i.test(text)) hits.push('image');
  if (/data:/i.test(text)) hits.push('data-uri');
  if (/<metadata(?:\s|\/|>)/i.test(text)) hits.push('metadata');
  if (/rdf:RDF|<xmpmeta\b|<xmp[\s>]/i.test(text)) hits.push('rdf-xmp');
  if (/<(?:linear|radial)Gradient\b/i.test(text)) hits.push('gradient');
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
  checkSvg,
  listSvgFiles,
};
