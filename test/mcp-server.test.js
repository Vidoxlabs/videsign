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
  assert.equal(result.content[0].text, 'colors.persona-accent-xylia-base = #2DD4BF');
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

test('reading an unknown resource is rejected', async () => {
  await assert.rejects(
    client.readResource({ uri: 'file://preview/does-not-exist.html' }),
    /Resource not found/,
  );
});
