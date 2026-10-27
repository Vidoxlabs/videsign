/**
 * VWXYZ character canon v1: palette shape, signature separation,
 * vocabulary slugs and a public-safety scan of canon/.
 */

const { test } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');
const { spawnSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { deltaE00, deltaE00Hex } = require('../scripts/lib/ciede2000');
const {
  DEFAULT_TARGETS,
  OPERATOR_ENV,
  scanPaths,
  scanText,
} = require('../scripts/check-public-safety');

const ROOT = path.join(__dirname, '..');
const CANON = path.join(ROOT, 'canon');
const VWXYZ = path.join(CANON, 'vwxyz');

const CHANNELS = [
  'hair',
  'underlight',
  'eyes',
  'trim',
  'tie',
  'tail_tip',
  'secondary',
  'inner_ear',
];

const SIGNATURES = {
  violet: '#8B5CF6',
  wisteria: '#B4A7F2',
  xylia: '#D92B3A',
  yarrow: '#F0A020',
  zinnia: '#E13D9E',
};

const ANCHORS = {
  violet: 'violet/sheet/anchor/v001',
  wisteria: 'wisteria/sheet/anchor/v001',
  xylia: 'xylia/sheet/anchor/v001',
  yarrow: 'yarrow/sheet/anchor/v001',
  zinnia: 'zinnia/sheet/anchor/v001',
};

const KEBAB = /^[a-z0-9]+(-[a-z0-9]+)*$/;

function readJson(name) {
  return JSON.parse(fs.readFileSync(path.join(VWXYZ, name), 'utf8'));
}

function deref(root, schema) {
  if (schema && schema.$ref) {
    const prefix = '#/$defs/';
    if (!schema.$ref.startsWith(prefix) || !root.$defs[schema.$ref.slice(prefix.length)]) {
      return null;
    }
    return deref(root, root.$defs[schema.$ref.slice(prefix.length)]);
  }
  return schema;
}

function typeOk(types, data) {
  return types.some((kind) => {
    if (kind === 'integer') return typeof data === 'number' && Number.isInteger(data);
    if (kind === 'number') return typeof data === 'number' && !Number.isNaN(data);
    if (kind === 'null') return data === null;
    if (kind === 'array') return Array.isArray(data);
    if (kind === 'object') {
      return data !== null && typeof data === 'object' && !Array.isArray(data);
    }
    if (kind === 'string') return typeof data === 'string';
    if (kind === 'boolean') return typeof data === 'boolean';
    return false;
  });
}

function validate(root, schema, data, at) {
  const resolved = deref(root, schema);
  if (!resolved) return [`${at} bad $ref`];
  schema = resolved;
  const errors = [];

  if (schema.const !== undefined && data !== schema.const) {
    return [`${at} const`];
  }
  if (schema.enum && !schema.enum.includes(data)) {
    return [`${at} enum`];
  }
  if (schema.type) {
    const types = Array.isArray(schema.type) ? schema.type : [schema.type];
    if (!typeOk(types, data)) return [`${at} type`];
  }
  if (typeof data === 'string') {
    if (schema.minLength !== undefined && data.length < schema.minLength) {
      errors.push(`${at} minLength`);
    }
    if (schema.pattern && !new RegExp(schema.pattern).test(data)) {
      errors.push(`${at} pattern`);
    }
  }
  if (typeof data === 'number') {
    if (schema.minimum !== undefined && data < schema.minimum) errors.push(`${at} minimum`);
    if (schema.maximum !== undefined && data > schema.maximum) errors.push(`${at} maximum`);
  }
  if (Array.isArray(data)) {
    if (schema.minItems !== undefined && data.length < schema.minItems) {
      errors.push(`${at} minItems`);
    }
    if (schema.maxItems !== undefined && data.length > schema.maxItems) {
      errors.push(`${at} maxItems`);
    }
    if (schema.items) {
      data.forEach((item, index) => {
        errors.push(...validate(root, schema.items, item, `${at}/${index}`));
      });
    }
  }
  if (data && typeof data === 'object' && !Array.isArray(data)) {
    const props = schema.properties;
    if (schema.required) {
      for (const key of schema.required) {
        if (!Object.prototype.hasOwnProperty.call(data, key)) errors.push(`${at} missing ${key}`);
      }
    }
    if (props && schema.additionalProperties === false) {
      for (const key of Object.keys(data)) {
        if (!Object.prototype.hasOwnProperty.call(props, key)) errors.push(`${at} unexpected ${key}`);
      }
    }
    if (props) {
      for (const [key, sub] of Object.entries(props)) {
        if (Object.prototype.hasOwnProperty.call(data, key)) {
          errors.push(...validate(root, sub, data[key], `${at}/${key}`));
        }
      }
    }
  }
  return errors;
}

function walk(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else out.push(full);
  }
  return out;
}

const SHARMA = `
50.0000 2.6772 -79.7751 50.0000 0.0000 -82.7485 2.0425
50.0000 3.1571 -77.2803 50.0000 0.0000 -82.7485 2.8615
50.0000 2.8361 -74.0200 50.0000 0.0000 -82.7485 3.4412
50.0000 -1.3802 -84.2814 50.0000 0.0000 -82.7485 1.0000
50.0000 -1.1848 -84.8006 50.0000 0.0000 -82.7485 1.0000
50.0000 -0.9009 -85.5211 50.0000 0.0000 -82.7485 1.0000
50.0000 0.0000 0.0000 50.0000 -1.0000 2.0000 2.3669
50.0000 -1.0000 2.0000 50.0000 0.0000 0.0000 2.3669
50.0000 2.4900 -0.0010 50.0000 -2.4900 0.0009 7.1792
50.0000 2.4900 -0.0010 50.0000 -2.4900 0.0010 7.1792
50.0000 2.4900 -0.0010 50.0000 -2.4900 0.0011 7.2195
50.0000 2.4900 -0.0010 50.0000 -2.4900 0.0012 7.2195
50.0000 -0.0010 2.4900 50.0000 0.0009 -2.4900 4.8045
50.0000 -0.0010 2.4900 50.0000 0.0010 -2.4900 4.8045
50.0000 -0.0010 2.4900 50.0000 0.0011 -2.4900 4.7461
50.0000 2.5000 0.0000 50.0000 0.0000 -2.5000 4.3065
50.0000 2.5000 0.0000 73.0000 25.0000 -18.0000 27.1492
50.0000 2.5000 0.0000 61.0000 -5.0000 29.0000 22.8977
50.0000 2.5000 0.0000 56.0000 -27.0000 -3.0000 31.9030
50.0000 2.5000 0.0000 58.0000 24.0000 15.0000 19.4535
50.0000 2.5000 0.0000 50.0000 3.1736 0.5854 1.0000
50.0000 2.5000 0.0000 50.0000 3.2972 0.0000 1.0000
50.0000 2.5000 0.0000 50.0000 1.8634 0.5757 1.0000
50.0000 2.5000 0.0000 50.0000 3.2592 0.3350 1.0000
60.2574 -34.0099 36.2677 60.4626 -34.1751 39.4387 1.2644
63.0109 -31.0961 -5.8663 62.8187 -29.7946 -4.0864 1.2630
61.2901 3.7196 -5.3901 61.4292 2.2480 -4.9620 1.8731
35.0831 -44.1164 3.7933 35.0232 -40.0716 1.5901 1.8645
22.7233 20.0904 -46.6940 23.0331 14.9730 -42.5619 2.0373
36.4612 47.8580 18.3852 36.2715 50.5065 21.2231 1.4146
90.8027 -2.0831 1.4410 91.1528 -1.6435 0.0447 1.4441
90.9257 -0.5406 -0.9208 88.6381 -0.8985 -0.7239 1.5381
6.7747 -0.2908 -2.4247 5.8714 -0.0985 -2.2286 0.6377
2.0776 0.0795 -1.1350 0.9033 -0.0636 -0.5514 0.9082
`.trim().split('\n').map((line) => line.trim().split(/\s+/).map(Number));

function hash64(seed) {
  return seed.repeat(32);
}

function sampleEntry(over = {}) {
  const hash = hash64('ab');
  return {
    asset_id: 'violet/chibi/neutral/v001',
    vi: 'violet',
    type: 'chibi',
    slot: 'neutral',
    version: 1,
    status: 'published',
    url: 'https://assets.vidoxlabs.dev/vi/violet/chibi/violet_chibi_neutral_v001.png',
    key: 'vi/violet/chibi/violet_chibi_neutral_v001.png',
    sha256: hash,
    bytes: 10,
    width: 926,
    height: 1596,
    mode: 'RGBA',
    canon_version: 'v1',
    palette_sha256: hash,
    alt: 'Violet, neutral',
    created_at: '2026-10-26',
    approved_at: null,
    supersedes: null,
    legacy_alias: null,
    ...over,
  };
}

function sampleSidecar(over = {}) {
  const hash = hash64('cd');
  return {
    file: 'violet_chibi_neutral_v001.png',
    vi: 'violet',
    type: 'chibi',
    slot: 'neutral',
    version: 1,
    canon_version: 'v1',
    palette_sha256: hash,
    sha256: hash,
    width: 926,
    height: 1596,
    mode: 'RGBA',
    matted: false,
    generator: {
      tool: 'fixture',
      model: 'fixture',
      seed: 1,
      prompt: 'fixture',
      negative_prompt: 'fixture',
      reference_images: [{ asset_id: 'violet/sheet/anchor/v001', role: 'anchor' }],
    },
    run_id: 'run',
    created_at: '2026-10-26',
    created_by: 'fixture',
    review: {
      status: 'approved',
      reviewer: null,
      reviewed_at: null,
      checklist_version: 'v1',
      failed_items: [],
      swatches: {},
      notes: '',
    },
    supersedes: null,
    ...over,
  };
}

function withOperatorEnv(value, fn, ci) {
  const previousHash = process.env[OPERATOR_ENV];
  const previousCi = process.env.CI;
  if (value === undefined) delete process.env[OPERATOR_ENV];
  else process.env[OPERATOR_ENV] = value;
  if (ci === undefined) delete process.env.CI;
  else process.env.CI = ci;
  try {
    return fn();
  } finally {
    if (previousHash === undefined) delete process.env[OPERATOR_ENV];
    else process.env[OPERATOR_ENV] = previousHash;
    if (previousCi === undefined) delete process.env.CI;
    else process.env.CI = previousCi;
  }
}

function scanTree(files) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'videsign-scan-'));
  try {
    for (const [rel, body] of Object.entries(files)) {
      const full = path.join(dir, rel);
      fs.mkdirSync(path.dirname(full), { recursive: true });
      fs.writeFileSync(full, `${body}\n`);
    }
    const targets = [...new Set(Object.keys(files).map((rel) => rel.split('/')[0]))];
    return scanPaths(targets, dir);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

function scanNamedBrand(dirName, body) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'videsign-brand-case-'));
  try {
    const full = path.join(dir, dirName, 'note.txt');
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, `${body}\n`);
    return scanPaths(['brand'], dir);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

function scanBrandLayout(files) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'videsign-brand-layout-'));
  try {
    for (const [rel, body] of Object.entries(files)) {
      const full = path.join(dir, rel);
      fs.mkdirSync(path.dirname(full), { recursive: true });
      fs.writeFileSync(full, `${body}\n`);
    }
    return scanPaths(['brand'], dir);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

function scanTopLevelName(name, { symlink = false } = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'videsign-top-'));
  const extra = [];
  try {
    if (symlink) {
      const target = fs.mkdtempSync(path.join(os.tmpdir(), 'videsign-top-target-'));
      extra.push(target);
      fs.writeFileSync(path.join(target, 'n.txt'), 'palette note\n');
      fs.symlinkSync(target, path.join(root, name));
    } else {
      const full = path.join(root, name, 'n.txt');
      fs.mkdirSync(path.dirname(full), { recursive: true });
      fs.writeFileSync(full, 'palette note\n');
    }
    return scanPaths(['brand'], root);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
    for (const dir of extra) fs.rmSync(dir, { recursive: true, force: true });
  }
}

function expectNonAscii(name) {
  const result = scanTopLevelName(name);
  assert.equal(result.ok, false);
  assert.ok(result.hits.some((hit) => hit.includes('non-ascii-name')));
}

function driveToken() {
  const alphabet = 'Aa0Bb1Cc2Dd3' + 'Ee4Ff5Gg6Hh7Ii8' + 'Jj9Kk';
  let driveId = '';
  for (let i = 0; i < 33; i += 1) driveId += alphabet[i % alphabet.length];
  return driveId;
}

function runSafety(args, { hash, ci } = {}) {
  const env = { ...process.env };
  if (hash === undefined) delete env[OPERATOR_ENV];
  else env[OPERATOR_ENV] = hash;
  if (ci === undefined) delete env.CI;
  else env.CI = ci;
  return spawnSync(process.execPath, ['scripts/check-public-safety.js', ...args], {
    cwd: ROOT,
    env,
    encoding: 'utf8',
  });
}

test('CIEDE2000 matches the Sharma 34-pair table and is symmetric', () => {
  assert.equal(SHARMA.length, 34);
  SHARMA.forEach((row, index) => {
    const lab1 = [row[0], row[1], row[2]];
    const lab2 = [row[3], row[4], row[5]];
    const expected = row[6];
    const forward = deltaE00(lab1, lab2);
    const reverse = deltaE00(lab2, lab1);
    const pair = index + 1;
    assert.ok(Math.abs(forward - expected) <= 1e-4, `pair ${pair} ${forward}`);
    assert.ok(Math.abs(reverse - expected) <= 1e-4, `pair ${pair} reverse`);
  });
  // Pair 14 is the hue-difference boundary (expected 4.8045).
  assert.equal(SHARMA[13][6], 4.8045);
});

test('CIEDE2000 matches the Sharma pair 2.0425', () => {
  const got = deltaE00([50, 2.6772, -79.7751], [50, 0, -82.7485]);
  assert.equal(got.toFixed(4), '2.0425');
});

test('palette validates against the schema palette subset and has five VIs', () => {
  const schema = readJson('asset-manifest.schema.json');
  const palette = readJson('palette.json');
  const errors = validate(schema, schema.$defs.palette, palette, 'palette');
  assert.deepEqual(errors, []);
  assert.deepEqual(Object.keys(palette.vi), Object.keys(SIGNATURES));
  assert.equal(palette.canon_version, 'v1');
  assert.equal(palette.schema, 'vidoxlabs.vi-palette/1');
  assert.equal(palette.status, 'canon-v1, Proposed (pending owner confirmation)');
  assert.equal(palette.date, '2026-10-26');
  assert.equal(palette.family_rules.group_reference, 'group/sheet/lineup/v001');
  assert.deepEqual(palette.review_threshold.applies_to, ['signature', 'hair', 'eyes']);

  for (const name of ['manifestEntry', 'sidecar', 'request']) {
    assert.ok(schema.$defs[name], name);
  }
  for (const field of [
    'asset_id', 'vi', 'type', 'slot', 'version', 'status', 'url', 'key',
    'sha256', 'bytes', 'width', 'height', 'mode', 'canon_version',
    'palette_sha256', 'alt', 'created_at', 'approved_at', 'supersedes',
    'legacy_alias',
  ]) {
    assert.ok(schema.$defs.manifestEntry.properties[field], field);
  }
  assert.equal(schema.$defs.request.required.includes('asset_id'), false);
  assert.ok(schema.$defs.request.properties.asset_id);
  assert.ok(schema.$defs.sidecar.properties.generator);

  const broken = structuredClone(palette);
  delete broken.vi.xylia.inner_ear;
  assert.ok(validate(schema, schema.$defs.palette, broken, 'palette').length > 0);

  const dirty = structuredClone(palette);
  dirty.vi.violet.anchor.extra = 'no';
  assert.ok(validate(schema, schema.$defs.palette, dirty, 'palette').length > 0);
});

test('every VI has the eight channel hexes and the canon signature', () => {
  const palette = readJson('palette.json');
  for (const [name, entry] of Object.entries(palette.vi)) {
    assert.equal(entry.signature, SIGNATURES[name]);
    assert.equal(entry.anchor.asset_id, ANCHORS[name]);
    assert.equal(Object.keys(entry.anchor).join(','), 'asset_id');
    for (const channel of CHANNELS) {
      assert.match(entry[channel], /^#[0-9A-F]{6}$/, `${name}.${channel}`);
    }
  }
});

test('stored signature matrix matches CIEDE2000 within 0.05', () => {
  const palette = readJson('palette.json');
  const floor = palette.review_threshold.min_pairwise;
  const names = Object.keys(palette.vi);
  const matrix = palette.delta_e_matrix_signature;
  const seen = new Set();
  for (let i = 0; i < names.length; i += 1) {
    for (let j = i + 1; j < names.length; j += 1) {
      const key = `${names[i]}-${names[j]}`;
      seen.add(key);
      const delta = deltaE00Hex(
        palette.vi[names[i]].signature,
        palette.vi[names[j]].signature,
      );
      assert.ok(delta >= floor, `${key} ${delta} floor ${floor}`);
      assert.ok(
        Math.abs(matrix[key] - delta) <= 0.05,
        `${key} stored ${matrix[key]} computed ${delta}`,
      );
    }
  }
  assert.deepEqual(Object.keys(matrix).sort(), [...seen].sort());
});

test('vocabulary slugs are kebab-case and unique', () => {
  const vocab = readJson('vocabulary.json');
  assert.deepEqual(vocab.vi, Object.keys(SIGNATURES));
  assert.deepEqual(vocab.type, ['full', 'chibi', 'bg', 'sheet']);
  assert.equal(vocab.expression.length, 22);
  assert.equal(vocab.pose.length, 8);
  assert.deepEqual(vocab.viseme, ['a', 'e', 'i', 'o', 'u']);
  assert.equal(vocab.pose_applies_to, 'full');
  assert.ok(vocab.state.length >= 7);

  const slugs = [
    ...vocab.vi,
    ...vocab.type,
    ...vocab.expression,
    ...vocab.pose,
    ...vocab.viseme,
    ...vocab.state,
  ];
  for (const [name, list] of Object.entries(vocab.bg)) {
    assert.ok(vocab.vi.includes(name), name);
    assert.ok(list.length >= 1);
    slugs.push(...list);
  }
  for (const slug of slugs) assert.match(slug, KEBAB, slug);
  assert.equal(new Set(slugs).size, slugs.length);

  const grouped = Object.values(vocab.expression_groups).flat();
  assert.deepEqual([...grouped].sort(), [...vocab.expression].sort());

  for (const [name, notes] of Object.entries(vocab.expression_notes)) {
    assert.ok(vocab.vi.includes(name));
    for (const key of Object.keys(notes)) {
      if (key === '*') continue;
      assert.ok(vocab.expression.includes(key), `${name}.${key}`);
    }
  }
  assert.match(vocab.expression_notes.xylia.angry, /cold disapproval, not villain-coded/i);
});

test('canon files pass the public-safety scan', () => {
  const files = walk(CANON).map((file) => path.relative(CANON, file)).sort();
  assert.deepEqual(files, [
    path.join('vwxyz', 'README.md'),
    path.join('vwxyz', 'asset-manifest.schema.json'),
    path.join('vwxyz', 'palette.json'),
    path.join('vwxyz', 'reviewer-checklist.md'),
    path.join('vwxyz', 'vocabulary.json'),
  ]);

  const result = withOperatorEnv(undefined, () => scanPaths(['canon'], ROOT));
  assert.equal(result.operatorCheck, 'skipped');
  assert.deepEqual(result.hits, []);
});

test('public-safety self-checks hosts, long ids and sha256 values', () => {
  withOperatorEnv(undefined, () => {
  const field = 'sha' + '256';
  const pair = (key, value) => `"${key}":"${value}"`;
  const hash = hash64('ab');
  const clean = withOperatorEnv(undefined, () => scanText(
    `{${pair(field, hash)},${pair('palette_' + field, hash)}}`,
  ));
  assert.equal(clean.operatorCheck, 'skipped');
  assert.deepEqual(clean.hits, []);

  const longId = `A1${'b'.repeat(31)}`;
  assert.ok(scanText(`{${pair('note', longId)}}`).hits.includes('long-id'));
  assert.ok(scanText(`{${pair('ref_' + field, longId)}}`).hits.includes('sha256-value'));
  assert.ok(scanText(`{${pair(field, 'zz' + 'zz')}}`).hits.includes('sha256-value'));
  assert.ok(scanText(`{${pair(field, 'ab'.repeat(16))}}`).hits.includes('sha256-value'));
  assert.ok(scanText(`{${pair(field + '_note', longId)}}`).hits.includes('long-id'));

  const digitHash = crypto.createHash('sha256').update('palette-fixture').digest('hex');
  assert.match(digitHash, /[0-9]/);
  assert.deepEqual(scanText(`{${pair(field, digitHash)}}`).hits, []);

  const host = (parts, suffix) => ['https://', parts.join('.'), suffix].join('');
  const bare = (parts) => parts.join('.');
  assert.ok(scanText(host(['drive', 'google', 'com'], '/x')).hits.includes('google-host'));
  assert.ok(scanText(host(['docs', 'google', 'com'], '/x')).hits.includes('google-host'));
  assert.ok(scanText(bare(['drive', 'google', 'com'])).hits.includes('google-host'));
  assert.ok(scanText(bare(['docs', 'google', 'com'])).hits.includes('google-host'));
  assert.ok(scanText(host(['sheets', 'google', 'com'], '/x')).hits.includes('google-host'));
  assert.ok(scanText(host(['lh3', 'googleusercontent', 'com'], '/x')).hits.includes('google-host'));
  assert.ok(scanText(host(['drive', 'usercontent', 'google', 'com'], '/x')).hits.includes('google-host'));
  assert.ok(scanText(host(['goo', 'gl'], '/x')).hits.includes('google-host'));
  assert.deepEqual(scanText(bare(['assets', 'vidoxlabs', 'dev'])).hits, []);
  assert.ok(scanText(`https://assets.example/?id=${'a'.repeat(10)}`).hits.includes('query-id'));
  assert.ok(scanText(`/${'Users'}/x`).hits.includes('home-path'));
  assert.ok(scanText(`/${'home'}/x`).hits.includes('home-path'));
  assert.ok(scanText(`${'C'}:\\${'Users'}\\x`).hits.includes('home-path'));
  assert.ok(scanText(`${'d'}:/${'users'}/x`).hits.includes('home-path'));
  assert.ok(scanText(`${'~'}/x`).hits.includes('home-path'));
  assert.deepEqual(scanText('Users').hits, []);
  assert.deepEqual(scanText(`${'~'}name`).hits, []);
  assert.ok(scanText(['10', '0', '0', '1'].join('.')).hits.includes('ipv4'));
  assert.deepEqual(scanText('surface-background-primary-base').hits, []);
  }, false);
});

test('long ids cover case and separator shapes and spare token names', () => {
  withOperatorEnv(undefined, () => {
  const lower = `a1${'b'.repeat(23)}`;
  const upper = `A1${'B'.repeat(23)}`;
  const hyphen = `a1b2c3d4e5f-${'g6h7i8j9k0abc'}`;
  const under = `a1b2c3d4e5f_${'g6h7i8j9k0abc'}`;
  const short = `a1${'b'.repeat(22)}`;
  assert.equal(lower.length, 25);
  assert.equal(upper.length, 25);
  assert.ok(hyphen.length >= 25);
  assert.ok(under.length >= 25);
  assert.equal(short.length, 24);
  assert.ok(scanText(lower).hits.includes('long-id'));
  assert.ok(scanText(upper).hits.includes('long-id'));
  assert.ok(scanText(hyphen).hits.includes('long-id'));
  assert.ok(scanText(under).hits.includes('long-id'));
  assert.deepEqual(scanText(short).hits, []);
  assert.deepEqual(scanText('a'.repeat(40)).hits, []);
  assert.deepEqual(scanText('A'.repeat(40)).hits, []);
  assert.deepEqual(scanText('surface-background-primary-base').hits, []);
  assert.deepEqual(scanText('text-typography-size-3xl-base').hits, []);
  assert.deepEqual(scanText('violet_chibi_neutral_v001').hits, []);
  }, false);
});

test('brand filenames are allowlisted and near-misses stay flagged', () => {
  withOperatorEnv(undefined, () => {
    const mark = ['brand_mark_full-', 'color_v008'].join('') + '.svg';
    const lockup = ['brand_lockup_horizontal-', 'dark_v004'].join('');
    const stripe = ['brand_stripe_full-', 'color_v001'].join('');

    const inside = scanTree({
      'brand/mark.svg': mark,
      'brand/lockup.txt': lockup,
      'brand/stripe.svg': stripe,
    });
    assert.equal(inside.ok, true, inside.hits.join('\n'));
    assert.deepEqual(inside.hits, []);

    assert.ok(scanText(mark).hits.includes('long-id'));
    assert.ok(scanText(lockup).hits.includes('long-id'));
    assert.ok(scanText(stripe).hits.includes('long-id'));
    const outside = scanTree({ 'preview/note.txt': `${mark}\n${lockup}\n${stripe}` });
    assert.equal(outside.ok, false);
    assert.ok(outside.hits.some((hit) => hit.includes('long-id')));

    const alphabet = 'Aa0Bb1Cc2Dd3' + 'Ee4Ff5Gg6Hh7Ii8' + 'Jj9Kk';
    let driveId = '';
    for (let i = 0; i < 33; i += 1) driveId += alphabet[i % alphabet.length];
    assert.equal(driveId.length, 33);
    assert.match(driveId, /[A-Z]/);
    assert.match(driveId, /[a-z]/);
    assert.match(driveId, /[0-9]/);
    assert.ok(scanText(driveId).hits.includes('long-id'));

    const abused = `brand_mark_${'a'.repeat(28)}_v001`;
    assert.ok(abused.includes('a'.repeat(28)));
    assert.ok(scanText(abused).hits.includes('long-id'));
    const abusedInside = scanTree({ 'brand/abused.svg': abused });
    assert.ok(abusedInside.hits.some((hit) => hit.includes('long-id')));

    const left = `a1${'b'.repeat(18)}`;
    const right = `c2${'d'.repeat(17)}`;
    assert.equal(left.length, 20);
    assert.equal(right.length, 19);
    const split = `brand_${left}_${right}_v001`;
    assert.ok(scanText(split).hits.includes('long-id'));
    const splitInside = scanTree({ 'brand/split.svg': split });
    assert.ok(splitInside.hits.some((hit) => hit.includes('long-id')));

    const slug = `violet_full_${'a'.repeat(44)}_v001`;
    assert.equal('a'.repeat(44).length, 44);
    assert.ok(scanText(slug).hits.includes('long-id'));
    const slugInside = scanTree({ 'brand/slug.txt': slug });
    assert.ok(slugInside.hits.some((hit) => hit.includes('long-id')));
  }, false);
});

test('a missing brand directory is skipped', () => {
  assert.ok(DEFAULT_TARGETS.includes('brand'));
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'videsign-brand-'));
  try {
    const result = withOperatorEnv(undefined, () => scanPaths(['brand'], dir));
    assert.equal(result.ok, true);
    assert.deepEqual(result.hits, []);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('missing, empty and invalid paths fail closed', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'videsign-safety-'));
  const missing = path.join(dir, 'absent.json');
  const empty = path.join(dir, 'empty.json');
  const broken = path.join(dir, 'broken.json');
  fs.writeFileSync(empty, '');
  fs.writeFileSync(broken, '{');
  try {
    assert.equal(scanPaths([missing]).ok, false);
    assert.equal(scanPaths([empty]).ok, false);
    assert.equal(scanPaths([broken]).ok, false);
    assert.ok(scanPaths([missing]).hits.some((hit) => hit.startsWith('missing ')));
    assert.ok(scanPaths([empty]).hits.some((hit) => hit.startsWith('empty ')));
    assert.ok(scanPaths([broken]).hits.some((hit) => hit.startsWith('invalid-json ')));
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('operator-handle hashes fail closed in CI and skip outside it', () => {
  const token = ['fixture', 'handle'].join('-');
  const digest = crypto.createHash('sha256').update(token.toLowerCase()).digest('hex');
  const text = `hello ${token}`;
  const badEntry = ['not', 'a', 'hash', 'entry'].join('-');

  const skipped = withOperatorEnv(undefined, () => scanText(text));
  assert.equal(skipped.operatorCheck, 'skipped');
  assert.equal(skipped.hits.includes('operator-handle'), false);

  const missing = withOperatorEnv(undefined, () => scanText('hello'), 'true');
  assert.equal(missing.ok, false);
  assert.ok(missing.hits.some((hit) => hit.includes(OPERATOR_ENV) && hit.includes('unset or empty')));
  assert.equal(missing.hits.join(' ').includes(badEntry), false);

  const blank = withOperatorEnv('   ', () => scanText('hello'), 'true');
  assert.equal(blank.ok, false);
  assert.ok(blank.hits.some((hit) => hit.includes('unset or empty')));

  const invalid = withOperatorEnv(badEntry, () => scanText('hello'), 'true');
  assert.equal(invalid.ok, false);
  assert.ok(invalid.hits.some((hit) => hit.includes(OPERATOR_ENV) && hit.includes('malformed')));
  assert.equal(invalid.hits.join(' ').includes(badEntry), false);

  const hit = withOperatorEnv(digest, () => scanText(text), 'true');
  assert.equal(hit.operatorCheck, 'checked');
  assert.ok(hit.hits.includes('operator-handle'));
  assert.equal(JSON.stringify(hit).includes(token), false);

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'videsign-safety-'));
  const clean = path.join(dir, 'clean.txt');
  const dirty = path.join(dir, 'dirty.txt');
  fs.writeFileSync(clean, 'hello canon\n');
  fs.writeFileSync(dirty, `${text}\n`);
  try {
    const unsetCi = runSafety([clean], { ci: 'true' });
    assert.equal(unsetCi.status, 1);
    assert.match(unsetCi.stderr, new RegExp(OPERATOR_ENV));
    assert.match(unsetCi.stderr, /unset or empty/);
    assert.equal(unsetCi.stderr.includes(badEntry), false);

    const emptyCi = runSafety([clean], { hash: '', ci: 'true' });
    assert.equal(emptyCi.status, 1);
    assert.match(emptyCi.stderr, /unset or empty/);

    const malformed = runSafety([clean], { hash: badEntry, ci: 'true' });
    assert.equal(malformed.status, 1);
    assert.match(malformed.stderr, /malformed/);
    assert.equal(malformed.stderr.includes(badEntry), false);

    const cleanCi = runSafety([clean], { hash: digest, ci: 'true' });
    assert.equal(cleanCi.status, 0, cleanCi.stderr);

    const dirtyCi = runSafety([dirty], { hash: digest, ci: 'true' });
    assert.equal(dirtyCi.status, 1);
    assert.match(dirtyCi.stderr, /operator-handle/);
    assert.equal(dirtyCi.stderr.includes(token), false);

    const outside = runSafety([clean], {});
    assert.equal(outside.status, 0, outside.stderr);
    assert.match(outside.stderr, /operator-handle check skipped/);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('manifest url and key reject external hosts and the sidecar has no drive fields', () => {
  const schema = readJson('asset-manifest.schema.json');
  const entry = sampleEntry();
  assert.deepEqual(validate(schema, schema.$defs.manifestEntry, entry, 'entry'), []);

  const driveUrl = ['https://', ['drive', 'google', 'com'].join('.'), '/file/d/x/view'].join('');
  const rejectedUrl = sampleEntry({ url: driveUrl });
  assert.ok(validate(schema, schema.$defs.manifestEntry, rejectedUrl, 'entry').length > 0);

  const rejectedKey = sampleEntry({ key: 'vi/violet/chibi/not-a-file.png' });
  assert.ok(validate(schema, schema.$defs.manifestEntry, rejectedKey, 'entry').length > 0);

  const sidecar = sampleSidecar();
  assert.deepEqual(validate(schema, schema.$defs.sidecar, sidecar, 'sidecar'), []);
  assert.equal(Object.hasOwn(schema.$defs.sidecar.properties, 'drive_file_id'), false);
  assert.equal(Object.hasOwn(schema.$defs.refImage.properties, 'drive_id'), false);

  const withDrive = sampleSidecar({ drive_file_id: null });
  assert.ok(validate(schema, schema.$defs.sidecar, withDrive, 'sidecar').length > 0);
  const withRef = sampleSidecar();
  withRef.generator.reference_images[0].drive_id = null;
  assert.ok(validate(schema, schema.$defs.sidecar, withRef, 'sidecar').length > 0);
});

test('reviewer checklist covers C1 through C13', () => {
  const text = fs.readFileSync(path.join(VWXYZ, 'reviewer-checklist.md'), 'utf8');
  for (let n = 1; n <= 13; n += 1) {
    assert.match(text, new RegExp(`^### C${n}\\. `, 'm'));
  }
  assert.match(text, /ΔE00 ≤ 10/);
  assert.match(text, /Identity-confusion/);
  assert.match(text, /watermark/i);
  assert.match(text, /Family constants/);
  assert.match(text, /villain-coded/);
  assert.match(text, /that VI's reference anchor/);
  assert.match(text, /similarity to the reference anchor/);
});

test('a background plate is not gated on character anatomy', () => {
  const text = fs.readFileSync(path.join(VWXYZ, 'reviewer-checklist.md'), 'utf8');
  const section = (start, end) => text.slice(text.indexOf(start), text.indexOf(end));
  const c4 = section('### C4.', '### C5.');
  const c5 = section('### C5.', '### C6.');
  const c6 = section('### C6.', '### C7.');
  const c7a = section('#### C7a.', '#### C7b.');
  const c7b = section('#### C7b.', '### C8.');
  assert.match(c4, /Applies to `full` and `chibi` only/);
  assert.match(c4, /does not apply to `sheet` or `bg`/);
  assert.match(c5, /Applies to `full` and `chibi` only/);
  assert.match(c5, /does not apply to `sheet` or `bg`/);
  assert.match(c6, /`full`, `chibi` and `sheet`/);
  assert.match(c6, /does not apply to `bg`/);
  assert.match(c7a, /`full`, `chibi` and `sheet`/);
  assert.match(c7a, /does not apply to `bg`/);
  assert.match(c7a, /blazer/i);
  assert.match(c7b, /`full`, `chibi`, `sheet` and `bg`/);
  assert.match(c7b, /Flat cel shading/);
  assert.match(c7b, /#1A1A1F/);
  assert.match(c7b, /photoreal/);
  assert.match(c7b, /3D gradient/);
  assert.match(c7b, /slightly lighter/);
  assert.match(c7b, /no cast shadows on the wall/);
  const verdict = text.slice(text.indexOf('## Verdict'));
  assert.match(verdict, /`full` and `chibi`: C1–C11 pass/);
  assert.match(verdict, /`sheet`: C1–C3 and C6–C11 pass/);
  assert.match(verdict, /C4 and C5 do not apply to `sheet`/);
  assert.match(verdict, /C7 inside C1–C11 means C7a plus C7b/);
  assert.match(verdict, /`bg`: C1–C3, C7b, C8–C11 and C13 pass/);
  assert.match(verdict, /C4, C5, C6 and C7a do not apply to `bg`/);
  const c13 = section('### C13.', '## Per-VI');
  assert.match(c13, /No people/);
});

test('a case-variant brand directory is still scanned', () => {
  withOperatorEnv(undefined, () => {
    const alphabet = 'Aa0Bb1Cc2Dd3' + 'Ee4Ff5Gg6Hh7Ii8' + 'Jj9Kk';
    let driveId = '';
    for (let i = 0; i < 33; i += 1) driveId += alphabet[i % alphabet.length];
    assert.equal(driveId.length, 33);
    const flagged = scanNamedBrand('Brand', driveId);
    assert.ok(flagged.hits.some((hit) => hit.includes('long-id')));

    const legit = ['brand_mark_full-', 'color_v008'].join('');
    const host = ['https://', ['drive', 'google', 'com'].join('.'), '/x'].join('');
    const allowed = scanNamedBrand('BRAND', `${legit}\n${host}`);
    assert.ok(allowed.hits.some((hit) => hit.includes('google-host')));
    assert.equal(allowed.hits.some((hit) => hit.includes('long-id')), false);
  }, false);
});

test('duplicate and look-alike brand folders fail closed', () => {
  withOperatorEnv(undefined, () => {
    const driveId = driveToken();
    assert.equal(driveId.length, 33);
    const both = scanBrandLayout({
      'brand/a.txt': 'palette note',
      'Brand/n.txt': driveId,
    });
    assert.equal(both.ok, false);
    assert.ok(both.hits.some((hit) => hit.includes('long-id')));
    assert.ok(both.hits.some((hit) => hit.includes('duplicate-brand')));

    const fullWidth = 'brand'.replace(/[a-z]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) + 0xFEE0));
    const wide = scanBrandLayout({ [`${fullWidth}/n.txt`]: driveId });
    assert.equal(wide.ok, false);
    assert.ok(wide.hits.some((hit) => hit.includes('look-alike-brand')));

    const cyrillic = scanBrandLayout({ [`br${'\u0430'}nd/n.txt`]: driveId });
    assert.equal(cyrillic.ok, false);
    assert.ok(cyrillic.hits.some((hit) => hit.includes('look-alike-brand')));

    const dotted = scanBrandLayout({ 'brand./n.txt': driveId });
    assert.equal(dotted.ok, false);
    assert.ok(dotted.hits.some((hit) => hit.includes('look-alike-brand')));

    const unrelated = scanBrandLayout({ 'branding/n.txt': driveId });
    assert.equal(unrelated.hits.some((hit) => hit.includes('look-alike-brand')), false);
    assert.equal(unrelated.hits.some((hit) => hit.includes('long-id')), false);
  }, false);
});

test('a non-directory brand entry fails closed', () => {
  withOperatorEnv(undefined, () => {
    const expectNonDirectory = (setup) => {
      const root = fs.mkdtempSync(path.join(os.tmpdir(), 'videsign-brand-entry-'));
      const extra = [];
      try {
        setup(root, extra);
        const result = scanPaths(['brand'], root);
        assert.equal(result.ok, false);
        assert.ok(result.hits.some((hit) => hit.includes('non-directory-brand')));
      } finally {
        fs.rmSync(root, { recursive: true, force: true });
        for (const dir of extra) fs.rmSync(dir, { recursive: true, force: true });
      }
    };

    expectNonDirectory((root) => {
      fs.writeFileSync(path.join(root, 'brand'), 'palette note\n');
    });
    expectNonDirectory((root) => {
      fs.writeFileSync(path.join(root, 'Brand'), 'palette note\n');
    });
    expectNonDirectory((root) => {
      fs.writeFileSync(path.join(root, 'brand.'), 'palette note\n');
    });
    expectNonDirectory((root, extra) => {
      const target = fs.mkdtempSync(path.join(os.tmpdir(), 'videsign-brand-link-'));
      extra.push(target);
      fs.writeFileSync(path.join(target, 'n.txt'), `${driveToken()}\n`);
      fs.symlinkSync(target, path.join(root, 'brand'));
    });
    expectNonDirectory((root) => {
      fs.symlinkSync('missing-brand-target', path.join(root, 'brand'));
    });
    expectNonDirectory((root) => {
      const made = spawnSync('mkfifo', [path.join(root, 'brand')]);
      assert.equal(made.status, 0);
    });
  }, false);
});

test('accent, format, and extra confusable brand names fail closed', () => {
  withOperatorEnv(undefined, () => {
    const expectLookalike = (name) => {
      const result = scanBrandLayout({ [`${name}/n.txt`]: 'palette note' });
      assert.equal(result.ok, false);
      assert.ok(
        result.hits.some((hit) => hit.includes('look-alike-brand')),
        `expected look-alike-brand for ${JSON.stringify(name)}`,
      );
    };
    expectLookalike(`br${String.fromCharCode(0x00E1)}nd`);
    expectLookalike(`bra${String.fromCharCode(0x0301)}nd`);
    expectLookalike(`${String.fromCharCode(0x1E03)}rand`);
    for (const mark of [0x200B, 0x200C, 0x200D, 0x2060, 0xFEFF, 0x00AD]) {
      expectLookalike(`br${String.fromCharCode(mark)}and`);
    }
    expectLookalike(`bra${String.fromCharCode(0x0578)}d`);
    expectLookalike(`${String.fromCharCode(0x0185)}rand`);

    const beside = scanBrandLayout({
      'brand/a.txt': 'palette note',
      [`br${String.fromCharCode(0x200B)}and/n.txt`]: 'palette note',
    });
    assert.equal(beside.ok, false);
    const besideFail = beside.hits.some((hit) => hit.includes('look-alike-brand') || hit.includes('duplicate-brand'));
    assert.equal(besideFail, true);
  }, false);
});

test('a ZWSP inside a top-level brand name fails closed', () => {
  withOperatorEnv(undefined, () => {
    expectNonAscii(`br${String.fromCharCode(0x200B)}and`);
  }, false);
});

test('a ZWJ inside a top-level brand name fails closed', () => {
  withOperatorEnv(undefined, () => {
    expectNonAscii(`bra${String.fromCharCode(0x200D)}nd`);
  }, false);
});

test('a ZWNJ inside a top-level brand name fails closed', () => {
  withOperatorEnv(undefined, () => {
    expectNonAscii(`br${String.fromCharCode(0x200C)}and`);
  }, false);
});

test('a soft hyphen inside a top-level brand name fails closed', () => {
  withOperatorEnv(undefined, () => {
    expectNonAscii(`br${String.fromCharCode(0x00AD)}and`);
  }, false);
});

test('a word joiner inside a top-level brand name fails closed', () => {
  withOperatorEnv(undefined, () => {
    expectNonAscii(`br${String.fromCharCode(0x2060)}and`);
  }, false);
});

test('a Greek capital brand look-alike fails closed', () => {
  withOperatorEnv(undefined, () => {
    const beta = String.fromCharCode(0x0392);
    const alpha = String.fromCharCode(0x0391);
    const nu = String.fromCharCode(0x039D);
    expectNonAscii(`${beta}R${alpha}${nu}D`);
  }, false);
});

test('a Cherokee brand look-alike fails closed', () => {
  withOperatorEnv(undefined, () => {
    expectNonAscii(`${String.fromCharCode(0x13F4)}${String.fromCharCode(0x13A1)}and`);
  }, false);
});

test('a Lisu brand look-alike fails closed', () => {
  withOperatorEnv(undefined, () => {
    expectNonAscii(`${String.fromCharCode(0xA4D0)}ran${String.fromCharCode(0xA4D3)}`);
  }, false);
});

test('an Armenian brand look-alike fails closed', () => {
  withOperatorEnv(undefined, () => {
    expectNonAscii(`bra${String.fromCharCode(0x0578)}d`);
  }, false);
});

test('a brand-like symlink to a folder fails closed', () => {
  withOperatorEnv(undefined, () => {
    const result = scanTopLevelName('Brand', { symlink: true });
    assert.equal(result.ok, false);
    assert.ok(result.hits.some((hit) => hit.includes('non-directory-brand')));
  }, false);
});

test('a plain brand directory and the repo top level stay ASCII-clean', () => {
  withOperatorEnv(undefined, () => {
    const plain = /^[A-Za-z0-9._-]+$/;
    for (const name of fs.readdirSync(ROOT)) assert.match(name, plain, name);
    const clean = scanBrandLayout({ 'brand/a.txt': 'palette note' });
    assert.equal(clean.ok, true);
    assert.equal(clean.hits.some((hit) => hit.includes('non-ascii-name')), false);
    const repo = scanPaths(['brand'], ROOT);
    assert.equal(repo.hits.some((hit) => hit.includes('non-ascii-name')), false);
  }, false);
});

test('DESIGN.md front matter accents stay put and ADR-010 is recorded', () => {
  const design = fs.readFileSync(path.join(ROOT, 'DESIGN.md'), 'utf8');
  const end = design.indexOf('\n---\n', 4);
  const front = design.slice(0, end);
  assert.match(front, /persona-accent-violet-base: "#8B5CF6"/);
  assert.match(front, new RegExp(`${'persona-accent-' + 'wisteria-base'}: "#A78BFA"`));
  assert.match(front, /persona-accent-xylia-base: "#2DD4BF"/);
  assert.match(front, /persona-accent-yarrow-base: "#F59E0B"/);
  assert.match(front, /persona-accent-zinnia-base: "#F43F5E"/);
  assert.match(design.slice(end), /### Persona character assets/);

  const skill = fs.readFileSync(path.join(ROOT, 'SKILL.md'), 'utf8');
  assert.match(skill, /## ADR-010: VWXYZ Character Canon and Persona Assets/);
  assert.match(skill, /Proposed \(pending owner confirmation\)/);
  assert.match(skill, /Only assets that pass ViCanon review and Gavin's approval are published/);
  assert.match(skill, /will be served from the asset service/);

  const canonReadme = fs.readFileSync(path.join(VWXYZ, 'README.md'), 'utf8');
  assert.match(canonReadme, /Proposed \(pending owner confirmation\)/);
  assert.match(canonReadme, /planned, ADR-010/);
  for (const file of ['README.md', 'DESIGN.md', 'AGENTS.md']) {
    const text = fs.readFileSync(path.join(ROOT, file), 'utf8');
    assert.match(text, /planned, ADR-010/);
  }
});

test('the public-safety CLI scans the default targets', () => {
  assert.ok(DEFAULT_TARGETS.includes('canon'));
  assert.ok(DEFAULT_TARGETS.includes('preview'));
  assert.ok(DEFAULT_TARGETS.includes('.github'));
  assert.ok(DEFAULT_TARGETS.includes('brand'));
  assert.ok(DEFAULT_TARGETS.includes('scripts'));
  assert.ok(DEFAULT_TARGETS.includes('test'));
  const result = runSafety([], {});
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stderr, /operator-handle check skipped/);
});
