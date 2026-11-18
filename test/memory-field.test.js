/**
 * Memory field primitive contract (ADR-018): the four graph link tokens, lib/memory-field.js
 * (layout, SVG, text equivalent, contrast report, pipeline) and lib/memory-field.css (states and
 * the four motions).
 */

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const { parseFrontMatter } = require('../scripts/generate-tokens');
const { contrastRatio } = require('../lib/contrast');
const { deltaE00Hex } = require('../scripts/lib/ciede2000');

const ROOT = path.join(__dirname, '..');
const TOKENS = parseFrontMatter(fs.readFileSync(path.join(ROOT, 'DESIGN.md'), 'utf-8'));
const C = TOKENS.colors;

const LINKS = ['cluster', 'reasoned', 'linked', 'tree'];
const DARK = ['surface-background-primary-base', 'surface-background-secondary-base', 'surface-background-tertiary-base'];
const LIGHT = ['surface-background-primary-light', 'surface-background-secondary-light', 'surface-background-tertiary-light'];
const RESERVED = Object.keys(C).filter(
  (key) => key.startsWith('persona-accent-') || key.startsWith('status-indicator-') || key.startsWith('border-graph-line-'),
);

// --- Tokens (ADR-018 item 1) ---------------------------------------------------

test('each link token carries meaning at 3:1 or better on every surface of its theme', () => {
  for (const link of LINKS) {
    for (const [state, surfaces] of [['base', DARK], ['light', LIGHT]]) {
      const value = C[`border-graph-${link}-${state}`];
      assert.ok(value, `border-graph-${link}-${state} is defined`);
      for (const surface of surfaces) {
        const ratio = contrastRatio(value, C[surface]);
        assert.ok(ratio >= 3, `${link}-${state} on ${surface} is ${ratio.toFixed(2)}:1`);
      }
    }
  }
});

test('link tokens stay clear of persona, status and graph-line colours and of each other', () => {
  for (const state of ['base', 'light']) {
    const values = LINKS.map((link) => C[`border-graph-${link}-${state}`]);
    for (const value of values) {
      for (const key of RESERVED) {
        const delta = deltaE00Hex(value, C[key]);
        assert.ok(delta >= 15, `${value} is ${delta.toFixed(1)} from ${key}`);
      }
    }
    for (let i = 0; i < values.length; i += 1) {
      for (let j = i + 1; j < values.length; j += 1) {
        const delta = deltaE00Hex(values[i], values[j]);
        assert.ok(delta >= 20, `${LINKS[i]} and ${LINKS[j]} (${state}) are ${delta.toFixed(1)} apart`);
      }
    }
  }
});
