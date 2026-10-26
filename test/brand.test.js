/**
 * Brand v1 contract: signature tokens, mark C spec, SVG gate (ADR-011),
 * and the D5 button pair measured with WCAG 2 relative luminance.
 */

const { test } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const {
  REQUIRED_TOKEN_KEYS,
  loadBrandTokens,
  loadBrandSpec,
  loadBrandManifest,
} = require('../scripts/brand-config');
const { MAX_SVG_BYTES, checkSvg, listSvgFiles } = require('../scripts/check-brand-svg');

const ROOT = path.join(__dirname, '..');
const BRAND = path.join(ROOT, 'brand');

const SIGNATURES = {
  violet: '#8B5CF6',
  wisteria: '#B4A7F2',
  xylia: '#D92B3A',
  yarrow: '#F0A020',
  zinnia: '#E13D9E',
};

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

function channel(hex, index) {
  return Number.parseInt(hex.slice(1 + index * 2, 3 + index * 2), 16) / 255;
}

function linearize(value) {
  return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
}

function luminance(hex) {
  const weights = [0.2126, 0.7152, 0.0722];
  return weights.reduce((sum, weight, index) => sum + weight * linearize(channel(hex, index)), 0);
}

function contrast(foreground, background) {
  const lighter = Math.max(luminance(foreground), luminance(background));
  const darker = Math.min(luminance(foreground), luminance(background));
  return (lighter + 0.05) / (darker + 0.05);
}

test('brand tokens deny unset, blank, and empty documents', () => {
  for (const raw of [undefined, null, '', '   ', '{}']) {
    assert.throws(() => loadBrandTokens(raw), /unset or empty/);
  }
  const tokens = JSON.parse(read('brand/tokens.json'));
  delete tokens['brand-signature-violet-base'];
  assert.throws(() => loadBrandTokens(JSON.stringify(tokens)), /brand-signature-violet-base is unset or empty/);
  const blank = JSON.parse(read('brand/tokens.json'));
  blank['brand-field-dark'] = '  ';
  assert.throws(() => loadBrandTokens(JSON.stringify(blank)), /brand-field-dark is unset or empty/);
});

test('brand spec and manifest deny unset or empty documents', () => {
  for (const raw of [undefined, null, '', '   ']) {
    assert.throws(() => loadBrandSpec(raw), /unset or empty/);
    assert.throws(() => loadBrandManifest(raw), /unset or empty/);
  }
  assert.throws(() => loadBrandSpec('{}'), /unset or empty/);
  assert.throws(() => loadBrandManifest('{"files":[]}'), /unset or empty/);
  const spec = JSON.parse(read('brand/brand.json'));
  spec.facets.top = [];
  assert.throws(() => loadBrandSpec(JSON.stringify(spec)), /facets\.top is unset or empty/);
});

test('brand signature tokens use the canon hexes and the wisteria glow', () => {
  const tokens = loadBrandTokens(read('brand/tokens.json'));
  assert.deepEqual(Object.keys(tokens).sort(), [...REQUIRED_TOKEN_KEYS].sort());
  for (const [name, hex] of Object.entries(SIGNATURES)) {
    assert.equal(tokens[`brand-signature-${name}-base`], hex);
  }
  assert.equal(tokens['brand-field-dark'], '#121214');
  assert.equal(tokens['brand-field-light'], '#F7F7F5');
  assert.equal(tokens['ambient-glow-wisteria-base'], 'rgba(180,167,242,.14)');
  assert.equal(Object.hasOwn(tokens, 'ambient-glow-teal-base'), false);
});

test('brand spec maps facets to the five VIs and records sizes', () => {
  const spec = loadBrandSpec(read('brand/brand.json'));
  const tokens = loadBrandTokens(read('brand/tokens.json'));
  assert.equal(spec.mark, 'C');
  assert.deepEqual(spec.facets.top, ['wisteria', 'yarrow']);
  assert.deepEqual(spec.facets.side, ['xylia', 'zinnia']);
  assert.equal(spec.facets.band, 'violet');
  assert.equal(spec.signature_gradients, false);
  assert.equal(spec.full_colour_on, 'dark-tile');
  assert.equal(spec.text_safe_xylia, 'pending');
  assert.equal(spec.text_safe_zinnia, 'pending');
  assert.equal(spec.vi.xylia.as_text, false);
  assert.equal(spec.vi.xylia.alone, false);
  assert.equal(spec.source_tree, 'design_system/brand/');
  assert.equal(spec.naming, 'brand_{asset}_{variant}_v{NNN}.{ext}');
  for (const [name, entry] of Object.entries(spec.vi)) {
    assert.equal(entry.hex, SIGNATURES[name]);
    assert.equal(tokens[entry.token], entry.hex);
  }
  assert.equal(spec.min_sizes_px.favicon, 16);
  assert.equal(spec.min_sizes_px.mark_header, 38);
  assert.equal(spec.min_sizes_px.mark_tile, 81.778);
  assert.deepEqual(spec.card_sizes_px.lockup_horizontal, { width: 226, height: 82 });
  assert.deepEqual(spec.card_sizes_px.lockup_stacked, { width: 146, height: 110 });
  assert.deepEqual(spec.card_sizes_px.wordmark, { width: 641, height: 104 });
  assert.deepEqual(spec.card_sizes_px.social_og, { width: 1200, height: 630 });
  assert.ok(spec.clear_space.trim().length > 0);
});

test('D5 button pair is field-dark on signature violet', () => {
  const tokens = loadBrandTokens(read('brand/tokens.json'));
  const fill = tokens['brand-signature-violet-base'];
  const label = tokens['brand-field-dark'];
  const darkOnViolet = contrast(label, fill);
  const whiteOnViolet = contrast('#FFFFFF', fill);
  assert.ok(Math.abs(darkOnViolet - 4.4188) < 0.001, darkOnViolet);
  assert.ok(Math.abs(whiteOnViolet - 4.2344) < 0.001, whiteOnViolet);
  assert.ok(darkOnViolet > whiteOnViolet);
  assert.ok(darkOnViolet < 4.5);
  assert.ok(whiteOnViolet < 4.5);
});

test('an unset or empty SVG is denied, and a directory with zero SVGs passes', () => {
  assert.equal(checkSvg(undefined).ok, false);
  assert.equal(checkSvg(null).ok, false);
  assert.equal(checkSvg('').ok, false);
  assert.equal(checkSvg(Buffer.alloc(0)).ok, false);
  assert.deepEqual(checkSvg('   ').hits, ['unset or empty']);

  const emptyDir = fs.mkdtempSync(path.join(os.tmpdir(), 'brand-empty-'));
  try {
    const empty = listSvgFiles(emptyDir);
    assert.equal(empty.ok, true);
    assert.deepEqual(empty.files, []);
  } finally {
    fs.rmSync(emptyDir, { recursive: true, force: true });
  }

  assert.equal(listSvgFiles('').ok, false);
  assert.equal(listSvgFiles('   ').ok, false);
  assert.equal(listSvgFiles(path.join(BRAND, 'missing-brand-dir')).ok, false);
});

test('the SVG gate rejects images, data URIs, metadata, and oversize files', () => {
  const image = '<svg xmlns="http://www.w3.org/2000/svg"><image href="mark.png"/></svg>';
  const dataUri = '<svg xmlns="http://www.w3.org/2000/svg"><image href="data:image/png;base64,aaaa"/></svg>';
  const metadata = '<svg xmlns="http://www.w3.org/2000/svg"><metadata><rdf:RDF/></metadata></svg>';
  const xmp = '<svg xmlns="http://www.w3.org/2000/svg"><xmpmeta></xmpmeta></svg>';
  assert.ok(checkSvg(image).hits.includes('image'));
  assert.ok(checkSvg(dataUri).hits.includes('data-uri'));
  assert.ok(checkSvg(metadata).hits.includes('metadata'));
  assert.ok(checkSvg(metadata).hits.includes('rdf-xmp'));
  assert.ok(checkSvg(xmp).hits.includes('rdf-xmp'));
  const over = Buffer.alloc(MAX_SVG_BYTES + 1, 0x20);
  over.write('<svg xmlns="http://www.w3.org/2000/svg"></svg>');
  assert.ok(checkSvg(over).hits.includes('oversize'));
  const limit = Buffer.alloc(MAX_SVG_BYTES, 0x20);
  limit.write('<svg xmlns="http://www.w3.org/2000/svg"></svg>');
  assert.equal(checkSvg(limit).ok, true);
});

test('every brand SVG is scanned and matches the manifest digest', () => {
  const scanned = listSvgFiles(BRAND);
  assert.equal(scanned.ok, true, scanned.hits.join('\n'));
  assert.ok(scanned.files.length > 0);

  const manifest = loadBrandManifest(read('brand/MANIFEST.json'));
  const listed = manifest.files.map((row) => path.join(ROOT, row.path)).sort();
  assert.deepEqual(scanned.files, listed);

  const seen = new Set();
  for (const row of manifest.files) {
    assert.match(row.asset, /^brand_[a-z0-9-]+_[a-z0-9-]+_v[0-9]{3}\.svg$/);
    assert.equal(row.asset, path.basename(row.path));
    assert.match(row.version, /^v[0-9]{3}$/);
    assert.match(row.sha256, /^[0-9a-f]{64}$/);
    assert.ok(['mark', 'favicon', 'lockup', 'wordmark'].includes(row.family));
    const bytes = fs.readFileSync(path.join(ROOT, row.path));
    assert.ok(bytes.length > 0 && bytes.length <= MAX_SVG_BYTES);
    const digest = crypto.createHash('sha256').update(bytes).digest('hex');
    assert.equal(digest, row.sha256);
    assert.equal(seen.has(row.sha256), false);
    seen.add(row.path);
    const text = bytes.toString('utf8');
    assert.equal(/<(?:linear|radial)Gradient\b/i.test(text), false);
  }

  const names = fs.readdirSync(BRAND);
  assert.equal(names.some((name) => name.endsWith('.png')), false);
});

test('shipped master viewBoxes match the recorded minimums and card sizes', () => {
  const spec = loadBrandSpec(read('brand/brand.json'));
  function viewBoxSize(rel) {
    const text = read(rel);
    const match = text.match(/viewBox="([^"]+)"/);
    assert.ok(match, rel);
    const parts = match[1].trim().split(/\s+/).map(Number);
    assert.equal(parts.length, 4);
    return { width: parts[2], height: parts[3] };
  }
  const favicon = viewBoxSize('brand/brand_favicon_px16_v008.svg');
  assert.equal(favicon.width, spec.min_sizes_px.favicon);
  assert.equal(favicon.height, spec.min_sizes_px.favicon);
  const header = viewBoxSize('brand/brand_mark_header_v008.svg');
  assert.equal(header.width, spec.min_sizes_px.mark_header);
  assert.equal(header.height, spec.min_sizes_px.mark_header);
  const tile = viewBoxSize('brand/brand_mark_full-color_v008.svg');
  assert.equal(tile.width, spec.min_sizes_px.mark_tile);
  assert.equal(tile.height, spec.min_sizes_px.mark_tile);
  const horizontal = viewBoxSize('brand/brand_lockup_horizontal-dark_v004.svg');
  assert.equal(horizontal.width, spec.card_sizes_px.lockup_horizontal.width);
  assert.equal(horizontal.height, spec.card_sizes_px.lockup_horizontal.height);
  const stacked = viewBoxSize('brand/brand_lockup_stacked-dark_v004.svg');
  assert.equal(stacked.width, spec.card_sizes_px.lockup_stacked.width);
  assert.equal(stacked.height, spec.card_sizes_px.lockup_stacked.height);
  const wordmark = viewBoxSize('brand/brand_wordmark_dark_v002.svg');
  assert.equal(wordmark.width, spec.card_sizes_px.wordmark.width);
  assert.equal(wordmark.height, spec.card_sizes_px.wordmark.height);
});

test('full-colour mark uses the dark tile and the five signature fills', () => {
  const text = read('brand/brand_mark_full-color_v008.svg');
  assert.match(text, /fill="#121214"/);
  for (const hex of Object.values(SIGNATURES)) {
    assert.ok(text.includes(`fill="${hex}"`), hex);
  }
  assert.equal(text.includes('#F7F7F5'), false);
});

test('brand svgs are not ignored, and rasters under brand still are', () => {
  const svg = 'brand/brand_mark_full-color_v008.svg';
  const allowed = spawnSync('git', ['check-ignore', '--no-index', '-q', '--', svg], {
    cwd: ROOT,
    encoding: 'utf8',
  });
  assert.equal(allowed.status, 1);
  const elsewhere = spawnSync('git', ['check-ignore', '--no-index', '-q', '--', 'assets/example.svg'], {
    cwd: ROOT,
    encoding: 'utf8',
  });
  assert.equal(elsewhere.status, 0);
  const raster = spawnSync('git', ['check-ignore', '--no-index', '-v', '--', 'brand/example.png'], {
    cwd: ROOT,
    encoding: 'utf8',
  });
  assert.equal(raster.status, 0, raster.stderr);
  assert.match(raster.stdout, /\*\.png/);
});

test('ADR-011 is proposed and amends the raster ban', () => {
  const skill = read('SKILL.md');
  assert.match(skill, /## ADR-011: Brand identity \(VWXYZ\)/);
  assert.match(skill, /Proposed \(awaiting owner ratification\)/);
  assert.match(skill, /Amends ADR-002/);
  const agents = read('AGENTS.md');
  assert.match(agents, /brand\//);
  assert.match(agents, /design_system\/brand\//);
  assert.match(read('README.md'), /brand\/README\.md/);
});
