'use strict';

/**
 * Fail-closed public-safety scan for canon, docs, previews, workflows,
 * the MCP server, scripts and tests. Exit 0 only when every target exists,
 * every file is non-empty, every JSON file parses, and no pattern hits.
 *
 * Operator handles are SHA-256 hashes in SAFETY_SCAN_SHA256_LIST
 * (comma-separated lowercase hex of lowercase tokens). The list is never
 * written here. Outside CI, an unset or empty list skips and the CLI logs
 * that skip. When CI=true, an unset, empty, or whitespace-only list exits 1.
 * A malformed entry exits 1 in either environment. Messages name the
 * variable and never print a value.
 *
 * Long ids are runs of length >= 25 that mix letters and digits. Three shapes
 * are excluded so the public tree stays clean: kebab-case design tokens
 * (lowercase hyphen segments, with a short scale such as 3xl), persona
 * asset slugs vi_type_slot_vNNN, and brand filenames
 * brand_{asset}_{variant}_vNNN. Asset and variant are at most 27 characters
 * of lowercase letters, digits, and hyphens, so a long random middle cannot
 * hide in the brand shape. A trailing extension is not part of the id run.
 * A 64-hex value of a key ending in sha256 stays allowlisted. The brand
 * directory is optional: a missing brand target is skipped.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const OPERATOR_ENV = 'SAFETY_SCAN_SHA256_LIST';

const DEFAULT_TARGETS = [
  'canon',
  'DESIGN.md',
  'SKILL.md',
  'README.md',
  'AGENTS.md',
  'CLAUDE.md',
  'assets/README.md',
  'mcp-server.js',
  'preview',
  '.github',
  'brand',
  'scripts',
  'test',
];

const OPTIONAL_TARGETS = new Set(['brand']);

function joinDot(parts) {
  return parts.join('.');
}

function pathSource() {
  const users = 'Users';
  const home = 'home';
  const slash = '[/\\\\]';
  const unixUsers = slash + users + slash;
  const unixHome = slash + home + slash;
  const winUsers = `[A-Za-z]:${slash}${users}${slash}`;
  const tilde = ('~' + '/').replace(/[\\^$*+?.()|[\]{}]/g, '\\$&');
  return [unixUsers, unixHome, winUsers, tilde].join('|');
}

function patternSource() {
  const googleSlash = joinDot(['google', 'com/']);
  const userContent = joinDot(['googleusercontent', 'com']);
  const driveUser = joinDot(['drive', 'usercontent']);
  const shortLink = joinDot(['goo', 'gl']);
  const driveBare = joinDot(['drive', 'google', 'com']);
  const docsBare = joinDot(['docs', 'google', 'com']);
  const escaped = [googleSlash, userContent, driveUser, shortLink, driveBare, docsBare]
    .map((host) => host.replace(/\./g, '\\.'))
    .join('|');
  const queryId = '[?&]id=[A-Za-z0-9_-]{10,}';
  const ipv4 = '\\b\\d{1,3}(?:\\.\\d{1,3}){3}\\b';
  return {
    hosts: escaped,
    queryId,
    home: pathSource(),
    ipv4,
  };
}

function isKebabToken(token) {
  const body = token.replace(/^-+/, '');
  if (!body.includes('-') || !/^[a-z0-9-]+$/.test(body)) return false;
  const parts = body.split('-');
  if (parts.some((part) => part.length === 0)) return false;
  return parts.every((part) => /^[a-z]+$/.test(part) || /^[0-9]+[a-z]{1,3}$/.test(part));
}

function isAssetSlug(token) {
  const vi = '(violet|wisteria|xylia|yarrow|zinnia)';
  const type = '(full|chibi|bg|sheet)';
  return new RegExp(`^${vi}_${type}_[a-z0-9-]+_v[0-9]{3}$`).test(token);
}

function isBrandFile(token) {
  const part = '[a-z0-9-]{1,27}';
  return new RegExp(`^brand_${part}_${part}_v[0-9]{3}$`).test(token);
}

function isLongId(token) {
  if (token.length < 25) return false;
  if (!/^[A-Za-z0-9_-]+$/.test(token)) return false;
  if (!/[A-Za-z]/.test(token) || !/[0-9]/.test(token)) return false;
  if (isKebabToken(token) || isAssetSlug(token) || isBrandFile(token)) return false;
  return true;
}

function loadOperatorHashes() {
  const raw = process.env[OPERATOR_ENV];
  const inCi = process.env.CI === 'true';
  if (raw === undefined || String(raw).trim() === '') {
    if (inCi) return { skipped: false, missing: true, hashes: null, error: null };
    return { skipped: true, missing: false, hashes: null, error: null };
  }
  const hashes = String(raw).split(',').map((item) => item.trim()).filter(Boolean);
  const hex = /^[0-9a-f]{64}$/;
  if (hashes.length === 0 || hashes.some((item) => !hex.test(item))) {
    return { skipped: false, missing: false, hashes: null, error: 'malformed' };
  }
  return { skipped: false, missing: false, hashes: new Set(hashes), error: null };
}

function operatorHits(text, hashes) {
  const hits = [];
  const seen = new Set();
  for (const token of text.split(/[^A-Za-z0-9._-]+/)) {
    if (token.length < 2) continue;
    const lower = token.toLowerCase();
    if (seen.has(lower)) continue;
    seen.add(lower);
    const digest = crypto.createHash('sha256').update(lower).digest('hex');
    if (hashes.has(digest)) hits.push('operator-handle');
  }
  return hits;
}

function inspectSha256(text) {
  const hits = [];
  const ranges = [];
  const pair = /"([^"\\]*)"\s*:\s*"([^"\\]*)"/g;
  let match = pair.exec(text);
  while (match) {
    if (match[1].endsWith('sha256')) {
      if (/^[0-9a-f]{64}$/.test(match[2])) {
        ranges.push([match.index, match.index + match[0].length]);
      } else {
        hits.push('sha256-value');
      }
    }
    match = pair.exec(text);
  }
  let redacted = text;
  for (let index = ranges.length - 1; index >= 0; index -= 1) {
    const [start, end] = ranges[index];
    redacted = `${redacted.slice(0, start)}"":""${redacted.slice(end)}`;
  }
  return { hits, redacted };
}

function patternHits(text) {
  const hits = [];
  const source = patternSource();
  if (new RegExp(source.hosts).test(text)) hits.push('google-host');
  if (new RegExp(source.queryId).test(text)) hits.push('query-id');
  if (new RegExp(source.home, 'i').test(text)) hits.push('home-path');
  if (new RegExp(source.ipv4).test(text)) hits.push('ipv4');
  const tokens = text.match(/[A-Za-z0-9_-]{25,}/g) || [];
  if (tokens.some(isLongId)) hits.push('long-id');
  return hits;
}

function operatorFailure(operator) {
  if (operator.missing) return `${OPERATOR_ENV} is unset or empty`;
  if (operator.error) return `${OPERATOR_ENV} has a malformed entry`;
  return null;
}

/**
 * @param {string} text
 * @param {object} [operatorState]
 * @returns {{ ok: boolean, hits: string[], operatorCheck: string }}
 */
function scanText(text, operatorState) {
  const operator = operatorState || loadOperatorHashes();
  const hits = [];
  let operatorCheck = 'checked';
  if (operator.skipped) operatorCheck = 'skipped';
  else if (operator.missing || operator.error) {
    operatorCheck = operator.missing ? 'missing' : 'invalid';
    hits.push(operatorFailure(operator));
  } else {
    hits.push(...operatorHits(text, operator.hashes));
  }
  const sha = inspectSha256(text);
  hits.push(...sha.hits);
  hits.push(...patternHits(sha.redacted));
  return { ok: hits.length === 0, hits, operatorCheck };
}

function listFiles(target) {
  const stat = fs.statSync(target);
  if (stat.isDirectory()) {
    const out = [];
    for (const entry of fs.readdirSync(target, { withFileTypes: true })) {
      const full = path.join(target, entry.name);
      if (entry.isDirectory()) out.push(...listFiles(full));
      else if (entry.isFile()) out.push(full);
    }
    return out;
  }
  if (!stat.isFile()) {
    const error = new Error('not a file');
    error.code = 'ENOTFILE';
    throw error;
  }
  return [target];
}

/**
 * @param {string[]} targets
 * @param {string} [root]
 * @returns {{ ok: boolean, hits: string[], operatorCheck: string }}
 */
function contentOperator(operator) {
  if (operator.skipped) return operator;
  if (operator.missing || operator.error) {
    return { skipped: true, missing: false, hashes: null, error: null };
  }
  return operator;
}

function scanPaths(targets, root = process.cwd()) {
  const operator = loadOperatorHashes();
  const hits = [];
  let operatorCheck = 'checked';
  const failure = operatorFailure(operator);
  if (operator.skipped) operatorCheck = 'skipped';
  else if (failure) {
    operatorCheck = operator.missing ? 'missing' : 'invalid';
    hits.push(failure);
  }
  const perFile = contentOperator(operator);
  for (const rel of targets) {
    const full = path.resolve(root, rel);
    if (!fs.existsSync(full)) {
      if (OPTIONAL_TARGETS.has(rel)) continue;
      hits.push(`missing ${rel}`);
      continue;
    }
    let files;
    try {
      const stat = fs.statSync(full);
      if (stat.isFile() && stat.size === 0) {
        hits.push(`empty ${rel}`);
        continue;
      }
      files = listFiles(full);
    } catch (err) {
      hits.push(`unreadable ${rel}`);
      continue;
    }
    for (const file of files) {
      const display = path.relative(root, file);
      let text;
      try {
        const stat = fs.statSync(file);
        if (stat.size === 0) {
          hits.push(`empty ${display}`);
          continue;
        }
        text = fs.readFileSync(file, 'utf8');
      } catch (err) {
        hits.push(`unreadable ${display}`);
        continue;
      }
      if (file.endsWith('.json')) {
        try {
          JSON.parse(text);
        } catch (err) {
          hits.push(`invalid-json ${display}`);
          continue;
        }
      }
      const result = scanText(text, perFile);
      for (const hit of result.hits) hits.push(`${display}: ${hit}`);
    }
  }
  return { ok: hits.length === 0, hits, operatorCheck };
}

function main() {
  try {
    const targets = process.argv.slice(2);
    const result = scanPaths(targets.length > 0 ? targets : DEFAULT_TARGETS);
    if (result.operatorCheck === 'skipped') {
      console.error(`operator-handle check skipped: ${OPERATOR_ENV} is unset`);
    }
    if (!result.ok) {
      for (const hit of result.hits) console.error(hit);
      process.exit(1);
    }
  } catch (err) {
    console.error('public-safety scan failed');
    process.exit(1);
  }
}

module.exports = {
  DEFAULT_TARGETS,
  OPERATOR_ENV,
  isLongId,
  scanPaths,
  scanText,
};

if (require.main === module) main();
