'use strict';

/**
 * Deterministic builder for pipeline/templates/generation-pack.json.
 *
 * Anchor-locked generation data for all five VIs plus the group lineup:
 * per-VI palette channels (from canon/vwxyz/palette.json), lower-body and
 * tie rules, expression notes (from vocabulary.json), drift negatives
 * (from reviewer-checklist.md), negative-prompt components and the
 * first-wave slot list. This pack carries composition rules only — the
 * final prompt prose is assembled by the generator at run time and is not
 * published here (ADR-010). Run:
 *   node pipeline/templates/build-generation-pack.js
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');

const CORE_EXPRESSIONS = [
  'neutral', 'happy', 'thinking', 'focused', 'sad', 'smug', 'wink', 'surprised',
];
const OPERATIONAL_STATES = [
  'alert', 'loading', 'searching', 'success', 'planning', 'keyboard', 'snack',
];
const VISEMES = ['viseme-a', 'viseme-e', 'viseme-i', 'viseme-o', 'viseme-u'];

/** Family constants from canon/vwxyz/README.md section 2, structured. */
const FAMILY = {
  read: 'Kemonomimi woman, two biological cat ears in the hair, no human ears, one tail on all five',
  hair: 'Short bob, jaw to chin, straight or lightly feathered bangs, signature under-light on the bangs underside and inner trim',
  blazer: 'Black single-breasted blazer, two buttons, notch lapel, flap pockets, hip length, thin signature piping on lapel, collar, pocket flaps and cuff edge; same cut on all five',
  shirt: 'White point-collar shirt',
  shoes: 'Black only, no colored soles',
  skin: '#F6D5C3 flat, one shadow tone',
  render: 'Flat cel shading, one shadow tone and at most one highlight, uniform line #1A1A1F, large flat eyes with simple white highlights; no photoreal skin, 3D gradients, complex strands or detailed shadow',
  proportions_full: 'Adult, about 7 to 7.5 heads tall, mature face',
  proportions_chibi: 'About 1.8 to 2 heads tall, head about 55% of figure height',
  banned_on_all: [
    'baked-in text', 'watermark', 'logo', 'extra limbs or fingers',
    'human ears', 'headband ears', 'colored blazers', 'missing tie',
    'jewellery', 'brooch', 'pin', 'flower', 'hat',
  ],
};

/** Lower body, props and silhouette from canon/vwxyz/README.md section 4. */
const LOWER_BODY = {
  violet: {
    lower_body: 'Black straight trousers',
    hosiery_shoes: 'Black loafers',
    allowed_props: ['optional floating panel'],
    silhouette: 'Minimal and sharp',
  },
  wisteria: {
    lower_body: 'Black straight trousers',
    hosiery_shoes: 'Black low pumps',
    allowed_props: ['optional stylus'],
    silhouette: 'Softer lines',
  },
  xylia: {
    lower_body: 'Black pleated knee-length skirt',
    hosiery_shoes: 'Opaque black tights, black loafers',
    allowed_props: ['optional crimson glasses, never on the neutral anchor'],
    silhouette: 'Stricter tailoring, less softness',
  },
  yarrow: {
    lower_body: 'Black pencil skirt, charcoal pinstripe',
    hosiery_shoes: 'Sheer dark tights, black pumps',
    allowed_props: ['optional tablet with a map or graph'],
    silhouette: 'Stable, not flashy',
  },
  zinnia: {
    lower_body: 'Black plain pencil skirt',
    hosiery_shoes: 'Sheer dark tights, black pumps',
    allowed_props: ['optional tablet and stylus'],
    silhouette: 'Kinetic, still composed',
  },
};

/** Per-VI drift negatives from canon/vwxyz/reviewer-checklist.md. */
const DRIFT_NEGATIVES = {
  violet: [
    'brown or plain dark-grey hair', 'blue eyes', 'skirt on a full figure',
    'missing tail', 'missing violet trim',
  ],
  wisteria: [
    'flowers or florals', 'brooch', 'purple eyes', 'black tie', 'long wavy hair',
  ],
  xylia: [
    'any teal or cyan', 'sneer', 'glowing eyes', 'villain-coded drift',
    'grey jacket', 'missing tie',
  ],
  yarrow: [
    'purple trim', 'purple tie', 'purple pinstripe', 'green jacket',
  ],
  zinnia: [
    'orange or ginger hair', 'trim closer to #F43F5E than to #E13D9E',
    'red or orange blazer', 'baked-in text',
  ],
};

function buildPack() {
  const palette = JSON.parse(fs.readFileSync(path.join(ROOT, 'canon', 'vwxyz', 'palette.json'), 'utf8'));
  const vocabulary = JSON.parse(fs.readFileSync(path.join(ROOT, 'canon', 'vwxyz', 'vocabulary.json'), 'utf8'));
  const bgSlug = {
    violet: 'orchestration-deck', wisteria: 'lattice-studio', xylia: 'review-chamber',
    yarrow: 'map-room', zinnia: 'launch-lane',
  };

  const vis = {};
  for (const [name, entry] of Object.entries(palette.vi)) {
    const notes = vocabulary.expression_notes[name] || {};
    const chibiSlots = [
      ...CORE_EXPRESSIONS.map((slot) => ({
        slot,
        kind: 'expression',
        note: notes[slot] || notes['*'] || '',
      })),
      ...OPERATIONAL_STATES.map((slot) => ({ slot, kind: 'state', note: '' })),
      ...VISEMES.map((slot) => ({ slot, kind: 'viseme', note: 'mouth shape only; eyes and pose come from the current expression' })),
    ];
    vis[name] = {
      anchor_asset_id: entry.anchor.asset_id,
      palette_channels: {
        signature: entry.signature,
        hair: entry.hair,
        underlight: entry.underlight,
        eyes: entry.eyes,
        trim: entry.trim,
        tie: entry.tie,
        tail_tip: entry.tail_tip,
        secondary: entry.secondary,
        inner_ear: entry.inner_ear,
        background_base: entry.background.base,
        background_mid: entry.background.mid,
        background_line: entry.background.line,
      },
      tie_rule: `Solid ${entry.tie === palette.shared.tie_black ? 'black' : 'charcoal'} tie, standard width, four-in-hand, no pattern, no tie bar`,
      lower_body: LOWER_BODY[name],
      background: {
        slug: bgSlug[name],
        name: entry.background.name,
        mood: entry.background.mood,
      },
      expression_notes: notes,
      drift_negatives: DRIFT_NEGATIVES[name],
      negative_prompt_components: [
        ...FAMILY.banned_on_all,
        ...DRIFT_NEGATIVES[name],
      ],
      reference_images: [
        { asset_id: entry.anchor.asset_id, role: 'anchor' },
        { asset_id: palette.family_rules.group_reference, role: 'family_lineup' },
      ],
      first_wave_slots: [
        { type: 'sheet', slot: 'anchor', canvas: '2048x1144 RGB' },
        { type: 'bg', slot: bgSlug[name], canvas: '2560x1440 RGB' },
        ...chibiSlots.map((s) => ({ type: 'chibi', canvas: '926x1596 RGBA', ...s })),
      ],
    };
  }

  return {
    schema: 'vidoxlabs.vi-generation-pack/1',
    canon_version: 'v1',
    date: '2026-11-02',
    note: 'Anchor-locked generation composition rules for the five VIs and the group lineup. Palette values come from canon/vwxyz/palette.json (machine source); expression notes from vocabulary.json; drift negatives from reviewer-checklist.md. Final prompt prose is assembled at generation time and is not published here (ADR-010). Rebuild with node pipeline/templates/build-generation-pack.js.',
    family_constants: FAMILY,
    group_lineup: {
      asset_id: 'group/sheet/lineup/v001',
      canvas: '2048x1144 RGB',
      rule: 'All five personas, front view, equal height, shared blazer cut and render; palette values per VI above',
    },
    vis,
  };
}

function main() {
  const pack = buildPack();
  const out = path.join(__dirname, 'generation-pack.json');
  fs.writeFileSync(out, `${JSON.stringify(pack, null, 2)}\n`);
  process.stdout.write(`wrote ${out} (${Object.keys(pack.vis).length} VIs)\n`);
}

if (require.main === module) main();

module.exports = { buildPack };
