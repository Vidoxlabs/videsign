/**
 * VWXYZ character canon v1: palette shape, signature separation,
 * vocabulary slugs and a public-safety scan of canon/.
 */

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { deltaE00, deltaE00Hex } = require('../scripts/lib/ciede2000');

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

function unsafePattern() {
  const parts = [
    ['drive', 'google', 'com'].join('\\.'),
    ['docs', 'google', 'com'].join('\\.'),
    `/${'Users'}/`,
    `/${'home'}/`,
    '\\b\\d{1,3}(\\.\\d{1,3}){3}\\b',
    '[A-Za-z0-9_-]{28,}',
  ];
  return new RegExp(parts.join('|'), 'g');
}

function redactSha256(text) {
  return text.replace(/"([^"]*sha256)"\s*:\s*"[^"]*"/gi, '"$1":""');
}

function scanText(text) {
  const hits = [];
  const pattern = unsafePattern();
  let match = pattern.exec(redactSha256(text));
  while (match) {
    hits.push(match[0]);
    match = pattern.exec(redactSha256(text));
  }
  return hits;
}

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
  assert.equal(palette.status, 'canon-v1, approved anchor Set B');
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

test('pairwise CIEDE2000 of signatures is at least 20', () => {
  const names = Object.keys(SIGNATURES);
  for (let i = 0; i < names.length; i += 1) {
    for (let j = i + 1; j < names.length; j += 1) {
      const delta = deltaE00Hex(SIGNATURES[names[i]], SIGNATURES[names[j]]);
      assert.ok(
        delta >= 20,
        `${names[i]}-${names[j]} ΔE00 ${delta.toFixed(2)}`,
      );
    }
  }
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

  const hits = [];
  for (const file of files) {
    const text = fs.readFileSync(path.join(CANON, file), 'utf8');
    for (const hit of scanText(text)) hits.push(`${file}: ${hit}`);
  }
  assert.deepEqual(hits, []);
});

test('sha256 fields are allowlisted and other long ids are not', () => {
  const hash = 'ab'.repeat(32);
  const safe = `{"sha256":"${hash}","palette_sha256":"${hash}"}`;
  assert.deepEqual(scanText(safe), []);

  const longId = 'A'.repeat(33);
  assert.ok(scanText(`{"note":"${longId}"}`).length >= 1);
  assert.ok(scanText(['https://', ['drive', 'google', 'com'].join('.'), '/x'].join('')).length >= 1);
  assert.ok(scanText(['https://', ['docs', 'google', 'com'].join('.'), '/x'].join('')).length >= 1);
  assert.ok(scanText(`/${'Users'}/x`).length >= 1);
  assert.ok(scanText(`/${'home'}/x`).length >= 1);
  assert.ok(scanText(['10', '0', '0', '1'].join('.')).length >= 1);
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
});
