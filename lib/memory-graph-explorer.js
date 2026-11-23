'use strict';

const { layoutMemoryField, LINK_CODES, CLASS_LABELS } = require('./memory-field');

const ENTITY_KINDS = Object.freeze({
  concept: Object.freeze({ label: 'Concept', shape: 'hexagon', token: '--vi-node-entity-a' }),
  memory: Object.freeze({ label: 'Memory chunk', shape: 'circle', token: '--vi-node-entity-b' }),
  source: Object.freeze({ label: 'Source record', shape: 'diamond', token: '--vi-node-entity-c' }),
});

const EPOCHS = ['2026-Q1', '2026-Q2', '2026-Q3'];

const NODES = [
  ['design', 'Design system', 'concept', 'organizational', 0, true],
  ['layout', 'Canvas layout', 'memory', 'active-thread', 0, true],
  ['controls', 'Tool notes', 'memory', 'unconfirmed', 0, false],
  ['guide', 'UI specification', 'source', 'organizational', 0, true],
  ['viewport', 'Viewport log', 'source', 'organizational', 0, false],
  ['recall', 'Memory recall', 'concept', 'organizational', 1, true],
  ['retrieval', 'Recall result', 'memory', 'active-thread', 1, true],
  ['reading', 'Reading note', 'memory', 'personal', 1, false],
  ['index', 'Context index', 'source', 'organizational', 1, true],
  ['receipt', 'Recall receipt', 'source', 'organizational', 1, false],
  ['evidence', 'Evidence trail', 'concept', 'organizational', 2, true],
  ['review', 'Review note', 'memory', 'unconfirmed', 2, true],
  ['summary', 'Run summary', 'memory', 'active-thread', 2, false],
  ['decisions', 'Decision log', 'source', 'organizational', 2, true],
  ['audit', 'Fixture audit', 'source', 'organizational', 2, false],
];

const EDGES = [
  ['design', 'layout', 'CR', 7],
  ['design', 'controls', 'CR', 3],
  ['design', 'guide', 'TR'],
  ['layout', 'viewport', 'LR'],
  ['controls', 'guide', 'RR'],
  ['recall', 'retrieval', 'CR', 8],
  ['recall', 'reading', 'CR', 4],
  ['recall', 'index', 'TR'],
  ['retrieval', 'receipt', 'LR'],
  ['reading', 'index', 'RR'],
  ['evidence', 'review', 'CR', 5],
  ['evidence', 'summary', 'CR', 2],
  ['evidence', 'decisions', 'TR'],
  ['review', 'audit', 'LR'],
  ['summary', 'decisions', 'RR'],
  ['layout', 'retrieval', 'RR'],
  ['receipt', 'audit', 'TR'],
  ['review', 'guide', 'LR'],
  ['index', 'decisions', 'LR'],
];

function fitPoints(nodes) {
  const xValues = nodes.map(({ x }) => x);
  const yValues = nodes.map(({ y }) => y);
  const left = Math.min(...xValues);
  const top = Math.min(...yValues);
  const width = Math.max(...xValues) - left;
  const height = Math.max(...yValues) - top;
  return nodes.map(({ id, x, y }) => ({ id, x: (x - left) / width, y: (y - top) / height }));
}

function buildExplorerFixture() {
  const nodes = NODES.map(([id, label, kind, memoryClass, epoch, inScene]) => ({
    id, label, kind, class: memoryClass, epoch: EPOCHS[epoch], group: EPOCHS[epoch], inScene,
  }));
  const edges = EDGES.map(([source, target, code, count = 1]) => ({ source, target, code, count }));
  const field = layoutMemoryField({ nodes, edges, synthetic: true }, { seed: 37 });

  const hierarchical = [];
  const radial = [];
  EPOCHS.forEach((epoch, column) => {
    const group = nodes.filter((node) => node.epoch === epoch);
    group.forEach(({ id }, row) => {
      hierarchical.push({ id, x: column / (EPOCHS.length - 1), y: row / (group.length - 1) });
      // Concepts anchor each epoch on the inner ring. Records and chunks sit around it.
      const angle = (column / EPOCHS.length - 0.25 + (row ? (row - 2.5) / 15 : 0)) * 2 * Math.PI;
      const radius = row === 0 ? 0.42 : row % 2 ? 1 : 0.78;
      radial.push({ id, x: radius * Math.cos(angle), y: radius * Math.sin(angle) });
    });
  });

  return {
    synthetic: true,
    nodes,
    edges: field.edges,
    kinds: ENTITY_KINDS,
    classes: CLASS_LABELS,
    links: LINK_CODES,
    epochs: EPOCHS,
    layouts: { force: fitPoints(field.nodes), hierarchical, radial: fitPoints(radial) },
  };
}

module.exports = { buildExplorerFixture, ENTITY_KINDS };
