/**
 * Stdio smoke test for the videsign MCP server.
 *
 * Spawns mcp-server.js exactly as consuming repos do (`node mcp-server.js`)
 * and drives it through the SDK client, so a regression in request handling
 * fails here rather than in another repository's agent session.
 */

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const { Client } = require('@modelcontextprotocol/sdk/client');
const { StdioClientTransport } = require('@modelcontextprotocol/sdk/client/stdio.js');

let client;

before(async () => {
  client = new Client({ name: 'videsign-smoke-test', version: '1.0.0' });
  await client.connect(new StdioClientTransport({
    command: process.execPath,
    args: [path.join(__dirname, '..', 'mcp-server.js')],
    stderr: 'ignore',
  }));
});

after(async () => {
  await client.close();
});

test('resolve_token returns a locked persona accent', async () => {
  const result = await client.callTool({
    name: 'resolve_token',
    arguments: { path: 'colors.persona-accent-xylia-base' },
  });

  assert.notEqual(result.isError, true, result.content[0].text);
  assert.equal(result.content[0].text, 'colors.persona-accent-xylia-base = #D92B3A');
});

test('resolve_token reports an unknown token as an error', async () => {
  const result = await client.callTool({
    name: 'resolve_token',
    arguments: { path: 'colors.persona-accent-unknown-base' },
  });

  assert.equal(result.isError, true);
  assert.match(result.content[0].text, /token "persona-accent-unknown-base" not found in "colors"/);
});

test('reading a preview fragment returns its HTML', async () => {
  const result = await client.readResource({ uri: 'file://preview/persona-console.html' });

  assert.equal(result.contents[0].uri, 'file://preview/persona-console.html');
  assert.equal(result.contents[0].mimeType, 'text/html');
  assert.match(result.contents[0].text, /Sovereign persona console/);
});

test('reading DESIGN.md returns the token matrix', async () => {
  const result = await client.readResource({ uri: 'file://DESIGN.md' });

  assert.equal(result.contents[0].mimeType, 'text/markdown');
  assert.match(result.contents[0].text, /persona-accent-violet-base: "#8B5CF6"/);
});

test('reading the character palette returns canon JSON', async () => {
  const result = await client.readResource({ uri: 'file://canon/vwxyz/palette.json' });

  assert.equal(result.contents[0].uri, 'file://canon/vwxyz/palette.json');
  assert.equal(result.contents[0].mimeType, 'application/json');
  const palette = JSON.parse(result.contents[0].text);
  assert.equal(palette.canon_version, 'v1');
  assert.equal(palette.vi.violet.signature, '#8B5CF6');
  assert.equal(palette.vi.violet.anchor.asset_id, 'violet/sheet/anchor/v001');
  assert.equal(result.contents[0].text.includes(['drive', 'google', 'com'].join('.')), false);
});

test('the platform token outputs are served as resources', async () => {
  const { resources } = await client.listResources();
  const uris = resources.map((r) => r.uri);
  for (const file of ['dist/tokens.ts', 'dist/ViTokens.swift', 'dist/videsign_tokens.py', 'dist/tokens.dtcg.json']) {
    assert.ok(uris.includes(`file://${file}`), file);
  }
  const swift = await client.readResource({ uri: 'file://dist/ViTokens.swift' });
  assert.match(swift.contents[0].text, /public static let personaAccentXyliaBase = Color\(viHex: 0xD92B3A\)/);
});

test('reading an unknown resource is rejected', async () => {
  await assert.rejects(
    client.readResource({ uri: 'file://preview/does-not-exist.html' }),
    /Resource not found/,
  );
});

test('check_contrast resolves tokens and reports the AA levels', async () => {
  const result = await client.callTool({
    name: 'check_contrast',
    arguments: { foreground: 'colors.text-content-secondary-base', background: 'colors.surface-background-primary-base' },
  });
  assert.notEqual(result.isError, true, result.content[0].text);
  const body = JSON.parse(result.content[0].text);
  assert.equal(body.foreground, '#A1A1AA');
  assert.equal(body.ratio, 7.71);
  assert.deepEqual(body.aa, { text: true, largeText: true, nonText: true });
});

test('check_contrast rejects a colour it cannot resolve', async () => {
  const result = await client.callTool({ name: 'check_contrast', arguments: { foreground: 'red', background: '#000000' } });
  assert.equal(result.isError, true);
});

test('stage_backdrop returns the SVG and a passing ambient report', async () => {
  const result = await client.callTool({ name: 'stage_backdrop', arguments: { variant: 'ambient' } });
  assert.notEqual(result.isError, true, result.content[0].text);
  const body = JSON.parse(result.content[0].text);
  assert.equal(body.report.passes, true);
  assert.ok(body.maxSafeOpacity >= body.report.opacity);
  assert.match(body.svg, /^<svg class="stage stage--ambient"/);
  assert.equal(body.stylesheet, 'dist/stage.css');
});

test('stage_backdrop reports, without erroring, an opacity that fails the bound', async () => {
  const result = await client.callTool({ name: 'stage_backdrop', arguments: { variant: 'hero', includeSvg: false } });
  assert.notEqual(result.isError, true);
  const body = JSON.parse(result.content[0].text);
  assert.equal(body.report.passes, false);
  assert.equal(body.svg, undefined);
  const bad = await client.callTool({ name: 'stage_backdrop', arguments: { variant: 'hero', opacity: 2 } });
  assert.equal(bad.isError, true);
});
