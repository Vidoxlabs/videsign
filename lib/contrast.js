'use strict';

/**
 * WCAG 2 contrast and alpha compositing (ADR-006, ADR-013).
 *
 * One implementation for the token contract, the stage primitive and the MCP server, so every
 * contrast claim in this repository is computed the same way. Ratios use sRGB luminance.
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

/** Opaque canonical OKLCH in the sRGB gamut, converted without channel rounding. */
function oklchToRgb(value) {
  const match = /^oklch\(\s*(\d*\.?\d+)\s+(\d*\.?\d+)\s+(-?\d*\.?\d+)\s*\)$/i.exec(value);
  if (!match) return null;
  const [lightness, chroma, hue] = match.slice(1).map(Number);
  if (!Number.isFinite(hue) || !Number.isFinite(chroma) || lightness > 1) return null;
  const angle = hue * Math.PI / 180;
  const a = chroma * Math.cos(angle);
  const b = chroma * Math.sin(angle);
  // Combined OKLab to linear sRGB transform (https://bottosson.github.io/posts/oklab/).
  const l = (lightness + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (lightness - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (lightness - 0.0894841775 * a - 1.2914855480 * b) ** 3;
  const channels = [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s,
  ];
  if (channels.some((channel) => !Number.isFinite(channel) || channel < -1e-7 || channel > 1 + 1e-7)) return null;
  return channels.map((channel) => {
    const clipped = Math.min(1, Math.max(0, channel));
    return 255 * (clipped <= 0.0031308 ? 12.92 * clipped : 1.055 * clipped ** (1 / 2.4) - 0.055);
  });
}

function parseOpaqueColour(input) {
  const value = String(input ?? '').trim();
  return /^#(?:[\da-f]{3}|[\da-f]{6})$/i.test(value) ? hexToRgb(value) : oklchToRgb(value);
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
  const rgb = typeof colour === 'string' ? parseOpaqueColour(colour) : colour;
  if (!rgb) throw new TypeError(`expected an opaque sRGB colour, got "${colour}"`);
  const [r, g, b] = rgb;
  return 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);
}

/** WCAG contrast ratio between two opaque sRGB colours or RGB triples, 1..21. */
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
  parseOpaqueColour,
  parseRgba,
  over,
  luminance,
  contrastRatio,
  wcagLevels,
  worstContrastOver,
};
