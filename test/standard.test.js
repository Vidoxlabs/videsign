/**
 * Agent standard contract: dist/standard.json and dist/standard.md are
 * deterministic digests of DESIGN.md + SKILL.md (addendum §2).
 */

const { test, before } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const {
  parseFrontMatter,
} = require('../scripts/generate-tokens');
const {
  generateStandardArtifacts,
  parseAdrIndex,
} = require('../scripts/generate-standard');

const ROOT = path.join(__dirname, '..');
const DESIGN = fs.readFileSync(path.join(ROOT, 'DESIGN.md'), 'utf-8');
const SKILL = fs.readFileSync(path.join(ROOT, 'SKILL.md'), 'utf-8');
const TOKENS = parseFrontMatter(DESIGN);

before(() => {
  execFileSync(process.execPath, [path.join(ROOT, 'scripts', 'generate-tokens.js')], {
    cwd: ROOT,
    stdio: 'ignore',
  });
});

test('ADR index includes crystal glass through spacing rhythm', () => {
  const ids = parseAdrIndex(SKILL).map((a) => a.id);
  for (const id of ['ADR-006', 'ADR-007', 'ADR-008', 'ADR-009']) {
    assert.ok(ids.includes(id), `missing ${id}`);
  }
});

test('standard.json carries tokens, rules and ADR index', () => {
  const { standard } = generateStandardArtifacts(TOKENS);
  assert.equal(standard.meta.designSystem, 'Nocturne Museum');
  assert.equal(standard.rules.glass.material, 'crystal');
  assert.equal(standard.rules.typography.sentenceCase, true);
  assert.equal(standard.rules.typography.banUppercaseUtility, true);
  assert.equal(standard.rules.spacing.rhythmBasePx, 4);
  assert.ok(standard.tokens.typography['typography-weight-medium-base']);
  assert.ok(standard.adrs.some((a) => a.id === 'ADR-009'));
});

test('npm run tokens writes deterministic standard artifacts', () => {
  const a = {
    json: fs.readFileSync(path.join(ROOT, 'dist', 'standard.json'), 'utf-8'),
    md: fs.readFileSync(path.join(ROOT, 'dist', 'standard.md'), 'utf-8'),
  };
  execFileSync(process.execPath, [path.join(ROOT, 'scripts', 'generate-tokens.js')], {
    cwd: ROOT,
    stdio: 'ignore',
  });
  const b = {
    json: fs.readFileSync(path.join(ROOT, 'dist', 'standard.json'), 'utf-8'),
    md: fs.readFileSync(path.join(ROOT, 'dist', 'standard.md'), 'utf-8'),
  };
  assert.equal(a.json, b.json);
  assert.equal(a.md, b.md);
  assert.match(a.md, /Spacing rhythm \(ADR-009\)/);
  assert.match(a.json, /"banLegacyUtilities"/);
});

test('MCP resource list includes the generated standard when present', () => {
  // Light structural check: mcp-server registers STANDARD_RESOURCES paths.
  const src = fs.readFileSync(path.join(ROOT, 'mcp-server.js'), 'utf-8');
  assert.match(src, /dist\/standard\.json/);
  assert.match(src, /dist\/standard\.md/);
});
