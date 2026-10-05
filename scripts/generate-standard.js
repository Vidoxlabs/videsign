#!/usr/bin/env node

/**
 * generate-standard.js — Deterministic agent-readable standard from DESIGN.md
 * and SKILL.md (addendum §2 / ADR index). Emitted as dist/standard.json and
 * dist/standard.md by `npm run tokens`.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.join(__dirname, '..');
const PKG = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf-8'));

function sha256(text) {
  return crypto.createHash('sha256').update(text, 'utf8').digest('hex');
}

/** Parse ADR headings and optional status lines from SKILL.md. */
function parseAdrIndex(skillMd) {
  const adrs = [];
  const re = /^## (ADR-\d+):\s*(.+)$/gm;
  let m;
  while ((m = re.exec(skillMd)) !== null) {
    const rest = skillMd.slice(m.index + m[0].length, m.index + m[0].length + 400);
    const statusMatch = rest.match(/\*\*Status\*\*:\s*(.+)/);
    adrs.push({
      id: m[1],
      title: m[2].trim(),
      status: statusMatch ? statusMatch[1].trim() : 'Accepted',
    });
  }
  return adrs;
}

/**
 * Build the machine-readable standard. No timestamps, no SHA — deterministic
 * from token values and prose rules alone.
 */
function buildStandard(tokens, designMd, skillMd) {
  const adrs = parseAdrIndex(skillMd);
  return {
    meta: {
      designSystem: 'Nocturne Museum',
      version: PKG.version,
      canonicalProvenance: 'Vidoxlabs/videsign',
      authorityFiles: ['DESIGN.md', 'SKILL.md'],
      generatedBy: 'scripts/generate-standard.js',
    },
    tokens,
    rules: {
      glass: {
        material: 'crystal',
        scope: [
          'island navigation',
          'overlays and popovers',
          'question bar',
          'persona switcher',
          'evidence lens',
        ],
        neverOn: ['paragraphs', 'cards', 'section containers', 'sidebars'],
        maxLayersPerViewport: 3,
        neverGlassOnGlass: true,
        neverBackdropBlurOnScrollingContainers: true,
        neverAnimateBlur: true,
        textBearing: 'shell+core',
        classes: {
          single: 'vi-glass',
          shell: 'vi-glass-shell',
          core: 'vi-glass-core',
          shellPill: 'vi-glass-shell--pill',
          corePill: 'vi-glass-core--pill',
          control: 'vi-glass--control',
        },
        legibilityFloor: 4.5,
        fallbacks: [
          'prefers-reduced-transparency: reduce',
          'prefers-contrast: more',
          'forced-colors: active',
          '@supports not backdrop-filter',
        ],
        banLegacyUtilities: ['backdrop-blur-*', 'bg-white/*'],
      },
      typography: {
        sans: tokens.typography['typography-family-sans-base'],
        mono: tokens.typography['typography-family-mono-base'],
        displayWeight: tokens.typography['typography-weight-semibold-base'],
        bodyWeight: tokens.typography['typography-weight-regular-base'],
        displayTracking: tokens.typography['typography-tracking-tight-base'],
        labelTracking: tokens.typography['typography-tracking-wide-base'],
        sentenceCase: true,
        banUppercaseUtility: true,
        banTitleCase: true,
        monoFor: ['nav', 'labels', 'status', 'eyebrows', 'table headers'],
        sansFor: ['section titles', 'descriptions', 'body'],
      },
      copy: {
        sentenceCase: true,
        noLoremIpsum: true,
        noEmoji: true,
        noOverclaim: ['verified', 'signed', 'Authorize action'],
      },
      geometry: {
        radiusStandard: tokens.spacing['layout-radius-standard-base'],
        radiusControl: tokens.spacing['layout-radius-control-base'],
        radiusGlass: tokens.spacing['layout-radius-glass-base'],
        radiusFull: tokens.spacing['layout-radius-full-base'],
        bezel: tokens.spacing['layout-padding-bezel-base'],
        banRadius32px: true,
        concentricShell: '20 = 6 + 14 (rim as inset box-shadow)',
      },
      motion: {
        durationsMs: {
          fast: tokens.transition['transition-duration-fast-base'],
          normal: tokens.transition['transition-duration-normal-base'],
          slow: tokens.transition['transition-duration-slow-base'],
          entrance: tokens.transition['transition-duration-entrance-base'],
        },
        easing: {
          standard: tokens.transition['transition-easing-standard-base'],
          spring: tokens.transition['transition-easing-spring-base'],
        },
        animateOnly: ['transform', 'opacity'],
        zeroBounce: true,
        reducedMotion: 'final state under prefers-reduced-motion: reduce',
      },
      spacing: {
        rhythmBasePx: 4,
        pageGutter: tokens.space['rhythm-page-gutter-base'],
        sectionY: tokens.space['rhythm-section-y-base'],
        macroWhitespace: tokens.space['rhythm-macro-base'],
      },
      accessibility: {
        minTouchTarget: tokens.size['action-min-default'],
        contrastFloorText: 4.5,
        personaVioletAccentTextSurfaces: ['primary'],
      },
      personaAccents: {
        violet: tokens.colors['persona-accent-violet-base'],
        wisteria: tokens.colors['persona-accent-wisteria-base'],
        xylia: tokens.colors['persona-accent-xylia-base'],
        yarrow: tokens.colors['persona-accent-yarrow-base'],
        zinnia: tokens.colors['persona-accent-zinnia-base'],
        brandAccent: tokens.colors['surface-accent-violet-base'],
        note: 'Persona accents are identity markers only; never status.',
      },
    },
    adrs,
    designBodySha256: sha256(designMd),
    skillBodySha256: sha256(skillMd),
  };
}

function emitStandardJson(standard) {
  return `${JSON.stringify(standard, null, 2)}\n`;
}

function emitStandardMd(standard) {
  const lines = [
    '# Nocturne Museum — agent standard',
    '',
    'Generated by `scripts/generate-standard.js` from DESIGN.md and SKILL.md.',
    'Do not edit by hand. Run `npm run tokens` to regenerate.',
    '',
    '## Meta',
    '',
    `- Design system: ${standard.meta.designSystem}`,
    `- Version: ${standard.meta.version}`,
    `- Authority: ${standard.meta.authorityFiles.join(', ')}`,
    '',
    '## Glass',
    '',
    `- Material: ${standard.rules.glass.material}`,
    `- Scope: ${standard.rules.glass.scope.join('; ')}`,
    `- Never on: ${standard.rules.glass.neverOn.join('; ')}`,
    `- Max layers: ${standard.rules.glass.maxLayersPerViewport}`,
    `- Text-bearing: ${standard.rules.glass.textBearing}`,
    `- Legibility floor: ${standard.rules.glass.legibilityFloor}:1`,
    `- Ban legacy: ${standard.rules.glass.banLegacyUtilities.join(', ')}`,
    '',
    '## Typography',
    '',
    `- Sans: ${standard.rules.typography.sans}`,
    `- Mono: ${standard.rules.typography.mono}`,
    `- Sentence case: ${standard.rules.typography.sentenceCase}`,
    `- Ban \`uppercase\` utility: ${standard.rules.typography.banUppercaseUtility}`,
    '',
    '## Geometry',
    '',
    `- Standard radius: ${standard.rules.geometry.radiusStandard}`,
    `- Control radius: ${standard.rules.geometry.radiusControl}`,
    `- Glass shell radius: ${standard.rules.geometry.radiusGlass}`,
    `- Bezel: ${standard.rules.geometry.bezel}`,
    `- Concentric: ${standard.rules.geometry.concentricShell}`,
    '',
    '## Motion',
    '',
    `- Durations: ${Object.entries(standard.rules.motion.durationsMs).map(([k, v]) => `${k}=${v}`).join(', ')}`,
    `- Easing standard: ${standard.rules.motion.easing.standard}`,
    `- Easing spring: ${standard.rules.motion.easing.spring}`,
    `- Animate only: ${standard.rules.motion.animateOnly.join(', ')}`,
    '',
    '## Spacing rhythm (ADR-009)',
    '',
    `- Base: ${standard.rules.spacing.rhythmBasePx}px`,
    `- Page gutter: ${standard.rules.spacing.pageGutter}`,
    `- Section Y: ${standard.rules.spacing.sectionY}`,
    `- Macro whitespace: ${standard.rules.spacing.macroWhitespace}`,
    '',
    '## ADR index',
    '',
  ];
  for (const adr of standard.adrs) {
    lines.push(`- **${adr.id}** — ${adr.title}: ${adr.status}`);
  }
  lines.push('');
  return `${lines.join('\n')}\n`;
}

function generateStandardArtifacts(tokens) {
  const designMd = fs.readFileSync(path.join(ROOT, 'DESIGN.md'), 'utf-8');
  const skillMd = fs.readFileSync(path.join(ROOT, 'SKILL.md'), 'utf-8');
  const standard = buildStandard(tokens, designMd, skillMd);
  return {
    'standard.json': emitStandardJson(standard),
    'standard.md': emitStandardMd(standard),
    standard,
  };
}

module.exports = {
  parseAdrIndex,
  buildStandard,
  emitStandardJson,
  emitStandardMd,
  generateStandardArtifacts,
};
