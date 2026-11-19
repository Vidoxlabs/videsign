/**
 * Memory field primitive contract (ADR-018): the four graph link tokens, lib/memory-field.js
 * (layout, SVG, text equivalent, contrast report, pipeline) and lib/memory-field.css (states and
 * the four motions).
 */

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const { parseFrontMatter } = require('../scripts/generate-tokens');
const { contrastRatio } = require('../lib/contrast');
const { deltaE00Hex } = require('../scripts/lib/ciede2000');

const ROOT = path.join(__dirname, '..');
const TOKENS = parseFrontMatter(fs.readFileSync(path.join(ROOT, 'DESIGN.md'), 'utf-8'));
const C = TOKENS.colors;

const LINKS = ['cluster', 'reasoned', 'linked', 'tree'];
const DARK = ['surface-background-primary-base', 'surface-background-secondary-base', 'surface-background-tertiary-base'];
const LIGHT = ['surface-background-primary-light', 'surface-background-secondary-light', 'surface-background-tertiary-light'];
const RESERVED = Object.keys(C).filter(
  (key) => key.startsWith('persona-accent-') || key.startsWith('status-indicator-') || key.startsWith('border-graph-line-'),
);

// --- Tokens (ADR-018 item 1) ---------------------------------------------------

test('each link token carries meaning at 3:1 or better on every surface of its theme', () => {
  for (const link of LINKS) {
    for (const [state, surfaces] of [['base', DARK], ['light', LIGHT]]) {
      const value = C[`border-graph-${link}-${state}`];
      assert.ok(value, `border-graph-${link}-${state} is defined`);
      for (const surface of surfaces) {
        const ratio = contrastRatio(value, C[surface]);
        assert.ok(ratio >= 3, `${link}-${state} on ${surface} is ${ratio.toFixed(2)}:1`);
      }
    }
  }
});

test('link tokens stay clear of persona, status and graph-line colours and of each other', () => {
  for (const state of ['base', 'light']) {
    const values = LINKS.map((link) => C[`border-graph-${link}-${state}`]);
    for (const value of values) {
      for (const key of RESERVED) {
        const delta = deltaE00Hex(value, C[key]);
        assert.ok(delta >= 15, `${value} is ${delta.toFixed(1)} from ${key}`);
      }
    }
    for (let i = 0; i < values.length; i += 1) {
      for (let j = i + 1; j < values.length; j += 1) {
        const delta = deltaE00Hex(values[i], values[j]);
        assert.ok(delta >= 20, `${LINKS[i]} and ${LINKS[j]} (${state}) are ${delta.toFixed(1)} apart`);
      }
    }
  }
});

// --- Fixture -------------------------------------------------------------------

const mf = require('../lib/memory-field');

function fixture(nodeCount = 24) {
  const classes = mf.NODE_CLASSES;
  const groups = ['crs', 'vidocs', 'personal'];
  const nodes = Array.from({ length: nodeCount }, (_, i) => ({
    id: `n${i}`,
    label: `memory ${i}`,
    class: classes[i % classes.length],
    group: groups[i % groups.length],
    recallCount: (i * 7) % 40,
    lastRecalledAt: `2026-11-${String(1 + (i % 18)).padStart(2, '0')}T00:00:00Z`,
  }));
  const codes = Object.keys(mf.LINK_CODES);
  const edges = [];
  for (let i = 1; i < nodeCount; i += 1) {
    edges.push({ source: `n${i}`, target: `n${(i * 5) % i}`, code: codes[i % codes.length], count: 1 + (i % 6) });
  }
  return { nodes, edges, synthetic: true };
}
const NOW = '2026-11-18T00:00:00Z';

// --- Layout (ADR-018 item 5) -----------------------------------------------------

test('the layout is deterministic for the same data and seed and changes with the seed', () => {
  const a = mf.layoutMemoryField(fixture(), { seed: 7, now: NOW });
  const b = mf.layoutMemoryField(fixture(), { seed: 7, now: NOW });
  const c = mf.layoutMemoryField(fixture(), { seed: 8, now: NOW });
  assert.deepEqual(a, b);
  assert.notDeepEqual(a.nodes.map((n) => [n.x, n.y]), c.nodes.map((n) => [n.x, n.y]));
});

test('every node sits inside the view and every coordinate is rounded to 0.1', () => {
  const layout = mf.layoutMemoryField(fixture(60), { seed: 3, width: 800, height: 500, now: NOW });
  for (const node of layout.nodes) {
    assert.ok(node.x - node.r >= 0 && node.x + node.r <= 800, `${node.id} x ${node.x}`);
    assert.ok(node.y - node.r >= 0 && node.y + node.r <= 500, `${node.id} y ${node.y}`);
    assert.equal(Math.round(node.x * 10) / 10, node.x);
    assert.ok(mf.NODE_RADII.includes(node.r));
    assert.ok(mf.RECENCY_BANDS.includes(node.band));
  }
});

test('mass and recency come from recall count and the supplied clock, never a real clock', () => {
  const data = {
    nodes: [
      { id: 'a', label: 'a', class: 'organizational', recallCount: 0, lastRecalledAt: '2026-11-17T00:00:00Z' },
      { id: 'b', label: 'b', class: 'personal', recallCount: 6, lastRecalledAt: '2026-10-01T00:00:00Z' },
      { id: 'c', label: 'c', class: 'unconfirmed', recallCount: 40, lastRecalledAt: '2025-01-01T00:00:00Z' },
    ],
    edges: [],
  };
  const layout = mf.layoutMemoryField(data, { now: NOW });
  assert.deepEqual(layout.nodes.map((n) => n.r), mf.NODE_RADII);
  assert.deepEqual(layout.nodes.map((n) => n.band), ['fresh', 'warm', 'cold']);
  const timeless = mf.layoutMemoryField(data);
  assert.ok(timeless.nodes.every((n) => n.band === 'fresh'));
});

test('invalid input and over-budget input are refused with typed errors', () => {
  const bad = (data, code) => assert.throws(() => mf.layoutMemoryField(data), (err) => err.code === code);
  bad({ nodes: [{ id: 'a', label: 'a', class: 'organizational' }], edges: [{ source: 'a', target: 'z', code: 'CR' }] }, 'MEMORY_FIELD_INVALID');
  bad({ nodes: [{ id: 'a', label: 'a', class: 'gossip' }], edges: [] }, 'MEMORY_FIELD_INVALID');
  bad({ nodes: [{ id: 'a', label: 'a', class: 'organizational' }, { id: 'b', label: 'b', class: 'organizational' }], edges: [{ source: 'a', target: 'b', code: 'XX' }] }, 'MEMORY_FIELD_INVALID');
  bad({ nodes: [{ id: 'a', label: 'a', class: 'organizational' }, { id: 'a', label: 'a', class: 'organizational' }], edges: [] }, 'MEMORY_FIELD_INVALID');
  bad(fixture(mf.BUDGET.nodes + 1), 'MEMORY_FIELD_OVER_BUDGET');
});

// --- SVG, text equivalent, contrast (ADR-018 items 2, 3, 8) ----------------------

test('the SVG is a labelled group with a hidden rest web and no inline style', () => {
  const svg = mf.renderMemoryFieldSvg(mf.layoutMemoryField(fixture(), { now: NOW }), { title: 'Memory field', desc: 'Fixture' });
  assert.match(svg, /^<svg[^>]+role="group"[^>]+aria-labelledby="[^"]+"/);
  assert.match(svg, /<title id="[^"]+">Memory field<\/title>/);
  assert.match(svg, /<g class="vi-mf-rest" aria-hidden="true">/);
  assert.doesNotMatch(svg, /\sstyle=/);
  assert.doesNotMatch(svg, /#[0-9A-Fa-f]{6}\b/, 'colour comes from the stylesheet');
  assert.equal((svg.match(/class="vi-mf-node"/g) || []).length, 24);
  assert.match(svg, /data-memory="unconfirmed"/);
  assert.match(svg, /data-band="(fresh|warm|cold)"/);
  assert.match(svg, /Synthetic data/, 'a fixture field says so');
});

test('lit links carry their code, a second cue and an accessible name', () => {
  const layout = mf.layoutMemoryField(fixture(), { now: NOW });
  const svg = mf.renderMemoryFieldSvg(layout);
  for (const [code, meta] of Object.entries(mf.LINK_CODES)) {
    assert.match(svg, new RegExp(`class="vi-mf-link" data-code="${code}"`));
    assert.ok(svg.includes(`<title>${meta.label}:`), `${code} edges are named`);
  }
  assert.match(svg, /marker-end="url\(#[^)]+-arrow\)"/, 'TR carries an arrowhead');
  assert.match(svg, /data-weight="[123]"/);
});

test('a focus set lights its edges and dims the rest; recall and forget orient edges from their node', () => {
  const layout = mf.layoutMemoryField(fixture(), { now: NOW });
  const focused = mf.renderMemoryFieldSvg(layout, { focus: { nodes: ['n1', 'n0'] } });
  assert.match(focused, /data-mode="focus"/);
  assert.match(focused, /data-id="n1"[^>]*data-state="lit"/);
  assert.match(focused, /data-id="n7"[^>]*data-state="dim"/);
  const recall = mf.renderMemoryFieldSvg(layout, { recall: { from: 'n0', hits: ['n1', 'n2'] } });
  assert.match(recall, /data-mode="recall"/);
  assert.match(recall, /class="vi-mf-pulse-track"/);
  const forget = mf.renderMemoryFieldSvg(layout, { forget: 'n0' });
  assert.match(forget, /data-mode="forget"/);
  assert.match(forget, /data-id="n0"[^>]*data-state="forgetting"/);
  assert.match(forget, /data-forgetting="true"/);
  // Forget hides only the forgotten node's rest edges; the rest of the web stays.
  const field = mf.layoutMemoryField(mf.sampleMemoryField({ nodes: 30, edges: 60 }), { iterations: 20 });
  const target = field.edges[0].source;
  const restEdges = [...mf.renderMemoryFieldSvg(field, { forget: target }).matchAll(/<path class="vi-mf-rest-edge"[^>]*>/g)].map((m) => m[0]);
  const touching = field.edges.filter((edge) => edge.source === target || edge.target === target).length;
  assert.equal(restEdges.filter((tag) => tag.includes('data-forgetting="true"')).length, touching);
  assert.ok(restEdges.length > touching);
  assert.throws(() => mf.renderMemoryFieldSvg(layout, { forget: 'nope' }), (err) => err.code === 'MEMORY_FIELD_INVALID');
});

test('the text equivalent lists every node with its links grouped by code label', () => {
  const layout = mf.layoutMemoryField(fixture(), { now: NOW });
  const table = mf.renderMemoryFieldTable(layout);
  assert.match(table, /^<ul class="vi-mf-table"/);
  assert.equal((table.match(/<li class="vi-mf-table-node"/g) || []).length, 24);
  assert.ok(table.includes('CR cluster'));
  assert.ok(table.includes('memory 1'));
  assert.doesNotMatch(table, /<script/);
  const escaped = mf.renderMemoryFieldTable(mf.layoutMemoryField({ nodes: [{ id: 'x', label: '<b>&', class: 'personal' }], edges: [] }));
  assert.ok(escaped.includes('&lt;b&gt;&amp;'));
});

test('the contrast report passes both themes and fails a hairline swap', () => {
  for (const theme of ['base', 'light']) {
    const report = mf.memoryFieldContrastReport(TOKENS, { theme });
    assert.equal(report.pass, true, `${theme} passes`);
    assert.ok(report.minContrast >= 3);
    assert.deepEqual(Object.keys(report.links), Object.keys(mf.LINK_CODES));
  }
  const swapped = { ...TOKENS, colors: { ...C, 'border-graph-linked-base': C['border-separator-primary-base'] } };
  assert.equal(mf.memoryFieldContrastReport(swapped).pass, false);
});

// --- Pipeline (ADR-018 item 7) ----------------------------------------------------

test('the pipeline figure draws stores, steps, groups and labelled flows deterministically', () => {
  const a = mf.renderMemoryPipelineSvg(mf.SAMPLE_PIPELINE, { title: 'Memory pipeline' });
  assert.equal(a, mf.renderMemoryPipelineSvg(mf.SAMPLE_PIPELINE, { title: 'Memory pipeline' }));
  assert.match(a, /role="group"/);
  assert.match(a, /class="vi-mp-store"/);
  assert.match(a, /class="vi-mp-step"/);
  assert.match(a, /class="vi-mp-group"/);
  const flows = (a.match(/class="vi-mp-flow"/g) || []).length;
  assert.equal(flows, mf.SAMPLE_PIPELINE.flows.length);
  assert.equal((a.match(/class="vi-mp-flow-label"/g) || []).length, flows);
  assert.equal((a.match(/class="vi-mp-pulse-track"/g) || []).length, flows);
  assert.doesNotMatch(a, /\sstyle=/);
  const broken = { ...mf.SAMPLE_PIPELINE, flows: [{ from: 'nowhere', to: mf.SAMPLE_PIPELINE.stages[0].id, label: 'x' }] };
  assert.throws(() => mf.renderMemoryPipelineSvg(broken), (err) => err.code === 'MEMORY_FIELD_INVALID');
});

// --- Stylesheet and motion (ADR-018 items 1, 2 and 6) --------------------------------

const CSS = fs.readFileSync(path.join(ROOT, 'lib', 'memory-field.css'), 'utf-8');

test('every keyframe animates transform and opacity only', () => {
  const frames = [...CSS.matchAll(/@keyframes\s+([\w-]+)\s*\{([\s\S]*?)\n\}/g)];
  assert.ok(frames.length >= 6, 'draw, travel, pulse, dim, retract, vanish, drift and flow keyframes exist');
  for (const [, name, body] of frames) {
    const props = [...body.matchAll(/([a-z-]+)\s*:/g)].map((m) => m[1]);
    for (const prop of props) assert.ok(['transform', 'opacity'].includes(prop), `${name} animates ${prop}`);
  }
});

test('each link code is painted from its own base token and carries its second cue', () => {
  for (const [code, meta] of Object.entries(mf.LINK_CODES)) {
    assert.match(CSS, new RegExp(`\\[data-code="${code}"\\][^{]*\\{[^}]*var\\(--vi-colors-${meta.token}-base\\)`));
  }
  assert.match(CSS, /\[data-code="RR"\][^{]*\{[^}]*stroke-dasharray/);
  assert.match(CSS, /\[data-code="LR"\][^{]*\{[^}]*stroke-linecap:\s*round/);
  assert.doesNotMatch(CSS, /#[0-9A-Fa-f]{3,8}\b/, 'no colour literal');
  assert.doesNotMatch(CSS, /\d+ms|\d+s\b/, 'durations come from tokens');
});

test('motion stops under reduced motion and under the pause control, and loops are opt-in', () => {
  assert.match(CSS, /@media \(prefers-reduced-motion: reduce\)\s*\{[\s\S]*animation: none/);
  assert.match(CSS, /:root\[data-motion="paused"\][^{]*\.vi-mf[\s\S]*?animation: none/);
  assert.match(CSS, /\[data-ambient="on"\][^{]*\.vi-mf-rest/);
  assert.match(CSS, /\[data-flow="on"\][^{]*\.vi-mp-pulse-track/);
  assert.match(CSS, /var\(--vi-transition-transition-duration-ambient-drift-base\)/);
  assert.match(CSS, /var\(--vi-transition-transition-duration-ambient-pulse-base\)/);
  assert.match(CSS, /var\(--vi-transition-transition-duration-entrance-base\)/);
});

// --- Distribution (ADR-018 consequences) ---------------------------------------------

const { memoryFieldFragment, memoryPipelineFragment } = require('../scripts/generate-memory-field-fragment');
const { emitMemoryFieldArtifacts } = require('../scripts/generate-tokens');
const { generateStandardArtifacts } = require('../scripts/generate-standard');

test('the committed catalog fragments match the renderer', () => {
  const field = fs.readFileSync(path.join(ROOT, 'preview', 'memory-field.html'), 'utf-8');
  const pipeline = fs.readFileSync(path.join(ROOT, 'preview', 'memory-pipeline.html'), 'utf-8');
  assert.equal(field, memoryFieldFragment(), 'preview/memory-field.html drifted; run `npm run memory-field:fragment`');
  assert.equal(pipeline, memoryPipelineFragment(), 'preview/memory-pipeline.html drifted; run `npm run memory-field:fragment`');
  const index = fs.readFileSync(path.join(ROOT, 'preview', 'index.html'), 'utf-8');
  assert.match(index, /memory-field\.html/);
  assert.match(index, /memory-pipeline\.html/);
  assert.match(index, /dist\/memory-field\.css/);
});

test('npm run tokens ships the stylesheet and both samples', () => {
  const out = emitMemoryFieldArtifacts();
  assert.equal(out['memory-field.css'], CSS);
  assert.match(out['memory-field-sample.svg'], /^<svg class="vi-mf"/);
  assert.match(out['memory-pipeline-sample.svg'], /^<svg class="vi-mp"/);
});

test('the standard carries the memory field rules and they match the tokens and the primitive', () => {
  const { standard } = generateStandardArtifacts(TOKENS);
  const rules = standard.rules.memoryField;
  assert.equal(rules.adr, 'ADR-018');
  for (const [code, meta] of Object.entries(mf.LINK_CODES)) {
    assert.equal(rules.links[code].dark, C[`${meta.token}-base`]);
    assert.equal(rules.links[code].light, C[`${meta.token}-light`]);
  }
  assert.deepEqual(rules.budget, { ...mf.BUDGET });
  assert.ok(standard.adrs.some((adr) => adr.id === 'ADR-018'));
  const prose = fs.readFileSync(path.join(ROOT, 'DESIGN.md'), 'utf-8').toLowerCase();
  for (const phrase of ['memory field (adr-018)', 'aria-hidden', 'renderMemoryFieldTable'.toLowerCase(), '300 nodes and 3,000 edges']) {
    assert.ok(prose.includes(phrase), `DESIGN.md states: ${phrase}`);
  }
});

// --- Accessible views (ADR-019 item 7) -----------------------------------------------------

test('a summary render is one named image whose description says what the picture shows', () => {
  const layout = mf.layoutMemoryField(mf.sampleMemoryField({ nodes: 20, edges: 40 }), { seed: 3 });
  const from = layout.nodes[0].id;
  const hits = layout.edges.filter((edge) => edge.source === from).map((edge) => edge.target);
  const svg = mf.renderMemoryFieldSvg(layout, { id: 'sum', title: 'Recall', recall: { from, hits }, summary: true });
  assert.match(svg, /^<svg[^>]+role="img"[^>]+aria-labelledby="sum-title sum-desc"/);
  const desc = svg.match(/<desc id="sum-desc">([^<]+)<\/desc>/)[1];
  assert.match(desc, /^Synthetic data\. 20 memories and 40 links \(/);
  assert.match(desc, new RegExp(`A recall from ${layout.nodes[0].label} reaches`));
  assert.doesNotMatch(svg, /role="list"|role="listitem"|tabindex=/);
  assert.equal(mf.describeMemoryField(layout, { recall: { from, hits } }), desc.replace('Synthetic data. ', ''));
  const linked = { ...layout, nodes: layout.nodes.map((node, i) => (i === 0 ? { ...node, href: '/x' } : node)) };
  assert.throws(() => mf.renderMemoryFieldSvg(linked, { summary: true }), /interactive render/);
});

test('the interactive render gives every named group a role, so its name is exposed', () => {
  const layout = mf.layoutMemoryField(mf.sampleMemoryField({ nodes: 12, edges: 20 }), { seed: 2 });
  const svg = mf.renderMemoryFieldSvg(layout);
  assert.doesNotMatch(svg, /<g(?![^>]*\brole=)[^>]*\baria-label=/);
  assert.match(svg, /<g class="vi-mf-link"[^>]+role="img" aria-label="[A-Z]{2} [a-z]+: /);
});

test('the sheet honours more-contrast and forced-colours preferences', () => {
  assert.match(CSS, /@media \(prefers-contrast: more\) \{[\s\S]*?\.vi-mf-node\[data-band\] \.vi-mf-node-mark/);
  const forced = CSS.slice(CSS.indexOf('@media (forced-colors: active)'));
  for (const name of ['.vi-mf-link-line', '.vi-mp-flow-line', '.vi-mf-node-mark']) assert.ok(forced.includes(name), name);
  assert.match(forced, /stroke: CanvasText;/);
  assert.match(forced, /stroke: Highlight;/);
});
