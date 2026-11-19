/**
 * The SAFETY_SCAN_SHA256_LIST builder: hashes handles exactly as the scan does, never prints a
 * handle, and rejects input the scan could never match.
 */

const { test } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');
const path = require('path');
const { spawnSync } = require('child_process');

const { buildHashList } = require('../scripts/safety-hashes');

const SCRIPT = path.join(__dirname, '..', 'scripts', 'safety-hashes.js');
const SCAN = path.join(__dirname, '..', 'scripts', 'check-public-safety.js');
const sha = (s) => crypto.createHash('sha256').update(s).digest('hex');
// Fixture handles are assembled at runtime so no handle-shaped literal sits in the tree.
const ONE = ['sample', 'handle'].join('-');
const TWO = ['example', 'host'].join('.');

test('hashes lowercased handles, sorted and de-duplicated, ignoring comments and blanks', () => {
  const { list, count, problems } = buildHashList(`# operators\n${ONE.toUpperCase()}\n\n${TWO}\n${ONE}\n`);
  assert.deepEqual(problems, []);
  assert.equal(count, 2);
  assert.equal(list, [sha(ONE), sha(TWO)].sort().join(','));
});

test('rejects a line the scan could never match, and empty input', () => {
  assert.match(buildHashList('two words\n').problems[0], /line 1: one word/);
  assert.match(buildHashList('x\n').problems[0], /at least 2 characters/);
  assert.deepEqual(buildHashList('# only a comment\n').problems, ['no handles on stdin']);
});

test('the CLI never echoes a handle and its output is a list the scan accepts', () => {
  const run = spawnSync(process.execPath, [SCRIPT], { input: `${ONE}\n${TWO}\n` });
  assert.equal(run.status, 0, run.stderr.toString());
  const out = run.stdout.toString();
  const err = run.stderr.toString();
  for (const handle of [ONE, TWO]) assert.equal((out + err).includes(handle), false);
  const list = out.trim();
  assert.match(list, /^[0-9a-f]{64}(,[0-9a-f]{64})*$/);
  // The scan, given this list in CI mode, must accept the list's format (no "malformed").
  const scan = spawnSync(process.execPath, [SCAN, 'README.md'], { env: { ...process.env, CI: 'true', SAFETY_SCAN_SHA256_LIST: list } });
  assert.doesNotMatch(scan.stdout.toString() + scan.stderr.toString(), /malformed|unset or empty/);
  const bad = spawnSync(process.execPath, [SCRIPT], { input: 'two words\n' });
  assert.equal(bad.status, 1);
  assert.equal(bad.stdout.toString(), '');
});
