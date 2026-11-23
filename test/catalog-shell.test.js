'use strict';

/**
 * Nocturne Museum Preview Shell & Specimen Craft Verification Suite:
 *   1. Zero-hex OKLCH discipline, exact 4-tier dark/light elevation ramp, WCAG 2.1
 *      contrast verification across all 4 tiers, dark OKLCH scrollbar styling,
 *      GPU-only transitions (transform + opacity) + instant 0ms motion pause/reduced.
 *   2. Zero hardcoded specimen totals (90, 93, 113) in shell markup/controller;
 *      build-time fixture metric synchronization via scripts/sync-fixture-metrics.js.
 *   3. Persona dialects responsive auto-fit grid + 5-track CSS Subgrid + text-wrap: pretty.
 *   4. Catalog controller unit checks: URL hash parse/serialize, token extraction,
 *      accessibility snapshot extraction, sidebar de-duplication & bottom legacy toggle,
 *      '/' search focus + 'Esc' clear, empty-filter recovery, and 4-tab Inspector Drawer.
 */

const { test, before } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const { contrastRatio } = require('../lib/contrast');
const { syncFixtureHtml } = require('../scripts/sync-fixture-metrics');
const {
  IFRAME_BASE_CSS,
  ISOLATION_BASE_CSS,
  parseHashState,
  serializeHashState,
  extractTokenReferences,
  buildAccessibilitySnapshot,
} = require('../preview/catalog');

const ROOT = path.join(__dirname, '..');

function oklchToRgb(L, C, Hdeg) {
  const h = (Hdeg * Math.PI) / 180;
  const a = C * Math.cos(h);
  const b = C * Math.sin(h);
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.2914855480 * b;
  const l = l_ ** 3;
  const m = m_ ** 3;
  const s = s_ ** 3;
  const lr = 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
  const lg = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
  const lb = -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s;
  const enc = (x) => {
    const clamped = Math.max(0, Math.min(1, x));
    return Math.round((clamped <= 0.0031308 ? 12.92 * clamped : 1.055 * (clamped ** (1 / 2.4)) - 0.055) * 255);
  };
  return [enc(lr), enc(lg), enc(lb)];
}

function parseOklchVars(block) {
  const map = {};
  for (const m of block.matchAll(/(--vi-[a-z0-9-]+):\s*oklch\(\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)(?:\s*\/\s*[\d.]+)?\s*\)/g)) {
    map[m[1]] = [Number(m[2]), Number(m[3]), Number(m[4])];
  }
  return map;
}

before(() => {
  execFileSync(process.execPath, [path.join(ROOT, 'scripts', 'generate-tokens.js')], { cwd: ROOT, stdio: 'ignore' });
});

test('preview/catalog.css, dist/tokens.css, and iframe styles enforce zero-hex OKLCH, 4-tier elevation, concentric radii, scrollbars, and GPU-only motion', () => {
  const css = fs.readFileSync(path.join(ROOT, 'preview', 'catalog.css'), 'utf-8');
  const tokensCss = fs.readFileSync(path.join(ROOT, 'dist', 'tokens.css'), 'utf-8');
  assert.doesNotMatch(css, /#[0-9a-fA-F]{3,8}\b/, 'catalog.css must not contain raw hex colors');
  assert.doesNotMatch(css, /\brgba?\(/i, 'catalog.css must not contain rgb()/rgba()');
  assert.doesNotMatch(css, /\bhsla?\(/i, 'catalog.css must not contain hsl()/hsla()');
  assert.doesNotMatch(IFRAME_BASE_CSS, /#[0-9a-fA-F]{3,8}\b/, 'iframe CSS must not contain raw hex colors');
  assert.doesNotMatch(ISOLATION_BASE_CSS, /#[0-9a-fA-F]{3,8}\b/, 'shadow isolation CSS must not contain raw hex colors');

  for (const needle of [
    '--vi-surface-canvas: oklch(0.095 0.012 275)',
    '--vi-surface-shell: oklch(0.135 0.014 275)',
    '--vi-surface-card: oklch(0.175 0.015 275)',
    '--vi-surface-elevated: oklch(0.225 0.016 275)',
    '--vi-radius-outer: 12px',
    '--vi-radius-inner: 8px',
  ]) {
    assert.ok(css.includes(needle), `preview/catalog.css missing required token: ${needle}`);
    assert.ok(tokensCss.includes(needle), `dist/tokens.css missing required elevation/radius token: ${needle}`);
  }

  for (const needle of [
    '--vi-ink-primary: oklch(0.95 0.006 275)',
    '--vi-ink-secondary: oklch(0.78 0.010 275)',
    '--vi-ink-muted: oklch(0.66 0.012 275)',
    '--vi-border-interactive: oklch(0.54 0.02 275)',
    '--vi-border-strong: oklch(0.64 0.02 275)',
    ':root[data-theme="light"]',
    'scrollbar-width: thin',
    'cubic-bezier(0.16, 1, 0.3, 1)',
    ':root[data-motion="paused"]',
    ':root[data-motion="reduced"]',
    'transition-duration: 0ms !important',
    ':root[data-glass="tactile-blur"]',
    'text-transform: uppercase',
    'letter-spacing: 0.06em',
    '.sidebar-link.is-active-spy',
    '.fragment-iso-pill',
  ]) {
    assert.ok(css.includes(needle), `preview/catalog.css missing required token/rule: ${needle}`);
  }

  for (const iframeRule of [
    'color-scheme: dark',
    'color-scheme: light',
    'scrollbar-width: thin',
    'oklch(0.34 0.015 275)',
    '::-webkit-scrollbar-thumb',
  ]) {
    assert.ok(IFRAME_BASE_CSS.includes(iframeRule), `IFRAME_BASE_CSS missing required scrollbar/theme rule: ${iframeRule}`);
  }

  // GPU-only transitions: ensure no transition animates layout/paint properties
  for (const m of css.matchAll(/transition:\s*([^;]+);/g)) {
    const decl = m[1];
    assert.doesNotMatch(decl, /\b(width|height|background|border|color|backdrop-filter|all)\b/i, `non-GPU transition detected: ${decl}`);
  }

  // Verify WCAG 2.1 contrast on all 4 elevation tiers in dark and light modes
  const darkBlock = css.match(/:root,\s*:root\[data-theme="dark"\]\s*\{([\s\S]*?)\}/)[1];
  const lightBlock = css.match(/:root\[data-theme="light"\]\s*\{([\s\S]*?)\}/)[1];
  const suites = [
    { name: 'dark', vars: parseOklchVars(darkBlock) },
    { name: 'light', vars: parseOklchVars(lightBlock) },
  ];
  for (const suite of suites) {
    const tiers = ['--vi-surface-canvas', '--vi-surface-shell', '--vi-surface-card', '--vi-surface-elevated'];
    for (const tier of tiers) {
      const bg = oklchToRgb(...suite.vars[tier]);
      for (const ink of ['--vi-ink-primary', '--vi-ink-secondary', '--vi-ink-muted']) {
        const ratio = contrastRatio(oklchToRgb(...suite.vars[ink]), bg);
        assert.ok(ratio >= 4.5, `${suite.name} ${ink} on ${tier} must be >= 4.5:1, got ${ratio.toFixed(2)}`);
      }
      for (const ctrl of ['--vi-border-interactive', '--vi-border-strong', '--vi-dot-active', '--vi-dot-accent', '--vi-dot-warn']) {
        const ratio = contrastRatio(oklchToRgb(...suite.vars[ctrl]), bg);
        assert.ok(ratio >= 3.0, `${suite.name} ${ctrl} on ${tier} must be >= 3.0:1, got ${ratio.toFixed(2)}`);
      }
    }
  }
});

test('preview/index.html removes duplicate tier pills, avoids hardcoded totals, and includes Inspector + keyboard/runtime hooks', () => {
  const html = fs.readFileSync(path.join(ROOT, 'preview', 'index.html'), 'utf-8');
  assert.doesNotMatch(html, /id="tier-filter-bar"/, 'duplicate top sidebar tier-filter pill block must be removed');
  assert.doesNotMatch(html, /\b(90|93|113)\s+(verified|specimens|active|legacy|components)/i, 'shell must not hardcode specimen totals');
  for (const id of [
    'data-theme="dark" data-motion="paused" data-glass="solid"',
    'id="filter-all-active"',
    'id="toggle-legacy"',
    'id="toggle-theme"',
    'id="toggle-motion"',
    'id="toggle-glass"',
    'class="search-kbd"',
    'id="specimen-inspector-backdrop"',
    'data-inspector-tab="preview"',
    'data-inspector-tab="markup"',
    'data-inspector-tab="tokens"',
    'data-inspector-tab="a11y"',
  ]) {
    assert.ok(html.includes(id), `preview/index.html missing required shell hook: ${id}`);
  }
});

test('persona-dialects uses responsive auto-fit grid, 5-track CSS Subgrid, and text-wrap: pretty', () => {
  const css = fs.readFileSync(path.join(ROOT, 'dist', 'dialects.css'), 'utf-8');
  const html = fs.readFileSync(path.join(ROOT, 'preview', 'persona-dialects.html'), 'utf-8');
  assert.ok(css.includes('repeat(auto-fit, minmax(13.5rem, 1fr))'), 'dialects.css must use auto-fit minmax(13.5rem, 1fr)');
  assert.ok(css.includes('grid-template-rows: subgrid'), 'dialects.css must enable CSS Subgrid');
  assert.ok(css.includes('grid-row: span 5'), 'dialects.css must span 5 subgrid rows');
  assert.ok(css.includes('text-wrap: pretty'), 'dialects.css headings must apply text-wrap: pretty');
  assert.ok(html.includes('class="vi-agent__grid"'), 'persona-dialects.html must use .vi-agent__grid');
  assert.equal([...html.matchAll(/class="vi-agent persona-dialect-card\b/g)].length, 5, 'all 5 seats must carry .persona-dialect-card');
  assert.doesNotMatch(html, /w-layout-width-sidebar-base/, 'rigid sidebar width class must be removed to prevent horizontal clipping');
});

test('scripts/sync-fixture-metrics.js deterministically binds data-manifest-metric counts', () => {
  const sample = '<dd data-manifest-metric="componentCount">42</dd><span data-manifest-metric="componentCount" data-manifest-template="Showing 12 of {count} modules">Showing 12 of 42 modules</span>';
  const synced = syncFixtureHtml(sample, { componentCount: 95 });
  assert.equal(
    synced,
    '<dd data-manifest-metric="componentCount">95</dd><span data-manifest-metric="componentCount" data-manifest-template="Showing 12 of {count} modules">Showing 12 of 95 modules</span>',
  );
});

test('preview/catalog.js pure helpers parse/serialize URL hashes, extract tokens, and build accessibility snapshots', () => {
  const parsed = parseHashState('#catalog?category=foundations&q=dialect&legacy=1&specimen=persona-dialects');
  assert.deepEqual(parsed, {
    category: 'foundations',
    q: 'dialect',
    legacy: true,
    specimen: 'persona-dialects',
  });
  assert.equal(serializeHashState(parsed), '#catalog?category=foundations&q=dialect&legacy=1&specimen=persona-dialects');
  assert.deepEqual(parseHashState('#frag-five-bar-rule'), {
    category: 'all',
    q: '',
    legacy: false,
    specimen: 'five-bar-rule',
  });
  assert.equal(serializeHashState({ category: 'all', q: '', legacy: false, specimen: '' }), '#catalog');

  const tokens = extractTokenReferences(
    '<div class="vi-library-stage bg-surface-background-primary-base text-text-content-primary-base vi-glass"></div>',
    new Set(),
  );
  assert.ok(tokens.includes('--vi-colors-surface-background-primary-base'));
  assert.ok(tokens.includes('--vi-colors-text-content-primary-base'));
  assert.ok(tokens.includes('--vi-effects-glass-crystal-surface-base'));
  assert.ok(tokens.includes('--vi-library-surface'));

  const mockNode = {
    querySelector: () => null,
    querySelectorAll(sel) {
      if (sel.includes('header')) {
        return [{ tagName: 'NAV', getAttribute: (k) => (k === 'aria-label' ? 'Primary' : null), hasAttribute: () => false }];
      }
      if (sel === '[role]') {
        return [{ tagName: 'BUTTON', getAttribute: (k) => (k === 'role' ? 'tab' : k === 'aria-selected' ? 'true' : null), hasAttribute: (k) => k === 'aria-selected', textContent: 'Overview' }];
      }
      return [{
        tagName: 'BUTTON',
        hidden: false,
        getAttribute: () => null,
        hasAttribute: () => false,
        textContent: 'Inspect',
        getBoundingClientRect: () => ({ width: 88, height: 44 }),
      }];
    },
  };
  const snap = buildAccessibilitySnapshot(mockNode);
  assert.equal(snap.landmarks.length, 1);
  assert.equal(snap.roles.length, 1);
  assert.equal(snap.interactive.length, 1);
  assert.equal(snap.touchPass, 1);
  assert.equal(snap.touchWarn, 0);
  assert.equal(parseHashState('#catalog?cat=layouts&specimen=layout-public-site').category, 'layouts');
});

test('manifest count equals active catalog count (93) and design-studio-canvas aligns with museum accent grammar', () => {
  const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'dist', 'components.manifest.json'), 'utf-8'));
  const indexHtml = fs.readFileSync(path.join(ROOT, 'preview', 'index.html'), 'utf-8');
  const activeCount = [...indexHtml.matchAll(/file:\s*'[^']+',\s*tier:\s*'([^']+)'/g)].filter((m) => m[1] !== 'legacy').length;
  assert.equal(manifest.componentCount, activeCount, 'manifest componentCount must equal active specimen count');
  assert.equal(manifest.componentCount, 93);

  const studio = fs.readFileSync(path.join(ROOT, 'preview', 'design-studio-canvas.html'), 'utf-8');
  assert.ok(studio.includes('bg-status-indicator-success-base'), 'sync ready uses semantic status-ok dot');
  assert.doesNotMatch(studio, /bg-status-indicator-info-base[\s\S]*sync ready/, 'off-palette blue dot removed from sync ready');
  assert.ok(studio.includes('Pinned critique slot'), 'pinned critique slot legend present');
  assert.ok(studio.includes('>Schematic<'), 'inner schematic switcher visually subordinated');
});
