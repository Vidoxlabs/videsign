#!/usr/bin/env node

/**
 * lint-preview.js — static checks for preview/*.html fragments.
 *
 * `eslint-plugin-tailwindcss` only sees JavaScript, so `no-arbitrary-value`
 * never reached the fragments (verification report, finding 3). This script is
 * the gate that does. `npm run lint` runs ESLint and then this file.
 *
 * A prefixed accent fill still triggers the label checks. Unprefixed classes alone can satisfy on-accent, size and weight; a prefix never satisfies or rescues that base. Every prefixed size or weight on the fill and on a text-bearing child is still evaluated, and the label fails when any of them drops below bold xl or 2xl. Inheritance uses only the fill's unprefixed metrics. sr-only and visually-hidden children are not sized. Inline emphasis without its own size classes inherits the fill.
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
const ACCENT_FILL = /^(?:bg-surface-accent-violet-base|bg-persona-accent-violet-base)(?:\/\d+)?$/;
const BOLD_WEIGHT = 700;
const BOLD_MIN_PX = 18.66;
const LARGE_MIN_PX = 24;
const SIZE_RULE = 'bold xl or larger, or 2xl or larger';
const RAW_WEIGHT = {
  'font-thin': 100,
  'font-extralight': 200,
  'font-light': 300,
  'font-normal': 400,
  'font-regular': 400,
  'font-medium': 500,
  'font-semibold': 600,
  'font-bold': 700,
  'font-extrabold': 800,
  'font-black': 900,
};

/** Catalog chrome and full-page layout harnesses are not component fragments. */
const CHROME_FILES = new Set(['index.html']);

const VOID = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'source', 'track', 'wbr']);
const EMPHASIS = new Set(['em', 'strong', 'i', 'b', 'mark']);
const GLASS_FORBIDDEN_TAGS = new Set(['p', 'section', 'article', 'li', 'ul', 'ol', 'table', 'thead', 'tbody', 'tr', 'td', 'th', 'h1', 'h2', 'h3', 'h4', 'span']);
const MAX_GLASS_LAYERS = 3;

function classAttributes(html) {
  const values = [];
  for (const match of html.matchAll(/\bclass\s*=\s*(?:"([^"]*)"|'([^']*)')/gi)) {
    values.push(match[1] ?? match[2] ?? '');
  }
  return values;
}

function classesOf(attrs) {
  return classAttributes(attrs).flatMap((value) => value.split(/\s+/).filter(Boolean));
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

  for (const value of classAttributes(bare)) {
    for (const cls of value.split(/\s+/)) {
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

function stripImportant(token) {
  if (token.startsWith('!')) return token.slice(1);
  if (token.endsWith('!')) return token.slice(0, -1);
  return token;
}

function utilityOf(cls) {
  const colon = cls.lastIndexOf(':');
  const utility = colon === -1 ? cls : cls.slice(colon + 1);
  return stripImportant(utility);
}

/** Unprefixed classes only. Variant prefixes never count as base metrics. */
function baseClasses(classList) {
  return classList.filter((cls) => !cls.includes(':'));
}

function isAccentFillClass(cls) {
  const parts = cls.split(':').map(stripImportant).filter(Boolean);
  const utility = parts.pop();
  return Boolean(utility && ACCENT_FILL.test(utility));
}

function tokenPx(key) {
  const value = TOKENS.typography[key];
  if (typeof value !== 'string') return null;
  if (value.endsWith('rem')) return Number.parseFloat(value) * 16;
  if (value.endsWith('px')) return Number.parseFloat(value);
  return null;
}

function sizeStep(cls) {
  const utility = utilityOf(cls);
  const raw = utility.match(/^text-(xs|sm|base|lg|xl|2xl|3xl|4xl|5xl)$/);
  if (raw) {
    const name = raw[1] === 'base' ? 'md' : raw[1];
    const px = tokenPx(`typography-size-${name}-base`);
    return px === null ? null : { cls, name, px };
  }
  const token = utility.match(/^text-typography-size-(xs|sm|md|lg|xl|2xl|3xl|4xl|5xl)-base$/);
  if (token) {
    const px = tokenPx(`typography-size-${token[1]}-base`);
    return px === null ? null : { cls, name: token[1], px };
  }
  const arbitrary = utility.match(/^text-\[(\d+(?:\.\d+)?)px\]$/);
  if (arbitrary) return { cls, name: `${arbitrary[1]}px`, px: Number(arbitrary[1]) };
  return null;
}

function weightOf(cls) {
  const utility = utilityOf(cls);
  if (Object.prototype.hasOwnProperty.call(RAW_WEIGHT, utility)) return RAW_WEIGHT[utility];
  if (!utility.startsWith('font-typography-weight-')) return null;
  const value = TOKENS.typography[utility.slice('font-'.length)];
  return value === undefined ? null : Number(value);
}

function elementText(inner) {
  return inner
    .replace(/<[^>]+>/g, ' ')
    .replace(/&[a-z0-9#]+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function measureLabel(classList, defaults) {
  const base = baseClasses(classList);
  const sizes = base.map(sizeStep).filter(Boolean);
  if (defaults && sizes.length === 0) {
    const baseSize = sizeStep('text-base');
    if (baseSize) sizes.push(baseSize);
  }
  const weights = base.map(weightOf).filter((value) => value !== null);
  if (defaults && weights.length === 0) weights.push(RAW_WEIGHT['font-normal']);
  const size = sizes.length ? sizes.reduce((min, item) => (item.px < min.px ? item : min)) : null;
  const weight = weights.length ? Math.min(...weights) : RAW_WEIGHT['font-normal'];
  const boldLarge = size !== null && weight >= BOLD_WEIGHT && size.px >= BOLD_MIN_PX;
  const anyLarge = size !== null && size.px >= LARGE_MIN_PX;
  return { large: Boolean(boldLarge || anyLarge), size, weight };
}

function closeIndex(source, tags, open) {
  const tag = open[2].toLowerCase();
  let depth = 1;
  for (const next of tags) {
    if (next.index <= open.index) continue;
    if (next[2].toLowerCase() !== tag) continue;
    if (next[1]) {
      depth -= 1;
      if (depth === 0) return next.index;
    } else if (!VOID.has(tag) && !/\/\s*$/.test(next[3])) {
      depth += 1;
    }
  }
  return source.length;
}

/** Class lists of descendants that contain text. An empty child contributes nothing. */
function textBearingElements(html) {
  const tags = [...html.matchAll(/<(\/?)([a-zA-Z][a-zA-Z0-9-]*)([^>]*)>/g)];
  const found = [];
  for (const open of tags) {
    if (open[1]) continue;
    const tag = open[2].toLowerCase();
    const attrs = open[3];
    const selfClosing = /\/\s*$/.test(attrs);
    if ((VOID.has(tag) && tag !== 'input') || (selfClosing && tag !== 'input')) continue;
    if (tag === 'input') {
      const value = (attrs.match(/\bvalue\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+))/i) || []).slice(1).find((part) => part !== undefined) || '';
      if (!value.trim()) continue;
      found.push({ tag, classes: classesOf(attrs) });
      continue;
    }
    const content = html.slice(open.index + open[0].length, closeIndex(html, tags, open));
    if (!elementText(content)) continue;
    found.push({ tag, classes: classesOf(attrs) });
  }
  return found;
}

/** Text nodes of the element itself. Whitespace and entities do not count. */
function hasDirectNonWhitespaceText(html) {
  const re = /<\/?([a-zA-Z][a-zA-Z0-9-]*)\b[^>]*\/?>|[^<]+/g;
  let depth = 0;
  let direct = '';
  for (const match of html.matchAll(re)) {
    const token = match[0];
    if (!token.startsWith('<')) {
      if (depth === 0) direct += token;
      continue;
    }
    const closing = token.startsWith('</');
    const name = (token.match(/<\/?([a-zA-Z][a-zA-Z0-9-]*)/) || [])[1] || '';
    const selfClosing = /\/\s*>$/.test(token);
    if (closing) depth = Math.max(0, depth - 1);
    else if (!selfClosing && !VOID.has(name.toLowerCase())) depth += 1;
  }
  return direct.replace(/&[a-z0-9#]+;/gi, ' ').trim().length > 0;
}

function labelDetail(measure) {
  return measure.size ? `${measure.size.cls} is ${measure.size.name} at weight ${measure.weight}` : 'has no xl or 2xl size';
}

function meetsLarge(size, weight) {
  if (!size) return false;
  return (weight >= BOLD_WEIGHT && size.px >= BOLD_MIN_PX) || size.px >= LARGE_MIN_PX;
}

function skippedMetrics(classes) {
  return classes.some((cls) => {
    const utility = utilityOf(cls);
    return utility === 'sr-only' || utility === 'visually-hidden';
  });
}

function declaresMetrics(classes) {
  return baseClasses(classes).some((cls) => sizeStep(cls) || weightOf(cls) !== null);
}

/** Prefixed sizes and weights layered on the unprefixed metrics. A drop below the label rule fails. */
function downgradeDetails(classList, inherited) {
  const found = [];
  for (const cls of classList) {
    if (!cls.includes(':')) continue;
    const size = sizeStep(cls);
    const weight = weightOf(cls);
    if (!size && weight === null) continue;
    const nextSize = size || inherited.size;
    const nextWeight = weight !== null ? weight : inherited.weight;
    if (meetsLarge(nextSize, nextWeight)) continue;
    const shown = size || nextSize;
    found.push(shown ? `${cls} is ${shown.name} at weight ${nextWeight}` : `${cls} drops below the label rule`);
  }
  return found;
}

/** A descendant that declares an unprefixed size or weight must still meet the rule. Missing classes inherit the fill's unprefixed metrics. */
function descendantConstraint(classList, inherited) {
  const base = baseClasses(classList);
  const sizes = base.map(sizeStep).filter(Boolean);
  const weights = base.map(weightOf).filter((value) => value !== null);
  if (sizes.length === 0 && weights.length === 0) return null;
  const size = sizes.length ? sizes.reduce((min, item) => (item.px < min.px ? item : min)) : inherited.size;
  const weight = weights.length ? Math.min(...weights) : inherited.weight;
  const boldLarge = size !== null && weight >= BOLD_WEIGHT && size.px >= BOLD_MIN_PX;
  const anyLarge = size !== null && size.px >= LARGE_MIN_PX;
  if (boldLarge || anyLarge) return null;
  const shown = sizes.length ? sizes.reduce((min, item) => (item.px < min.px ? item : min)) : size;
  return shown ? `${shown.cls} is ${shown.name} at weight ${weight}` : 'has no xl or 2xl size';
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
    if (!classes.some(isAccentFillClass)) continue;
    const isInput = tag === 'input';
    if ((VOID.has(tag) && !isInput) || (/\/\s*$/.test(attrs) && !isInput)) continue;
    const closeAt = closeIndex(bare, tags, open);
    const inputValue = isInput
      ? (attrs.match(/\bvalue\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+))/i) || []).slice(1).find((part) => part !== undefined) || ''
      : '';
    const inner = isInput ? '' : bare.slice(open.index + open[0].length, closeAt);
    if (!(isInput ? inputValue.trim() : elementText(inner))) continue;
    // Unprefixed size and weight must hold on the fill element itself.
    // A child never supplies that base. Direct text also requires every text-bearing descendant to meet it.
    const direct = isInput ? inputValue.trim().length > 0 : hasDirectNonWhitespaceText(inner);
    const descendants = isInput ? [] : textBearingElements(inner);
    const fillBase = measureLabel(classes, true);
    if (!fillBase.large) problems.push(`accent label ${labelDetail(fillBase)}; needs ${SIZE_RULE}`);
    for (const drop of downgradeDetails(classes, fillBase)) {
      problems.push(`accent label ${drop}; needs ${SIZE_RULE}`);
    }
    const inherited = fillBase;
    for (const desc of descendants) {
      if (skippedMetrics(desc.classes)) continue;
      for (const drop of downgradeDetails(desc.classes, inherited)) {
        problems.push(`accent label ${drop}; needs ${SIZE_RULE}`);
      }
      if (direct) {
        if (EMPHASIS.has(desc.tag) && !declaresMetrics(desc.classes)) continue;
        const descBase = measureLabel(desc.classes, true);
        if (!descBase.large) problems.push(`accent label ${labelDetail(descBase)}; needs ${SIZE_RULE}`);
      } else {
        const detail = descendantConstraint(desc.classes, inherited);
        if (detail) problems.push(`accent label ${detail}; needs ${SIZE_RULE}`);
      }
    }
    const ownOnAccent = baseClasses(classes).some((cls) => utilityOf(cls) === ON_ACCENT);
    if (!ownOnAccent) problems.push(`accent label must use ${ON_ACCENT}`);
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
