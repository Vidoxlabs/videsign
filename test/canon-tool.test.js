'use strict';

/**
 * canon-tool contract: the CLI validates C1/C3/C4/C8, detects identity
 * confusion, generates schema-valid sidecars and manifest entries, and
 * fails closed on malformed input. Fixtures are encoded in-test with a
 * minimal PNG writer so the suite needs no binary fixtures in git.
 */

const { test } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');
const zlib = require('zlib');

const { decodePng } = require('../scripts/lib/png');
const { loadCanon } = require('../scripts/canon-tool');
const { validate } = require('../scripts/lib/canon-validate');

const ROOT = path.join(__dirname, '..');
const TOOL = path.join(ROOT, 'scripts', 'canon-tool.js');

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (const byte of buf) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, body) {
  const out = Buffer.alloc(12 + body.length);
  out.writeUInt32BE(body.length, 0);
  out.write(type, 4, 'ascii');
  body.copy(out, 8);
  out.writeUInt32BE(crc32(out.subarray(4, 8 + body.length)), 8 + body.length);
  return out;
}

/**
 * Encode a PNG from flat colour regions. colorType 6 = RGBA, 2 = RGB.
 * regions: {x0, y0, x1, y1 (exclusive), r, g, b, a?}
 */
function encodePng(width, height, colorType, regions) {
  const channels = colorType === 6 ? 4 : 3;
  const stride = width * channels;
  const raw = Buffer.alloc(height * (stride + 1));
  for (let y = 0; y < height; y += 1) raw[y * (stride + 1)] = 0;
  for (const region of regions) {
    for (let y = region.y0; y < region.y1; y += 1) {
      for (let x = region.x0; x < region.x1; x += 1) {
        const i = y * (stride + 1) + 1 + x * channels;
        raw[i] = region.r;
        raw[i + 1] = region.g;
        raw[i + 2] = region.b;
        if (channels === 4) raw[i + 3] = region.a === undefined ? 255 : region.a;
      }
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = colorType;
  const idat = zlib.deflateSync(raw, { level: 9 });
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

function hexRgb(hex) {
  return {
    r: Number.parseInt(hex.slice(1, 3), 16),
    g: Number.parseInt(hex.slice(3, 5), 16),
    b: Number.parseInt(hex.slice(5, 7), 16),
  };
}

/** Canon-coloured Violet chibi fixture regions (inside the 3% border). */
function violetChibiRegions() {
  const canon = loadCanon();
  const v = canon.palette.vi.violet;
  const box = (hex, x0, y0, x1, y1) => ({ ...hexRgb(hex), x0, y0, x1, y1 });
  return [
    box(v.hair, 300, 200, 626, 400),
    box(v.underlight, 320, 380, 606, 420),
    box(v.eyes, 340, 430, 460, 470),
    box(v.eyes, 466, 430, 586, 470),
    box(v.trim, 300, 500, 626, 540),
    box(v.tie, 430, 560, 496, 900),
    box(v.tail_tip, 640, 900, 700, 1000),
    box(canon.palette.shared.blazer, 280, 520, 646, 1100),
    box(canon.palette.shared.shirt, 400, 540, 526, 1100),
  ];
}

function withTempDir(fn) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'videsign-canon-tool-'));
  try {
    return fn(dir);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

function runTool(args) {
  return spawnSync(process.execPath, [TOOL, ...args], { cwd: ROOT, encoding: 'utf8' });
}

test('fixture encoder round-trips through the decoder', () => {
  const bytes = encodePng(16, 16, 6, [
    { x0: 2, y0: 2, x1: 6, y1: 6, ...hexRgb('#8B5CF6'), a: 200 },
  ]);
  const png = decodePng(bytes);
  assert.equal(png.width, 16);
  assert.equal(png.height, 16);
  assert.equal(png.mode, 'RGBA');
  assert.deepEqual(png.pixelAt(3, 3), [0x8b, 0x5c, 0xf6, 200]);
  assert.equal(png.pixelAt(0, 0)[3], 0);
  assert.equal(png.histogram.size, 1);
});

test('a canon-coloured chibi candidate passes C1, C3, C4 and C8', () => {
  withTempDir((dir) => {
    const file = path.join(dir, 'violet_chibi_neutral_v001.png');
    fs.writeFileSync(file, encodePng(926, 1596, 6, violetChibiRegions()));
    const result = runTool(['check', file]);
    assert.equal(result.status, 0, result.stderr + result.stdout);
    const summary = JSON.parse(result.stdout.slice(result.stdout.indexOf('{')));
    assert.equal(summary.ok, true);
    const checks = summary.files[0].checks;
    assert.equal(checks.C1.ok, true);
    assert.equal(checks.C3.ok, true);
    assert.equal(checks.C4.ok, true);
    assert.equal(checks.C8.ok, true);
    assert.equal(summary.files[0].identity.nearest_vi, 'violet');
    assert.ok(summary.files[0].swatches.trim.delta_e <= 10);
    assert.ok(summary.files[0].swatches.hair.delta_e <= 10);
    assert.ok(summary.files[0].swatches.eyes.delta_e <= 10);
  });
});

test('wrong canvas, wrong mode and an opaque border fail closed', () => {
  withTempDir((dir) => {
    const badDims = path.join(dir, 'violet_chibi_neutral_v001.png');
    fs.writeFileSync(badDims, encodePng(463, 798, 6, violetChibiRegions()));
    let result = runTool(['check', badDims]);
    assert.equal(result.status, 1);
    let summary = JSON.parse(result.stdout.slice(result.stdout.indexOf('{')));
    assert.equal(summary.files[0].checks.C3.ok, false);

    const badMode = path.join(dir, 'violet_chibi_happy_v001.png');
    fs.writeFileSync(badMode, encodePng(926, 1596, 2, violetChibiRegions()));
    result = runTool(['check', badMode]);
    summary = JSON.parse(result.stdout.slice(result.stdout.indexOf('{')));
    assert.equal(summary.files[0].checks.C3.ok, false);
    assert.equal(summary.files[0].checks.C3.detail.includes('RGBA'), true);

    const opaqueBorder = path.join(dir, 'violet_chibi_sad_v001.png');
    const regions = [{ x0: 0, y0: 0, x1: 926, y1: 40, ...hexRgb('#8B5CF6') }, ...violetChibiRegions()];
    fs.writeFileSync(opaqueBorder, encodePng(926, 1596, 6, regions));
    result = runTool(['check', opaqueBorder]);
    summary = JSON.parse(result.stdout.slice(result.stdout.indexOf('{')));
    assert.equal(summary.files[0].checks.C4.ok, false);
  });
});

test('recoloured trim fails C8 and the identity-confusion test', () => {
  withTempDir((dir) => {
    const file = path.join(dir, 'violet_chibi_smug_v001.png');
    const drifted = violetChibiRegions().map((region) => (
      region.x0 === 300 && region.y0 === 500 ? { ...region, ...hexRgb('#E13D9E') } : region
    ));
    fs.writeFileSync(file, encodePng(926, 1596, 6, drifted));
    const result = runTool(['check', file]);
    assert.equal(result.status, 1);
    const summary = JSON.parse(result.stdout.slice(result.stdout.indexOf('{')));
    assert.equal(summary.files[0].checks.C8.ok, false);
    // The drift scan catches the foreign signature hue even though the
    // underlight region still carries the correct violet signature.
    const foreign = summary.files[0].identity.foreign_signature_colors;
    assert.ok(foreign.some((hit) => hit.nearest_vi === 'zinnia' && hit.sampled === '#E13D9E'));
  });
});

test('C1 rejects unknown slots and duplicate versions in one stage', () => {
  withTempDir((dir) => {
    const bytes = encodePng(926, 1596, 6, violetChibiRegions());
    const unknown = path.join(dir, 'violet_chibi_not-a-slot_v001.png');
    fs.writeFileSync(unknown, bytes);
    const result = runTool(['check', unknown]);
    assert.equal(result.status, 1);
    const summary = JSON.parse(result.stdout.slice(result.stdout.indexOf('{')));
    assert.equal(summary.files[0].checks.C1.ok, false);
    assert.equal(summary.files[0].checks.C1.detail.includes('not-a-slot'), true);

    // Version clash detection: same vi/type/slot/version reported twice in
    // the staged sibling list (e.g. two stage roots merged at review time).
    const { checkOne } = require('../scripts/canon-tool');
    const canon = loadCanon();
    const staged = path.join(dir, 'violet_chibi_wink_v001.png');
    fs.writeFileSync(staged, bytes);
    const clash = checkOne(staged, canon, [staged, staged]);
    assert.equal(clash.checks.C1.ok, false);
    assert.ok(clash.checks.C1.detail.includes('appears 2 times'));
    const solo = checkOne(staged, canon, [staged]);
    assert.equal(solo.checks.C1.ok, true);
  });
});

test('a bg plate is checked against base, mid and line without identity', () => {
  withTempDir((dir) => {
    const canon = loadCanon();
    const bg = canon.palette.vi.yarrow.background;
    const box = (hex, x0, y0, x1, y1) => ({ ...hexRgb(hex), x0, y0, x1, y1 });
    const file = path.join(dir, 'yarrow_bg_map-room_v001.png');
    fs.writeFileSync(file, encodePng(2560, 1440, 2, [
      box(bg.base, 0, 0, 2560, 1440),
      box(bg.mid, 200, 300, 900, 1200),
      box(bg.line, 1200, 200, 2360, 260),
    ]));
    const result = runTool(['check', file]);
    assert.equal(result.status, 0, result.stderr + result.stdout);
    const summary = JSON.parse(result.stdout.slice(result.stdout.indexOf('{')));
    assert.equal(summary.files[0].identity, null);
    assert.equal(summary.files[0].swatches.base.delta_e, 0);
  });
});

test('sidecar command writes a schema-valid sidecar and manifest entry', () => {
  withTempDir((dir) => {
    const file = path.join(dir, 'violet_chibi_thinking_v001.png');
    fs.writeFileSync(file, encodePng(926, 1596, 6, violetChibiRegions()));
    const result = runTool([
      'sidecar', file,
      '--tool', 'fixture-tool',
      '--model', 'fixture-model',
      '--seed', '42',
      '--prompt', 'fixture prompt',
      '--negative', 'fixture negative',
      '--created-at', '2026-11-02',
    ]);
    assert.equal(result.status, 0, result.stderr);
    const sidecarPath = file.replace(/\.png$/, '.sidecar.json');
    assert.ok(fs.existsSync(sidecarPath));
    const payload = JSON.parse(result.stdout.slice(result.stdout.indexOf('{')));
    const canon = loadCanon();
    assert.deepEqual(validate(canon.schema, canon.schema.$defs.sidecar, payload.sidecar, 'sidecar'), []);
    assert.deepEqual(validate(canon.schema, canon.schema.$defs.manifestEntry, payload.manifestEntry, 'entry'), []);
    assert.equal(payload.sidecar.review.status, 'quarantine');
    assert.equal(payload.sidecar.review.failed_items.length, 0);
    assert.equal(
      payload.sidecar.sha256,
      crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex'),
    );
    assert.equal(
      payload.sidecar.palette_sha256,
      crypto.createHash('sha256').update(fs.readFileSync(path.join(ROOT, 'canon', 'vwxyz', 'palette.json'))).digest('hex'),
    );
    assert.equal(payload.manifestEntry.url, 'https://assets.vidoxlabs.dev/vi/violet/chibi/violet_chibi_thinking_v001.png');
    assert.equal(payload.manifestEntry.key, 'vi/violet/chibi/violet_chibi_thinking_v001.png');
    assert.equal(payload.manifestEntry.status, 'needs-regen');
    assert.equal(payload.manifestEntry.approved_at, null);
    assert.equal(payload.manifestEntry.legacy_alias, null);
  });
});

test('sidecar command refuses a candidate that fails automated checks', () => {
  withTempDir((dir) => {
    const file = path.join(dir, 'violet_chibi_alert_v001.png');
    fs.writeFileSync(file, encodePng(100, 100, 6, violetChibiRegions()));
    const result = runTool([
      'sidecar', file,
      '--tool', 't', '--model', 'm', '--prompt', 'p', '--negative', 'n',
    ]);
    assert.equal(result.status, 1);
    assert.ok(result.stderr.includes('automated checks failed'));
    assert.ok(!fs.existsSync(file.replace(/\.png$/, '.sidecar.json')));
  });
});

test('check reports a missing file as a failure, not a crash', () => {
  const result = runTool(['check', 'does-not-exist.png']);
  assert.equal(result.status, 1);
  const summary = JSON.parse(result.stdout.slice(result.stdout.indexOf('{')));
  assert.equal(summary.files[0].ok, false);
});
