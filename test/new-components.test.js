'use strict';

/**
 * Extended UI Primitives & Workspace Components Verification Suite (8 new specimens):
 *   1. Zero hex/rgb/hsl across lib/extended-primitives.css|js, lib/workspace-components.css|js,
 *      and all 8 new preview/*.html fragments + emitted dist/ parity checks.
 *   2. 4-tier OKLCH ΔL contrast floors (ink >= 0.75, ink-muted >= 0.45, border/accent >= 0.35)
 *      across dark, light, and high-contrast themes + @container queries + GPU-only transitions +
 *      0ms reduced-motion freeze.
 *   3. 44px h-action-min-default touch targets, semantic ARIA roles, solid surfaces (0 glass),
 *      and zero persona-accent-* leaks across all 8 fragments.
 *   4. Runtime controller unit tests for initExtendedPrimitives and initWorkspaceComponents +
 *      clean destroy().
 */

const { test, before } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const { initExtendedPrimitives } = require('../lib/extended-primitives');
const { initWorkspaceComponents } = require('../lib/workspace-components');
const {
  emitExtendedPrimitivesArtifacts,
  emitWorkspaceComponentsArtifacts,
} = require('../scripts/generate-tokens');

const ROOT = path.join(__dirname, '..');

const EXTENDED_FRAGMENTS = [
  'context-menu-popover.html',
  'keyboard-shortcuts-sheet.html',
  'avatar-group-presence.html',
  'copy-command-bar.html',
];

const WORKSPACE_FRAGMENTS = [
  'voice-capture-bar.html',
  'input-request-card.html',
  'run-plan-checklist.html',
  'notification-inbox-panel.html',
];

const ALL_NEW_FRAGMENTS = [...EXTENDED_FRAGMENTS, ...WORKSPACE_FRAGMENTS];

function parseScopedOklchL(block, prefix) {
  const map = {};
  const re = new RegExp(
    `(${prefix}[a-z0-9-]+):\\s*(?:var\\([^,]+,\\s*)?oklch\\(\\s*([\\d.]+)\\s+[\\d.]+\\s+[\\d.]+(?:\\s*\\/\\s*[\\d.]+)?\\s*\\)`,
    'g',
  );
  for (const m of block.matchAll(re)) {
    map[m[1]] = Number(m[2]);
  }
  return map;
}

function makeMockDom() {
  function matchSingle(node, sel) {
    if (sel.startsWith('#')) return node.id === sel.slice(1);
    if (/^[a-z]+$/i.test(sel)) return node.tagName === sel.toUpperCase();
    const attrMatches = [...sel.matchAll(/\[([^\]=]+)(?:="([^"]*)")?\]/g)];
    if (attrMatches.length === 0) return false;
    return attrMatches.every(([, name, val]) => (
      val === undefined ? node.hasAttribute(name) : node.getAttribute(name) === val
    ));
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

  function makeEl(tag, attrs = {}, text = '') {
    const listeners = new Map();
    const map = { ...attrs };
    const classes = new Set((map.class || '').split(/\s+/).filter(Boolean));
    const styles = new Map();
    const el = {
      tagName: tag.toUpperCase(),
      id: map.id || '',
      hidden: Object.prototype.hasOwnProperty.call(map, 'hidden') && map.hidden !== false,
      disabled: Object.prototype.hasOwnProperty.call(map, 'disabled') && map.disabled !== false,
      value: map.value || '',
      textContent: text,
      innerHTML: '',
      focused: false,
      parentNode: null,
      ownerDocument: null,
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
      getAttribute(k) { return Object.prototype.hasOwnProperty.call(map, k) ? String(map[k]) : null; },
      setAttribute(k, v) {
        map[k] = String(v);
        if (k === 'id') el.id = String(v);
      },
      removeAttribute(k) { delete map[k]; },
      hasAttribute(k) { return Object.prototype.hasOwnProperty.call(map, k); },
      addEventListener(t, fn) {
        if (!listeners.has(t)) listeners.set(t, new Set());
        listeners.get(t).add(fn);
      },
      removeEventListener(t, fn) {
        if (listeners.has(t)) listeners.get(t).delete(fn);
      },
      contains(target) {
        if (target === el) return true;
        return flatten(el.children).includes(target);
      },
      appendChild(node) {
        node.parentNode = el;
        node.ownerDocument = el.ownerDocument;
        el.children.push(node);
        return node;
      },
      append(...nodes) {
        for (const n of nodes) el.appendChild(n);
      },
      dispatch(t, ev = {}) {
        const event = {
          target: el,
          preventDefault() { event.defaultPrevented = true; },
          composedPath() {
            const pathList = [];
            let cur = event.target || el;
            while (cur) {
              pathList.push(cur);
              cur = cur.parentNode || null;
            }
            return pathList;
          },
          ...ev,
        };
        const set = listeners.get(t);
        if (set) {
          for (const fn of [...set]) fn(event);
        }
        return event;
      },
      click() { return el.dispatch('click'); },
      focus() { el.focused = true; },
      listenerCount(t) { return listeners.has(t) ? listeners.get(t).size : 0; },
      querySelector(sel) { return el.querySelectorAll(sel)[0] || null; },
      querySelectorAll(sel) { return matchSelector(el.children, sel); },
    };
    return el;
  }

  const root = makeEl('div');
  const doc = makeEl('#document');
  doc.nodeType = 9;
  doc.createElement = (t) => makeEl(t);
  doc.querySelector = (s) => root.querySelector(s);
  doc.querySelectorAll = (s) => root.querySelectorAll(s);
  root.ownerDocument = doc;
  doc.appendChild(root);

  function setOwners(node) {
    node.ownerDocument = doc;
    for (const c of node.children) setOwners(c);
  }

  return { root, doc, makeEl, finalize() { setOwners(root); } };
}

before(() => {
  execFileSync(process.execPath, [path.join(ROOT, 'scripts', 'generate-tokens.js')], { cwd: ROOT, stdio: 'ignore' });
});

test('extended-primitives and workspace-components artifacts contain zero hex/rgb/hsl literals and pass emitted dist/ parity', () => {
  const files = [
    path.join(ROOT, 'lib', 'extended-primitives.css'),
    path.join(ROOT, 'lib', 'extended-primitives.js'),
    path.join(ROOT, 'lib', 'workspace-components.css'),
    path.join(ROOT, 'lib', 'workspace-components.js'),
    ...ALL_NEW_FRAGMENTS.map((f) => path.join(ROOT, 'preview', f)),
  ];
  for (const filePath of files) {
    const src = fs.readFileSync(filePath, 'utf-8');
    const rel = path.relative(ROOT, filePath);
    assert.doesNotMatch(src, /#[0-9a-fA-F]{3,8}\b/, `${rel} must not contain hex literals`);
    assert.doesNotMatch(src, /\brgba?\(/i, `${rel} must not contain rgb()/rgba() literals`);
    assert.doesNotMatch(src, /\bhsla?\(/i, `${rel} must not contain hsl()/hsla() literals`);
  }

  const extEmitted = emitExtendedPrimitivesArtifacts();
  assert.equal(extEmitted['extended-primitives.css'], fs.readFileSync(path.join(ROOT, 'lib', 'extended-primitives.css'), 'utf-8'));
  assert.equal(extEmitted['extended-primitives.js'], fs.readFileSync(path.join(ROOT, 'lib', 'extended-primitives.js'), 'utf-8'));
  assert.equal(extEmitted['extended-primitives.css'], fs.readFileSync(path.join(ROOT, 'dist', 'extended-primitives.css'), 'utf-8'));
  assert.equal(extEmitted['extended-primitives.js'], fs.readFileSync(path.join(ROOT, 'dist', 'extended-primitives.js'), 'utf-8'));

  const wsEmitted = emitWorkspaceComponentsArtifacts();
  assert.equal(wsEmitted['workspace-components.css'], fs.readFileSync(path.join(ROOT, 'lib', 'workspace-components.css'), 'utf-8'));
  assert.equal(wsEmitted['workspace-components.js'], fs.readFileSync(path.join(ROOT, 'lib', 'workspace-components.js'), 'utf-8'));
  assert.equal(wsEmitted['workspace-components.css'], fs.readFileSync(path.join(ROOT, 'dist', 'workspace-components.css'), 'utf-8'));
  assert.equal(wsEmitted['workspace-components.js'], fs.readFileSync(path.join(ROOT, 'dist', 'workspace-components.js'), 'utf-8'));
});

test('extended-primitives.css and workspace-components.css enforce 4-tier OKLCH ΔL floors, @container queries, GPU-only transitions, and 0ms reduced-motion freeze', () => {
  const suites = [
    {
      file: path.join(ROOT, 'lib', 'extended-primitives.css'),
      scope: 'vi-ext-scope',
      container: 'vi-ext-stage',
      prefix: '--vi-ext-',
    },
    {
      file: path.join(ROOT, 'lib', 'workspace-components.css'),
      scope: 'vi-ws-scope',
      container: 'vi-ws-stage',
      prefix: '--vi-ws-',
    },
  ];

  for (const spec of suites) {
    const css = fs.readFileSync(spec.file, 'utf-8');
    const rel = path.relative(ROOT, spec.file);
    for (const needle of [
      `container-name: ${spec.container}`,
      `@container ${spec.container} (max-width: 30rem)`,
      `[data-motion="reduced"] .${spec.scope} *`,
      `[data-motion="paused"] .${spec.scope} *`,
      '@media (prefers-reduced-motion: reduce)',
      'transition-duration: 0ms !important',
    ]) {
      assert.ok(css.includes(needle), `${rel} missing required rule: ${needle}`);
    }

    for (const m of css.matchAll(/transition:\s*([^;]+);/g)) {
      assert.doesNotMatch(
        m[1],
        /\b(width|height|padding|margin|background|border|color|all)\b/i,
        `${rel} non-GPU transition: ${m[1]}`,
      );
    }

    const darkBlock = css.match(new RegExp(`:root,\\s*\\.${spec.scope}\\s*\\{([\\s\\S]*?)\\}`))[1];
    const lightBlock = css.match(/\[data-theme="light"\][\s\S]*?\{([\s\S]*?)\}/)[1];
    const hcBlock = css.match(/\[data-theme="high-contrast"\][\s\S]*?\{([\s\S]*?)\}/)[1];

    for (const [themeName, block] of [['dark', darkBlock], ['light', lightBlock], ['high-contrast', hcBlock]]) {
      const vars = parseScopedOklchL(block, spec.prefix);
      const tiers = [`${spec.prefix}canvas`, `${spec.prefix}shell`, `${spec.prefix}card`, `${spec.prefix}elevated`];
      for (const tier of tiers) {
        assert.ok(vars[tier] !== undefined, `${rel} (${themeName}) missing ${tier}`);
        assert.ok(
          Math.abs(vars[`${spec.prefix}ink`] - vars[tier]) >= 0.75,
          `${rel} ${themeName} ink ΔL < 0.75 on ${tier}`,
        );
        assert.ok(
          Math.abs(vars[`${spec.prefix}ink-muted`] - vars[tier]) >= 0.45,
          `${rel} ${themeName} ink-muted ΔL < 0.45 on ${tier}`,
        );
        assert.ok(
          Math.abs(vars[`${spec.prefix}border`] - vars[tier]) >= 0.35,
          `${rel} ${themeName} border ΔL < 0.35 on ${tier}`,
        );
        assert.ok(
          Math.abs(vars[`${spec.prefix}accent`] - vars[tier]) >= 0.35,
          `${rel} ${themeName} accent ΔL < 0.35 on ${tier}`,
        );
      }
    }
  }
});

test('all 8 new fragments enforce 44px touch targets, semantic ARIA roles, solid surfaces, and zero persona-accent leaks', () => {
  const expectedMarkers = {
    'context-menu-popover.html': ['role="menu"', 'role="menuitem"', 'role="menuitemcheckbox"', 'role="menuitemradio"', 'aria-disabled="true"', 'Read-only preview'],
    'keyboard-shortcuts-sheet.html': ['role="dialog"', 'aria-modal="false"', 'Navigation', 'Workspace', 'Review', 'Reset filter'],
    'avatar-group-presence.html': ['vi-ext-avatar--lead', 'vi-ext-avatar--specialist', '+2', 'Active', 'Running', 'Idle', 'Offline'],
    'copy-command-bar.html': ['role="tablist"', 'role="tab"', 'role="switch"', 'Include MCP config', 'Copy', 'Ready to copy'],
    'voice-capture-bar.html': ['Hold to talk', 'Listening', 'Mic blocked', '00:08 / 02:00', 'role="alert"', 'Discard'],
    'input-request-card.html': ['waiting_for_input', 'role="radiogroup"', 'role="radio"', 'Recommended', 'Submit answer', 'Use default', 'Reopen'],
    'run-plan-checklist.html': ['2 / 5 steps done', 'data-plan-filter="open"', 'data-step-status="blocked"', 'waiting_for_owner', 'Blocker receipt'],
    'notification-inbox-panel.html': ['role="tablist"', '2 unread', 'Mark all read', 'Approvals', 'All caught up', 'Restore demo items'],
  };

  for (const file of ALL_NEW_FRAGMENTS) {
    const html = fs.readFileSync(path.join(ROOT, 'preview', file), 'utf-8').replace(/<!--[\s\S]*?-->/g, '');
    assert.doesNotMatch(html, /vi-glass/, `${file} must remain solid (zero vi-glass)`);
    assert.doesNotMatch(html, /persona-accent-/, `${file} must not leak persona-accent-*`);
    for (const m of html.matchAll(/<(button|input)\b([^>]*)>/g)) {
      const cls = (m[2].match(/\bclass="([^"]*)"/) || [])[1] || '';
      assert.match(cls, /h-action-min-default/, `${file}: 44px touch target missing on ${m[0].slice(0, 80)}`);
    }
    for (const marker of expectedMarkers[file]) {
      assert.ok(html.includes(marker), `${file} missing required marker: ${marker}`);
    }
  }
});

test('lib/extended-primitives.js drives context-menu, shortcuts, avatar-group, and command-bar flows and cleans up on destroy()', () => {
  const { root, doc, makeEl, finalize } = makeMockDom();

  // 1. Context menu fixture
  const menuHost = makeEl('div', { 'data-vi-context-menu': '' });
  const menuTrigger = makeEl('button', { 'data-menu-trigger': '', 'aria-expanded': 'true' }, 'Actions');
  const menuPanel = makeEl('div', { 'data-menu-panel': '', role: 'menu' });
  const menuStatus = makeEl('span', { 'data-menu-status': '' }, 'Menu open');
  const item1 = makeEl('button', { 'data-menu-item': '', 'data-menu-label': 'Open source', role: 'menuitem', tabindex: '0' }, 'Open source');
  const itemDisabled = makeEl('button', { 'data-menu-item': '', 'data-menu-label': 'Publish', 'data-menu-reason': 'Read-only preview', 'aria-disabled': 'true', role: 'menuitem', tabindex: '-1' }, 'Publish');
  const itemCheck = makeEl('button', { 'data-menu-item': '', 'data-menu-label': 'Wrap lines', role: 'menuitemcheckbox', 'aria-checked': 'false', tabindex: '-1' }, 'Wrap lines');
  const itemRadioA = makeEl('button', { 'data-menu-item': '', 'data-menu-label': 'Compact', role: 'menuitemradio', 'data-radio-group': 'density', 'aria-checked': 'true', tabindex: '-1' }, 'Compact');
  const itemRadioB = makeEl('button', { 'data-menu-item': '', 'data-menu-label': 'Comfortable', role: 'menuitemradio', 'data-radio-group': 'density', 'aria-checked': 'false', tabindex: '-1' }, 'Comfortable');
  menuPanel.append(item1, itemDisabled, itemCheck, itemRadioA, itemRadioB);
  menuHost.append(menuStatus, menuTrigger, menuPanel);

  // 2. Shortcuts fixture
  const shortHost = makeEl('div', { 'data-vi-shortcuts': '' });
  const shortTrigger = makeEl('button', { 'data-shortcuts-trigger': '', 'aria-expanded': 'true' }, '?');
  const shortDialog = makeEl('div', { 'data-shortcuts-dialog': '', role: 'dialog' });
  const shortClose = makeEl('button', { 'data-shortcuts-close': '' }, 'Close');
  const shortInput = makeEl('input', { 'data-shortcuts-input': '', value: '' });
  const shortReset = makeEl('button', { 'data-shortcuts-reset': '' }, 'Reset');
  const shortEmpty = makeEl('div', { 'data-shortcuts-empty': '', hidden: true });
  const shortStatus = makeEl('span', { 'data-shortcuts-status': '' }, '2 shortcuts');
  const grpA = makeEl('div', { 'data-shortcut-group': '' });
  const row1 = makeEl('li', { 'data-shortcut-row': '', 'data-shortcut-search': 'command palette cmd k' }, 'Open command palette');
  const row2 = makeEl('li', { 'data-shortcut-row': '', 'data-shortcut-search': 'next diff hunk n' }, 'Next diff hunk');
  grpA.append(row1, row2);
  shortDialog.append(shortClose, shortInput, shortReset, shortEmpty, shortStatus, grpA);
  shortHost.append(shortTrigger, shortDialog);

  // 3. Avatar group fixture
  const avatarHost = makeEl('div', { 'data-vi-avatar-group': '' });
  const avatarMore = makeEl('button', { 'data-avatar-overflow': '', 'aria-expanded': 'true' }, '+2');
  const avatarPopover = makeEl('div', { 'data-avatar-popover': '' });
  const avatarClose = makeEl('button', { 'data-avatar-close': '' }, 'Close');
  const avatarStatus = makeEl('span', { 'data-avatar-status': '' }, '6 team members · overflow open');
  avatarPopover.append(avatarClose);
  avatarHost.append(avatarStatus, avatarMore, avatarPopover);

  // 4. Copy command bar fixture
  const cmdHost = makeEl('div', { 'data-vi-command-bar': '' });
  const tabNpm = makeEl('button', { 'data-runner': 'npm', role: 'tab', 'aria-selected': 'true', tabindex: '0' }, 'npm');
  const tabPnpm = makeEl('button', { 'data-runner': 'pnpm', role: 'tab', 'aria-selected': 'false', tabindex: '-1' }, 'pnpm');
  const tabCli = makeEl('button', { 'data-runner': 'cli', role: 'tab', 'aria-selected': 'false', tabindex: '-1' }, 'CLI');
  const cmdCode = makeEl('code', { 'data-cmd-text': '' }, '');
  const cmdFlag = makeEl('button', { 'data-cmd-flag': '', role: 'switch', 'aria-checked': 'false' }, 'Include MCP config');
  const cmdCopy = makeEl('button', { 'data-cmd-copy': '' }, 'Copy');
  const cmdStatus = makeEl('span', { 'data-cmd-status': '' }, '');
  cmdHost.append(tabNpm, tabPnpm, tabCli, cmdCode, cmdFlag, cmdCopy, cmdStatus);

  root.append(menuHost, shortHost, avatarHost, cmdHost);
  finalize();

  const ctrl = initExtendedPrimitives(root);

  // Context menu interactions
  item1.dispatch('keydown', { key: 'ArrowDown' });
  assert.equal(itemDisabled.focused, true);
  assert.equal(itemDisabled.getAttribute('tabindex'), '0');
  itemDisabled.click();
  assert.equal(menuStatus.textContent, 'Publish unavailable: Read-only preview');
  itemCheck.click();
  assert.equal(itemCheck.getAttribute('aria-checked'), 'true');
  itemRadioB.click();
  assert.equal(itemRadioA.getAttribute('aria-checked'), 'false');
  assert.equal(itemRadioB.getAttribute('aria-checked'), 'true');
  itemCheck.dispatch('keydown', { key: 'Escape' });
  assert.equal(menuPanel.hidden, true);
  assert.equal(menuTrigger.getAttribute('aria-expanded'), 'false');
  assert.equal(menuTrigger.focused, true);
  menuTrigger.click();
  assert.equal(menuPanel.hidden, false);
  assert.equal(menuStatus.textContent, 'Menu open');
  menuTrigger.click();
  assert.equal(menuPanel.hidden, true);
  assert.equal(menuStatus.textContent, 'Menu closed');

  // Shortcuts filter + reset + ? toggle
  assert.equal(shortStatus.textContent, '2 shortcuts');
  shortInput.value = 'palette';
  shortInput.dispatch('input');
  assert.equal(row1.hidden, false);
  assert.equal(row2.hidden, true);
  assert.equal(shortStatus.textContent, '1 shortcut');
  shortInput.value = 'zzz-none';
  shortInput.dispatch('input');
  assert.equal(shortEmpty.hidden, false);
  assert.equal(grpA.hidden, true);
  shortReset.click();
  assert.equal(shortInput.value, '');
  assert.equal(shortEmpty.hidden, true);
  assert.equal(shortStatus.textContent, '2 shortcuts');
  doc.dispatch('keydown', { key: '?', target: root });
  assert.equal(shortDialog.hidden, true);

  // Avatar overflow popover toggle + Esc
  avatarClose.click();
  assert.equal(avatarPopover.hidden, true);
  assert.equal(avatarMore.getAttribute('aria-expanded'), 'false');
  assert.equal(avatarMore.focused, true);
  avatarMore.click();
  assert.equal(avatarPopover.hidden, false);
  avatarPopover.dispatch('keydown', { key: 'Escape' });
  assert.equal(avatarPopover.hidden, true);

  // Copy command bar
  assert.equal(cmdCode.textContent, 'npm install @vidoxlabs/videsign');
  tabPnpm.click();
  assert.equal(cmdCode.textContent, 'pnpm add @vidoxlabs/videsign');
  cmdFlag.click();
  assert.equal(cmdFlag.getAttribute('aria-checked'), 'true');
  assert.equal(cmdCode.textContent, 'pnpm add @vidoxlabs/videsign && pnpm dlx @vidoxlabs/videsign --mcp');
  tabPnpm.dispatch('keydown', { key: 'ArrowRight' });
  assert.equal(tabCli.getAttribute('aria-selected'), 'true');
  assert.equal(cmdCode.textContent, 'videsign tokens --check --with-mcp');
  cmdCopy.click();
  assert.equal(cmdStatus.textContent, 'Copied');

  // Destroy tears down element and document listeners cleanly
  ctrl.destroy();
  assert.equal(doc.listenerCount('click'), 0);
  assert.equal(doc.listenerCount('keydown'), 0);
  const prevCmd = cmdCode.textContent;
  tabNpm.click();
  assert.equal(cmdCode.textContent, prevCmd);
});

test('lib/workspace-components.js drives voice-bar, input-request, run-plan, and inbox flows and cleans up on destroy()', () => {
  const { root, makeEl, finalize } = makeMockDom();

  // 1. Voice capture bar fixture
  const voiceHost = makeEl('div', { 'data-vi-voice-bar': '', 'data-voice-state': 'listening' });
  const modeIdle = makeEl('button', { 'data-voice-mode': 'idle', 'aria-pressed': 'false' }, 'Idle');
  const modeListening = makeEl('button', { 'data-voice-mode': 'listening', 'aria-pressed': 'true' }, 'Listening');
  const modeReview = makeEl('button', { 'data-voice-mode': 'review', 'aria-pressed': 'false' }, 'Review');
  const panelIdle = makeEl('div', { 'data-voice-panel': 'idle', hidden: true });
  const panelListening = makeEl('div', { 'data-voice-panel': 'listening' });
  const panelReview = makeEl('div', { 'data-voice-panel': 'review', hidden: true });
  const voiceHold = makeEl('button', { 'data-voice-hold': '' }, 'Hold to talk');
  const voiceStop = makeEl('button', { 'data-voice-stop': '' }, 'Stop');
  const voiceInput = makeEl('input', { 'data-voice-transcript': '', value: 'Summarize the schema diff' });
  const voiceSend = makeEl('button', { 'data-voice-send': '' }, 'Send');
  const voiceDiscard = makeEl('button', { 'data-voice-discard': '' }, 'Discard');
  const voiceReceipt = makeEl('span', { 'data-voice-receipt': '' }, 'Capturing locally');
  const voiceModeNote = makeEl('span', { 'data-voice-mode-note': '' }, 'Listening state');
  panelIdle.append(voiceHold);
  panelListening.append(voiceStop);
  panelReview.append(voiceInput, voiceSend, voiceDiscard);
  voiceHost.append(modeIdle, modeListening, modeReview, panelIdle, panelListening, panelReview, voiceReceipt, voiceModeNote);

  // 2. Input request card fixture
  const reqHost = makeEl('div', { 'data-vi-input-request': '', 'data-input-state': 'pending' });
  const reqBody = makeEl('div', { 'data-input-body': '' });
  const radio1 = makeEl('button', { role: 'radio', 'aria-checked': 'true', tabindex: '0', 'data-radio-value': 'Backfill then enforce', 'data-radio-default': 'true' }, 'Backfill');
  const radio2 = makeEl('button', { role: 'radio', 'aria-checked': 'false', tabindex: '-1', 'data-radio-value': 'Keep nullable' }, 'Keep nullable');
  const reqNote = makeEl('input', { 'data-input-note': '', value: 'Batch 500 rows' });
  const reqSubmit = makeEl('button', { 'data-input-submit': '' }, 'Submit answer');
  const reqDefault = makeEl('button', { 'data-input-default': '' }, 'Use default');
  const reqReceipt = makeEl('div', { 'data-input-receipt': '', hidden: true });
  const reqReceiptText = makeEl('span', { 'data-input-receipt-text': '' }, '');
  const reqReopen = makeEl('button', { 'data-input-reopen': '' }, 'Reopen');
  const reqDot = makeEl('span', { 'data-input-dot': '', class: 'vi-ws-dot vi-ws-dot--info' });
  const reqStatusLabel = makeEl('span', { 'data-input-status-label': '' }, 'waiting_for_input');
  reqBody.append(radio1, radio2, reqNote, reqSubmit, reqDefault);
  reqReceipt.append(reqReceiptText, reqReopen);
  reqHost.append(reqDot, reqStatusLabel, reqBody, reqReceipt);

  // 3. Run plan checklist fixture
  const planHost = makeEl('div', { 'data-vi-run-plan': '' });
  const planRatio = makeEl('span', { 'data-plan-ratio': '' }, '2 / 5 steps done');
  const planAll = makeEl('button', { 'data-plan-filter': 'all', 'aria-pressed': 'true' }, 'All');
  const planOpen = makeEl('button', { 'data-plan-filter': 'open', 'aria-pressed': 'false' }, 'Open');
  const stepDone = makeEl('li', { 'data-plan-step': '', 'data-step-status': 'done' }, 'Step 1');
  const stepBlocked = makeEl('li', { 'data-plan-step': '', 'data-step-status': 'blocked' }, 'Step 2');
  planHost.append(planRatio, planAll, planOpen, stepDone, stepBlocked);

  // 4. Notification inbox panel fixture
  const inboxHost = makeEl('div', { 'data-vi-inbox': '' });
  const tabAll = makeEl('button', { id: 'tab-all', 'data-inbox-tab': 'all', role: 'tab', 'aria-selected': 'true', tabindex: '0' }, 'All');
  const tabUnread = makeEl('button', { id: 'tab-unread', 'data-inbox-tab': 'unread', role: 'tab', 'aria-selected': 'false', tabindex: '-1' }, 'Unread');
  const tabApprovals = makeEl('button', { id: 'tab-approvals', 'data-inbox-tab': 'approvals', role: 'tab', 'aria-selected': 'false', tabindex: '-1' }, 'Approvals');
  const inboxPanel = makeEl('div', { 'data-inbox-panel': '' });
  const inboxList = makeEl('ul', { 'data-inbox-list': '' });
  const inboxCount = makeEl('span', { 'data-inbox-count': '' }, '');
  const inboxMarkAll = makeEl('button', { 'data-inbox-mark-all': '' }, 'Mark all read');
  const inboxEmpty = makeEl('div', { 'data-inbox-empty': '', hidden: true });
  const inboxEmptyTitle = makeEl('p', { 'data-inbox-empty-title': '' }, '');
  const inboxEmptyCopy = makeEl('p', { 'data-inbox-empty-copy': '' }, '');
  const inboxRestore = makeEl('button', { 'data-inbox-restore': '' }, 'Restore');
  const inboxRestoreInline = makeEl('button', { 'data-inbox-restore-inline': '', hidden: true }, 'Restore inline');
  const inboxReceipt = makeEl('span', { 'data-inbox-receipt': '' }, '');

  const rowApproval = makeEl('li', { 'data-inbox-item': '', 'data-read': 'false', 'data-category': 'approvals' });
  const rowApprovalTitle = makeEl('p', { 'data-inbox-title': '' }, 'vcs.file.write');
  const rowApprovalOpen = makeEl('button', { 'data-inbox-open': '' }, 'Open');
  const rowApprovalMark = makeEl('button', { 'data-inbox-mark-read': '' }, 'Mark read');
  rowApproval.append(rowApprovalTitle, rowApprovalOpen, rowApprovalMark);

  const rowInfo = makeEl('li', { 'data-inbox-item': '', 'data-read': 'true', 'data-category': 'run' });
  const rowInfoTitle = makeEl('p', { 'data-inbox-title': '' }, 'Audit complete');
  const rowInfoMark = makeEl('button', { 'data-inbox-mark-read': '', disabled: true }, 'Read');
  rowInfo.append(rowInfoTitle, rowInfoMark);

  inboxList.append(rowApproval, rowInfo);
  inboxEmpty.append(inboxEmptyTitle, inboxEmptyCopy, inboxRestore);
  inboxPanel.append(inboxList, inboxEmpty);
  inboxHost.append(tabAll, tabUnread, tabApprovals, inboxCount, inboxMarkAll, inboxPanel, inboxReceipt, inboxRestoreInline);

  root.append(voiceHost, reqHost, planHost, inboxHost);
  finalize();

  const ctrl = initWorkspaceComponents(root);

  // Voice capture bar interactions
  voiceStop.click();
  assert.equal(voiceHost.getAttribute('data-voice-state'), 'review');
  assert.equal(panelReview.hidden, false);
  assert.equal(voiceSend.disabled, false);
  voiceInput.value = '   ';
  voiceInput.dispatch('input');
  assert.equal(voiceSend.disabled, true);
  voiceInput.value = 'Ship release checklist';
  voiceInput.dispatch('input');
  assert.equal(voiceSend.disabled, false);
  voiceSend.click();
  assert.equal(voiceHost.getAttribute('data-voice-state'), 'idle');
  assert.equal(voiceReceipt.textContent, 'Sent transcript: "Ship release checklist"');

  // Input request card interactions
  radio1.dispatch('keydown', { key: 'ArrowDown' });
  assert.equal(radio2.getAttribute('aria-checked'), 'true');
  assert.equal(radio2.focused, true);
  reqSubmit.click();
  assert.equal(reqHost.getAttribute('data-input-state'), 'answered');
  assert.equal(reqBody.hidden, true);
  assert.equal(reqReceipt.hidden, false);
  assert.equal(reqReceiptText.textContent, 'Answered · Keep nullable (Batch 500 rows)');
  assert.equal(reqStatusLabel.textContent, 'answered');
  reqReopen.click();
  assert.equal(reqHost.getAttribute('data-input-state'), 'pending');
  assert.equal(reqBody.hidden, false);
  assert.equal(reqStatusLabel.textContent, 'waiting_for_input');

  // Run plan checklist filtering
  assert.equal(planRatio.textContent, '1 / 2 steps done');
  planOpen.click();
  assert.equal(stepDone.hidden, true);
  assert.equal(stepBlocked.hidden, false);
  assert.equal(planRatio.textContent, '1 / 2 open steps');
  planAll.click();
  assert.equal(stepDone.hidden, false);

  // Notification inbox interactions
  assert.equal(inboxCount.textContent, '1 unread');
  tabUnread.click();
  assert.equal(rowApproval.hidden, false);
  assert.equal(rowInfo.hidden, true);
  rowApprovalMark.click();
  assert.equal(inboxCount.textContent, '0 unread');
  assert.equal(inboxEmpty.hidden, false);
  inboxRestore.click();
  assert.equal(inboxCount.textContent, '1 unread');
  assert.equal(rowApproval.hidden, false);
  tabApprovals.click();
  assert.equal(rowApproval.hidden, false);
  assert.equal(rowInfo.hidden, true);
  inboxMarkAll.click();
  assert.equal(inboxCount.textContent, '0 unread');
  assert.equal(inboxRestoreInline.hidden, false);

  // Destroy tears down listeners cleanly
  ctrl.destroy();
  planOpen.click();
  assert.equal(stepDone.hidden, false);
});
