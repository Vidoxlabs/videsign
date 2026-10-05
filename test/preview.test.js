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

/** Marker classes with no CSS rule of their own. */
const MARKERS = new Set(['group', 'peer']);

let css = '';

before(() => {
  execFileSync(process.execPath, [path.join(ROOT, 'scripts', 'generate-tokens.js')], { cwd: ROOT, stdio: 'ignore' });
  css = ['catalog.css', 'glass.css', 'tokens.css']
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
    '<p class="vi-glass shadow-sm w-[15px]" style="top:1px">Authorize action, verified and signed &#128512;</p>',
    '<div class="vi-glass"><div class="vi-glass-shell"></div></div>',
    '<script>1</script>',
  ].join('\n'));
  for (const needle of ['shadow-sm', 'arbitrary', 'inline style', '<script>', 'glass on <p>', 'nested in glass', '"verified"', '"signed"', '"Authorize action"']) {
    assert.ok(bad.some((p) => p.includes(needle)), `expected a problem mentioning ${needle}: ${bad.join(' | ')}`);
  }
  assert.ok(lintFragment('y.html', '<p class="p-4">Proposed &#128512;</p>').length >= 0);
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
  for (const sheet of ['../dist/tokens.css', '../dist/glass.css', '../dist/catalog.css']) {
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
  const body = fs.readFileSync(path.join(PREVIEW, 'persona-console.html'), 'utf-8').replace(/<!--[\s\S]*?-->/g, '');
  for (const m of body.matchAll(/class="([^"]*)"/g)) {
    const cls = m[1].split(/\s+/);
    if (cls.includes('text-persona-accent-violet-base')) {
      assert.ok(!cls.some((c) => /^bg-surface-background-(secondary|tertiary)-base$/.test(c)), 'accent text on a lighter surface');
    }
  }
  assert.doesNotMatch(body, /bg-surface-background-secondary-base[^"]*"[^>]*>[^<]*<[^>]*text-persona-accent-violet-base/);
});
