#!/usr/bin/env node
'use strict';

/**
 * sync-fixture-metrics.js — Synchronizes [data-manifest-metric="componentCount"]
 * elements in preview/*.html against the canonical COMPONENT_CATALOG length so
 * preview fixtures never drift from dist/components.manifest.json.
 */

const fs = require('fs');
const path = require('path');
const { COMPONENT_CATALOG } = require('../lib/design-studio');

const ROOT = path.join(__dirname, '..');
const PREVIEW_DIR = path.join(ROOT, 'preview');

function syncFixtureHtml(html, metrics) {
  return html.replace(
    /(<[a-z0-9-]+\b[^>]*\bdata-manifest-metric="([^"]+)"[^>]*>)([^<]*)(<\/[a-z0-9-]+>)/gi,
    (full, openTag, metricName, currentText, closeTag) => {
      if (!Object.prototype.hasOwnProperty.call(metrics, metricName)) return full;
      const tmplMatch = openTag.match(/\bdata-manifest-template="([^"]*)"/i);
      const template = tmplMatch ? tmplMatch[1] : '{count}';
      const nextText = template.replace(/\{count\}/g, String(metrics[metricName]));
      return `${openTag}${nextText}${closeTag}`;
    },
  );
}

function syncFixtureMetrics(rootDir = ROOT, count = COMPONENT_CATALOG.length) {
  const previewDir = path.join(rootDir, 'preview');
  const metrics = { componentCount: count };
  const updated = [];
  for (const file of fs.readdirSync(previewDir).filter((f) => f.endsWith('.html')).sort()) {
    if (file === 'index.html') continue;
    const abs = path.join(previewDir, file);
    const before = fs.readFileSync(abs, 'utf-8');
    if (!before.includes('data-manifest-metric=')) continue;
    const after = syncFixtureHtml(before, metrics);
    if (after !== before) {
      fs.writeFileSync(abs, after, 'utf-8');
      updated.push(file);
    }
  }
  return updated;
}

if (require.main === module) {
  const updated = syncFixtureMetrics(ROOT, COMPONENT_CATALOG.length);
  process.stdout.write(`synced fixture metrics (${COMPONENT_CATALOG.length} manifest components; ${updated.length} updated)\n`);
}

module.exports = { syncFixtureHtml, syncFixtureMetrics };
