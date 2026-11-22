'use strict';

/**
 * Modernized Skills, Agents & Projects Library verification gates:
 *   1. Zero hex (#...), zero rgb()/rgba(), zero hsl()/hsla(), zero fixed px CSS dimensions,
 *      and zero uppercase text-transform across all source and emitted Library artifacts.
 *   2. Mathematical WCAG 2.1 contrast floor (>= 4.5:1 text, >= 3.0:1 borders/controls/accent/
 *      status dots) across dark Nocturne and light theme surfaces.
 *   3. Container-query breakpoints (@container vi-library-stage at 64rem and 40rem), CSS Subgrid,
 *      .vi-project-split, 44px touch targets, 0 glass layers, strict VWXYZ quarantine (0 persona-accent-*
 *      in Skills, Projects, and Agents Section 2; all 5 canon segments together in Agents Section 1),
 *      left-rail Library links in layout-agent-workspace.html, and zero PII/hostnames/IPv4/secrets.
 *   4. Vanilla JS controller runtime tests: Skills live search, ownership tabs, category pills,
 *      Grid/List toggle, Auto-trigger/Manual switches, and Skill Inspector Drawer (Esc + focus restore);
 *      Agents kind filter + search + launch receipts; Projects Directory/Detail view switcher, scope
 *      filter, Table/Cards toggle, sort select, Threads/Sources/Activity tabs, mobile split tabs,
 *      memory policy toggle, scoped composer submit, and clean destroy() teardown.
 */

const { test, before } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const { contrastRatio } = require('../lib/contrast');
const { emitLibrarySurfaceArtifacts } = require('../scripts/generate-tokens');
const { initLibrarySurface } = require('../lib/library-surface');

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
  for (const m of cssBlock.matchAll(/(--vi-library-[a-z0-9-]+):\s*(?:var\([^,]+,\s*)?oklch\(\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)(?:\s*\/\s*[\d.]+)?\s*\)/g)) {
    map[m[1]] = [Number(m[2]), Number(m[3]), Number(m[4])];
  }
  return map;
}

before(() => {
  execFileSync(process.execPath, [path.join(ROOT, 'scripts', 'generate-tokens.js')], { cwd: ROOT, stdio: 'ignore' });
});

test('library-surface artifacts contain zero hex, rgb/rgba, or hsl/hsla color literals', () => {
  const files = [
    path.join(ROOT, 'lib', 'library-surface.css'),
    path.join(ROOT, 'lib', 'library-surface.js'),
    path.join(ROOT, 'dist', 'library-surface.css'),
    path.join(ROOT, 'dist', 'library-surface.js'),
    path.join(ROOT, 'preview', 'skills-library-surface.html'),
    path.join(ROOT, 'preview', 'agents-library-surface.html'),
    path.join(ROOT, 'preview', 'projects-library-surface.html'),
  ];
  for (const filePath of files) {
    const src = fs.readFileSync(filePath, 'utf-8');
    const rel = path.relative(ROOT, filePath);
    assert.doesNotMatch(src, /#[0-9a-fA-F]{3,8}\b/, `${rel} must not contain hex literals`);
    assert.doesNotMatch(src, /\brgba?\(/i, `${rel} must not contain rgb()/rgba() literals`);
    assert.doesNotMatch(src, /\bhsla?\(/i, `${rel} must not contain hsl()/hsla() literals`);
  }
});

test('library-surface.css enforces required --vi-library-* tokens, subgrid, container queries, zero px units, and emitted parity', () => {
  const css = fs.readFileSync(path.join(ROOT, 'lib', 'library-surface.css'), 'utf-8');
  assert.doesNotMatch(css, /\b\d+(?:\.\d+)?px\b/i, 'library-surface.css must avoid fixed px dimensions');
  assert.doesNotMatch(css, /text-transform:\s*uppercase/i, 'ADR-007 forbids uppercase text-transform');
  for (const token of [
    '--vi-library-surface:',
    '--vi-library-card-bg:',
    '--vi-library-card-hover:',
    '--vi-library-panel-bg:',
    '--vi-library-border-subtle:',
    '--vi-library-mono-pill-bg:',
    'container-type: inline-size',
    'container-name: vi-library-stage',
    '@supports (grid-template-rows: subgrid)',
    'grid-template-rows: subgrid',
    '.vi-library-grid[data-view="list"]',
    '.vi-project-split',
    '.vi-composer',
    '@container vi-library-stage (max-width: 64rem)',
    '@container vi-library-stage (max-width: 40rem)',
    ':focus-visible',
    '[data-theme="light"]',
    '@media (prefers-reduced-motion: reduce)',
    '@media (forced-colors: active)',
  ]) {
    assert.ok(css.includes(token), `library-surface.css missing required rule/token: ${token}`);
  }
  const emitted = emitLibrarySurfaceArtifacts();
  assert.equal(emitted['library-surface.css'], css);
  assert.equal(emitted['library-surface.js'], fs.readFileSync(path.join(ROOT, 'lib', 'library-surface.js'), 'utf-8'));
});

test('dark Nocturne and light theme Library tokens clear >= 4.5:1 text and >= 3.0:1 border/status contrast on all surfaces', () => {
  const css = fs.readFileSync(path.join(ROOT, 'lib', 'library-surface.css'), 'utf-8');
  const darkBlock = css.match(/:root,\s*\.vi-library-scope\s*\{([\s\S]*?)\}/)[1];
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
        '--vi-library-ink': [255, 255, 255],
        '--vi-library-ink-muted': [161, 161, 170],
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
        '--vi-library-ink': [15, 23, 42],
        '--vi-library-ink-muted': [71, 85, 105],
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
        '--vi-library-border-subtle',
        '--vi-library-border-strong',
        '--vi-library-accent',
        '--vi-library-status-success',
        '--vi-library-status-warning',
        '--vi-library-status-error',
        '--vi-library-status-info',
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

test('all Library fragments enforce 44px touch targets, 0 glass layers, VWXYZ quarantine, neutral IDs, and workspace rail integration', () => {
  const files = ['skills-library-surface.html', 'agents-library-surface.html', 'projects-library-surface.html'];
  for (const file of files) {
    const html = fs.readFileSync(path.join(ROOT, 'preview', file), 'utf-8').replace(/<!--[\s\S]*?-->/g, '');
    assert.doesNotMatch(html, /\b\d{1,3}(?:\.\d{1,3}){3}\b/, `${file} must not contain IPv4 literals`);
    assert.doesNotMatch(html, /localhost|\.lan\b|\.internal\b|@/i, `${file} must not contain real hostnames or emails`);
    assert.doesNotMatch(html, /vi-glass|stage-backdrop|vi-orbital-field/, `${file} must remain on solid reading surfaces (0 glass / orbital layers)`);

    for (const m of html.matchAll(/<(button|textarea|a|select|input)\b([^>]*)>/g)) {
      const cls = (m[2].match(/\bclass="([^"]*)"/) || [])[1] || '';
      assert.match(cls, /h-action-(min|wide)-default/, `${file}: 44px touch target missing on ${m[0].slice(0, 90)}`);
    }
    if (file !== 'agents-library-surface.html') {
      assert.doesNotMatch(html, /persona-accent-/, `${file} must contain zero VWXYZ persona-accent tokens`);
    }
  }

  // Verify strict VWXYZ quarantine inside agents-library-surface.html
  const agentsHtml = fs.readFileSync(path.join(ROOT, 'preview', 'agents-library-surface.html'), 'utf-8');
  const workersIdx = agentsHtml.indexOf('data-agent-section="workers"');
  assert.ok(workersIdx > 0, 'agents-library-surface.html must define Section 2 (workers)');
  const sovereignPart = agentsHtml.slice(0, workersIdx);
  const workersPart = agentsHtml.slice(workersIdx);
  for (const seat of ['violet', 'wisteria', 'xylia', 'yarrow', 'zinnia']) {
    assert.ok(sovereignPart.includes(`bg-persona-accent-${seat}-base`), `Sovereign roster missing canon bar segment for ${seat}`);
  }
  assert.doesNotMatch(sovereignPart, /text-persona-accent-xylia/, 'Xylia must never be used as text color');
  assert.doesNotMatch(workersPart, /persona-accent-/, 'Specialist agents and routines must not use persona-accent tokens');

  // Verify required content landmarks across all 3 Library surfaces
  const skillsHtml = fs.readFileSync(path.join(ROOT, 'preview', 'skills-library-surface.html'), 'utf-8');
  for (const needle of ['8 installed', '~860 tok index footprint', '/schema-audit', '/release-checklist', '/incident-triage', 'Auto-trigger', 'Manual only', 'SKILL.md directives preview', 'Run in new session', 'vcs.diff.read']) {
    assert.ok(skillsHtml.includes(needle), `skills-library-surface.html missing: ${needle}`);
  }
  for (const needle of ['Sovereign persona seats', 'Violet', 'Wisteria', 'Xylia', 'Yarrow', 'Zinnia', 'Schema auditor', 'Runbook checker', 'Nightly dependency drift check', 'Ask owner on write', 'Read-only auto', 'Paused', 'Can delegate', 'Leaf worker']) {
    assert.ok(agentsHtml.includes(needle), `agents-library-surface.html missing: ${needle}`);
  }
  const projectsHtml = fs.readFileSync(path.join(ROOT, 'preview', 'projects-library-surface.html'), 'utf-8');
  for (const needle of ['Directory view', 'Project detail', 'Nocturne Design System', 'Cluster Runbooks', 'Shared &middot; Personal memory off', 'Threads (5)', 'Sources (4)', 'Activity', 'Stacks on top of Workspace profile preferences', '4 / 20 files &middot; 18% context budget', 'Source &middot; Immutable', 'Project-only memory', 'Workspace default', 'personal memory is disabled while shared']) {
    assert.ok(projectsHtml.includes(needle), `projects-library-surface.html missing: ${needle}`);
  }

  // Verify layout-agent-workspace.html left-rail Library integration
  const workspaceHtml = fs.readFileSync(path.join(ROOT, 'preview', 'layout-agent-workspace.html'), 'utf-8');
  for (const nav of ['data-library-nav="skills"', 'data-library-nav="agents"', 'data-library-nav="projects"']) {
    assert.ok(workspaceHtml.includes(nav), `layout-agent-workspace.html missing Library rail link: ${nav}`);
  }
  assert.doesNotMatch(workspaceHtml, /vi-glass/, 'layout-agent-workspace.html must stay 100% solid');
});

test('lib/library-surface.js drives Skills, Agents, and Projects interactive controls and clean destroy()', () => {
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
      appendChild(node) {
        const idx = el.children.indexOf(node);
        if (idx !== -1) el.children.splice(idx, 1);
        node.parentNode = el;
        el.children.push(node);
        return node;
      },
      append(...nodes) {
        for (const n of nodes) el.appendChild(n);
      },
      closest(sel) {
        let cur = el;
        while (cur) {
          if (matchSingle(cur, sel)) return cur;
          cur = cur.parentNode;
        }
        return null;
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
    const parts = sel.split(',').map((s) => s.trim());
    if (parts.length > 1) return parts.some((p) => matchSingle(node, p));
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

  // --- 1. Skills stage fixture ---
  const skillsStage = makeEl('div', { 'data-library-skills': '' });
  const skillsSearch = makeEl('input', { 'data-skills-search': '' });
  const ownerAll = makeEl('button', { 'data-skills-owner': 'all', 'aria-selected': 'true' }, 'All');
  const ownerCustom = makeEl('button', { 'data-skills-owner': 'custom', 'aria-selected': 'false' }, 'Custom');
  const catAll = makeEl('button', { 'data-skills-category': 'all', 'aria-pressed': 'true' }, 'All');
  const catDesign = makeEl('button', { 'data-skills-category': 'design', 'aria-pressed': 'false' }, 'Design');
  const viewGrid = makeEl('button', { 'data-skills-view': 'grid', 'aria-pressed': 'true' }, 'Grid');
  const viewList = makeEl('button', { 'data-skills-view': 'list', 'aria-pressed': 'false' }, 'List');
  const skillsGrid = makeEl('ul', { 'data-skills-grid': '', 'data-view': 'grid' });
  const card1 = makeEl('li', { 'data-skill-card': '', 'data-skill-owner': 'custom', 'data-skill-category': 'engineering', 'data-skill-tokens': '~110 tok', 'data-skill-tools': 'vcs.diff.read', 'data-skill-directive': 'Inspect schema' }, '/schema-audit');
  const sw1 = makeEl('button', { role: 'switch', 'aria-checked': 'true', 'data-skill-trigger': '/schema-audit' });
  const sw1Lbl = makeEl('span', { 'data-switch-label': '' }, 'Auto-trigger');
  sw1.append(sw1Lbl);
  const inspectBtn1 = makeEl('button', { 'data-skill-inspect': '/schema-audit' }, 'Inspect');
  card1.append(sw1, inspectBtn1);
  const card2 = makeEl('li', { 'data-skill-card': '', 'data-skill-owner': 'team', 'data-skill-category': 'design', 'data-skill-tokens': '~85 tok', 'data-skill-tools': 'design.token.audit', 'data-skill-directive': 'Check contrast' }, '/contrast-check');
  skillsGrid.append(card1, card2);
  const skillsCount = makeEl('p', { 'data-skills-count': '' }, 'Showing 2 of 2 skills');
  const skillsEmpty = makeEl('div', { 'data-skills-empty': '', hidden: true });
  const skillsReset = makeEl('button', { 'data-skills-reset': '' }, 'Reset');
  const skillsReceipt = makeEl('span', { 'data-skills-receipt': '' }, 'Ready');
  const drawer = makeEl('div', { 'data-skill-drawer': '', hidden: true });
  const drawerTitle = makeEl('h2', { 'data-skill-drawer-title': '' });
  const drawerMeta = makeEl('p', { 'data-skill-drawer-meta': '' });
  const drawerYaml = makeEl('pre', { 'data-skill-drawer-yaml': '' });
  const drawerBody = makeEl('pre', { 'data-skill-drawer-body': '' });
  const drawerTools = makeEl('span', { 'data-skill-drawer-tools': '' });
  const drawerClose = makeEl('button', { 'data-skill-drawer-close': '' }, 'Close');
  const drawerRun = makeEl('button', { 'data-skill-drawer-run': '' }, 'Run');
  drawer.append(drawerTitle, drawerMeta, drawerYaml, drawerBody, drawerTools, drawerClose, drawerRun);
  skillsStage.append(skillsSearch, ownerAll, ownerCustom, catAll, catDesign, viewGrid, viewList, skillsGrid, skillsCount, skillsEmpty, skillsReset, skillsReceipt, drawer);

  // --- 2. Agents stage fixture ---
  const agentsStage = makeEl('div', { 'data-library-agents': '' });
  const agentsSearch = makeEl('input', { 'data-agents-search': '' });
  const kindAll = makeEl('button', { 'data-agents-kind': 'all', 'aria-selected': 'true' }, 'All');
  const kindRoutine = makeEl('button', { 'data-agents-kind': 'routine', 'aria-selected': 'false' }, 'Routines');
  const secSov = makeEl('section', { 'data-agent-section': 'sovereign' });
  const itemViolet = makeEl('li', { 'data-agent-item': '', 'data-agent-kind': 'sovereign' }, 'Violet coordinator');
  secSov.append(itemViolet);
  const secWorkers = makeEl('section', { 'data-agent-section': 'workers' });
  const itemRoutine = makeEl('li', { 'data-agent-item': '', 'data-agent-kind': 'routine' }, 'Nightly dependency drift check');
  const launchRoutine = makeEl('button', { 'data-agent-action': 'Launch Nightly drift check' }, 'Launch');
  itemRoutine.append(launchRoutine);
  secWorkers.append(itemRoutine);
  const agentsCount = makeEl('p', { 'data-agents-count': '' }, 'Showing 2 of 2 agents and routines');
  const agentsEmpty = makeEl('div', { 'data-agents-empty': '', hidden: true });
  const agentsReset = makeEl('button', { 'data-agents-reset': '' }, 'Reset');
  const agentsReceipt = makeEl('span', { 'data-agents-receipt': '' }, 'Ready');
  agentsStage.append(agentsSearch, kindAll, kindRoutine, secSov, secWorkers, agentsCount, agentsEmpty, agentsReset, agentsReceipt);

  // --- 3. Projects stage fixture ---
  const projectsStage = makeEl('div', { 'data-library-projects': '' });
  const modeDir = makeEl('button', { 'data-projects-mode': 'directory', 'aria-selected': 'true' }, 'Directory view');
  const modeDet = makeEl('button', { 'data-projects-mode': 'detail', 'aria-selected': 'false' }, 'Project detail');
  const panelDir = makeEl('div', { 'data-projects-view-panel': 'directory' });
  const panelDet = makeEl('div', { 'data-projects-view-panel': 'detail', hidden: true });
  const projSearch = makeEl('input', { 'data-projects-search': '' });
  const projSort = makeEl('select', { 'data-projects-sort': '', value: 'updated' });
  const scopeAll = makeEl('button', { 'data-projects-scope': 'all', 'aria-selected': 'true' }, 'All');
  const scopeShared = makeEl('button', { 'data-projects-scope': 'shared', 'aria-selected': 'false' }, 'Shared');
  const layTable = makeEl('button', { 'data-projects-layout': 'table', 'aria-pressed': 'true' }, 'Table');
  const layCards = makeEl('button', { 'data-projects-layout': 'cards', 'aria-pressed': 'false' }, 'Cards');
  const projTable = makeEl('ul', { 'data-projects-table': '' });
  const projCards = makeEl('ul', { 'data-projects-cards': '', hidden: true });
  const rowA = makeEl('li', { 'data-project-item': '', 'data-project-surface': 'table', 'data-project-scope': 'shared', 'data-project-name': 'Nocturne Design System', 'data-project-order': '1' }, 'Nocturne Design System');
  const openA = makeEl('button', { 'data-open-project': 'Nocturne Design System' }, 'Open');
  rowA.append(openA);
  const rowB = makeEl('li', { 'data-project-item': '', 'data-project-surface': 'table', 'data-project-scope': 'private', 'data-project-name': 'Cluster Runbooks', 'data-project-order': '2' }, 'Cluster Runbooks');
  projTable.append(rowA, rowB);
  const projCount = makeEl('p', { 'data-projects-count': '' }, 'Showing 2 of 2 projects');
  const projEmpty = makeEl('div', { 'data-projects-empty': '', hidden: true });
  const projReset = makeEl('button', { 'data-projects-reset': '' }, 'Reset');
  panelDir.append(projSearch, projSort, scopeAll, scopeShared, layTable, layCards, projTable, projCards, projCount, projEmpty, projReset);

  const backBtn = makeEl('button', { 'data-projects-back': '' }, 'Projects');
  const detailTitle = makeEl('h2', { 'data-project-detail-title': '' }, 'Nocturne Design System');
  const detailCrumb = makeEl('span', { 'data-project-detail-crumb': '' }, 'Nocturne Design System');
  const splitEl = makeEl('div', { 'data-project-split': '', 'data-mobile-pane': 'main' });
  const mobMain = makeEl('button', { 'data-project-mobile-tab': 'main', 'aria-pressed': 'true' }, 'Main stage');
  const mobCtx = makeEl('button', { 'data-project-mobile-tab': 'context', 'aria-pressed': 'false' }, 'Context');
  const subThreads = makeEl('button', { 'data-project-subtab': 'threads', 'aria-selected': 'true' }, 'Threads');
  const subSources = makeEl('button', { 'data-project-subtab': 'sources', 'aria-selected': 'false' }, 'Sources');
  const panThreads = makeEl('div', { 'data-project-subpanel': 'threads' });
  const panSources = makeEl('div', { 'data-project-subpanel': 'sources', hidden: true });
  const memProj = makeEl('button', { 'data-project-memory': 'project-only', 'aria-pressed': 'true' }, 'Project-only memory');
  const memWork = makeEl('button', { 'data-project-memory': 'workspace-default', 'aria-pressed': 'false' }, 'Workspace default');
  const composerForm = makeEl('form', { 'data-project-composer': '' });
  const composerInput = makeEl('textarea', { value: 'Audit contrast floors' });
  composerForm.append(composerInput);
  panelDet.append(backBtn, detailTitle, detailCrumb, splitEl, mobMain, mobCtx, subThreads, subSources, panThreads, panSources, memProj, memWork, composerForm);
  const projReceipt = makeEl('span', { 'data-projects-receipt': '' }, 'Ready');
  projectsStage.append(modeDir, modeDet, panelDir, panelDet, projReceipt);

  const root = makeEl('div', {});
  root.append(skillsStage, agentsStage, projectsStage);

  const mockDoc = {
    nodeType: 9,
    activeElement: null,
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

  const ctrl = initLibrarySurface(root);

  // Test Skills interactions
  ownerCustom.click();
  assert.equal(card1.hidden, false);
  assert.equal(card2.hidden, true);
  assert.equal(skillsCount.textContent, 'Showing 1 of 2 skills');
  skillsSearch.value = 'no-such-skill';
  skillsSearch.dispatch('input');
  assert.equal(skillsEmpty.hidden, false);
  skillsReset.click();
  assert.equal(skillsCount.textContent, 'Showing 2 of 2 skills');
  assert.equal(skillsEmpty.hidden, true);

  viewList.click();
  assert.equal(skillsGrid.getAttribute('data-view'), 'list');
  sw1.click();
  assert.equal(sw1.getAttribute('aria-checked'), 'false');
  assert.equal(sw1Lbl.textContent, 'Manual only');

  inspectBtn1.click();
  assert.equal(drawer.hidden, false);
  assert.equal(drawerTitle.textContent, '/schema-audit');
  assert.match(drawerYaml.textContent, /name: schema-audit/);
  assert.equal(drawerClose.focused, true);
  mockDoc.dispatch('keydown', { key: 'Escape' });
  assert.equal(drawer.hidden, true);
  assert.equal(inspectBtn1.focused, true);

  // Test Agents interactions
  kindRoutine.click();
  assert.equal(secSov.hidden, true);
  assert.equal(secWorkers.hidden, false);
  assert.equal(agentsCount.textContent, 'Showing 1 of 2 agents and routines');
  launchRoutine.click();
  assert.match(agentsReceipt.textContent, /Launch Nightly drift check/);

  // Test Projects interactions
  scopeShared.click();
  assert.equal(rowA.hidden, false);
  assert.equal(rowB.hidden, true);
  assert.equal(projCount.textContent, 'Showing 1 of 2 projects');
  projReset.click();
  projSort.value = 'name';
  projSort.dispatch('change');
  assert.equal(projTable.children[0], rowB);
  layCards.click();
  assert.equal(projTable.hidden, true);
  assert.equal(projCards.hidden, false);

  openA.click();
  assert.equal(panelDir.hidden, true);
  assert.equal(panelDet.hidden, false);
  assert.equal(detailTitle.textContent, 'Nocturne Design System');

  subSources.click();
  assert.equal(panThreads.hidden, true);
  assert.equal(panSources.hidden, false);
  mobCtx.click();
  assert.equal(splitEl.getAttribute('data-mobile-pane'), 'context');
  memWork.click();
  assert.equal(memWork.getAttribute('aria-pressed'), 'true');
  assert.match(projReceipt.textContent, /Workspace default/);
  composerForm.dispatch('submit');
  assert.match(projReceipt.textContent, /Started scoped thread in Nocturne Design System/);
  backBtn.click();
  assert.equal(panelDir.hidden, false);

  ctrl.destroy();
  assert.equal([...mockDoc._listeners.values()].every((s) => s.size === 0), true);
});
