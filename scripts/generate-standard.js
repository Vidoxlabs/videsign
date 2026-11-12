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
const { STAGE_VARIANT_OPACITY, STAGE_NARROW_AMBIENT_OPACITY, STAGE_TEXT_SCRIM } = require('../lib/stage');

/** Canon order of the five signature colours (ADR-011, ADR-013). */
const SIGNATURE_ORDER = ['violet', 'wisteria', 'xylia', 'yarrow', 'zinnia'];

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
          'chat dock',
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
        ambient: {
          drift: tokens.transition['transition-duration-ambient-drift-base'],
          pulse: tokens.transition['transition-duration-ambient-pulse-base'],
          scope: 'ambient loops only (the stage backdrop), never interactions',
          pauseControl: 'visible control in every product (WCAG 2.2.2)',
        },
      },
      stage: {
        adr: 'ADR-013',
        lights: SIGNATURE_ORDER,
        crown: 'xylia',
        ringSegmentsCanonCycle: true,
        oneSignatureColourPerGradient: true,
        noGridPattern: true,
        dotGridRetired: true,
        readingTextBound: 'every layer keeps secondary text at 4.5:1; full strength only behind a scrim',
        stopsUnder: ['prefers-reduced-motion: reduce', 'pause control'],
        primitive: 'lib/stage.js',
        stylesheet: 'dist/stage.css',
        ambientOpacity: STAGE_VARIANT_OPACITY.ambient,
        narrowAmbientOpacity: STAGE_NARROW_AMBIENT_OPACITY,
        heroTextScrim: STAGE_TEXT_SCRIM,
        contrastOver: 'page field only; opaque surfaces cover the stage',
      },
      fiveBar: {
        adr: 'ADR-013',
        order: SIGNATURE_ORDER,
        height: tokens.size['indicator-fivebar-base'],
        hardSegments: true,
        usedOn: ['under the wordmark or a hero headline', 'top of bezelled fact panels', 'foot of the chat launcher'],
      },
      graphLine: {
        adr: 'ADR-013',
        dark: tokens.colors['border-graph-line-base'],
        light: tokens.colors['border-graph-line-light'],
        minContrast: 3,
        hairlineForSeparatorsOnly: tokens.colors['border-separator-primary-base'],
      },
      chatDock: {
        adr: 'ADR-013',
        launcher: 'fixed bottom right, at least the touch target, mark or five seat dots plus a label, five-bar foot',
        dialog: { role: 'dialog', ariaModal: false, closesOn: 'Escape', material: 'glass shell + core' },
        log: { role: 'log', ariaLive: 'polite', ariaRelevant: 'additions', labelled: true },
        personaSwitcher: { seats: SIGNATURE_ORDER, pressedState: 'aria-pressed' },
        seatNamesInPrimaryText: true,
        composer: 'Enter sends, Shift+Enter adds a line',
        disclosureRequired: true,
        neverDrawTheMark: true,
      },
      conversation: {
        adr: 'ADR-014',
        appliesTo: ['chat dock', 'full-page chat', 'native product panels'],
        atRest: ['one header row', 'the conversation', 'one composer field', 'one disclosure line'],
        header: {
          rows: 1,
          firstLine: ['seat name', 'seat role', 'overflow menu', 'close'],
          secondLine: ['seat dots'],
          heightSetBy: 'avatar',
          narrow: 'the role is dropped; nothing wraps',
          notPrinted: ['product title', 'model badge', 'state label'],
          overflowMenus: 1,
        },
        seatDots: {
          seats: SIGNATURE_ORDER,
          pressedState: 'aria-pressed',
          namedBy: 'accessible name',
          minTarget: tokens.size['action-min-default'],
          printsNames: false,
        },
        messages: {
          guide: 'text on the core, no card',
          visitor: 'the only bubble, tertiary surface, aligned to the end',
          speakerMarker: 'five-segment marker and seat name, only when the speaker changes',
          actions: 'on hover and keyboard focus; on the latest reply where hover is unavailable',
          provenance: 'labelled only off the default path',
        },
        starters: { max: 4, sources: 1, leaveAfterFirstTurn: true },
        followUps: { max: 3, latestReplyOnly: true },
        composer: {
          fields: 1,
          sendInsideField: true,
          optionalModeOnlyWhileEmpty: true,
          keys: 'Enter sends, Shift+Enter adds a line',
        },
        disclosure: {
          linesAtRest: 1,
          detail: 'expands in place',
          beforeFirstTurn: 'the full statement stands where typed text is sent to a service',
        },
        states: ['idle', 'composing', 'thinking', 'streaming', 'settled', 'failed'],
        motion: {
          open: tokens.transition['transition-duration-slow-base'],
          openEasing: tokens.transition['transition-easing-spring-base'],
          turnEnter: tokens.transition['transition-duration-normal-base'],
          onlyLoop: 'thinking pulse',
        },
        fullPageMeasure: '65ch',
      },
      instrument: {
        adr: 'ADR-015',
        everyControlHasConsequence: true,
        opensWith: ['what it shows', 'what to try'],
        anatomy: ['diagram as readout', 'controls', 'receipt'],
        surface: 'solid panel on the secondary surface, never glass',
        controls: {
          boolean: 'switch row, whole row is the hit area',
          number: 'labelled range with a tabular mono value',
          presets: 'one segmented control',
          banned: ['bordered fieldset', 'default checkbox', 'duplicate heading and legend'],
          minTarget: tokens.size['action-min-default'],
        },
        diagram: {
          line: tokens.colors['border-graph-line-base'],
          current: 'accent outline',
          blocked: tokens.colors['status-indicator-error-base'],
          blockedNeedsTextLabel: true,
          labelsNeverOverlap: true,
        },
        receipt: { form: 'hairline-separated ledger rows', ariaLive: 'polite' },
        syntheticStatedOnce: true,
        seatColoursOnlyAsSetOfFive: true,
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
        contrastFloorNonText: 3,
        personaVioletAccentTextSurfaces: ['primary'],
        xyliaNeverText: true,
        xyliaNeverAlone: true,
        pauseControlForAmbientMotion: true,
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
    `- Ambient loops: drift ${standard.rules.motion.ambient.drift}, pulse ${standard.rules.motion.ambient.pulse}; ${standard.rules.motion.ambient.scope}`,
    `- Pause control: ${standard.rules.motion.ambient.pauseControl}`,
    '',
    '## Stage backdrop (ADR-013)',
    '',
    `- Lights in canon order: ${standard.rules.stage.lights.join(', ')} (crown: ${standard.rules.stage.crown})`,
    '- One signature colour per gradient; the ring is five single-colour segments in the canon cycle',
    '- No grid pattern; the dot grid is retired for page backgrounds',
    `- Reading text: ${standard.rules.stage.readingTextBound}`,
    `- Stops under: ${standard.rules.stage.stopsUnder.join('; ')}`,
    `- Primitive: ${standard.rules.stage.primitive} with ${standard.rules.stage.stylesheet}; ambient ${standard.rules.stage.ambientOpacity} (narrow ${standard.rules.stage.narrowAmbientOpacity}), hero copy on a ${standard.rules.stage.heroTextScrim} scrim`,
    '',
    '## Five-bar rule (ADR-013)',
    '',
    `- Order: ${standard.rules.fiveBar.order.join(', ')}`,
    `- Height: ${standard.rules.fiveBar.height}, hard segments, never a blended gradient`,
    `- Used on: ${standard.rules.fiveBar.usedOn.join('; ')}`,
    '',
    '## Graph line (ADR-013)',
    '',
    `- Dark: ${standard.rules.graphLine.dark}; light: ${standard.rules.graphLine.light}`,
    `- Minimum contrast: ${standard.rules.graphLine.minContrast}:1 (WCAG 1.4.11)`,
    `- Hairline ${standard.rules.graphLine.hairlineForSeparatorsOnly} is for layout separators only`,
    '',
    '## Chat dock (ADR-013)',
    '',
    `- Launcher: ${standard.rules.chatDock.launcher}`,
    `- Dialog: role=${standard.rules.chatDock.dialog.role}, aria-modal=${standard.rules.chatDock.dialog.ariaModal}, closes on ${standard.rules.chatDock.dialog.closesOn}, ${standard.rules.chatDock.dialog.material}`,
    `- Log: role=${standard.rules.chatDock.log.role}, aria-live=${standard.rules.chatDock.log.ariaLive}, aria-relevant=${standard.rules.chatDock.log.ariaRelevant}, labelled`,
    `- Composer: ${standard.rules.chatDock.composer}`,
    '- Seat names stay in the primary text colour; a disclosure line says how answers are produced',
    '',
    '## Conversation surface (ADR-014)',
    '',
    `- Applies to: ${standard.rules.conversation.appliesTo.join('; ')}`,
    `- At rest: ${standard.rules.conversation.atRest.join('; ')}`,
    `- Header (one row, as tall as the avatar): first line ${standard.rules.conversation.header.firstLine.join(', ')}; second line ${standard.rules.conversation.header.secondLine.join(', ')}; not printed: ${standard.rules.conversation.header.notPrinted.join(', ')}`,
    `- Seat dots: ${standard.rules.conversation.seatDots.seats.join(', ')}; ${standard.rules.conversation.seatDots.pressedState}; hit area at least ${standard.rules.conversation.seatDots.minTarget} in both dimensions; no printed names`,
    `- Guide reply: ${standard.rules.conversation.messages.guide}; visitor turn: ${standard.rules.conversation.messages.visitor}`,
    `- Speaker marker: ${standard.rules.conversation.messages.speakerMarker}`,
    `- Message actions: ${standard.rules.conversation.messages.actions}`,
    `- Provenance: ${standard.rules.conversation.messages.provenance}`,
    `- Starters: at most ${standard.rules.conversation.starters.max}, one source, gone after the first turn; follow-ups: at most ${standard.rules.conversation.followUps.max}, latest reply only`,
    `- Composer: one field with send inside; ${standard.rules.conversation.composer.keys}`,
    `- Disclosure: ${standard.rules.conversation.disclosure.linesAtRest} line at rest, detail ${standard.rules.conversation.disclosure.detail}; before the first turn ${standard.rules.conversation.disclosure.beforeFirstTurn}`,
    `- States: ${standard.rules.conversation.states.join(', ')}`,
    `- Motion: opens on ${standard.rules.conversation.motion.open}, a turn enters on ${standard.rules.conversation.motion.turnEnter}; the only loop is the ${standard.rules.conversation.motion.onlyLoop}`,
    '',
    '## Explorable instrument (ADR-015)',
    '',
    '- Every control changes the readout or the diagram, or it is removed',
    `- Opens with: ${standard.rules.instrument.opensWith.join('; ')}`,
    `- Anatomy: ${standard.rules.instrument.anatomy.join(', ')}; ${standard.rules.instrument.surface}`,
    `- Controls: boolean = ${standard.rules.instrument.controls.boolean}; number = ${standard.rules.instrument.controls.number}; presets = ${standard.rules.instrument.controls.presets}`,
    `- Banned: ${standard.rules.instrument.controls.banned.join(', ')}`,
    `- Diagram: lines ${standard.rules.instrument.diagram.line}; current = ${standard.rules.instrument.diagram.current}; blocked = ${standard.rules.instrument.diagram.blocked} with a text label; labels never overlap`,
    `- Receipt: ${standard.rules.instrument.receipt.form}, aria-live=${standard.rules.instrument.receipt.ariaLive}`,
    '- A fixture-driven instrument says so once; seat colours only where the five seats appear together',
    '',
    '## Accessibility',
    '',
    `- Touch target: ${standard.rules.accessibility.minTouchTarget}`,
    `- Text contrast: ${standard.rules.accessibility.contrastFloorText}:1; non-text contrast: ${standard.rules.accessibility.contrastFloorNonText}:1`,
    '- Xylia is never text and never appears alone',
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
  SIGNATURE_ORDER,
  parseAdrIndex,
  buildStandard,
  emitStandardJson,
  emitStandardMd,
  generateStandardArtifacts,
};
