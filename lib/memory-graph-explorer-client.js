'use strict';

(() => {
  const SVG = 'http://www.w3.org/2000/svg';
  const DIRECTIONS = {
    ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0],
  };
  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const pointMap = (points) => new Map(points.map((point) => [point.id, point]));

  function queryScene(query, graph) {
    const clauses = [];
    const normalized = query.toLowerCase();
    const lexer = /(?:([a-z][a-z0-9-]*):\s*("[^"]*"|[^\s":]+)|"([^"]*)"|[^\s":]+)(?=\s|$)/gy;

    function invalid(message) {
      const error = new Error(message);
      error.code = 'GRAPH_QUERY_INVALID';
      throw error;
    }

    for (let offset = 0; offset < normalized.length;) {
      if (/\s/u.test(normalized[offset])) {
        offset += 1;
        continue;
      }
      lexer.lastIndex = offset;
      const term = lexer.exec(normalized);
      if (!term) invalid('Enter a value after each filter. Use quotes for phrases.');
      offset = lexer.lastIndex;
      const [, key, rawValue, phrase] = term;
      const value = rawValue?.replace(/^"|"$/g, '') ?? phrase ?? term[0];
      if (!value) invalid('Enter a search term or a filter value.');
      if (key === 'category') {
        const kind = Object.keys(graph.kinds).find((id) => id === value || graph.kinds[id].label.toLowerCase() === value);
        if (!kind) invalid('Choose Concept, Memory or Source for category.');
        clauses.push((node) => node.kind === kind);
      } else if (key === 'link') {
        const code = value.toUpperCase();
        if (!Object.hasOwn(graph.links, code)) invalid('Choose CR, RR, LR or TR for link.');
        const incident = new Set(graph.edges.filter((edge) => edge.code === code).flatMap((edge) => [edge.source, edge.target]));
        clauses.push((node) => incident.has(node.id));
      } else if (key === 'epoch') {
        const epoch = value.toUpperCase().replace(' ', '-');
        if (!graph.epochs.includes(epoch)) invalid('Choose an epoch listed in the Time slicer.');
        clauses.push((node) => node.epoch === epoch);
      } else if (key) {
        invalid('Use category, link or epoch as a filter.');
      } else if (phrase !== undefined || !['with', 'and'].includes(value)) {
        const code = value.toUpperCase();
        const incident = new Set(graph.edges.filter((edge) => edge.code === code).flatMap((edge) => [edge.source, edge.target]));
        clauses.push((node) => [node.label, node.epoch, graph.kinds[node.kind].label]
          .some((text) => text.toLowerCase().includes(value)) || incident.has(node.id));
      }
    }

    return graph.nodes.filter((node) => clauses.every((matches) => matches(node))).map((node) => node.id);
  }

  function svgElement(tag, attrs = {}) {
    const element = document.createElementNS(SVG, tag);
    for (const [name, value] of Object.entries(attrs)) element.setAttribute(name, value);
    return element;
  }

  function shape(kind, graph) {
    const icon = svgElement('svg', { viewBox: '0 0 24 24', class: 'vi-graph-glyph', 'aria-hidden': 'true' });
    icon.append(svgElement('use', { href: '#graph-' + graph.kinds[kind].shape }));
    return icon;
  }

  function relationKey(code) {
    const icon = svgElement('svg', { viewBox: '0 0 24 16', class: 'vi-graph-relation-sample', 'aria-hidden': 'true' });
    icon.append(svgElement('line', { x1: 2, y1: 8, x2: code === 'TR' ? 17 : 22, y2: 8 }));
    if (code === 'TR') icon.append(svgElement('path', { d: 'm17 4 5 4-5 4Z', 'stroke-dasharray': 'none' }));
    return icon;
  }

  function textElement(tag, text, className = '') {
    const element = document.createElement(tag);
    element.className = className;
    element.textContent = text;
    return element;
  }

  function containsPoint(vertices, x, y) {
    let inside = false;
    for (let i = 0, j = vertices.length - 1; i < vertices.length; j = i++) {
      const a = vertices[i];
      const b = vertices[j];
      if ((a.y > y) !== (b.y > y) && x < (b.x - a.x) * (y - a.y) / (b.y - a.y) + a.x) inside = !inside;
    }
    return inside;
  }

  function connectExplorer(root, graph) {
    const $ = (selector) => root.querySelector(selector);
    const elements = (selector) => [...root.querySelectorAll(selector)];
    const stage = $('[data-graph-stage]');
    const canvas = $('[data-graph-canvas]');
    const nodeLayer = $('[data-graph-nodes]');
    const extent = $('[data-graph-extent]');
    const edgeSvg = $('[data-graph-edges]');
    const gesture = $('[data-graph-gesture]');
    const minimap = $('[data-graph-map]');
    const viewport = $('[data-graph-map-viewport]');
    const ledger = $('#graph-ledger');
    const ledgerTrigger = $('[data-graph-ledger]');
    const inspector = $('[data-graph-inspector]');
    const drawer = $('[data-graph-drawer]');
    const dock = $('[data-graph-dock]');
    const closeLegend = $('[data-graph-close]');
    const time = $('[data-graph-time]');
    const timePanel = $('#graph-time-filter');
    const epoch = $('[data-graph-epoch]');
    const sceneButton = $('[data-graph-scene]');
    const query = $('#graph-query');
    const submit = $('[data-graph-submit]');
    const error = $('[data-graph-error]');
    const retry = $('[data-graph-retry]');
    const status = $('[data-graph-status]');
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const miniLayer = $('[data-graph-mini-svg]');
    const kinds = new Set(Object.keys(graph.kinds));
    const codes = new Set(Object.keys(graph.links));
    const labels = new Map(graph.nodes.map(({ id, label }) => [id, label]));
    const tabs = elements('[data-graph-tab]');
    const scopes = elements('[name="graph-scope"]');
    const legendTriggers = elements('[data-graph-open]');
    const filters = $('[data-graph-open="filters"]');
    const edgeMarks = new Map();
    const nodeMarks = new Map();
    const keyRows = new Map();
    const screenPoints = new Map();
    const camera = { x: 0.5, y: 0.5, zoom: 1 };
    const defaultScene = graph.nodes.filter(({ inScene }) => inScene).map(({ id }) => id);
    const miniInset = 6;
    const miniSpan = 100 - 2 * miniInset;
    let scene = new Set(defaultScene);
    let matches = new Set();
    let streaming = null;
    let selected = new Set();
    let visible = new Set();
    let visibleEdges = [];
    let scope = 'all';
    let mode = 'point';
    let hovered = null;
    let focused = null;
    let roving = null;
    let legendInvoker = null;
    let drag = null;
    let mapGrab = null;
    let layoutFrame = null;
    let layout = pointMap(graph.layouts.force);
    let layoutName = 'force';
    let running = false;

    function addKey(id, description, glyph, relation = false) {
      const row = document.createElement('li');
      const button = document.createElement('button');
      const count = textElement('span', '', 'vi-graph-number vi-graph-legend-count');
      const text = textElement('span', description, 'vi-graph-key-text');
      button.type = 'button';
      button.className = 'vi-graph-key';
      button.dataset[relation ? 'code' : 'kind'] = id;
      button.setAttribute('aria-pressed', 'true');
      button.append(glyph, text, count);
      row.append(button);
      $(relation ? '[data-graph-codes]' : '[data-graph-kinds]').append(row);
      keyRows.set(id, { button, count });
      button.addEventListener('click', () => {
        const filter = relation ? codes : kinds;
        if (filter.has(id)) filter.delete(id);
        else filter.add(id);
        button.setAttribute('aria-pressed', String(filter.has(id)));
        updateVisibility();
      });
    }

    for (const [id, kind] of Object.entries(graph.kinds)) addKey(id, kind.label, shape(id, graph));
    for (const [code, link] of Object.entries(graph.links)) {
      addKey(code, link.label, relationKey(code), true);
      keyRows.get(code).button.title = link.label + ' · ' + link.cue;
    }
    for (const value of graph.epochs) epoch.add(new Option(value, value));

    for (const edge of graph.edges) {
      const path = svgElement('path', { class: 'vi-graph-edge', 'data-code': edge.code });
      if (edge.code === 'TR') path.setAttribute('marker-end', 'url(#graph-tree-tip)');
      if (edge.code === 'CR') {
        const weight = edge.count >= 6 ? 3 : edge.count >= 3 ? 2 : 1;
        path.style.setProperty('--vi-graph-edge-width', String(weight));
      }
      const label = svgElement('text', { class: 'vi-graph-edge-label' });
      label.textContent = edge.code;
      const mini = svgElement('line');
      $('[data-graph-links]').append(path);
      $('[data-graph-edge-labels]').append(label);
      miniLayer.append(mini);
      edgeMarks.set(edge.id, { path, label, mini });
    }

    for (const node of graph.nodes) {
      const button = document.createElement('button');
      const name = node.label + ', ' + graph.kinds[node.kind].label + ', ' + node.epoch;
      button.type = 'button';
      button.className = 'vi-graph-node';
      button.dataset.node = node.id;
      button.dataset.kind = node.kind;
      button.tabIndex = -1;
      button.title = name;
      button.setAttribute('aria-label', name);
      button.setAttribute('aria-pressed', 'false');
      button.append(shape(node.kind, graph), textElement('span', node.label, 'vi-graph-node-label'));
      nodeLayer.append(button);
      const mini = svgElement('use', { href: '#graph-' + graph.kinds[node.kind].shape, width: 4, height: 4, 'data-kind': node.kind });
      miniLayer.append(mini);
      nodeMarks.set(node.id, { button, mini, name });
      button.addEventListener('pointerenter', (event) => {
        if (event.pointerType === 'touch' || drag) return;
        hovered = node.id;
        updateFocus();
      });
      button.addEventListener('pointerleave', () => {
        if (hovered !== node.id) return;
        hovered = null;
        updateFocus();
      });
      button.addEventListener('focus', () => {
        setRoving(node.id);
        focused = button.matches(':focus-visible') ? node.id : null;
        if (focused) revealNode(node.id);
        updateFocus();
      });
      button.addEventListener('blur', () => {
        focused = null;
        updateFocus();
      });
      button.addEventListener('click', (event) => {
        const toggle = event.detail === 0 || event.shiftKey || event.metaKey || event.ctrlKey;
        if (!toggle) selected = new Set(selected.has(node.id) && selected.size === 1 ? [] : [node.id]);
        else if (selected.has(node.id)) selected.delete(node.id);
        else selected.add(node.id);
        updateFocus();
        updateLedger();
      });
    }

    function setRoving(id) {
      if (nodeMarks.has(roving)) nodeMarks.get(roving).button.tabIndex = -1;
      roving = id;
      if (nodeMarks.has(roving)) nodeMarks.get(roving).button.tabIndex = 0;
    }

    function updateFocus() {
      const anchor = hovered || focused;
      const hits = streaming ?? matches;
      const seeds = anchor ? new Set([anchor]) : selected.size > 0 ? selected : hits;
      const lit = new Set(seeds);
      stage.dataset.hasSelection = String(seeds.size > 0);
      for (const edge of visibleEdges) {
        const { path, label } = edgeMarks.get(edge.id);
        const related = seeds.has(edge.source) || seeds.has(edge.target);
        path.dataset.state = related ? 'lit' : seeds.size ? 'dim' : 'rest';
        label.dataset.state = related ? 'lit' : 'rest';
        if (related) {
          lit.add(edge.source);
          lit.add(edge.target);
        }
      }
      for (const [id, { button, name }] of nodeMarks) {
        button.dataset.state = lit.has(id) ? 'lit' : 'rest';
        button.dataset.match = String(hits.has(id));
        button.setAttribute('aria-label', hits.has(id) ? name + ', query match' : name);
        button.setAttribute('aria-pressed', String(selected.has(id)));
      }
      placeEdgeLabels();
    }

    function updateLedger() {
      const shown = selected.size ? selected : visible;
      $('[data-graph-total]').textContent = visible.size;
      $('[data-graph-selected]').textContent = selected.size;
      $('[data-graph-ledger-heading]').textContent = selected.size ? 'Selected nodes' : 'Nodes in view';
      if (ledger.hidden) return;

      const rows = graph.nodes.filter(({ id }) => shown.has(id)).map((node) => {
        const row = document.createElement('tr');
        const entity = textElement('td', node.label);
        entity.append(textElement('span', graph.kinds[node.kind].label));
        row.append(entity, textElement('td', node.epoch), textElement('td', graph.classes[node.class]));
        return row;
      });
      if (!rows.length) {
        const row = document.createElement('tr');
        const cell = textElement('td', 'No nodes in view');
        cell.colSpan = 3;
        row.append(cell);
        rows.push(row);
      }
      $('[data-graph-records]').replaceChildren(...rows);

      const connections = visibleEdges
        .filter(({ source, target }) => shown.has(source) || shown.has(target))
        .map(({ source, target, code, count }) => {
          const pair = labels.get(source) + (code === 'TR' ? ' → ' : ' · ') + labels.get(target);
          return textElement('li', pair + ' · ' + graph.links[code].label + (code === 'CR' ? ' (' + count + ')' : ''));
        });
      $('[data-graph-connections]').replaceChildren(...(connections.length ? connections : [textElement('li', 'No relationships in view')]));
    }

    function updateLegendCounts() {
      const nodes = graph.nodes.filter(({ id }) => streaming ? streaming.has(id) : visible.has(id));
      const edges = streaming ? graph.edges.filter(({ source, target }) => streaming.has(source) || streaming.has(target)) : visibleEdges;
      for (const kind of Object.keys(graph.kinds)) {
        keyRows.get(kind).count.textContent = nodes.filter((node) => node.kind === kind).length;
      }
      for (const code of Object.keys(graph.links)) {
        keyRows.get(code).count.textContent = edges.filter((edge) => edge.code === code).length;
      }
    }

    function updateVisibility() {
      const scoped = graph.nodes.filter((node) => kinds.has(node.kind) && (!epoch.value || epoch.value === node.epoch));
      const inScene = scoped.filter(({ id }) => scene.has(id)).length;
      $('[data-graph-scope-total="all"]').textContent = scoped.length;
      $('[data-graph-scope-total="in"]').textContent = inScene;
      $('[data-graph-scope-total="off"]').textContent = scoped.length - inScene;
      visible = new Set(scoped.filter(({ id }) => scope === 'all' || (scope === 'in') === scene.has(id)).map(({ id }) => id));
      const edgesInView = graph.edges.filter(({ source, target }) => visible.has(source) && visible.has(target));
      visibleEdges = edgesInView.filter(({ code }) => codes.has(code));
      const edgeIds = new Set(visibleEdges.map(({ id }) => id));
      selected = new Set([...selected].filter((id) => visible.has(id)));
      if (!visible.has(focused)) focused = null;
      if (!visible.has(hovered)) hovered = null;
      if (!visible.has(roving)) setRoving(visible.values().next().value);

      for (const [id, { button, mini }] of nodeMarks) {
        button.hidden = !visible.has(id);
        mini.toggleAttribute('hidden', !visible.has(id));
      }
      for (const [id, { path, label, mini }] of edgeMarks) {
        for (const mark of [path, label, mini]) mark.toggleAttribute('hidden', !edgeIds.has(id));
      }
      const filtered = graph.nodes.length - visible.size;
      $('[data-graph-scope-count]').textContent = visible.size + ' in view · ' + filtered + ' filtered';
      sceneButton.setAttribute('aria-pressed', String(scope === 'in'));
      scopes.forEach((radio) => { radio.checked = radio.value === scope; });
      updateLegendCounts();
      updateLedger();
      updateFocus();
      paint();
    }

    function plot() {
      return {
        centerX: extent.offsetLeft + extent.offsetWidth / 2,
        centerY: extent.offsetTop + extent.offsetHeight / 2,
        width: Math.max(1, extent.offsetWidth),
        height: Math.max(1, extent.offsetHeight),
      };
    }

    function paint() {
      const { centerX, centerY, width, height } = plot();
      edgeSvg.setAttribute('viewBox', [0, 0, canvas.clientWidth, canvas.clientHeight].join(' '));
      for (const [id, point] of layout) {
        const x = centerX + (point.x - camera.x) * width * camera.zoom;
        const y = centerY + (point.y - camera.y) * height * camera.zoom;
        screenPoints.set(id, { x, y });
        const { button, mini } = nodeMarks.get(id);
        button.style.transform = 'translate3d(' + x + 'px,' + y + 'px,0)';
        mini.setAttribute('x', miniInset + point.x * miniSpan - 2);
        mini.setAttribute('y', miniInset + point.y * miniSpan - 2);
      }
      for (const edge of visibleEdges) {
        const a = screenPoints.get(edge.source);
        const b = screenPoints.get(edge.target);
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const length = Math.hypot(dx, dy) || 1;
        const trim = Math.min(length / 3, 16);
        const ax = a.x + dx / length * trim;
        const ay = a.y + dy / length * trim;
        const bx = b.x - dx / length * trim;
        const by = b.y - dy / length * trim;
        const { path, mini } = edgeMarks.get(edge.id);
        path.setAttribute('d', 'M' + ax + ' ' + ay + 'L' + bx + ' ' + by);
        const from = layout.get(edge.source);
        const to = layout.get(edge.target);
        mini.setAttribute('x1', miniInset + from.x * miniSpan);
        mini.setAttribute('y1', miniInset + from.y * miniSpan);
        mini.setAttribute('x2', miniInset + to.x * miniSpan);
        mini.setAttribute('y2', miniInset + to.y * miniSpan);
      }
      placeEdgeLabels();

      const windowSize = Math.min(1, 1 / camera.zoom);
      const left = (camera.x - windowSize / 2) * miniSpan;
      const top = (camera.y - windowSize / 2) * miniSpan;
      const scale = (windowSize * miniSpan + 2 * miniInset) / 100;
      const x = left * minimap.clientWidth / 100;
      const y = top * minimap.clientHeight / 100;
      viewport.style.transform = 'translate3d(' + x + 'px,' + y + 'px,0) scale(' + scale + ')';
      $('[data-graph-zoom-value]').textContent = Math.round(100 * camera.zoom) + '%';
    }

    function placeEdgeLabels() {
      const placed = [];
      for (const edge of visibleEdges) {
        const { label } = edgeMarks.get(edge.id);
        if (label.dataset.state !== 'lit') continue;
        const a = screenPoints.get(edge.source);
        const b = screenPoints.get(edge.target);
        if (!a || !b) continue;
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const length = Math.hypot(dx, dy);
        const x = (a.x + b.x) / 2 - dy / (length || 1) * 10;
        const y = (a.y + b.y) / 2 + dx / (length || 1) * 10;
        const crowded = length < 40 || placed.some((point) => Math.abs(point.x - x) < 22 && Math.abs(point.y - y) < 16);
        label.setAttribute('visibility', crowded ? 'hidden' : 'visible');
        if (!crowded) {
          label.setAttribute('x', x);
          label.setAttribute('y', y);
          placed.push({ x, y });
        }
      }
    }

    function setCamera(x, y, zoom = camera.zoom) {
      camera.zoom = clamp(zoom, 0.75, 2.5);
      const margin = Math.min(0.5, 0.5 / camera.zoom);
      camera.x = clamp(x, margin, 1 - margin);
      camera.y = clamp(y, margin, 1 - margin);
      paint();
    }

    function zoomBy(amount) {
      setCamera(camera.x, camera.y, camera.zoom + amount);
    }

    function paused() {
      return motion.matches || Boolean(root.closest('[data-motion="paused"]'));
    }

    function changeLayout(name) {
      cancelAnimationFrame(layoutFrame);
      layoutName = name;
      const origin = layout;
      const target = graph.layouts[name];
      const duration = parseFloat(getComputedStyle(root).getPropertyValue('--vi-transition-transition-duration-normal-base')) || 0;
      const start = performance.now();
      const draw = (now) => {
        const progress = !duration || paused() ? 1 : clamp((now - start) / duration, 0, 1);
        const eased = 1 - (1 - progress) ** 3;
        layout = pointMap(target.map(({ id, x, y }) => ({
          id, x: origin.get(id).x + (x - origin.get(id).x) * eased, y: origin.get(id).y + (y - origin.get(id).y) * eased,
        })));
        paint();
        if (progress < 1) layoutFrame = requestAnimationFrame(draw);
      };
      draw(start);
    }

    function revealNode(id) {
      const point = layout.get(id);
      const bound = 0.5 / camera.zoom;
      if (Math.abs(camera.x - point.x) > bound || Math.abs(camera.y - point.y) > bound) {
        setCamera(point.x, point.y);
      }
    }

    function navigateNodes(origin, [dx, dy]) {
      if (!origin) {
        if (roving) nodeMarks.get(roving).button.focus({ preventScroll: true });
        return;
      }
      const from = screenPoints.get(origin);
      let next;
      let best = Infinity;
      for (const id of visible) {
        const { x, y } = screenPoints.get(id);
        const along = (x - from.x) * dx + (y - from.y) * dy;
        const across = (x - from.x) * dy - (y - from.y) * dx;
        const score = along + 2 * Math.abs(across);
        if (along > 0.5 && score < best) {
          best = score;
          next = id;
        }
      }
      if (next) nodeMarks.get(next).button.focus({ preventScroll: true });
    }

    function clearSelection() {
      selected.clear();
      matches.clear();
      hovered = null;
      focused = null;
      updateFocus();
      updateLedger();
    }

    canvas.addEventListener('keydown', (event) => {
      const direction = DIRECTIONS[event.key];
      if (direction) {
        const [dx, dy] = direction;
        if (event.altKey) setCamera(camera.x + dx * 0.08, camera.y + dy * 0.08);
        else navigateNodes(event.target.dataset.node, direction);
      } else if (event.key === '+' || event.key === '=') zoomBy(0.25);
      else if (event.key === '-') zoomBy(-0.25);
      else if (event.key === 'Home') setCamera(0.5, 0.5, 1);
      else if (event.key === 'Escape') clearSelection();
      else return;
      event.preventDefault();
    });

    function localPoint(event) {
      const rect = canvas.getBoundingClientRect();
      return { x: event.clientX - rect.left, y: event.clientY - rect.top };
    }

    canvas.addEventListener('pointerdown', (event) => {
      if (!event.isPrimary || event.button !== 0 || event.target.closest('.vi-graph-node')) return;
      const start = localPoint(event);
      drag = { id: event.pointerId, start, camera: { ...camera }, reached: false, vertices: [start] };
      canvas.setPointerCapture(event.pointerId);
      canvas.focus({ preventScroll: true });
      hovered = focused = null;
      updateFocus();
    });

    function selectionVertices(current) {
      const { x, y } = drag.start;
      return mode === 'box' ? [drag.start, { x: current.x, y }, current, { x, y: current.y }] : drag.vertices;
    }

    canvas.addEventListener('pointermove', (event) => {
      if (event.pointerId !== drag?.id) return;
      const current = localPoint(event);
      const dx = current.x - drag.start.x;
      const dy = current.y - drag.start.y;
      if (!drag.reached && Math.hypot(dx, dy) < 4) return;
      drag.reached = true;
      if (mode === 'point') {
        const { width, height } = plot();
        canvas.dataset.dragging = '';
        setCamera(drag.camera.x - dx / (width * camera.zoom), drag.camera.y - dy / (height * camera.zoom));
      } else {
        drag.vertices.push(current);
        const points = selectionVertices(current);
        gesture.setAttribute('points', [...points, points[0]].map(({ x, y }) => x + ',' + y).join(' '));
        gesture.setAttribute('visibility', 'visible');
      }
    });

    function stopDrag(event) {
      if (event.pointerId !== drag?.id) return;
      if (event.type === 'pointerup' && drag.reached && mode !== 'point') {
        const current = localPoint(event);
        if (mode === 'lasso') drag.vertices.push(current);
        const vertices = selectionVertices(current);
        selected = new Set([...visible].filter((id) => {
          const { x, y } = screenPoints.get(id);
          return containsPoint(vertices, x, y);
        }));
        updateFocus();
        updateLedger();
      } else if (event.type === 'pointerup' && !drag.reached) {
        clearSelection();
      }
      drag = null;
      delete canvas.dataset.dragging;
      gesture.setAttribute('visibility', 'hidden');
    }

    for (const name of ['pointerup', 'pointercancel', 'lostpointercapture']) canvas.addEventListener(name, stopDrag);

    function mapPosition(event) {
      const rect = minimap.getBoundingClientRect();
      return { x: ((event.clientX - rect.left) / rect.width * 100 - miniInset) / miniSpan,
        y: ((event.clientY - rect.top) / rect.height * 100 - miniInset) / miniSpan };
    }

    minimap.addEventListener('pointerdown', (event) => {
      if (!event.isPrimary || event.button !== 0) return;
      const { x, y } = mapPosition(event);
      const size = 0.5 / camera.zoom;
      const inside = Math.abs(x - camera.x) <= size && Math.abs(y - camera.y) <= size;
      mapGrab = { id: event.pointerId, x: inside ? camera.x - x : 0, y: inside ? camera.y - y : 0 };
      minimap.setPointerCapture(event.pointerId);
      minimap.focus({ preventScroll: true });
      setCamera(x + mapGrab.x, y + mapGrab.y);
    });

    minimap.addEventListener('pointermove', (event) => {
      if (event.pointerId !== mapGrab?.id) return;
      const { x, y } = mapPosition(event);
      setCamera(x + mapGrab.x, y + mapGrab.y);
    });

    for (const name of ['pointerup', 'pointercancel', 'lostpointercapture']) {
      minimap.addEventListener(name, (event) => { if (event.pointerId === mapGrab?.id) mapGrab = null; });
    }

    minimap.addEventListener('keydown', (event) => {
      const direction = DIRECTIONS[event.key];
      if (!direction) return;
      setCamera(camera.x + direction[0] * 0.08, camera.y + direction[1] * 0.08);
      event.preventDefault();
    });

    const toolButtons = elements('[data-graph-toolbar] button');
    $('[data-graph-toolbar]').addEventListener('keydown', (event) => {
      const index = toolButtons.indexOf(event.target);
      const step = event.key === 'ArrowDown' ? 1 : event.key === 'ArrowUp' ? -1 : 0;
      if (index < 0 || !step) return;
      toolButtons[(index + step + toolButtons.length) % toolButtons.length].focus();
      event.preventDefault();
    });
    for (const button of toolButtons) button.addEventListener('focus', () => {
      toolButtons.forEach((tool) => { tool.tabIndex = tool === button ? 0 : -1; });
    });
    for (const button of elements('[data-graph-mode]')) button.addEventListener('click', () => {
      mode = button.dataset.graphMode;
      stage.dataset.mode = mode;
      elements('[data-graph-mode]').forEach((tool) => tool.setAttribute('aria-pressed', String(tool === button)));
    });

    function activateTab(tab) {
      for (const candidate of tabs) {
        const active = tab === candidate;
        candidate.setAttribute('aria-selected', String(active));
        candidate.tabIndex = active ? 0 : -1;
        $('#' + candidate.getAttribute('aria-controls')).hidden = !active;
      }
    }

    for (const tab of tabs) {
      tab.addEventListener('click', () => activateTab(tab));
      tab.addEventListener('keydown', (event) => {
        if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
        const next = event.key === 'Home' ? tabs[0] : event.key === 'End' ? tabs.at(-1) : tabs.find((candidate) => candidate !== tab);
        activateTab(next);
        next.focus();
        event.preventDefault();
      });
    }
    for (const radio of scopes) radio.addEventListener('change', () => {
      scope = radio.value;
      updateVisibility();
    });
    sceneButton.addEventListener('click', () => {
      scope = scope === 'in' ? 'all' : 'in';
      updateVisibility();
    });
    $('[data-graph-labels]').addEventListener('click', (event) => {
      const on = stage.dataset.labels === 'off';
      stage.dataset.labels = on ? 'on' : 'off';
      event.currentTarget.setAttribute('aria-pressed', String(on));
      $('[data-graph-label-state]').textContent = on ? 'On' : 'Off';
    });

    const dockVisible = () => getComputedStyle(dock).display !== 'none';
    for (const trigger of legendTriggers) trigger.addEventListener('click', () => {
      if (dockVisible()) {
        tabs.find((tab) => tab.tabIndex === 0).focus();
        return;
      }
      legendInvoker = trigger;
      drawer.append(inspector);
      closeLegend.hidden = false;
      drawer.showModal();
      trigger.setAttribute('aria-expanded', 'true');
      closeLegend.focus();
    });
    closeLegend.addEventListener('click', () => drawer.close());
    drawer.addEventListener('close', () => {
      dock.append(inspector);
      closeLegend.hidden = true;
      const docked = dockVisible();
      if (!docked || legendInvoker !== filters) legendInvoker?.setAttribute('aria-expanded', 'false');
      const target = docked ? tabs.find((tab) => tab.tabIndex === 0) : legendInvoker;
      target?.focus({ preventScroll: true });
      legendInvoker = null;
    });

    function toggleTime(open) {
      timePanel.hidden = !open;
      time.setAttribute('aria-expanded', String(open));
      (open ? epoch : time).focus({ preventScroll: true });
    }

    time.addEventListener('click', () => toggleTime(timePanel.hidden));
    epoch.addEventListener('change', updateVisibility);
    ledgerTrigger.addEventListener('click', () => {
      ledger.hidden = !ledger.hidden;
      ledgerTrigger.setAttribute('aria-expanded', String(!ledger.hidden));
      updateLedger();
    });
    root.addEventListener('keydown', (event) => {
      if (event.key !== 'Escape' || event.defaultPrevented || drawer.open) return;
      if (!timePanel.hidden) toggleTime(false);
      else if (!ledger.hidden) {
        ledger.hidden = true;
        ledgerTrigger.setAttribute('aria-expanded', 'false');
        ledgerTrigger.focus({ preventScroll: true });
      } else return;
      event.preventDefault();
    });
    for (const button of elements('[data-graph-zoom]')) button.addEventListener('click', () => {
      const action = button.dataset.graphZoom;
      if (action === 'fit') setCamera(0.5, 0.5, 1);
      else zoomBy(action === 'in' ? 0.25 : -0.25);
    });
    $('[data-graph-layout]').addEventListener('change', (event) => {
      if (event.target.value !== layoutName) changeLayout(event.target.value);
    });

    function setRun(state, message) {
      root.dataset.runState = state;
      status.textContent = message;
    }

    async function runQuery() {
      if (running) return;
      running = true;
      const value = query.value.trim();
      if (document.activeElement === retry) query.focus({ preventScroll: true });
      error.hidden = true;
      query.removeAttribute('aria-invalid');
      query.removeAttribute('aria-errormessage');
      query.readOnly = true;
      submit.setAttribute('aria-disabled', 'true');
      setRun('send', 'Query submitted');
      try {
        await pause(120);
        setRun('waiting', 'Preparing matches');
        await pause(240);
        const result = value ? queryScene(value, graph) : defaultScene;
        streaming = new Set();
        setRun('streaming', '0 of ' + result.length + ' matches received');
        await pause(140);
        for (let at = 0; at < result.length; at += 3) {
          result.slice(at, at + 3).forEach((id) => streaming.add(id));
          status.textContent = streaming.size + ' of ' + result.length + ' matches received';
          updateLegendCounts();
          updateFocus();
          await pause(140);
        }
        scene = new Set(result);
        matches = new Set(value ? result : []);
        selected.clear();
        if (scope === 'off') scope = 'all';
        updateVisibility();
        setRun('finish', value ? result.length + (result.length === 1 ? ' match' : ' matches') + ' in scene' : 'Default scene restored');
      } catch (failure) {
        setRun('failure', 'Query failed · previous scene kept');
        const errorText = $('[data-graph-error-text]');
        errorText.id = 'graph-query-error';
        errorText.textContent = (failure.code || 'GRAPH_QUERY_FAILURE') + ' · ' +
          (failure.code ? failure.message : 'The sample query could not finish. Try again.');
        error.hidden = false;
        query.setAttribute('aria-invalid', 'true');
        query.setAttribute('aria-errormessage', errorText.id);
      } finally {
        streaming = null;
        updateLegendCounts();
        updateFocus();
        query.readOnly = false;
        submit.removeAttribute('aria-disabled');
        running = false;
      }
    }

    $('[data-graph-form]').addEventListener('submit', (event) => {
      event.preventDefault();
      void runQuery();
    });
    retry.addEventListener('click', () => void runQuery());
    for (const example of elements('[data-graph-example]')) {
      example.disabled = false;
      example.addEventListener('click', () => {
        if (running) return;
        query.value = example.dataset.graphExample;
        void runQuery();
      });
    }
    const onResize = () => {
      if (dockVisible()) {
        if (drawer.open) drawer.close();
        filters.removeAttribute('aria-haspopup');
        filters.removeAttribute('aria-expanded');
        filters.setAttribute('aria-controls', 'graph-inspector');
      } else {
        filters.setAttribute('aria-haspopup', 'dialog');
        filters.setAttribute('aria-expanded', String(drawer.open && legendInvoker === filters));
        filters.setAttribute('aria-controls', 'graph-legend-drawer');
      }
      paint();
    };
    const observer = new ResizeObserver(onResize);
    observer.observe(canvas);
    observer.observe(minimap);
    query.disabled = submit.disabled = false;
    stage.dataset.mode = mode;
    stage.dataset.labels = 'on';
    setRun('start', graph.nodes.length + ' nodes · ' + graph.edges.length + ' relationships');
    updateVisibility();
    if (window.top === window) query.focus({ preventScroll: true });
  }

  async function loadExplorer(root, source, restoreFocus = false) {
    const feedback = root.querySelector('[data-graph-error]');
    const retry = root.querySelector('[data-graph-retry]');
    let graph;
    try {
      const response = await fetch(source);
      if (!response.ok) throw new Error('Fixture unavailable');
      graph = await response.json();
      if (graph.synthetic !== true || !graph.nodes?.length || !graph.layouts?.force?.length) {
        throw new Error('Invalid sample graph');
      }
    } catch {
      root.dataset.runState = 'failure';
      root.querySelector('[data-graph-status]').textContent = 'Sample graph unavailable';
      root.querySelector('[data-graph-error-text]').textContent = 'GRAPH_DATA_UNAVAILABLE · Try loading the sample again.';
      feedback.hidden = false;
      retry.addEventListener('click', () => {
        feedback.hidden = true;
        void loadExplorer(root, source, true);
      }, { once: true });
      return;
    }
    connectExplorer(root, graph);
    if (restoreFocus) root.querySelector('#graph-query').focus({ preventScroll: true });
  }

  if (typeof module === 'object' && module.exports) module.exports = { queryScene, containsPoint };
  if (typeof document !== 'undefined' && document.currentScript?.src) {
    const source = new URL('memory-graph-explorer.json', document.currentScript.src);
    document.querySelectorAll('[data-graph-explorer]').forEach((root) => void loadExplorer(root, source));
  }
})();
