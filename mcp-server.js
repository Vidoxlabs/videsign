#!/usr/bin/env node

/**
 * videsign MCP Server (Read-Only)
 *
 * Exposes DESIGN.md, SKILL.md, and all preview/ HTML fragments as read-only
 * resources to AI agents in product repositories. Fragments are auto-discovered
 * at startup — no manual resource list to maintain.
 *
 * Also provides a `resolve_token` tool so agents can query individual token
 * values without parsing the entire DESIGN.md.
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

// Load token data at startup for the resolve_token tool
const { parseFrontMatter } = require('./scripts/generate-tokens');
const DESIGN_CONTENT = fs.readFileSync(path.join(__dirname, 'DESIGN.md'), 'utf-8');
const TOKENS = parseFrontMatter(DESIGN_CONTENT);

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

// --- List Tools ---------------------------------------------------------

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'resolve_token',
        description: 'Resolve a single design token by its full path (e.g., "colors.surface-background-primary-base"). Returns the raw value. Use this instead of reading the entire DESIGN.md when you only need one token.',
        inputSchema: {
          type: 'object',
          properties: {
            path: {
              type: 'string',
              description: 'The token path in dot notation: category.key (e.g., "colors.surface-background-primary-base")',
            },
          },
          required: ['path'],
        },
      },
    ],
  };
});

// --- Call Tool ----------------------------------------------------------

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (request.name === 'resolve_token') {
    const tokenPath = request.arguments?.path;
    if (!tokenPath) {
      return {
        content: [{ type: 'text', text: 'Error: "path" argument is required.' }],
        isError: true,
      };
    }

    const parts = tokenPath.split('.');
    if (parts.length < 2) {
      return {
        content: [{ type: 'text', text: `Error: path must be in "category.key" format (got "${tokenPath}").` }],
        isError: true,
      };
    }

    const [category, ...keyParts] = parts;
    const key = keyParts.join('.');
    const categoryTokens = TOKENS[category];

    if (!categoryTokens) {
      return {
        content: [{ type: 'text', text: `Error: category "${category}" not found. Available: ${Object.keys(TOKENS).join(', ')}.` }],
        isError: true,
      };
    }

    const value = categoryTokens[key];
    if (value === undefined) {
      const availableKeys = Object.keys(categoryTokens).join(', ');
      return {
        content: [{ type: 'text', text: `Error: token "${key}" not found in "${category}". Available: ${availableKeys}.` }],
        isError: true,
      };
    }

    return {
      content: [{ type: 'text', text: `${tokenPath} = ${value}` }],
    };
  }

  return {
    content: [{ type: 'text', text: `Error: unknown tool "${request.name}".` }],
    isError: true,
  };
});

// --- Transport ----------------------------------------------------------

const transport = new StdioServerTransport();
server.connect(transport).then(() => {
  console.error(`videsign MCP Server running on stdio (${RESOURCES.length} resources)`);
}).catch(console.error);
