'use strict';

/**
 * Fail-closed public-safety scan for canon, docs, the MCP server,
 * scripts and tests. Exit 0 only when every target exists, every file
 * is non-empty, every JSON file parses, and no pattern hits.
 *
 * Operator handles are an optional SHA-256 list in VIDESIGN_OPERATOR_SHA256
 * (comma-separated, lowercase hex of lowercase tokens). Unset skips the
 * check and logs that skip from the CLI. The list is never written here.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const OPERATOR_ENV = 'VIDESIGN_OPERATOR_SHA256';

const DEFAULT_TARGETS = [
  'canon',
  'DESIGN.md',
  'SKILL.md',
  'README.md',
  'AGENTS.md',
  'CLAUDE.md',
  'assets/README.md',
  'mcp-server.js',
  'scripts',
  'test',
];

function joinDot(parts) {
  return parts.join('.');
}

function patternSource() {
  const googleSlash = joinDot(['google', 'com/']);
  const userContent = joinDot(['googleusercontent', 'com']);
  const driveUser = joinDot(['drive', 'usercontent']);
  const shortLink = joinDot(['goo', 'gl']);
  const escaped = [googleSlash, userContent, driveUser, shortLink]
    .map((host) => host.replace(/\./g, '\\.'))
    .join('|');
  const queryId = '[?&]id=[A-Za-z0-9_-]{10,}';
  const homeUsers = '/' + 'Users' + '/';
  const homeDir = '/' + 'home' + '/';
  const ipv4 = '\\b\\d{1,3}(?:\\.\\d{1,3}){3}\\b';
  return {
    hosts: escaped,
    queryId,
    home: homeUsers.replace(/\//g, '\\/') + '|' + homeDir.replace(/\//g, '\\/'),
    ipv4,
  };
}

function isLongId(token) {
  if (token.length < 28) return false;
  if (!/^[A-Za-z0-9_-]+$/.test(token)) return false;
  if (!/[A-Z]/.test(token) || !/[0-9]/.test(token)) return false;
  return true;
}

function loadOperatorHashes() {
  const raw = process.env[OPERATOR_ENV];
  if (raw === undefined || raw === '') {
    return { skipped: true, hashes: null, error: null };
  }
  const hashes = raw.split(',').map((item) => item.trim()).filter(Boolean);
  const hex = /^[0-9a-f]{64}$/;
  if (hashes.length === 0 || hashes.some((item) => !hex.test(item))) {
    return { skipped: false, hashes: null, error: 'operator-hash-list' };
  }
  return { skipped: false, hashes: new Set(hashes), error: null };
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
  if (new RegExp(source.home).test(text)) hits.push('home-path');
  if (new RegExp(source.ipv4).test(text)) hits.push('ipv4');
  const tokens = text.match(/[A-Za-z0-9_-]{28,}/g) || [];
  if (tokens.some(isLongId)) hits.push('long-id');
  return hits;
}

/**
 * @param {string} text
 * @returns {{ ok: boolean, hits: string[], operatorCheck: string }}
 */
function scanText(text) {
  const operator = loadOperatorHashes();
  const hits = [];
  let operatorCheck = 'checked';
  if (operator.skipped) operatorCheck = 'skipped';
  else if (operator.error) {
    operatorCheck = 'invalid';
    hits.push(operator.error);
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
function scanPaths(targets, root = process.cwd()) {
  const hits = [];
  let operatorCheck = 'skipped';
  for (const rel of targets) {
    const full = path.resolve(root, rel);
    if (!fs.existsSync(full)) {
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
      const result = scanText(text);
      operatorCheck = result.operatorCheck;
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
