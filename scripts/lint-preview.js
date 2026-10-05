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
 */

const fs = require('fs');
const path = require('path');

const PREVIEW_DIR = path.join(__dirname, '..', 'preview');

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
      if (cls.includes('[') && !cls.includes('ASSET_BASE')) problems.push(`arbitrary Tailwind value "${cls}"`);
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

module.exports = { lintFragment, lintAll };
