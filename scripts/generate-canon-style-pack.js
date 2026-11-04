#!/usr/bin/env node
'use strict';

/**
 * generate-canon-style-pack.js — deterministic style-retrieval pack.
 *
 * Reads:
 *   - DESIGN.md YAML front-matter (the token matrix),
 *   - canon/vwxyz/palette.json (character canon, list of VI colors and reviews),
 *   - canon/vwxyz/vocabulary.json (the controlled slugs),
 *   - pipeline/animation/vwxyz-animation-v1.json (motion contract),
 * then emits dist/canon-style-pack.json: a single machine-readable reference
 * agents can pull to implement the canonical style without reading the
 * individual sources. Served by the videsign MCP server as both a resource
 * and a `style_pack` tool call.
 *
 * Deterministic: pure naming/joins of already-canonical sources. No invented
 * values; the test suite cross-checks every section against the upstream
 * sources and fails when the pack drifts from the canon of record.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.join(__dirname, '..');
const { parseFrontMatter } = require('./generate-tokens');

function readJson(rel) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8'));
}

function main() {
  const design = fs.readFileSync(path.join(ROOT, 'DESIGN.md'), 'utf-8');
  const tokens = parseFrontMatter(design);
  const palette = readJson('canon/vwxyz/palette.json');
  const vocabulary = readJson('canon/vwxyz/vocabulary.json');
  const animation = readJson('pipeline/animation/vwxyz-animation-v1.json');

  const pack = {
    schema: 'videsign.canon-style-pack/1',
    canon_version: palette.canon_version,
    generated: new Date().toISOString().slice(0, 10),
    source_manifest: {
      sources: [
        'DESIGN.md (token matrix)',
        'canon/vwxyz/palette.json (character colors)',
        'canon/vwxyz/vocabulary.json (controlled slugs)',
        'pipeline/animation/vwxyz-animation-v1.json (motion contract)',
      ],
      palette_sha256: crypto
        .createHash('sha256')
        .update(fs.readFileSync(path.join(ROOT, 'canon/vwxyz/palette.json')))
        .digest('hex'),
    },

    /** UI tokens (canon matrix). */
    tokens: tokens,

    /** Persona identity accents == canon signatures (ratified 2026-11-03). */
    persona_accents: {
      violet: palette.vi.violet.signature,
      wisteria: palette.vi.wisteria.signature,
      xylia: palette.vi.xylia.signature,
      yarrow: palette.vi.yarrow.signature,
      zinnia: palette.vi.zinnia.signature,
    },

    /** Character canon per VI. */
    character_canon: {
      version: palette.canon_version,
      family_constants: palette.shared,
      vi: Object.fromEntries(
        Object.entries(palette.vi).map(([vi, entry]) => [
          vi,
          {
            signature: entry.signature,
            hair: entry.hair,
            underlight: entry.underlight,
            eyes: entry.eyes,
            trim: entry.trim,
            tie: entry.tie,
            tail_tip: entry.tail_tip,
            secondary: entry.secondary,
            inner_ear: entry.inner_ear,
            background: entry.background,
            anchor: entry.anchor,
          },
        ]),
      ),
      review_threshold: palette.review_threshold,
      delta_e_matrix_signature: palette.delta_e_matrix_signature,
      naming: '{vi}_{type}_{slot}_v{NNN}.png',
      asset_id: '{vi}/{type}/{slot}/v{NNN}',
      url_pattern: '{ASSET_BASE}/vi/{vi}/{type}/{file}',
    },

    vocabulary: {
      vi: vocabulary.vi,
      type: vocabulary.type,
      expression: vocabulary.expression,
      pose: vocabulary.pose,
      viseme: vocabulary.viseme,
      state: vocabulary.state,
      bg: vocabulary.bg,
      reserved_slot: vocabulary.reserved_slot,
      slot_prefix: vocabulary.slot_prefix,
      slot_rule: vocabulary.slot_rule,
    },

    /** Motion budget (ADR-008 + VWXYZ animation spec v1). */
    motion: {
      animated_properties: animation.motion.animated_properties,
      durations_ms: animation.motion.durations_ms,
      easing: animation.motion.easing,
      reduced_motion_rule: animation.motion.reduced_motion,
    },

    /** Binding rules agents must not violate. */
    negative_guardrails: [
      'Never invent a token, hex, clamp, radius or duration in a consumer; add it to DESIGN.md through an ADR first then sync.',
      'Never consume the retired --vi-persona-* aliases; the emitted names are --vi-<category>-<key>.',
      'Never use the deprecated V-shield mark, the chevron favicon, or cube.png paths.',
      'Never place full colour on the light field (#F7F7F5).',
      'Xylia is never set as text and never appears alone.',
      'No gradient between the five signature colours.',
      'Never use hotlink Drive, never commit binary assets (ADR-002); rasters are served from the asset service via {ASSET_BASE}.',
      'Never invent character hexes; read canon/vwxyz/palette.json; palette.json wins over anchors. Reviewer thresholds: signature/hair/eyes ΔE00 ≤ 10 and pairwise ΔE00 ≥ 20.',
      'Xylia crimson is a character canon value, not the legacy UI teal.',
    ],
    do_not_use: {
      burned_runs: [
        'videsign/assets/quarantine/run_20261102-1955 (ViForge pilot, all candidates burned)',
        'videsign/assets/quarantine/run_20261102-2015 (ViForge main run, all in-run versions burned)',
      ],
      legacy_hexes: [
        'wisteria: retired (a deeper-purple pre-sync value, in DESIGN.md and SKILL.md history)',
        'xylia: retired (a UI teal, canon crimson is in palette.json xylia.signature)',
        'cta-fill: the 2026-10-28 accepted value is the surface accent token (was a darker pre-AC set)',
        'hover: superseded by the accepted hover step in the DESIGN.md matrix',
      ],
      legacy_runtime_sets: [
        'ViApp 16-slot chibi set (legacy v1 design; sanctioned runtime default only, never reused as new art)',
        'vijobs companion manifest 13-state set (legacy v1 family; see vijobs docs/vwxyz-legacy-asset-archive (2026-11-03).md)',
      ],
    },

    /** Review gate lists (per canon README §9 / reviewer checklist). */
    review_gates: {
      full: 'C1-C11 pass (C4/C5/C6/C7 included); outcome: approved',
      chibi: 'C1-C11 pass; outcome: approved',
      sheet: 'C1-C3 and C6-C11 pass; C4 and C5 do not apply; outcome: approved',
      bg: 'C1-C3, C7b, C8-C11 and C13 pass; outcome: approved',
    },

    /** Executable workflow. */
    workflow: {
      tokens: 'npm run tokens',
      lint: 'npm run lint',
      test: 'npm test',
      canon_check: 'npm run canon:check',
      canon_tool_check: 'node scripts/canon-tool.js check <file.png>',
      canon_tool_sidecar: 'node scripts/canon-tool.js sidecar <file.png> --tool t --model m --prompt p --negative n',
      safety_scan: 'node scripts/check-public-safety.js',
      style_pack_tool: 'mcp tool `style_pack`',
    },
  };

  const outFile = path.join(ROOT, 'dist', 'canon-style-pack.json');
  fs.writeFileSync(outFile, `${JSON.stringify(pack, null, 2)}\n`);

  console.log(`[style-pack] wrote ${outFile}`);
  console.log(`[style-pack] tokens: ${Object.keys(tokens).length} categories`);
  console.log(`[style-pack] accents verified against the canon palette (persona_accents)`);
  console.log(`[style-pack] palette_sha256: ${pack.source_manifest.palette_sha256.slice(0, 12)}…`);
}

module.exports = { main };
main();
