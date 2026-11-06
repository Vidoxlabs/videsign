'use strict';

/**
 * WCAG 2 contrast and alpha compositing (ADR-006, ADR-013).
 *
 * One implementation for the token contract, the stage primitive and the MCP server, so every
 * contrast claim in this repository is computed the same way. Pure functions, sRGB only.
 */

const AA_TEXT = 4.5;
const AA_LARGE_TEXT = 3;
const AA_NON_TEXT = 3;

/** `#RRGGBB` (or `#RGB`) to channel values 0..255. Throws on anything else. */
function hexToRgb(hex) {
  const value = String(hex).trim();
  const short = /^#([0-9a-f])([0-9a-f])([0-9a-f])$/i.exec(value);
  const long = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(value);
  const parts = long ? long.slice(1) : short ? short.slice(1).map((c) => c + c) : null;
  if (!parts) throw new TypeError(`expected #RRGGBB or #RGB, got "${hex}"`);
  return parts.map((part) => Number.parseInt(part, 16));
}

/** `rgba(r, g, b, a)` to `[r, g, b, a]`. Throws on anything else. */
function parseRgba(value) {
  const match = /^rgba\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*([\d.]+)\s*\)$/.exec(String(value).trim());
  if (!match) throw new TypeError(`expected rgba(r, g, b, a), got "${value}"`);
  return match.slice(1).map(Number);
}

/** Paint `top` at `alpha` over the opaque `base` (both 0..255 RGB). */
function over(top, alpha, base) {
  return base.map((channel, i) => top[i] * alpha + channel * (1 - alpha));
}

function linear(channel) {
  const s = channel / 255;
  return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}

/** Relative luminance of an RGB triple (0..255) or a hex string. */
function luminance(colour) {
  const [r, g, b] = typeof colour === 'string' ? hexToRgb(colour) : colour;
  return 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);
}

/** WCAG contrast ratio between two colours (hex strings or RGB triples), 1..21. */
function contrastRatio(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/** Which WCAG 2 AA thresholds a pair clears. */
function wcagLevels(ratio) {
  return { text: ratio >= AA_TEXT, largeText: ratio >= AA_LARGE_TEXT, nonText: ratio >= AA_NON_TEXT };
}

/**
 * Worst contrast of `text` over `field` after `layers` coats of each colour in `paints` at
 * `alpha`. Stacking coats models broad glows that may overlap one another.
 */
function worstContrastOver({ text, field, paints, alpha, layers = 1 }) {
  let worst = Number.POSITIVE_INFINITY;
  const textRgb = typeof text === 'string' ? hexToRgb(text) : text;
  for (const paint of paints) {
    const paintRgb = typeof paint === 'string' ? hexToRgb(paint) : paint;
    let backdrop = typeof field === 'string' ? hexToRgb(field) : field;
    for (let i = 0; i < layers; i += 1) backdrop = over(paintRgb, alpha, backdrop);
    worst = Math.min(worst, contrastRatio(textRgb, backdrop));
  }
  return worst;
}

module.exports = {
  AA_TEXT,
  AA_LARGE_TEXT,
  AA_NON_TEXT,
  hexToRgb,
  parseRgba,
  over,
  luminance,
  contrastRatio,
  wcagLevels,
  worstContrastOver,
};
