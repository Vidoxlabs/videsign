# Memory Field (ADR-018) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a shared, deterministic memory-field primitive (constellation + pipeline) that vidoxlabs.dev renders at build time and ViWeb renders at runtime, with the same look from one source.

**Architecture:** Follows the ADR-013 stage precedent. `lib/memory-field.js` is pure (layout, SVG, text equivalent, contrast report, pipeline SVG); `lib/memory-field.css` carries every visual and the four motions from emitted tokens; `npm run tokens` ships both to `dist/`; the MCP tool `memory_field` returns SVG plus report; `dist/standard.json` carries `rules.memoryField`.

**Tech Stack:** Node (CommonJS, `node:test`), SVG, CSS (tokens via `--vi-colors-*`), MCP stdio server.

**Spec:** `SKILL.md` § ADR-018 (written in Task 1). Design approved in session 2026-11-18 (sections 1 and 2; sections 3 to 5 written into the ADR on the owner's instruction to keep going).

## Global Constraints

- Animated properties: `transform` and `opacity` only (ADR-008). No `stroke-dashoffset` animation.
- Durations and easings come from tokens: 150/200/300/500ms, ambient drift 32s, pulse 6s.
- Every motion renders its final state under `prefers-reduced-motion: reduce` and under `[data-motion="paused"]` on the root (WCAG 2.2.2).
- No inline `style` attribute in emitted SVG; colour from classes only (`style-src 'self'`).
- Meaningful (lit) lines reach ≥ 3:1 on every surface of their theme (WCAG 1.4.11, ADR-013 item 4). Rest edges are `aria-hidden`.
- Link tokens stay ≥ 15 ΔE00 from every persona and status hex and ≥ 20 ΔE00 from each other.
- No persona colour marks a link type (ADR-004, ADR-017 item 8). Never colour alone: each code also has a dash or marker and a text label.
- Deterministic: no `Math.random`, no clock. Same input and seed give byte-identical output.
- Budget: ≤ 300 nodes and ≤ 3,000 edges, else typed error `MEMORY_FIELD_OVER_BUDGET`.

## File Structure

- Modify `DESIGN.md`: eight `border-graph-{cluster,reasoned,linked,tree}-{base,light}` colour tokens.
- Modify `SKILL.md`: ADR-018 record.
- Create `lib/memory-field.js`: constants, `layoutMemoryField`, `renderMemoryFieldSvg`, `renderMemoryFieldTable`, `memoryFieldContrastReport`, `renderMemoryPipelineSvg`.
- Create `lib/memory-field.css`: link, node and state styling; the four motions.
- Create `test/memory-field.test.js`.
- Modify `scripts/generate-tokens.js` (emit `dist/memory-field.css`, `dist/memory-field-sample.svg`, `dist/memory-pipeline-sample.svg`), `scripts/generate-standard.js` (`rules.memoryField`), `mcp-server.js` (`memory_field` tool), `package.json` test list if needed.
- Create `scripts/generate-memory-field-fragment.js` and generated `preview/memory-field.html`, `preview/memory-pipeline.html`; register them in `preview/index.html`.
- Modify `AGENTS.md`: list the primitive and tool.

---

### Task 1: Tokens and ADR-018 record

**Files:** Modify `DESIGN.md`, `SKILL.md`; Test `test/memory-field.test.js` (token section).

**Produces:** tokens `border-graph-cluster-base #5EEAD4`, `-light #0F766E`; `border-graph-reasoned-base #FDE047`, `-light #854D0E`; `border-graph-linked-base #60A5FA`, `-light #0369A1`; `border-graph-tree-base #FECDD3`, `-light #86198F`.

- [ ] Write failing tests: each base token ≥ 3:1 on the three dark surfaces, each light token ≥ 3:1 on the three light surfaces; ΔE00 ≥ 15 to every persona/status hex; pairwise ≥ 20.
- [ ] Run `node --test test/memory-field.test.js`; expect FAIL (tokens missing).
- [ ] Add tokens to `DESIGN.md` beside `border-graph-line-*`; write ADR-018 in `SKILL.md`.
- [ ] Run `npm run tokens && npm test`; expect PASS (fix any token-contract tests that enumerate colours).
- [ ] Commit `Add ADR-018 memory field and the four graph link tokens.`

### Task 2: Deterministic layout

**Produces:** `layoutMemoryField(data, { seed = 1, width = 960, height = 600, iterations = 240 }) -> { width, height, nodes: [{ id, label, cls, group, href, x, y, r, band }], edges: [{ id, source, target, code, count, x1, y1, x2, y2, cx, cy, length, angle }], synthetic }`. Throws `MemoryFieldError` with `code` `MEMORY_FIELD_OVER_BUDGET` or `MEMORY_FIELD_INVALID`.

- [ ] Tests: identical output for identical input (JSON equal) and for shuffled-free reruns; different seed changes positions; all nodes inside bounds minus radius; unknown edge endpoint → `MEMORY_FIELD_INVALID`; unknown code/class → `MEMORY_FIELD_INVALID`; 301 nodes → `MEMORY_FIELD_OVER_BUDGET`; radius steps are exactly the three `NODE_RADII`; band from `lastRecalledAt` relative to `now` input (no clock).
- [ ] Implement mulberry32 PRNG, group ring seeding, fixed-step force relaxation (repulsion, edge spring, group gravity, centre gravity, cooling), clamp, round to 0.1.
- [ ] Commit.

### Task 3: SVG, text equivalent, contrast report

**Produces:** `renderMemoryFieldSvg(layout, { title, desc, focus = null })` string; `renderMemoryFieldTable(layout)` HTML string; `memoryFieldContrastReport(tokens, { theme = 'base' })` → `{ theme, minContrast, links: { CR: { token, value, worst, surfaces } ... }, pass }`.

- [ ] Tests: SVG has `role="group"`, `<title>`/`<desc>`, a rest layer with `aria-hidden="true"`, no `style=` attribute, every node carries `data-class`/`data-band`, every lit edge carries `data-code`; focus marks lit/dim states; `synthetic: true` prints the synthetic caption; table lists every node with links grouped by code label; report passes for both themes and fails when a token is swapped for the hairline.
- [ ] Implement.
- [ ] Commit.

### Task 4: Stylesheet and the four motions

**Files:** `lib/memory-field.css`.

- [ ] Tests (parse CSS text): every `@keyframes` only touches `transform`/`opacity`; every link code maps to its `--vi-colors-border-graph-*` variable; light theme block remaps under `[data-theme="light"]`; a `prefers-reduced-motion: reduce` block and a `[data-motion="paused"]` block set `animation: none`; no hex literals.
- [ ] Implement motions: entrance draw-in (`scaleX` on lit edge lines, node fade by band), recall pulse (`data-state="recalling"`: a pulse dot translated along each lit edge, then non-hits dim), Forget retraction (`data-state="forgetting"`: edges `scaleX` to 0 toward the node, node fades), ambient drift (`.vi-mf--ambient` slow translate of the rest layer on the drift token) and pipeline flow (pulse dots translating along pipeline connectors on the pulse token).
- [ ] Commit.

### Task 5: Pipeline renderer

**Produces:** `renderMemoryPipelineSvg(spec, { title, desc })` where `spec = { width, height, groups: [{ id, label, x, y, w, h }], stages: [{ id, label, sub, x, y, w, h, kind: 'store' | 'step' }], flows: [{ from, to, label, code? }] }`; `SAMPLE_PIPELINE` (the Vidoxlabs memory architecture, synthetic-free: names real components only).

- [ ] Tests: deterministic; stores render cylinder paths, steps render rounded rects; every flow has an arrow marker, a pulse element and a text label; unknown stage id → `MEMORY_FIELD_INVALID`; no `style=`.
- [ ] Implement.
- [ ] Commit.

### Task 6: Distribution

- [ ] `generate-tokens.js` emits `memory-field.css` and the two sample SVGs; extend the token test that lists dist outputs.
- [ ] `generate-standard.js` adds `rules.memoryField` (codes, tokens, budget, motions, stopsUnder) and an ADR-018 section in `standard.md`; `test/standard.test.js` asserts parity.
- [ ] `mcp-server.js` adds `memory_field` (input: `data`, `seed`, `width`, `height`, `theme`, `includeSvg`; output: report + svg + table); MCP smoke test lists it.
- [ ] Generated fragments `preview/memory-field.html`, `preview/memory-pipeline.html`; catalog entry; `npm run lint` passes.
- [ ] `AGENTS.md` lists the primitive and tool.
- [ ] Run `npm run tokens && npm run lint && npm test`; commit; push branch; open draft PR stacked on `feat/adr-014-conversation-surface`.
