'use strict';

/**
 * Nocturne Museum Preview Shell & Specimen Craft Verification Suite:
 *   1. Zero-hex OKLCH discipline, exact 4-tier dark/light/high-contrast elevation ramp
 *      (0.10 / 0.13 / 0.16 / 0.20 dark), programmatic OKLCH ΔL contrast floors
 *      (>= 0.75 primary, >= 0.45 muted, >= 0.35 interactive border/focus) + WCAG 2.1 ratios,
 *      custom OKLCH scrollbars, GPU-only transitions + instant 0ms reduced-motion freeze.
 *   2. Zero hardcoded specimen totals (90, 93, 113) in shell markup/controller;
 *      build-time fixture metric synchronization via scripts/sync-fixture-metrics.js.
 *   3. Anti-slop specimen layouts: viewport-frame-set proportional asymmetric tracks + Subgrid,
 *      brief-contract-card constrained 2-col ledger + flush framing, data-table populated rows,
 *      bento-feature-grid weighted tracks + Subgrid + @container queries, persona-dialects Subgrid.
 *   4. Catalog controller unit checks: URL hash parse/serialize, token extraction, OKLCH L math,
 *      safe HTML syntax highlighting, accessibility snapshot (landmarks, headings, roles, focusable,
 *      touch >= 44px), sticky toolbar scroll-margin-top, and runtime toggle contracts.
 */

const { test, before } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const { contrastRatio } = require('../lib/contrast');
const { parseFrontMatter, emitCSS, emitThemeCSS } = require('../scripts/generate-tokens');
const { lintOklchContrastFloors } = require('../scripts/lint-preview');
const { syncFixtureHtml } = require('../scripts/sync-fixture-metrics');
const {
  IFRAME_BASE_CSS,
  ISOLATION_BASE_CSS,
  parseHashState,
  serializeHashState,
  extractTokenReferences,
  colorToOklchL,
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

test('preview/catalog.css, dist/tokens.css, dist/themes.css, and iframe styles enforce 4-tier OKLCH elevation, ΔL floors, WCAG ratios, and GPU-only motion', () => {
  const css = fs.readFileSync(path.join(ROOT, 'preview', 'catalog.css'), 'utf-8');
  const designTokens = parseFrontMatter(fs.readFileSync(path.join(ROOT, 'DESIGN.md'), 'utf-8'));
  const tokensCss = emitCSS(designTokens);
  const themesCss = emitThemeCSS(designTokens);
  const specimenCss = fs.readFileSync(path.join(ROOT, 'lib', 'specimen-layouts.css'), 'utf-8');

  for (const [label, sheet] of [
    ['preview/catalog.css', css],
    ['dist/specimen-layouts.css', specimenCss],
    ['IFRAME_BASE_CSS', IFRAME_BASE_CSS],
    ['ISOLATION_BASE_CSS', ISOLATION_BASE_CSS],
  ]) {
    assert.doesNotMatch(sheet, /#[0-9a-fA-F]{3,8}\b/, `${label} must not contain raw hex colors`);
    assert.doesNotMatch(sheet, /\brgba?\(/i, `${label} must not contain rgb()/rgba()`);
    assert.doesNotMatch(sheet, /\bhsla?\(/i, `${label} must not contain hsl()/hsla()`);
  }

  for (const needle of [
    '--vi-surface-canvas: oklch(0.10 0.012 275)',
    '--vi-surface-shell: oklch(0.13 0.014 275)',
    '--vi-surface-card: oklch(0.16 0.016 275)',
    '--vi-surface-elevated: oklch(0.20 0.018 275)',
    '--vi-ink-primary: oklch(0.96 0.006 275)',
    '--vi-ink-muted: oklch(0.70 0.012 275)',
    '--vi-border-subtle: oklch(1 0 0 / 0.08)',
    '--vi-border-interactive: oklch(0.56 0.020 275)',
    '--vi-radius-outer: 12px',
    '--vi-radius-inner: 8px',
  ]) {
    assert.ok(css.includes(needle), `preview/catalog.css missing required token: ${needle}`);
    assert.ok(tokensCss.includes(needle), `dist/tokens.css missing required token: ${needle}`);
  }

  assert.ok(themesCss.includes('[data-theme="high-contrast"]'), 'dist/themes.css must emit high-contrast theme');

  for (const needle of [
    ':root[data-theme="light"]',
    ':root[data-theme="high-contrast"]',
    'scroll-margin-top: calc(var(--shell-topbar-h, 52px) + 24px)',
    'container-type: inline-size',
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
    '.vi-toggle-icon',
  ]) {
    assert.ok(css.includes(needle), `preview/catalog.css missing required token/rule: ${needle}`);
  }

  for (const iframeRule of [
    'color-scheme: dark',
    'color-scheme: light',
    ':root[data-theme="high-contrast"]',
    'scrollbar-width: thin',
    'oklch(0.34 0.015 275)',
    '::-webkit-scrollbar-thumb',
  ]) {
    assert.ok(IFRAME_BASE_CSS.includes(iframeRule), `IFRAME_BASE_CSS missing required scrollbar/theme rule: ${iframeRule}`);
  }

  // GPU-only transitions across catalog.css and specimen-layouts.css
  for (const sheet of [css, specimenCss]) {
    for (const m of sheet.matchAll(/transition:\s*([^;]+);/g)) {
      const decl = m[1];
      assert.doesNotMatch(decl, /\b(width|height|padding|margin|background|border|color|backdrop-filter|all)\b/i, `non-GPU transition detected: ${decl}`);
    }
  }

  // Automated lint-preview OKLCH ΔL floor check must pass cleanly and catch violations
  assert.deepEqual(lintOklchContrastFloors(), []);
  const os = require('os');
  const badCssPath = path.join(os.tmpdir(), `videsign-bad-contrast-${process.pid}.css`);
  fs.writeFileSync(badCssPath, ':root, :root[data-theme="dark"] { --vi-surface-canvas: oklch(0.10 0.012 275); --vi-surface-shell: oklch(0.13 0.014 275); --vi-surface-card: oklch(0.16 0.016 275); --vi-surface-elevated: oklch(0.20 0.018 275); --vi-ink-primary: oklch(0.80 0.006 275); --vi-ink-secondary: oklch(0.55 0.010 275); --vi-ink-muted: oklch(0.55 0.012 275); --vi-border-interactive: oklch(0.45 0.02 275); --vi-border-strong: oklch(0.45 0.02 275); --vi-accent-focus: oklch(0.45 0.22 292); }', 'utf-8');
  try {
    const badProblems = lintOklchContrastFloors(badCssPath);
    assert.ok(badProblems.some((p) => p.includes('--vi-ink-primary') && p.includes('< 0.75')), 'must flag primary ΔL < 0.75');
    assert.ok(badProblems.some((p) => p.includes('--vi-ink-muted') && p.includes('< 0.45')), 'must flag muted ΔL < 0.45');
    assert.ok(badProblems.some((p) => p.includes('--vi-border-interactive') && p.includes('< 0.35')), 'must flag interactive border ΔL < 0.35');
  } finally {
    fs.rmSync(badCssPath, { force: true });
  }

  // Verify OKLCH ΔL floors AND WCAG 2.1 contrast on all 4 elevation tiers in dark, light, and high-contrast modes
  const darkBlock = css.match(/:root,\s*:root\[data-theme="dark"\]\s*\{([\s\S]*?)\}/)[1];
  const lightBlock = css.match(/:root\[data-theme="light"\]\s*\{([\s\S]*?)\}/)[1];
  const hcBlock = css.match(/:root\[data-theme="high-contrast"\]\s*\{([\s\S]*?)\}/)[1];
  const suites = [
    { name: 'dark', vars: parseOklchVars(darkBlock) },
    { name: 'light', vars: parseOklchVars(lightBlock) },
    { name: 'high-contrast', vars: parseOklchVars(hcBlock) },
  ];
  for (const suite of suites) {
    const tiers = ['--vi-surface-canvas', '--vi-surface-shell', '--vi-surface-card', '--vi-surface-elevated'];
    for (const tier of tiers) {
      const tierL = suite.vars[tier][0];
      const bg = oklchToRgb(...suite.vars[tier]);

      const primaryDl = Math.abs(suite.vars['--vi-ink-primary'][0] - tierL);
      assert.ok(primaryDl >= 0.75, `${suite.name} --vi-ink-primary on ${tier} ΔL=${primaryDl.toFixed(3)} must be >= 0.75`);

      for (const ink of ['--vi-ink-secondary', '--vi-ink-muted']) {
        const dl = Math.abs(suite.vars[ink][0] - tierL);
        assert.ok(dl >= 0.45, `${suite.name} ${ink} on ${tier} ΔL=${dl.toFixed(3)} must be >= 0.45`);
      }

      for (const ink of ['--vi-ink-primary', '--vi-ink-secondary', '--vi-ink-muted']) {
        const ratio = contrastRatio(oklchToRgb(...suite.vars[ink]), bg);
        assert.ok(ratio >= 4.5, `${suite.name} ${ink} on ${tier} must be >= 4.5:1, got ${ratio.toFixed(2)}`);
      }

      for (const ctrl of ['--vi-border-interactive', '--vi-border-strong', '--vi-accent-focus']) {
        const dl = Math.abs(suite.vars[ctrl][0] - tierL);
        assert.ok(dl >= 0.35, `${suite.name} ${ctrl} on ${tier} ΔL=${dl.toFixed(3)} must be >= 0.35`);
      }

      for (const ctrl of ['--vi-border-interactive', '--vi-border-strong', '--vi-accent-focus', '--vi-dot-active', '--vi-dot-accent', '--vi-dot-warn']) {
        const ratio = contrastRatio(oklchToRgb(...suite.vars[ctrl]), bg);
        assert.ok(ratio >= 3.0, `${suite.name} ${ctrl} on ${tier} must be >= 3.0:1, got ${ratio.toFixed(2)}`);
      }
    }
  }
});

test('preview/index.html enforces zero-JS runtime contract, distinct toggle icons, 4-tab ARIA Inspector, and Reset Filters recovery', () => {
  const html = fs.readFileSync(path.join(ROOT, 'preview', 'index.html'), 'utf-8');
  assert.doesNotMatch(html, /id="tier-filter-bar"/, 'duplicate top sidebar tier-filter pill block must be removed');
  assert.doesNotMatch(html, /\b(90|93|113)\s+(verified|specimens|active|legacy|components)/i, 'shell must not hardcode specimen totals');
  assert.doesNotMatch(html, /vi-toggle-dot/, 'identical purple status dots must be replaced by distinct semantic icons');
  for (const needle of [
    'data-theme="dark" data-motion="full" data-glass="opaque"',
    'href="../dist/specimen-layouts.css"',
    'id="filter-all-active"',
    'id="toggle-legacy"',
    'id="toggle-theme"',
    'id="toggle-motion"',
    'id="toggle-glass"',
    'class="vi-toggle-icon"',
    'class="search-kbd"',
    '>Reset Filters<',
    'id="specimen-inspector-backdrop"',
    'role="tablist"',
    'role="tabpanel"',
    'data-inspector-tab="preview"',
    'data-inspector-tab="markup"',
    'data-inspector-tab="tokens"',
    'data-inspector-tab="a11y"',
    'Measured ΔL',
  ]) {
    assert.ok(html.includes(needle), `preview/index.html missing required shell hook: ${needle}`);
  }
});

test('anti-slop specimen refactors enforce proportional Subgrid frames, constrained brief ledger, grounded data-table rows, and container-query bento', () => {
  const layoutCss = fs.readFileSync(path.join(ROOT, 'lib', 'specimen-layouts.css'), 'utf-8');
  assert.ok(layoutCss.includes('minmax(0, 1.45fr) minmax(0, 1.1fr) minmax(0, 0.85fr)'), 'viewport frames must use proportional asymmetric tracks');
  assert.ok(layoutCss.includes('grid-template-rows: subgrid'), 'specimen layouts must use CSS Subgrid');
  assert.ok(layoutCss.includes('minmax(8.75rem, 13.75rem) minmax(0, 1fr)'), 'brief ledger must use structured 2-col grid (140px-220px)');
  assert.ok(layoutCss.includes('text-wrap: pretty'), 'headings must apply text-wrap: pretty');
  assert.ok(layoutCss.includes('clamp('), 'headings must apply fluid clamp() sizing');

  const vpHtml = fs.readFileSync(path.join(ROOT, 'preview', 'viewport-frame-set.html'), 'utf-8');
  assert.ok(vpHtml.includes('class="vi-viewport-frames"'));
  assert.ok(vpHtml.includes('vi-viewport-card--active'));
  assert.doesNotMatch(vpHtml, /lg:grid-cols-3/, 'rigid repeat(3, 1fr) must be removed from viewport-frame-set');

  const briefHtml = fs.readFileSync(path.join(ROOT, 'preview', 'brief-contract-card.html'), 'utf-8');
  assert.ok(briefHtml.includes('class="vi-brief-surface"'));
  assert.ok(briefHtml.includes('class="vi-brief-ledger"'));
  assert.ok(briefHtml.includes('vi-brief-contract-key--keep'));
  assert.doesNotMatch(briefHtml, /justify-between[^>]*>\s*<dt/, 'full-width space-between voids must be removed from brief metadata rows');

  const tableHtml = fs.readFileSync(path.join(ROOT, 'preview', 'data-table.html'), 'utf-8');
  assert.ok(tableHtml.includes('<table class="vi-data-table">'));
  assert.ok([...tableHtml.matchAll(/<tbody>[\s\S]*?<\/tbody>/g)][0][0].match(/<tr>/g).length >= 4, 'data-table must populate >= 4 grounded fixture rows');
  for (const cell of ['run_01j8k2', 'Complete', 'videsign.tokens.emit', 'Running', 'Waiting', 'Failed']) {
    assert.ok(tableHtml.includes(cell), `data-table missing grounded cell: ${cell}`);
  }

  const stageCss = fs.readFileSync(path.join(ROOT, 'lib', 'stage.css'), 'utf-8');
  assert.ok(stageCss.includes('[data-motion="reduced"] .stage *'), 'stage.css must freeze immediately under data-motion="reduced"');

  const orbEngine = fs.readFileSync(path.join(ROOT, 'lib', 'orbital-field-engine.ts'), 'utf-8');
  assert.ok(orbEngine.includes("val === 'reduced'"), 'OrbitalFieldEngine must freeze immediately under data-motion="reduced"');
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

test('preview/catalog.js pure helpers parse/serialize URL hashes, extract tokens, compute OKLCH L, and build accessibility snapshots', () => {
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

  // OKLCH lightness parsing & conversion checks
  assert.equal(colorToOklchL('oklch(0.96 0.006 275)'), 0.96);
  assert.equal(colorToOklchL('oklch(66% 0.012 275)'), 0.66);
  assert.ok(Math.abs(colorToOklchL('#ffffff') - 1) < 0.005);
  assert.ok(Math.abs(colorToOklchL('rgb(0, 0, 0)') - 0) < 0.005);

  const tokens = extractTokenReferences(
    '<div class="vi-brief-surface vi-library-stage bg-surface-background-primary-base text-text-content-primary-base vi-glass"></div>',
    new Set(),
  );
  assert.ok(tokens.includes('--vi-colors-surface-background-primary-base'));
  assert.ok(tokens.includes('--vi-colors-text-content-primary-base'));
  assert.ok(tokens.includes('--vi-effects-glass-crystal-surface-base'));
  assert.ok(tokens.includes('--vi-library-surface'));
  assert.ok(tokens.includes('--vi-surface-card'));
  assert.ok(tokens.includes('--vi-ink-primary'));

  const extTokens = extractTokenReferences('<section class="vi-ext-scope"><div class="vi-ext-card"></div></section>', new Set());
  assert.ok(extTokens.includes('--vi-ext-card'));
  assert.ok(extTokens.includes('--vi-ext-accent'));
  assert.ok(extTokens.includes('--vi-surface-card'));

  const wsTokens = extractTokenReferences('<section class="vi-ws-scope"><div class="vi-ws-card"></div></section>', new Set());
  assert.ok(wsTokens.includes('--vi-ws-card'));
  assert.ok(wsTokens.includes('--vi-ws-accent'));
  assert.ok(wsTokens.includes('--vi-surface-card'));

  const mockNode = {
    querySelector: () => null,
    querySelectorAll(sel) {
      if (sel.includes('header')) {
        return [{ tagName: 'NAV', getAttribute: (k) => (k === 'aria-label' ? 'Primary' : null), hasAttribute: () => false }];
      }
      if (sel.includes('data-specimen-heading')) {
        return [{ tagName: 'DIV', getAttribute: (k) => (k === 'data-specimen-heading' ? 'h2' : null), hasAttribute: () => false, textContent: 'Design brief' }];
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
  assert.equal(snap.headings.length, 1);
  assert.equal(snap.headings[0].level, 'h2');
  assert.equal(snap.roles.length, 1);
  assert.equal(snap.focusableCount, 1);
  assert.equal(snap.interactive.length, 1);
  assert.equal(snap.touchPass, 1);
  assert.equal(snap.touchWarn, 0);
  assert.equal(parseHashState('#catalog?cat=layouts&specimen=layout-public-site').category, 'layouts');
});

test('manifest count equals active catalog count (111) and design-studio-canvas aligns with museum accent grammar', () => {
  const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'dist', 'components.manifest.json'), 'utf-8'));
  const indexHtml = fs.readFileSync(path.join(ROOT, 'preview', 'index.html'), 'utf-8');
  const activeCount = [...indexHtml.matchAll(/file:\s*'[^']+',\s*tier:\s*'([^']+)'/g)].filter((m) => m[1] !== 'legacy').length;
  assert.equal(manifest.componentCount, activeCount, 'manifest componentCount must equal active specimen count');
  assert.equal(manifest.componentCount, 111);

  const studio = fs.readFileSync(path.join(ROOT, 'preview', 'design-studio-canvas.html'), 'utf-8');
  assert.ok(studio.includes('bg-status-indicator-success-base'), 'sync ready uses semantic status-ok dot');
  assert.doesNotMatch(studio, /bg-status-indicator-info-base[\s\S]*sync ready/, 'off-palette blue dot removed from sync ready');
  assert.ok(studio.includes('Pinned critique slot'), 'pinned critique slot legend present');
  assert.ok(studio.includes('>Schematic<'), 'inner schematic switcher visually subordinated');
});
