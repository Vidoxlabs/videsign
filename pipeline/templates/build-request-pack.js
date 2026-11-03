'use strict';

/**
 * Deterministic builder for pipeline/templates/request-pack.json.
 *
 * Emits one schema-valid asset request ($defs/request in
 * canon/vwxyz/asset-manifest.schema.json) per first-wave asset: each VI's
 * sheet anchor, 20-slot chibi animation set (8 core expressions, 7
 * Living-Interface states, 5 visemes), one bg plate, plus the group
 * lineup. The dedupe_key is the SHA-256 of a canonical string, so the
 * pack is reproducible byte-for-byte. Run:
 *   node pipeline/templates/build-request-pack.js
 */

const crypto = require('crypto');
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

function buildRequests() {
  const palette = JSON.parse(fs.readFileSync(path.join(ROOT, 'canon', 'vwxyz', 'palette.json'), 'utf8'));
  const requests = [];
  let sequence = 0;

  const push = (vi, type, slot, purpose) => {
    sequence += 1;
    const assetId = `${vi}/${type}/${slot}/v001`;
    const canonical = `vidoxlabs.vwxyz.request/v1|${assetId}|${purpose}`;
    requests.push({
      request_id: `req-2026-11-02-${String(sequence).padStart(3, '0')}`,
      vi,
      type,
      slot,
      purpose,
      requester: 'videsign-pipeline',
      status: 'requested',
      dedupe_key: crypto.createHash('sha256').update(canonical).digest('hex'),
      asset_id: assetId,
    });
  };

  for (const vi of Object.keys(palette.vi)) {
    const bgSlug = { violet: 'orchestration-deck', wisteria: 'lattice-studio', xylia: 'review-chamber', yarrow: 'map-room', zinnia: 'launch-lane' }[vi];
    push(vi, 'sheet', 'anchor', `Character anchor sheet for ${vi}, four views at equal height`);
    for (const slot of CORE_EXPRESSIONS) {
      push(vi, 'chibi', slot, `First-wave chibi core expression ${slot} for ${vi}`);
    }
    for (const slot of OPERATIONAL_STATES) {
      push(vi, 'chibi', slot, `First-wave chibi operational state ${slot} for ${vi}`);
    }
    for (const slot of VISEMES) {
      push(vi, 'chibi', slot, `Speech viseme ${slot} mouth shape for ${vi} lip-sync`);
    }
    push(vi, 'bg', bgSlug, `Background plate ${bgSlug} for ${vi}`);
  }
  push('violet', 'sheet', 'lineup', 'Group lineup sheet, all five personas at equal height');
  return requests;
}

function main() {
  const requests = buildRequests();
  const pack = {
    schema: 'vidoxlabs.vi-request-pack/1',
    canon_version: 'v1',
    date: '2026-11-02',
    note: 'One entry per first-wave VWXYZ asset. Each entry validates against $defs/request in canon/vwxyz/asset-manifest.schema.json. dedupe_key is the SHA-256 of "vidoxlabs.vwxyz.request/v1|{asset_id}|{purpose}". Rebuild with node pipeline/templates/build-request-pack.js.',
    count: requests.length,
    requests,
  };
  const out = path.join(__dirname, 'request-pack.json');
  fs.writeFileSync(out, `${JSON.stringify(pack, null, 2)}\n`);
  process.stdout.write(`wrote ${out} (${requests.length} requests)\n`);
}

if (require.main === module) main();

module.exports = { buildRequests };
