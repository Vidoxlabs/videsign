#!/usr/bin/env node

/**
 * videsign MCP Server (Read-Only)
 *
 * Exposes DESIGN.md, SKILL.md, and all preview/ HTML fragments as read-only
 * resources to AI agents in product repositories. Fragments are auto-discovered
 * at startup — no manual resource list to maintain.
 */

const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema
} = require('@modelcontextprotocol/sdk/types.js');
const fs = require('fs');
const path = require('path');

// --- Resource discovery -------------------------------------------------

/** Markdown documents served alongside the preview fragments. */
const MD_RESOURCES = [
  { file: 'DESIGN.md', name: 'Design System Source of Truth', description: 'Semantic token matrix (category-role-variant-state) and negative UI boundaries.' },
  { file: 'SKILL.md', name: 'Decision Ledger and ADRs', description: 'Architectural decision records and agent generation guardrails.' },
];

/** Title-case a kebab-case filename into a human-readable resource name. */
function kebabToTitle(name) {
  return name
    .replace(/\.html$/, '')
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

/** Discover all .html files in preview/ and build resource descriptors. */
function discoverPreviewFragments() {
  const previewDir = path.join(__dirname, 'preview');
  const files = fs
    .readdirSync(previewDir)
    .filter((f) => f.endsWith('.html'))
    .sort();

  return files.map((file) => ({
    uri: `file://preview/${file}`,
    name: `${kebabToTitle(file)} Fragment`,
    mimeType: 'text/html',
    description: `Pure HTML fragment for ${kebabToTitle(file).toLowerCase()}.`,
    file,
  }));
}

/** Build the complete resource list: markdown docs + preview fragments. */
function buildResourceList() {
  const mdResources = MD_RESOURCES.map((r) => ({
    uri: `file://${r.file}`,
    name: r.name,
    mimeType: 'text/markdown',
    description: r.description,
    file: r.file,
  }));

  const previewResources = discoverPreviewFragments();

  return [...mdResources, ...previewResources];
}

// --- Server setup -------------------------------------------------------

const RESOURCES = buildResourceList();

const server = new Server({
  name: 'videsign-mcp-server',
  version: '1.0.0',
}, {
  capabilities: {
    resources: {},
    tools: {},
  },
});

// --- List Resources -----------------------------------------------------

server.setRequestHandler(ListResourcesRequestSchema, async () => {
  return {
    resources: RESOURCES.map(({ uri, name, mimeType, description }) => ({
      uri,
      name,
      mimeType,
      description,
    })),
  };
});

// --- Read Resource ------------------------------------------------------

server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const resource = RESOURCES.find((r) => r.uri === request.uri);
  if (!resource) {
    throw new Error('Resource not found');
  }

  let filePath;
  let mimeType;

  if (resource.uri.startsWith('file://preview/')) {
    filePath = path.join(__dirname, 'preview', resource.file);
    mimeType = 'text/html';
  } else {
    filePath = path.join(__dirname, resource.file);
    mimeType = 'text/markdown';
  }

  const content = fs.readFileSync(filePath, 'utf-8');

  return {
    contents: [{
      uri: request.uri,
      mimeType,
      text: content,
    }],
  };
});

// --- Transport ----------------------------------------------------------

const transport = new StdioServerTransport();
server.connect(transport).then(() => {
  console.error(`videsign MCP Server running on stdio (${RESOURCES.length} resources)`);
}).catch(console.error);
