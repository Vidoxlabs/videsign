/**
 * Token contract tests for the videsign pipeline (ADR-006, ADR-007, ADR-008).
 *
 * These run against the real DESIGN.md and the real generators, so a token or
 * emitter regression fails here before any consuming repository sees it.
 */

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const {
  parseFrontMatter,
  emitCSS,
  emitTailwindConfig,
  emitGlassCSS,
} = require('../scripts/generate-tokens');

const DESIGN = fs.readFileSync(path.join(__dirname, '..', 'DESIGN.md'), 'utf-8');
const TOKENS = parseFrontMatter(DESIGN);

const px = (value) => Number.parseFloat(value.replace('px', ''));
const rem = (value) => Number.parseFloat(value.replace('rem', ''));

/** Evaluate the generated Tailwind config module text without writing it to disk. */
function loadTailwindConfig() {
  const module_ = { exports: {} };
  new Function('module', emitTailwindConfig(TOKENS))(module_);
  return module_.exports;
}

// --- ADR-006: crystal glass material ------------------------------------

test('crystal glass tokens exist with the approved starting values', () => {
  const fx = TOKENS.effects;
  assert.equal(fx['glass-crystal-surface-base'], 'rgba(255, 255, 255, 0.035)');
  assert.equal(fx['glass-crystal-rim-base'], 'rgba(255, 255, 255, 0.26)');
  assert.match(fx['glass-crystal-highlight-base'], /^inset 0 1px 0 rgba\(255, 255, 255, 0\.32\)/);
  assert.match(fx['glass-crystal-sheen-base'], /^linear-gradient\(160deg, rgba\(255, 255, 255, 0\.12\), rgba\(255, 255, 255, 0\) 35%\)$/);
  assert.match(fx['glass-crystal-shadow-base'], /rgba\(0, 0, 0, 0\.3\)$/);
  assert.match(fx['glass-crystal-backdrop-base'], /^blur\(\d+px\) brightness\([\d.]+\) saturate\(\d+%\)$/);
  for (const key of ['glass-crystal-surface-hover', 'glass-crystal-rim-hover', 'glass-crystal-core-base', 'glass-crystal-solid-base']) {
    assert.ok(fx[key], `missing effects.${key}`);
  }
});

test('the solid fallback surface is opaque', () => {
  assert.match(TOKENS.effects['glass-crystal-solid-base'], /^#[0-9A-Fa-f]{6}$/);
});

test('glass shell, bezel and core radii are concentric (20 = 6 + 14)', () => {
  const sp = TOKENS.spacing;
  assert.equal(sp['layout-radius-glass-base'], '20px');
  assert.equal(sp['layout-padding-bezel-base'], '6px');
  assert.equal(px(sp['layout-radius-glass-base']) - px(sp['layout-padding-bezel-base']), px(sp['layout-radius-standard-base']));
});

test('32px radii stay banned: no radius token reaches 32px', () => {
  for (const [key, value] of Object.entries(TOKENS.spacing)) {
    if (key.startsWith('layout-radius-') && key !== 'layout-radius-full-base') {
      assert.ok(px(value) < 32, `${key} = ${value}`);
    }
  }
});

test('effects hold only crystal and ambient CSS values (no legacy class strings)', () => {
  for (const key of Object.keys(TOKENS.effects)) {
    assert.ok(
      key.startsWith('glass-crystal-') || key.startsWith('ambient-'),
      `unexpected effects.${key}`,
    );
  }
  assert.equal(Object.keys(TOKENS.effects).some((k) => k.startsWith('glass-functional-')), false);
});

test('Tailwind config has no hardcoded backdropBlur scale', () => {
  const { theme } = loadTailwindConfig();
  assert.equal(theme.extend.backdropBlur, undefined);
});

test('tokens.css emits every effect under canonical names', () => {
  const css = emitCSS(TOKENS);
  for (const key of Object.keys(TOKENS.effects)) {
    assert.ok(css.includes(`--vi-effects-${key}:`), `missing --vi-effects-${key}`);
  }
});

// --- ADR-007: typography -------------------------------------------------

test('Geist and Geist Mono are the sans and mono families', () => {
  assert.match(TOKENS.typography['typography-family-sans-base'], /^Geist,/);
  assert.match(TOKENS.typography['typography-family-mono-base'], /^Geist Mono,/);
  assert.doesNotMatch(DESIGN.split('---')[1], /Inter|JetBrains/);
});

test('the Tailwind fontFamily map is derived from the tokens, not hardcoded', () => {
  const { theme } = loadTailwindConfig();
  const sans = theme.extend.fontFamily['typography-family-sans-base'];
  const mono = theme.extend.fontFamily['typography-family-mono-base'];
  assert.equal(sans[0], 'Geist');
  assert.equal(mono[0], 'Geist Mono');
  assert.deepEqual(sans, TOKENS.typography['typography-family-sans-base'].split(',').map((s) => s.trim()));
});

test('only fluid-hero exceeds the 3.5rem ceiling (ADR-005)', () => {
  for (const [key, value] of Object.entries(TOKENS.typography)) {
    if (!key.startsWith('typography-fluid-')) continue;
    const maxima = [...value.matchAll(/(\d+(?:\.\d+)?)rem/g)].map((m) => Number(m[1]));
    const peak = Math.max(...maxima);
    if (key === 'typography-fluid-hero-base') {
      assert.equal(peak, 5.25);
    } else {
      assert.ok(peak <= 3.5, `${key} peaks at ${peak}rem`);
    }
  }
});

// --- ADR-008: motion -----------------------------------------------------

test('motion tokens: standard and spring easings, 500ms entrance', () => {
  const t = TOKENS.transition;
  assert.equal(t['transition-easing-standard-base'], 'cubic-bezier(0.16, 1, 0.3, 1)');
  assert.equal(t['transition-easing-spring-base'], 'cubic-bezier(0.32, 0.72, 0, 1)');
  assert.equal(t['transition-duration-entrance-base'], '500ms');
  assert.equal(t['transition-duration-fast-base'], '150ms');
  assert.equal(t['transition-duration-normal-base'], '200ms');
  assert.equal(t['transition-duration-slow-base'], '300ms');
});

test('easings never overshoot (zero bounce): control-point y stays within 0..1', () => {
  for (const key of ['transition-easing-standard-base', 'transition-easing-spring-base']) {
    const [, y1, , y2] = TOKENS.transition[key].match(/cubic-bezier\(([^)]+)\)/)[1].split(',').map(Number);
    assert.ok(y1 >= 0 && y1 <= 1 && y2 >= 0 && y2 <= 1, `${key} overshoots`);
  }
});

test('Tailwind config splits durations and easings instead of mixing them', () => {
  const { theme } = loadTailwindConfig();
  const durations = Object.keys(theme.extend.transitionDuration);
  const easings = Object.keys(theme.extend.transitionTimingFunction);
  assert.ok(durations.length >= 4 && durations.every((k) => k.startsWith('transition-duration-')), durations.join());
  assert.ok(easings.length === 2 && easings.every((k) => k.startsWith('transition-easing-')), easings.join());
});

// --- ADR-006: generated glass stylesheet --------------------------------

const GLASS = emitGlassCSS(TOKENS);

test('glass.css has literal backdrop declarations with both prefixes (Safari)', () => {
  const backdrop = TOKENS.effects['glass-crystal-backdrop-base'];
  assert.ok(GLASS.includes(`backdrop-filter: ${backdrop};`), 'unprefixed literal missing');
  assert.ok(GLASS.includes(`-webkit-backdrop-filter: ${backdrop};`), 'prefixed literal missing');
  const decls = GLASS.split('\n').filter((l) => /backdrop-filter/.test(l));
  assert.ok(decls.length > 0);
  for (const line of decls) assert.doesNotMatch(line, /var\(/, `custom property inside backdrop-filter: ${line.trim()}`);
});

test('glass.css never transitions the backdrop filter', () => {
  assert.doesNotMatch(GLASS, /transition[^;]*backdrop/);
});

test('glass.css ships the solid fallback for every degraded environment', () => {
  const solid = TOKENS.effects['glass-crystal-solid-base'];
  const blocks = [
    '@media (prefers-reduced-transparency: reduce)',
    '@media (prefers-contrast: more)',
    '@media (forced-colors: active)',
    '@supports not ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px)))',
  ];
  for (const opener of blocks) {
    const at = GLASS.indexOf(opener);
    assert.ok(at >= 0, `missing ${opener}`);
    const block = GLASS.slice(at, GLASS.indexOf('\n}\n', at));
    assert.match(block, /backdrop-filter: none;/, `${opener} must drop the blur`);
    assert.match(block, /-webkit-backdrop-filter: none;/, `${opener} must drop the prefixed blur`);
    if (!opener.includes('forced-colors')) {
      assert.ok(block.includes(solid), `${opener} must paint the solid surface ${solid}`);
    } else {
      assert.match(block, /Canvas/);
    }
  }
});

test('control hover never leaks a translucent fill into a solid fallback', () => {
  const solid = TOKENS.effects['glass-crystal-solid-base'];
  for (const opener of ['@media (prefers-reduced-transparency: reduce)', '@media (prefers-contrast: more)', '@supports not (']) {
    const at = GLASS.indexOf(opener);
    const block = GLASS.slice(at, GLASS.indexOf('\n}\n', at));
    assert.match(block, new RegExp(`\\.vi-glass--control:hover,[^}]*background-color: ${solid};`, 's'), opener);
  }
});

test('glass shell and core use the radius and bezel tokens', () => {
  assert.match(GLASS, /\.vi-glass-shell \{[^}]*border-radius: 20px;[^}]*padding: 6px;/s);
  assert.match(GLASS, /\.vi-glass-core \{[^}]*border-radius: 14px;/s);
});

test('glass.css ships pill radius variants for plain-CSS consumers', () => {
  assert.match(GLASS, /\.vi-glass-shell--pill \{[^}]*border-radius: 9999px;/s);
  assert.match(GLASS, /\.vi-glass-core--pill \{[^}]*border-radius: 9999px;/s);
});

test('glass.css draws the rim as an inset shadow (no border box) so radii stay concentric', () => {
  const rim = TOKENS.effects['glass-crystal-rim-base'];
  assert.ok(GLASS.includes('border: 0;'));
  assert.ok(GLASS.includes(`inset 0 0 0 1px ${rim}`));
  const fallback = GLASS.slice(GLASS.indexOf('@media (prefers-reduced-transparency: reduce)'));
  assert.ok(fallback.includes(rim), 'fallbacks must keep the rim colour');
});

test('core text clears 4.5:1 over a pure-white backdrop with NO backdrop filter (analytic worst case)', () => {
  // Engine-independent bound: the shell normally dims what is behind it (brightness()), but a
  // headless or older engine may not render the filter, so the core scrim alone must carry the
  // contrast over a fully white backdrop. (Measured: Playwright WebKit and Firefox did not apply
  // brightness() to a backdrop in this repo's checks.)
  const [r, g, b, a] = TOKENS.effects['glass-crystal-core-base'].match(/rgba\((\d+), (\d+), (\d+), ([\d.]+)\)/).slice(1).map(Number);
  const behind = 255;
  const mix = (core) => core * a + behind * (1 - a);
  const lin = (c) => { const s = c / 255; return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; };
  const lum = ([R, G, B]) => 0.2126 * lin(R) + 0.7152 * lin(G) + 0.0722 * lin(B);
  const bg = lum([mix(r), mix(g), mix(b)]);
  const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const ratio = (fg) => (lum(hex(fg)) + 0.05) / (bg + 0.05);
  const secondary = TOKENS.colors['text-content-secondary-base'];
  assert.ok(ratio(secondary) >= 4.5, `secondary text ${ratio(secondary).toFixed(2)}:1`);
  assert.ok(ratio(TOKENS.colors['text-content-primary-base']) >= 4.5);
});

test('free text clears 4.5:1 over the strongest ambient glow with a dot on top (analytic worst case)', () => {
  // The ambient layer sits behind free page text. Peak glow alpha is at the gradient centre; a dot
  // can land under a glyph, so composite glow, then dot, over the page surface.
  const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const rgba = (v) => v.match(/rgba\((\d+), (\d+), (\d+), ([\d.]+)\)/).slice(1).map(Number);
  const over = ([r, g, b, a], under) => [r * a + under[0] * (1 - a), g * a + under[1] * (1 - a), b * a + under[2] * (1 - a)];
  const lin = (c) => { const s = c / 255; return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; };
  const lum = ([R, G, B]) => 0.2126 * lin(R) + 0.7152 * lin(G) + 0.0722 * lin(B);
  const surface = hex(TOKENS.colors['surface-background-primary-base']);
  const dots = rgba(TOKENS.effects['ambient-dots-base']);
  for (const glow of ['ambient-glow-violet-base', 'ambient-glow-teal-base']) {
    const bg = lum(over(dots, over(rgba(TOKENS.effects[glow]), surface)));
    for (const text of ['text-content-primary-base', 'text-content-secondary-base']) {
      const ratio = (lum(hex(TOKENS.colors[text])) + 0.05) / (bg + 0.05);
      assert.ok(ratio >= 4.5, `${text} over ${glow} + dot is ${ratio.toFixed(2)}:1`);
    }
  }
});

// --- Determinism ---------------------------------------------------------

test('generators are deterministic', () => {
  assert.equal(emitCSS(TOKENS), emitCSS(parseFrontMatter(DESIGN)));
  assert.equal(emitGlassCSS(TOKENS), emitGlassCSS(parseFrontMatter(DESIGN)));
  assert.equal(emitTailwindConfig(TOKENS), emitTailwindConfig(parseFrontMatter(DESIGN)));
});
