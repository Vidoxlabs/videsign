#!/usr/bin/env node

/**
 * videsign MCP Server (Read-Only Stub)
 * 
 * This server exposes the DESIGN.md tokens and preview/ fragments 
 * as read-only resources to AI agents in product repositories.
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

const server = new Server({
  name: 'videsign-mcp-server',
  version: '1.0.0',
}, {
  capabilities: {
    resources: {},
    tools: {},
  },
});

// Expose Resources
server.setRequestHandler(ListResourcesRequestSchema, async () => {
  return {
    resources: [
      {
        uri: 'file://DESIGN.md',
        name: 'Design System Source of Truth',
        mimeType: 'text/markdown',
        description: 'Contains the semantic token matrix and negative boundaries.',
      },
      {
        uri: 'file://preview/button.html',
        name: 'Button Component Fragment',
        mimeType: 'text/html',
        description: 'Pure HTML fragment for a button component.',
      },
      {
        uri: 'file://preview/stat-card.html',
        name: 'Stat Card Component Fragment',
        mimeType: 'text/html',
        description: 'Pure HTML fragment for a stat card component.',
      },
      {
        uri: 'file://preview/alert-banner.html',
        name: 'Alert Banner Component Fragment',
        mimeType: 'text/html',
        description: 'Pure HTML fragment for an alert banner component.',
      },
      {
        uri: 'file://SKILL.md',
        name: 'Decision Ledger and ADRs',
        mimeType: 'text/markdown',
        description: 'Contains workflow decisions, constraints, and ADR-008.',
      },
      {
        uri: 'file://preview/monitor-row.html',
        name: 'Monitor Row Component Fragment',
        mimeType: 'text/html',
        description: 'Pure HTML fragment for a monitor row component.',
      },
      {
        uri: 'file://preview/sidebar-nav.html',
        name: 'Sidebar Navigation Fragment',
        mimeType: 'text/html',
        description: 'Pure HTML fragment for the main sidebar navigation.',
      },
      {
        uri: 'file://preview/graph-canvas.html',
        name: 'Graph Canvas Fragment',
        mimeType: 'text/html',
        description: 'Pure HTML fragment for graph canvas.',
      },
      {
        uri: 'file://preview/graph-node.html',
        name: 'Graph Node Fragment',
        mimeType: 'text/html',
        description: 'Pure HTML fragment for graph node.',
      },
      {
        uri: 'file://preview/graph-edge.html',
        name: 'Graph Edge Fragment',
        mimeType: 'text/html',
        description: 'Pure HTML fragment for graph edge.',
      },
      {
        uri: 'file://preview/activity-feed.html',
        name: 'Activity Feed Fragment',
        mimeType: 'text/html',
        description: 'Pure HTML fragment for activity feed.',
      },
      {
        uri: 'file://preview/activity-item.html',
        name: 'Activity Item Fragment',
        mimeType: 'text/html',
        description: 'Pure HTML fragment for activity item.',
      },
      {
        uri: 'file://preview/data-table.html',
        name: 'Data Table Fragment',
        mimeType: 'text/html',
        description: 'Pure HTML fragment for data table.',
      },
      {
        uri: 'file://preview/data-table-row.html',
        name: 'Data Table Row Fragment',
        mimeType: 'text/html',
        description: 'Pure HTML fragment for data table row.',
      },
      {
        uri: 'file://preview/data-table-cell.html',
        name: 'Data Table Cell Fragment',
        mimeType: 'text/html',
        description: 'Pure HTML fragment for data table cell.',
      },
      {
        uri: 'file://preview/toolbar.html',
        name: 'Toolbar Fragment',
        mimeType: 'text/html',
        description: 'Pure HTML fragment for toolbar.',
      },
      {
        uri: 'file://preview/toolbar-button.html',
        name: 'Toolbar Button Fragment',
        mimeType: 'text/html',
        description: 'Pure HTML fragment for toolbar button.',
      },
      {
        uri: 'file://preview/inspector-panel.html',
        name: 'Inspector Panel Fragment',
        mimeType: 'text/html',
        description: 'Pure HTML fragment for inspector panel.',
      },
      {
        uri: 'file://preview/inspector-section.html',
        name: 'Inspector Section Fragment',
        mimeType: 'text/html',
        description: 'Pure HTML fragment for inspector section.',
      },
      {
        uri: 'file://preview/inspector-field.html',
        name: 'Inspector Field Fragment',
        mimeType: 'text/html',
        description: 'Pure HTML fragment for inspector field.',
      }
    ],
  };
});

// Read Resource content
server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  if (request.uri === 'file://DESIGN.md') {
    const content = fs.readFileSync(path.join(__dirname, 'DESIGN.md'), 'utf-8');
    return {
      contents: [{
        uri: request.uri,
        mimeType: 'text/markdown',
        text: content,
      }],
    };
  }
  
  if (request.uri === 'file://preview/button.html') {
    const content = fs.readFileSync(path.join(__dirname, 'preview/button.html'), 'utf-8');
    return {
      contents: [{
        uri: request.uri,
        mimeType: 'text/html',
        text: content,
      }],
    };
  }

  if (request.uri === 'file://preview/stat-card.html') {
    const content = fs.readFileSync(path.join(__dirname, 'preview/stat-card.html'), 'utf-8');
    return {
      contents: [{
        uri: request.uri,
        mimeType: 'text/html',
        text: content,
      }],
    };
  }

  if (request.uri === 'file://preview/alert-banner.html') {
    const content = fs.readFileSync(path.join(__dirname, 'preview/alert-banner.html'), 'utf-8');
    return {
      contents: [{
        uri: request.uri,
        mimeType: 'text/html',
        text: content,
      }],
    };
  }

  if (request.uri === 'file://SKILL.md') {
    const content = fs.readFileSync(path.join(__dirname, 'SKILL.md'), 'utf-8');
    return {
      contents: [{
        uri: request.uri,
        mimeType: 'text/markdown',
        text: content,
      }],
    };
  }

  if (request.uri === 'file://preview/monitor-row.html') {
    const content = fs.readFileSync(path.join(__dirname, 'preview/monitor-row.html'), 'utf-8');
    return {
      contents: [{
        uri: request.uri,
        mimeType: 'text/html',
        text: content,
      }],
    };
  }

  if (request.uri === 'file://preview/sidebar-nav.html') {
    const content = fs.readFileSync(path.join(__dirname, 'preview/sidebar-nav.html'), 'utf-8');
    return {
      contents: [{
        uri: request.uri,
        mimeType: 'text/html',
        text: content,
      }],
    };
  }

  const newFragments = [
    'graph-canvas.html', 'graph-node.html', 'graph-edge.html',
    'activity-feed.html', 'activity-item.html',
    'data-table.html', 'data-table-row.html', 'data-table-cell.html',
    'toolbar.html', 'toolbar-button.html',
    'inspector-panel.html', 'inspector-section.html', 'inspector-field.html'
  ];

  if (request.uri.startsWith('file://preview/') && newFragments.includes(request.uri.split('/').pop())) {
    const filename = request.uri.split('/').pop();
    const content = fs.readFileSync(path.join(__dirname, 'preview', filename), 'utf-8');
    return {
      contents: [{
        uri: request.uri,
        mimeType: 'text/html',
        text: content,
      }],
    };
  }

  throw new Error('Resource not found');
});

// Transport setup
const transport = new StdioServerTransport();
server.connect(transport).then(() => {
  console.error('videsign MCP Server running on stdio');
}).catch(console.error);
