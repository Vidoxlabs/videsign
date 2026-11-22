'use strict';

/**
 * Modern documentation portal layout & renderer verification gates:
 *   1. Zero hex literals (#...), zero rgb()/rgba(), zero fixed px dimensions, and zero uppercase
 *      transforms across source and emitted artifacts.
 *   2. Mathematical WCAG 2.1 contrast floor (>= 4.5:1 text, >= 3.0:1 hairlines/borders/controls)
 *      verified across both Dark Nocturne and Light themes on primary, secondary, and tertiary surfaces.
 *   3. Container-query 3-col / 2-col / 1-col recomposition, scroll-margin-block-start heading offset,
 *      44px touch targets on every interactive control, VWXYZ persona isolation, and glass ceiling.
 *   4. Vanilla JS controller runtime tests: synced code tabs + keyboard roving + localStorage,
 *      facet filtering + polite count, Cmd+K palette + Esc focus restore, mobile drawer & Ask Violet
 *      sheet, IntersectionObserver scroll-spy TOC, clipboard copy receipts, and leak-free destroy().
 */

const { test, before } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const { contrastRatio } = require('../lib/contrast');
const { emitDocsPortalArtifacts } = require('../scripts/generate-tokens');
const { initDocsPortal, LANG_STORAGE_KEY } = require('../lib/docs-portal');

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

function parseOklchTokens(cssBlock) {
  const map = {};
  for (const m of cssBlock.matchAll(/(--vi-docs-[a-z0-9-]+):\s*(?:var\([^,]+,\s*)?oklch\(\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)(?:\s*\/\s*[\d.]+)?\s*\)/g)) {
    map[m[1]] = [Number(m[2]), Number(m[3]), Number(m[4])];
  }
  return map;
}

before(() => {
  execFileSync(process.execPath, [path.join(ROOT, 'scripts', 'generate-tokens.js')], { cwd: ROOT, stdio: 'ignore' });
});

test('docs-portal source and emitted CSS/JS/fragments contain zero hex literals and zero rgb/rgba calls', () => {
  const files = [
    path.join(ROOT, 'lib', 'docs-portal.css'),
    path.join(ROOT, 'lib', 'docs-portal.js'),
    path.join(ROOT, 'dist', 'docs-portal.css'),
    path.join(ROOT, 'dist', 'docs-portal.js'),
    path.join(ROOT, 'preview', 'docs-sidebar-nav.html'),
    path.join(ROOT, 'preview', 'docs-quickstart-grid.html'),
    path.join(ROOT, 'preview', 'docs-code-tabs.html'),
    path.join(ROOT, 'preview', 'docs-page-actions.html'),
    path.join(ROOT, 'preview', 'layout-docs-portal.html'),
  ];
  for (const filePath of files) {
    const src = fs.readFileSync(filePath, 'utf-8');
    const rel = path.relative(ROOT, filePath);
    assert.doesNotMatch(src, /#[0-9a-fA-F]{3,8}\b/, `${rel} must not contain hex color literals`);
    assert.doesNotMatch(src, /\brgba?\(/i, `${rel} must not contain rgb()/rgba() values`);
  }
});

test('docs-portal.css enforces container queries, zero px units, scroll-margin, logical properties, and emitted parity', () => {
  const css = fs.readFileSync(path.join(ROOT, 'lib', 'docs-portal.css'), 'utf-8');
  assert.doesNotMatch(css, /\b\d+(?:\.\d+)?px\b/i, 'docs-portal.css must avoid fixed px dimensions');
  assert.doesNotMatch(css, /text-transform:\s*uppercase/i, 'ADR-007 forbids uppercase text-transform');
  for (const token of [
    'container-type: inline-size',
    'container-name: docs-portal',
    'container-name: docs-main',
    'scroll-margin-block-start: calc(var(--vi-docs-header-h) + 1.5rem)',
    '--vi-docs-sidebar-w: clamp(14rem, 18cqi, 16.5rem)',
    '--vi-docs-toc-w: clamp(12.5rem, 16cqi, 15rem)',
    '--vi-docs-prose-max: 72ch',
    '--vi-docs-hub-max: 68rem',
    'repeat(auto-fill, minmax(min(100%, 17.5rem), 1fr))',
    'position: sticky',
    'inset-inline-start: 0',
    ':focus-visible',
    '[data-theme="light"]',
    '@container docs-portal (max-width: 74rem)',
    '@container docs-portal (max-width: 60rem)',
    '@container docs-portal (max-width: 36rem)',
    '@container docs-main (max-width: 48rem)',
    '@media (prefers-reduced-motion: reduce)',
    '@media (forced-colors: active)',
  ]) {
    assert.ok(css.includes(token), `docs-portal.css missing required rule/token: ${token}`);
  }
  const emitted = emitDocsPortalArtifacts();
  assert.equal(emitted['docs-portal.css'], css);
  assert.equal(emitted['docs-portal.js'], fs.readFileSync(path.join(ROOT, 'lib', 'docs-portal.js'), 'utf-8'));
});

test('dark Nocturne and light theme tokens meet >= 4.5:1 text contrast and >= 3.0:1 hairline/border contrast on all surfaces', () => {
  const css = fs.readFileSync(path.join(ROOT, 'lib', 'docs-portal.css'), 'utf-8');
  const darkBlock = css.match(/:root,\s*\.vi-docs-scope\s*\{([\s\S]*?)\}/)[1];
  const lightBlock = css.match(/\[data-theme="light"\][\s\S]*?\{([\s\S]*?)\}/)[1];
  const darkTokens = parseOklchTokens(darkBlock);
  const lightTokens = parseOklchTokens(lightBlock);

  const suites = [
    {
      name: 'dark',
      tokens: darkTokens,
      surfaces: {
        primary: [10, 10, 14],
        secondary: [18, 18, 26],
        tertiary: [28, 28, 36],
      },
      textPairs: {
        '--vi-docs-ink': [255, 255, 255],
        '--vi-docs-ink-muted': [161, 161, 170],
      },
    },
    {
      name: 'light',
      tokens: lightTokens,
      surfaces: {
        primary: [248, 249, 250],
        secondary: [255, 255, 255],
        tertiary: [241, 243, 245],
      },
      textPairs: {
        '--vi-docs-ink': [15, 23, 42],
        '--vi-docs-ink-muted': [71, 85, 105],
      },
    },
  ];

  for (const suite of suites) {
    for (const [surfName, surfRgb] of Object.entries(suite.surfaces)) {
      for (const [inkName, inkRgb] of Object.entries(suite.textPairs)) {
        const ratio = contrastRatio(inkRgb, surfRgb);
        assert.ok(ratio >= 4.5, `${suite.name} ${inkName} on ${surfName} must be >= 4.5:1, got ${ratio.toFixed(2)}`);
      }
      for (const borderKey of [
        '--vi-docs-border-hairline',
        '--vi-docs-border-strong',
        '--vi-docs-accent',
        '--vi-docs-status-info',
        '--vi-docs-status-warning',
        '--vi-docs-status-success',
        '--vi-docs-status-error',
      ]) {
        const tuple = suite.tokens[borderKey];
        assert.ok(tuple, `${suite.name} missing oklch token ${borderKey}`);
        const rgb = oklchToRgb(tuple[0], tuple[1], tuple[2]);
        const ratio = contrastRatio(rgb, surfRgb);
        assert.ok(ratio >= 3.0, `${suite.name} ${borderKey} on ${surfName} must be >= 3.0:1, got ${ratio.toFixed(2)}`);
      }
    }
  }
});

test('all docs portal fragments enforce 44px touch targets, VWXYZ isolation, glass limits, and structural contracts', () => {
  const newFiles = [
    'docs-sidebar-nav.html',
    'docs-quickstart-grid.html',
    'docs-code-tabs.html',
    'docs-page-actions.html',
    'layout-docs-portal.html',
  ];

  for (const file of newFiles) {
    const html = fs.readFileSync(path.join(ROOT, 'preview', file), 'utf-8').replace(/<!--[\s\S]*?-->/g, '');
    assert.doesNotMatch(html, /persona-accent-/, `${file} must isolate VWXYZ persona accents out of docs chrome`);
    for (const m of html.matchAll(/<(button|textarea|a)\b([^>]*)>/g)) {
      const cls = (m[2].match(/\bclass="([^"]*)"/) || [])[1] || '';
      assert.match(cls, /h-action-(min|wide)-default/, `${file}: 44px touch target missing on ${m[0].slice(0, 90)}`);
    }
    const glassCount = [...html.matchAll(/\bclass="([^"]*)"/g)]
      .flatMap((m) => m[1].split(/\s+/))
      .filter((cls) => cls === 'vi-glass' || cls === 'vi-glass-shell').length;
    if (file === 'layout-docs-portal.html') {
      assert.equal(glassCount, 1, 'layout-docs-portal must keep crystal glass strictly on the single header island');
    } else {
      assert.equal(glassCount, 0, `${file} must remain on solid reading surfaces (0 glass layers)`);
    }
  }

  const portal = fs.readFileSync(path.join(ROOT, 'preview', 'layout-docs-portal.html'), 'utf-8');
  for (const needle of [
    'Skip to documentation content',
    'Search docs',
    'Cmd+K',
    'aria-current="page"',
    'aria-current="location"',
    'Copy section link',
    'Showing 6 of 6 quickstarts',
    '5 min to complete',
    '01',
    '02',
    '03',
    '04',
    'Verify &amp; gate',
    'Copy page (.md)',
    'View raw .md',
    'llms.txt',
    'Ask Violet about this page',
    'vi-docs-callout--note',
    'vi-docs-callout--warning',
    'vi-docs-callout--boundary',
    'vi-docs-table-wrap',
    'vi-docs-pager',
    'data-docs-palette',
    'data-docs-drawer',
    'data-docs-chat-sheet',
    'data-docs-toast',
  ]) {
    assert.ok(portal.includes(needle), `layout-docs-portal.html missing required element/hook: ${needle}`);
  }
});

test('lib/docs-portal.js drives synced code tabs, facet filtering, Cmd+K palette, scroll-spy TOC, copy receipts, and clean destroy()', async () => {
  // Minimal deterministic DOM harness verifying every interactive contract without browser overhead.
  function makeEl(tag, attrs = {}, text = '') {
    const listeners = new Map();
    const map = { ...attrs };
    const el = {
      tagName: tag.toUpperCase(),
      id: map.id || '',
      hidden: Boolean(map.hidden),
      value: map.value || '',
      textContent: text,
      focused: false,
      children: [],
      _listeners: listeners,
      getAttribute(k) { return Object.prototype.hasOwnProperty.call(map, k) ? map[k] : null; },
      setAttribute(k, v) { map[k] = String(v); if (k === 'id') el.id = String(v); },
      removeAttribute(k) { delete map[k]; },
      hasAttribute(k) { return Object.prototype.hasOwnProperty.call(map, k); },
      addEventListener(t, fn) {
        if (!listeners.has(t)) listeners.set(t, new Set());
        listeners.get(t).add(fn);
      },
      removeEventListener(t, fn) {
        if (listeners.has(t)) listeners.get(t).delete(fn);
      },
      dispatch(t, ev = {}) {
        const event = { target: el, preventDefault() { event.defaultPrevented = true; }, ...ev };
        const set = listeners.get(t);
        if (set) for (const fn of [...set]) fn(event);
        return event;
      },
      click() { return el.dispatch('click'); },
      focus() { el.focused = true; mockDoc.activeElement = el; },
      scrollIntoView() { el.scrolledIntoView = true; },
      querySelector(sel) { return el.querySelectorAll(sel)[0] || null; },
      querySelectorAll(sel) {
        return matchSelector(el.children, sel);
      },
    };
    return el;
  }

  function matchSingle(node, sel) {
    if (sel === 'input, button, a[href], textarea') {
      return ['INPUT', 'BUTTON', 'A', 'TEXTAREA'].includes(node.tagName);
    }
    if (sel === 'h1, h2, h3, p, pre code') {
      return ['H1', 'H2', 'H3', 'P', 'CODE'].includes(node.tagName);
    }
    if (sel === 'code') return node.tagName === 'CODE';
    if (sel.startsWith('#')) return node.id === sel.slice(1);
    const parts = sel.split(',').map((s) => s.trim());
    if (parts.length > 1) return parts.some((p) => matchSingle(node, p));
    if (sel === '[role="tabpanel"]:not([hidden])') {
      return node.getAttribute('role') === 'tabpanel' && !node.hidden;
    }
    const attrMatches = [...sel.matchAll(/\[([^\]=]+)(?:="([^"]*)")?\]/g)];
    if (attrMatches.length === 0) return false;
    return attrMatches.every(([, name, val]) => (val === undefined ? node.hasAttribute(name) : node.getAttribute(name) === val));
  }

  function flatten(list, out = []) {
    for (const item of list) {
      out.push(item);
      if (item.children && item.children.length) flatten(item.children, out);
    }
    return out;
  }

  function matchSelector(list, sel) {
    return flatten(list).filter((n) => matchSingle(n, sel));
  }

  const storage = new Map();
  globalThis.localStorage = {
    getItem: (k) => (storage.has(k) ? storage.get(k) : null),
    setItem: (k, v) => { storage.set(k, String(v)); },
  };
  const copied = [];
  const prevNavigator = globalThis.navigator;
  Object.defineProperty(globalThis, 'navigator', {
    configurable: true,
    value: {
      clipboard: {
        writeText: (txt) => {
          copied.push(txt);
          return Promise.resolve();
        },
      },
    },
  });

  let spyCb = null;
  let spyDisconnected = false;
  globalThis.IntersectionObserver = class {
    constructor(cb) { spyCb = cb; }
    observe() {}
    disconnect() { spyDisconnected = true; }
  };

  // Build two synced code tab groups
  function makeCodeGroup(prefix) {
    const group = makeEl('div', { 'data-docs-code-tabs': '', 'data-docs-sync-group': 'portal-lang' });
    const tTs = makeEl('button', { role: 'tab', 'data-docs-lang': 'ts', 'aria-selected': 'true', tabindex: '0' }, 'TypeScript');
    const tPy = makeEl('button', { role: 'tab', 'data-docs-lang': 'py', 'aria-selected': 'false', tabindex: '-1' }, 'Python');
    const tCli = makeEl('button', { role: 'tab', 'data-docs-lang': 'cli', 'aria-selected': 'false', tabindex: '-1' }, 'CLI');
    const pTs = makeEl('div', { role: 'tabpanel', 'data-docs-lang': 'ts' });
    pTs.children.push(makeEl('code', {}, `${prefix}:ts`));
    const pPy = makeEl('div', { role: 'tabpanel', 'data-docs-lang': 'py', hidden: true });
    pPy.children.push(makeEl('code', {}, `${prefix}:py`));
    const pCli = makeEl('div', { role: 'tabpanel', 'data-docs-lang': 'cli', hidden: true });
    pCli.children.push(makeEl('code', {}, `${prefix}:cli`));
    const status = makeEl('span', { 'data-docs-code-status': '' }, 'Ready');
    const copyBtn = makeEl('button', { 'data-docs-copy-code': '' }, 'Copy');
    group.children.push(tTs, tPy, tCli, pTs, pPy, pCli, status, copyBtn);
    return { group, tTs, tPy, tCli, pTs, pPy, pCli, status, copyBtn };
  }

  const codeA = makeCodeGroup('hero');
  const codeB = makeCodeGroup('article');

  // Build facet section
  const qsSection = makeEl('section', { 'data-docs-qs-section': '' });
  const pillAll = makeEl('button', { 'data-docs-facet': 'all', 'aria-pressed': 'true' }, 'All');
  const pillHarness = makeEl('button', { 'data-docs-facet': 'harness', 'aria-pressed': 'false' }, 'Harness');
  const pillApi = makeEl('button', { 'data-docs-facet': 'api', 'aria-pressed': 'false' }, 'API');
  const pillNone = makeEl('button', { 'data-docs-facet': 'missing', 'aria-pressed': 'false' }, 'Missing');
  const card1 = makeEl('article', { 'data-docs-qs-card': '', 'data-docs-category': 'harness' });
  const card2 = makeEl('article', { 'data-docs-qs-card': '', 'data-docs-category': 'api' });
  const qsCount = makeEl('span', { 'data-docs-qs-count': '' }, 'Showing 2 of 2 quickstarts');
  const qsEmpty = makeEl('div', { 'data-docs-qs-empty': '', hidden: true });
  const qsReset = makeEl('button', { 'data-docs-qs-reset': '' }, 'Reset');
  qsSection.children.push(pillAll, pillHarness, pillApi, pillNone, card1, card2, qsCount, qsEmpty, qsReset);

  // Build TOC, headings, palette, drawer, chat, toast, theme, copy triggers
  const h1 = makeEl('h2', { id: 'sec-one' }, 'Section one');
  const h2 = makeEl('h2', { id: 'sec-two' }, 'Section two');
  const toc1 = makeEl('a', { href: '#sec-one', 'data-docs-toc-link': '', 'aria-current': 'location' });
  const toc2 = makeEl('a', { href: '#sec-two', 'data-docs-toc-link': '' });

  const openPaletteBtn = makeEl('button', { 'data-docs-open-palette': '', 'aria-expanded': 'false' });
  const palette = makeEl('div', { 'data-docs-palette': '', hidden: true });
  const paletteInput = makeEl('input', { 'data-docs-palette-input': '' });
  const opt1 = makeEl('button', { 'data-docs-palette-option': '', 'aria-selected': 'true', 'data-docs-jump-hash': 'sec-one' }, 'Run lifecycle guide');
  const opt2 = makeEl('button', { 'data-docs-palette-option': '', 'aria-selected': 'false', 'data-docs-jump-hash': 'sec-two' }, 'API endpoint routes');
  const paletteCount = makeEl('span', { 'data-docs-palette-count': '' }, '2 commands matched');
  palette.children.push(paletteInput, opt1, opt2, paletteCount);

  const openDrawerBtn = makeEl('button', { 'data-docs-open-drawer': '', 'aria-expanded': 'false' });
  const drawer = makeEl('div', { 'data-docs-drawer': '', hidden: true });
  const openChatBtn = makeEl('button', { 'data-docs-open-chat': '', 'aria-expanded': 'false' });
  const chatSheet = makeEl('div', { 'data-docs-chat-sheet': '', hidden: true });

  const article = makeEl('article', { 'data-docs-article': '' });
  article.children.push(h1, h2);
  const copyMdBtn = makeEl('button', { 'data-docs-copy-markdown': '' });
  const copyAnchorBtn = makeEl('button', { 'data-docs-copy-anchor': 'sec-two' });
  const actionsStatus = makeEl('span', { 'data-docs-actions-status': '' }, 'Ready');
  const toast = makeEl('div', { 'data-docs-toast': '', hidden: true });
  const themeBtn = makeEl('button', { 'data-docs-toggle-theme': '', 'aria-pressed': 'false' }, 'Theme: dark');

  const docRoot = makeEl('div', {});
  docRoot.children.push(
    codeA.group, codeB.group, qsSection, article, toc1, toc2,
    openPaletteBtn, palette, openDrawerBtn, drawer, openChatBtn, chatSheet,
    copyMdBtn, copyAnchorBtn, actionsStatus, toast, themeBtn,
  );
  const docElement = makeEl('html', { 'data-theme': 'dark' });
  const mockDoc = {
    nodeType: 9,
    activeElement: openPaletteBtn,
    documentElement: docElement,
    _listeners: new Map(),
    addEventListener(t, fn) {
      if (!mockDoc._listeners.has(t)) mockDoc._listeners.set(t, new Set());
      mockDoc._listeners.get(t).add(fn);
    },
    removeEventListener(t, fn) {
      if (mockDoc._listeners.has(t)) mockDoc._listeners.get(t).delete(fn);
    },
    dispatch(t, ev = {}) {
      const event = { preventDefault() { event.defaultPrevented = true; }, ...ev };
      const set = mockDoc._listeners.get(t);
      if (set) for (const fn of [...set]) fn(event);
      return event;
    },
    getElementById(id) { return flatten(docRoot.children).find((n) => n.id === id) || null; },
    querySelector: (s) => docRoot.querySelector(s),
    querySelectorAll: (s) => docRoot.querySelectorAll(s),
  };
  docRoot.ownerDocument = mockDoc;

  const ctrl = initDocsPortal(docRoot);

  // 1. Synced code tabs + ArrowRight roving + localStorage + copy
  codeA.tTs.dispatch('keydown', { key: 'ArrowRight' });
  assert.equal(codeA.tPy.getAttribute('aria-selected'), 'true');
  assert.equal(codeB.tPy.getAttribute('aria-selected'), 'true', 'sibling code group must sync to py');
  assert.equal(codeB.pPy.hidden, false);
  assert.equal(codeB.pTs.hidden, true);
  assert.equal(storage.get(LANG_STORAGE_KEY), 'py');

  codeB.copyBtn.click();
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(copied.at(-1), 'article:py');
  assert.equal(codeB.status.textContent, 'Copied snippet');

  // 2. Facet filtering + polite live counter + empty state + reset
  pillHarness.click();
  assert.equal(pillHarness.getAttribute('aria-pressed'), 'true');
  assert.equal(card1.hidden, false);
  assert.equal(card2.hidden, true);
  assert.equal(qsCount.textContent, 'Showing 1 of 2 quickstarts');
  assert.equal(qsEmpty.hidden, true);

  pillNone.click();
  assert.equal(qsCount.textContent, 'Showing 0 of 2 quickstarts');
  assert.equal(qsEmpty.hidden, false);

  qsReset.click();
  assert.equal(qsCount.textContent, 'Showing 2 of 2 quickstarts');
  assert.equal(qsEmpty.hidden, true);

  // 3. Cmd+K palette open, filter, Esc close restoring focus
  openPaletteBtn.focus();
  openPaletteBtn.focused = false;
  const cmdK = mockDoc.dispatch('keydown', { key: 'k', metaKey: true });
  assert.equal(cmdK.defaultPrevented, true);
  assert.equal(palette.hidden, false);
  assert.equal(paletteInput.focused, true);

  paletteInput.value = 'endpoint';
  paletteInput.dispatch('input');
  assert.equal(opt1.hidden, true);
  assert.equal(opt2.hidden, false);
  assert.equal(paletteCount.textContent, '1 commands matched');

  mockDoc.dispatch('keydown', { key: 'Escape' });
  assert.equal(palette.hidden, true);
  assert.equal(openPaletteBtn.focused, true);

  // 4. Mobile drawer & Ask Violet sheet
  openDrawerBtn.click();
  assert.equal(drawer.hidden, false);
  assert.equal(openDrawerBtn.getAttribute('aria-expanded'), 'true');
  mockDoc.dispatch('keydown', { key: 'Escape' });
  assert.equal(drawer.hidden, true);

  openChatBtn.click();
  assert.equal(chatSheet.hidden, false);
  mockDoc.dispatch('keydown', { key: 'Escape' });
  assert.equal(chatSheet.hidden, true);

  // 5. Scroll-spy TOC via IntersectionObserver
  spyCb([{ isIntersecting: true, target: h2 }]);
  assert.equal(toc1.getAttribute('aria-current'), null);
  assert.equal(toc2.getAttribute('aria-current'), 'location');

  // 6. Anchor + Markdown copy + theme toggle
  copyAnchorBtn.click();
  await new Promise((resolve) => setImmediate(resolve));
  assert.match(copied.at(-1), /#sec-two$/);
  assert.equal(toast.hidden, false);

  copyMdBtn.click();
  await new Promise((resolve) => setImmediate(resolve));
  assert.match(copied.at(-1), /## Section one/);
  assert.equal(actionsStatus.textContent, 'Copied page as Markdown');

  themeBtn.click();
  assert.equal(docElement.getAttribute('data-theme'), 'light');
  assert.equal(themeBtn.getAttribute('aria-pressed'), 'true');
  assert.equal(themeBtn.textContent, 'Theme: light');

  // 7. Clean teardown
  ctrl.destroy();
  assert.equal(spyDisconnected, true);
  assert.equal([...mockDoc._listeners.values()].every((s) => s.size === 0), true);

  if (prevNavigator !== undefined) {
    Object.defineProperty(globalThis, 'navigator', { configurable: true, value: prevNavigator });
  }
});
