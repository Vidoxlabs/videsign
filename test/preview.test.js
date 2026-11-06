/**
 * Preview fragment contract: every fragment lints clean, every class it uses
 * resolves to generated CSS, and the catalog lists every fragment and loads
 * the generated stylesheets.
 */

const { test, before } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const { lintAll, lintFragment } = require('../scripts/lint-preview');

const ROOT = path.join(__dirname, '..');
const PREVIEW = path.join(ROOT, 'preview');
const FRAGMENTS = fs.readdirSync(PREVIEW).filter((f) => f.endsWith('.html')).sort();

/**
 * Marker classes with no CSS rule of their own. The stage hooks name the backdrop's parts so a
 * product can target them; lib/stage.css styles their children instead.
 */
const MARKERS = new Set(['group', 'peer', 'stage--hero', 'stage__sky', 'stage__core', 'stage__floor', 'stage__floor-glow']);

let css = '';

before(() => {
  execFileSync(process.execPath, [path.join(ROOT, 'scripts', 'generate-tokens.js')], { cwd: ROOT, stdio: 'ignore' });
  css = ['catalog.css', 'glass.css', 'tokens.css', 'stage.css']
    .map((f) => fs.readFileSync(path.join(ROOT, 'dist', f), 'utf-8'))
    .join('\n');
});

function cssSelector(cls) {
  return `.${cls.replace(/([:/.[\]%])/g, '\\$1')}`;
}

test('every preview fragment lints clean', () => {
  assert.deepEqual(lintAll(), []);
});

test('the linter flags what it claims to flag', () => {
  const bad = lintFragment('x.html', [
    '<p class="vi-glass shadow-sm w-[15px] backdrop-blur-sm bg-white/5 uppercase animate-pulse" style="top:1px">Authorize action, verified and signed &#128512;</p>',
    '<div class="vi-glass"><div class="vi-glass-shell"></div></div>',
    '<script>1</script>',
  ].join('\n'));
  const typed = lintFragment('t.html', '<span class="font-medium tracking-wide leading-tight">x</span>');
  for (const needle of [
    'shadow-sm', 'arbitrary', 'inline style', '<script>', 'glass on <p>', 'nested in glass',
    '"verified"', '"signed"', '"Authorize action"',
    'legacy glass utility "backdrop-blur-sm"', 'legacy glass utility "bg-white/5"',
    'uppercase', 'animate-pulse',
  ]) {
    assert.ok(bad.some((p) => p.includes(needle)), `expected a problem mentioning ${needle}: ${bad.join(' | ')}`);
  }
  for (const needle of ['font-medium', 'tracking-wide', 'leading-tight']) {
    assert.ok(typed.some((p) => p.includes(needle)), `expected raw type flag for ${needle}: ${typed.join(' | ')}`);
  }
  assert.ok(lintFragment('y.html', '<p class="p-4">Proposed &#128512;</p>').length >= 0);
  assert.ok(lintFragment('sq.html', "<span class='shadow-sm'>x</span>").some((problem) => problem.includes('shadow-sm')));
  const four = lintFragment('z.html', '<nav class="vi-glass"></nav><nav class="vi-glass"></nav><nav class="vi-glass"></nav><nav class="vi-glass"></nav>');
  assert.ok(four.some((p) => p.includes('glass layers')));
});

test('every class used by a fragment resolves to generated CSS', () => {
  const unresolved = [];
  for (const file of FRAGMENTS) {
    if (file === 'index.html') continue;
    const html = fs.readFileSync(path.join(PREVIEW, file), 'utf-8').replace(/<!--[\s\S]*?-->/g, '');
    for (const m of html.matchAll(/\bclass="([^"]*)"/g)) {
      for (const cls of m[1].split(/\s+/).filter(Boolean)) {
        if (MARKERS.has(cls)) continue;
        if (!css.includes(cssSelector(cls))) unresolved.push(`${file}: ${cls}`);
      }
    }
  }
  assert.deepEqual([...new Set(unresolved)], []);
});

test('the catalog loads the generated stylesheets and lists every fragment', () => {
  const index = fs.readFileSync(path.join(PREVIEW, 'index.html'), 'utf-8');
  for (const sheet of ['../dist/tokens.css', '../dist/glass.css', '../dist/catalog.css', '../dist/stage.css']) {
    assert.ok(index.includes(`href="${sheet}"`), `catalog must load ${sheet}`);
  }
  const unlisted = FRAGMENTS.filter((f) => f !== 'index.html' && !index.includes(`'${f}'`) && !index.includes(`"${f}"`));
  assert.deepEqual(unlisted, []);
});

test('required new fragments exist', () => {
  for (const f of ['island-nav', 'question-bar', 'evidence-lens', 'field-node', 'field-edge', 'statement-proof-row', 'coverage-grid', 'persona-switcher', 'skeleton-row', 'locked-panel']) {
    assert.ok(FRAGMENTS.includes(`${f}.html`), `missing preview/${f}.html`);
  }
});

test('the persona console no longer claims authority or verification', () => {
  const html = fs.readFileSync(path.join(PREVIEW, 'persona-console.html'), 'utf-8');
  const body = html.replace(/<!--[\s\S]*?-->/g, '');
  assert.doesNotMatch(body, /Authorize action|verified|signed/i);
  assert.match(body, /data-state="unavailable"/);
  assert.match(body, /bg-persona-accent-violet-base/);
});

test('Violet accent text never sits on the secondary or tertiary surface (ADR-006 contrast rule)', () => {
  // Walk every element: if it carries Violet accent text, no ancestor (or the
  // element itself) may paint a secondary/tertiary background.
  const body = fs.readFileSync(path.join(PREVIEW, 'persona-console.html'), 'utf-8').replace(/<!--[\s\S]*?-->/g, '');
  const VOID = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'source', 'track', 'wbr']);
  const stack = [];
  for (const m of body.matchAll(/<(\/?)([a-zA-Z][a-zA-Z0-9-]*)([^>]*)>/g)) {
    const [, closing, rawTag, attrs] = m;
    const tag = rawTag.toLowerCase();
    if (closing) {
      for (let i = stack.length - 1; i >= 0; i -= 1) {
        if (stack[i].tag === tag) { stack.length = i; break; }
      }
      continue;
    }
    const classAttr = (attrs.match(/\bclass\s*=\s*"([^"]*)"/) || [])[1] || '';
    const cls = classAttr.split(/\s+/).filter(Boolean);
    const selfBg = cls.find((c) => /^bg-surface-background-(secondary|tertiary)-base$/.test(c));
    const ancestorBg = stack.find((s) => s.bg);
    if (cls.includes('text-persona-accent-violet-base')) {
      assert.equal(selfBg, undefined, 'Violet accent text on its own secondary/tertiary background');
      assert.equal(ancestorBg, undefined, 'Violet accent text inside a secondary/tertiary ancestor');
    }
    if (!VOID.has(tag) && !/\/\s*$/.test(attrs)) {
      stack.push({ tag, bg: selfBg || null });
    }
  }
});

// --- ADR-011 / ADR-013 signature colours, five-bar rule and chat dock ---

const CANON = ['violet', 'wisteria', 'xylia', 'yarrow', 'zinnia'];
const read = (f) => fs.readFileSync(path.join(PREVIEW, f), 'utf-8').replace(/<!--[\s\S]*?-->/g, '');
const fiveBars = (html) => [...html.matchAll(/<div aria-hidden="true" class="[^"]*">\s*((?:<span class="[^"]*h-indicator-fivebar-base[^"]*"><\/span>\s*){5})<\/div>/g)]
  .map((m) => [...m[1].matchAll(/bg-persona-accent-([a-z]+)-base/g)].map((c) => c[1]));

test('the linter enforces the signature-colour rules', () => {
  const alone = lintFragment('a.html', '<span class="bg-persona-accent-xylia-base"></span>');
  assert.ok(alone.some((p) => p.includes('Xylia appears without')), alone.join(' | '));
  const text = lintFragment('b.html', `<p class="text-persona-accent-xylia-base">x</p>${CANON.map((c) => `<i class="bg-persona-accent-${c}-base"></i>`).join('')}`);
  assert.ok(text.some((p) => p.includes('Xylia as text')), text.join(' | '));
  const gradient = lintFragment('c.html', '<div class="bg-gradient-to-r from-persona-accent-violet-base to-persona-accent-zinnia-base"></div>');
  assert.equal(gradient.filter((p) => p.includes('gradient stop')).length, 2, gradient.join(' | '));
  const hover = lintFragment('d.html', '<span class="hover:text-persona-accent-xylia-base"></span>');
  assert.ok(hover.some((p) => p.includes('Xylia as text')), hover.join(' | '));
  const together = lintFragment('e.html', CANON.map((c) => `<i class="bg-persona-accent-${c}-base"></i>`).join(''));
  assert.deepEqual(together.filter((p) => /Xylia|gradient/.test(p)), []);
});

test('the five-bar rule is five hard segments in canon order, hidden from assistive tech', () => {
  const bars = fiveBars(read('five-bar-rule.html'));
  assert.equal(bars.length, 1);
  assert.deepEqual(bars[0], CANON);
  assert.doesNotMatch(read('five-bar-rule.html'), /bg-gradient|from-|via-/);
});

test('the chat dock fragment carries the ADR-013 dialog, log and launcher contract', () => {
  const html = read('chat-dock.html');
  assert.match(html, /role="dialog" aria-modal="false" aria-labelledby="chat-dock-title"/);
  assert.match(html, /role="log" aria-live="polite" aria-relevant="additions" aria-label="Conversation"/);
  assert.match(html, /role="group" aria-label="Choose a guide"/);
  const pressed = [...html.matchAll(/aria-pressed="(true|false)"[^>]*>(?:<span[^>]*><\/span>)?([A-Z][a-z]+)<\/button>/g)];
  assert.deepEqual(pressed.map((m) => m[2].toLowerCase()), CANON);
  assert.equal(pressed.filter((m) => m[1] === 'true').length, 1);
  // Seat names stay in a text token, never a persona colour.
  assert.doesNotMatch(html, /text-persona-accent-/);
  // A disclosure line says how answers are produced.
  assert.match(html, /Scripted guides\. Answers quote published pages and link to them\./);
  // The launcher never draws a mark: no inline SVG or image, and a five-bar foot in canon order follows it.
  assert.doesNotMatch(html, /<svg|<img|<path/);
  assert.match(html, /aria-controls="chat-dock"/);
  const bars = fiveBars(html);
  assert.deepEqual(bars.at(-1), CANON);
  // Every interactive control meets the touch target floor.
  for (const m of html.matchAll(/<(button|textarea)\b[^>]*class="([^"]*)"/g)) {
    assert.match(m[2], /h-action-(min|wide)-default/, m[0].slice(0, 80));
  }
});
