'use strict';

/**
 * Core Production Components (10 new specimens) + Skills Library Polish Verification Suite:
 *   1. Zero hex/rgb/hsl across lib/core-components.css|js and all 10 new fragments.
 *   2. OKLCH ΔL contrast floors (primary >= 0.75, muted >= 0.45, border/focus >= 0.35)
 *      across dark, light, and high-contrast themes + GPU-only transitions + reduced-motion freeze.
 *   3. Semantic ARIA roles, 44px touch target floor, solid surfaces (0 glass), zero persona leaks.
 *   4. Skills Library hierarchy refactor: title-first card header, borderless neutral tool chips,
 *      zero -webkit-line-clamp mid-word truncation, and balanced 2-column Subgrid.
 *   5. lib/core-components.js runtime controller unit tests + clean destroy().
 */

const { test, before } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const { initCoreComponents } = require('../lib/core-components');
const { emitCoreComponentArtifacts } = require('../scripts/generate-tokens');

const ROOT = path.join(__dirname, '..');

const NEW_FRAGMENTS = [
  'combobox-multiselect.html',
  'date-range-picker.html',
  'tooltip-hover-card.html',
  'file-tree-explorer.html',
  'resizable-split-pane.html',
  'telemetry-chart-card.html',
  'reasoning-trace-block.html',
  'inline-citation-popover.html',
  'destructive-action-guard.html',
  'system-error-boundary.html',
];

function parseOklchL(block) {
  const map = {};
  for (const m of block.matchAll(/(--vi-core-[a-z0-9-]+):\s*(?:var\([^,]+,\s*)?oklch\(\s*([\d.]+)\s+[\d.]+\s+[\d.]+(?:\s*\/\s*[\d.]+)?\s*\)/g)) {
    map[m[1]] = Number(m[2]);
  }
  return map;
}

before(() => {
  execFileSync(process.execPath, [path.join(ROOT, 'scripts', 'generate-tokens.js')], { cwd: ROOT, stdio: 'ignore' });
});

test('core-components artifacts contain zero hex, rgb/rgba, or hsl/hsla color literals and pass emitted parity', () => {
  const files = [
    path.join(ROOT, 'lib', 'core-components.css'),
    path.join(ROOT, 'lib', 'core-components.js'),
    ...NEW_FRAGMENTS.map((f) => path.join(ROOT, 'preview', f)),
  ];
  for (const filePath of files) {
    const src = fs.readFileSync(filePath, 'utf-8');
    const rel = path.relative(ROOT, filePath);
    assert.doesNotMatch(src, /#[0-9a-fA-F]{3,8}\b/, `${rel} must not contain hex literals`);
    assert.doesNotMatch(src, /\brgba?\(/i, `${rel} must not contain rgb()/rgba() literals`);
    assert.doesNotMatch(src, /\bhsla?\(/i, `${rel} must not contain hsl()/hsla() literals`);
  }

  const emitted = emitCoreComponentArtifacts();
  assert.equal(emitted['core-components.css'], fs.readFileSync(path.join(ROOT, 'lib', 'core-components.css'), 'utf-8'));
  assert.equal(emitted['core-components.js'], fs.readFileSync(path.join(ROOT, 'lib', 'core-components.js'), 'utf-8'));
});

test('lib/core-components.css enforces 4-tier OKLCH elevation, ΔL floors, @container queries, GPU-only motion, and reduced-motion freeze', () => {
  const css = fs.readFileSync(path.join(ROOT, 'lib', 'core-components.css'), 'utf-8');
  for (const needle of [
    'container-name: vi-core-stage',
    '@container vi-core-stage (max-width: 30rem)',
    '[data-motion="reduced"] .vi-core-scope *',
    '@media (prefers-reduced-motion: reduce)',
    '--vi-chart-series-a:',
    '--vi-chart-series-b:',
    'stroke-dasharray: 5 4',
    'transition-duration: 0ms !important',
  ]) {
    assert.ok(css.includes(needle), `core-components.css missing required rule/token: ${needle}`);
  }

  for (const m of css.matchAll(/transition:\s*([^;]+);/g)) {
    assert.doesNotMatch(m[1], /\b(width|height|padding|margin|background|border|color|all)\b/i, `non-GPU transition: ${m[1]}`);
  }

  const darkBlock = css.match(/:root,\s*\.vi-core-scope\s*\{([\s\S]*?)\}/)[1];
  const lightBlock = css.match(/\[data-theme="light"\][\s\S]*?\{([\s\S]*?)\}/)[1];
  const hcBlock = css.match(/\[data-theme="high-contrast"\][\s\S]*?\{([\s\S]*?)\}/)[1];
  for (const [name, block] of [['dark', darkBlock], ['light', lightBlock], ['high-contrast', hcBlock]]) {
    const vars = parseOklchL(block);
    const tiers = ['--vi-core-canvas', '--vi-core-shell', '--vi-core-card', '--vi-core-elevated'];
    for (const tier of tiers) {
      assert.ok(Math.abs(vars['--vi-core-ink'] - vars[tier]) >= 0.75, `${name} ink ΔL < 0.75 on ${tier}`);
      assert.ok(Math.abs(vars['--vi-core-ink-muted'] - vars[tier]) >= 0.45, `${name} muted ΔL < 0.45 on ${tier}`);
      assert.ok(Math.abs(vars['--vi-core-border'] - vars[tier]) >= 0.35, `${name} border ΔL < 0.35 on ${tier}`);
      assert.ok(Math.abs(vars['--vi-core-accent'] - vars[tier]) >= 0.35, `${name} accent ΔL < 0.35 on ${tier}`);
    }
  }
});

test('all 10 new fragments enforce 44px touch targets, semantic ARIA roles, solid surfaces, and zero persona leaks', () => {
  const expectedMarkers = {
    'combobox-multiselect.html': ['role="combobox"', 'role="listbox"', 'role="option"', 'aria-multiselectable="true"', 'Reset search'],
    'date-range-picker.html': ['role="tablist"', 'role="grid"', '24h', '7d', '30d', 'Custom', 'UTC-05:00'],
    'tooltip-hover-card.html': ['role="tooltip"', 'aria-describedby="tip-copy-digest"', 'videsign.tokens.emit', 'ADR-024'],
    'file-tree-explorer.html': ['role="tree"', 'role="treeitem"', 'Modified', 'Admitted', 'Locked'],
    'resizable-split-pane.html': ['role="separator"', 'aria-valuenow="42"', 'Horizontal', 'Vertical'],
    'telemetry-chart-card.html': ['<svg class="vi-chart-svg"', 'p95 latency (solid)', 'Throughput tok/s (dashed)', '<table class="vi-core-table">'],
    'reasoning-trace-block.html': ['data-trace-state="streaming"', 'Streaming', 'Settled', 'vi-trace-pulse'],
    'inline-citation-popover.html': ['data-cite-id="1"', 'data-cite-id="2"', 'data-cite-id="3"', 'L442-L492', 'data-cite-popover'],
    'destructive-action-guard.html': ['role="alertdialog"', 'purge-local-cache', 'disabled aria-disabled="true"', 'Purge local cache'],
    'system-error-boundary.html': ['role="alert"', 'req_01j8m5r3z8', 'run_01j8k5', 'Copy diagnostics', 'Offline'],
  };

  for (const file of NEW_FRAGMENTS) {
    const html = fs.readFileSync(path.join(ROOT, 'preview', file), 'utf-8').replace(/<!--[\s\S]*?-->/g, '');
    assert.doesNotMatch(html, /vi-glass|persona-accent-/, `${file} must remain solid without persona leaks`);
    for (const m of html.matchAll(/<(button|input)\b([^>]*)>/g)) {
      const cls = (m[2].match(/\bclass="([^"]*)"/) || [])[1] || '';
      assert.match(cls, /h-action-min-default/, `${file}: 44px touch target missing on ${m[0].slice(0, 80)}`);
    }
    for (const marker of expectedMarkers[file]) {
      assert.ok(html.includes(marker), `${file} missing marker: ${marker}`);
    }
  }
});

test('skills-library-surface refactor puts title first, uses subtle tool chips, removes line-clamp, and balances 2-col Subgrid', () => {
  const html = fs.readFileSync(path.join(ROOT, 'preview', 'skills-library-surface.html'), 'utf-8');
  const css = fs.readFileSync(path.join(ROOT, 'lib', 'library-surface.css'), 'utf-8');
  assert.ok(html.includes('vi-library-grid--skills'), 'skills grid must apply balanced .vi-library-grid--skills');
  assert.ok(html.includes('class="vi-library-tool-chip"'), 'tool IDs must use borderless .vi-library-tool-chip');
  assert.ok(html.indexOf('Schema migration audit') < html.indexOf('/schema-audit</span>'), 'skill title must precede /slash command in card header');
  assert.doesNotMatch(css, /-webkit-line-clamp:\s*2/, 'aggressive 2-line truncation must be removed');
  assert.ok(css.includes('oklch(1 0 0 / 0.04)'), 'tool chip surface must use subtle oklch(1 0 0 / 0.04)');
  assert.ok(css.includes('.vi-library-grid--skills'), 'library-surface.css must style balanced 2-col skills grid');
});

test('lib/core-components.js drives keyboard & interactive flows cleanly and tears down on destroy()', () => {
  function makeEl(tag, attrs = {}, text = '') {
    const listeners = new Map();
    const map = { ...attrs };
    const classes = new Set((map.class || '').split(/\s+/).filter(Boolean));
    const styles = new Map();
    const el = {
      tagName: tag.toUpperCase(),
      id: map.id || '',
      hidden: Boolean(map.hidden),
      disabled: Boolean(map.disabled),
      value: map.value || '',
      textContent: text,
      innerHTML: '',
      focused: false,
      parentNode: null,
      children: [],
      style: {
        setProperty(k, v) { styles.set(k, v); },
        getPropertyValue(k) { return styles.get(k) || ''; },
      },
      classList: {
        add(c) { classes.add(c); },
        remove(c) { classes.delete(c); },
        contains(c) { return classes.has(c); },
      },
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
      appendChild(node) {
        node.parentNode = el;
        el.children.push(node);
        return node;
      },
      append(...nodes) { for (const n of nodes) el.appendChild(n); },
      dispatch(t, ev = {}) {
        const event = { target: el, preventDefault() { event.defaultPrevented = true; }, ...ev };
        const set = listeners.get(t);
        if (set) for (const fn of [...set]) fn(event);
        return event;
      },
      click() { return el.dispatch('click'); },
      focus() { el.focused = true; },
      querySelector(sel) { return el.querySelectorAll(sel)[0] || null; },
      querySelectorAll(sel) { return matchSelector(el.children, sel); },
    };
    return el;
  }

  function matchSingle(node, sel) {
    if (sel.startsWith('#')) return node.id === sel.slice(1);
    if (/^[a-z]+$/i.test(sel)) return node.tagName === sel.toUpperCase();
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

  const root = makeEl('div');
  const mockDoc = {
    nodeType: 9,
    createElement: (t) => makeEl(t),
    querySelector: (s) => root.querySelector(s),
    querySelectorAll: (s) => root.querySelectorAll(s),
  };
  root.ownerDocument = mockDoc;

  // Destructive guard fixture
  const danger = makeEl('div', { 'data-vi-danger-guard': '', 'data-confirm-phrase': 'purge-local-cache' });
  const dangerIn = makeEl('input', { 'data-danger-input': '' });
  const dangerSubmit = makeEl('button', { 'data-danger-submit': '', disabled: true });
  const dangerStatus = makeEl('span', { 'data-danger-status': '' });
  danger.append(dangerIn, dangerSubmit, dangerStatus);

  // Split pane fixture
  const split = makeEl('div', { 'data-vi-split-pane': '' });
  const splitStage = makeEl('div', { 'data-split-stage': '' });
  const splitSep = makeEl('div', { role: 'separator', 'aria-valuenow': '42' });
  const splitOut = makeEl('span', { 'data-split-readout': '' });
  split.append(splitStage, splitSep, splitOut);

  // Citation popover fixture
  const cite = makeEl('div', { 'data-vi-citation-demo': '' });
  const citeBtn = makeEl('button', { 'data-cite-id': '1', 'data-cite-path': 'DESIGN.md', 'data-cite-lines': 'L1-L10', 'data-cite-status': 'Observed', 'data-cite-quote': 'Canonical tokens', 'aria-expanded': 'false' }, '[1]');
  const citePop = makeEl('div', { 'data-cite-popover': '', hidden: true });
  const citePath = makeEl('span', { 'data-cite-path': '' });
  const citeClose = makeEl('button', { 'data-cite-close': '' }, 'Close');
  citePop.append(citePath, citeClose);
  cite.append(citeBtn, citePop);

  // Error boundary fixture
  const errHost = makeEl('div', { 'data-vi-error-boundary': '' });
  const btn404 = makeEl('button', { 'data-err-mode': '404', 'aria-pressed': 'false' }, '404');
  const errReq = makeEl('dd', { 'data-err-req': '' }, 'req_01j8m5r3z8');
  errHost.append(btn404, errReq);

  root.append(danger, split, cite, errHost);

  const ctrl = initCoreComponents(root);

  // Guard stays disabled until exact phrase matches
  assert.equal(dangerSubmit.disabled, true);
  dangerIn.value = 'purge-local';
  dangerIn.dispatch('input');
  assert.equal(dangerSubmit.disabled, true);
  dangerIn.value = 'purge-local-cache';
  dangerIn.dispatch('input');
  assert.equal(dangerSubmit.disabled, false);

  // Split separator keyboard stepping
  splitSep.dispatch('keydown', { key: 'ArrowRight' });
  assert.equal(splitSep.getAttribute('aria-valuenow'), '47');
  assert.equal(splitStage.style.getPropertyValue('--vi-split-pct'), '47%');
  splitSep.dispatch('keydown', { key: 'Enter' });
  assert.equal(splitSep.getAttribute('aria-valuenow'), '50');

  // Citation popover open & Escape close with focus restore
  citeBtn.click();
  assert.equal(citePop.hidden, false);
  assert.equal(citePath.textContent, 'DESIGN.md');
  citePop.dispatch('keydown', { key: 'Escape' });
  assert.equal(citePop.hidden, true);
  assert.equal(citeBtn.focused, true);

  // Error scenario switch
  btn404.click();
  assert.equal(errReq.textContent, 'req_01j8m4q9x2');

  ctrl.destroy();
});
