'use strict';

/**
 * Fail-closed public-safety scan for canon, docs, previews, workflows,
 * the MCP server, scripts, shared primitives (lib), tests and the asset pipeline directory.
 * Exit 0 only when every target exists,
 * every file is non-empty, every JSON file parses, and no pattern hits.
 *
 * Long ids are runs of length >= 25 that mix letters and digits. Excluded
 * shapes: kebab-case design tokens (lowercase hyphen segments, with a short
 * scale such as 3xl), and persona asset slugs vi_type_slot_vNNN whose slot
 * is 1 to 27 characters. Brand filenames are excluded only in files under
 * brand/. The asset is one of mark, favicon, lockup, wordmark, social,
 * avatar, banner, icon or stripe, and the variant is 1 to 27 characters of
 * lowercase letters, digits and hyphens. Every top-level folder whose name
 * skeletons to brand is scanned. More than one such folder fails closed, and
 * so does a look-alike (a confusable letter, a small capital, a trailing
 * dot or space, an accent, or a format character inside the name). Format
 * characters, including ZWSP, ZWNJ, ZWJ, word joiner, BOM and soft hyphen,
 * are stripped before the name is compared, and combining marks are stripped
 * after NFKC and NFKD. Any top-level file or folder whose name is not plain
 * ASCII (`A-Z`, `a-z`, digits, `.`, `_`, `-`) fails closed, whatever it
 * resembles. A brand-skeleton name that is not a real directory (a file,
 * a symlink, or anything else) fails closed and is not followed. A split id,
 * a longer slot or variant, or the same filename
 * outside brand/ remains a long id. A trailing extension is not part of the
 * id run.
 * A 64-hex value of a key ending in sha256 stays allowlisted. Exact 64-hex
 * digests under brand/repo-banners/ (ADR-026) are allowlisted the same way;
 * other long ids in that folder still fail. The brand directory is optional:
 * a missing brand target is skipped.
 */

const fs = require('fs');
const path = require('path');

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
  'lib',
  'test',
  'pipeline',
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
  const slot = '[a-z0-9-]{1,27}';
  return new RegExp(`^${vi}_${type}_${slot}_v[0-9]{3}$`).test(token);
}

function isBrandFile(token) {
  const asset = '(mark|favicon|lockup|wordmark|social|avatar|banner|icon|stripe)';
  const variant = '[a-z0-9-]{1,27}';
  return new RegExp(`^brand_${asset}_${variant}_v[0-9]{3}$`).test(token);
}

const BRAND_CONFUSABLES = {
  '\u0430': 'a',
  '\u0251': 'a',
  '\u03b1': 'a',
  '\u1d00': 'a',
  '\u0185': 'b',
  '\u0432': 'b',
  '\u044c': 'b',
  '\u0299': 'b',
  '\u03b2': 'b',
  '\u0433': 'r',
  '\u0280': 'r',
  '\u043f': 'n',
  '\u0274': 'n',
  '\u03b7': 'n',
  '\u0578': 'n',
  '\u0501': 'd',
  '\u1d05': 'd',
};

const BRAND_FORMAT = /[\u00AD\u200B\u200C\u200D\u2060\uFEFF\p{Cf}]/gu;

function trimBrandDecorations(value) {
  let text = String(value).trim();
  let previous;
  do {
    previous = text;
    text = text.replace(/[.\s]+$/u, '').trim();
  } while (text !== previous);
  return text;
}

function brandSkeleton(name) {
  const stripped = String(name).replace(BRAND_FORMAT, '');
  const decomposed = stripped.normalize('NFKC').normalize('NFKD');
  const withoutMarks = decomposed.replace(/\p{M}/gu, '');
  const trimmed = trimBrandDecorations(withoutMarks);
  let skeleton = '';
  for (const ch of trimmed) {
    const lower = ch.toLowerCase();
    skeleton += BRAND_CONFUSABLES[lower] || lower;
  }
  return skeleton;
}

function isPlainBrandName(name) {
  return /^brand$/i.test(name);
}

const PLAIN_ASCII_NAME = /^[A-Za-z0-9._-]+$/;

function nonAsciiNameHits(root) {
  let entries;
  try {
    entries = fs.readdirSync(root, { withFileTypes: true });
  } catch (err) {
    return [];
  }
  const hits = [];
  for (const entry of entries) {
    if (!PLAIN_ASCII_NAME.test(entry.name)) hits.push('non-ascii-name');
  }
  return hits;
}

function isUnderBrand(display) {
  const normalized = String(display).split(path.sep).join('/');
  const head = normalized.split('/')[0];
  return brandSkeleton(head) === 'brand';
}

function isUnderRepoBanners(display) {
  const normalized = String(display).split(path.sep).join('/');
  return normalized === 'brand/repo-banners' || normalized.startsWith('brand/repo-banners/');
}

function isUnderChibiReference(display) {
  const normalized = String(display).split(path.sep).join('/');
  return normalized === 'canon/vwxyz/chibi' || normalized.startsWith('canon/vwxyz/chibi/');
}

function isExactSha256Hex(token) {
  return /^[0-9a-f]{64}$/.test(token);
}

function isRealDirectory(root, entry) {
  if (entry.isSymbolicLink()) return false;
  if (entry.isDirectory()) return true;
  try {
    const stat = fs.lstatSync(path.join(root, entry.name));
    return stat.isDirectory() && !stat.isSymbolicLink();
  } catch (err) {
    return false;
  }
}

function collectBrandDirs(root) {
  let entries;
  try {
    entries = fs.readdirSync(root, { withFileTypes: true });
  } catch (err) {
    return { dirs: [], lookalike: false, nonDirectory: false };
  }
  const dirs = [];
  let lookalike = false;
  let nonDirectory = false;
  for (const entry of entries) {
    if (brandSkeleton(entry.name) !== 'brand') continue;
    if (!isRealDirectory(root, entry)) {
      nonDirectory = true;
      continue;
    }
    dirs.push(path.join(root, entry.name));
    if (!isPlainBrandName(entry.name)) lookalike = true;
  }
  return { dirs, lookalike, nonDirectory };
}

function isLongId(token, options = {}) {
  if (token.length < 25) return false;
  if (!/^[A-Za-z0-9_-]+$/.test(token)) return false;
  if (!/[A-Za-z]/.test(token) || !/[0-9]/.test(token)) return false;
  if (isKebabToken(token) || isAssetSlug(token)) return false;
  if (options.inBrand && isBrandFile(token)) return false;
  if (options.inRepoBanners && isExactSha256Hex(token)) return false;
  return true;
}

function inspectSha256(text) {
  const hits = [];
  const ranges = [];
  const pair = /"([^"\\]*)"\s*:\s*"([^"\\]*)"/g;
  let match = pair.exec(text);
  while (match) {
    // Keys ending in sha256, and the canon request dedupe_key (it is a
    // SHA-256 digest by schema), stay allowlisted when the value is exact
    // 64-hex; anything else under those keys is a hit, never a pass. A
    // canonical ALL-CAPS {{PLACEHOLDER}} template token is allowlisted too
    // so fill-in skeletons can name digest fields without forging digests;
    // real values still have to be exact 64-hex.
    const digestKey = match[1].endsWith('sha256') || match[1] === 'dedupe_key';
    if (digestKey) {
      const canonicalPlaceholder = /^\{\{[A-Z][A-Z0-9_]*\}\}$/.test(match[2]);
      if (/^[0-9a-f]{64}$/.test(match[2]) || canonicalPlaceholder) {
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

function patternHits(text, options) {
  const hits = [];
  const source = patternSource();
  if (new RegExp(source.hosts).test(text)) hits.push('google-host');
  if (new RegExp(source.queryId).test(text)) hits.push('query-id');
  if (new RegExp(source.home, 'i').test(text)) hits.push('home-path');
  if (new RegExp(source.ipv4).test(text)) hits.push('ipv4');
  const tokens = text.match(/[A-Za-z0-9_-]{25,}/g) || [];
  if (tokens.some((token) => isLongId(token, options))) hits.push('long-id');
  return hits;
}

/**
 * @param {string} text
 * @param {object} [options]
 * @returns {{ ok: boolean, hits: string[] }}
 */
function scanText(text, options) {
  const hits = [];
  const sha = inspectSha256(text);
  hits.push(...sha.hits);
  hits.push(...patternHits(sha.redacted, options));
  return { ok: hits.length === 0, hits };
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
 * @returns {{ ok: boolean, hits: string[] }}
 */
function scanPaths(targets, root = process.cwd()) {
  const hits = [];
  hits.push(...nonAsciiNameHits(root));
  const scanDirectory = (full, relLabel) => {
    let files;
    try {
      const stat = fs.statSync(full);
      if (stat.isFile() && stat.size === 0) {
        hits.push(`empty ${relLabel}`);
        return;
      }
      files = listFiles(full);
    } catch (err) {
      hits.push(`unreadable ${relLabel}`);
      return;
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
        // ADR-026: repo-banner PNGs are binary exports. Scanning them as
        // text produces false home-path and long-id hits from compressed
        // bytes. Still require a non-empty file. Text files in the same
        // folder keep the ordinary scan.
        if (isUnderRepoBanners(display) && file.endsWith('.png')) continue;
        // ADR-028: the chibi reference PNGs are binary art for the same
        // reason. INDEX.json and the folder README are still scanned.
        if (isUnderChibiReference(display) && file.endsWith('.png')) continue;
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
      const result = scanText(text, {
        inBrand: isUnderBrand(display),
        inRepoBanners: isUnderRepoBanners(display),
      });
      for (const hit of result.hits) hits.push(`${display}: ${hit}`);
    }
  };
  for (const rel of targets) {
    if (rel === 'brand') {
      const found = collectBrandDirs(root);
      if (found.nonDirectory) hits.push('non-directory-brand');
      if (found.dirs.length === 0) {
        if (found.nonDirectory || OPTIONAL_TARGETS.has(rel)) continue;
        hits.push(`missing ${rel}`);
        continue;
      }
      if (found.dirs.length > 1) hits.push('duplicate-brand');
      if (found.lookalike) hits.push('look-alike-brand');
      for (const full of found.dirs) scanDirectory(full, rel);
      continue;
    }
    const full = path.resolve(root, rel);
    if (!fs.existsSync(full)) {
      hits.push(`missing ${rel}`);
      continue;
    }
    scanDirectory(full, rel);
  }
  return { ok: hits.length === 0, hits };
}

function main() {
  try {
    const targets = process.argv.slice(2);
    const result = scanPaths(targets.length > 0 ? targets : DEFAULT_TARGETS);
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
  isLongId,
  scanPaths,
  scanText,
};

if (require.main === module) main();
