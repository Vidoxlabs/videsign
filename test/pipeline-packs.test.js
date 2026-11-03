'use strict';

/**
 * Pipeline packs and animation contract: the request and generation packs
 * validate against the canon schema, rebuild byte-identically from their
 * builders, the animation spec only uses vocabulary slots, and the persona
 * identity badges draw only from the five signature hexes and two field
 * neutrals.
 */

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const { validate, slotAllowed } = require('../scripts/lib/canon-validate');
const { buildRequests } = require('../pipeline/templates/build-request-pack');
const { buildPack } = require('../pipeline/templates/build-generation-pack');

const ROOT = path.join(__dirname, '..');
const CANON = path.join(ROOT, 'canon', 'vwxyz');
const schema = JSON.parse(fs.readFileSync(path.join(CANON, 'asset-manifest.schema.json'), 'utf8'));
const vocabulary = JSON.parse(fs.readFileSync(path.join(CANON, 'vocabulary.json'), 'utf8'));
const palette = JSON.parse(fs.readFileSync(path.join(CANON, 'palette.json'), 'utf8'));

test('request-pack validates against $defs/request and rebuilds identically', () => {
  const pack = JSON.parse(fs.readFileSync(path.join(ROOT, 'pipeline', 'templates', 'request-pack.json'), 'utf8'));
  const rebuilt = { ...pack, count: 0, requests: buildRequests() };
  rebuilt.count = rebuilt.requests.length;
  assert.deepEqual(rebuilt, pack);
  assert.equal(pack.requests.length, 111);
  for (const request of pack.requests) {
    assert.deepEqual(validate(schema, schema.$defs.request, request, 'request'), [], request.asset_id);
  }
  const ids = pack.requests.map((request) => request.asset_id);
  assert.equal(new Set(ids).size, ids.length, 'duplicate asset ids in request pack');
});

test('generation-pack rebuilds identically and stays anchored to the canon palette', () => {
  const pack = JSON.parse(fs.readFileSync(path.join(ROOT, 'pipeline', 'templates', 'generation-pack.json'), 'utf8'));
  assert.deepEqual(buildPack(), pack);
  for (const [name, entry] of Object.entries(palette.vi)) {
    const channels = pack.vis[name].palette_channels;
    assert.equal(channels.signature, entry.signature);
    assert.equal(channels.hair, entry.hair);
    assert.equal(channels.underlight, entry.underlight);
    assert.equal(channels.eyes, entry.eyes);
    assert.equal(channels.trim, entry.trim);
    assert.equal(channels.tie, entry.tie);
    assert.equal(channels.tail_tip, entry.tail_tip);
    assert.equal(channels.secondary, entry.secondary);
    assert.equal(channels.inner_ear, entry.inner_ear);
    assert.equal(channels.background_base, entry.background.base);
    assert.equal(channels.background_mid, entry.background.mid);
    assert.equal(channels.background_line, entry.background.line);
  }
  assert.equal(pack.group_lineup.asset_id, palette.family_rules.group_reference);
});

test('animation spec uses only vocabulary slots and canon motion tokens', () => {
  const spec = JSON.parse(fs.readFileSync(path.join(ROOT, 'pipeline', 'animation', 'vwxyz-animation-v1.json'), 'utf8'));
  for (const slot of spec.sprite_matrix.core_expressions) {
    assert.ok(vocabulary.expression.includes(slot), slot);
  }
  for (const slot of spec.sprite_matrix.operational_states) {
    assert.ok(vocabulary.state.includes(slot), slot);
  }
  for (const slot of spec.sprite_matrix.visemes) {
    assert.ok(slotAllowed(vocabulary, slot, 'violet'), slot);
  }
  for (const [legacy, alias] of Object.entries(spec.sprite_matrix.legacy_alias)) {
    assert.ok(vocabulary.expression.includes(alias), alias);
    assert.equal(slotAllowed(vocabulary, legacy, 'violet'), false, legacy);
  }
  const layerNames = spec.layers.map((layer) => layer.name);
  assert.equal(new Set(layerNames).size, layerNames.length);
  assert.deepEqual(spec.layers.map((layer) => layer.order), [...Array(spec.layers.length).keys()].map((i) => i + 1));
  for (const layer of spec.layers) {
    assert.match(layer.name, /^[a-z_]+$/);
    assert.ok(layer.pivot.x >= 0 && layer.pivot.x <= 1);
    assert.ok(layer.pivot.y >= 0 && layer.pivot.y <= 1);
  }

  const design = fs.readFileSync(path.join(ROOT, 'DESIGN.md'), 'utf8');
  const front = design.slice(0, design.indexOf('\n---\n', 4));
  assert.match(front, /transition-duration-fast-base: "150ms"/);
  assert.match(front, /transition-duration-normal-base: "200ms"/);
  assert.match(front, /transition-duration-slow-base: "300ms"/);
  assert.match(front, /transition-duration-entrance-base: "500ms"/);
  assert.match(front, /transition-easing-standard-base: "cubic-bezier\(0\.16, 1, 0\.3, 1\)"/);
  assert.match(front, /transition-easing-spring-base: "cubic-bezier\(0\.32, 0\.72, 0, 1\)"/);
  assert.equal(spec.motion.easing.standard, 'cubic-bezier(0.16, 1, 0.3, 1)');
  assert.equal(spec.motion.easing.spring, 'cubic-bezier(0.32, 0.72, 0, 1)');
});

test('persona identity badges use only the seven allow-listed colours', () => {
  const html = fs.readFileSync(path.join(ROOT, 'preview', 'persona-identity-badge.html'), 'utf8');
  const allowed = new Set(['#8B5CF6', '#B4A7F2', '#D92B3A', '#F0A020', '#E13D9E', '#121214', '#F7F7F5']);
  const fills = [...html.matchAll(/fill="(#[0-9A-F]{6})"/g)].map((match) => match[1]);
  assert.ok(fills.length >= 20, 'expected the badge set and mono row');
  for (const fill of fills) assert.ok(allowed.has(fill), fill);
  const darkGlyphs = { '#8B5CF6': 0, '#B4A7F2': 0, '#D92B3A': 0, '#F0A020': 0, '#E13D9E': 0 };
  for (const fill of fills) if (fill in darkGlyphs) darkGlyphs[fill] += 1;
  for (const [hex, count] of Object.entries(darkGlyphs)) {
    assert.ok(count >= 1, `signature ${hex} missing from the badge set`);
  }
  const index = fs.readFileSync(path.join(ROOT, 'preview', 'index.html'), 'utf8');
  assert.ok(index.includes('persona-identity-badge.html'), 'badge fragment missing from the catalog');
});
