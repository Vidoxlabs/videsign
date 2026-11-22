'use strict';

/**
 * OpenDesign-inspired Collaborative Agent Design Studio & Scaffolding Engine (ADR-023).
 * Provides:
 *   - Canonical COMPONENT_CATALOG across conversation, agent-workspace, harness-contracts,
 *     public-continuity, and design-studio categories
 *   - STUDIO_ARCHETYPES and DEFAULT_REFERENCE_CONTRACT (Keep / Change / Do not copy)
 *   - buildDesignBrief(options) for structured design briefs
 *   - scaffoldPage(options, rootDir) for composing verified Nocturne fragments into target pages
 *   - buildComponentsManifest(catalog, tokens) emitted as dist/components.manifest.json
 */

const fs = require('fs');
const path = require('path');

const DEFAULT_ROOT = path.join(__dirname, '..');

const CATALOG_CATEGORIES = [
  'ui-primitives',
  'markdown-and-code',
  'graphic-maps',
  'persona-canon',
  'conversation',
  'agent-workspace',
  'harness-contracts',
  'public-continuity',
  'design-studio',
];

const CATALOG_CONSUMERS = ['seed', 'bloom', 'vidoxlabs.dev', 'vitools', 'videsign'];

/** Pull-first catalog of modular HTML preview fragments (ADR-021, ADR-023). */
const COMPONENT_CATALOG = [
  {
    id: 'conversation-surface',
    file: 'preview/conversation-surface.html',
    category: 'conversation',
    adr: 'ADR-016',
    consumers: ['vidoxlabs.dev', 'bloom'],
    summary: 'Empty-state crystal-glass conversation surface with one-row header, five seat dots, starters, one-field composer and disclosure line.',
  },
  {
    id: 'chat-dock',
    file: 'preview/chat-dock.html',
    category: 'conversation',
    adr: 'ADR-013',
    consumers: ['vidoxlabs.dev'],
    summary: 'Non-modal crystal-glass chat dock dialog above a five-bar launcher showing a persona conversation in progress.',
  },
  {
    id: 'group-conversation',
    file: 'preview/group-conversation.html',
    category: 'conversation',
    adr: 'ADR-020',
    consumers: ['bloom'],
    summary: 'Multi-agent harness group thread with monogram speaker rhythm, hairline receipt ledgers, solid artifact cards and turn states.',
  },
  {
    id: 'speaker-marker',
    file: 'preview/speaker-marker.html',
    category: 'conversation',
    adr: 'ADR-016',
    consumers: ['vidoxlabs.dev'],
    summary: 'Five-segment canon-order speaker marker and primary-text seat name rendered only on speaker change.',
  },
  {
    id: 'receipt-ledger-row',
    file: 'preview/receipt-ledger-row.html',
    category: 'conversation',
    adr: 'ADR-020',
    consumers: ['seed', 'bloom', 'vidoxlabs.dev'],
    summary: 'Hairline-separated polite-live definition list pairing mono micro-labels with tabular-nums mono receipt values.',
  },
  {
    id: 'turn-state-chip',
    file: 'preview/turn-state-chip.html',
    category: 'conversation',
    adr: 'ADR-020',
    consumers: ['seed', 'bloom'],
    summary: 'Status-token turn-state indicators (running, stopping, finished, failed) paired with text labels inside a polite status region.',
  },
  {
    id: 'starter-chips',
    file: 'preview/starter-chips.html',
    category: 'conversation',
    adr: 'ADR-016',
    consumers: ['vidoxlabs.dev', 'bloom'],
    summary: 'Up to four 44px pill starter prompts displayed on an empty conversation from a single source.',
  },
  {
    id: 'owner-approval-gate',
    file: 'preview/owner-approval-gate.html',
    category: 'agent-workspace',
    adr: 'ADR-021',
    consumers: ['seed', 'bloom'],
    summary: 'Solid secondary card for waiting_for_owner tool requests with hairline action digest ledger, 44px action buttons and resolved receipt.',
  },
  {
    id: 'shared-desktop-catalog',
    file: 'preview/shared-desktop-catalog.html',
    category: 'agent-workspace',
    adr: 'ADR-021',
    consumers: ['bloom'],
    summary: 'Folder-grouped shared file catalog with revision tags, 44px checkbox admission rows and Open controls.',
  },
  {
    id: 'artifact-lineage-reader',
    file: 'preview/artifact-lineage-reader.html',
    category: 'agent-workspace',
    adr: 'ADR-021',
    consumers: ['bloom'],
    summary: 'Solid secondary dialog displaying a produced artifact alongside its author, folder, revision, input files, revision links and digest.',
  },
  {
    id: 'agent-roster-card',
    file: 'preview/agent-roster-card.html',
    category: 'agent-workspace',
    adr: 'ADR-021',
    consumers: ['bloom'],
    summary: 'Active team monogram roster (head agent violet ring, specialist graph-line outlines) paired with a sidebar-ready saved persona library.',
  },
  {
    id: 'team-memory-notes',
    file: 'preview/team-memory-notes.html',
    category: 'agent-workspace',
    adr: 'ADR-021',
    consumers: ['bloom'],
    summary: 'Governed team notes panel separating confirmed Always/Relevant notes (Correct, Forget) from agent suggestions (Keep, Dismiss) and recall disclosures.',
  },
  {
    id: 'cross-team-handoff',
    file: 'preview/cross-team-handoff.html',
    category: 'agent-workspace',
    adr: 'ADR-021',
    consumers: ['bloom'],
    summary: 'Cross-team question/answer callouts marked with a violet left border and status-labelled review gate outcomes (Review approved, Changes requested).',
  },
  {
    id: 'usage-budget-meter',
    file: 'preview/usage-budget-meter.html',
    category: 'agent-workspace',
    adr: 'ADR-021',
    consumers: ['seed', 'bloom'],
    summary: 'Polite-live tabular-nums model call and token budget meter with per-actor input/output/cache breakdown and explicit unreported-token fallback.',
  },
  {
    id: 'layout-agent-workspace',
    file: 'preview/layout-agent-workspace.html',
    category: 'agent-workspace',
    adr: 'ADR-021',
    consumers: ['bloom'],
    summary: 'Full-page three-column agent workstation composition with workspaces/personas sidebar, centre group conversation and right inspector.',
  },
  {
    id: 'claim-maturity-badge',
    file: 'preview/claim-maturity-badge.html',
    category: 'harness-contracts',
    adr: 'ADR-021',
    consumers: ['seed', 'vidoxlabs.dev'],
    summary: 'Status-backed claim maturity badges (implemented, observed, specified, planned) paired with text labels and evidence receipts.',
  },
  {
    id: 'run-lifecycle-strip',
    file: 'preview/run-lifecycle-strip.html',
    category: 'harness-contracts',
    adr: 'ADR-021',
    consumers: ['seed', 'vidoxlabs.dev'],
    summary: 'Solid-panel readout of objective/attempt stages (draft through complete, stopping/stopped, failed) paired with a hairline receipt ledger.',
  },
  {
    id: 'tool-registry-row',
    file: 'preview/tool-registry-row.html',
    category: 'harness-contracts',
    adr: 'ADR-021',
    consumers: ['seed', 'vidoxlabs.dev', 'vitools'],
    summary: 'Neutral tool registry rows (domain.[resource.][sub.]verb) separating connector binding, effect class, realm and ownerGate pause state.',
  },
  {
    id: 'browser-check-runner',
    file: 'preview/browser-check-runner.html',
    category: 'harness-contracts',
    adr: 'ADR-023',
    consumers: ['vidoxlabs.dev', 'vitools', 'seed'],
    summary: 'Explorable client-side command and skill checker panel with presets, filter switch, live count and hairline result items.',
  },
  {
    id: 'public-repo-card',
    file: 'preview/public-repo-card.html',
    category: 'public-continuity',
    adr: 'ADR-021',
    consumers: ['vidoxlabs.dev'],
    summary: 'Two-column grid of solid cards for the four published repositories (seed, bloom, videsign, vitools) with claim badges, contract ledgers and 44px links.',
  },
  {
    id: 'ecosystem-plane-map',
    file: 'preview/ecosystem-plane-map.html',
    category: 'public-continuity',
    adr: 'ADR-021',
    consumers: ['vidoxlabs.dev'],
    summary: 'Four-plane public ecosystem map (Surfaces, Harness, Providers, Authority stores) pairing published nouns with generalized public role terms.',
  },
  {
    id: 'site-header-island',
    file: 'preview/site-header-island.html',
    category: 'public-continuity',
    adr: 'ADR-023',
    consumers: ['vidoxlabs.dev'],
    summary: 'Deslopped crystal-glass island navigation pill with six bounded links, brand accent Chat trigger and responsive Menu toggle.',
  },
  {
    id: 'site-footer',
    file: 'preview/site-footer.html',
    category: 'public-continuity',
    adr: 'ADR-023',
    consumers: ['vidoxlabs.dev'],
    summary: 'Grouped site footer linking seed, bloom, videsign and vitools, machine feeds, disclosure copy and WCAG 2.2.2 motion pause button.',
  },
  {
    id: 'hero-billboard',
    file: 'preview/hero-billboard.html',
    category: 'public-continuity',
    adr: 'ADR-023',
    consumers: ['vidoxlabs.dev'],
    summary: 'Landing hero billboard with fluid display scale, canon five-bar rule, computed facts rail and four architecture plane cards.',
  },
  {
    id: 'filterable-catalog-grid',
    file: 'preview/filterable-catalog-grid.html',
    category: 'public-continuity',
    adr: 'ADR-023',
    consumers: ['vidoxlabs.dev', 'vitools'],
    summary: 'Search input, four facet selects, polite live result counter, two-column metadata cards and dashed empty-filter fallback.',
  },
  {
    id: 'client-install-switcher',
    file: 'preview/client-install-switcher.html',
    category: 'public-continuity',
    adr: 'ADR-023',
    consumers: ['vidoxlabs.dev', 'vitools'],
    summary: 'Client install selector, copyable MCP/skill instructions, unsupported-client gap notice, raw markdown links and provenance ledger.',
  },
  {
    id: 'persona-companion-stage',
    file: 'preview/persona-companion-stage.html',
    category: 'conversation',
    adr: 'ADR-023',
    consumers: ['vidoxlabs.dev', 'bloom'],
    summary: 'Five-seat Living Interface ensemble paired with canon five-segment bars, operational state buttons and hairline readout.',
  },
  {
    id: 'evidence-exhibit-figure',
    file: 'preview/evidence-exhibit-figure.html',
    category: 'public-continuity',
    adr: 'ADR-023',
    consumers: ['vidoxlabs.dev'],
    summary: 'Product exhibit card with synthetic disclosure, non-image numbered workflow steps, claim IDs and APA/BibTeX citation block.',
  },
  {
    id: 'design-studio-canvas',
    file: 'preview/design-studio-canvas.html',
    category: 'design-studio',
    adr: 'ADR-023',
    consumers: ['videsign', 'bloom', 'vidoxlabs.dev'],
    summary: 'Collaborative agent design studio workbench with structured brief, Keep/Change/Do not copy contract, viewport presets, critique pins and guardrail receipt.',
  },
  {
    id: 'layout-public-site',
    file: 'preview/layout-public-site.html',
    category: 'public-continuity',
    adr: 'ADR-023',
    consumers: ['vidoxlabs.dev'],
    summary: 'Full-page dynamic public site composition uniting the crystal island header, hero billboard, four public repository cards and footer.',
  },
  {
    id: 'form-controls',
    file: 'preview/form-controls.html',
    category: 'ui-primitives',
    adr: 'ADR-024',
    consumers: ['vidoxlabs.dev', 'bloom', 'seed', 'videsign'],
    summary: 'Accessible text inputs (default, focus, error, disabled), textarea, select, checkbox, role=switch toggle, and range slider on solid surfaces.',
  },
  {
    id: 'button-variants',
    file: 'preview/button-variants.html',
    category: 'ui-primitives',
    adr: 'ADR-024',
    consumers: ['vidoxlabs.dev', 'bloom', 'seed', 'videsign'],
    summary: 'Large solid violet CTA (ADR-011), accent-bordered primary, secondary hairline, ghost, destructive, disabled, and segmented control group.',
  },
  {
    id: 'navigation-primitives',
    file: 'preview/navigation-primitives.html',
    category: 'ui-primitives',
    adr: 'ADR-024',
    consumers: ['vidoxlabs.dev', 'bloom', 'videsign'],
    summary: 'Horizontal role=tablist tabs, breadcrumb navigation, tabular-nums pagination bar, and Cmd+K command launcher.',
  },
  {
    id: 'feedback-and-empty-states',
    file: 'preview/feedback-and-empty-states.html',
    category: 'ui-primitives',
    adr: 'ADR-024',
    consumers: ['vidoxlabs.dev', 'bloom', 'seed', 'vitools'],
    summary: 'Status-paired polite banners, segmented step progress bar, and dashed zero-match empty state with reset action.',
  },
  {
    id: 'disclosure-and-modals',
    file: 'preview/disclosure-and-modals.html',
    category: 'ui-primitives',
    adr: 'ADR-024',
    consumers: ['vidoxlabs.dev', 'bloom', 'videsign'],
    summary: 'Native details/summary accordions, solid secondary confirm dialog, and contextual row menu with 44px controls.',
  },
  {
    id: 'data-table',
    file: 'preview/data-table.html',
    category: 'ui-primitives',
    adr: 'ADR-006',
    consumers: ['bloom', 'seed', 'vidoxlabs.dev'],
    summary: 'Tabular container with mono header row, tertiary surface band, and hairline separators.',
  },
  {
    id: 'markdown-prose-renderer',
    file: 'preview/markdown-prose-renderer.html',
    category: 'markdown-and-code',
    adr: 'ADR-024',
    consumers: ['vidoxlabs.dev', 'bloom', 'vitools', 'videsign'],
    summary: 'Complete GFM Markdown article surface with inline code and kbd, boundary callout, tabular-nums table, checklist, code fence, and blockquote.',
  },
  {
    id: 'code-and-diff-viewer',
    file: 'preview/code-and-diff-viewer.html',
    category: 'markdown-and-code',
    adr: 'ADR-024',
    consumers: ['vidoxlabs.dev', 'bloom', 'seed', 'videsign'],
    summary: 'Multi-tab code viewer, unified +/- diff viewer pairing symbols and status text with line numbers, and CLI receipt strip.',
  },
  {
    id: 'systems-constellation-map',
    file: 'preview/systems-constellation-map.html',
    category: 'graphic-maps',
    adr: 'ADR-024',
    consumers: ['vidoxlabs.dev'],
    summary: 'Deslopped homepage systems constellation SVG map pairing tier filter pills, >=3:1 bowed Bezier edges, and crystal-glass evidence lens.',
  },
  {
    id: 'stage-backdrop',
    file: 'preview/stage-backdrop.html',
    category: 'graphic-maps',
    adr: 'ADR-013',
    consumers: ['vidoxlabs.dev'],
    summary: 'Five-seat ambient stage lights in canon order above a five-segment stage ring driven by lib/stage.js.',
  },
  {
    id: 'memory-field',
    file: 'preview/memory-field.html',
    category: 'graphic-maps',
    adr: 'ADR-018',
    consumers: ['vidoxlabs.dev', 'bloom'],
    summary: 'Deterministic memory constellation graphic map using shape by memory class, radius by recall mass, and CR/RR/LR/TR link codes.',
  },
  {
    id: 'memory-pipeline',
    file: 'preview/memory-pipeline.html',
    category: 'graphic-maps',
    adr: 'ADR-018',
    consumers: ['vidoxlabs.dev'],
    summary: 'Architecture pipeline graphic map from Sources through Authority stores and Projections to Recall lanes and deletion epoch.',
  },
  {
    id: 'evidence-lens',
    file: 'preview/evidence-lens.html',
    category: 'graphic-maps',
    adr: 'ADR-006',
    consumers: ['vidoxlabs.dev'],
    summary: 'Crystal-glass evidence lens pairing focused map claims with numbered records and a dashed Not established disclosure.',
  },
  {
    id: 'coverage-grid',
    file: 'preview/coverage-grid.html',
    category: 'graphic-maps',
    adr: 'ADR-013',
    consumers: ['vidoxlabs.dev'],
    summary: 'Solid matrix mapping query terms against record kinds with filled/hollow markers and screen-reader text labels.',
  },
  {
    id: 'persona-deliberation-stepper',
    file: 'preview/persona-deliberation-stepper.html',
    category: 'persona-canon',
    adr: 'ADR-024',
    consumers: ['vidoxlabs.dev', 'bloom'],
    summary: 'Six-stage request deliberation walkthrough across Violet, Wisteria, Xylia, Yarrow, Zinnia, and the owner ratification gate.',
  },
  {
    id: 'persona-identity-badge',
    file: 'preview/persona-identity-badge.html',
    category: 'persona-canon',
    adr: 'ADR-011',
    consumers: ['vidoxlabs.dev', 'bloom'],
    summary: 'Deterministic 24x24 inline SVG micro-badges for all five sovereign seats on dark and mono light tiles (always rendered as a set of five).',
  },
  {
    id: 'persona-dialects',
    file: 'preview/persona-dialects.html',
    category: 'persona-canon',
    adr: 'ADR-015',
    consumers: ['vidoxlabs.dev', 'bloom'],
    summary: 'One surface skeleton expressed across all five persona dialects varying tempo, density, label style, motif, and DOM lead order.',
  },
  {
    id: 'five-bar-rule',
    file: 'preview/five-bar-rule.html',
    category: 'persona-canon',
    adr: 'ADR-013',
    consumers: ['vidoxlabs.dev', 'videsign'],
    summary: 'Canon-order five-segment signature bar (Violet, Wisteria, Xylia, Yarrow, Zinnia) with hard edges and no blended gradient.',
  },
  {
    id: 'instrument',
    file: 'preview/instrument.html',
    category: 'harness-contracts',
    adr: 'ADR-017',
    consumers: ['vidoxlabs.dev', 'seed'],
    summary: 'Explorable solid-panel instrument pairing an SVG state readout diagram, consequence-bound controls, and polite hairline receipt.',
  },
  {
    id: 'statement-proof-row',
    file: 'preview/statement-proof-row.html',
    category: 'harness-contracts',
    adr: 'ADR-013',
    consumers: ['vidoxlabs.dev'],
    summary: 'Numbered claim statement paired beside its proof card and observed revision metadata.',
  },
];

/** Ordered page/app archetypes for brief compilation and page scaffolding. */
const STUDIO_ARCHETYPES = {
  'public-site-landing': [
    'site-header-island',
    'hero-billboard',
    'systems-constellation-map',
    'public-repo-card',
    'ecosystem-plane-map',
    'filterable-catalog-grid',
    'site-footer',
  ],
  'repository-showcase': [
    'site-header-island',
    'public-repo-card',
    'systems-constellation-map',
    'run-lifecycle-strip',
    'code-and-diff-viewer',
    'tool-registry-row',
    'evidence-exhibit-figure',
    'site-footer',
  ],
  'tool-and-skill-catalog': [
    'site-header-island',
    'filterable-catalog-grid',
    'client-install-switcher',
    'tool-registry-row',
    'site-footer',
  ],
  'interactive-check-lab': [
    'site-header-island',
    'browser-check-runner',
    'instrument',
    'claim-maturity-badge',
    'receipt-ledger-row',
    'site-footer',
  ],
  'research-library-article': [
    'site-header-island',
    'markdown-prose-renderer',
    'claim-maturity-badge',
    'statement-proof-row',
    'evidence-exhibit-figure',
    'receipt-ledger-row',
    'site-footer',
  ],
  'persona-companion-showcase': [
    'site-header-island',
    'persona-companion-stage',
    'persona-deliberation-stepper',
    'conversation-surface',
    'speaker-marker',
    'site-footer',
  ],
  'agent-harness-workstation': [
    'layout-agent-workspace',
    'group-conversation',
    'owner-approval-gate',
    'shared-desktop-catalog',
    'artifact-lineage-reader',
    'agent-roster-card',
    'team-memory-notes',
    'cross-team-handoff',
    'usage-budget-meter',
  ],
  'collaborative-design-studio': [
    'design-studio-canvas',
    'site-header-island',
    'hero-billboard',
    'public-repo-card',
    'site-footer',
  ],
  'ui-primitives-kitchen-sink': [
    'form-controls',
    'button-variants',
    'navigation-primitives',
    'feedback-and-empty-states',
    'disclosure-and-modals',
    'markdown-prose-renderer',
    'code-and-diff-viewer',
    'data-table',
  ],
};

/** Keep / Change / Do not copy reference contract for rebuilding vidoxlabs.dev cleanly. */
const DEFAULT_REFERENCE_CONTRACT = {
  keep: [
    'Nocturne Museum dark canvas (#0A0A0E primary, #12121A secondary, #1C1C24 tertiary) and #27272A hairline separators',
    'Geist + Geist Mono typography in sentence case with tabular-nums figures',
    'Crystal glass (vi-glass-shell + vi-glass-core) capped at 3 layers per viewport on navigation/overlays only',
    'Minimum 44px (2.75rem) interactive targets, 4.5:1 text contrast floor, and 3:1 non-text graph-line floor',
    'Status indicators always paired with visible text labels; five VWXYZ signature colours rendered together only',
    'WCAG 2.2.2 visible Pause background motion control in footer and reduced-motion stillness',
  ],
  change: [
    'Replace legacy static Astro pages and retired internal infrastructure references with dynamic modular components',
    'Center site navigation and architecture copy on the four published repositories: seed, bloom, videsign, and vitools',
    'Use the four generalized planes (Surfaces, Harness, Providers, Authority stores) and explicit claim maturity badges',
    'Hold navigation at six top-level links plus Chat trigger until the storefront is launched',
  ],
  doNotCopy: [
    'Retired internal container names, hostnames, private endpoints, or internal-only lexicon',
    'Arbitrary Tailwind brackets (w-[...]), raw weight utilities (font-semibold/bold), uppercase transforms, or 32px radii',
    'Colour-only status dots, Xylia crimson text, persona accents on non-persona agents, or shadow-sm dropshadows',
    'Unbacked claims or prohibited authority copy inside chrome (including overclaiming labels)',
  ],
};

class DesignStudioError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'DesignStudioError';
    this.code = code;
  }
}

const VALID_THEMES = new Set(['dark', 'light']);
const VALID_DENSITIES = new Set(['compact', 'balanced', 'spacious']);
const VALID_FRAMEWORKS = new Set(['html', 'react', 'nextjs', 'svelte', 'astro', 'vanilla']);
const VALID_VIEWPORTS = new Set(['1440px', '1024px', '390px']);

function mergeContractList(base, extra) {
  if (!Array.isArray(extra) || extra.length === 0) return [...base];
  const merged = [...base];
  for (const item of extra) {
    const clean = String(item || '').trim();
    if (clean && !merged.includes(clean)) merged.push(clean);
  }
  return merged;
}

function resolveCatalogMap(catalog = COMPONENT_CATALOG) {
  return new Map(catalog.map((entry) => [entry.id, entry]));
}

function resolveSlots(options, catalog = COMPONENT_CATALOG) {
  const map = resolveCatalogMap(catalog);
  const archetype = options && options.archetype ? String(options.archetype).trim() : 'public-site-landing';
  if (options && Array.isArray(options.components) && options.components.length > 0) {
    const slots = [];
    for (const rawId of options.components) {
      const id = String(rawId || '').trim().replace(/^file:\/\//, '').replace(/^preview\//, '').replace(/\.html$/, '');
      const entry = map.get(id);
      if (!entry) {
        throw new DesignStudioError('UNKNOWN_COMPONENT', `Unknown component id "${rawId}". Available: ${catalog.map((c) => c.id).join(', ')}`);
      }
      slots.push(entry);
    }
    return { archetype: Object.prototype.hasOwnProperty.call(STUDIO_ARCHETYPES, archetype) ? archetype : 'custom', slots };
  }
  if (!Object.prototype.hasOwnProperty.call(STUDIO_ARCHETYPES, archetype)) {
    throw new DesignStudioError('UNKNOWN_ARCHETYPE', `Unknown archetype "${archetype}". Available: ${Object.keys(STUDIO_ARCHETYPES).join(', ')}`);
  }
  return {
    archetype,
    slots: STUDIO_ARCHETYPES[archetype].map((id) => map.get(id)).filter(Boolean),
  };
}

function stylesheetsForSlots(slotHtmlList, theme) {
  const combined = slotHtmlList.join('\n');
  const sheets = ['dist/tokens.css', 'dist/catalog.css'];
  if (theme === 'light') sheets.push('dist/themes.css');
  if (/vi-glass/.test(combined)) sheets.push('dist/glass.css');
  if (/stage__/.test(combined) || /class="stage/.test(combined)) sheets.push('dist/stage.css');
  if (/vi-mf/.test(combined)) sheets.push('dist/memory-field.css');
  if (/vi-agent/.test(combined)) sheets.push('dist/dialects.css');
  return sheets;
}

function frameworkIntegrationNotes(framework, theme) {
  const notes = [
    'Resolve @vidoxlabs/videsign via pinned git SHA or workspace dependency; sync dist/tokens.json, dist/tokens.ts, and dist/standard.json with a project sync script.',
    'Replace {ASSET_BASE} at build or runtime with the public asset CDN base (never commit internal endpoints).',
    theme === 'light'
      ? 'Set data-theme="light" on <html> and import dist/themes.css alongside dist/tokens.css.'
      : 'Keep Nocturne dark polarity as default (data-theme="dark") on <html>.',
  ];
  if (framework === 'react' || framework === 'nextjs') {
    notes.push('Import typed tokens from dist/tokens.ts (`tokens`, `cssVar`, `token()`) and spread dist/tailwind.config.js into tailwind.config.');
    notes.push('Convert flat HTML fragments per slot into typed TSX view components without introducing runtime CSS-in-JS or arbitrary Tailwind values.');
  } else if (framework === 'svelte') {
    notes.push('Import dist/tokens.css and dist/glass.css in the root +layout.svelte and split each `<!-- slot: <id> -->` block into a Svelte component.');
  } else if (framework === 'astro') {
    notes.push('Wrap slots in semantic `.astro` partials and load client interactivity via external CSP-safe module scripts (no inline <script> or style=).');
  } else {
    notes.push('Serve dist/tokens.css, dist/glass.css, and dist/tailwind.config.js outputs directly from static or edge worker routes with strict CSP.');
  }
  return notes;
}

/**
 * Compile a structured OpenDesign-inspired Design Brief + Keep/Change/Do not copy Reference Contract.
 */
function buildDesignBrief(options = {}, catalog = COMPONENT_CATALOG) {
  const theme = options.theme ? String(options.theme).trim() : 'dark';
  if (!VALID_THEMES.has(theme)) {
    throw new DesignStudioError('INVALID_THEME', `Invalid theme "${theme}". Expected dark or light.`);
  }
  const density = options.density ? String(options.density).trim() : 'balanced';
  if (!VALID_DENSITIES.has(density)) {
    throw new DesignStudioError('INVALID_DENSITY', `Invalid density "${density}". Expected compact, balanced, or spacious.`);
  }
  const viewport = options.viewport ? String(options.viewport).trim() : '1440px';
  if (!VALID_VIEWPORTS.has(viewport)) {
    throw new DesignStudioError('INVALID_VIEWPORT', `Invalid viewport "${viewport}". Expected 1440px, 1024px, or 390px.`);
  }
  const framework = options.framework ? String(options.framework).trim() : 'react';
  if (!VALID_FRAMEWORKS.has(framework)) {
    throw new DesignStudioError('INVALID_FRAMEWORK', `Invalid framework "${framework}". Expected one of ${[...VALID_FRAMEWORKS].join(', ')}.`);
  }

  const resolved = resolveSlots(options, catalog);
  const title = options.title ? String(options.title).trim() : `Vidoxlabs — ${resolved.archetype}`;
  const audience = options.audience ? String(options.audience).trim() : 'Developers, maintainers, and agent-system reviewers';

  return {
    schemaVersion: 'videsign.design-brief/v1',
    adr: 'ADR-023',
    title,
    archetype: resolved.archetype,
    theme,
    density,
    viewport,
    framework,
    audience,
    tokensSource: 'DESIGN.md',
    standardSource: 'dist/standard.json',
    platformOutputs: {
      tokensCss: 'dist/tokens.css',
      themesCss: 'dist/themes.css',
      glassCss: 'dist/glass.css',
      tailwindConfig: 'dist/tailwind.config.js',
      typescript: 'dist/tokens.ts',
      manifest: 'dist/components.manifest.json',
    },
    guardrails: {
      maxGlassLayersPerViewport: 3,
      minTouchTarget: '2.75rem (44px)',
      textContrastFloor: 4.5,
      nonTextContrastFloor: 3.0,
      navMaxLinksBeforeStorefront: 6,
      sentenceCaseOnly: true,
      banArbitraryTailwindValues: true,
    },
    referenceContract: {
      keep: mergeContractList(DEFAULT_REFERENCE_CONTRACT.keep, options.keep),
      change: mergeContractList(DEFAULT_REFERENCE_CONTRACT.change, options.change),
      doNotCopy: mergeContractList(DEFAULT_REFERENCE_CONTRACT.doNotCopy, options.doNotCopy),
    },
    slots: resolved.slots.map((entry, index) => ({
      slot: index + 1,
      id: entry.id,
      file: entry.file,
      uri: `file://${entry.file}`,
      category: entry.category,
      adr: entry.adr,
      consumers: entry.consumers,
      summary: entry.summary,
    })),
    integrationNotes: frameworkIntegrationNotes(framework, theme),
  };
}

/**
 * Assemble an ordered set of verified Nocturne fragments into a multi-slot HTML scaffold.
 */
function scaffoldPage(options = {}, rootDir = DEFAULT_ROOT, catalog = COMPONENT_CATALOG) {
  const brief = buildDesignBrief(options, catalog);
  const wrapDocument = options.wrapDocument !== false;
  const slotHtmlList = [];
  const slotSections = [];

  for (const slot of brief.slots) {
    const absPath = path.join(rootDir, slot.file);
    if (!fs.existsSync(absPath)) {
      throw new DesignStudioError('MISSING_FRAGMENT', `Fragment file "${slot.file}" does not exist on disk.`);
    }
    const rawHtml = fs.readFileSync(absPath, 'utf-8').trim();
    slotHtmlList.push(rawHtml);
    slotSections.push(`<!-- slot:${slot.slot}:${slot.id} (${slot.adr}) -->\n${rawHtml}\n<!-- /slot:${slot.id} -->`);
  }

  const stylesheets = stylesheetsForSlots(slotHtmlList, brief.theme);
  const bodyContent = slotSections.join('\n\n');
  const html = wrapDocument
    ? [
        '<!DOCTYPE html>',
        `<html lang="en" data-theme="${brief.theme}">`,
        '<head>',
        '  <meta charset="UTF-8" />',
        '  <meta name="viewport" content="width=device-width, initial-scale=1.0" />',
        `  <title>${escapeHtml(brief.title)}</title>`,
        ...stylesheets.map((href) => `  <link rel="stylesheet" href="${href}" />`),
        '</head>',
        '<body class="min-h-screen bg-surface-background-primary-base text-text-content-primary-base font-typography-family-sans-base">',
        bodyContent,
        '</body>',
        '</html>',
        '',
      ].join('\n')
    : bodyContent;

  return {
    schemaVersion: 'videsign.page-scaffold/v1',
    adr: 'ADR-023',
    title: brief.title,
    archetype: brief.archetype,
    theme: brief.theme,
    density: brief.density,
    framework: brief.framework,
    stylesheets,
    platformTokens: brief.platformOutputs,
    referenceContract: brief.referenceContract,
    slots: brief.slots,
    integrationNotes: brief.integrationNotes,
    html,
  };
}

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Deterministic dist/components.manifest.json inspired by OpenDesign's project manifest.
 */
function buildComponentsManifest(catalog = COMPONENT_CATALOG, tokens = {}) {
  return {
    schemaVersion: 'videsign.components-manifest/v1',
    canonicalProvenance: 'Vidoxlabs/videsign',
    files: {
      design: 'DESIGN.md',
      ledger: 'SKILL.md',
      standardJson: 'dist/standard.json',
      standardMarkdown: 'dist/standard.md',
      tokensCss: 'dist/tokens.css',
      themesCss: 'dist/themes.css',
      glassCss: 'dist/glass.css',
      tailwindConfig: 'dist/tailwind.config.js',
      typescriptTokens: 'dist/tokens.ts',
    },
    categories: [...CATALOG_CATEGORIES],
    consumers: [...CATALOG_CONSUMERS],
    viewports: ['1440px', '1024px', '390px'],
    archetypes: Object.fromEntries(
      Object.entries(STUDIO_ARCHETYPES).map(([name, ids]) => [name, [...ids]]),
    ),
    referenceContract: DEFAULT_REFERENCE_CONTRACT,
    tokenCounts: Object.fromEntries(
      Object.entries(tokens).map(([cat, entries]) => [cat, Object.keys(entries || {}).length]),
    ),
    componentCount: catalog.length,
    components: catalog.map((entry) => ({
      id: entry.id,
      file: entry.file,
      uri: `file://${entry.file}`,
      category: entry.category,
      adr: entry.adr,
      consumers: [...entry.consumers],
      summary: entry.summary,
    })),
  };
}

module.exports = {
  CATALOG_CATEGORIES,
  CATALOG_CONSUMERS,
  COMPONENT_CATALOG,
  DEFAULT_REFERENCE_CONTRACT,
  DesignStudioError,
  STUDIO_ARCHETYPES,
  buildComponentsManifest,
  buildDesignBrief,
  scaffoldPage,
  stylesheetsForSlots,
};
