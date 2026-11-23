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

test('check_contrast evaluates chat OKLCH tokens against the existing text matrix', async () => {
  const result = await client.callTool({
    name: 'check_contrast',
    arguments: { foreground: 'colors.text-content-secondary-light', background: 'colors.surface-chat-composer-light' },
  });
  assert.notEqual(result.isError, true, result.content[0].text);
  const report = JSON.parse(result.content[0].text);
  assert.match(report.background, /^oklch\(/);
  assert.ok(report.ratio >= 4.5);
  assert.equal(report.aa.text, true);
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

test('memory_field renders the synthetic sample with its text equivalent and a passing report', async () => {
  const result = await client.callTool({ name: 'memory_field', arguments: { theme: 'light' } });
  assert.notEqual(result.isError, true, result.content[0].text);
  const body = JSON.parse(result.content[0].text);
  assert.equal(body.synthetic, true);
  assert.equal(body.report.theme, 'light');
  assert.equal(body.report.pass, true);
  assert.match(body.svg, /^<svg class="vi-mf"/);
  assert.match(body.table, /^<ul class="vi-mf-table"/);
  assert.equal(body.stylesheet, 'dist/memory-field.css');
});

test('memory_field refuses invalid data with a typed error', async () => {
  const data = { nodes: [{ id: 'a', label: 'a', class: 'gossip' }], edges: [] };
  const result = await client.callTool({ name: 'memory_field', arguments: { data } });
  assert.equal(result.isError, true);
  assert.match(result.content[0].text, /MEMORY_FIELD_INVALID/);
});

test('component_catalog lists matching entries by consumer without html by default', async () => {
  const { tools } = await client.listTools();
  assert.ok(tools.some((t) => t.name === 'component_catalog'));

  const bloomRes = await client.callTool({
    name: 'component_catalog',
    arguments: { consumer: 'bloom' },
  });
  assert.notEqual(bloomRes.isError, true, bloomRes.content[0].text);
  const bloomBody = JSON.parse(bloomRes.content[0].text);
  assert.ok(bloomBody.count > 0);
  assert.deepEqual(bloomBody.categories, [
    'ui-primitives',
    'markdown-and-code',
    'graphic-maps',
    'persona-canon',
    'conversation',
    'agent-workspace',
    'harness-contracts',
    'public-continuity',
    'design-studio',
  ]);
  assert.ok(bloomBody.components.some((c) => c.id === 'layout-agent-workspace'));
  for (const item of bloomBody.components) {
    assert.ok(item.consumers.includes('bloom'), `expected bloom consumer on ${item.id}`);
    assert.equal(item.html, undefined, `html should be omitted by default for ${item.id}`);
  }

  const siteRes = await client.callTool({
    name: 'component_catalog',
    arguments: { consumer: 'vidoxlabs.dev' },
  });
  assert.notEqual(siteRes.isError, true, siteRes.content[0].text);
  const siteIds = JSON.parse(siteRes.content[0].text).components.map((c) => c.id);
  assert.ok(siteIds.includes('public-repo-card'));
  assert.ok(siteIds.includes('ecosystem-plane-map'));
  assert.ok(siteIds.includes('site-header-island'));
  assert.ok(siteIds.includes('hero-billboard'));
  assert.ok(siteIds.includes('systems-constellation-map'));
  assert.ok(siteIds.includes('markdown-prose-renderer'));

  const contractsRes = await client.callTool({
    name: 'component_catalog',
    arguments: { category: 'harness-contracts' },
  });
  assert.notEqual(contractsRes.isError, true, contractsRes.content[0].text);
  const contractsBody = JSON.parse(contractsRes.content[0].text);
  assert.deepEqual(
    contractsBody.components.map((c) => c.id),
    ['claim-maturity-badge', 'run-lifecycle-strip', 'tool-registry-row', 'browser-check-runner', 'instrument', 'statement-proof-row', 'credential-activity-ledger', 'policy-rule-matrix', 'provider-model-selector', 'locked-panel'],
  );

  const mdCodeRes = await client.callTool({
    name: 'component_catalog',
    arguments: { category: 'markdown-and-code' },
  });
  assert.notEqual(mdCodeRes.isError, true, mdCodeRes.content[0].text);
  assert.deepEqual(
    JSON.parse(mdCodeRes.content[0].text).components.map((c) => c.id),
    ['markdown-prose-renderer', 'code-and-diff-viewer', 'docs-code-tabs', 'log-stream-viewer', 'api-reference-row', 'changelog-timeline'],
  );

  const uiRes = await client.callTool({
    name: 'component_catalog',
    arguments: { category: 'ui-primitives' },
  });
  assert.notEqual(uiRes.isError, true, uiRes.content[0].text);
  assert.deepEqual(
    JSON.parse(uiRes.content[0].text).components.map((c) => c.id),
    ['form-controls', 'button-variants', 'navigation-primitives', 'feedback-and-empty-states', 'disclosure-and-modals', 'data-table', 'command-palette-dialog', 'file-dropzone-upload', 'kpi-metric-strip', 'drawer-inspector-sheet', 'skeleton-row', 'toast-notification-stack', 'multi-step-stepper', 'search-and-filter-bar'],
  );

  assert.ok(siteIds.includes('api-reference-row'));
  assert.ok(siteIds.includes('article-toc-and-meta'));
  assert.ok(siteIds.includes('kpi-metric-strip'));
});

test('component_catalog fetches a single component with html and rejects unknown ids', async () => {
  const found = await client.callTool({
    name: 'component_catalog',
    arguments: { name: 'owner-approval-gate' },
  });
  assert.notEqual(found.isError, true, found.content[0].text);
  const body = JSON.parse(found.content[0].text);
  assert.equal(body.id, 'owner-approval-gate');
  assert.equal(body.file, 'preview/owner-approval-gate.html');
  assert.equal(body.uri, 'file://preview/owner-approval-gate.html');
  assert.equal(body.adr, 'ADR-021');
  assert.match(body.html, /Approval needed/);

  const normalized = await client.callTool({
    name: 'component_catalog',
    arguments: { name: 'preview/owner-approval-gate.html', includeHtml: false },
  });
  assert.notEqual(normalized.isError, true, normalized.content[0].text);
  const normalizedBody = JSON.parse(normalized.content[0].text);
  assert.equal(normalizedBody.id, 'owner-approval-gate');
  assert.equal(normalizedBody.html, undefined);

  const fallback = await client.callTool({
    name: 'component_catalog',
    arguments: { name: 'island-nav' },
  });
  assert.notEqual(fallback.isError, true, fallback.content[0].text);
  const fallbackBody = JSON.parse(fallback.content[0].text);
  assert.equal(fallbackBody.id, 'island-nav');
  assert.equal(fallbackBody.uri, 'file://preview/island-nav.html');
  assert.match(fallbackBody.html, /vi-glass-shell/);

  const missing = await client.callTool({
    name: 'component_catalog',
    arguments: { name: 'does-not-exist' },
  });
  assert.equal(missing.isError, true);
  assert.match(missing.content[0].text, /not found/i);
});

test('design_brief and scaffold_page tools plus components.manifest.json work over MCP', async () => {
  const { tools } = await client.listTools();
  assert.ok(tools.some((t) => t.name === 'design_brief'));
  assert.ok(tools.some((t) => t.name === 'scaffold_page'));

  const manifestRes = await client.readResource({ uri: 'file://dist/components.manifest.json' });
  const manifest = JSON.parse(manifestRes.contents[0].text);
  assert.equal(manifest.componentCount, 94);
  assert.ok(manifest.archetypes['public-site-landing']);
  assert.ok(manifest.archetypes['docs-portal']);
  assert.ok(manifest.archetypes['settings-workspace']);
  assert.ok(manifest.archetypes['workspace-library']);
  assert.ok(manifest.archetypes['ui-primitives-kitchen-sink']);

  const briefRes = await client.callTool({
    name: 'design_brief',
    arguments: { archetype: 'tool-and-skill-catalog', framework: 'nextjs', theme: 'light', variance: 6, motion: 4 },
  });
  assert.notEqual(briefRes.isError, true, briefRes.content[0].text);
  const brief = JSON.parse(briefRes.content[0].text);
  assert.equal(brief.archetype, 'tool-and-skill-catalog');
  assert.equal(brief.framework, 'nextjs');
  assert.equal(brief.theme, 'light');
  assert.match(brief.designRead, /^Reading this as: tool-and-skill-catalog/);
  assert.deepEqual(brief.dials, { variance: 6, motion: 4, visualDensity: 5 });
  assert.ok(Array.isArray(brief.preFlightChecklist) && brief.preFlightChecklist.length >= 8);
  assert.ok(brief.referenceContract.keep.length > 0);
  assert.ok(brief.referenceContract.change.length > 0);
  assert.ok(brief.referenceContract.doNotCopy.length > 0);

  const scaffoldRes = await client.callTool({
    name: 'scaffold_page',
    arguments: { archetype: 'public-site-landing', framework: 'react', title: 'Vidoxlabs — Rebuilt' },
  });
  assert.notEqual(scaffoldRes.isError, true, scaffoldRes.content[0].text);
  const scaffold = JSON.parse(scaffoldRes.content[0].text);
  assert.equal(scaffold.title, 'Vidoxlabs — Rebuilt');
  assert.ok(scaffold.stylesheets.includes('dist/glass.css'));
  assert.match(scaffold.html, /<!DOCTYPE html>/);
  assert.match(scaffold.html, /<!-- slot:1:site-header-island/);
  assert.match(scaffold.html, /<!-- slot:9:site-footer/);

  const badScaffold = await client.callTool({
    name: 'scaffold_page',
    arguments: { archetype: 'nonexistent-archetype' },
  });
  assert.equal(badScaffold.isError, true);
  assert.match(badScaffold.content[0].text, /UNKNOWN_ARCHETYPE/);
});
