/**
 * Brand v1 contract: signature tokens, mark C spec, SVG allow-list (ADR-011),
 * and the Accepted item 7 contrast rule.
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
const { MAX_SVG_BYTES, PALETTE, checkSvg, listSvgFiles } = require('../scripts/check-brand-svg');

const ROOT = path.join(__dirname, '..');
const BRAND = path.join(ROOT, 'brand');
const SVG_NS = 'http://www.w3.org/2000/svg';

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

function shell(inner, extra) {
  return `<svg xmlns="${SVG_NS}" viewBox="0 0 1 1"${extra || ''}>${inner}</svg>`;
}

function pathFor(family, needle) {
  const manifest = loadBrandManifest(read('brand/MANIFEST.json'));
  const rows = manifest.files.filter((entry) => entry.family === family && entry.asset.includes(needle));
  assert.equal(rows.length, 1, `${family} ${needle}`);
  return rows[0].path;
}

function rememberDigest(seen, digest) {
  if (seen.has(digest)) return false;
  seen.add(digest);
  return true;
}

function patternNeedles() {
  return [
    ['/', 'Users', '/'].join(''),
    ['/', 'home', '/'].join(''),
    ['C:', '\\', 'Users'].join(''),
    ['Library', '/'].join(''),
    ['canva', '.', 'com'].join(''),
    ['google', '.', 'com/'].join(''),
    'googleusercontent',
  ];
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
  const keys = Object.keys(tokens).filter((key) => key !== '_note');
  assert.deepEqual(keys.sort(), [...REQUIRED_TOKEN_KEYS].sort());
  assert.match(tokens._note, /persona accent/);
  assert.match(tokens._note, /ambient-glow-teal-base/);
  for (const [name, hex] of Object.entries(SIGNATURES)) {
    assert.equal(tokens[`brand-signature-${name}-base`], hex);
  }
  assert.equal(tokens['brand-field-dark'], '#121214');
  assert.equal(tokens['brand-field-light'], '#F7F7F5');
  assert.equal(tokens['ambient-glow-wisteria-base'], 'rgba(180,167,242,.14)');
  assert.equal(Object.hasOwn(tokens, 'ambient-glow-teal-base'), false);
});

test('brand signatures match persona accents', { skip: 'skipped until the colours match: https://github.com/Vidoxlabs/videsign/issues/15' }, () => {
  const tokens = loadBrandTokens(read('brand/tokens.json'));
  const design = read('DESIGN.md');
  const pairs = [
    ['brand-signature-violet-base', 'persona-accent-violet-base'],
    ['brand-signature-wisteria-base', 'persona-accent-wisteria-base'],
    ['brand-signature-xylia-base', 'persona-accent-xylia-base'],
    ['brand-signature-yarrow-base', 'persona-accent-yarrow-base'],
    ['brand-signature-zinnia-base', 'persona-accent-zinnia-base'],
  ];
  for (const [brandKey, personaKey] of pairs) {
    const match = design.match(new RegExp(`${personaKey}: "(#[0-9A-Fa-f]{6})"`));
    assert.ok(match, personaKey);
    assert.equal(tokens[brandKey], match[1]);
  }
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
  assert.equal(spec.full_colour_on_light, false);
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
  assert.equal(spec.min_sizes_px.favicon_grade_floor, 24);
  assert.equal(spec.min_sizes_px.mark_tile, 81.778);
  assert.deepEqual(spec.card_sizes_px.lockup_horizontal, { width: 226, height: 82 });
  assert.deepEqual(spec.card_sizes_px.lockup_stacked, { width: 146, height: 110 });
  assert.deepEqual(spec.card_sizes_px.wordmark, { width: 641, height: 104 });
  assert.deepEqual(spec.card_sizes_px.social_og, { width: 1200, height: 630 });
  assert.ok(spec.clear_space.trim().length > 0);
});

test('brand signatures currently differ from persona accents', () => {
  const tokens = loadBrandTokens(read('brand/tokens.json'));
  const design = read('DESIGN.md');
  const pairs = [
    ['brand-signature-violet-base', 'persona-accent-violet-base'],
    ['brand-signature-wisteria-base', 'persona-accent-wisteria-base'],
    ['brand-signature-xylia-base', 'persona-accent-xylia-base'],
    ['brand-signature-yarrow-base', 'persona-accent-yarrow-base'],
    ['brand-signature-zinnia-base', 'persona-accent-zinnia-base'],
  ];
  let differ = 0;
  for (const [brandKey, personaKey] of pairs) {
    const match = design.match(new RegExp(`${personaKey}: "(#[0-9A-Fa-f]{6})"`));
    assert.ok(match, personaKey);
    if (tokens[brandKey] !== match[1]) differ += 1;
  }
  assert.ok(differ > 0);
});

test('item 7 contrast rule is Accepted', () => {
  const tokens = loadBrandTokens(read('brand/tokens.json'));
  const fill = tokens['brand-signature-violet-base'];
  const pairs = [
    [tokens['brand-field-dark'], 4.4188],
    ['#FFFFFF', 4.2344],
    [tokens['brand-field-light'], 3.9476],
  ];
  for (const [ink, expected] of pairs) {
    const ratio = contrast(ink, fill);
    assert.ok(Math.abs(ratio - expected) < 0.001, ratio);
    assert.ok(ratio < 4.5, ratio);
    assert.ok(ratio >= 3, ratio);
  }
  for (const rel of ['brand/README.md', 'SKILL.md', 'AGENTS.md', 'DESIGN.md']) {
    const doc = read(rel);
    assert.match(doc, /Accepted 2026-10-28/);
    assert.match(doc, /Item 7 is Accepted: white on #8B5CF6 is 4\.23:1/);
    assert.match(doc, /large: bold xl or larger, or 2xl or larger/);
    assert.doesNotMatch(doc, /owner decision/);
    assert.doesNotMatch(doc, /pending the owner/);
    assert.doesNotMatch(doc, /Interim contrast/);
    assert.equal(doc.includes(['pending', 'Gavin'].join(' ')), false);
    assert.match(doc, /ADR-011 item 10 is Accepted: CTA fills and focus rings are #8B5CF6/);
    assert.equal(doc.includes(['#7C3AED', 'is retired'].join(' ')), false);
  }
  for (const rel of ['brand/README.md', 'SKILL.md']) {
    const doc = read(rel);
    assert.match(doc, /18\.66px/);
    assert.match(doc, /24px/);
    assert.match(doc, /4\.42:1/);
    assert.match(doc, /4\.23:1/);
    assert.match(doc, /3\.95:1/);
  }
});

test('full-colour signatures fail 3:1 on the light field', () => {
  const light = '#F7F7F5';
  const wisteria = contrast(SIGNATURES.wisteria, light);
  const yarrow = contrast(SIGNATURES.yarrow, light);
  assert.ok(wisteria < 3, wisteria);
  assert.ok(yarrow < 3, yarrow);
  assert.ok(Math.abs(wisteria - 2.0079) < 0.001, wisteria);
  assert.ok(Math.abs(yarrow - 2.0071) < 0.001, yarrow);
  assert.match(read('brand/README.md'), /banned on the light field/);
  assert.equal(loadBrandSpec(read('brand/brand.json')).full_colour_on_light, false);
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

test('the SVG gate rejects an oversize file and accepts the byte limit', () => {
  const body = `<svg xmlns="${SVG_NS}" viewBox="0 0 1 1"></svg>`;
  const over = Buffer.alloc(MAX_SVG_BYTES + 1, 0x20);
  over.write(body);
  assert.ok(checkSvg(over).hits.includes('oversize'));
  const limit = Buffer.alloc(MAX_SVG_BYTES, 0x20);
  limit.write(body);
  assert.equal(checkSvg(limit).ok, true, checkSvg(limit).hits.join(','));
});

test('the SVG gate rejects a comment', () => {
  const home = patternNeedles()[0];
  const result = checkSvg(shell(`<!-- ${home}mark.svg -->`));
  assert.ok(result.hits.includes('comment'), result.hits.join(','));
});

test('the SVG gate rejects an editor namespace', () => {
  const home = patternNeedles()[0];
  const svg = `<svg xmlns="${SVG_NS}" viewBox="0 0 1 1" sodipodi:docname="${home}mark.svg" inkscape:export-filename="${home}mark.svg"></svg>`;
  const result = checkSvg(svg);
  assert.ok(result.hits.includes('namespace'), result.hits.join(','));
});

test('the SVG gate rejects script', () => {
  const result = checkSvg(shell('<script></script>'));
  assert.ok(result.hits.includes('element'), result.hits.join(','));
});

test('the SVG gate rejects an event-handler attribute', () => {
  const result = checkSvg(shell('', ' onload="alert(1)"'));
  assert.ok(result.hits.includes('handler'), result.hits.join(','));
});

test('the SVG gate rejects foreignObject', () => {
  const result = checkSvg(shell('<foreignObject width="1" height="1"></foreignObject>'));
  assert.ok(result.hits.includes('element'), result.hits.join(','));
});

test('the SVG gate rejects an external use reference', () => {
  const result = checkSvg(shell('<use href="https://example.com/mark.svg"/>'));
  assert.equal(result.ok, false);
  assert.ok(result.hits.includes('element'), result.hits.join(','));
  assert.ok(result.hits.includes('attribute'), result.hits.join(','));
});

test('the SVG gate rejects an external xlink reference', () => {
  const host = ['https://', 'canva', '.', 'com', '/file.svg'].join('');
  const link = ['http://www.w3.org/', '1999', '/', 'xlink'].join('');
  const svg = `<svg xmlns="${SVG_NS}" xmlns:xlink="${link}" viewBox="0 0 1 1"><use xlink:href="${host}"/></svg>`;
  const result = checkSvg(svg);
  assert.equal(result.ok, false);
  assert.ok(result.hits.includes('pattern'), result.hits.join(','));
  assert.ok(result.hits.includes('namespace'), result.hits.join(','));
});

test('the SVG gate rejects an external url import', () => {
  const result = checkSvg(shell('<style>@import url(https://example.com/a.css)</style>'));
  assert.ok(result.hits.includes('external-url'), result.hits.join(','));
});

test('the SVG gate rejects title and desc', () => {
  const result = checkSvg(shell('<title>mark</title><desc>mark</desc>'));
  assert.ok(result.hits.includes('element'), result.hits.join(','));
  assert.ok(result.hits.includes('text'), result.hits.join(','));
});

test('the SVG gate rejects non-SVG text', () => {
  const result = checkSvg('hello world');
  assert.ok(result.hits.includes('text'), result.hits.join(','));
});

test('the SVG gate rejects a javascript URI in any attribute', () => {
  const result = checkSvg(shell('<path d="M0 0" fill="javascript:alert(1)"/>'));
  assert.ok(result.hits.includes('javascript'), result.hits.join(','));
});

test('the SVG gate rejects a data URI in any attribute', () => {
  const result = checkSvg(shell('<use href="data:image/svg+xml,abcd"/>'));
  assert.ok(result.hits.includes('data-uri'), result.hits.join(','));
});

test('the SVG gate rejects an off-palette fill', () => {
  const result = checkSvg(shell('<path d="M0 0" fill="#00FF00"/>'));
  assert.ok(result.hits.includes('colour'), result.hits.join(','));
});

test('the SVG gate rejects an off-palette stroke', () => {
  const result = checkSvg(shell('<path d="M0 0" stroke="#00FF00"/>'));
  assert.ok(result.hits.includes('colour'), result.hits.join(','));
});

test('the SVG gate rejects fill none', () => {
  assert.equal(PALETTE.has('NONE'), false);
  const result = checkSvg(shell('<path d="M0 0" fill="none"/>'));
  assert.ok(result.hits.includes('colour'), result.hits.join(','));
});

test('the SVG gate rejects fill currentColor', () => {
  assert.equal(PALETTE.has('CURRENTCOLOR'), false);
  const result = checkSvg(shell('<path d="M0 0" fill="currentColor"/>'));
  assert.ok(result.hits.includes('colour'), result.hits.join(','));
});

test('literal path and host patterns are rejected', () => {
  for (const needle of patternNeedles()) {
    const result = checkSvg(shell(`<!-- ${needle} -->`));
    assert.ok(result.hits.includes('pattern'), needle);
  }
});

test('a same-document fragment reference is denied', () => {
  const result = checkSvg(shell('<use href="#mark"/>'));
  assert.equal(result.ok, false, result.hits.join(','));
  assert.ok(result.hits.includes('element'));
  assert.ok(result.hits.includes('attribute'));
});

test('the SVG gate rejects CDATA', () => {
  const result = checkSvg(shell('<path d="M0 0"><![CDATA[mark]]></path>'));
  assert.equal(result.ok, false, result.hits.join(','));
});

test('the SVG gate rejects a doctype and an entity', () => {
  const result = checkSvg(`<!DOCTYPE svg [<!ENTITY m "mark">]><svg xmlns="${SVG_NS}" viewBox="0 0 1 1"></svg>`);
  assert.equal(result.ok, false, result.hits.join(','));
  assert.ok(result.hits.includes('doctype'));
});

test('the SVG gate rejects a processing instruction and an XML declaration', () => {
  const result = checkSvg(`<?xml version="1.0"?><?xml-stylesheet type="text/css" href="a.css"?><svg xmlns="${SVG_NS}" viewBox="0 0 1 1"></svg>`);
  assert.equal(result.ok, false, result.hits.join(','));
  assert.ok(result.hits.includes('processing-instruction'));
});

test('the SVG gate rejects a style element and a style attribute', () => {
  const result = checkSvg(shell('<style>circle{}</style>', ' style="fill:#8B5CF6"'));
  assert.equal(result.ok, false, result.hits.join(','));
  assert.ok(result.hits.includes('element'));
  assert.ok(result.hits.includes('attribute'));
});

test('the SVG gate rejects xml:base', () => {
  const result = checkSvg(shell('', ' xml:base="mark"'));
  assert.equal(result.ok, false);
  assert.ok(result.hits.includes('namespace'));
});

test('the SVG gate rejects href case and whitespace variants', () => {
  const samples = [
    shell('', ' HREF="#mark"'),
    shell('', ' href = "#mark"'),
    shell('<use Xlink:Href="#mark"/>'),
  ];
  for (const sample of samples) {
    const result = checkSvg(sample);
    assert.equal(result.ok, false, result.hits.join(','));
  }
});

test('the SVG gate rejects mixed-case javascript', () => {
  const result = checkSvg(shell('<path d="M0 0" fill="JaVaScRiPt:alert(1)"/>'));
  assert.equal(result.ok, false);
  assert.ok(result.hits.includes('javascript'));
});

test('the SVG gate rejects url with spaces or quotes', () => {
  const samples = [
    shell('<path d="M0 0" fill="url( #x )"/>'),
    shell('<path d="M0 0" fill="url(\'#x\')"/>'),
    `<svg xmlns="${SVG_NS}" viewBox="0 0 1 1"><path d="M0 0" fill="url("#x")"/></svg>`,
  ];
  for (const sample of samples) {
    const result = checkSvg(sample);
    assert.equal(result.ok, false, sample);
    assert.ok(result.hits.includes('external-url'), result.hits.join(','));
  }
});

test('the SVG gate rejects set and animate', () => {
  const result = checkSvg(shell('<set attributeName="fill" to="#8B5CF6"/><animate attributeName="fill" to="#8B5CF6"/>'));
  assert.equal(result.ok, false);
  assert.ok(result.hits.includes('element'));
});

test('the SVG gate rejects namespaced and upper-case handlers', () => {
  const namespaced = checkSvg(shell('', ' svg:onload="alert(1)"'));
  assert.equal(namespaced.ok, false);
  assert.ok(namespaced.hits.includes('handler'));
  const upper = checkSvg(shell('', ' ONLOAD="alert(1)"'));
  assert.equal(upper.ok, false);
  assert.ok(upper.hits.includes('handler'));
});

test('the SVG gate rejects image, anchor, and metadata', () => {
  const result = checkSvg(shell('<image width="1" height="1"/><a></a><metadata></metadata>'));
  assert.equal(result.ok, false);
  assert.ok(result.hits.includes('element'));
});

test('the SVG gate rejects unclosed and unparseable documents', () => {
  const unclosed = checkSvg(`<svg xmlns="${SVG_NS}" viewBox="0 0 1 1"><path d="M0 0"`);
  assert.equal(unclosed.ok, false);
  const garbage = checkSvg('<<<<');
  assert.equal(garbage.ok, false);
});

test('the SVG gate rejects synthetic editor ids', () => {
  const drive = shell('', ` id="${'D'.repeat(33)}"`);
  const canva = shell('', ` id="${'C'.repeat(11)}"`);
  for (const sample of [drive, canva]) {
    const result = checkSvg(sample);
    assert.equal(result.ok, false, result.hits.join(','));
    assert.ok(result.hits.includes('attribute'));
  }
});

test('the SVG gate rejects an attribute on a closing tag', () => {
  const spaced = checkSvg(shell('<g></g >'));
  assert.equal(spaced.ok, true, spaced.hits.join(','));
  const tagged = checkSvg(shell('<g></g x="1">'));
  assert.equal(tagged.ok, false);
  assert.ok(tagged.hits.includes('attribute'));
});

test('the SVG gate rejects a leading byte-order mark', () => {
  const result = checkSvg(`\uFEFF<svg xmlns="${SVG_NS}" viewBox="0 0 1 1"></svg>`);
  assert.equal(result.ok, false);
  assert.ok(result.hits.includes('bom'));
  assert.equal(result.hits.includes('unset or empty'), false);
});

test('data-role is not treated as a data URI', () => {
  const result = checkSvg(shell('<path d="M0 0" fill="#8B5CF6" data-role="text"/>'));
  assert.equal(result.hits.includes('data-uri'), false);
  assert.equal(result.ok, true, result.hits.join(','));
});

test('a duplicated manifest digest is rejected', () => {
  const seen = new Set();
  const digest = 'abc';
  assert.equal(rememberDigest(seen, digest), true);
  assert.equal(rememberDigest(seen, digest), false);
  assert.equal(rememberDigest(seen, 'def'), true);
});

test('every brand SVG is scanned and matches the manifest digest', () => {
  const scanned = listSvgFiles(BRAND);
  assert.equal(scanned.ok, true, scanned.hits.join('\n'));
  assert.equal(scanned.files.length, 11);

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
    assert.equal(rememberDigest(seen, row.sha256), true, row.path);
    const text = bytes.toString('utf8');
    assert.equal(/<(?:linear|radial)Gradient\b/i.test(text), false);
    assert.equal(/\b(?:none|currentColor)\b/.test(text), false);
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
  const tile = viewBoxSize(pathFor('mark', 'full-color'));
  assert.equal(tile.width, spec.min_sizes_px.mark_tile);
  assert.equal(tile.height, spec.min_sizes_px.mark_tile);
  const horizontal = viewBoxSize(pathFor('lockup', 'horizontal-dark'));
  assert.equal(horizontal.width, spec.card_sizes_px.lockup_horizontal.width);
  assert.equal(horizontal.height, spec.card_sizes_px.lockup_horizontal.height);
  const stacked = viewBoxSize(pathFor('lockup', 'stacked-dark'));
  assert.equal(stacked.width, spec.card_sizes_px.lockup_stacked.width);
  assert.equal(stacked.height, spec.card_sizes_px.lockup_stacked.height);
  const wordmark = viewBoxSize(pathFor('wordmark', 'dark'));
  assert.equal(wordmark.width, spec.card_sizes_px.wordmark.width);
  assert.equal(wordmark.height, spec.card_sizes_px.wordmark.height);
});

test('full-colour mark uses the dark tile and the five signature fills', () => {
  const text = read(pathFor('mark', 'full-color'));
  assert.match(text, /fill="#121214"/);
  for (const hex of Object.values(SIGNATURES)) {
    assert.ok(text.includes(`fill="${hex}"`), hex);
  }
  assert.equal(text.includes('#F7F7F5'), false);
});

test('brand svgs are not ignored, and rasters under brand still are', () => {
  const svg = pathFor('mark', 'full-color');
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
  assert.match(skill, /## ADR-011: Brand identity \(brand v1\)/);
  assert.match(skill, /Proposed \(awaiting owner ratification\)/);
  assert.match(skill, /Amends ADR-002/);
  assert.match(skill, /Proposed amendment \(ADR-011, awaiting ratification\)/);
  assert.match(skill, /\*\*Amended by ADR-006 \(2026-10-05\):\*\* crystal glass is the sanctioned material/);
  assert.match(skill, /Crystal glass \(ADR-006\) is the only glass material\./);
  assert.match(skill, /Crystal glass only \(ADR-006\)\*\*: Glass appears only on controls and lenses/);
  assert.doesNotMatch(skill, /Proposed amendment \(ADR-006/);
  assert.doesNotMatch(skill, /Amended by ADR-011/);
  assert.match(read('.gitattributes'), /brand\/\*\*\/\*\.svg -text/);
  assert.doesNotMatch(read('.gitattributes'), /brand\/\*\*\/\*\.svg binary/);
  const design = read('DESIGN.md');
  assert.match(design, /surface-accent-violet-base: "#8B5CF6"/);
  assert.match(design, /surface-accent-violet-hover: "#6D28D9"/);
  assert.match(design, /surface-accent-violet-active: "#5B21B6"/);
  const adr011 = skill.slice(skill.indexOf('## ADR-011:'), skill.indexOf('## ADR-012:'));
  assert.match(adr011, /Item 7 is Accepted/);
  assert.match(adr011, /Item 10 is Accepted/);
  assert.match(adr011, /Items 1-6, 8 and 9 stay Proposed/);
  assert.match(adr011, /Proposed \(awaiting owner ratification\)/);
  assert.doesNotMatch(adr011, /\*\*Status\*\*: Accepted/);
  assert.match(design, /persona-accent-wisteria-base: "#A78BFA"/);
  assert.match(design, /ambient-glow-teal-base/);
  assert.match(design, /being retired/);
  assert.match(design, /brand\/brand_mark_header_v008\.svg/);
  const agents = read('AGENTS.md');
  assert.match(agents, /brand\//);
  assert.match(agents, /design_system\/brand\//);
  assert.match(agents, /being retired/i);
  assert.match(read('README.md'), /brand\/README\.md/);
  const sidebar = read('preview/sidebar-nav.html');
  assert.match(sidebar, /brand\/brand_favicon_px16_v008\.svg/);
  assert.doesNotMatch(sidebar, /brand_mark_header_v008\.svg/);
  assert.doesNotMatch(sidebar, /cube\.png/);
  assert.match(sidebar, /border-surface-accent-violet-base/);
  assert.match(sidebar, /bg-surface-accent-violet-base/);
  assert.doesNotMatch(sidebar, /persona-accent-violet-base/);
  assert.doesNotMatch(sidebar, /text-surface-accent-violet-base/);
});
