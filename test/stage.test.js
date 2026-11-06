/**
 * Stage backdrop primitive contract (ADR-013 item 1): lib/stage.js, lib/stage.css and the
 * catalog fragment. Contrast is computed from the same alpha table the renderer paints.
 */

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const { parseFrontMatter, emitStageArtifacts } = require('../scripts/generate-tokens');
const { stageFragment } = require('../scripts/generate-stage-fragment');
const stage = require('../lib/stage');
const { contrastRatio, worstContrastOver, over, hexToRgb } = require('../lib/contrast');

const ROOT = path.join(__dirname, '..');
const TOKENS = parseFrontMatter(fs.readFileSync(path.join(ROOT, 'DESIGN.md'), 'utf-8'));
const BRAND = JSON.parse(fs.readFileSync(path.join(ROOT, 'brand', 'tokens.json'), 'utf-8'));
const CSS = fs.readFileSync(path.join(ROOT, 'lib', 'stage.css'), 'utf-8');
const CANON = ['violet', 'wisteria', 'xylia', 'yarrow', 'zinnia'];
// The stage sits behind the page field: the system's primary surface and the brand dark field.
const PALETTE = stage.stagePaletteFromTokens(TOKENS, { extraFields: [BRAND['brand-field-dark']] });

// --- Contrast ----------------------------------------------------------------

test('the contrast module matches published WCAG values', () => {
  assert.equal(contrastRatio('#FFFFFF', '#000000').toFixed(2), '21.00');
  assert.equal(contrastRatio('#777777', '#FFFFFF').toFixed(2), '4.48');
  assert.equal(contrastRatio('#FFF', '#FFFFFF'), 1);
  assert.deepEqual(over([255, 255, 255], 0.5, [0, 0, 0]), [127.5, 127.5, 127.5]);
  assert.throws(() => hexToRgb('red'), /expected #RRGGBB/);
  // Two coats are always at least as close to the paint as one.
  const one = worstContrastOver({ text: '#A1A1AA', field: '#0A0A0E', paints: ['#8B5CF6'], alpha: 0.2 });
  const two = worstContrastOver({ text: '#A1A1AA', field: '#0A0A0E', paints: ['#8B5CF6'], alpha: 0.2, layers: 2 });
  assert.ok(two <= one);
});

test('the ambient stage keeps secondary text at 4.5:1 over the page field, glows counted twice', () => {
  const report = stage.stageContrastReport({ palette: PALETTE });
  assert.equal(report.opacity, stage.STAGE_VARIANT_OPACITY.ambient);
  assert.deepEqual(report.layers.filter((layer) => !layer.passes), []);
  assert.ok(stage.STAGE_VARIANT_OPACITY.ambient <= stage.maxSafeStageOpacity({ palette: PALETTE }));
  assert.ok(stage.STAGE_NARROW_AMBIENT_OPACITY <= stage.STAGE_VARIANT_OPACITY.ambient);
});

test('hero copy on the scrim keeps 4.5:1 over a full-strength stage', () => {
  const report = stage.stageContrastReport({ palette: PALETTE, opacity: stage.STAGE_VARIANT_OPACITY.hero, scrim: stage.STAGE_TEXT_SCRIM });
  assert.deepEqual(report.layers.filter((layer) => !layer.passes), []);
});

test('the report fails closed: a full-strength stage with no scrim does not pass', () => {
  const report = stage.stageContrastReport({ palette: PALETTE, opacity: 1 });
  assert.equal(report.passes, false);
  assert.ok(stage.maxSafeStageOpacity({ palette: PALETTE }) < 1);
});

// --- Geometry and brand rules ------------------------------------------------

test('the five lights sit on the arc in canon order with Xylia at the crown', () => {
  assert.deepEqual(stage.arcLights.map((light) => light.persona), CANON);
  assert.equal(stage.arcLights[2].x, stage.ARC.cx);
  assert.ok(stage.arcLights.every((light, i) => i === 2 || light.y > stage.arcLights[2].y));
});

test('the stage ring is five single-colour segments in the canon cycle with no gaps', () => {
  const ring = stage.ringSegments;
  assert.equal(ring.length, 5);
  assert.deepEqual(new Set(ring.map((s) => s.persona)), new Set(CANON));
  for (let i = 0; i < ring.length; i += 1) {
    const next = ring[(i + 1) % ring.length];
    assert.equal((CANON.indexOf(ring[i].persona) - CANON.indexOf(next.persona) + 5) % 5, 1);
    if (i < ring.length - 1) assert.equal(ring[i].to, next.from);
  }
  assert.equal(ring.at(-1).to - ring[0].from, 360);
});

test('the renderer is deterministic, escapes nothing it does not own, and validates input', () => {
  assert.equal(stage.renderStageSvg({ variant: 'ambient' }), stage.renderStageSvg({ variant: 'ambient' }));
  assert.throws(() => stage.renderStageSvg({ variant: 'loud' }), /unknown stage variant/);
  assert.throws(() => stage.renderStageSvg({ idPrefix: '"><script>' }), /lowercase slug/);
  const a = stage.renderStageSvg({ variant: 'hero', idPrefix: 'one' });
  const b = stage.renderStageSvg({ variant: 'hero', idPrefix: 'two' });
  const ids = (svg) => [...svg.matchAll(/\bid="([^"]+)"/g)].map((m) => m[1]);
  assert.equal(ids(a).filter((id) => ids(b).includes(id)).length, 0, 'two stages on one page must not share ids');
});

for (const variant of Object.keys(stage.STAGE_VARIANT_OPACITY)) {
  test(`the ${variant} SVG is decorative, CSP-safe and keeps one signature colour per gradient`, () => {
    const svg = stage.renderStageSvg({ variant });
    assert.match(svg, /^<svg class="stage stage--[a-z]+" xmlns="http:\/\/www\.w3\.org\/2000\/svg"/);
    assert.match(svg, /aria-hidden="true"/);
    assert.match(svg, /focusable="false"/);
    assert.match(svg, new RegExp(`opacity="${stage.STAGE_VARIANT_OPACITY[variant]}"`));
    assert.doesNotMatch(svg, /\bstyle=|<script|<text|<title/i);
    // Every colour comes from a class; no literal hex or named fill in the markup.
    assert.doesNotMatch(svg, /#[0-9a-f]{3,6}\b|fill="(?!url\()/i);
    for (const [, body] of svg.matchAll(/<(?:radial|linear)Gradient[^>]*>([\s\S]*?)<\/(?:radial|linear)Gradient>/g)) {
      assert.equal(new Set([...body.matchAll(/stage-stop--([a-z]+)/g)].map((m) => m[1])).size, 1, body);
    }
    // Every alpha the renderer paints is one from the table the contrast report checks.
    const table = new Set([0, ...Object.values(stage.STAGE_ALPHA).map((layer) => layer.alpha)]);
    for (const [, value] of svg.matchAll(/(?:stop|fill|stroke)-opacity="([\d.]+)"/g)) {
      assert.ok(table.has(Number(value)), `alpha ${value} is not in STAGE_ALPHA`);
    }
    assert.deepEqual([...svg.matchAll(/class="stage__light" data-persona="([a-z]+)"/g)].map((m) => m[1]), CANON);
  });
}

// --- Stylesheet ----------------------------------------------------------------

test('lib/stage.css reads emitted tokens only and paints every persona class', () => {
  const vars = new Set([...CSS.matchAll(/var\((--[a-z0-9-]+)/g)].map((m) => m[1]));
  const emitted = fs.readFileSync(path.join(ROOT, 'dist', 'tokens.css'), 'utf-8');
  for (const name of vars) {
    assert.ok(name.startsWith('--vi-'), `${name} is not a videsign token`);
    assert.ok(emitted.includes(`${name}:`), `${name} is not emitted by dist/tokens.css`);
  }
  assert.doesNotMatch(CSS, /#[0-9a-f]{3,6}\b/i, 'no literal colours');
  for (const persona of CANON) {
    for (const kind of ['stop', 'tint', 'line']) assert.match(CSS, new RegExp(`\\.stage-${kind}--${persona} \\{`));
  }
  assert.match(CSS, new RegExp(`opacity: ${stage.STAGE_NARROW_AMBIENT_OPACITY};`));
});

test('lib/stage.css animates transform and opacity only and stops on request', () => {
  const keyframes = [...CSS.matchAll(/@keyframes [\w-]+ \{([\s\S]*?)\n\}/g)];
  assert.ok(keyframes.length >= 3);
  for (const [, body] of keyframes) {
    const properties = [...body.matchAll(/([a-z-]+)\s*:/g)].map((m) => m[1]);
    assert.ok(properties.every((p) => p === 'transform' || p === 'opacity'), body);
  }
  assert.match(CSS, /:root\[data-motion="paused"\] \.stage \*/);
  assert.match(CSS, /@media \(prefers-reduced-motion: reduce\) \{[\s\S]*?animation: none;/);
  assert.match(CSS, /@media \(forced-colors: active\) \{\s*\.stage \{\s*display: none;/);
  // Tints mix a signature colour with transparent; never with another signature colour.
  const mixes = CSS.match(/color-mix\(/g) ?? [];
  const tints = [...CSS.matchAll(/color-mix\(in srgb, var\(--vi-colors-persona-accent-[a-z]+-base\) \d+%, transparent\)/g)];
  assert.equal(tints.length, mixes.length);
});

// --- Generated outputs ---------------------------------------------------------

test('npm run tokens ships the stylesheet and one SVG per variant', () => {
  const outputs = emitStageArtifacts();
  assert.deepEqual(Object.keys(outputs).sort(), ['stage-ambient.svg', 'stage-hero.svg', 'stage.css']);
  assert.equal(outputs['stage.css'], CSS);
  assert.equal(outputs['stage-hero.svg'], `${stage.renderStageSvg({ variant: 'hero' })}\n`);
});

test('the catalog fragment is exactly what the renderer produces', () => {
  const committed = fs.readFileSync(path.join(ROOT, 'preview', 'stage-backdrop.html'), 'utf-8');
  assert.equal(committed, stageFragment(), 'preview/stage-backdrop.html drifted; run `npm run stage:fragment`');
});
