'use strict';

/**
 * Token value classification (ADR-014). One reading of every DESIGN.md value, so every platform
 * emitter (TypeScript, Swift, Python, DTCG JSON) converts the same value the same way.
 *
 * Kinds:
 *   color       #RRGGBB                  -> { hex, rgb: [0..255 x3], alpha: 1 }
 *   color       rgba(r, g, b, a)         -> { hex, rgb, alpha }
 *   dimension   12px | 0.75rem           -> { value, unit, points } (1rem = 16 points)
 *   em          -0.02em                  -> { value }       (a multiple of the font size)
 *   number      600 | 1.5                -> { value }
 *   duration    150ms | 32s              -> { value, unit, seconds }
 *   cubicBezier cubic-bezier(a, b, c, d) -> { points: [x1, y1, x2, y2] }
 *   fluid       clamp(min, pref, max)    -> { min, max } as dimensions, plus the CSS
 *   fontFamily  Geist, ui-sans-serif, …  -> { families: [...] }
 *   css         anything else            -> { css } (shadows, gradients, filters: web only)
 */

const REM_POINTS = 16;

function hexOf(rgb) {
  return `#${rgb.map((c) => Math.round(c).toString(16).padStart(2, '0')).join('').toUpperCase()}`;
}

function dimension(text) {
  const match = /^(-?\d*\.?\d+)(px|rem)$/.exec(text.trim());
  if (!match) return null;
  const value = Number(match[1]);
  return { value, unit: match[2], points: match[2] === 'rem' ? value * REM_POINTS : value };
}

/** Classify one token value. `key` is used only to tell font weights from other numbers. */
function classify(raw, key = '') {
  const value = String(raw).trim();
  let match;

  if ((match = /^#([0-9a-f]{6})$/i.exec(value))) {
    const rgb = [0, 2, 4].map((i) => Number.parseInt(match[1].slice(i, i + 2), 16));
    return { kind: 'color', hex: hexOf(rgb), rgb, alpha: 1 };
  }
  if ((match = /^rgba\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*([\d.]+)\s*\)$/i.exec(value))) {
    const rgb = match.slice(1, 4).map(Number);
    return { kind: 'color', hex: hexOf(rgb), rgb, alpha: Number(match[4]) };
  }
  const dim = dimension(value);
  if (dim) return { kind: 'dimension', ...dim };
  if ((match = /^(-?\d*\.?\d+)em$/.exec(value))) return { kind: 'em', value: Number(match[1]) };
  if ((match = /^(\d*\.?\d+)(ms|s)$/.exec(value))) {
    const n = Number(match[1]);
    return { kind: 'duration', value: n, unit: match[2], seconds: match[2] === 'ms' ? n / 1000 : n };
  }
  if ((match = /^cubic-bezier\(([^)]+)\)$/.exec(value))) {
    const points = match[1].split(',').map((p) => Number(p.trim()));
    if (points.length === 4 && points.every(Number.isFinite)) return { kind: 'cubicBezier', points };
  }
  if ((match = /^clamp\(([^,]+),([^,]+),([^)]+)\)$/.exec(value))) {
    const min = dimension(match[1]);
    const max = dimension(match[3]);
    if (min && max) return { kind: 'fluid', min, max, css: value };
  }
  if (/^-?\d*\.?\d+$/.test(value)) {
    return { kind: /weight/.test(key) ? 'fontWeight' : 'number', value: Number(value) };
  }
  if (/family/.test(key)) {
    return { kind: 'fontFamily', families: value.split(',').map((f) => f.trim().replace(/^["']|["']$/g, '')) };
  }
  return { kind: 'css', css: value };
}

/** Every token as { category, key, raw, cssVar, value } in DESIGN.md order. */
function flattenTokens(tokens) {
  const out = [];
  for (const [category, entries] of Object.entries(tokens)) {
    for (const [key, raw] of Object.entries(entries)) {
      out.push({ category, key, raw: String(raw), cssVar: `--vi-${category}-${key}`, value: classify(raw, key) });
    }
  }
  return out;
}

/** kebab-case to lowerCamelCase; a leading digit gets an underscore so it stays an identifier. */
function camel(text) {
  const out = text.replace(/-([a-z0-9])/gi, (_, c) => c.toUpperCase());
  return /^[0-9]/.test(out) ? `_${out}` : out;
}

/** kebab-case to UPPER_SNAKE_CASE. */
function upperSnake(text) {
  const out = text.replace(/-/g, '_').toUpperCase();
  return /^[0-9]/.test(out) ? `_${out}` : out;
}

module.exports = { REM_POINTS, classify, flattenTokens, camel, upperSnake };
