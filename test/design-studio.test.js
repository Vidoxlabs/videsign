'use strict';

/**
 * Collaborative Design Studio & Scaffolding Engine contract (ADR-023).
 * Verifies archetypes, Keep/Change/Do-not-copy contracts, dist/components.manifest.json,
 * and lint cleanliness across every composed scaffold.
 */

const { test, describe, before } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const {
  CATALOG_CATEGORIES,
  CATALOG_CONSUMERS,
  COMPONENT_CATALOG,
  DesignStudioError,
  STUDIO_ARCHETYPES,
  buildComponentsManifest,
  buildDesignBrief,
  scaffoldPage,
  stylesheetsForSlots,
} = require('../lib/design-studio');
const { parseFrontMatter } = require('../scripts/generate-tokens');
const { lintFragment } = require('../scripts/lint-preview');

const ROOT = path.join(__dirname, '..');

before(() => {
  execFileSync(process.execPath, [path.join(ROOT, 'scripts', 'generate-tokens.js')], {
    cwd: ROOT,
    stdio: 'ignore',
  });
});

describe('collaborative design studio & reference contracts', () => {
  test('all archetypes map to valid COMPONENT_CATALOG IDs and scaffold lint-clean HTML', () => {
    const validIds = new Set(COMPONENT_CATALOG.map((c) => c.id));
    for (const [archetype, ids] of Object.entries(STUDIO_ARCHETYPES)) {
      assert.ok(ids.length > 0, `empty archetype ${archetype}`);
      for (const id of ids) {
        assert.ok(validIds.has(id), `archetype ${archetype} references unknown component ${id}`);
      }
      const scaffold = scaffoldPage({ archetype, wrapDocument: false }, ROOT);
      assert.equal(scaffold.slots.length, ids.length);
      assert.deepEqual(scaffold.slots.map((s) => s.id), ids);
      const problems = lintFragment(`${archetype}.html`, scaffold.html);
      assert.deepEqual(problems, [], `lint issues in scaffolded ${archetype}: ${problems.join('; ')}`);
    }
  });

  test('buildDesignBrief validates inputs and merges Keep / Change / Do-not-copy boundaries', () => {
    const brief = buildDesignBrief({
      archetype: 'interactive-check-lab',
      theme: 'light',
      density: 'compact',
      framework: 'svelte',
      viewport: '390px',
      keep: ['Preserve polite live regions on all check readouts'],
      change: ['Connect command check engine cleanly in Svelte'],
      doNotCopy: ['Never inline script tags'],
    });
    assert.equal(brief.schemaVersion, 'videsign.design-brief/v1');
    assert.equal(brief.theme, 'light');
    assert.equal(brief.density, 'compact');
    assert.equal(brief.framework, 'svelte');
    assert.equal(brief.viewport, '390px');
    assert.ok(brief.referenceContract.keep.includes('Preserve polite live regions on all check readouts'));
    assert.ok(brief.referenceContract.change.includes('Connect command check engine cleanly in Svelte'));
    assert.ok(brief.referenceContract.doNotCopy.includes('Never inline script tags'));
    assert.ok(brief.integrationNotes.some((note) => note.includes('dist/themes.css')));
    assert.ok(brief.integrationNotes.some((note) => note.includes('Svelte')));

    assert.throws(() => buildDesignBrief({ theme: 'sepia' }), (err) => err instanceof DesignStudioError && err.code === 'INVALID_THEME');
    assert.throws(() => buildDesignBrief({ framework: 'jquery' }), (err) => err instanceof DesignStudioError && err.code === 'INVALID_FRAMEWORK');
    assert.throws(() => buildDesignBrief({ components: ['not-a-component'] }), (err) => err instanceof DesignStudioError && err.code === 'UNKNOWN_COMPONENT');
  });

  test('scaffoldPage detects optional stylesheets (glass, stage, memory-field, dialects, themes)', () => {
    const landingLight = scaffoldPage({ archetype: 'public-site-landing', theme: 'light', wrapDocument: true }, ROOT);
    assert.ok(landingLight.stylesheets.includes('dist/themes.css'));
    assert.ok(landingLight.stylesheets.includes('dist/glass.css'));
    assert.match(landingLight.html, /<html lang="en" data-theme="light">/);

    const plain = scaffoldPage({ components: ['public-repo-card', 'browser-check-runner'], wrapDocument: true }, ROOT);
    assert.deepEqual(plain.stylesheets, ['dist/tokens.css', 'dist/catalog.css']);

    const detected = stylesheetsForSlots(
      ['<div class="stage__glow"></div>', '<svg class="vi-mf-svg"></svg>', '<span class="vi-agent-badge"></span>'],
      'light',
    );
    assert.ok(detected.includes('dist/themes.css'));
    assert.ok(detected.includes('dist/stage.css'));
    assert.ok(detected.includes('dist/memory-field.css'));
    assert.ok(detected.includes('dist/dialects.css'));
    assert.equal(detected.includes('dist/glass.css'), false);
  });

  test('dist/components.manifest.json matches buildComponentsManifest output', () => {
    const tokens = parseFrontMatter(fs.readFileSync(path.join(ROOT, 'DESIGN.md'), 'utf8'));
    const expected = buildComponentsManifest(COMPONENT_CATALOG, tokens);
    const actual = JSON.parse(fs.readFileSync(path.join(ROOT, 'dist', 'components.manifest.json'), 'utf8'));
    assert.deepEqual(actual, expected);
    assert.equal(actual.componentCount, 50);
    assert.deepEqual(actual.categories, CATALOG_CATEGORIES);
    assert.deepEqual(actual.consumers, CATALOG_CONSUMERS);
    assert.equal(Object.keys(actual.archetypes).length, 9);
  });
});
