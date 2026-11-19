/**
 * Platform token contract (ADR-014): every DESIGN.md token reaches every platform output with the
 * same value, or is listed as CSS-only. Python and TypeScript outputs are executed, not just read.
 */

const { test, before } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const { parseFrontMatter } = require('../scripts/generate-tokens');
const { classify, flattenTokens, camel } = require('../scripts/lib/token-values');
const { emitPlatformArtifacts } = require('../scripts/generate-platforms');

const ROOT = path.join(__dirname, '..');
const TOKENS = parseFrontMatter(fs.readFileSync(path.join(ROOT, 'DESIGN.md'), 'utf-8'));
const FLAT = flattenTokens(TOKENS);
const OUT = emitPlatformArtifacts(TOKENS);
const CSS_ONLY_KINDS = new Set(['css']);

before(() => {
  execFileSync(process.execPath, [path.join(ROOT, 'scripts', 'generate-tokens.js')], { cwd: ROOT, stdio: 'ignore' });
});

// --- Classification -----------------------------------------------------------------

test('the classifier reads every value form DESIGN.md uses', () => {
  assert.deepEqual(classify('#8b5cf6'), { kind: 'color', hex: '#8B5CF6', rgb: [139, 92, 246], alpha: 1 });
  assert.deepEqual(classify('rgba(124, 58, 237, 0.30)'), { kind: 'color', hex: '#7C3AED', rgb: [124, 58, 237], alpha: 0.3 });
  assert.deepEqual(classify('0.75rem'), { kind: 'dimension', value: 0.75, unit: 'rem', points: 12 });
  assert.deepEqual(classify('150ms'), { kind: 'duration', value: 150, unit: 'ms', seconds: 0.15 });
  assert.deepEqual(classify('cubic-bezier(0.16, 1, 0.3, 1)'), { kind: 'cubicBezier', points: [0.16, 1, 0.3, 1] });
  assert.equal(classify('600', 'typography-weight-semibold-base').kind, 'fontWeight');
  assert.equal(classify('1.5', 'typography-leading-normal-base').kind, 'number');
  assert.deepEqual(classify('-0.02em'), { kind: 'em', value: -0.02 });
  assert.deepEqual(classify('clamp(2.75rem, 6vw + 0.5rem, 5.25rem)').max, { value: 5.25, unit: 'rem', points: 84 });
  assert.equal(classify('blur(14px) brightness(0.5)').kind, 'css');
  // Every token in DESIGN.md resolves to a kind; nothing is silently dropped.
  for (const t of FLAT) assert.ok(t.value.kind, `${t.category}.${t.key}`);
});

test('generation is deterministic and carries no timestamp', () => {
  assert.deepEqual(emitPlatformArtifacts(TOKENS), OUT);
  for (const [file, text] of Object.entries(OUT)) {
    assert.doesNotMatch(text, /\b20\d\d-\d\d-\d\dT/, file);
    assert.equal(fs.readFileSync(path.join(ROOT, 'dist', file), 'utf-8'), text, `dist/${file} is stale`);
  }
});

// --- TypeScript ------------------------------------------------------------------------

test('tokens.ts runs, holds every raw value and maps every CSS variable', () => {
  const script = [
    `const m = await import(${JSON.stringify(path.join(ROOT, 'dist', 'tokens.ts'))});`,
    'process.stdout.write(JSON.stringify({ tokens: m.tokens, cssVar: m.cssVar, probe: m.token("colors.persona-accent-xylia-base") }));',
  ].join('\n');
  const stdout = execFileSync(process.execPath, ['--experimental-strip-types', '--no-warnings', '--input-type=module', '-e', script], { cwd: ROOT }).toString();
  const loaded = JSON.parse(stdout);
  assert.deepEqual(loaded.tokens, JSON.parse(JSON.stringify(TOKENS)));
  for (const t of FLAT) assert.equal(loaded.cssVar[t.category][t.key], `var(${t.cssVar})`);
  assert.equal(loaded.probe, TOKENS.colors['persona-accent-xylia-base']);
});

// --- Python ----------------------------------------------------------------------------

test('videsign_tokens.py imports in isolation and matches every converted value', () => {
  const code = [
    'import importlib.util, json, sys',
    'spec = importlib.util.spec_from_file_location("videsign_tokens", sys.argv[1])',
    'm = importlib.util.module_from_spec(spec); spec.loader.exec_module(m)',
    'out = {}',
    'for cat, mapping in m.TOKENS.items():',
    '    for key, value in mapping.items():',
    '        if isinstance(value, m.Rgba): value = {"rgba": list(value)}',
    '        elif isinstance(value, m.Fluid): value = {"fluid": list(value)}',
    '        elif isinstance(value, tuple): value = list(value)',
    '        out[cat + "." + key] = value',
    'try:',
    '    m.TOKENS["colors"]["x"] = "#000000"',
    '    out["__writable__"] = True',
    'except TypeError:',
    '    out["__writable__"] = False',
    'print(json.dumps(out))',
  ].join('\n');
  const loaded = JSON.parse(execFileSync('python3', ['-I', '-B', '-c', code, path.join(ROOT, 'dist', 'videsign_tokens.py')]).toString());
  assert.equal(loaded.__writable__, false, 'mappings must be read-only');
  for (const t of FLAT) {
    const got = loaded[`${t.category}.${t.key}`];
    const v = t.value;
    const id = `${t.category}.${t.key}`;
    if (v.kind === 'color') assert.deepEqual(got, v.alpha === 1 ? v.hex : { rgba: [...v.rgb, v.alpha] }, id);
    else if (v.kind === 'dimension') assert.equal(got, v.points, id);
    else if (v.kind === 'duration') assert.equal(got, v.seconds, id);
    else if (v.kind === 'cubicBezier') assert.deepEqual(got, v.points, id);
    else if (v.kind === 'fluid') assert.deepEqual(got, { fluid: [v.min.points, v.max.points] }, id);
    else if (v.kind === 'fontFamily') assert.deepEqual(got, v.families, id);
    else if (v.kind === 'css') assert.equal(got, v.css, id);
    else assert.equal(got, v.value, id);
  }
});

// --- Swift -------------------------------------------------------------------------------

test('ViTokens.swift declares every convertible token once, with the same value', () => {
  const swift = OUT['ViTokens.swift'];
  const declared = [...swift.matchAll(/public static let (\w+) = (.+)$/gm)];
  const names = declared.map((m) => m[1]);
  assert.equal(new Set(names).size, names.length, 'duplicate Swift identifiers');
  const byName = new Map(declared.map((m) => [m[1], m[2]]));
  const cssOnly = [];
  for (const t of FLAT) {
    if (CSS_ONLY_KINDS.has(t.value.kind)) {
      cssOnly.push(`${t.category}.${t.key}`);
      assert.equal(byName.has(camel(t.key)) && byName.get(camel(t.key)).includes(t.raw), false);
      continue;
    }
    const value = byName.get(camel(t.key));
    assert.ok(value, `missing ${t.category}.${t.key}`);
    if (t.value.kind === 'color') {
      assert.ok(value.startsWith(`Color(viHex: 0x${t.value.hex.slice(1)}`), `${t.key}: ${value}`);
      if (t.value.alpha !== 1) assert.ok(value.includes(`opacity: ${t.value.alpha}`), value);
    }
    if (t.value.kind === 'dimension') assert.equal(value, `CGFloat(${t.value.points})`);
    if (t.value.kind === 'duration') assert.equal(value, `TimeInterval(${t.value.seconds})`);
  }
  assert.match(swift, new RegExp(`CSS-only, not converted: ${cssOnly.join(', ').replace(/\./g, '\\.')}`));
  // Structure: braces balance, one import, no force unwraps or Objective-C bridging.
  assert.equal((swift.match(/\{/g) || []).length, (swift.match(/\}/g) || []).length);
  assert.equal((swift.match(/^import /gm) || []).length, 1);
  assert.doesNotMatch(swift, /!\s*$|@objc|NSColor|UIColor/m);
});

// --- DTCG --------------------------------------------------------------------------------

test('tokens.dtcg.json follows DTCG 2025.10 shapes and lists what it cannot type', () => {
  const doc = JSON.parse(OUT['tokens.dtcg.json']);
  const types = new Set(['color', 'dimension', 'duration', 'cubicBezier', 'fontFamily', 'fontWeight', 'number']);
  const cssOnly = doc.$extensions['dev.vidoxlabs.videsign'].cssOnly;
  for (const t of FLAT) {
    const id = `${t.category}.${t.key}`;
    const entry = doc[t.category]?.[t.key];
    if (!entry) {
      assert.equal(cssOnly[id], t.raw, `${id} is neither typed nor listed as CSS-only`);
      continue;
    }
    assert.ok(types.has(entry.$type), `${id}: ${entry.$type}`);
    if (entry.$type === 'color') {
      assert.equal(entry.$value.colorSpace, 'srgb');
      assert.equal(entry.$value.components.length, 3);
      assert.ok(entry.$value.components.every((c) => c >= 0 && c <= 1));
      assert.match(entry.$value.hex, /^#[0-9A-F]{6}$/);
    }
    if (entry.$type === 'dimension') assert.ok(['px', 'rem'].includes(entry.$value.unit), id);
    if (entry.$type === 'duration') assert.ok(['ms', 's'].includes(entry.$value.unit), id);
    if (entry.$type === 'cubicBezier') {
      assert.equal(entry.$value.length, 4);
      assert.ok(entry.$value[0] >= 0 && entry.$value[0] <= 1 && entry.$value[2] >= 0 && entry.$value[2] <= 1, id);
    }
  }
  // Persona accents survive the round trip exactly.
  for (const persona of ['violet', 'wisteria', 'xylia', 'yarrow', 'zinnia']) {
    assert.equal(doc.colors[`persona-accent-${persona}-base`].$value.hex, TOKENS.colors[`persona-accent-${persona}-base`]);
  }
});
