#!/usr/bin/env node
'use strict';

/**
 * canon-tool.js — deterministic C1–C13 canon validator and digital-ID
 * sidecar generator for VWXYZ persona PNG candidates.
 *
 * Commands:
 *   node scripts/canon-tool.js check <file.png> [...]
 *       Validates C1 (filename, vocabulary slot, version uniqueness within
 *       the staged directory), C2 (co-located sidecar conformance, when a
 *       sidecar exists), C3 (canvas size and colour mode), C4 (transparent
 *       border, full/chibi only) and C8 (CIEDE2000 channel check plus the
 *       identity-confusion test). Emits a JSON summary; exits 1 on any
 *       failed applicable check.
 *   node scripts/canon-tool.js sidecar <file.png> [options]
 *       Runs the same automated checks, then writes
 *       <file>.sidecar.json next to the PNG and prints a manifestEntry
 *       JSON record (schema $defs/manifestEntry). Candidate entries are
 *       emitted with status "needs-regen" until ViCanon review and owner
 *       approval flip them to "published".
 *
 * Options for sidecar:
 *   --tool <name>            generator tool (required)
 *   --model <name>           generator model (required)
 *   --seed <n>               generator seed (optional)
 *   --prompt <text>          final generation prompt (required)
 *   --negative <text>        negative prompt (required)
 *   --reference <assetId>    extra reference image (repeatable; the anchor
 *                            {vi}/sheet/anchor/v001 is always included)
 *   --run-id <id>            defaults to a deterministic digest-derived id
 *   --created-by <name>      defaults to "canon-tool"
 *   --created-at <date>      defaults to the current date (YYYY-MM-DD)
 *   --supersedes <assetId>   previous version this candidate replaces
 *   --legacy-alias <slug>    legacy runtime slot this asset covers
 *   --out <path>             sidecar output path (default: co-located)
 *
 * Zero external native dependencies: PNG parsing is pure JavaScript
 * (scripts/lib/png.js) and colour math reuses scripts/lib/ciede2000.js.
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const { deltaE00Hex } = require('./lib/ciede2000');
const { decodePng } = require('./lib/png');
const { validate, slotAllowed, parseCanonFilename } = require('./lib/canon-validate');

const ROOT = path.join(__dirname, '..');
const CANON_DIR = path.join(ROOT, 'canon', 'vwxyz');
const ASSET_BASE_URL = 'https://assets.vidoxlabs.dev/vi';

const CANVAS = {
  full: { width: 1536, height: 2048, mode: 'RGBA' },
  chibi: { width: 926, height: 1596, mode: 'RGBA' },
  bg: { width: 2560, height: 1440, mode: 'RGB' },
  sheet: { width: 2048, height: 1144, mode: 'RGB' },
};

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function sha256Hex(bytes) {
  return crypto.createHash('sha256').update(bytes).digest('hex');
}

function hexOfRgb(entry) {
  const part = (n) => n.toString(16).padStart(2, '0');
  return `#${part(entry.r)}${part(entry.g)}${part(entry.b)}`.toUpperCase();
}

/** Load canon sources once. */
function loadCanon() {
  const paletteBytes = fs.readFileSync(path.join(CANON_DIR, 'palette.json'));
  return {
    palette: JSON.parse(paletteBytes.toString('utf8')),
    paletteSha256: sha256Hex(paletteBytes),
    vocabulary: readJson(path.join(CANON_DIR, 'vocabulary.json')),
    schema: readJson(path.join(CANON_DIR, 'asset-manifest.schema.json')),
  };
}

function nearestColor(histogram, hex) {
  let best = null;
  let bestDelta = Infinity;
  for (const entry of histogram.values()) {
    const delta = deltaE00Hex(hexOfRgb(entry), hex);
    if (delta < bestDelta) {
      bestDelta = delta;
      best = entry;
    }
  }
  return { color: best, deltaE: bestDelta };
}

/** Canonical channels to sample for a character asset, with canon hexes. */
function characterChannels(palette, vi) {
  const entry = palette.vi[vi];
  return [
    ['hair', entry.hair],
    ['underlight', entry.underlight],
    ['eyes', entry.eyes],
    ['trim', entry.trim],
    ['tie', entry.tie],
    ['tail_tip', entry.tail_tip],
    ['blazer', palette.shared.blazer],
    ['shirt', palette.shared.shirt],
  ];
}

function bgChannels(palette, vi) {
  const bg = palette.vi[vi].background;
  return [
    ['base', bg.base],
    ['mid', bg.mid],
    ['line', bg.line],
  ];
}

/**
 * Run the automated checks for one PNG. Returns a report:
 *   { file, ok, checks: { C1..C8: { ok, detail } }, swatches, identity }
 */
function checkOne(filePath, canon, siblings) {
  const file = path.basename(filePath);
  const report = { file, ok: true, checks: {}, swatches: {}, identity: null };

  const fail = (id, detail) => {
    report.checks[id] = { ok: false, detail };
    report.ok = false;
  };
  const pass = (id, detail) => {
    report.checks[id] = { ok: true, detail };
  };

  // C1 — name, vocabulary slot, version uniqueness.
  const parsed = parseCanonFilename(file);
  if (!parsed) {
    fail('C1', 'filename does not match the canon pattern');
    return report;
  }
  if (!slotAllowed(canon.vocabulary, parsed.slot, parsed.vi)) {
    fail('C1', `slot "${parsed.slot}" is not in vocabulary.json for ${parsed.vi}`);
    return report;
  }
  const key = `${parsed.vi}|${parsed.type}|${parsed.slot}|${parsed.version}`;
  const occurrences = siblings.filter((other) => {
    const otherParsed = parseCanonFilename(path.basename(other));
    return otherParsed
      && `${otherParsed.vi}|${otherParsed.type}|${otherParsed.slot}|${otherParsed.version}` === key;
  }).length;
  if (occurrences > 1) {
    fail('C1', `version v${String(parsed.version).padStart(3, '0')} appears ${occurrences} times in the staged set for ${parsed.vi}/${parsed.type}/${parsed.slot}`);
  } else {
    pass('C1', parsed.assetId);
  }

  // Decode the PNG (C3 prerequisite).
  let png;
  try {
    png = decodePng(fs.readFileSync(filePath));
  } catch (err) {
    fail('C3', `undecodable PNG: ${err.message}`);
    return report;
  }

  // C3 — canvas and colour mode.
  const spec = CANVAS[parsed.type];
  const dimsOk = png.width === spec.width && png.height === spec.height;
  const modeOk = png.mode === spec.mode;
  if (!dimsOk || !modeOk) {
    fail('C3', `got ${png.width}x${png.height} ${png.mode}, want ${spec.width}x${spec.height} ${spec.mode}`);
  } else {
    pass('C3', `${png.width}x${png.height} ${png.mode}`);
  }

  // C4 — transparent corners and a 3% border (full/chibi only).
  if (parsed.type === 'full' || parsed.type === 'chibi') {
    const band = Math.floor((Math.min(png.width, png.height) * 3) / 100);
    let opaque = 0;
    for (let y = 0; y < png.height; y += 1) {
      for (let x = 0; x < png.width; x += 1) {
        if (x >= band && x < png.width - band && y >= band && y < png.height - band) continue;
        if (png.pixelAt(x, y)[3] !== 0) opaque += 1;
      }
    }
    if (opaque > 0) fail('C4', `${opaque} opaque pixels inside the ${band}px border`);
    else pass('C4', `border band ${band}px fully transparent`);
  } else {
    pass('C4', 'not applicable to sheet or bg');
  }

  // C8 — channel colour check plus identity confusion.
  const wantsIdentity = parsed.type !== 'bg';
  const channels = parsed.type === 'bg'
    ? bgChannels(canon.palette, parsed.vi)
    : characterChannels(canon.palette, parsed.vi);
  let colorOk = true;
  let signatureSample = null;
  for (const [channel, hex] of channels) {
    const { color, deltaE } = nearestColor(png.histogram, hex);
    if (!color) {
      fail('C8', `no opaque pixels to sample for ${channel}`);
      colorOk = false;
      continue;
    }
    const sampled = hexOfRgb(color);
    report.swatches[channel] = { canon: hex, sampled, delta_e: Number(deltaE.toFixed(2)) };
    if (deltaE > canon.palette.review_threshold.max_delta_e) colorOk = false;
    if (channel === 'trim') signatureSample = sampled;
  }
  if (colorOk && !report.checks.C8) {
    const worst = Math.max(...Object.values(report.swatches).map((s) => s.delta_e));
    pass('C8', `worst channel deltaE00 ${worst}`);
  } else if (!report.checks.C8) {
    const bad = Object.entries(report.swatches)
      .filter(([, s]) => s.delta_e > canon.palette.review_threshold.max_delta_e)
      .map(([c, s]) => `${c} ${s.delta_e}`)
      .join(', ');
    fail('C8', `channel(s) over threshold: ${bad}`);
  }

  // Identity confusion, two ways. First the checklist form: the sampled
  // trim (the in-image colour closest to the canon signature) must sit
  // closer to this VI than to any other. Second the drift form: no colour
  // in the image may land inside another VI's signature distance, because
  // a single-VI asset carries exactly one signature hue.
  const signatures = Object.entries(canon.palette.vi).map(([name, entry]) => [name, entry.signature]);
  if (wantsIdentity && signatureSample) {
    let own = null;
    let nearest = null;
    let nearestDelta = Infinity;
    for (const [name, hex] of signatures) {
      const delta = deltaE00Hex(signatureSample, hex);
      if (name === parsed.vi) own = delta;
      if (delta < nearestDelta) {
        nearestDelta = delta;
        nearest = name;
      }
    }
    report.identity = { sampled: signatureSample, own_delta_e: Number(own.toFixed(2)), nearest_vi: nearest, nearest_delta_e: Number(nearestDelta.toFixed(2)) };
    if (nearest !== parsed.vi) {
      fail('C8', `identity confusion: sampled trim is closer to ${nearest} than to ${parsed.vi}`);
    }
  }
  if (wantsIdentity) {
    // Colours that legitimately belong to this VI: every per-VI channel plus
    // the shared family constants. A colour may sit near a foreign signature
    // only when it is also explainable by this VI's own palette (canon README
    // section 3 allows cross-channel neighbours such as Violet's secondary
    // against Wisteria's signature; the identity test compares elements).
    const ownEntry = canon.palette.vi[parsed.vi];
    const ownChannels = [
      ...['signature', 'hair', 'underlight', 'eyes', 'trim', 'tie', 'tail_tip', 'secondary', 'inner_ear'].map((k) => ownEntry[k]),
      ...Object.values(canon.palette.shared),
    ];
    const drift = [];
    for (const entry of png.histogram.values()) {
      const sampled = hexOfRgb(entry);
      let nearest = null;
      let nearestDelta = Infinity;
      for (const [name, hex] of signatures) {
        const delta = deltaE00Hex(sampled, hex);
        if (delta < nearestDelta) {
          nearestDelta = delta;
          nearest = name;
        }
      }
      if (nearest === parsed.vi || nearestDelta > canon.palette.review_threshold.max_delta_e) continue;
      const ownClosest = Math.min(...ownChannels.map((hex) => deltaE00Hex(sampled, hex)));
      if (ownClosest > canon.palette.review_threshold.max_delta_e) {
        drift.push({ sampled, nearest_vi: nearest, delta_e: Number(nearestDelta.toFixed(2)) });
      }
    }
    if (report.identity) report.identity.foreign_signature_colors = drift;
    if (drift.length > 0) {
      const worst = drift[0];
      fail('C8', `foreign signature colour ${worst.sampled} sits deltaE00 ${worst.delta_e} from ${worst.nearest_vi}`);
    }
  }

  return report;
}

/** C2 — co-located sidecar conformance (when a sidecar exists). */
function checkSidecar(filePath, pngBytes, parsed, canon) {
  const sidecarPath = filePath.replace(/\.png$/, '.sidecar.json');
  if (!fs.existsSync(sidecarPath)) return { present: false, ok: true, path: sidecarPath };
  let sidecar;
  try {
    sidecar = readJson(sidecarPath);
  } catch (err) {
    return { present: true, ok: false, path: sidecarPath, detail: `invalid JSON: ${err.message}` };
  }
  const errors = validate(canon.schema, canon.schema.$defs.sidecar, sidecar, 'sidecar');
  const anchor = `${parsed.vi}/sheet/anchor/v001`;
  const hasAnchor = Array.isArray(sidecar.generator && sidecar.generator.reference_images)
    && sidecar.generator.reference_images.some((ref) => ref.asset_id === anchor);
  const shaOk = sidecar.sha256 === sha256Hex(pngBytes);
  const canonOk = sidecar.canon_version === canon.palette.canon_version;
  const ok = errors.length === 0 && hasAnchor && shaOk && canonOk;
  const detail = [
    errors.length ? `schema: ${errors.join('; ')}` : 'schema: valid',
    hasAnchor ? `anchor ${anchor} referenced` : `anchor ${anchor} missing`,
    shaOk ? 'sha256 matches PNG' : 'sha256 does not match PNG',
    canonOk ? 'canon_version matches palette.json' : 'canon_version mismatch',
  ].join('; ');
  return { present: true, ok, path: sidecarPath, detail };
}

function listSiblingPngs(filePath) {
  const dir = path.dirname(filePath);
  let names = [];
  try {
    names = fs.readdirSync(dir);
  } catch (err) {
    return [];
  }
  return names
    .filter((name) => /\.png$/.test(name) && parseCanonFilename(name))
    .map((name) => path.join(dir, name));
}

function todayLocal() {
  const now = new Date();
  const part = (n) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${part(now.getMonth() + 1)}-${part(now.getDate())}`;
}

function buildSidecar(filePath, pngBytes, parsed, canon, report, options) {
  const pngSha = sha256Hex(pngBytes);
  const failedItems = Object.entries(report.checks)
    .filter(([, check]) => !check.ok)
    .map(([id]) => id);
  const anchor = `${parsed.vi}/sheet/anchor/v001`;
  const referenceImages = [{ asset_id: anchor, role: 'anchor' }];
  for (const ref of options.reference || []) referenceImages.push({ asset_id: ref, role: 'reference' });

  const png = decodePng(pngBytes);
  return {
    file: path.basename(filePath),
    vi: parsed.vi,
    type: parsed.type,
    slot: parsed.slot,
    version: parsed.version,
    canon_version: canon.palette.canon_version,
    palette_sha256: canon.paletteSha256,
    sha256: pngSha,
    width: png.width,
    height: png.height,
    mode: png.mode,
    matted: false,
    generator: {
      tool: options.tool,
      model: options.model,
      seed: options.seed === undefined ? null : options.seed,
      prompt: options.prompt,
      negative_prompt: options.negative,
      reference_images: referenceImages,
    },
    run_id: options.runId || `run-${pngSha.slice(0, 12)}`,
    created_at: options.createdAt || todayLocal(),
    created_by: options.createdBy || 'canon-tool',
    review: {
      status: failedItems.length ? 'rejected' : 'quarantine',
      reviewer: null,
      reviewed_at: null,
      checklist_version: 'v1',
      failed_items: failedItems,
      swatches: report.swatches,
      notes: report.identity
        ? `automated C1-C4/C8 only; C5-C7, C9-C13 require ViCanon review. Identity: sampled trim deltaE00 ${report.identity.own_delta_e} vs ${parsed.vi}.`
        : 'automated C1-C4/C8 only; C5-C7, C9-C13 require ViCanon review.',
    },
    supersedes: options.supersedes || null,
  };
}

function buildManifestEntry(filePath, pngBytes, parsed, canon, sidecar) {
  const name = path.basename(filePath);
  const viName = parsed.vi.charAt(0).toUpperCase() + parsed.vi.slice(1);
  return {
    asset_id: parsed.assetId,
    vi: parsed.vi,
    type: parsed.type,
    slot: parsed.slot,
    version: parsed.version,
    // A candidate is never "published" from the tool: ViCanon review plus
    // owner approval flip the status later. Automated failures keep the
    // same marker and add failed_items to the sidecar.
    status: 'needs-regen',
    url: `${ASSET_BASE_URL}/${parsed.vi}/${parsed.type}/${name}`,
    key: `vi/${parsed.vi}/${parsed.type}/${name}`,
    sha256: sidecar.sha256,
    bytes: pngBytes.length,
    width: sidecar.width,
    height: sidecar.height,
    mode: sidecar.mode,
    canon_version: canon.palette.canon_version,
    palette_sha256: canon.paletteSha256,
    alt: `${viName}, ${parsed.slot}`,
    created_at: sidecar.created_at,
    approved_at: null,
    supersedes: sidecar.supersedes,
    legacy_alias: sidecar.legacy_alias || null,
  };
}

function parseOptions(argv) {
  const options = { reference: [] };
  const positional = [];
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const next = () => {
      i += 1;
      if (i >= argv.length) throw new Error(`missing value for ${arg}`);
      return argv[i];
    };
    if (arg === '--tool') options.tool = next();
    else if (arg === '--model') options.model = next();
    else if (arg === '--seed') options.seed = Number.parseInt(next(), 10);
    else if (arg === '--prompt') options.prompt = next();
    else if (arg === '--negative') options.negative = next();
    else if (arg === '--reference') options.reference.push(next());
    else if (arg === '--run-id') options.runId = next();
    else if (arg === '--created-by') options.createdBy = next();
    else if (arg === '--created-at') options.createdAt = next();
    else if (arg === '--supersedes') options.supersedes = next();
    else if (arg === '--legacy-alias') options.legacyAlias = next();
    else if (arg === '--out') options.out = next();
    else if (arg.startsWith('--')) throw new Error(`unknown option ${arg}`);
    else positional.push(arg);
  }
  options.positional = positional;
  return options;
}

function usage() {
  return [
    'usage:',
    '  node scripts/canon-tool.js check <file.png> [...]',
    '  node scripts/canon-tool.js sidecar <file.png> --tool t --model m --prompt p --negative n [options]',
  ].join('\n');
}

function main(argv) {
  const command = argv[0];
  if (!command || command === '--help' || command === '-h') {
    process.stdout.write(`${usage()}\n`);
    return 0;
  }
  let options;
  try {
    options = parseOptions(argv.slice(1));
  } catch (err) {
    process.stderr.write(`${err.message}\n${usage()}\n`);
    return 2;
  }
  const files = options.positional;
  if (files.length === 0) {
    process.stderr.write(`${usage()}\n`);
    return 2;
  }

  const canon = loadCanon();
  const reports = [];
  for (const file of files) {
    const full = path.resolve(file);
    if (!fs.existsSync(full)) {
      reports.push({ file, ok: false, checks: { C0: { ok: false, detail: 'file not found' } }, swatches: {}, identity: null });
      continue;
    }
    reports.push(checkOne(full, canon, listSiblingPngs(full)));
  }

  if (command === 'check') {
    for (const report of reports) {
      const lines = Object.entries(report.checks).map(([id, check]) => `  ${id}: ${check.ok ? 'pass' : 'FAIL'} — ${check.detail}`);
      process.stdout.write(`${report.file}: ${report.ok ? 'pass' : 'FAIL'}\n${lines.join('\n')}\n`);
    }
    const summary = reports.map((report) => ({
      file: report.file,
      ok: report.ok,
      asset_id: parseCanonFilename(report.file) ? parseCanonFilename(report.file).assetId : null,
      checks: report.checks,
      swatches: report.swatches,
      identity: report.identity,
    }));
    process.stdout.write(`${JSON.stringify({ ok: reports.every((r) => r.ok), files: summary }, null, 2)}\n`);
    return reports.every((r) => r.ok) ? 0 : 1;
  }

  if (command === 'sidecar') {
    if (files.length !== 1) {
      process.stderr.write('sidecar takes exactly one PNG\n');
      return 2;
    }
    for (const field of ['tool', 'model', 'prompt', 'negative']) {
      if (!options[field]) {
        process.stderr.write(`sidecar requires --${field}\n`);
        return 2;
      }
    }
    const report = reports[0];
    const full = path.resolve(files[0]);
    if (!report.ok) {
      const lines = Object.entries(report.checks).map(([id, check]) => `  ${id}: ${check.ok ? 'pass' : 'FAIL'} — ${check.detail}`);
      process.stderr.write(`automated checks failed; sidecar not written\n${lines.join('\n')}\n`);
      return 1;
    }
    const pngBytes = fs.readFileSync(full);
    const parsed = parseCanonFilename(path.basename(full));
    const c2 = checkSidecar(full, pngBytes, parsed, canon);
    const sidecar = buildSidecar(full, pngBytes, parsed, canon, report, options);
    if (options.legacyAlias) sidecar.legacy_alias = options.legacyAlias;
    const schemaErrors = validate(canon.schema, canon.schema.$defs.sidecar, sidecar, 'sidecar');
    if (schemaErrors.length) {
      process.stderr.write(`generated sidecar does not validate: ${schemaErrors.join('; ')}\n`);
      return 1;
    }
    const entry = buildManifestEntry(full, pngBytes, parsed, canon, sidecar);
    const entryErrors = validate(canon.schema, canon.schema.$defs.manifestEntry, entry, 'entry');
    if (entryErrors.length) {
      process.stderr.write(`generated manifest entry does not validate: ${entryErrors.join('; ')}\n`);
      return 1;
    }
    const outPath = options.out || full.replace(/\.png$/, '.sidecar.json');
    fs.writeFileSync(outPath, `${JSON.stringify(sidecar, null, 2)}\n`);
    process.stdout.write(`${outPath}\n${JSON.stringify({ sidecar, manifestEntry: entry }, null, 2)}\n`);
    if (!c2.ok) process.stderr.write(`warning: existing sidecar failed C2: ${c2.detail}\n`);
    return 0;
  }

  process.stderr.write(`unknown command ${command}\n${usage()}\n`);
  return 2;
}

if (require.main === module) {
  process.exit(main(process.argv.slice(2)));
}

module.exports = { checkOne, loadCanon, parseOptions, buildSidecar, buildManifestEntry };
