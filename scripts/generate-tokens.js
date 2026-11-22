#!/usr/bin/env node

/**
 * generate-tokens.js — Single-source token generation pipeline.
 *
 * Parses the YAML front-matter from DESIGN.md and emits consumable artifacts:
 *   dist/tailwind.config.js  — Tailwind theme mapping (semantic token classes)
 *   dist/tokens.css          — CSS custom properties (--vi-*)
 *   dist/tokens.json         — Machine-readable JSON for MCP and tooling
 *   dist/themes.css          — Product light theme mappings (ADR-012)
 *   dist/glass.css           — Crystal glass stylesheet with LITERAL declarations (ADR-006)
 *   dist/catalog.css         — Tailwind utilities compiled from the config, for preview/ only
 *   dist/chat.css            — Shared conversation canvas, composer, and workspace styles
 *   dist/standard.json|md    — Agent-readable standard (addendum §2)
 *
 * Usage:
 *   node scripts/generate-tokens.js          # write to dist/
 *   node scripts/generate-tokens.js --dry-run # print to stdout
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const { generateStandardArtifacts } = require('./generate-standard');
const { buildComponentsManifest, COMPONENT_CATALOG } = require('../lib/design-studio');

const ROOT = path.join(__dirname, '..');
const DESIGN_FILE = path.join(ROOT, 'DESIGN.md');
const DIST_DIR = path.join(ROOT, 'dist');
const CHAT_VARS = {
  canvas: 'colors-surface-chat-canvas-base',
  rail: 'colors-surface-chat-rail-base',
  'composer-bg': 'colors-surface-chat-composer-base',
  'composer-hover': 'colors-surface-chat-composer-hover-base',
  'user-bubble': 'colors-surface-chat-user-bubble-base',
  'border-subtle': 'colors-border-chat-subtle-base',
  'border-strong': 'colors-border-chat-strong-base',
  'focus-ring': 'colors-border-chat-focus-base',
  measure: 'size-layout-width-chat-thread-base',
  'prose-measure': 'size-layout-measure-chat-prose-base',
  'radius-composer': 'spacing-layout-radius-standard-base',
  'radius-bubble': 'spacing-layout-radius-standard-base',
};
const PLUGIN_VARS = {
  surface: 'colors-surface-plugin-surface-base',
  'row-hover': 'colors-surface-plugin-row-hover-base',
  'attention-border': 'colors-border-plugin-attention-base',
  'attention-bg': 'colors-surface-plugin-attention-bg-base',
  'badge-bg': 'colors-surface-plugin-badge-bg-base',
};

// --- Minimal YAML parser (handles the flat key: "value" format in DESIGN.md) ---

function parseFrontMatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) throw new Error('No YAML front-matter found in DESIGN.md');
  const yaml = match[1];

  const tokens = {};
  let currentCategory = null;

  for (const line of yaml.split('\n')) {
    if (line.startsWith('#') || line.trim() === '') continue;

    // Category line: two spaces of indent, word: at start
    const catMatch = line.match(/^(\w+):$/);
    if (catMatch && !line.startsWith(' ')) {
      currentCategory = catMatch[1];
      tokens[currentCategory] = {};
      continue;
    }

    // Token line: indented key: "value"
    const tokenMatch = line.match(/^\s+(\S+):\s+"?([^"\n]+)"?$/);
    if (tokenMatch && currentCategory) {
      const [, key, value] = tokenMatch;
      tokens[currentCategory][key] = value;
    }
  }

  return tokens;
}

// --- Helpers ---

/** Split a CSS font-family token into the array form Tailwind expects. */
function familyList(value) {
  return value.split(',').map((part) => part.trim());
}

/** Pick the entries of a category whose key starts with `prefix`. */
function withPrefix(entries, prefix) {
  return Object.fromEntries(Object.entries(entries || {}).filter(([k]) => k.startsWith(prefix)));
}

/**
 * Tailwind 3 drops an opacity modifier when the color is a bare var() it cannot
 * parse. color-mix keeps the custom property, so a light-theme override of that
 * still flows through, and /opacity utilities still compile. The colour
 * is the fallback when the variable is unset. color-mix() needs Safari 16.2+,
 * Chrome 111+, or Firefox 113+.
 */
function tailwindColorValue(key, value) {
  return `color-mix(in srgb, var(--vi-colors-${key}, ${value}) calc(<alpha-value> * 100%), transparent)`;
}

// --- Emitters ---

function emitTailwindConfig(tokens) {
  const theme = {};

  for (const [category, entries] of Object.entries(tokens)) {
    for (const [key, value] of Object.entries(entries)) {
      // Each token key is already in the format: role-variant-state
      // Use the full key as the Tailwind theme name.
      if (!theme[category]) theme[category] = {};
      theme[category][key] = category === 'colors' ? tailwindColorValue(key, value) : value;
    }
  }

  const typography = theme.typography || {};

  // Build the config object with special Tailwind mappings
  const config = {
    content: ['./preview/**/*.html', './src/**/*.{js,jsx,ts,tsx,html}'],
    theme: {
      extend: {
        colors: theme.colors || {},
        fontFamily: {
          'typography-family-sans-base': familyList(typography['typography-family-sans-base']),
          'typography-family-mono-base': familyList(typography['typography-family-mono-base']),
        },
        fontSize: withPrefix(typography, 'typography-size-'),
        fontWeight: withPrefix(typography, 'typography-weight-'),
        letterSpacing: withPrefix(typography, 'typography-tracking-'),
        lineHeight: withPrefix(typography, 'typography-leading-'),
        borderRadius: withPrefix(theme.spacing, 'layout-radius-'),
        padding: {
          ...theme.spacing,
          ...theme.space,
        },
        margin: theme.space || {},
        gap: theme.space || {},
        width: theme.size || {},
        height: theme.size || {},
        transitionDuration: withPrefix(theme.transition, 'transition-duration-'),
        transitionTimingFunction: withPrefix(theme.transition, 'transition-easing-'),
      },
    },
    plugins: [],
  };

  return `/** GENERATED BY scripts/generate-tokens.js — DO NOT EDIT. */
/** Source: DESIGN.md YAML front-matter. Run \`npm run tokens\` to regenerate. */

module.exports = ${JSON.stringify(config, null, 2)};
`;
}

function emitCSS(tokens) {
  const lines = [
    '/* GENERATED BY scripts/generate-tokens.js — DO NOT EDIT. */',
    '/* Source: DESIGN.md YAML front-matter. Run `npm run tokens` to regenerate. */',
    ':root {',
  ];

  for (const [category, entries] of Object.entries(tokens)) {
    for (const [key, value] of Object.entries(entries)) {
      const cssVar = `--vi-${category}-${key}`;
      lines.push(`  ${cssVar}: ${value};`);
    }
  }

  lines.push('}', '', ':root, [data-theme] {');
  for (const [name, token] of Object.entries(CHAT_VARS)) {
    lines.push(`  --vi-chat-${name}: var(--vi-${token});`);
  }
  for (const [name, token] of Object.entries(PLUGIN_VARS)) {
    lines.push('  --vi-plugin-' + name + ': var(--vi-' + token + ');');
  }
  lines.push('}');
  return lines.join('\n') + '\n';
}

/**
 * dist/glass.css — the crystal material as plain CSS with literal values.
 *
 * Safari does not resolve custom properties inside `-webkit-backdrop-filter`,
 * so every backdrop declaration is written out with both the prefixed and the
 * unprefixed property (ADR-006). Class names are consumer API.
 */
function emitGlassCSS(tokens) {
  const fx = tokens.effects;
  const sp = tokens.spacing;
  const need = (key) => {
    if (fx[key] === undefined) throw new Error(`effects.${key} is required by emitGlassCSS`);
    return fx[key];
  };
  const surface = need('glass-crystal-surface-base');
  const surfaceHover = need('glass-crystal-surface-hover');
  const rim = need('glass-crystal-rim-base');
  const rimHover = need('glass-crystal-rim-hover');
  const highlight = need('glass-crystal-highlight-base');
  const sheen = need('glass-crystal-sheen-base');
  const shadow = need('glass-crystal-shadow-base');
  const backdrop = need('glass-crystal-backdrop-base');
  const core = need('glass-crystal-core-base');
  const solid = need('glass-crystal-solid-base');
  const focusAccent = tokens.colors['surface-accent-violet-base'];
  const shellRadius = sp['layout-radius-glass-base'];
  const bezel = sp['layout-padding-bezel-base'];
  const coreRadius = sp['layout-radius-standard-base'];
  const pillRadius = sp['layout-radius-full-base'];
  // Rim is an inset box-shadow, not a border box, so shell/bezel/core stay
  // concentric: 20px = 6px + 14px with no 1px border eating into the core.
  const rimShadow = (color) => `inset 0 0 0 1px ${color}`;

  const solidFallback = (indent) => [
    `${indent}background-color: ${solid};`,
    `${indent}background-image: none;`,
    `${indent}-webkit-backdrop-filter: none;`,
    `${indent}backdrop-filter: none;`,
    `${indent}box-shadow: ${rimShadow(rim)}, ${shadow};`,
  ].join('\n');

  // The hover rule must be restated: its specificity beats `.vi-glass`, so a
  // translucent hover fill would otherwise leak into the solid fallback.
  const fallbackRule = (indent) => [
    `${indent}.vi-glass,`,
    `${indent}.vi-glass-shell {`,
    solidFallback(`${indent}  `),
    `${indent}}`,
    `${indent}.vi-glass--control:hover,`,
    `${indent}.vi-glass--control:focus-within {`,
    `${indent}  background-color: ${solid};`,
    `${indent}  box-shadow: ${rimShadow(rimHover)}, ${shadow};`,
    `${indent}}`,
  ].join('\n');

  return [
    '/* GENERATED BY scripts/generate-tokens.js — DO NOT EDIT. */',
    '/* Source: DESIGN.md effects/spacing tokens (ADR-006). Run `npm run tokens` to regenerate. */',
    '/* Literal declarations on purpose: Safari ignores custom properties in -webkit-backdrop-filter. */',
    '',
    '.vi-glass,',
    '.vi-glass-shell {',
    `  background-color: ${surface};`,
    `  background-image: ${sheen};`,
    '  border: 0;',
    `  box-shadow: ${rimShadow(rim)}, ${highlight}, ${shadow};`,
    `  -webkit-backdrop-filter: ${backdrop};`,
    `  backdrop-filter: ${backdrop};`,
    '}',
    '',
    '.vi-glass--control:hover,',
    '.vi-glass--control:focus-within {',
    `  background-color: ${surfaceHover};`,
    `  box-shadow: ${rimShadow(rimHover)}, ${highlight}, ${shadow};`,
    '}',
    '',
    '/* Focus outlines use surface-accent-violet-base (ADR-011 item 10). */',
    '.vi-glass--control:focus-within {',
    `  outline: 2px solid ${focusAccent};`,
    '  outline-offset: 2px;',
    '}',
    '',
    '/* Double bezel: outer shell 20px, 6px padding, inner core 14px (concentric). */',
    '.vi-glass-shell {',
    `  border-radius: ${shellRadius};`,
    `  padding: ${bezel};`,
    '}',
    '',
    '.vi-glass-core {',
    `  border-radius: ${coreRadius};`,
    `  background-color: ${core};`,
    '}',
    '',
    '/* Pill shapes for island nav, question bar and persona switcher. */',
    '.vi-glass-shell--pill {',
    `  border-radius: ${pillRadius};`,
    '}',
    '',
    '.vi-glass-core--pill {',
    `  border-radius: ${pillRadius};`,
    '}',
    '',
    '/* Solid surface with the same rim wherever the blur cannot or must not render. */',
    '@media (prefers-reduced-transparency: reduce) {',
    fallbackRule('  '),
    '}',
    '',
    '@media (prefers-contrast: more) {',
    fallbackRule('  '),
    '}',
    '',
    '@media (forced-colors: active) {',
    '  .vi-glass,',
    '  .vi-glass-shell {',
    '    background-color: Canvas;',
    '    background-image: none;',
    '    -webkit-backdrop-filter: none;',
    '    backdrop-filter: none;',
    `    box-shadow: ${rimShadow('CanvasText')};`,
    '  }',
    '  .vi-glass--control:hover,',
    '  .vi-glass--control:focus-within {',
    '    background-color: Canvas;',
    `    box-shadow: ${rimShadow('Highlight')};`,
    '  }',
    '  .vi-glass--control:focus-within {',
    '    outline-color: Highlight;',
    '  }',
    '  .vi-glass-core {',
    '    background-color: Canvas;',
    '  }',
    '}',
    '',
    '@supports not ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px))) {',
    fallbackRule('  '),
    '}',
    '',
  ].join('\n');
}

/**
 * dist/catalog.css — Tailwind utilities for preview/ fragments only.
 * Not shipped to consumers; the catalog needs it so fragments render styled.
 */
function emitCatalogCSS() {
  const cli = require.resolve('tailwindcss/lib/cli.js');
  const input = path.join(os.tmpdir(), `videsign-catalog-${process.pid}.css`);
  const output = path.join(DIST_DIR, 'catalog.css');
  fs.writeFileSync(input, '@tailwind base;\n@tailwind components;\n@tailwind utilities;\n', 'utf-8');
  try {
    execFileSync(
      process.execPath,
      [cli, '-c', path.join(DIST_DIR, 'tailwind.config.js'), '-i', input, '-o', output],
      { cwd: ROOT, stdio: ['ignore', 'ignore', 'pipe'] },
    );
  } finally {
    fs.rmSync(input, { force: true });
  }
  return output;
}

/** Theme mappings are generated here; product consumers never supply theme values. */
function emitThemeCSS(tokens) {
  const lines = ['/* GENERATED BY scripts/generate-tokens.js - DO NOT EDIT. */', '[data-theme="light"] {', '  color-scheme: light;'];
  for (const [key, value] of Object.entries(tokens.colors)) {
    if (key.endsWith('-light')) lines.push(`  --vi-colors-${key.slice(0, -6)}-base: ${value};`);
  }
  lines.push(`  --vi-effects-glass-crystal-solid-base: ${tokens.effects['glass-crystal-solid-light']};`,
    `  --vi-effects-glass-crystal-core-base: ${tokens.effects['glass-crystal-solid-light']};`, '}',
    '[data-theme="dark"] { color-scheme: dark; }',
    '[data-theme="light"] .vi-glass, [data-theme="light"] .vi-glass-shell, [data-theme="light"] .vi-glass--control:hover, [data-theme="light"] .vi-glass--control:focus-within {',
    `  background: ${tokens.effects['glass-crystal-solid-light']};`, '  border: 0;', '  backdrop-filter: none;', '  -webkit-backdrop-filter: none;',
    `  box-shadow: inset 0 0 0 1px ${tokens.effects['glass-crystal-rim-light']};`, '}',
    `[data-theme="light"] .vi-glass-core { background: ${tokens.effects['glass-crystal-solid-light']}; }`,
    '@media (forced-colors: active) {',
    '  [data-theme] .vi-glass, [data-theme] .vi-glass-shell, [data-theme] .vi-glass-core { background: Canvas; color: CanvasText; backdrop-filter: none; -webkit-backdrop-filter: none; }', '}', '');
  return lines.join('\n');
}

/**
 * Stage backdrop primitive (ADR-013 item 1): the stylesheet as shipped, and one rendered SVG per
 * variant, so a static consumer can inline the markup without running the renderer.
 */
function emitStageArtifacts() {
  const { renderStageSvg, STAGE_VARIANT_OPACITY } = require('../lib/stage');
  const outputs = { 'stage.css': fs.readFileSync(path.join(__dirname, '..', 'lib', 'stage.css'), 'utf-8') };
  for (const variant of Object.keys(STAGE_VARIANT_OPACITY)) {
    outputs[`stage-${variant}.svg`] = `${renderStageSvg({ variant })}\n`;
  }
  return outputs;
}

/** Persona dialects (ADR-015): the agent-surface stylesheet and the resolved values. */
function emitDialectArtifacts(tokens) {
  const { emitDialectCss, resolveDialects } = require('../lib/dialects');
  const { classify } = require('./lib/token-values');
  return {
    'dialects.css': emitDialectCss(),
    'dialects.json': `${JSON.stringify(resolveDialects(tokens, classify), null, 2)}\n`,
  };
}

/**
 * Memory field primitive (ADR-018): the stylesheet as shipped and one rendered sample of each
 * figure, so a static consumer can inspect the markup without running the renderer.
 */
function emitMemoryFieldArtifacts() {
  const mf = require('../lib/memory-field');
  const layout = mf.layoutMemoryField(mf.sampleMemoryField(), { seed: 5 });
  return {
    'memory-field.css': fs.readFileSync(path.join(__dirname, '..', 'lib', 'memory-field.css'), 'utf-8'),
    'memory-field-sample.svg': `${mf.renderMemoryFieldSvg(layout, { title: 'Memory field sample' })}\n`,
    'memory-pipeline-sample.svg': `${mf.renderMemoryPipelineSvg(mf.SAMPLE_PIPELINE, { title: 'Memory pipeline sample' })}\n`,
  };
}

/**
 * Orbital chromatic capsule field primitive: zero-hex oklch() stylesheet plus browser-ready
 * ES modules stripped natively from the TypeScript engine and Web Component sources.
 */
function emitOrbitalFieldArtifacts() {
  const { stripTypeScriptTypes } = require('module');
  const engineTs = fs.readFileSync(path.join(__dirname, '..', 'lib', 'orbital-field-engine.ts'), 'utf-8');
  const componentTs = fs.readFileSync(path.join(__dirname, '..', 'lib', 'vi-orbital-field.ts'), 'utf-8');
  const engineJs = stripTypeScriptTypes(engineTs, { mode: 'strip' });
  const componentJs = stripTypeScriptTypes(componentTs, { mode: 'strip' })
    .replace(/\.\/orbital-field-engine\.ts/g, './orbital-field-engine.js');
  return {
    'vi-orbital-hero.css': fs.readFileSync(path.join(__dirname, '..', 'lib', 'vi-orbital-hero.css'), 'utf-8'),
    'orbital-field-engine.js': engineJs,
    'vi-orbital-field.js': componentJs,
  };
}

/**
 * Modern documentation portal layout and renderer: zero-hex oklch() container-query stylesheet
 * plus CSP-safe vanilla JS progressive-enhancement controller.
 */
function emitDocsPortalArtifacts() {
  return {
    'docs-portal.css': fs.readFileSync(path.join(__dirname, '..', 'lib', 'docs-portal.css'), 'utf-8'),
    'docs-portal.js': fs.readFileSync(path.join(__dirname, '..', 'lib', 'docs-portal.js'), 'utf-8'),
  };
}

/**
 * Modernized Settings architecture: zero-hex oklch() container-query stylesheet plus
 * CSP-safe vanilla JS progressive-enhancement controller.
 */
function emitSettingsSurfaceArtifacts() {
  return {
    'settings-surface.css': fs.readFileSync(path.join(__dirname, '..', 'lib', 'settings-surface.css'), 'utf-8'),
    'settings-surface.js': fs.readFileSync(path.join(__dirname, '..', 'lib', 'settings-surface.js'), 'utf-8'),
  };
}

/**
 * Modernized Skills, Agents, and Projects Library surfaces: zero-hex oklch() container-query
 * stylesheet plus CSP-safe vanilla JS progressive-enhancement controller.
 */
function emitLibrarySurfaceArtifacts() {
  return {
    'library-surface.css': fs.readFileSync(path.join(__dirname, '..', 'lib', 'library-surface.css'), 'utf-8'),
    'library-surface.js': fs.readFileSync(path.join(__dirname, '..', 'lib', 'library-surface.js'), 'utf-8'),
  };
}

function emitJSON(tokens) {
  return JSON.stringify(tokens, null, 2) + '\n';
}

// --- Main ---

function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');

  const content = fs.readFileSync(DESIGN_FILE, 'utf-8');
  const tokens = parseFrontMatter(content);

  const standardArtifacts = generateStandardArtifacts(tokens);
  const outputs = {
    'tailwind.config.js': emitTailwindConfig(tokens),
    'tokens.css': emitCSS(tokens),
    'themes.css': emitThemeCSS(tokens),
    'tokens.json': emitJSON(tokens),
    'glass.css': emitGlassCSS(tokens),
    'chat.css': fs.readFileSync(path.join(ROOT, 'lib', 'chat.css'), 'utf-8'),
    'plugins.css': fs.readFileSync(path.join(ROOT, 'lib', 'plugins.css'), 'utf-8'),
    'standard.json': standardArtifacts['standard.json'],
    'standard.md': standardArtifacts['standard.md'],
    'components.manifest.json': `${JSON.stringify(buildComponentsManifest(COMPONENT_CATALOG, tokens), null, 2)}\n`,
    ...emitStageArtifacts(),
    ...require('./generate-platforms').emitPlatformArtifacts(tokens),
    ...emitDialectArtifacts(tokens),
    ...emitMemoryFieldArtifacts(),
    ...emitOrbitalFieldArtifacts(),
    ...emitDocsPortalArtifacts(),
    ...emitSettingsSurfaceArtifacts(),
    ...emitLibrarySurfaceArtifacts(),
  };

  if (dryRun) {
    for (const [file, content] of Object.entries(outputs)) {
      process.stdout.write(`\n=== dist/${file} ===\n`);
      process.stdout.write(content);
    }
    return;
  }

  if (!fs.existsSync(DIST_DIR)) {
    fs.mkdirSync(DIST_DIR, { recursive: true });
  }

  for (const [file, content] of Object.entries(outputs)) {
    const filePath = path.join(DIST_DIR, file);
    fs.writeFileSync(filePath, content, 'utf-8');
    process.stdout.write(`wrote dist/${file}\n`);
  }

  emitCatalogCSS();
  process.stdout.write('wrote dist/catalog.css\n');
}

if (require.main === module) {
  main();
}

module.exports = {
  parseFrontMatter,
  emitTailwindConfig,
  emitCSS,
  emitJSON,
  emitThemeCSS,
  emitGlassCSS,
  emitCatalogCSS,
  emitStageArtifacts,
  emitDialectArtifacts,
  emitMemoryFieldArtifacts,
  emitOrbitalFieldArtifacts,
  emitDocsPortalArtifacts,
  emitSettingsSurfaceArtifacts,
  emitLibrarySurfaceArtifacts,
};
