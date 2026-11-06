'use strict';

/**
 * Stage backdrop primitive (ADR-013 item 1).
 *
 * An arc of the five persona lights over a stage whose ring is five single-colour segments, with
 * concentric arcs, sparse points of light, violet light planes and a centre beam. Pure and
 * deterministic: no random source, no clock, coordinates rounded to two decimals. The same alpha
 * table drives the SVG and the contrast report, so a product cannot paint a layer its bound was
 * not computed for.
 *
 * Brand v1: every gradient carries one signature colour; small persona marks are tints; Xylia
 * appears only with the other four. Colour comes from classes (`lib/stage.css`), never inline
 * style, so `style-src 'self'` holds.
 */

const { AA_TEXT, worstContrastOver } = require('./contrast');

const STAGE_PERSONAS = Object.freeze(['violet', 'wisteria', 'xylia', 'yarrow', 'zinnia']);
const VIEW = Object.freeze({ width: 1440, height: 900 });
const round = (value) => Math.round(value * 100) / 100;

/** The arc of persona lights: a circle segment centred below the view. */
const ARC = Object.freeze({ cx: 720, cy: 960, r: 760, spreadDeg: 50 });

/** Persona lights on the arc, left to right in canon order; Xylia sits at the crown. */
const arcLights = Object.freeze(
  STAGE_PERSONAS.map((persona, index) => {
    const rad = ((-ARC.spreadDeg + (ARC.spreadDeg / 2) * index) * Math.PI) / 180;
    return Object.freeze({ persona, x: round(ARC.cx + ARC.r * Math.sin(rad)), y: round(ARC.cy - ARC.r * Math.cos(rad)) });
  }),
);

/** An arc path on the light circle, from -deg to +deg about the crown. */
function arcPath(r, deg) {
  const rad = (deg * Math.PI) / 180;
  const y = round(ARC.cy - r * Math.cos(rad));
  return `M ${round(ARC.cx - r * Math.sin(rad))} ${y} A ${r} ${r} 0 0 1 ${round(ARC.cx + r * Math.sin(rad))} ${y}`;
}

/** The stage: concentric ellipses on the floor of the view. */
const STAGE = Object.freeze({ cx: 720, cy: 790, rx: 560, ry: 78 });

/**
 * Ring segments in increasing angle (clockwise on screen). Around the ring they keep the canon
 * cycle; along the front edge they read Wisteria, Xylia, Yarrow.
 */
const ringSegments = Object.freeze([
  { persona: 'yarrow', from: -18, to: 54 },
  { persona: 'xylia', from: 54, to: 126 },
  { persona: 'wisteria', from: 126, to: 198 },
  { persona: 'violet', from: 198, to: 270 },
  { persona: 'zinnia', from: 270, to: 342 },
].map(Object.freeze));

/** An elliptical arc on the stage ring between two angles (degrees, y down). */
function ringPath(fromDeg, toDeg, scale = 1) {
  const point = (deg) => {
    const rad = (deg * Math.PI) / 180;
    return [round(STAGE.cx + STAGE.rx * scale * Math.cos(rad)), round(STAGE.cy + STAGE.ry * scale * Math.sin(rad))];
  };
  const [x0, y0] = point(fromDeg);
  const [x1, y1] = point(toDeg);
  const large = toDeg - fromDeg > 180 ? 1 : 0;
  return `M ${x0} ${y0} A ${round(STAGE.rx * scale)} ${round(STAGE.ry * scale)} 0 ${large} 1 ${x1} ${y1}`;
}

/** Light planes rising from the stage, mirrored about the centre beam. */
const planes = Object.freeze([
  '560,575 720,655 720,785 560,712',
  '880,575 720,655 720,785 880,712',
  '420,520 560,585 560,725 420,665',
  '1020,520 880,585 880,725 1020,665',
]);

/** A few fixed points of light; deterministic positions, no grid. */
const sparks = Object.freeze([
  [160, 140], [292, 412], [404, 210], [540, 96], [612, 470], [866, 120],
  [958, 452], [1104, 196], [1236, 380], [1318, 118], [96, 560], [1372, 590],
].map(([x, y]) => Object.freeze({ x, y })));

/**
 * Peak alpha of each painted layer, before the variant opacity. `light` is the primary text
 * colour, `persona` is each of the five signatures, `violet` is the violet signature alone.
 * `area` layers are broad glows that may overlap one another; `line` layers are strokes and marks.
 */
const STAGE_ALPHA = Object.freeze({
  arcLine: { paint: 'light', alpha: 0.22, extent: 'line' },
  innerArcs: { paint: 'light', alpha: 0.14, extent: 'line' },
  sparks: { paint: 'light', alpha: 0.32, extent: 'line' },
  lightCore: { paint: 'persona', alpha: 0.55, extent: 'line' },
  lightHalo: { paint: 'persona', alpha: 0.44, extent: 'area' },
  planes: { paint: 'violet', alpha: 0.2, extent: 'area' },
  planeEdges: { paint: 'light', alpha: 0.2, extent: 'line' },
  beam: { paint: 'violet', alpha: 0.5, extent: 'line' },
  stageGlow: { paint: 'violet', alpha: 0.42, extent: 'area' },
  ringSegments: { paint: 'persona', alpha: 0.85, extent: 'line' },
  ringGlow: { paint: 'persona', alpha: 0.45, extent: 'area' },
  innerRings: { paint: 'light', alpha: 0.18, extent: 'line' },
  ripples: { paint: 'violet', alpha: 0.5, extent: 'line' },
});

/**
 * Variant opacity. `ambient` sits behind reading text on every page, so each layer times this
 * stays inside the 4.5:1 bound for secondary text (see `stageContrastReport`). `hero` is full
 * strength; text over it sits on a scrim.
 */
const STAGE_VARIANT_OPACITY = Object.freeze({ hero: 1, ambient: 0.26 });

/** Narrow screens scale the stage up behind more text, so the ambient copy only gets quieter. */
const STAGE_NARROW_AMBIENT_OPACITY = 0.16;

/** Share of the field colour mixed back over a full-strength stage behind hero copy. */
const STAGE_TEXT_SCRIM = 0.72;

const attrs = (pairs) =>
  Object.entries(pairs)
    .filter(([, value]) => value !== undefined)
    .map(([key, value]) => ` ${key}="${value}"`)
    .join('');
const el = (tag, pairs, children) => (children === undefined ? `<${tag}${attrs(pairs)}/>` : `<${tag}${attrs(pairs)}>${children}</${tag}>`);

/**
 * Render the stage as an SVG string. `idPrefix` keeps gradient ids unique when a page holds more
 * than one stage. `opacity` overrides the variant opacity (it must still pass the report).
 */
function renderStageSvg({ variant = 'ambient', idPrefix = 'stage', opacity } = {}) {
  if (!(variant in STAGE_VARIANT_OPACITY)) throw new RangeError(`unknown stage variant "${variant}"`);
  if (!/^[a-z][a-z0-9-]*$/.test(idPrefix)) throw new RangeError(`idPrefix must be a lowercase slug, got "${idPrefix}"`);
  const id = (name) => `${idPrefix}-${variant}-${name}`;
  const a = STAGE_ALPHA;
  const stop = (persona, alpha) =>
    el('stop', { offset: '0', class: `stage-stop stage-stop--${persona}`, 'stop-opacity': alpha }) +
    el('stop', { offset: '1', class: `stage-stop stage-stop--${persona}`, 'stop-opacity': 0 });

  const defs = [
    ...STAGE_PERSONAS.map((persona) => el('radialGradient', { id: id(`halo-${persona}`) }, stop(persona, a.lightHalo.alpha))),
    el('radialGradient', { id: id('floor'), cx: '0.5', cy: '0.5', r: '0.5' }, stop('violet', a.stageGlow.alpha)),
    el('linearGradient', { id: id('plane'), x1: '0', y1: '1', x2: '0', y2: '0' }, stop('violet', a.planes.alpha)),
    el('linearGradient', { id: id('beam'), x1: '0', y1: '1', x2: '0', y2: '0' }, stop('violet', a.beam.alpha)),
    el('filter', { id: id('soften'), x: '-20%', y: '-60%', width: '140%', height: '220%' }, el('feGaussianBlur', { stdDeviation: '9' })),
  ].join('');

  const sky = [
    ...sparks.map((spark) => el('circle', { class: 'stage__spark stage-paint--light', cx: spark.x, cy: spark.y, r: 1.4, 'fill-opacity': a.sparks.alpha })),
    el('path', { class: 'stage__arc stage-line--light', d: arcPath(ARC.r - 70, 62), 'stroke-opacity': a.innerArcs.alpha }),
    el('path', { class: 'stage__arc stage-line--light', d: arcPath(ARC.r - 140, 66), 'stroke-opacity': a.innerArcs.alpha }),
    el(
      'g',
      { class: 'stage__lights' },
      el('path', { class: 'stage__arc stage-line--light', d: arcPath(ARC.r, 58), 'stroke-opacity': a.arcLine.alpha }) +
        arcLights
          .map((light, index) =>
            el(
              'g',
              { class: 'stage__light', 'data-persona': light.persona, 'data-index': index },
              el('circle', { cx: light.x, cy: light.y, r: 26, fill: `url(#${id(`halo-${light.persona}`)})` }) +
                el('circle', { class: `stage__core stage-tint--${light.persona}`, cx: light.x, cy: light.y, r: 4, 'fill-opacity': a.lightCore.alpha }),
            ),
          )
          .join(''),
    ),
  ].join('');

  const segments = (alpha, indexed) =>
    ringSegments
      .map((segment, index) =>
        el('path', {
          class: `stage__segment stage-line--${segment.persona}`,
          'data-persona': indexed ? segment.persona : undefined,
          'data-index': indexed ? index : undefined,
          d: ringPath(segment.from, segment.to),
          'stroke-opacity': alpha,
        }),
      )
      .join('');

  const floor = [
    ...planes.map((points) => el('polygon', { class: 'stage__sheet stage-line--light', points, fill: `url(#${id('plane')})`, 'stroke-opacity': a.planeEdges.alpha })),
    el('rect', { class: 'stage__beam', x: STAGE.cx - 2, y: 470, width: 4, height: STAGE.cy - 470, fill: `url(#${id('beam')})` }),
    el('ellipse', { class: 'stage__floor-glow', cx: STAGE.cx, cy: STAGE.cy, rx: round(STAGE.rx * 0.8), ry: round(STAGE.ry * 1.6), fill: `url(#${id('floor')})` }),
    ...[0.32, 0.56, 0.78].map((scale) =>
      el('ellipse', { class: 'stage__inner-ring stage-line--light', cx: STAGE.cx, cy: STAGE.cy, rx: round(STAGE.rx * scale), ry: round(STAGE.ry * scale), 'stroke-opacity': a.innerRings.alpha }),
    ),
    ...[0, 1, 2].map((index) =>
      el('ellipse', { class: 'stage__ripple stage-line--violet', 'data-index': index, cx: STAGE.cx, cy: STAGE.cy, rx: round(STAGE.rx * 0.9), ry: round(STAGE.ry * 0.9), 'stroke-opacity': a.ripples.alpha }),
    ),
    el('g', { class: 'stage__ring-glow', filter: `url(#${id('soften')})` }, segments(a.ringGlow.alpha, false)),
    el('g', { class: 'stage__ring' }, segments(a.ringSegments.alpha, true)),
  ].join('');

  return el(
    'svg',
    {
      class: `stage stage--${variant}`,
      xmlns: 'http://www.w3.org/2000/svg',
      viewBox: `0 0 ${VIEW.width} ${VIEW.height}`,
      preserveAspectRatio: variant === 'hero' ? 'xMidYMax slice' : 'xMidYMid slice',
      opacity: opacity ?? STAGE_VARIANT_OPACITY[variant],
      focusable: 'false',
      'aria-hidden': 'true',
    },
    el('defs', {}, defs) + el('g', { class: 'stage__sky' }, sky) + el('g', { class: 'stage__floor' }, floor),
  );
}

/**
 * Stage colours from a parsed DESIGN.md token set (`parseFrontMatter`). The stage sits behind the
 * page field only; opaque surfaces (cards, panels) cover it, so their text never meets it. Pass
 * `extraFields` for a product whose page field differs, such as the brand field.
 */
function stagePaletteFromTokens(tokens, { extraFields = [] } = {}) {
  const colours = tokens.colors;
  return {
    text: colours['text-content-secondary-base'],
    light: colours['text-content-primary-base'],
    fields: [colours['surface-background-primary-base'], ...extraFields],
    personas: Object.fromEntries(STAGE_PERSONAS.map((persona) => [persona, colours[`persona-accent-${persona}-base`]])),
  };
}

function paintsFor(paint, palette) {
  if (paint === 'light') return [palette.light];
  if (paint === 'persona') return STAGE_PERSONAS.map((persona) => palette.personas[persona]);
  return [palette.personas[paint]];
}

/**
 * Worst secondary-text contrast per layer at `opacity`, over every field in the palette. Area
 * layers are counted twice (two glows may overlap). `scrim` (0..1) is the share of the field colour
 * mixed back over the stage behind text, as on a hero.
 */
function stageContrastReport({ palette, opacity = STAGE_VARIANT_OPACITY.ambient, scrim = 0, floor = AA_TEXT }) {
  const layers = Object.entries(STAGE_ALPHA).map(([name, layer]) => {
    const alpha = layer.alpha * opacity * (1 - scrim);
    const worst = Math.min(
      ...palette.fields.map((field) =>
        worstContrastOver({ text: palette.text, field, paints: paintsFor(layer.paint, palette), alpha, layers: layer.extent === 'area' ? 2 : 1 }),
      ),
    );
    return { name, alpha: round(alpha * 1000) / 1000, worst: round(worst), passes: worst >= floor };
  });
  return { opacity, scrim, floor, passes: layers.every((layer) => layer.passes), layers };
}

/**
 * The highest variant opacity, to two decimals, at which every layer keeps `floor` over every
 * field. Products pick their ambient opacity at or below this value.
 */
function maxSafeStageOpacity({ palette, scrim = 0, floor = AA_TEXT }) {
  let best = 0;
  for (let step = 1; step <= 100; step += 1) {
    if (stageContrastReport({ palette, opacity: step / 100, scrim, floor }).passes) best = step / 100;
    else break;
  }
  return best;
}

module.exports = {
  STAGE_PERSONAS,
  VIEW,
  ARC,
  STAGE,
  arcLights,
  arcPath,
  ringSegments,
  ringPath,
  planes,
  sparks,
  STAGE_ALPHA,
  STAGE_VARIANT_OPACITY,
  STAGE_NARROW_AMBIENT_OPACITY,
  STAGE_TEXT_SCRIM,
  renderStageSvg,
  stagePaletteFromTokens,
  stageContrastReport,
  maxSafeStageOpacity,
};
