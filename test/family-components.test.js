'use strict';

/**
 * Contract & runtime tests for the 10 Nocturne family contract and workbench surface
 * modules (`lib/family-contracts.css|js` and `lib/family-surfaces.css|js`) and their
 * corresponding `preview/*.html` fragments:
 *  - family-contracts: context-packet-inspector, memory-consent-epoch,
 *    assembly-gate-card, hook-chain-inspector, trellis-probe-matrix
 *  - family-surfaces: model-profile-card, trace-replay-panel,
 *    eval-harness-report, capability-ledger-panel, family-stack-diagram
 */

const { test, describe, before } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const { initFamilyContracts } = require('../lib/family-contracts');
const { initFamilySurfaces } = require('../lib/family-surfaces');
const { lintFragment } = require('../scripts/lint-preview');

const ROOT = path.join(__dirname, '..');
const LIB = path.join(ROOT, 'lib');
const DIST = path.join(ROOT, 'dist');
const PREVIEW = path.join(ROOT, 'preview');

const FAMILY_FILES = [
  'context-packet-inspector.html',
  'memory-consent-epoch.html',
  'assembly-gate-card.html',
  'hook-chain-inspector.html',
  'trellis-probe-matrix.html',
  'model-profile-card.html',
  'trace-replay-panel.html',
  'eval-harness-report.html',
  'capability-ledger-panel.html',
  'family-stack-diagram.html',
];

function extractBlock(css, selector) {
  const idx = css.indexOf(selector);
  assert.notEqual(idx, -1, `missing selector block ${selector}`);
  const open = css.indexOf('{', idx);
  assert.notEqual(open, -1, `missing { for ${selector}`);
  const close = css.indexOf('}', open);
  assert.notEqual(close, -1, `missing } for ${selector}`);
  return css.slice(open + 1, close);
}

function readOklchL(block, prop) {
  const escaped = prop.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
  const m = block.match(new RegExp(`${escaped}:\\s*[^;]*oklch\\(\\s*([\\d.]+)(%?)`));
  assert.ok(m, `missing oklch() L value for ${prop}`);
  const val = parseFloat(m[1]);
  return m[2] === '%' ? val / 100 : val;
}

function makeMockElement(tagName, attrs = {}, children = []) {
  const attrMap = new Map(Object.entries(attrs));
  const classSet = new Set(String(attrs.class || '').split(/\s+/).filter(Boolean));
  const listeners = new Map();
  let text = attrs.textContent || '';
  const el = {
    tagName: String(tagName || 'DIV').toUpperCase(),
    parentElement: null,
    children: [],
    hidden: Object.prototype.hasOwnProperty.call(attrs, 'hidden'),
    disabled: Object.prototype.hasOwnProperty.call(attrs, 'disabled'),
    checked: Boolean(attrs.checked),
    value: attrs.value !== undefined ? String(attrs.value) : '',
    focused: false,
    style: {
      props: {},
      setProperty(k, v) { this.props[k] = String(v); },
      getPropertyValue(k) { return this.props[k] || ''; },
    },
    classList: {
      add(...names) { names.forEach((n) => classSet.add(n)); },
      remove(...names) { names.forEach((n) => classSet.delete(n)); },
      toggle(name, force) {
        if (force === undefined) {
          if (classSet.has(name)) { classSet.delete(name); return false; }
          classSet.add(name); return true;
        }
        if (force) classSet.add(name); else classSet.delete(name);
        return Boolean(force);
      },
      contains(name) { return classSet.has(name); },
    },
    get className() { return Array.from(classSet).join(' '); },
    set className(val) {
      classSet.clear();
      String(val || '').split(/\s+/).filter(Boolean).forEach((c) => classSet.add(c));
    },
    get textContent() { return text; },
    set textContent(v) { text = String(v == null ? '' : v); },
    getAttribute(k) {
      if (k === 'class') return this.className || null;
      return attrMap.has(k) ? attrMap.get(k) : null;
    },
    setAttribute(k, v) {
      if (k === 'class') { this.className = v; return; }
      if (k === 'hidden') this.hidden = true;
      if (k === 'disabled') this.disabled = true;
      attrMap.set(k, String(v));
    },
    removeAttribute(k) {
      if (k === 'hidden') this.hidden = false;
      if (k === 'disabled') this.disabled = false;
      attrMap.delete(k);
    },
    hasAttribute(k) {
      if (k === 'hidden') return this.hidden;
      if (k === 'disabled') return this.disabled;
      return attrMap.has(k);
    },
    appendChild(child) {
      child.parentElement = this;
      this.children.push(child);
      return child;
    },
    contains(other) {
      let cur = other;
      while (cur) {
        if (cur === this) return true;
        cur = cur.parentElement;
      }
      return false;
    },
    matches(sel) {
      return sel.split(',').some((raw) => {
        const part = raw.trim();
        if (!part) return false;
        const attrMatch = part.match(/^\[([a-z0-9-]+)(?:="([^"]*)")?\]$/i);
        if (attrMatch) {
          const val = this.getAttribute(attrMatch[1]);
          if (attrMatch[2] !== undefined) return val === attrMatch[2];
          return this.hasAttribute(attrMatch[1]);
        }
        if (part.startsWith('.')) return classSet.has(part.slice(1));
        return this.tagName.toLowerCase() === part.toLowerCase();
      });
    },
    closest(sel) {
      let cur = this;
      while (cur) {
        if (cur.matches(sel)) return cur;
        cur = cur.parentElement;
      }
      return null;
    },
    querySelectorAll(sel) {
      const out = [];
      const visit = (node) => {
        for (const child of node.children) {
          if (child.matches(sel)) out.push(child);
          visit(child);
        }
      };
      visit(this);
      return out;
    },
    querySelector(sel) {
      return this.querySelectorAll(sel)[0] || null;
    },
    addEventListener(type, fn) {
      if (!listeners.has(type)) listeners.set(type, new Set());
      listeners.get(type).add(fn);
    },
    removeEventListener(type, fn) {
      if (listeners.has(type)) listeners.get(type).delete(fn);
    },
    dispatch(type, extra = {}) {
      let stopped = false;
      const event = {
        type,
        target: this,
        currentTarget: this,
        key: extra.key || '',
        defaultPrevented: false,
        preventDefault() { this.defaultPrevented = true; },
        stopPropagation() { stopped = true; },
        composedPath() {
          const pathList = [];
          let cur = this.target;
          while (cur) { pathList.push(cur); cur = cur.parentElement; }
          return pathList;
        },
        ...extra,
      };
      let cur = this;
      while (cur && !stopped) {
        event.currentTarget = cur;
        const map = cur._listeners && cur._listeners.get(type);
        if (map) {
          for (const fn of [...map]) fn(event);
        }
        cur = cur.parentElement;
      }
      return event;
    },
    _listeners: listeners,
    listenerCount(type) {
      if (type) return listeners.has(type) ? listeners.get(type).size : 0;
      let total = 0;
      for (const s of listeners.values()) total += s.size;
      return total;
    },
    focus() { this.focused = true; },
  };
  for (const ch of children) el.appendChild(ch);
  return el;
}

describe('family contracts and surfaces stylesheets & fragments (zero-hex OKLCH + @container)', () => {
  before(() => {
    execFileSync(process.execPath, [path.join(ROOT, 'scripts', 'generate-tokens.js')], {
      cwd: ROOT,
      stdio: 'ignore',
    });
  });

  for (const [label, cssName, jsName, prefix, marker, scopeCls] of [
    ['family-contracts', 'family-contracts.css', 'family-contracts.js', '--vi-fc-', 'vi-fc-stage', '.vi-fc-scope'],
    ['family-surfaces', 'family-surfaces.css', 'family-surfaces.js', '--vi-fs-', 'vi-fs-stage', '.vi-fs-scope'],
  ]) {
    test(`${label} stylesheet uses pure oklch() with zero hex/rgb/hsl and emits identically to dist/`, () => {
      const libCss = fs.readFileSync(path.join(LIB, cssName), 'utf8');
      const distCss = fs.readFileSync(path.join(DIST, cssName), 'utf8');
      assert.equal(distCss, libCss, `dist/${cssName} must equal lib/${cssName}`);

      const libJs = fs.readFileSync(path.join(LIB, jsName), 'utf8');
      const distJs = fs.readFileSync(path.join(DIST, jsName), 'utf8');
      assert.equal(distJs, libJs, `dist/${jsName} must equal lib/${jsName}`);

      const stripped = libCss.replace(/\/\*[\s\S]*?\*\//g, '');
      assert.doesNotMatch(stripped, /#[0-9a-fA-F]{3,8}\b/, `${cssName} must contain zero hex literals`);
      assert.doesNotMatch(stripped, /\brgba?\s*\(/i, `${cssName} must use oklch() instead of rgb()`);
      assert.doesNotMatch(stripped, /\bhsla?\s*\(/i, `${cssName} must use oklch() instead of hsl()`);

      assert.match(libCss, new RegExp(`container-type:\\s*inline-size;\\s*\\n\\s*container-name:\\s*${marker};`));
      assert.match(libCss, new RegExp(`@container ${marker} \\(max-width:\\s*30rem\\)`));
      assert.match(libCss, /@media \(max-width:\s*480px\)/);
      assert.match(libCss, /@media \(prefers-reduced-motion:\s*reduce\)/);
      assert.match(libCss, /transition-duration:\s*0ms\s*!important;/);
      assert.match(libCss, /:focus-visible/);
      assert.match(libCss, /outline:\s*(?:2px|0\.125rem) solid var\(--vi-[a-z-]+-accent\)/);
      assert.doesNotMatch(libCss, /transition:\s*all\b/);
      assert.doesNotMatch(libCss, /backdrop-filter/);

      const dark = extractBlock(libCss, `:root,\n${scopeCls} {`);
      const light = extractBlock(libCss, `[data-theme="light"],`);
      const hc = extractBlock(libCss, `[data-theme="high-contrast"],`);

      for (const [modeName, block, floorPrimary, floorMuted, floorAccent] of [
        ['dark', dark, 0.70, 0.45, 0.40],
        ['light', light, 0.70, 0.45, 0.40],
        ['high-contrast', hc, 0.80, 0.65, 0.50],
      ]) {
        const cardL = readOklchL(block, `${prefix}card`);
        const shellL = readOklchL(block, `${prefix}shell`);
        const canvasL = readOklchL(block, `${prefix}canvas`);
        const elevatedL = readOklchL(block, `${prefix}elevated`);
        assert.equal(new Set([canvasL, shellL, cardL, elevatedL]).size, 4, `${cssName} ${modeName} needs 4 distinct OKLCH L tiers`);

        const inkL = readOklchL(block, `${prefix}ink`);
        const secL = readOklchL(block, `${prefix}ink-secondary`);
        const mutedL = readOklchL(block, `${prefix}ink-muted`);
        const accentL = readOklchL(block, `${prefix}accent`);
        assert.ok(Math.abs(inkL - cardL) >= floorPrimary, `${cssName} ${modeName} primary ΔL >= ${floorPrimary}`);
        assert.ok(Math.abs(secL - cardL) >= floorPrimary - 0.14, `${cssName} ${modeName} secondary ΔL`);
        assert.ok(Math.abs(mutedL - cardL) >= floorMuted, `${cssName} ${modeName} muted ΔL >= ${floorMuted}`);
        assert.ok(Math.abs(accentL - cardL) >= floorAccent, `${cssName} ${modeName} accent ΔL >= ${floorAccent}`);
      }
    });
  }

  test('all 10 family fragments lint clean, avoid glass/persona leaks, and preserve 44px hit floors', () => {
    for (const file of FAMILY_FILES) {
      const html = fs.readFileSync(path.join(PREVIEW, file), 'utf8');
      assert.deepEqual(lintFragment(file, html), [], `${file} lint failure`);
      assert.doesNotMatch(html, /vi-glass/, `${file}: family surfaces must stay solid`);
      assert.doesNotMatch(html, /persona-accent-/, `${file}: neutral roles only`);
      assert.doesNotMatch(html, /bg-surface-accent-violet-base/, `${file}: no accent fill CTA`);
      for (const m of html.matchAll(/<(button|a|summary)\b([^>]*)>/g)) {
        assert.match(m[2], /class="[^"]*\bh-action-min-default\b/, `${file}: missing h-action-min-default on ${m[0].slice(0, 72)}`);
      }
    }
  });

  test('family fragment required semantic markers and contract assertions hold', () => {
    const read = (f) => fs.readFileSync(path.join(PREVIEW, f), 'utf8');

    const packet = read('context-packet-inspector.html');
    assert.match(packet, /data-vi-packet/);
    assert.match(packet, /untrusted: true/);
    assert.match(packet, /deletion-epoch-changed/);
    assert.match(packet, /role="tablist" aria-label="Packet buckets"/);
    for (const reason of ['out-of-budget', 'denied', 'binary', 'hidden', 'unknown-source']) {
      assert.ok(packet.includes(reason), `missing omission reason ${reason}`);
    }

    const mem = read('memory-consent-epoch.html');
    assert.match(mem, /data-vi-memory-epoch/);
    for (const cls of ['organizational', 'personal-consented', 'active-thread', 'unconfirmed']) {
      assert.ok(mem.includes(cls), `missing closed memory class ${cls}`);
    }
    assert.match(mem, /subject == grantedBy/);
    assert.match(mem, /data-mem-tombstone/);

    const gate = read('assembly-gate-card.html');
    assert.match(gate, /data-vi-gate-card/);
    assert.match(gate, /Reviewer approval never ratifies owner gate\./);
    assert.match(gate, /Review before assemble/);
    assert.match(gate, /Verify is final/);

    const hooks = read('hook-chain-inspector.html');
    assert.match(hooks, /data-vi-hooks/);
    assert.match(hooks, /Zero scope widening · deterministic fn/);
    assert.match(hooks, /CAP-19 skill safety scan/);
    assert.match(hooks, /workspace-coding cookbook recipe/);

    const trellis = read('trellis-probe-matrix.html');
    assert.match(trellis, /data-vi-trellis/);
    assert.match(trellis, /Cross-family \(\*\)/);
    assert.match(trellis, /62 pass, 0 fail, 0 unknown/);

    const profile = read('model-profile-card.html');
    assert.match(profile, /data-vi-model-profile/);
    for (const slot of ['model', 'contextLength', 'toolCalling', 'constrainedOutput', 'streaming']) {
      assert.ok(profile.includes(`data-profile-slot="${slot}"`), `missing PROFILE_SLOTS row ${slot}`);
    }
    assert.match(profile, /No silent model substitution/);
    assert.match(profile, /Profiles store no endpoint host, URL, or credential\./);

    const trace = read('trace-replay-panel.html');
    assert.match(trace, /data-vi-trace-replay/);
    assert.match(trace, /team\.recall/);
    assert.match(trace, /tool\.updated/);
    assert.match(trace, /costUSD: unreported/);

    const evals = read('eval-harness-report.html');
    assert.match(evals, /data-vi-eval-report/);
    assert.match(evals, /judge 0\.9 \(pass; held by schema-valid\)/);
    for (const fnName of ['exact', 'contains', 'schema-valid', 'tool-trajectory', 'files-changed', 'tests-pass']) {
      assert.ok(evals.includes(fnName), `missing deterministic evaluator ${fnName}`);
    }

    const cap = read('capability-ledger-panel.html');
    assert.match(cap, /data-vi-cap-ledger/);
    assert.match(cap, /Fail-closed sync hold/);
    assert.match(cap, /manifest\.json sha256 mismatch/);

    const stack = read('family-stack-diagram.html');
    assert.match(stack, /data-vi-family-stack/);
    assert.match(stack, /peers never import each other/);
    for (const repo of ['seed', 'capillary', 'myosotis', 'aestivation', 'drosera', 'bloom', 'trellis', 'docs', 'videsign']) {
      assert.ok(stack.includes(`data-stack-repo="${repo}"`), `missing stack button for ${repo}`);
    }
  });
});

describe('ViFamilyContracts runtime controllers and destroy() cleanup', () => {
  test('packet inspector toggles refusal banner, switches tabs, filters search, and cleans listeners', () => {
    const stableBtn = makeMockElement('button', { 'data-packet-mode': 'stable', 'aria-pressed': 'true' });
    const refusalBtn = makeMockElement('button', { 'data-packet-mode': 'refusal', 'aria-pressed': 'false' });
    const epochReadout = makeMockElement('span', { 'data-packet-epoch-readout': '' });
    const refusalBanner = makeMockElement('div', { 'data-packet-refusal': '', hidden: '' });
    const bodyBox = makeMockElement('div', { 'data-packet-body': '' });
    const tabAdmitted = makeMockElement('button', { 'data-packet-tab': 'admitted', 'aria-selected': 'true', tabindex: '0' });
    const tabOmitted = makeMockElement('button', { 'data-packet-tab': 'omitted', 'aria-selected': 'false', tabindex: '-1' });
    const panelAdmitted = makeMockElement('div', { 'data-packet-panel': 'admitted' }, [
      makeMockElement('li', { 'data-packet-item': '', 'data-packet-search-text': 'src-ret-01 repository' }),
      makeMockElement('li', { 'data-packet-item': '', 'data-packet-search-text': 'src-ret-02 workspace' }),
    ]);
    const panelOmitted = makeMockElement('div', { 'data-packet-panel': 'omitted', hidden: '' }, [
      makeMockElement('li', { 'data-packet-item': '', 'data-packet-search-text': 'src-om-01 denied' }),
    ]);
    const searchInput = makeMockElement('input', { 'data-packet-search': '', value: '' });
    const emptyBox = makeMockElement('div', { 'data-packet-empty': '', hidden: '' });
    const resetBtn = makeMockElement('button', { 'data-packet-reset': '' });
    const status = makeMockElement('span', { 'data-packet-status': '' });
    const packetHost = makeMockElement('div', { 'data-vi-packet': '' }, [
      stableBtn, refusalBtn, epochReadout, refusalBanner, bodyBox,
      tabAdmitted, tabOmitted, panelAdmitted, panelOmitted,
      searchInput, emptyBox, resetBtn, status,
    ]);
    const root = makeMockElement('section', {}, [packetHost]);

    const handle = initFamilyContracts(root);
    refusalBtn.dispatch('click');
    assert.equal(refusalBanner.hidden, false);
    assert.equal(bodyBox.hidden, true);
    assert.equal(epochReadout.textContent, 'epochStart 14 to epochEnd 15');
    assert.equal(status.textContent, 'refused: deletion-epoch-changed, 0 items returned');

    stableBtn.dispatch('click');
    assert.equal(refusalBanner.hidden, true);
    assert.equal(bodyBox.hidden, false);

    tabOmitted.dispatch('click');
    assert.equal(panelAdmitted.hidden, true);
    assert.equal(panelOmitted.hidden, false);
    assert.match(status.textContent, /1 omitted/);

    searchInput.value = 'no-match-zzz';
    searchInput.dispatch('input');
    assert.equal(emptyBox.hidden, false);
    resetBtn.dispatch('click');
    assert.equal(emptyBox.hidden, true);

    handle.destroy();
    assert.equal(refusalBtn.listenerCount(), 0);
    assert.equal(searchInput.listenerCount(), 0);
  });

  test('memory-consent-epoch enforces checkbox -> forget tombstone -> rebuild -> reset lifecycle', () => {
    const confirm = makeMockElement('input', { 'data-mem-confirm': '', type: 'checkbox' });
    const forgetBtn = makeMockElement('button', { 'data-mem-forget': '', disabled: '', 'aria-disabled': 'true' });
    const rebuildBtn = makeMockElement('button', { 'data-mem-rebuild': '', disabled: '', 'aria-disabled': 'true' });
    const resetBtn = makeMockElement('button', { 'data-mem-reset': '' });
    const status = makeMockElement('span', { 'data-mem-status': '' });
    const continuity = makeMockElement('span', { 'data-mem-continuity': '' });
    const recallNote = makeMockElement('span', { 'data-mem-recall-note': '' });
    const epochVal = makeMockElement('dd', { 'data-mem-epoch-val': '' });
    const projVal = makeMockElement('dd', { 'data-mem-proj-val': '' });
    const activeRecord = makeMockElement('div', { 'data-mem-active-record': '' });
    const tombstone = makeMockElement('div', { 'data-mem-tombstone': '', hidden: '' });
    const memHost = makeMockElement('div', { 'data-vi-memory-epoch': '', 'data-epoch': '4', 'data-stamp': '4' }, [
      confirm, forgetBtn, rebuildBtn, resetBtn, status, continuity, recallNote, epochVal, projVal, activeRecord, tombstone,
    ]);
    const root = makeMockElement('section', {}, [memHost]);

    const handle = initFamilyContracts(root);
    confirm.checked = true;
    confirm.dispatch('change');
    assert.equal(forgetBtn.disabled, false);

    forgetBtn.dispatch('click');
    assert.equal(epochVal.textContent, '5');
    assert.equal(activeRecord.hidden, true);
    assert.equal(tombstone.hidden, false);
    assert.equal(rebuildBtn.disabled, false);
    assert.equal(continuity.textContent, 'continuity: projection held');
    assert.match(projVal.textContent, /refused: stale/);

    rebuildBtn.dispatch('click');
    assert.equal(status.textContent, 'store.epoch = 5 · stamp = 5 rebuilt');
    assert.match(continuity.textContent, /continuity: active/);

    resetBtn.dispatch('click');
    assert.equal(epochVal.textContent, '4');
    assert.equal(activeRecord.hidden, false);
    assert.equal(tombstone.hidden, true);

    handle.destroy();
    assert.equal(confirm.listenerCount(), 0);
  });

  test('assembly-gate-card, hook-chain-inspector, and trellis-probe-matrix switch states cleanly', () => {
    const scenarioOk = makeMockElement('button', { 'data-gate-scenario': 'permitted', 'aria-selected': 'true', tabindex: '0' });
    const scenarioInvalid = makeMockElement('button', { 'data-gate-scenario': 'plan-invalid', 'aria-selected': 'false', tabindex: '-1' });
    const gateBanner = makeMockElement('div', { 'data-gate-banner': '', class: 'vi-fc-notice vi-fc-notice--ok' });
    const gateDot = makeMockElement('span', { 'data-gate-dot': '', class: 'vi-fc-dot vi-fc-dot--ok' });
    const gateVerdict = makeMockElement('span', { 'data-gate-verdict': '' });
    const gateReason = makeMockElement('span', { 'data-gate-reason': '' });
    const gateOrder = makeMockElement('span', { 'data-gate-order-rule': '' });
    const gateRoot = makeMockElement('div', { 'data-vi-gate-card': '' }, [
      scenarioOk, scenarioInvalid, gateBanner, gateDot, gateVerdict, gateReason, gateOrder,
    ]);

    const filterAll = makeMockElement('button', { 'data-hook-filter': 'all', 'aria-selected': 'true', tabindex: '0' });
    const filterSkill = makeMockElement('button', { 'data-hook-filter': 'skill-promoted', 'aria-selected': 'false', tabindex: '-1' });
    const hookPass = makeMockElement('li', { 'data-hook-row': '', 'data-hook-event': 'before-tool', 'data-hook-outcome': 'passed' });
    const hookBlock = makeMockElement('li', { 'data-hook-row': '', 'data-hook-event': 'skill-promoted', 'data-hook-outcome': 'blocked' });
    const hookStatus = makeMockElement('span', { 'data-hook-status': '' });
    const hookRoot = makeMockElement('div', { 'data-vi-hooks': '' }, [filterAll, filterSkill, hookPass, hookBlock, hookStatus]);

    const trellisClean = makeMockElement('button', { 'data-trellis-scenario': 'clean', 'aria-selected': 'true', tabindex: '0' });
    const trellisFail = makeMockElement('button', { 'data-trellis-scenario': 'fail', 'aria-selected': 'false', tabindex: '-1' });
    const trellisVerdict = makeMockElement('span', { 'data-trellis-verdict': '' });
    const trellisDot = makeMockElement('span', { 'data-trellis-dot': '', class: 'vi-fc-dot vi-fc-dot--ok' });
    const trellisSeedVerdict = makeMockElement('span', { 'data-trellis-seed-verdict': '' });
    const trellisDroseraVerdict = makeMockElement('span', { 'data-trellis-drosera-verdict': '' });
    const trellisRoot = makeMockElement('div', { 'data-vi-trellis': '' }, [trellisClean, trellisFail, trellisVerdict, trellisDot, trellisSeedVerdict, trellisDroseraVerdict]);

    const host = makeMockElement('section', {}, [gateRoot, hookRoot, trellisRoot]);
    const handle = initFamilyContracts(host);

    scenarioInvalid.dispatch('click');
    assert.equal(gateVerdict.textContent, 'permitted: false · held: plan-invalid');
    assert.match(gateOrder.textContent, /Fail/);
    assert.equal(gateBanner.classList.contains('vi-fc-notice--danger'), true);

    filterSkill.dispatch('click');
    assert.equal(hookPass.hidden, true);
    assert.equal(hookBlock.hidden, false);
    assert.match(hookStatus.textContent, /1 hook shown \(1 blocked\)/);

    trellisFail.dispatch('click');
    assert.equal(trellisVerdict.textContent, 'verdict: fail · 60 pass, 1 fail, 1 unknown');
    assert.equal(trellisSeedVerdict.textContent, 'unknown');
    assert.equal(trellisDroseraVerdict.textContent, 'fail');
    assert.equal(trellisDot.classList.contains('vi-fc-dot--danger'), true);

    handle.destroy();
    assert.equal(scenarioInvalid.listenerCount(), 0);
    assert.equal(filterSkill.listenerCount(), 0);
    assert.equal(trellisFail.listenerCount(), 0);
  });
});

describe('ViFamilySurfaces runtime controllers and destroy() cleanup', () => {
  test('model-profile-card, trace-replay, eval-report, cap-ledger, and stack diagram update cleanly', () => {
    const slotModel = makeMockElement('tr', { 'data-profile-slot': 'model' }, [
      makeMockElement('td', { 'data-slot-value': '' }),
      makeMockElement('span', { 'data-slot-dot': '', class: 'vi-fs-dot vi-fs-dot--ok' }),
      makeMockElement('span', { 'data-slot-source': '' }),
    ]);
    const slotTools = makeMockElement('tr', { 'data-profile-slot': 'toolCalling' }, [
      makeMockElement('td', { 'data-slot-value': '' }),
      makeMockElement('span', { 'data-slot-dot': '', class: 'vi-fs-dot vi-fs-dot--info' }),
      makeMockElement('span', { 'data-slot-source': '' }),
    ]);
    const slotCtx = makeMockElement('tr', { 'data-profile-slot': 'contextLength' }, [
      makeMockElement('td', { 'data-slot-value': '' }),
      makeMockElement('span', { 'data-slot-dot': '', class: 'vi-fs-dot vi-fs-dot--info' }),
      makeMockElement('span', { 'data-slot-source': '' }),
    ]);
    const slotConstrained = makeMockElement('tr', { 'data-profile-slot': 'constrainedOutput' }, [
      makeMockElement('td', { 'data-slot-value': '' }),
      makeMockElement('span', { 'data-slot-dot': '', class: 'vi-fs-dot vi-fs-dot--info' }),
      makeMockElement('span', { 'data-slot-source': '' }),
    ]);
    const slotStream = makeMockElement('tr', { 'data-profile-slot': 'streaming' }, [
      makeMockElement('td', { 'data-slot-value': '' }),
      makeMockElement('span', { 'data-slot-dot': '', class: 'vi-fs-dot vi-fs-dot--ok' }),
      makeMockElement('span', { 'data-slot-source': '' }),
    ]);
    const presetDep = makeMockElement('button', { 'data-profile-preset': 'deprecated-alias', 'aria-pressed': 'false' });
    const presetUnknown = makeMockElement('button', { 'data-profile-preset': 'partial-unknown', 'aria-pressed': 'false' });
    const depBanner = makeMockElement('div', { 'data-profile-deprecated': '', hidden: '' });
    const reqEl = makeMockElement('dd', { 'data-profile-requested': '' });
    const backEl = makeMockElement('span', { 'data-profile-backend': '' });
    const profileStatus = makeMockElement('span', { 'data-profile-status': '' });
    const profileRoot = makeMockElement('div', { 'data-vi-model-profile': '' }, [
      presetDep, presetUnknown, depBanner, reqEl, backEl, profileStatus,
      slotModel, slotCtx, slotTools, slotConstrained, slotStream,
    ]);

    const prevBtn = makeMockElement('button', { 'data-trace-prev': '' });
    const nextBtn = makeMockElement('button', { 'data-trace-next': '' });
    const viewDeltas = makeMockElement('button', { 'data-trace-view': 'deltas', 'aria-selected': 'false' });
    const panelFull = makeMockElement('div', { 'data-trace-panel': 'full' });
    const panelDeltas = makeMockElement('div', { 'data-trace-panel': 'deltas', hidden: '' });
    const seqLabel = makeMockElement('span', { 'data-trace-seq-label': '' });
    const traceStatus = makeMockElement('span', { 'data-trace-status': '' });
    const traceRoot = makeMockElement('div', { 'data-vi-trace-replay': '' }, [
      prevBtn, nextBtn, viewDeltas, panelFull, panelDeltas, seqLabel, traceStatus,
    ]);

    const evalFailedBtn = makeMockElement('button', { 'data-eval-filter': 'failed', 'aria-pressed': 'false' });
    const evalPassRow = makeMockElement('tr', { 'data-eval-case': '', 'data-eval-verdict': 'passed' });
    const evalFailRow = makeMockElement('tr', { 'data-eval-case': '', 'data-eval-verdict': 'failed' });
    const evalStatus = makeMockElement('span', { 'data-eval-status': '' });
    const evalRoot = makeMockElement('div', { 'data-vi-eval-report': '' }, [evalFailedBtn, evalPassRow, evalFailRow, evalStatus]);

    const capNextBtn = makeMockElement('button', { 'data-cap-horizon': 'next', 'aria-pressed': 'false' });
    const capNowRow = makeMockElement('tr', { 'data-cap-row': '', 'data-cap-hz': 'now' });
    const capNextRow = makeMockElement('tr', { 'data-cap-row': '', 'data-cap-hz': 'next' });
    const syncDriftBtn = makeMockElement('button', { 'data-sync-mode': 'drift', 'aria-pressed': 'false' });
    const syncBanner = makeMockElement('div', { 'data-sync-drift-banner': '', hidden: '' });
    const syncSeedLabel = makeMockElement('span', { 'data-sync-seed-label': '' });
    const capStatus = makeMockElement('span', { 'data-cap-status': '' });
    const capRoot = makeMockElement('div', { 'data-vi-cap-ledger': '' }, [
      capNextBtn, capNowRow, capNextRow, syncDriftBtn, syncBanner, syncSeedLabel, capStatus,
    ]);

    const droseraBtn = makeMockElement('button', { 'data-stack-repo': 'drosera', 'aria-pressed': 'false' });
    const stackDetailRepo = makeMockElement('dd', { 'data-stack-detail-repo': '' });
    const stackDetailUrl = makeMockElement('a', { 'data-stack-detail-url': '', href: 'https://github.com/Vidoxlabs/seed' });
    const stackStatus = makeMockElement('span', { 'data-stack-status': '' });
    const stackRoot = makeMockElement('div', { 'data-vi-family-stack': '' }, [
      droseraBtn, stackDetailRepo, stackDetailUrl, stackStatus,
    ]);

    const host = makeMockElement('section', {}, [profileRoot, traceRoot, evalRoot, capRoot, stackRoot]);
    const handle = initFamilySurfaces(host);

    presetDep.dispatch('click');
    assert.equal(depBanner.hidden, false);
    assert.equal(reqEl.textContent, 'legacy-chat');
    presetUnknown.dispatch('click');
    assert.equal(depBanner.hidden, true);
    assert.equal(slotTools.querySelector('[data-slot-value]').textContent, 'Unreported / unknown');

    nextBtn.dispatch('click');
    assert.match(seqLabel.textContent, /seq 5 \/ 6/);
    viewDeltas.dispatch('click');
    assert.equal(panelFull.hidden, true);
    assert.equal(panelDeltas.hidden, false);

    evalFailedBtn.dispatch('click');
    assert.equal(evalPassRow.hidden, true);
    assert.equal(evalFailRow.hidden, false);

    capNextBtn.dispatch('click');
    assert.equal(capNowRow.hidden, true);
    assert.equal(capNextRow.hidden, false);
    syncDriftBtn.dispatch('click');
    assert.equal(syncBanner.hidden, false);
    assert.equal(syncSeedLabel.textContent, 'Refused: sha256 mismatch');

    droseraBtn.dispatch('click');
    assert.match(stackDetailRepo.textContent, /drosera/);
    assert.equal(stackDetailUrl.getAttribute('href'), 'https://github.com/Vidoxlabs/drosera');
    assert.match(stackStatus.textContent, /Selected drosera/);

    handle.destroy();
    assert.equal(presetDep.listenerCount(), 0);
    assert.equal(nextBtn.listenerCount(), 0);
    assert.equal(evalFailedBtn.listenerCount(), 0);
    assert.equal(capNextBtn.listenerCount(), 0);
    assert.equal(droseraBtn.listenerCount(), 0);
  });
});
