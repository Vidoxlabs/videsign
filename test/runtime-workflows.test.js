'use strict';

/**
 * Contract & runtime tests for Bundle A (`lib/harness-runtime.css|js`) and
 * Bundle B (`lib/bloom-workflows.css|js`), unified modular CSS radii & wrap
 * continuity, and the 8 new preview fragments:
 *  - harness-runtime: schema-validation-repair, sandbox-scope-policy,
 *    owner-decision-editor, step-graph-checkpoint
 *  - bloom-workflows: session-setup-composer, symbol-outline-token-map,
 *    seat-fanout-orchestrator, research-flow-tracker
 */

const { test, describe, before } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const { initHarnessRuntime } = require('../lib/harness-runtime');
const { initBloomWorkflows } = require('../lib/bloom-workflows');
const { lintFragment } = require('../scripts/lint-preview');

const ROOT = path.join(__dirname, '..');
const LIB = path.join(ROOT, 'lib');
const DIST = path.join(ROOT, 'dist');
const PREVIEW = path.join(ROOT, 'preview');

const RUNTIME_WORKFLOW_FILES = [
  'schema-validation-repair.html',
  'sandbox-scope-policy.html',
  'owner-decision-editor.html',
  'step-graph-checkpoint.html',
  'session-setup-composer.html',
  'symbol-outline-token-map.html',
  'seat-fanout-orchestrator.html',
  'research-flow-tracker.html',
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
        const attrMatches = [...part.matchAll(/\[([a-z0-9-]+)(?:="([^"]*)")?\]/gi)];
        if (attrMatches.length > 0 && part.replace(/\[[^\]]+\]/g, '') === '') {
          return attrMatches.every((m) => (m[2] !== undefined ? this.getAttribute(m[1]) === m[2] : this.hasAttribute(m[1])));
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

describe('harness-runtime and bloom-workflows stylesheets, canonical radii & fragments', () => {
  before(() => {
    execFileSync(process.execPath, [path.join(ROOT, 'scripts', 'generate-tokens.js')], {
      cwd: ROOT,
      stdio: 'ignore',
    });
  });

  for (const [label, cssName, jsName, prefix, marker, scopeCls] of [
    ['harness-runtime', 'harness-runtime.css', 'harness-runtime.js', '--vi-hr-', 'vi-hr-stage', '.vi-hr-scope'],
    ['bloom-workflows', 'bloom-workflows.css', 'bloom-workflows.js', '--vi-bw-', 'vi-bw-stage', '.vi-bw-scope'],
  ]) {
    test(`${label} uses pure oklch(), canonical radii, balanced wrap, OKLCH ΔL floors, and emits identically to dist/`, () => {
      const libCss = fs.readFileSync(path.join(LIB, cssName), 'utf8');
      const distCss = fs.readFileSync(path.join(DIST, cssName), 'utf8');
      assert.equal(distCss, libCss, `dist/${cssName} must match lib/${cssName}`);

      const libJs = fs.readFileSync(path.join(LIB, jsName), 'utf8');
      const distJs = fs.readFileSync(path.join(DIST, jsName), 'utf8');
      assert.equal(distJs, libJs, `dist/${jsName} must match lib/${jsName}`);

      const stripped = libCss.replace(/\/\*[\s\S]*?\*\//g, '');
      assert.doesNotMatch(stripped, /#[0-9a-fA-F]{3,8}\b/, `${cssName} must contain zero hex literals`);
      assert.doesNotMatch(stripped, /\brgba?\s*\(/i, `${cssName} must use oklch() instead of rgb()`);
      assert.doesNotMatch(stripped, /\bhsla?\s*\(/i, `${cssName} must use oklch() instead of hsl()`);

      assert.ok(libCss.includes(`${prefix}radius-card: var(--vi-spacing-layout-radius-standard-base, 0.875rem);`));
      assert.ok(libCss.includes(`${prefix}radius-control: var(--vi-spacing-layout-radius-control-base, 0.625rem);`));
      assert.ok(libCss.includes(`${prefix}radius-pill: var(--vi-spacing-layout-radius-full-base, 9999rem);`));
      assert.match(libCss, /text-wrap:\s*balance;/);
      assert.match(libCss, /text-wrap:\s*pretty;/);

      assert.match(libCss, new RegExp(`container-type:\\s*inline-size;\\s*\\n\\s*container-name:\\s*${marker};`));
      assert.match(libCss, new RegExp(`@container ${marker}`));
      assert.match(libCss, /@media \(max-width:\s*640px\)/);
      assert.match(libCss, /@media \(prefers-reduced-motion:\s*reduce\)/);
      assert.match(libCss, /transition-duration:\s*0ms\s*!important;/);
      assert.match(libCss, /:focus-visible/);
      assert.match(libCss, /outline:\s*0\.125rem solid var\(--vi-[a-z-]+-accent\)/);
      assert.doesNotMatch(libCss, /transition:\s*all\b/);
      assert.doesNotMatch(libCss, /backdrop-filter/);

      const dark = extractBlock(libCss, `:root,\n${scopeCls} {`);
      const light = extractBlock(libCss, '[data-theme="light"],');
      const hc = extractBlock(libCss, '[data-theme="high-contrast"],');

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

  test('all modular component CSS suites standardize 14px/10px canonical radii and typographic wrap', () => {
    for (const [file, pfx] of [
      ['core-components.css', '--vi-core-'],
      ['extended-primitives.css', '--vi-ext-'],
      ['workspace-components.css', '--vi-ws-'],
      ['family-contracts.css', '--vi-fc-'],
      ['family-surfaces.css', '--vi-fs-'],
      ['harness-runtime.css', '--vi-hr-'],
      ['bloom-workflows.css', '--vi-bw-'],
    ]) {
      const css = fs.readFileSync(path.join(LIB, file), 'utf8');
      assert.equal(fs.readFileSync(path.join(DIST, file), 'utf8'), css, `dist/${file} parity`);
      assert.ok(css.includes(`${pfx}radius-card: var(--vi-spacing-layout-radius-standard-base, 0.875rem);`), `${file} canonical card radius`);
      assert.ok(css.includes(`${pfx}radius-control: var(--vi-spacing-layout-radius-control-base, 0.625rem);`), `${file} canonical control radius`);
      assert.ok(css.includes(`${pfx}radius-pill: var(--vi-spacing-layout-radius-full-base, 9999rem);`), `${file} canonical pill radius`);
      assert.match(css, /text-wrap:\s*balance;/, `${file} must include text-wrap: balance`);
      if (file !== 'extended-primitives.css') {
        assert.match(css, /text-wrap:\s*pretty;/, `${file} must include text-wrap: pretty`);
      }
    }
  });

  test('all 8 runtime/workflow fragments lint clean, stay solid, enforce 44px hit areas, and carry required markers', () => {
    for (const file of RUNTIME_WORKFLOW_FILES) {
      const html = fs.readFileSync(path.join(PREVIEW, file), 'utf8');
      assert.deepEqual(lintFragment(file, html), [], `${file} lint failure`);
      assert.doesNotMatch(html, /vi-glass/, `${file}: must stay solid`);
      assert.doesNotMatch(html, /persona-accent-/, `${file}: neutral roles only`);
      assert.doesNotMatch(html, /bg-surface-accent-violet-base/, `${file}: avoid solid accent fill CTA`);
      for (const m of html.matchAll(/<(button|a|summary|input|textarea|select)\b([^>]*)>/g)) {
        assert.match(m[2], /class="[^"]*\bh-action-min-default\b/, `${file}: missing h-action-min-default on ${m[0].slice(0, 72)}`);
      }
    }

    const read = (f) => fs.readFileSync(path.join(PREVIEW, f), 'utf8');
    assert.match(read('schema-validation-repair.html'), /data-vi-schema-repair[\s\S]*Turn 1 of 1[\s\S]*\/sandbox\/allowShell/);
    assert.match(read('sandbox-scope-policy.html'), /data-vi-sandbox-policy[\s\S]*allowShell: false/);
    assert.match(read('owner-decision-editor.html'), /data-vi-owner-decision[\s\S]*thirdPartyEgress: false/);
    assert.match(read('step-graph-checkpoint.html'), /data-vi-step-graph[\s\S]*Resume rule 3/);

    const session = read('session-setup-composer.html');
    for (const label of ['Coding session', 'Blank starts in Scratch', 'Head agent name', 'Jurisdiction', 'Model and limits', 'Try a sample task', 'Create coding session']) {
      assert.ok(session.includes(label), `session-setup-composer missing ${label}`);
    }

    assert.match(read('symbol-outline-token-map.html'), /data-vi-token-map[\s\S]*status: unknown/);
    assert.match(read('seat-fanout-orchestrator.html'), /data-vi-seat-fanout[\s\S]*checkRegistryDocuments: valid/);
    assert.match(read('research-flow-tracker.html'), /data-vi-research-flow[\s\S]*thirdPartyEgress: true/);
  });
});

describe('ViHarnessRuntime controllers and destroy() cleanup', () => {
  test('schema-validation-repair, sandbox-scope-policy, owner-decision-editor, and step-graph-checkpoint execute cleanly', () => {
    const inspectBtn = makeMockElement('button', { 'data-schema-inspect': '' });
    const repairBtn = makeMockElement('button', { 'data-schema-repair': '' });
    const resetSchemaBtn = makeMockElement('button', { 'data-schema-reset': '' });
    const schemaStatus = makeMockElement('span', { 'data-schema-status': '' });
    const schemaBudget = makeMockElement('span', { 'data-schema-budget': '' });
    const schemaPayload = makeMockElement('code', { 'data-schema-payload': '' });
    const schemaDiags = makeMockElement('ul', { 'data-schema-diags': '' });
    const validBanner = makeMockElement('div', { 'data-schema-valid-banner': '', hidden: '' });
    const schemaRoot = makeMockElement('div', { 'data-vi-schema-repair': '' }, [
      inspectBtn, repairBtn, resetSchemaBtn, schemaStatus, schemaBudget, schemaPayload, schemaDiags, validBanner,
    ]);

    const shellToggle = makeMockElement('button', { 'data-sandbox-shell-toggle': '', 'aria-checked': 'false' });
    const shellLabel = makeMockElement('span', { 'data-sandbox-shell-label': '' });
    const probeEsc = makeMockElement('button', { 'data-sandbox-probe': 'escape-parent', 'aria-selected': 'false', tabindex: '-1' });
    const probeGit = makeMockElement('button', { 'data-sandbox-probe': 'git-status', 'aria-selected': 'false', tabindex: '-1' });
    const verdictBanner = makeMockElement('div', { 'data-sandbox-verdict-banner': '', class: 'vi-hr-notice vi-hr-notice--ok' });
    const verdictEl = makeMockElement('span', { 'data-sandbox-verdict': '' });
    const reasonEl = makeMockElement('p', { 'data-sandbox-reason': '' });
    const sandboxRoot = makeMockElement('div', { 'data-vi-sandbox-policy': '' }, [
      shellToggle, shellLabel, probeEsc, probeGit, verdictBanner, verdictEl, reasonEl,
    ]);

    const tierStd = makeMockElement('button', { 'data-risk-tier': 'standard', 'aria-selected': 'true', tabindex: '0' });
    const tierCred = makeMockElement('button', { 'data-risk-tier': 'credential', 'aria-selected': 'false', tabindex: '-1' });
    const btnApprove = makeMockElement('button', { 'data-decision-kind': 'approve', 'aria-checked': 'true' });
    const btnEdit = makeMockElement('button', { 'data-decision-kind': 'edit', 'aria-checked': 'false' });
    const btnRespond = makeMockElement('button', { 'data-decision-kind': 'respond', 'aria-checked': 'false', 'aria-disabled': 'false' });
    const guardBox = makeMockElement('div', { 'data-decision-guard': '', hidden: '' });
    const editPanel = makeMockElement('div', { 'data-decision-edit-panel': '', hidden: '' });
    const editJson = makeMockElement('textarea', { 'data-decision-edit-json': '', value: '{"path":"preview/index.html"}' });
    const commitBtn = makeMockElement('button', { 'data-decision-commit': '' });
    const receiptText = makeMockElement('span', { 'data-decision-receipt-text': '' });
    const ownerRoot = makeMockElement('div', { 'data-vi-owner-decision': '' }, [
      tierStd, tierCred, btnApprove, btnEdit, btnRespond, guardBox, editPanel, editJson, commitBtn, receiptText,
    ]);

    const modeInterrupt = makeMockElement('button', { 'data-durability-mode': 'on-interrupt', 'aria-selected': 'false', tabindex: '-1' });
    const interruptBtn = makeMockElement('button', { 'data-graph-interrupt': '' });
    const resumeBtn = makeMockElement('button', { 'data-graph-resume': '', disabled: '', 'aria-disabled': 'true' });
    const resetGraphBtn = makeMockElement('button', { 'data-graph-reset': '' });
    const graphStatus = makeMockElement('span', { 'data-graph-status': '' });
    const graphFrontier = makeMockElement('dd', { 'data-graph-frontier': '' });
    const stepReview = makeMockElement('span', { 'data-graph-step-state': 'review' });
    const graphRoot = makeMockElement('div', { 'data-vi-step-graph': '' }, [
      modeInterrupt, interruptBtn, resumeBtn, resetGraphBtn, graphStatus, graphFrontier, stepReview,
    ]);

    const host = makeMockElement('section', {}, [schemaRoot, sandboxRoot, ownerRoot, graphRoot]);
    const handle = initHarnessRuntime(host);

    repairBtn.dispatch('click');
    assert.equal(validBanner.hidden, false);
    assert.equal(schemaStatus.textContent, 'Valid inputSchema (ready for dispatch; 1-turn budget spent)');

    resetSchemaBtn.dispatch('click');
    assert.equal(validBanner.hidden, true);
    inspectBtn.dispatch('click');
    assert.match(schemaBudget.textContent, /1 of 1/);

    probeEsc.dispatch('click');
    assert.equal(verdictEl.textContent, 'Deny (policy-denied)');
    probeGit.dispatch('click');
    assert.equal(verdictEl.textContent, 'Deny (policy-denied)');
    shellToggle.dispatch('click');
    assert.equal(shellToggle.getAttribute('aria-checked'), 'true');
    assert.equal(verdictEl.textContent, 'Allow (per-call owner gate required)');

    tierCred.dispatch('click');
    assert.equal(btnRespond.disabled, true);
    assert.equal(guardBox.hidden, false);
    tierStd.dispatch('click');
    btnEdit.dispatch('click');
    assert.equal(editPanel.hidden, false);
    commitBtn.dispatch('click');
    assert.match(receiptText.textContent, /edited/);

    modeInterrupt.dispatch('click');
    assert.match(graphFrontier.textContent, /on-interrupt/);
    interruptBtn.dispatch('click');
    assert.equal(resumeBtn.disabled, false);
    assert.match(graphStatus.textContent, /Interrupted/);
    resumeBtn.dispatch('click');
    assert.match(graphFrontier.textContent, /cp-03/);

    handle.destroy();
    assert.equal(repairBtn.listenerCount(), 0);
    assert.equal(shellToggle.listenerCount(), 0);
    assert.equal(tierCred.listenerCount(), 0);
    assert.equal(interruptBtn.listenerCount(), 0);
  });
});

describe('ViBloomWorkflows controllers and destroy() cleanup', () => {
  test('session-setup-composer, symbol-outline-token-map, seat-fanout-orchestrator, and research-flow-tracker execute cleanly', () => {
    const form = makeMockElement('form', { 'data-session-form': '' });
    const headInput = makeMockElement('input', { 'data-session-head-name': '', value: 'Lead' });
    const jurInput = makeMockElement('input', { 'data-session-jurisdiction': '', value: '' });
    const callsInput = makeMockElement('input', { 'data-session-calls': '', value: '6' });
    const tokensInput = makeMockElement('input', { 'data-session-tokens': '', value: '' });
    const taskInput = makeMockElement('textarea', { 'data-session-task': '', value: '' });
    const sampleBtn = makeMockElement('button', { 'data-session-sample': 'audit' });
    const createBtn = makeMockElement('button', { 'data-session-create': '' });
    const sessionPreview = makeMockElement('div', { 'data-session-preview': '', hidden: '' });
    const sessionStatus = makeMockElement('span', { 'data-session-status': '' });
    form.appendChild(createBtn);
    const sessionRoot = makeMockElement('div', { 'data-vi-session-composer': '' }, [
      form, headInput, jurInput, callsInput, tokensInput, taskInput, sampleBtn, sessionPreview, sessionStatus,
    ]);

    const budget8k = makeMockElement('button', { 'data-budget-preset': '8000', 'aria-pressed': 'false' });
    const file1Btn = makeMockElement('button', { 'data-file-toggle': '', 'aria-pressed': 'true' });
    const file1State = makeMockElement('span', { 'data-file-state': '' });
    const file1Bar = makeMockElement('span', { 'data-file-bar': '', class: 'vi-bw-bar-fill vi-bw-bar-fill--30' });
    const file1Row = makeMockElement('li', { 'data-token-file': 'src/packer.mjs', 'data-file-estimate': '4200', 'data-file-included': 'true' }, [
      file1Btn, file1State, file1Bar,
    ]);
    const file2Row = makeMockElement('li', { 'data-token-file': 'docs/contracts/retrieval.md', 'data-file-estimate': '4000', 'data-file-included': 'true' }, [
      makeMockElement('button', { 'data-file-toggle': '', 'aria-pressed': 'true' }),
      makeMockElement('span', { 'data-file-state': '' }),
      makeMockElement('span', { 'data-file-bar': '', class: 'vi-bw-bar-fill vi-bw-bar-fill--30' }),
    ]);
    const tokenTotal = makeMockElement('span', { 'data-token-total': '' });
    const tokenOmissions = makeMockElement('span', { 'data-token-omissions': '' });
    const tokenStatus = makeMockElement('span', { 'data-token-status': '' });
    const tokenRoot = makeMockElement('div', { 'data-vi-token-map': '' }, [
      budget8k, file1Row, file2Row, tokenTotal, tokenOmissions, tokenStatus,
    ]);

    const fanoutRun = makeMockElement('button', { 'data-fanout-run': '' });
    const fanoutReset = makeMockElement('button', { 'data-fanout-reset': '' });
    const seatSelectRisk = makeMockElement('button', { 'data-seat-select': 'risk', 'aria-pressed': 'false' });
    const seatRowRisk = makeMockElement('li', { 'data-seat-row': 'risk' }, [
      makeMockElement('span', { 'data-seat-state-dot': '', class: 'vi-bw-dot vi-bw-dot--muted' }),
      makeMockElement('span', { 'data-seat-state-label': '' }),
      seatSelectRisk,
    ]);
    const seatDetailRole = makeMockElement('dd', { 'data-seat-detail-role': '' });
    const fanoutStatus = makeMockElement('span', { 'data-fanout-status': '' });
    const fanoutRoot = makeMockElement('div', { 'data-vi-seat-fanout': '' }, [
      fanoutRun, fanoutReset, seatRowRisk, seatDetailRole, fanoutStatus,
    ]);

    const tabCited = makeMockElement('button', { 'data-research-tab': 'cited', 'aria-selected': 'true', tabindex: '0' });
    const tabGaps = makeMockElement('button', { 'data-research-tab': 'gaps', 'aria-selected': 'false', tabindex: '-1' });
    const itemCited = makeMockElement('li', { 'data-research-item': '', 'data-claim-kind': 'cited' }, [
      makeMockElement('button', { 'data-inspect-claim': 'clm-01', 'aria-pressed': 'true' }),
    ]);
    const itemGapBtn = makeMockElement('button', { 'data-inspect-claim': 'gap-01', 'aria-pressed': 'false' });
    const itemGap = makeMockElement('li', { 'data-research-item': '', 'data-claim-kind': 'gaps', hidden: '' }, [itemGapBtn]);
    const provId = makeMockElement('dd', { 'data-prov-id': '' });
    const provUri = makeMockElement('a', { 'data-prov-uri': '' });
    const provNone = makeMockElement('span', { 'data-prov-none': '', hidden: '' });
    const researchStatus = makeMockElement('span', { 'data-research-status': '' });
    const researchRoot = makeMockElement('div', { 'data-vi-research-flow': '' }, [
      tabCited, tabGaps, itemCited, itemGap, provId, provUri, provNone, researchStatus,
    ]);

    const host = makeMockElement('section', {}, [sessionRoot, tokenRoot, fanoutRoot, researchRoot]);
    const handle = initBloomWorkflows(host);

    form.dispatch('submit');
    assert.equal(sessionPreview.hidden, true);
    assert.match(sessionStatus.textContent, /Enter Jurisdiction/);
    sampleBtn.dispatch('click');
    form.dispatch('submit');
    assert.equal(sessionPreview.hidden, false);

    budget8k.dispatch('click');
    assert.match(tokenTotal.textContent, /8,000 est\. tokens/);
    assert.match(tokenOmissions.textContent, /1 out-of-budget/);
    file1Btn.dispatch('click');
    assert.equal(file1State.textContent, 'excluded');

    seatSelectRisk.dispatch('click');
    assert.match(seatDetailRole.textContent, /risk/);
    fanoutRun.dispatch('click');
    assert.match(fanoutStatus.textContent, /Running parallel fan-out/);

    tabGaps.dispatch('click');
    assert.equal(itemCited.hidden, true);
    assert.equal(itemGap.hidden, false);
    assert.equal(provUri.hidden, true);
    assert.equal(provNone.hidden, false);
    assert.equal(provId.textContent, 'gap-01');

    handle.destroy();
    assert.equal(form.listenerCount(), 0);
    assert.equal(budget8k.listenerCount(), 0);
    assert.equal(fanoutRun.listenerCount(), 0);
    assert.equal(tabGaps.listenerCount(), 0);
  });
});
