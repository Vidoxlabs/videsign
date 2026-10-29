#!/usr/bin/env node

/**
 * lint-preview.js — static checks for preview/*.html fragments.
 *
 * `eslint-plugin-tailwindcss` only sees JavaScript, so `no-arbitrary-value`
 * never reached the fragments (verification report, finding 3). This script is
 * the gate that does. `npm run lint` runs ESLint and then this file.
 *
 * Rules:
 *   - no `shadow-sm` (ADR-001), no arbitrary Tailwind values (`w-[15px]`)
 *   - no inline `style=` attribute and no `<script>` (site CSP posture, ADR-003)
 *   - no emoji (DESIGN.md imagery rule)
 *   - no text that claims verification or action authority ("verified",
 *     "signed", "authorize action") — fragments must not overclaim
 *   - glass scope (ADR-006): `vi-glass` / `vi-glass-shell` only on elements that
 *     are controls or overlays, never on paragraphs, list items, sections,
 *     articles or table parts; never nested in another glass element; at most
 *     three glass layers per fragment
 *   - no legacy glass utilities (`backdrop-blur-*`, `bg-white/*`) — crystal only
 *   - no `uppercase` (ADR-007: eyebrows and labels are sentence case)
 *   - no `animate-pulse` (decorative loop)
 *   - no raw type utilities (`font-medium|bold|semibold`, bare `tracking-*` /
 *     `leading-*`); use typography weight/tracking/leading tokens
 */

const fs = require('fs');
const path = require('path');
const { parseFrontMatter } = require('./generate-tokens');

const PREVIEW_DIR = path.join(__dirname, '..', 'preview');
const TOKENS = parseFrontMatter(fs.readFileSync(path.join(__dirname, '..', 'DESIGN.md'), 'utf-8'));
const ON_ACCENT = 'text-text-content-on-accent-base';
const SOLID_ACCENT = 'bg-surface-accent-violet-base';
const BOLD_WEIGHT = 700;
const SIZE_RANK = { xs: 0, sm: 1, md: 2, lg: 3, xl: 4, '2xl': 5, '3xl': 6, '4xl': 7, '5xl': 8 };
const XL_RANK = SIZE_RANK.xl;
const TWO_XL_RANK = SIZE_RANK['2xl'];
const SIZE_RULE = 'bold xl or larger, or 2xl or larger';
const RAW_WEIGHT = {
  'font-thin': 100,
  'font-extralight': 200,
  'font-light': 300,
  'font-normal': 400,
  'font-medium': 500,
  'font-semibold': 600,
  'font-bold': 700,
  'font-extrabold': 800,
  'font-black': 900,
};

/** Catalog chrome and full-page layout harnesses are not component fragments. */
const CHROME_FILES = new Set(['index.html']);

const VOID = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'source', 'track', 'wbr']);
const GLASS_FORBIDDEN_TAGS = new Set(['p', 'section', 'article', 'li', 'ul', 'ol', 'table', 'thead', 'tbody', 'tr', 'td', 'th', 'h1', 'h2', 'h3', 'h4', 'span']);
const MAX_GLASS_LAYERS = 3;

function classesOf(attrs) {
  const m = attrs.match(/\bclass\s*=\s*"([^"]*)"/);
  return m ? m[1].split(/\s+/).filter(Boolean) : [];
}

function visibleText(html) {
  return html
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&[a-z0-9#]+;/gi, ' ');
}

/** Returns a list of human-readable problems for one fragment. */
function lintFragment(name, html) {
  const problems = [];
  const bare = html.replace(/<!--[\s\S]*?-->/g, '');
  const isChrome = CHROME_FILES.has(name);

  if (/shadow-sm/.test(bare)) problems.push('shadow-sm violates ADR-001');

  for (const m of bare.matchAll(/\bclass\s*=\s*"([^"]*)"/g)) {
    for (const cls of m[1].split(/\s+/)) {
      if (!cls) continue;
      if (cls.includes('[') && !cls.includes('ASSET_BASE')) problems.push(`arbitrary Tailwind value "${cls}"`);
      if (/^backdrop-blur(-|$)/.test(cls)) problems.push(`legacy glass utility "${cls}"`);
      if (/^bg-white(\/|$)/.test(cls)) problems.push(`legacy glass utility "${cls}"`);
      if (cls === 'uppercase') problems.push('uppercase (use sentence case, ADR-007)');
      if (cls === 'animate-pulse') problems.push('animate-pulse (decorative loop)');
      if (/^font-(medium|semibold|bold)$/.test(cls)) {
        problems.push(`raw type utility "${cls}" (use font-typography-weight-*)`);
      }
      if (/^tracking-(tighter|tight|normal|wide|wider|widest)$/.test(cls)) {
        problems.push(`raw type utility "${cls}" (use tracking-typography-tracking-*)`);
      }
      if (/^leading-(none|tight|snug|normal|relaxed|loose)$/.test(cls)) {
        problems.push(`raw type utility "${cls}" (use leading-typography-leading-*)`);
      }
    }
  }

  if (!isChrome) {
    if (/\sstyle\s*=/.test(bare)) problems.push('inline style attribute');
    if (/<script[\s>]/i.test(bare)) problems.push('<script> element');
    if (/<style[\s>]/i.test(bare)) problems.push('<style> element');
  }

  if (/\p{Extended_Pictographic}/u.test(bare)) problems.push('emoji');

  const text = visibleText(html);
  for (const [re, label] of [[/\bverified\b/i, '"verified"'], [/\bsigned\b/i, '"signed"'], [/authorize action/i, '"Authorize action"']]) {
    if (re.test(text)) problems.push(`overclaiming text ${label}`);
  }

  // Glass scope: walk tags with a small stack.
  const stack = [];
  let layers = 0;
  for (const m of bare.matchAll(/<(\/?)([a-zA-Z][a-zA-Z0-9-]*)([^>]*)>/g)) {
    const [, closing, rawTag, attrs] = m;
    const tag = rawTag.toLowerCase();
    if (closing) {
      for (let i = stack.length - 1; i >= 0; i -= 1) {
        if (stack[i].tag === tag) { stack.length = i; break; }
      }
      continue;
    }
    const classes = classesOf(attrs);
    const isGlass = classes.includes('vi-glass') || classes.includes('vi-glass-shell');
    if (isGlass) {
      layers += 1;
      if (GLASS_FORBIDDEN_TAGS.has(tag)) problems.push(`glass on <${tag}> (glass marks controls and lenses, never content)`);
      if (stack.some((s) => s.glass)) problems.push(`glass nested in glass on <${tag}>`);
    }
    if (!VOID.has(tag) && !/\/\s*$/.test(attrs)) stack.push({ tag, glass: isGlass });
  }
  if (layers > MAX_GLASS_LAYERS) problems.push(`${layers} glass layers (max ${MAX_GLASS_LAYERS})`);

  problems.push(...accentLabelProblems(html));

  return problems;
}

function sizeStep(cls) {
  const raw = cls.match(/^text-(xs|sm|base|lg|xl|2xl|3xl|4xl|5xl)$/);
  if (raw) {
    const name = raw[1] === 'base' ? 'md' : raw[1];
    return { cls, name, rank: SIZE_RANK[name] };
  }
  const token = cls.match(/^text-typography-size-(xs|sm|md|lg|xl|2xl|3xl|4xl|5xl)-base$/);
  if (token && typeof TOKENS.typography[`typography-size-${token[1]}-base`] === 'string') {
    return { cls, name: token[1], rank: SIZE_RANK[token[1]] };
  }
  const px = cls.match(/^text-\[(\d+(?:\.\d+)?)px\]$/);
  if (px) return { cls, name: `${px[1]}px`, rank: -1 };
  return null;
}

function weightOf(cls) {
  if (Object.prototype.hasOwnProperty.call(RAW_WEIGHT, cls)) return RAW_WEIGHT[cls];
  if (!cls.startsWith('font-typography-weight-')) return null;
  const value = TOKENS.typography[cls.slice('font-'.length)];
  return value === undefined ? null : Number(value);
}

function elementText(inner) {
  return inner
    .replace(/<[^>]+>/g, ' ')
    .replace(/&[a-z0-9#]+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Solid accent labels are bold xl (or larger) or 2xl (or larger), on the on-accent token. */
function accentLabelProblems(html) {
  const problems = [];
  const bare = html.replace(/<!--[\s\S]*?-->/g, '');
  const tags = [...bare.matchAll(/<(\/?)([a-zA-Z][a-zA-Z0-9-]*)([^>]*)>/g)];
  for (const open of tags) {
    if (open[1]) continue;
    const tag = open[2].toLowerCase();
    const attrs = open[3];
    const classes = classesOf(attrs);
    if (!classes.includes(SOLID_ACCENT)) continue;
    if (VOID.has(tag) || /\/\s*$/.test(attrs)) continue;
    let depth = 1;
    let closeAt = bare.length;
    for (const next of tags) {
      if (next.index <= open.index) continue;
      if (next[2].toLowerCase() !== tag) continue;
      if (next[1]) {
        depth -= 1;
        if (depth === 0) {
          closeAt = next.index;
          break;
        }
      } else if (!VOID.has(tag) && !/\/\s*$/.test(next[3])) {
        depth += 1;
      }
    }
    if (!elementText(bare.slice(open.index + open[0].length, closeAt))) continue;
    const sizes = classes.map(sizeStep).filter(Boolean);
    const size = sizes.length ? sizes.reduce((min, item) => (item.rank < min.rank ? item : min)) : null;
    const weights = classes.map(weightOf).filter((value) => value !== null);
    const weight = weights.length ? Math.max(...weights) : 400;
    const boldXl = size !== null && size.rank >= XL_RANK && weight >= BOLD_WEIGHT;
    const twoXl = size !== null && size.rank >= TWO_XL_RANK;
    if (!boldXl && !twoXl) {
      const detail = size ? `${size.cls} is ${size.name} at weight ${weight}` : 'has no xl or 2xl size';
      problems.push(`accent label ${detail}; needs ${SIZE_RULE}`);
    }
    if (!classes.includes(ON_ACCENT)) problems.push(`accent label must use ${ON_ACCENT}`);
  }
  return problems;
}

function lintAll() {
  const failures = [];
  for (const file of fs.readdirSync(PREVIEW_DIR).filter((f) => f.endsWith('.html')).sort()) {
    const problems = lintFragment(file, fs.readFileSync(path.join(PREVIEW_DIR, file), 'utf-8'));
    for (const p of problems) failures.push(`preview/${file}: ${p}`);
  }
  return failures;
}

if (require.main === module) {
  const failures = lintAll();
  if (failures.length) {
    process.stderr.write(`${failures.join('\n')}\n`);
    process.stderr.write(`\n${failures.length} fragment problem(s).\n`);
    process.exit(1);
  }
  process.stdout.write('preview fragments clean\n');
}

module.exports = { lintFragment, lintAll, accentLabelProblems };
