'use strict';

/**
 * Memory field primitive (ADR-018).
 *
 * A constellation of memories joined by four link codes (CR cluster, RR reasoned, LR linked,
 * TR tree) and a pipeline figure of the memory architecture. Pure and deterministic: a seeded
 * generator, no clock (recency comes from the caller's `now`), coordinates rounded to 0.1. Colour,
 * stroke and motion come from classes in `lib/memory-field.css`, never inline style, so
 * `style-src 'self'` holds and the site and the web app draw the same picture.
 *
 * Motion is transform and opacity only. A lit edge is a horizontal line inside a group translated
 * to its start and rotated to its end, so draw-in, the recall pulse and Forget retraction are all
 * `scaleX` from the group's origin. That is why recall and Forget orient an edge from their node.
 */

const { contrastRatio } = require('./contrast');

/** The four link codes (ADR-018 item 1). `token` is the DESIGN.md key without its state. */
const LINK_CODES = Object.freeze({
  CR: Object.freeze({ key: 'cluster', label: 'CR cluster', token: 'border-graph-cluster', cue: 'solid, width by count' }),
  RR: Object.freeze({ key: 'reasoned', label: 'RR reasoned', token: 'border-graph-reasoned', cue: 'long dash' }),
  LR: Object.freeze({ key: 'linked', label: 'LR linked', token: 'border-graph-linked', cue: 'dotted' }),
  TR: Object.freeze({ key: 'tree', label: 'TR tree', token: 'border-graph-tree', cue: 'solid with arrowhead' }),
});

/** Memory classes, drawn as outline shapes (ADR-018 item 4). */
const NODE_CLASSES = Object.freeze(['organizational', 'personal', 'active-thread', 'unconfirmed']);
const CLASS_LABELS = Object.freeze({
  organizational: 'organizational knowledge',
  personal: 'consented personal memory',
  'active-thread': 'active-thread context',
  unconfirmed: 'unconfirmed observation',
});

/** Mass: three radius steps from log2(recallCount + 1). */
const NODE_RADII = Object.freeze([4, 6, 9]);
/** Recency: three bands from days since last recall (fresh ≤ 7, warm ≤ 60, cold beyond). */
const RECENCY_BANDS = Object.freeze(['fresh', 'warm', 'cold']);
const RECENCY_DAYS = Object.freeze({ fresh: 7, warm: 60 });

const BUDGET = Object.freeze({ nodes: 300, edges: 3000 });
/** Without a focus, every edge is lit only while the field stays readable. */
const LIT_ALL_MAX = 240;
const DEFAULT_VIEW = Object.freeze({ width: 960, height: 600 });
const MARGIN = 16;
const ITERATIONS = 240;

const round = (value) => Math.round(value * 10) / 10;

class MemoryFieldError extends Error {
  constructor(code, message) {
    super(`${code}: ${message}`);
    this.name = 'MemoryFieldError';
    this.code = code;
  }
}

const invalid = (message) => new MemoryFieldError('MEMORY_FIELD_INVALID', message);

function escapeXml(value) {
  return String(value).replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);
}

/** mulberry32: a small seeded generator, so the same seed always gives the same layout. */
function seededRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A stable small hash of a string, used to pick a curve side without randomness. */
function hashString(value) {
  let h = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function radiusFor(recallCount = 0) {
  const mass = Math.log2(Math.max(0, Number(recallCount) || 0) + 1);
  if (mass < 2) return NODE_RADII[0];
  if (mass < 4) return NODE_RADII[1];
  return NODE_RADII[2];
}

function bandFor(node, now) {
  if (node.band) {
    if (!RECENCY_BANDS.includes(node.band)) throw invalid(`node ${node.id} has unknown band ${node.band}`);
    return node.band;
  }
  if (!node.lastRecalledAt || !now) return 'fresh';
  const days = (Date.parse(now) - Date.parse(node.lastRecalledAt)) / 86400000;
  if (!Number.isFinite(days)) throw invalid(`node ${node.id} has an unreadable lastRecalledAt or now`);
  if (days <= RECENCY_DAYS.fresh) return 'fresh';
  if (days <= RECENCY_DAYS.warm) return 'warm';
  return 'cold';
}

function validate(data) {
  if (!data || !Array.isArray(data.nodes) || !Array.isArray(data.edges)) throw invalid('data needs nodes and edges arrays');
  if (data.nodes.length > BUDGET.nodes || data.edges.length > BUDGET.edges) {
    throw new MemoryFieldError(
      'MEMORY_FIELD_OVER_BUDGET',
      `${data.nodes.length} nodes and ${data.edges.length} edges exceed ${BUDGET.nodes} and ${BUDGET.edges}; sample or aggregate first`,
    );
  }
  const ids = new Set();
  for (const node of data.nodes) {
    if (!node || typeof node.id !== 'string' || !node.id) throw invalid('every node needs a string id');
    if (ids.has(node.id)) throw invalid(`duplicate node id ${node.id}`);
    if (!NODE_CLASSES.includes(node.class)) throw invalid(`node ${node.id} has unknown class ${node.class}`);
    ids.add(node.id);
  }
  const edgeIds = new Set();
  for (const edge of data.edges) {
    if (!ids.has(edge.source) || !ids.has(edge.target)) throw invalid(`edge ${edge.source} to ${edge.target} names a missing node`);
    if (!(edge.code in LINK_CODES)) throw invalid(`edge ${edge.source} to ${edge.target} has unknown code ${edge.code}`);
    if (edge.source === edge.target) throw invalid(`edge on ${edge.source} links a node to itself`);
    const id = `${edge.source}>${edge.target}:${edge.code}`;
    if (edgeIds.has(id)) throw invalid(`duplicate edge ${id}`);
    edgeIds.add(id);
  }
}

/**
 * Place the field (ADR-018 item 5). Groups are seeded on a ring, then a force layout (repulsion
 * between nodes, a spring on each edge, a pull toward the node's group and toward the centre)
 * relaxes for a fixed number of cooling steps. Same data and seed, same picture.
 */
function layoutMemoryField(data, { seed = 1, width = DEFAULT_VIEW.width, height = DEFAULT_VIEW.height, iterations = ITERATIONS, now = null } = {}) {
  validate(data);
  const random = seededRandom(seed);
  const cx = width / 2;
  const cy = height / 2;
  const span = Math.min(width, height);

  const groups = [];
  for (const node of data.nodes) {
    const group = node.group ?? '';
    if (!groups.includes(group)) groups.push(group);
  }
  // Groups sit on an ellipse shaped like the view, so clusters use the width as well as the height.
  const ring = groups.length > 1 ? { rx: width * 0.28, ry: height * 0.26 } : { rx: 0, ry: 0 };
  const centres = new Map(
    groups.map((group, index) => {
      const angle = (index / groups.length) * Math.PI * 2 - Math.PI / 2;
      return [group, { x: cx + ring.rx * Math.cos(angle), y: cy + ring.ry * Math.sin(angle) }];
    }),
  );

  const nodes = data.nodes.map((node) => {
    const centre = centres.get(node.group ?? '');
    const angle = random() * Math.PI * 2;
    const distance = random() * span * 0.12;
    return {
      id: node.id,
      label: node.label ?? node.id,
      cls: node.class,
      group: node.group ?? null,
      href: node.href ?? null,
      r: radiusFor(node.recallCount),
      band: bandFor(node, now),
      x: centre.x + distance * Math.cos(angle),
      y: centre.y + distance * Math.sin(angle),
    };
  });
  const index = new Map(nodes.map((node, i) => [node.id, i]));
  const links = data.edges.map((edge) => [index.get(edge.source), index.get(edge.target)]);

  const k = Math.sqrt((width * height) / Math.max(1, nodes.length)) * 0.42;
  for (let step = 0; step < iterations; step += 1) {
    const temperature = span * 0.06 * (1 - step / iterations) + 0.5;
    const dx = new Float64Array(nodes.length);
    const dy = new Float64Array(nodes.length);
    for (let i = 0; i < nodes.length; i += 1) {
      for (let j = i + 1; j < nodes.length; j += 1) {
        let x = nodes[i].x - nodes[j].x;
        let y = nodes[i].y - nodes[j].y;
        let d = Math.hypot(x, y);
        if (d < 0.01) {
          x = 0.01 * (i - j);
          y = 0.01;
          d = Math.hypot(x, y);
        }
        const force = (k * k) / d;
        dx[i] += (x / d) * force;
        dy[i] += (y / d) * force;
        dx[j] -= (x / d) * force;
        dy[j] -= (y / d) * force;
      }
    }
    for (const [a, b] of links) {
      const x = nodes[a].x - nodes[b].x;
      const y = nodes[a].y - nodes[b].y;
      const d = Math.max(0.01, Math.hypot(x, y));
      const force = (d * d) / k / 4;
      dx[a] -= (x / d) * force;
      dy[a] -= (y / d) * force;
      dx[b] += (x / d) * force;
      dy[b] += (y / d) * force;
    }
    for (let i = 0; i < nodes.length; i += 1) {
      const centre = centres.get(nodes[i].group ?? '');
      dx[i] += (centre.x - nodes[i].x) * 0.22 + (cx - nodes[i].x) * 0.04;
      dy[i] += (centre.y - nodes[i].y) * 0.22 + (cy - nodes[i].y) * 0.04;
      const d = Math.hypot(dx[i], dy[i]);
      if (d > 0) {
        const move = Math.min(d, temperature);
        nodes[i].x += (dx[i] / d) * move;
        nodes[i].y += (dy[i] / d) * move;
      }
      const r = nodes[i].r;
      nodes[i].x = Math.min(width - MARGIN - r, Math.max(MARGIN + r, nodes[i].x));
      nodes[i].y = Math.min(height - MARGIN - r, Math.max(MARGIN + r, nodes[i].y));
    }
  }
  for (const node of nodes) {
    node.x = round(node.x);
    node.y = round(node.y);
  }

  const edges = data.edges.map((edge) => ({
    id: `${edge.source}>${edge.target}:${edge.code}`,
    source: edge.source,
    target: edge.target,
    code: edge.code,
    count: Math.max(1, Number(edge.count) || 1),
  }));

  return { width, height, synthetic: Boolean(data.synthetic), nodes, edges };
}

function weightFor(count) {
  if (count >= 6) return 3;
  if (count >= 3) return 2;
  return 1;
}

/** Straight segment from `from` to `to`, trimmed to both outlines, as translate + rotate + length. */
function segment(from, to) {
  const x = to.x - from.x;
  const y = to.y - from.y;
  const d = Math.hypot(x, y) || 1;
  const startTrim = from.r + 2;
  const endTrim = to.r + 3;
  return {
    x: round(from.x + (x / d) * startTrim),
    y: round(from.y + (y / d) * startTrim),
    angle: round((Math.atan2(y, x) * 180) / Math.PI),
    length: round(Math.max(0, d - startTrim - endTrim)),
  };
}

function restPath(a, b, id) {
  const mx = (a.x + b.x) / 2;
  const my = (a.y + b.y) / 2;
  const x = b.x - a.x;
  const y = b.y - a.y;
  const side = hashString(id) % 2 === 0 ? 1 : -1;
  const bend = 0.18 * side;
  return `M${a.x} ${a.y} Q${round(mx - y * bend)} ${round(my + x * bend)} ${b.x} ${b.y}`;
}

function nodeMark(node) {
  const { x, y, r } = node;
  const parts = [
    `<circle class="vi-mf-node-halo" cx="${x}" cy="${y}" r="${r * 2}"></circle>`,
    `<circle class="vi-mf-node-mark" cx="${x}" cy="${y}" r="${r}"></circle>`,
  ];
  if (node.cls === 'personal') parts.push(`<circle class="vi-mf-node-core" cx="${x}" cy="${y}" r="${round(r * 0.35)}"></circle>`);
  if (node.cls === 'active-thread') parts.push(`<circle class="vi-mf-node-ring" cx="${x}" cy="${y}" r="${r + 3}"></circle>`);
  return parts.join('');
}

/**
 * Decide the mode and the lit sets. Recall lights the edges between its query and its hits;
 * Forget marks the node's edges; a focus lights its nodes and the edges among them.
 */
function resolveStates(layout, { focus, recall, forget }) {
  const ids = new Set(layout.nodes.map((node) => node.id));
  const check = (id, what) => {
    if (!ids.has(id)) throw invalid(`${what} names a missing node ${id}`);
  };
  if (forget) {
    check(forget, 'forget');
    return { mode: 'forget', origin: forget, litNodes: null, litEdges: (edge) => edge.source === forget || edge.target === forget };
  }
  if (recall) {
    check(recall.from, 'recall.from');
    const hits = new Set(recall.hits || []);
    hits.forEach((id) => check(id, 'recall.hits'));
    const lit = new Set([recall.from, ...hits]);
    return {
      mode: 'recall',
      origin: recall.from,
      litNodes: lit,
      litEdges: (edge) => (edge.source === recall.from && hits.has(edge.target)) || (edge.target === recall.from && hits.has(edge.source)),
    };
  }
  if (focus) {
    const lit = new Set(focus.nodes || []);
    lit.forEach((id) => check(id, 'focus.nodes'));
    const edgeSet = focus.edges ? new Set(focus.edges) : null;
    return {
      mode: 'focus',
      origin: null,
      litNodes: lit,
      litEdges: (edge) => (edgeSet ? edgeSet.has(edge.id) : lit.has(edge.source) && lit.has(edge.target)),
    };
  }
  const all = layout.edges.length <= LIT_ALL_MAX;
  return { mode: 'field', origin: null, litNodes: null, litEdges: () => all };
}

/**
 * Render the field (ADR-018 items 2 to 4 and 8). Layers: the aria-hidden rest web, the lit links
 * grouped under one layer, then the node list. `id` scopes marker and title ids on a page that
 * shows more than one field.
 */
/**
 * A plain-language summary of what a field render shows (ADR-019 item 7): how many memories and
 * links of each code, and, for a recall or a Forget, which memories it reached. It is the long
 * description of a summary render and reads the same data the picture draws.
 */
function describeMemoryField(layout, { focus = null, recall = null, forget = null } = {}) {
  const states = resolveStates(layout, { focus, recall, forget });
  const byId = new Map(layout.nodes.map((node) => [node.id, node]));
  const label = (nodeId) => byId.get(nodeId).label;
  const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
  const counts = Object.entries(LINK_CODES)
    .map(([code, meta]) => [meta.key, layout.edges.filter((edge) => edge.code === code).length])
    .filter(([, n]) => n > 0)
    .map(([key, n]) => `${n} ${key}`);
  const parts = [`${plural(layout.nodes.length, 'memory', 'memories')} and ${plural(layout.edges.length, 'link', 'links')}${counts.length ? ` (${counts.join(', ')})` : ''}.`];
  if (states.mode === 'recall') {
    const hits = [...states.litNodes].filter((nodeId) => nodeId !== states.origin).map(label);
    parts.push(`A recall from ${label(states.origin)} reaches ${plural(hits.length, 'memory', 'memories')}${hits.length ? `: ${hits.join(', ')}` : ''}. The rest of the field is dimmed.`);
  } else if (states.mode === 'forget') {
    const peers = layout.edges.filter(states.litEdges).length;
    parts.push(`${label(states.origin)} is being forgotten: its ${plural(peers, 'link', 'links')} retract and it fades from every projection.`);
  } else if (states.mode === 'focus') {
    parts.push(`Focused: ${[...states.litNodes].map(label).join(', ')}.`);
  }
  return parts.join(' ');
}

function renderMemoryFieldSvg(layout, { id = 'vi-mf', title = 'Memory field', desc = '', focus = null, recall = null, forget = null, summary = false } = {}) {
  const states = resolveStates(layout, { focus, recall, forget });
  const byId = new Map(layout.nodes.map((node) => [node.id, node]));
  if (summary && layout.nodes.some((node) => node.href)) {
    throw invalid('a summary render is one image; nodes with links need the interactive render');
  }
  const out = [];
  const caption = layout.synthetic ? 'Synthetic data. ' : '';
  const described = summary ? describeMemoryField(layout, { focus, recall, forget }) : '';
  const descText = `${caption}${desc} ${described}`.replace(/\s+/g, ' ').trim();
  const labelled = descText ? `${id}-title ${id}-desc` : `${id}-title`;
  out.push(
    `<svg class="vi-mf" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${layout.width} ${layout.height}" role="${summary ? 'img' : 'group'}" aria-labelledby="${labelled}" data-mode="${states.mode}">`,
  );
  out.push(`<title id="${id}-title">${escapeXml(title)}</title>`);
  if (descText) out.push(`<desc id="${id}-desc">${escapeXml(descText)}</desc>`);
  out.push(
    `<defs><marker id="${id}-arrow" class="vi-mf-arrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0 L8 4 L0 8 z"></path></marker></defs>`,
  );

  out.push('<g class="vi-mf-rest" aria-hidden="true">');
  for (const edge of layout.edges) {
    const gone = states.mode === 'forget' && (edge.source === states.origin || edge.target === states.origin) ? ' data-forgetting="true"' : '';
    out.push(`<path class="vi-mf-rest-edge" data-code="${edge.code}"${gone} d="${restPath(byId.get(edge.source), byId.get(edge.target), edge.id)}"></path>`);
  }
  out.push('</g>');

  out.push('<g class="vi-mf-links">');
  for (const edge of layout.edges) {
    if (!states.litEdges(edge)) continue;
    let from = byId.get(edge.source);
    let to = byId.get(edge.target);
    let reversed = false;
    if (states.origin && edge.target === states.origin) {
      [from, to] = [to, from];
      reversed = true;
    }
    const seg = segment(from, to);
    const meta = LINK_CODES[edge.code];
    const marker = edge.code === 'TR' ? ` ${reversed ? 'marker-start' : 'marker-end'}="url(#${id}-arrow)"` : '';
    const forgetting = states.mode === 'forget' ? ' data-forgetting="true"' : '';
    out.push(
      `<g class="vi-mf-link" data-code="${edge.code}" data-weight="${weightFor(edge.count)}"${forgetting}${summary ? '' : ` role="img" aria-label="${meta.label}: ${escapeXml(byId.get(edge.source).label)} to ${escapeXml(byId.get(edge.target).label)}"`} transform="translate(${seg.x} ${seg.y}) rotate(${seg.angle})">`,
    );
    const linkName = `${meta.label}: ${escapeXml(byId.get(edge.source).label)} to ${escapeXml(byId.get(edge.target).label)}`;
    out.push(`<title>${linkName}</title>`);
    out.push(`<line class="vi-mf-link-line" x1="0" y1="0" x2="${seg.length}" y2="0"${marker}></line>`);
    if (states.mode === 'recall') {
      out.push(`<g class="vi-mf-pulse-track"><circle class="vi-mf-pulse" cx="${seg.length}" cy="0" r="3"></circle></g>`);
    }
    out.push('</g>');
  }
  out.push('</g>');

  out.push(summary ? '<g class="vi-mf-nodes">' : '<g class="vi-mf-nodes" role="list">');
  for (const node of layout.nodes) {
    let state = 'rest';
    if (states.mode === 'forget') state = node.id === states.origin ? 'forgetting' : 'rest';
    else if (states.litNodes) state = states.litNodes.has(node.id) ? 'lit' : 'dim';
    const name = `${node.label}, ${CLASS_LABELS[node.cls]}, ${node.band}`;
    // A named group needs a role: aria-label on a bare <g> is not exposed (ARIA 1.2 naming).
    let open = node.href ? `<a href="${escapeXml(node.href)}" aria-label="${escapeXml(name)}">` : `<g role="img" tabindex="-1" aria-label="${escapeXml(name)}">`;
    let close = node.href ? '</a>' : '</g>';
    if (summary) {
      open = '<g>';
      close = '</g>';
    }
    out.push(
      `<g class="vi-mf-node"${summary ? '' : ' role="listitem"'} data-id="${escapeXml(node.id)}" data-memory="${node.cls}" data-band="${node.band}" data-state="${state}">${open}${nodeMark(node)}${close}</g>`,
    );
  }
  out.push('</g>');

  if (layout.synthetic) {
    out.push(`<text class="vi-mf-caption" x="${MARGIN}" y="${layout.height - 4}">Synthetic data</text>`);
  }
  out.push('</svg>');
  return out.join('');
}

/** The text equivalent (ADR-018 item 8): each node with its links grouped by code label. */
function renderMemoryFieldTable(layout) {
  const byId = new Map(layout.nodes.map((node) => [node.id, node]));
  const out = ['<ul class="vi-mf-table" role="list">'];
  for (const node of layout.nodes) {
    out.push(
      `<li class="vi-mf-table-node"><span class="vi-mf-table-label">${escapeXml(node.label)}</span> <span class="vi-mf-table-meta">${CLASS_LABELS[node.cls]}, ${node.band}</span>`,
    );
    const lines = [];
    for (const [code, meta] of Object.entries(LINK_CODES)) {
      const peers = layout.edges
        .filter((edge) => edge.code === code && (edge.source === node.id || edge.target === node.id))
        .map((edge) => byId.get(edge.source === node.id ? edge.target : edge.source).label);
      if (peers.length) lines.push(`<li><span class="vi-mf-table-code">${meta.label}</span> ${peers.map(escapeXml).join(', ')}</li>`);
    }
    if (lines.length) out.push(`<ul>${lines.join('')}</ul>`);
    out.push('</li>');
  }
  out.push('</ul>');
  return out.join('');
}

const SURFACES = Object.freeze({
  base: ['surface-background-primary-base', 'surface-background-secondary-base', 'surface-background-tertiary-base'],
  light: ['surface-background-primary-light', 'surface-background-secondary-light', 'surface-background-tertiary-light'],
});

/** Worst lit-link contrast per code on every surface of a theme (WCAG 1.4.11 needs 3:1). */
function memoryFieldContrastReport(tokens, { theme = 'base' } = {}) {
  if (!(theme in SURFACES)) throw invalid(`theme must be base or light, got ${theme}`);
  const colors = tokens.colors;
  const links = {};
  let minContrast = Infinity;
  for (const [code, meta] of Object.entries(LINK_CODES)) {
    const token = `${meta.token}-${theme}`;
    const value = colors[token];
    if (!value) throw invalid(`token ${token} is missing`);
    const surfaces = Object.fromEntries(SURFACES[theme].map((surface) => [surface, round(contrastRatio(value, colors[surface]) * 10) / 10]));
    const worst = Math.min(...Object.values(surfaces));
    minContrast = Math.min(minContrast, worst);
    links[code] = { token, value, worst, surfaces };
  }
  return { theme, minContrast, required: 3, pass: minContrast >= 3, rest: 'decorative (aria-hidden), exempt', links };
}

// --- Pipeline (ADR-018 item 7) -------------------------------------------------------

function box(item) {
  return { x: item.x, y: item.y, w: item.w, h: item.h };
}

/** Anchor points between two boxes: a straight run where they overlap, else centre to centre. */
function anchors(a, b) {
  const overlapY = [Math.max(a.y, b.y), Math.min(a.y + a.h, b.y + b.h)];
  const overlapX = [Math.max(a.x, b.x), Math.min(a.x + a.w, b.x + b.w)];
  if (overlapY[1] - overlapY[0] >= 8) {
    const y = (overlapY[0] + overlapY[1]) / 2;
    return a.x + a.w <= b.x ? [{ x: a.x + a.w, y }, { x: b.x, y }] : [{ x: a.x, y }, { x: b.x + b.w, y }];
  }
  if (overlapX[1] - overlapX[0] >= 8) {
    const x = (overlapX[0] + overlapX[1]) / 2;
    return a.y + a.h <= b.y ? [{ x, y: a.y + a.h }, { x, y: b.y }] : [{ x, y: a.y }, { x, y: b.y + b.h }];
  }
  const ac = { x: a.x + a.w / 2, y: a.y + a.h / 2 };
  const bc = { x: b.x + b.w / 2, y: b.y + b.h / 2 };
  const edgePoint = (r, from, to) => {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const sx = dx === 0 ? Infinity : r.w / 2 / Math.abs(dx);
    const sy = dy === 0 ? Infinity : r.h / 2 / Math.abs(dy);
    const s = Math.min(sx, sy);
    return { x: from.x + dx * s, y: from.y + dy * s };
  };
  return [edgePoint(a, ac, bc), edgePoint(b, bc, ac)];
}

function storePath({ x, y, w, h }) {
  const ry = Math.min(10, h / 6);
  return `M${x} ${y + ry} A${w / 2} ${ry} 0 0 1 ${x + w} ${y + ry} V${y + h - ry} A${w / 2} ${ry} 0 0 1 ${x} ${y + h - ry} Z M${x} ${y + ry} A${w / 2} ${ry} 0 0 0 ${x + w} ${y + ry}`;
}

function renderMemoryPipelineSvg(spec, { id = 'vi-mp', title = 'Memory pipeline', desc = '' } = {}) {
  const items = new Map();
  for (const group of spec.groups || []) items.set(group.id, group);
  for (const stage of spec.stages) {
    if (items.has(stage.id)) throw invalid(`duplicate pipeline id ${stage.id}`);
    items.set(stage.id, stage);
  }
  for (const flow of spec.flows) {
    if (!items.has(flow.from) || !items.has(flow.to)) throw invalid(`flow ${flow.from} to ${flow.to} names a missing stage`);
    if (flow.code && !(flow.code in LINK_CODES)) throw invalid(`flow ${flow.from} to ${flow.to} has unknown code ${flow.code}`);
  }
  const labelled = desc ? `${id}-title ${id}-desc` : `${id}-title`;
  const out = [
    `<svg class="vi-mp" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${spec.width} ${spec.height}" role="group" aria-labelledby="${labelled}">`,
    `<title id="${id}-title">${escapeXml(title)}</title>`,
  ];
  if (desc) out.push(`<desc id="${id}-desc">${escapeXml(desc)}</desc>`);
  out.push(
    `<defs><marker id="${id}-arrow" class="vi-mp-arrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0 L8 4 L0 8 z"></path></marker></defs>`,
  );
  for (const group of spec.groups || []) {
    out.push(
      `<g class="vi-mp-group" data-id="${escapeXml(group.id)}"><rect class="vi-mp-group-frame" x="${group.x}" y="${group.y}" width="${group.w}" height="${group.h}" rx="14"></rect><text class="vi-mp-group-label" x="${group.x + 16}" y="${group.y + 22}">${escapeXml(group.label)}</text></g>`,
    );
  }
  spec.flows.forEach((flow, index) => {
    const [a, b] = anchors(box(items.get(flow.from)), box(items.get(flow.to)));
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const length = round(Math.max(0, Math.hypot(dx, dy) - 2));
    const angle = round((Math.atan2(dy, dx) * 180) / Math.PI);
    const code = flow.code ? ` data-code="${flow.code}"` : '';
    const horizontal = Math.abs(dx) >= Math.abs(dy);
    const lx = round((a.x + b.x) / 2 + (horizontal ? 0 : 6));
    const ly = round((a.y + b.y) / 2 + (horizontal ? -7 : 4));
    const anchor = horizontal ? 'middle' : 'start';
    out.push(
      `<g class="vi-mp-flow"${code} data-phase="${index % 6}"><g transform="translate(${round(a.x)} ${round(a.y)}) rotate(${angle})"><line class="vi-mp-flow-line" x1="0" y1="0" x2="${length}" y2="0" marker-end="url(#${id}-arrow)"></line><g class="vi-mp-pulse-track"><circle class="vi-mp-pulse" cx="${length}" cy="0" r="3"></circle></g></g><text class="vi-mp-flow-label" x="${lx}" y="${ly}" text-anchor="${anchor}">${escapeXml(flow.label)}</text></g>`,
    );
  });
  for (const stage of spec.stages) {
    const b = box(stage);
    const shape =
      stage.kind === 'store'
        ? `<path class="vi-mp-store" d="${storePath(b)}"></path>`
        : `<rect class="vi-mp-step" x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" rx="10"></rect>`;
    const textY = stage.kind === 'store' ? b.y + b.h / 2 + 6 : b.y + b.h / 2 + (stage.sub ? -2 : 5);
    const sub = stage.sub ? `<text class="vi-mp-stage-sub" x="${b.x + 14}" y="${textY + 17}">${escapeXml(stage.sub)}</text>` : '';
    out.push(
      `<g class="vi-mp-stage" data-id="${escapeXml(stage.id)}" data-kind="${stage.kind}">${shape}<text class="vi-mp-stage-label" x="${b.x + 14}" y="${textY}">${escapeXml(stage.label)}</text>${sub}</g>`,
    );
  }
  out.push('</svg>');
  return out.join('');
}

/**
 * The Vidoxlabs memory architecture: CRS and ViDocs sources, the Memorix Postgres authority,
 * its projections, the recall lanes, ARKSRRA and Forget. Real components only.
 */
const SAMPLE_PIPELINE = Object.freeze({
  width: 1040,
  height: 600,
  groups: [
    { id: 'sources', label: 'Sources', x: 8, y: 8, w: 232, h: 380 },
    { id: 'authority', label: 'Memorix: Postgres authority', x: 272, y: 8, w: 300, h: 380 },
    { id: 'projections', label: 'Projections', x: 604, y: 8, w: 196, h: 380 },
    { id: 'recall', label: 'Recall lanes', x: 832, y: 8, w: 200, h: 420 },
  ],
  stages: [
    { id: 'conversations', label: 'CRS conversations', sub: 'messages, trajectories', kind: 'store', x: 32, y: 52, w: 184, h: 88 },
    { id: 'documents', label: 'ViDocs documents', sub: 'governed corpus', kind: 'store', x: 32, y: 166, w: 184, h: 88 },
    { id: 'turns', label: 'ViApp turns', sub: 'explicit consent', kind: 'store', x: 32, y: 280, w: 184, h: 88 },
    { id: 'chunks', label: 'Retrieval chunks', sub: 'admitted, scoped', kind: 'store', x: 296, y: 52, w: 252, h: 88 },
    { id: 'vectors', label: 'pgvector', sub: 'embeddings', kind: 'store', x: 296, y: 166, w: 118, h: 88 },
    { id: 'lexical', label: 'Lexical', sub: 'full text', kind: 'store', x: 430, y: 166, w: 118, h: 88 },
    { id: 'personal', label: 'Personal memory', sub: 'consented, RLS', kind: 'store', x: 296, y: 280, w: 252, h: 88 },
    { id: 'neo4j', label: 'Neo4j graph', sub: 'concepts, links', kind: 'store', x: 624, y: 52, w: 156, h: 88 },
    { id: 'redis', label: 'Redis cache', sub: 'turn path, TTL', kind: 'store', x: 624, y: 166, w: 156, h: 88 },
    { id: 'minio', label: 'MinIO objects', sub: 'documents', kind: 'store', x: 624, y: 280, w: 156, h: 88 },
    { id: 'semantic', label: 'Semantic', sub: 'by meaning', kind: 'step', x: 852, y: 48, w: 160, h: 60 },
    { id: 'keyword', label: 'Lexical', sub: 'exact words', kind: 'step', x: 852, y: 120, w: 160, h: 60 },
    { id: 'authorityLane', label: 'Authority', sub: 'source tier', kind: 'step', x: 852, y: 192, w: 160, h: 60 },
    { id: 'recency', label: 'Recency', sub: 'by time', kind: 'step', x: 852, y: 264, w: 160, h: 60 },
    { id: 'graph', label: 'Graph boost', sub: 'one hop', kind: 'step', x: 852, y: 336, w: 160, h: 60 },
    { id: 'forget', label: 'Forget', sub: 'deletion epoch: bypass and rebuild every projection', kind: 'step', x: 272, y: 476, w: 470, h: 72 },
    { id: 'arksrra', label: 'ARKSRRA', sub: 'ratify before act', kind: 'step', x: 832, y: 476, w: 200, h: 72 },
  ],
  flows: [
    { from: 'conversations', to: 'chunks', label: 'ingest' },
    { from: 'documents', to: 'vectors', label: 'embed' },
    { from: 'turns', to: 'personal', label: 'remember' },
    { from: 'chunks', to: 'lexical', label: 'index' },
    { from: 'chunks', to: 'neo4j', label: 'project', code: 'LR' },
    { from: 'lexical', to: 'redis', label: 'cache' },
    { from: 'personal', to: 'minio', label: 'project' },
    { from: 'projections', to: 'recall', label: 'read' },
    { from: 'recall', to: 'arksrra', label: 'evidence' },
    { from: 'forget', to: 'authority', label: 'epoch bump' },
    { from: 'forget', to: 'projections', label: 'rebuild' },
    { from: 'forget', to: 'arksrra', label: 'withheld' },
  ],
});

/**
 * A deterministic synthetic field for the catalog, dist samples and the MCP default: five groups
 * (CRS, ViDocs, personal, active thread, synthesis), mostly in-group links and a few across.
 * Always marked synthetic, so every render of it says so.
 */
function sampleMemoryField({ nodes: nodeCount = 72, edges: edgeTarget = 200 } = {}) {
  const random = seededRandom(42);
  const groups = ['crs', 'vidocs', 'personal', 'thread', 'synthesis'];
  const nodes = Array.from({ length: nodeCount }, (_, i) => ({
    id: `m${i}`,
    label: `memory ${i}`,
    class: NODE_CLASSES[Math.floor(random() * NODE_CLASSES.length)],
    group: groups[i % groups.length],
    recallCount: Math.floor(random() ** 3 * 60),
    band: RECENCY_BANDS[Math.floor(random() * RECENCY_BANDS.length)],
  }));
  const codes = ['CR', 'CR', 'CR', 'TR', 'LR', 'RR'];
  const edges = [];
  const seen = new Set();
  for (let attempt = 0; edges.length < edgeTarget && attempt < edgeTarget * 4; attempt += 1) {
    const a = Math.floor(random() * nodeCount);
    const b = random() < 0.75 ? (a % groups.length) + groups.length * Math.floor(random() * Math.ceil(nodeCount / groups.length)) : Math.floor(random() * nodeCount);
    if (b >= nodeCount || a === b) continue;
    const code = codes[Math.floor(random() * codes.length)];
    const key = `m${a}>m${b}:${code}`;
    if (seen.has(key)) continue;
    seen.add(key);
    edges.push({ source: `m${a}`, target: `m${b}`, code, count: 1 + Math.floor(random() * 7) });
  }
  return { nodes, edges, synthetic: true };
}

module.exports = {
  sampleMemoryField,
  LINK_CODES,
  NODE_CLASSES,
  CLASS_LABELS,
  NODE_RADII,
  RECENCY_BANDS,
  RECENCY_DAYS,
  BUDGET,
  LIT_ALL_MAX,
  MemoryFieldError,
  layoutMemoryField,
  renderMemoryFieldSvg,
  describeMemoryField,
  renderMemoryFieldTable,
  memoryFieldContrastReport,
  renderMemoryPipelineSvg,
  SAMPLE_PIPELINE,
};
