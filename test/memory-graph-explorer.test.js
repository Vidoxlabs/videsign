'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const { AA_NON_TEXT, AA_TEXT, contrastRatio } = require('../lib/contrast');
const { LINK_CODES } = require('../lib/memory-field');
const { buildExplorerFixture } = require('../lib/memory-graph-explorer');
const { queryScene, containsPoint } = require('../lib/memory-graph-explorer-client');
const { parseFrontMatter } = require('../scripts/generate-tokens');

const root = path.join(__dirname, '..');

test('explorer fixture settles three distinct, bounded layouts for the same nodes', () => {
  const graph = buildExplorerFixture();
  assert.deepEqual(graph, buildExplorerFixture());
  assert.equal(graph.synthetic, true);
  assert.deepEqual(graph.links, LINK_CODES);
  const ids = graph.nodes.map(({ id }) => id).sort();

  for (const points of Object.values(graph.layouts)) {
    assert.deepEqual(points.map(({ id }) => id).sort(), ids);
    assert.equal(new Set(points.map(({ x, y }) => [x, y].join(','))).size, ids.length);
    for (const { x, y } of points) assert.ok([x, y].every((value) => value >= 0 && value <= 1));
  }
  assert.notDeepEqual(graph.layouts.force, graph.layouts.radial);
  assert.notDeepEqual(graph.layouts.force, graph.layouts.hierarchical);
  assert.equal(new Set(Object.values(graph.kinds).map(({ shape }) => shape)).size, 3);
  assert.ok(graph.nodes.some(({ inScene }) => inScene) && graph.nodes.some(({ inScene }) => !inScene));
});

test('structured scene queries compose filters and fail with a typed error', () => {
  const graph = buildExplorerFixture();
  assert.deepEqual(queryScene('Category: Memory with link: CR', graph), ['layout', 'controls', 'retrieval', 'reading', 'review', 'summary']);
  assert.deepEqual(queryScene('category: "Source record" epoch: "2026 Q2"', graph), ['index', 'receipt']);
  assert.deepEqual(queryScene('"evidence trail"', graph), ['evidence']);
  assert.deepEqual(queryScene('missing fixture entry', graph), []);
  for (const query of ['link: BAD', 'category:', 'epoch: "2026 Q4"', 'unknown: x', '"missing quote']) {
    assert.throws(() => queryScene(query, graph), { code: 'GRAPH_QUERY_INVALID' });
  }
});

test('freeform and box selection hit only points inside the gesture', () => {
  const vertices = [{ x: 0, y: 0 }, { x: 4, y: 0 }, { x: 2, y: 2 }, { x: 4, y: 4 }, { x: 0, y: 4 }];
  assert.equal(containsPoint(vertices, 1, 2), true);
  assert.equal(containsPoint(vertices, 3, 2), false);
  assert.equal(containsPoint(vertices, 1, 5), false);
});

test('explorer tokens clear the contrast floors on both solid surfaces in each theme', () => {
  const { colors } = parseFrontMatter(fs.readFileSync(path.join(root, 'DESIGN.md'), 'utf8'));
  const lines = ['border-graph-explorer', 'border-chat-focus',
    'border-entity-concept', 'border-entity-memory', 'border-entity-source',
    ...Object.values(LINK_CODES).map(({ token }) => token)];
  for (const theme of ['base', 'light']) {
    for (const surface of ['surface-graph-canvas', 'surface-graph-inspector']) {
      const background = colors[surface + '-' + theme];
      for (const role of lines) {
        assert.ok(contrastRatio(colors[role + '-' + theme], background) >= AA_NON_TEXT, role);
      }
      for (const role of ['text-content-primary', 'text-content-secondary']) {
        assert.ok(contrastRatio(colors[role + '-' + theme], background) >= AA_TEXT, role);
      }
    }
  }
});
