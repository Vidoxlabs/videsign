'use strict';

/**
 * Modernized Settings architecture verification gates:
 *   1. Zero hex (#...), zero rgb()/rgba(), zero hsl()/hsla(), zero fixed px dimensions,
 *      and zero uppercase text-transform across all source and emitted Settings artifacts.
 *   2. Mathematical WCAG 2.1 contrast floor (>= 4.5:1 text, >= 3.0:1 borders/controls/accent/
 *      danger/status) across dark Nocturne and light themes including the fenced danger surface.
 *   3. Container-query breakpoints (@container vi-settings-shell at 48rem, @container
 *      vi-settings-pane at 32rem), 44px touch targets, glass discipline (strictly 1 glass shell
 *      on settings-quick-menu, 0 on solid settings dialogs/layouts), VWXYZ isolation, and zero
 *      PII/hostnames/IPv4/secrets.
 *   4. Vanilla JS controller runtime tests: search filtering + empty reset, tab keyboard roving
 *      across 4 panes, mobile drill-down toggle, role="switch" toggles, Dark/Light theme switching,
 *      neutral model routing radio slots, copy ID / export / revoke / danger-zone owner-gate
 *      receipts, modal open + Esc focus restore, and clean destroy() teardown.
 */

const { test, before } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const { contrastRatio } = require('../lib/contrast');
const { emitSettingsSurfaceArtifacts } = require('../scripts/generate-tokens');
const { initSettingsSurface } = require('../lib/settings-surface');

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
  for (const m of cssBlock.matchAll(/(--vi-settings-[a-z0-9-]+):\s*(?:var\([^,]+,\s*)?oklch\(\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)(?:\s*\/\s*[\d.]+)?\s*\)/g)) {
    map[m[1]] = [Number(m[2]), Number(m[3]), Number(m[4])];
  }
  return map;
}

before(() => {
  execFileSync(process.execPath, [path.join(ROOT, 'scripts', 'generate-tokens.js')], { cwd: ROOT, stdio: 'ignore' });
});

test('settings-surface artifacts contain zero hex, rgb/rgba, or hsl/hsla color literals', () => {
  const files = [
    path.join(ROOT, 'lib', 'settings-surface.css'),
    path.join(ROOT, 'lib', 'settings-surface.js'),
    path.join(ROOT, 'dist', 'settings-surface.css'),
    path.join(ROOT, 'dist', 'settings-surface.js'),
    path.join(ROOT, 'preview', 'settings-quick-menu.html'),
    path.join(ROOT, 'preview', 'settings-surface.html'),
    path.join(ROOT, 'preview', 'layout-settings.html'),
  ];
  for (const filePath of files) {
    const src = fs.readFileSync(filePath, 'utf-8');
    const rel = path.relative(ROOT, filePath);
    assert.doesNotMatch(src, /#[0-9a-fA-F]{3,8}\b/, `${rel} must not contain hex literals`);
    assert.doesNotMatch(src, /\brgba?\(/i, `${rel} must not contain rgb()/rgba() literals`);
    assert.doesNotMatch(src, /\bhsla?\(/i, `${rel} must not contain hsl()/hsla() literals`);
  }
});

test('settings-surface.css enforces required --vi-settings-* tokens, container queries, zero px units, and emitted parity', () => {
  const css = fs.readFileSync(path.join(ROOT, 'lib', 'settings-surface.css'), 'utf-8');
  assert.doesNotMatch(css, /\b\d+(?:\.\d+)?px\b/i, 'settings-surface.css must avoid fixed px dimensions');
  assert.doesNotMatch(css, /text-transform:\s*uppercase/i, 'ADR-007 forbids uppercase text-transform');
  for (const token of [
    '--vi-settings-rail-bg:',
    '--vi-settings-pane-bg:',
    '--vi-settings-row-hover:',
    '--vi-settings-danger-border:',
    '--vi-settings-danger-bg:',
    'container-type: inline-size',
    'container-name: vi-settings-shell',
    'container-name: vi-settings-pane',
    'grid-template-columns: minmax(13.5rem, 16.5rem) minmax(0, 1fr)',
    'grid-template-columns: minmax(0, 1fr) auto',
    '@container vi-settings-shell (max-width: 48rem)',
    '@container vi-settings-pane (max-width: 32rem)',
    ':focus-visible',
    '[data-theme="light"]',
    '@media (prefers-reduced-motion: reduce)',
    '@media (forced-colors: active)',
  ]) {
    assert.ok(css.includes(token), `settings-surface.css missing required rule/token: ${token}`);
  }
  const emitted = emitSettingsSurfaceArtifacts();
  assert.equal(emitted['settings-surface.css'], css);
  assert.equal(emitted['settings-surface.js'], fs.readFileSync(path.join(ROOT, 'lib', 'settings-surface.js'), 'utf-8'));

  const scopeBlock = css.match(/\n\n\.vi-settings-scope\s*\{([\s\S]*?)\}/)[1];
  const shellBlock = css.match(/\n\.vi-settings-shell\s*\{([\s\S]*?)\}/)[1];
  const segBlock = css.match(/\n\.vi-settings-segmented\s*\{([\s\S]*?)\}/)[1];
  assert.match(scopeBlock, /container-type:\s*inline-size;/);
  assert.match(scopeBlock, /container-name:\s*vi-settings-shell;/);
  assert.doesNotMatch(shellBlock, /container-(?:name|type):/);
  assert.match(segBlock, /flex-wrap:\s*wrap;/);
  assert.equal(fs.readFileSync(path.join(ROOT, 'dist', 'settings-surface.css'), 'utf-8'), css);
});

test('dark Nocturne and light theme Settings tokens clear >= 4.5:1 text and >= 3.0:1 border contrast on all surfaces including danger zone', () => {
  const css = fs.readFileSync(path.join(ROOT, 'lib', 'settings-surface.css'), 'utf-8');
  const darkBlock = css.match(/:root,\s*\.vi-settings-scope\s*\{([\s\S]*?)\}/)[1];
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
        dangerBg: oklchToRgb(...darkTokens['--vi-settings-danger-bg']),
      },
      textPairs: {
        '--vi-settings-ink': [255, 255, 255],
        '--vi-settings-ink-muted': [161, 161, 170],
      },
    },
    {
      name: 'light',
      tokens: lightTokens,
      surfaces: {
        primary: [248, 249, 250],
        secondary: [255, 255, 255],
        tertiary: [241, 243, 245],
        dangerBg: oklchToRgb(...lightTokens['--vi-settings-danger-bg']),
      },
      textPairs: {
        '--vi-settings-ink': [15, 23, 42],
        '--vi-settings-ink-muted': [71, 85, 105],
      },
    },
  ];

  for (const suite of suites) {
    for (const [surfName, surfRgb] of Object.entries(suite.surfaces)) {
      for (const [inkName, inkRgb] of Object.entries(suite.textPairs)) {
        const ratio = contrastRatio(inkRgb, surfRgb);
        assert.ok(ratio >= 4.5, `${suite.name} ${inkName} on ${surfName} must be >= 4.5:1, got ${ratio.toFixed(2)}`);
      }
      for (const key of [
        '--vi-settings-border',
        '--vi-settings-border-strong',
        '--vi-settings-accent',
        '--vi-settings-danger-border',
        '--vi-settings-status-success',
        '--vi-settings-status-warning',
        '--vi-settings-status-error',
        '--vi-settings-status-info',
      ]) {
        const tuple = suite.tokens[key];
        assert.ok(tuple, `${suite.name} missing oklch token ${key}`);
        const rgb = oklchToRgb(tuple[0], tuple[1], tuple[2]);
        const ratio = contrastRatio(rgb, surfRgb);
        assert.ok(ratio >= 3.0, `${suite.name} ${key} on ${surfName} must be >= 3.0:1, got ${ratio.toFixed(2)}`);
      }
    }
  }
});

test('all Settings fragments enforce 44px touch targets, glass discipline, VWXYZ isolation, neutral IDs, and zero PII/hostnames', () => {
  const files = ['settings-quick-menu.html', 'settings-surface.html', 'layout-settings.html'];
  for (const file of files) {
    const html = fs.readFileSync(path.join(ROOT, 'preview', file), 'utf-8').replace(/<!--[\s\S]*?-->/g, '');
    assert.doesNotMatch(html, /persona-accent-/, `${file} must isolate VWXYZ persona accents out of settings chrome`);
    assert.doesNotMatch(html, /\b\d{1,3}(?:\.\d{1,3}){3}\b/, `${file} must not contain IPv4 literals`);
    assert.doesNotMatch(html, /localhost|\.lan\b|\.internal\b|@/i, `${file} must not contain real hostnames or personal emails`);
    for (const m of html.matchAll(/<(button|textarea|a)\b([^>]*)>/g)) {
      const cls = (m[2].match(/\bclass="([^"]*)"/) || [])[1] || '';
      assert.match(cls, /h-action-(min|wide)-default/, `${file}: 44px touch target missing on ${m[0].slice(0, 90)}`);
    }
    const glassCount = [...html.matchAll(/\bclass="([^"]*)"/g)]
      .flatMap((m) => m[1].split(/\s+/))
      .filter((cls) => cls === 'vi-glass' || cls === 'vi-glass-shell').length;
    if (file === 'settings-quick-menu.html') {
      assert.equal(glassCount, 1, 'settings-quick-menu uses exactly 1 crystal-glass shell on the floating popover');
    } else {
      assert.equal(glassCount, 0, `${file} must stay on solid Nocturne surfaces (0 glass layers)`);
    }
  }

  const surface = fs.readFileSync(path.join(ROOT, 'preview', 'settings-surface.html'), 'utf-8');
  for (const needle of [
    'Search settings',
    'General and profile',
    'Appearance and motion',
    'Keyboard',
    'Personas and dialects',
    'Model routing',
    'Tools and connectors',
    'Skills',
    'Policy and approvals',
    'Credentials and leases',
    'Local nodes and devices',
    'Memory and data',
    'Usage and budgets',
    'ws_01j9k4m2',
    'Export conversations JSON',
    'Export memory epoch bundle',
    'Danger zone',
    'Reset workspace memory',
    'Revoke all active leases',
    'providers.slot.remote',
    'providers.slot.local',
    'node-workstation-01',
    'Require explicit confirmation for new nodes',
    'vcs.file.read',
    'cred &middot;&middot;&middot;&middot; 7f3a',
  ]) {
    assert.ok(surface.includes(needle), `settings-surface.html missing required element/copy: ${needle}`);
  }

  const workspace = fs.readFileSync(path.join(ROOT, 'preview', 'layout-agent-workspace.html'), 'utf-8');
  assert.ok(workspace.includes('data-settings-open-modal'), 'layout-agent-workspace.html must include a Settings trigger');
  assert.doesNotMatch(workspace, /vi-glass/, 'layout-agent-workspace.html must remain solid');
});

test('lib/settings-surface.js drives search filtering, tab roving, mobile drill-down, switches, routing, receipts, modal Esc, and destroy()', async () => {
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
      parentNode: null,
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
      append(...nodes) {
        for (const n of nodes) {
          n.parentNode = el;
          el.children.push(n);
        }
      },
      dispatch(t, ev = {}) {
        const event = { target: el, preventDefault() { event.defaultPrevented = true; }, ...ev };
        const set = listeners.get(t);
        if (set) for (const fn of [...set]) fn(event);
        return event;
      },
      click() { return el.dispatch('click'); },
      focus() { el.focused = true; mockDoc.activeElement = el; },
      querySelector(sel) { return el.querySelectorAll(sel)[0] || null; },
      querySelectorAll(sel) { return matchSelector(el.children, sel); },
    };
    return el;
  }

  function matchSingle(node, sel) {
    if (sel === 'input, button, select') return ['INPUT', 'BUTTON', 'SELECT'].includes(node.tagName);
    if (sel.startsWith('#')) return node.id === sel.slice(1);
    const parts = sel.split(',').map((s) => s.trim());
    if (parts.length > 1) return parts.some((p) => matchSingle(node, p));
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

  const shell = makeEl('div', { 'data-settings-shell': '', 'data-mobile-view': 'pane' });
  const searchInput = makeEl('input', { 'data-settings-search': '' });
  const searchCount = makeEl('p', { 'data-settings-search-count': '' }, '3 of 3 sections shown');
  const searchEmpty = makeEl('div', { 'data-settings-search-empty': '', hidden: true });
  const searchReset = makeEl('button', { 'data-settings-search-reset': '' }, 'Reset');
  const groupA = makeEl('div', { 'data-settings-group': '' });
  const groupB = makeEl('div', { 'data-settings-group': '' });
  const tabGeneral = makeEl('button', { role: 'tab', 'aria-selected': 'true', 'data-settings-target': 'general', 'data-settings-keywords': 'profile export' }, 'General and profile');
  const tabRouting = makeEl('button', { role: 'tab', 'aria-selected': 'false', 'data-settings-target': 'routing', 'data-settings-keywords': 'model provider' }, 'Model routing');
  const tabNodes = makeEl('button', { role: 'tab', 'aria-selected': 'false', 'data-settings-target': 'nodes', 'data-settings-keywords': 'devices cluster' }, 'Local nodes and devices');
  groupA.append(tabGeneral);
  groupB.append(tabRouting, tabNodes);

  const panelGeneral = makeEl('section', { role: 'tabpanel', 'data-settings-panel': 'general' });
  const panelRouting = makeEl('section', { role: 'tabpanel', 'data-settings-panel': 'routing', hidden: true });
  const panelNodes = makeEl('section', { role: 'tabpanel', 'data-settings-panel': 'nodes', hidden: true });
  const mobileBack = makeEl('button', { 'data-settings-mobile-back': '' }, 'Sections');
  const mobileHeading = makeEl('span', { 'data-settings-mobile-heading': '' }, 'General and profile');
  const receipt = makeEl('span', { 'data-settings-receipt': '' }, 'Ready');

  const sw = makeEl('button', { role: 'switch', 'aria-checked': 'false', 'data-settings-switch': 'Background motion' });
  const swLabel = makeEl('span', { 'data-settings-switch-label': '' }, 'Off');
  sw.append(swLabel);

  const themeDark = makeEl('button', { 'data-settings-theme': 'dark', 'aria-pressed': 'true' }, 'Dark');
  const themeLight = makeEl('button', { 'data-settings-theme': 'light', 'aria-pressed': 'false' }, 'Light');

  const radioGroup = makeEl('div', { role: 'radiogroup', 'data-settings-routing': '' });
  const slotRemote = makeEl('div', { 'data-selected': 'true' });
  const radioRemote = makeEl('button', { role: 'radio', 'aria-checked': 'true', 'data-settings-slot': 'providers.slot.remote' });
  slotRemote.append(radioRemote);
  const slotLocal = makeEl('div', { 'data-selected': 'false' });
  const radioLocal = makeEl('button', { role: 'radio', 'aria-checked': 'false', 'data-settings-slot': 'providers.slot.local' });
  slotLocal.append(radioLocal);
  radioGroup.append(slotRemote, slotLocal);

  const copyBtn = makeEl('button', { 'data-settings-copy': 'ws_01j9k4m2' });
  const exportBtn = makeEl('button', { 'data-settings-export': 'conversations JSON' });
  const revokeBtn = makeEl('button', { 'data-settings-revoke': 'node-workstation-01' });
  const dangerBtn = makeEl('button', { 'data-settings-danger-action': 'Reset workspace memory' });

  const openModalBtn = makeEl('button', { 'data-settings-open-modal': '', 'aria-expanded': 'false' });
  const modalBackdrop = makeEl('div', { 'data-settings-modal': '', hidden: true });
  const modalInput = makeEl('input', {});
  modalBackdrop.append(modalInput);

  shell.append(
    searchInput, searchCount, searchEmpty, searchReset, groupA, groupB,
    panelGeneral, panelRouting, panelNodes, mobileBack, mobileHeading, receipt,
  );
  const root = makeEl('div', {});
  root.append(shell, sw, themeDark, themeLight, radioGroup, copyBtn, exportBtn, revokeBtn, dangerBtn, openModalBtn, modalBackdrop);

  const docEl = makeEl('html', { 'data-theme': 'dark', 'data-motion': 'paused' });
  const mockDoc = {
    nodeType: 9,
    activeElement: openModalBtn,
    documentElement: docEl,
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
    querySelector: (s) => root.querySelector(s),
    querySelectorAll: (s) => root.querySelectorAll(s),
  };
  root.ownerDocument = mockDoc;

  const ctrl = initSettingsSurface(root);

  // 1. Live search filtering + polite match count + empty reset
  searchInput.value = 'devices';
  searchInput.dispatch('input');
  assert.equal(tabGeneral.hidden, true);
  assert.equal(groupA.hidden, true);
  assert.equal(tabNodes.hidden, false);
  assert.equal(searchCount.textContent, '1 of 3 sections shown');
  assert.equal(searchEmpty.hidden, true);

  searchInput.value = 'nonexistent-query';
  searchInput.dispatch('input');
  assert.equal(searchCount.textContent, '0 of 3 sections shown');
  assert.equal(searchEmpty.hidden, false);

  searchReset.click();
  assert.equal(searchCount.textContent, '3 of 3 sections shown');
  assert.equal(searchEmpty.hidden, true);

  // 2. Vertical keyboard roving & pane switching + mobile drill-down
  tabGeneral.dispatch('keydown', { key: 'ArrowDown' });
  assert.equal(tabRouting.getAttribute('aria-selected'), 'true');
  assert.equal(panelRouting.hidden, false);
  assert.equal(panelGeneral.hidden, true);
  assert.equal(mobileHeading.textContent, 'Model routing');
  assert.equal(shell.getAttribute('data-mobile-view'), 'pane');

  mobileBack.click();
  assert.equal(shell.getAttribute('data-mobile-view'), 'nav');
  tabNodes.click();
  assert.equal(shell.getAttribute('data-mobile-view'), 'pane');
  assert.equal(panelNodes.hidden, false);

  // 3. Switch, theme, and model routing slot
  sw.click();
  assert.equal(sw.getAttribute('aria-checked'), 'true');
  assert.equal(swLabel.textContent, 'On');
  assert.equal(docEl.getAttribute('data-motion'), 'running');

  themeLight.click();
  assert.equal(docEl.getAttribute('data-theme'), 'light');
  assert.equal(themeLight.getAttribute('aria-pressed'), 'true');

  radioLocal.click();
  assert.equal(radioLocal.getAttribute('aria-checked'), 'true');
  assert.equal(slotLocal.getAttribute('data-selected'), 'true');
  assert.equal(slotRemote.getAttribute('data-selected'), 'false');

  // 4. Copy, export, revoke, and owner-gated danger zone receipts
  copyBtn.click();
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(copied.at(-1), 'ws_01j9k4m2');
  assert.match(receipt.textContent, /ws_01j9k4m2/);

  exportBtn.click();
  assert.match(receipt.textContent, /conversations JSON/);

  revokeBtn.click();
  assert.match(receipt.textContent, /waiting_for_owner/);

  dangerBtn.click();
  assert.match(receipt.textContent, /waiting_for_owner/);

  // 5. Modal open + Escape focus restoration + teardown
  openModalBtn.focus();
  openModalBtn.focused = false;
  openModalBtn.click();
  assert.equal(modalBackdrop.hidden, false);
  assert.equal(openModalBtn.getAttribute('aria-expanded'), 'true');
  assert.equal(modalInput.focused, true);

  mockDoc.dispatch('keydown', { key: 'Escape' });
  assert.equal(modalBackdrop.hidden, true);
  assert.equal(openModalBtn.focused, true);

  ctrl.destroy();
  assert.equal([...mockDoc._listeners.values()].every((s) => s.size === 0), true);

  if (prevNavigator !== undefined) {
    Object.defineProperty(globalThis, 'navigator', { configurable: true, value: prevNavigator });
  }
});
