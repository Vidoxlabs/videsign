/**
 * Persona dialect contract (ADR-015): moderate dialects, agent surfaces only. Every setting
 * resolves an existing token of the right kind, the stylesheet never leaves `.vi-agent`, and the
 * brand rules (no gradient between signature colours, Xylia never text or alone) still hold.
 */

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const { parseFrontMatter, emitDialectArtifacts } = require('../scripts/generate-tokens');
const { classify } = require('../scripts/lib/token-values');
const { dialectFragment } = require('../scripts/generate-dialect-fragment');
const { PERSONAS, CONTENT_KINDS, DIALECTS, MOTIFS, emitDialectCss, resolveDialects } = require('../lib/dialects');

const ROOT = path.join(__dirname, '..');
const TOKENS = parseFrontMatter(fs.readFileSync(path.join(ROOT, 'DESIGN.md'), 'utf-8'));
const PALETTE = JSON.parse(fs.readFileSync(path.join(ROOT, 'canon', 'vwxyz', 'palette.json'), 'utf-8'));
const CSS = emitDialectCss();
const INTERACTION_DURATIONS = ['fast', 'normal', 'slow', 'entrance'].map((k) => `transition.transition-duration-${k}-base`);

const kindOf = (ref) => {
  const [category, key] = ref.split('.');
  assert.ok(TOKENS[category] && key in TOKENS[category], `missing token ${ref}`);
  return classify(TOKENS[category][key], key).kind;
};

test('the five seats are defined in canon order and quote their canon setting and mood', () => {
  assert.deepEqual(Object.keys(DIALECTS), PERSONAS);
  assert.deepEqual(PERSONAS, ['violet', 'wisteria', 'xylia', 'yarrow', 'zinnia']);
  for (const persona of PERSONAS) {
    assert.equal(DIALECTS[persona].canon.setting, PALETTE.vi[persona].background.name, persona);
    assert.equal(DIALECTS[persona].canon.mood, PALETTE.vi[persona].background.mood, persona);
  }
});

test('every setting references an existing token of the right kind', () => {
  for (const persona of PERSONAS) {
    const d = DIALECTS[persona];
    for (const ref of [d.motion.duration, d.motion.entrance]) {
      assert.equal(kindOf(ref), 'duration', `${persona} ${ref}`);
      // Dialects use interaction timings only; the ambient loops are not a dialect tempo.
      assert.ok(INTERACTION_DURATIONS.includes(ref), `${persona} uses ${ref}`);
    }
    assert.equal(kindOf(d.motion.easing), 'cubicBezier', persona);
    assert.equal(kindOf(d.density.gap), 'dimension', persona);
    assert.equal(kindOf(d.density.padding), 'dimension', persona);
    assert.equal(kindOf(d.type.labelFamily), 'fontFamily', persona);
    assert.ok(['em', 'number'].includes(kindOf(d.type.labelTracking)), persona);
    assert.equal(kindOf(d.type.leading), 'number', persona);
    assert.ok(['tabular-nums', 'proportional-nums'].includes(d.type.numerals), persona);
  }
});

test('the dialects are moderate: they differ, but within the shared scale', () => {
  const signature = (d) => JSON.stringify([d.motion, d.density, d.type, d.motif]);
  assert.equal(new Set(PERSONAS.map((p) => signature(DIALECTS[p]))).size, 5, 'each seat has its own dialect');
  assert.equal(new Set(PERSONAS.map((p) => DIALECTS[p].motif)).size, 5, 'each seat has its own motif');
  // Entrance never runs faster than the seat's own interaction tempo.
  for (const persona of PERSONAS) {
    const seconds = (ref) => classify(TOKENS.transition[ref.split('.')[1]]).seconds;
    assert.ok(seconds(DIALECTS[persona].motion.entrance) >= seconds(DIALECTS[persona].motion.duration), persona);
  }
});

test('each seat leads with its own content and every reply closes with sources', () => {
  const firsts = PERSONAS.map((p) => DIALECTS[p].lead[0]);
  assert.equal(new Set(firsts).size, 5);
  assert.deepEqual(firsts, ['summary', 'options', 'limits', 'alternatives', 'steps']);
  for (const persona of PERSONAS) {
    const lead = DIALECTS[persona].lead;
    assert.ok(lead.every((kind) => CONTENT_KINDS.includes(kind)), persona);
    assert.equal(lead.at(-1), 'sources', persona);
  }
});

test('the stylesheet stays on agent surfaces and never reorders content with CSS', () => {
  const selectors = [...CSS.matchAll(/^([^@\s/*}][^{]*)\{/gm)].map((m) => m[1].trim());
  assert.ok(selectors.length > 5);
  for (const selector of selectors) {
    for (const part of selector.split(',')) assert.ok(/^\.vi-agent($|[\s[_])/.test(part.trim()), part);
  }
  assert.doesNotMatch(CSS, /\border\s*:|flex-direction:\s*column-reverse|row-reverse/, 'DOM order is reading order');
  assert.match(CSS, /@media \(prefers-reduced-motion: reduce\) \{\s*\.vi-agent \[data-vi-motion\] \{\s*transition-duration: 0s;/);
  assert.match(CSS, /transition-property: opacity, transform;/);
  assert.match(CSS, /@media \(forced-colors: active\) \{\s*\.vi-agent__motif \{\s*background: none;/);
});

test('motifs paint one colour each, and Xylia\'s is monochrome', () => {
  for (const persona of PERSONAS) {
    const block = CSS.slice(CSS.indexOf(`.vi-agent[data-persona="${persona}"]`));
    const motif = block.match(/--vi-dialect-motif: ([^;]+);/)[1];
    const accents = new Set([...motif.matchAll(/persona-accent-([a-z]+)-base/g)].map((m) => m[1]));
    if (DIALECTS[persona].motif === 'hairline') {
      assert.equal(accents.size, 0, `${persona} motif must not use a signature colour`);
      assert.match(motif, /border-graph-line-base/);
    } else {
      assert.deepEqual([...accents], [persona], `${persona} motif must use only its own accent`);
    }
    for (const [, mix] of motif.matchAll(/color-mix\((in srgb, var\([^)]+\) \d+%, [a-z]+)\)/g)) assert.match(mix, /, transparent$/);
  }
  assert.equal(DIALECTS.xylia.motif, 'hairline');
  assert.equal(MOTIFS.hairline.paint, 'graph-line');
  // Text in a dialect keeps the text tokens: no persona accent is ever a text colour here.
  assert.doesNotMatch(CSS, /(^|[;{\s])color:\s*[^;]*persona-accent/m);
});

test('resolved dialects carry the same values as the tokens they reference', () => {
  const resolved = resolveDialects(TOKENS, classify);
  for (const persona of PERSONAS) {
    const d = DIALECTS[persona];
    const r = resolved[persona];
    assert.equal(r.motion.durationSeconds, classify(TOKENS.transition[d.motion.duration.split('.')[1]]).seconds);
    assert.deepEqual(r.motion.easing, classify(TOKENS.transition[d.motion.easing.split('.')[1]]).points);
    assert.equal(r.density.gapPoints, classify(TOKENS.space[d.density.gap.split('.')[1]]).points);
    assert.deepEqual(r.lead, d.lead);
  }
  assert.throws(() => resolveDialects({ ...TOKENS, transition: {} }, classify), /missing token/);
});

test('generated outputs match the module and the catalog fragment follows each lead order', () => {
  const outputs = emitDialectArtifacts(TOKENS);
  assert.equal(fs.readFileSync(path.join(ROOT, 'dist', 'dialects.css'), 'utf-8'), outputs['dialects.css']);
  assert.equal(fs.readFileSync(path.join(ROOT, 'dist', 'dialects.json'), 'utf-8'), outputs['dialects.json']);
  const fragment = fs.readFileSync(path.join(ROOT, 'preview', 'persona-dialects.html'), 'utf-8');
  assert.equal(fragment, dialectFragment(), 'preview/persona-dialects.html drifted; run `npm run dialects:fragment`');
  for (const persona of PERSONAS) {
    const card = fragment.slice(fragment.indexOf(`data-persona="${persona}"`)).split('</article>')[0];
    assert.deepEqual([...card.matchAll(/data-kind="([a-z]+)"/g)].map((m) => m[1]), DIALECTS[persona].lead, persona);
    assert.match(card, /class="vi-agent__motif" aria-hidden="true"/);
  }
});

test('every platform output carries the dialects', () => {
  const ts = fs.readFileSync(path.join(ROOT, 'dist', 'tokens.ts'), 'utf-8');
  const swift = fs.readFileSync(path.join(ROOT, 'dist', 'ViTokens.swift'), 'utf-8');
  const py = fs.readFileSync(path.join(ROOT, 'dist', 'videsign_tokens.py'), 'utf-8');
  assert.match(ts, /export const dialects = \{/);
  for (const persona of PERSONAS) {
    assert.match(swift, new RegExp(`public static let ${persona} = ViDialect\\(persona: "${persona}"`));
    assert.match(py, new RegExp(`"${persona}": MappingProxyType\\(\\{"role"`));
  }
  assert.match(swift, /public static func forPersona\(_ id: String\?\) -> ViDialect/);
});
