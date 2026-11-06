'use strict';

/**
 * Persona dialects (ADR-015): moderate, agent surfaces only.
 *
 * Every persona shares one skeleton (grid, components, accessibility, brand rules) and varies a
 * fixed set of settings that follow its canon mood and cabinet role: motion, density, label type,
 * a decorative motif, and the order its content leads with. Settings reference existing DESIGN.md
 * tokens by path; this module adds no colour, length or duration of its own except the motif
 * alphas and spacings below, which are decorative and never sit under text.
 *
 * Moods and settings are quoted from canon/vwxyz/palette.json (background.name, background.mood).
 * Roles are the cabinet roles the chat guides use.
 */

const PERSONAS = Object.freeze(['violet', 'wisteria', 'xylia', 'yarrow', 'zinnia']);

/** Content kinds an agent surface can lead with. `sources` always closes a reply. */
const CONTENT_KINDS = Object.freeze(['summary', 'highlights', 'options', 'explorations', 'limits', 'evidence', 'alternatives', 'comparison', 'steps', 'progress', 'sources']);

const DIALECTS = Object.freeze({
  violet: {
    role: 'Coordinates and summarizes',
    canon: { setting: 'Orchestration Deck', mood: 'calm command, quietly mysterious' },
    motion: { duration: 'transition.transition-duration-normal-base', easing: 'transition.transition-easing-standard-base', entrance: 'transition.transition-duration-entrance-base' },
    density: { gap: 'space.gap-comfortable-default', padding: 'spacing.layout-padding-medium-base' },
    type: { labelFamily: 'typography.typography-family-mono-base', labelTracking: 'typography.typography-tracking-wide-base', leading: 'typography.typography-leading-normal-base', numerals: 'proportional-nums' },
    motif: 'rings',
    lead: ['summary', 'highlights', 'sources'],
  },
  wisteria: {
    role: 'Lays out what is possible',
    canon: { setting: 'Lattice Studio', mood: 'warm, composed, editorial daylight' },
    motion: { duration: 'transition.transition-duration-slow-base', easing: 'transition.transition-easing-standard-base', entrance: 'transition.transition-duration-entrance-base' },
    density: { gap: 'space.gap-spacious-default', padding: 'spacing.layout-padding-large-base' },
    type: { labelFamily: 'typography.typography-family-sans-base', labelTracking: 'typography.typography-tracking-normal-base', leading: 'typography.typography-leading-normal-base', numerals: 'proportional-nums' },
    motif: 'lattice',
    lead: ['options', 'explorations', 'sources'],
  },
  xylia: {
    role: 'Names the limits',
    canon: { setting: 'Review Chamber', mood: 'austere, exact, monochrome' },
    motion: { duration: 'transition.transition-duration-fast-base', easing: 'transition.transition-easing-standard-base', entrance: 'transition.transition-duration-fast-base' },
    density: { gap: 'space.gap-compact-default', padding: 'spacing.layout-padding-small-base' },
    type: { labelFamily: 'typography.typography-family-mono-base', labelTracking: 'typography.typography-tracking-widest-base', leading: 'typography.typography-leading-tight-base', numerals: 'tabular-nums' },
    motif: 'hairline',
    lead: ['limits', 'evidence', 'sources'],
  },
  yarrow: {
    role: 'Narrows down and offers alternatives',
    canon: { setting: 'Map Room', mood: 'grounded, steady, oriented' },
    motion: { duration: 'transition.transition-duration-normal-base', easing: 'transition.transition-easing-standard-base', entrance: 'transition.transition-duration-slow-base' },
    density: { gap: 'space.gap-comfortable-default', padding: 'spacing.layout-padding-medium-base' },
    type: { labelFamily: 'typography.typography-family-mono-base', labelTracking: 'typography.typography-tracking-wide-base', leading: 'typography.typography-leading-normal-base', numerals: 'tabular-nums' },
    motif: 'contour',
    lead: ['alternatives', 'comparison', 'sources'],
  },
  zinnia: {
    role: 'Turns a goal into next steps',
    canon: { setting: 'Launch Lane', mood: 'bright, brisk, forward motion' },
    motion: { duration: 'transition.transition-duration-fast-base', easing: 'transition.transition-easing-spring-base', entrance: 'transition.transition-duration-normal-base' },
    density: { gap: 'space.gap-compact-default', padding: 'spacing.layout-padding-medium-base' },
    type: { labelFamily: 'typography.typography-family-sans-base', labelTracking: 'typography.typography-tracking-normal-base', leading: 'typography.typography-leading-tight-base', numerals: 'tabular-nums' },
    motif: 'lane',
    lead: ['steps', 'progress', 'sources'],
  },
});

/**
 * Motif bands: decorative, aria-hidden, no text on top. Each paints one colour: the persona's own
 * accent mixed with transparent, or (Xylia) the monochrome graph line, so no gradient joins two
 * signature colours and Xylia's crimson never appears outside the five-segment marker.
 */
const MOTIFS = Object.freeze({
  rings: { paint: 'persona', alpha: 0.4, describe: 'concentric arcs rising from the base, after the orchestration stage' },
  lattice: { paint: 'persona', alpha: 0.3, describe: 'fine crossing diagonals, after the lattice studio' },
  hairline: { paint: 'graph-line', alpha: 1, describe: 'a single monochrome hairline, nothing ornamental' },
  contour: { paint: 'persona', alpha: 0.35, describe: 'offset contour lines, after a map' },
  lane: { paint: 'persona', alpha: 0.4, describe: 'forward dashes along a lane' },
});

const cssVar = (ref) => `var(--vi-${ref.replace('.', '-')})`;

function motifBackground(motif, persona) {
  const { paint, alpha } = MOTIFS[motif];
  const ink = paint === 'graph-line'
    ? 'var(--vi-colors-border-graph-line-base)'
    : `color-mix(in srgb, var(--vi-colors-persona-accent-${persona}-base) ${Math.round(alpha * 100)}%, transparent)`;
  switch (motif) {
    case 'rings':
      // Three nested arcs rising from the base of the band, like the stage's orchestration arc.
      return [0.9, 0.62, 0.34]
        .map((w) => `radial-gradient(ellipse ${Math.round(w * 50)}% 200% at 50% 100%, transparent calc(100% - 1.5px), ${ink} calc(100% - 1.5px) 100%, transparent 100%)`)
        .join(', ');
    case 'lattice':
      return `repeating-linear-gradient(45deg, ${ink} 0 1px, transparent 1px 8px), repeating-linear-gradient(-45deg, ${ink} 0 1px, transparent 1px 8px)`;
    case 'hairline':
      return `linear-gradient(${ink}, ${ink}) center / 100% 1px no-repeat`;
    case 'contour':
      // Gently curved contour lines, as on a map: rings of a far-off centre, 4px apart.
      return `repeating-radial-gradient(ellipse 160% 1400% at 30% 100%, transparent 0 3px, ${ink} 3px 4px)`;
    case 'lane':
      return `repeating-linear-gradient(90deg, ${ink} 0 12px, transparent 12px 20px) center / 100% 2px no-repeat`;
    default:
      throw new RangeError(`unknown motif "${motif}"`);
  }
}

/** The generated stylesheet. Every selector is scoped to `.vi-agent` (agent surfaces only). */
function emitDialectCss() {
  const lines = [
    '/* GENERATED BY lib/dialects.js (ADR-015). DO NOT EDIT. Run `npm run tokens`. */',
    '/* Persona dialects for agent surfaces: put `vi-agent` and `data-persona="<seat>"` on the',
    '   surface. Page content outside `.vi-agent` is never restyled. Needs dist/tokens.css. */',
    '',
  ];
  const block = (selector, persona) => {
    const d = DIALECTS[persona];
    return [
      `${selector} {`,
      `  --vi-dialect-duration: ${cssVar(d.motion.duration)};`,
      `  --vi-dialect-easing: ${cssVar(d.motion.easing)};`,
      `  --vi-dialect-entrance: ${cssVar(d.motion.entrance)};`,
      `  --vi-dialect-gap: ${cssVar(d.density.gap)};`,
      `  --vi-dialect-padding: ${cssVar(d.density.padding)};`,
      `  --vi-dialect-label-family: ${cssVar(d.type.labelFamily)};`,
      `  --vi-dialect-label-tracking: ${cssVar(d.type.labelTracking)};`,
      `  --vi-dialect-leading: ${cssVar(d.type.leading)};`,
      `  --vi-dialect-numerals: ${d.type.numerals};`,
      `  --vi-dialect-motif: ${motifBackground(d.motif, persona)};`,
      '}',
      '',
    ];
  };
  // Violet coordinates the cabinet, so a surface with no seat speaks in her dialect.
  lines.push(...block('.vi-agent', 'violet'));
  for (const persona of PERSONAS) lines.push(...block(`.vi-agent[data-persona="${persona}"]`, persona));
  lines.push(
    '.vi-agent {',
    '  display: flex;',
    '  flex-direction: column;',
    '  gap: var(--vi-dialect-gap);',
    '  padding: var(--vi-dialect-padding);',
    '  line-height: var(--vi-dialect-leading);',
    '  font-variant-numeric: var(--vi-dialect-numerals);',
    '}',
    '',
    '.vi-agent__label {',
    '  font-family: var(--vi-dialect-label-family);',
    '  letter-spacing: var(--vi-dialect-label-tracking);',
    '}',
    '',
    '/* Decorative band: aria-hidden, no text on it. */',
    '.vi-agent__motif {',
    '  block-size: var(--vi-size-indicator-mark-base);',
    '  background: var(--vi-dialect-motif);',
    '}',
    '',
    '/* Interaction motion in the seat\'s tempo: transform and opacity only (ADR-008). */',
    '.vi-agent [data-vi-motion] {',
    '  transition-property: opacity, transform;',
    '  transition-duration: var(--vi-dialect-duration);',
    '  transition-timing-function: var(--vi-dialect-easing);',
    '}',
    '',
    '@media (prefers-reduced-motion: reduce) {',
    '  .vi-agent [data-vi-motion] {',
    '    transition-duration: 0s;',
    '  }',
    '}',
    '',
    '@media (forced-colors: active) {',
    '  .vi-agent__motif {',
    '    background: none;',
    '  }',
    '}',
    '',
  );
  return lines.join('\n');
}

/**
 * Dialects with every token reference resolved to a platform-neutral value, for native and
 * Python surfaces: seconds, points, cubic-bezier points, font family lists.
 */
function resolveDialects(tokens, classify) {
  const lookup = (ref) => {
    const [category, key] = ref.split('.');
    const raw = tokens[category] && tokens[category][key];
    if (raw === undefined) throw new Error(`dialect references a missing token: ${ref}`);
    return { ref, raw: String(raw), value: classify(raw, key) };
  };
  const out = {};
  for (const persona of PERSONAS) {
    const d = DIALECTS[persona];
    const resolved = (ref) => lookup(ref);
    out[persona] = {
      role: d.role,
      canon: { ...d.canon },
      motion: {
        durationSeconds: resolved(d.motion.duration).value.seconds,
        easing: resolved(d.motion.easing).value.points,
        entranceSeconds: resolved(d.motion.entrance).value.seconds,
      },
      density: { gapPoints: resolved(d.density.gap).value.points, paddingPoints: resolved(d.density.padding).value.points },
      type: {
        labelFamily: resolved(d.type.labelFamily).value.families,
        labelTrackingEm: resolved(d.type.labelTracking).value.value,
        leading: resolved(d.type.leading).value.value,
        numerals: d.type.numerals,
      },
      motif: d.motif,
      lead: [...d.lead],
      refs: {
        ...Object.fromEntries(Object.entries(d.motion).map(([k, v]) => [`motion.${k}`, v])),
        ...Object.fromEntries(Object.entries(d.density).map(([k, v]) => [`density.${k}`, v])),
        ...Object.fromEntries(Object.entries(d.type).filter(([k]) => k !== 'numerals').map(([k, v]) => [`type.${k}`, v])),
      },
    };
  }
  return out;
}

module.exports = { PERSONAS, CONTENT_KINDS, DIALECTS, MOTIFS, motifBackground, emitDialectCss, resolveDialects };
