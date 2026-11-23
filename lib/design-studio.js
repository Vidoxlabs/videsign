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
    summary: 'Solid conversation canvas with empty and active states, a seat switcher, first-turn starters and a floating composer.',
  },
  {
    id: 'chat-dock',
    file: 'preview/chat-dock.html',
    category: 'conversation',
    adr: 'ADR-013',
    consumers: ['vidoxlabs.dev'],
    summary: 'Solid non-modal chat dock with the shared compact composer, above a five-bar launcher.',
  },
  {
    id: 'group-conversation',
    file: 'preview/group-conversation.html',
    category: 'conversation',
    adr: 'ADR-020',
    consumers: ['bloom'],
    summary: 'Solid multi-agent thread with monogram speaker changes, expandable neutral traces, artifacts, approval and turn receipts.',
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
    id: 'question-bar',
    file: 'preview/question-bar.html',
    category: 'conversation',
    adr: 'ADR-006',
    consumers: ['vidoxlabs.dev', 'bloom'],
    summary: 'Crystal-glass shell-and-core pill search and question bar pairing an accessible text input with a large brand-accent submit trigger.',
  },
  {
    id: 'context-attachment-tray',
    file: 'preview/context-attachment-tray.html',
    category: 'conversation',
    adr: 'ADR-020',
    consumers: ['bloom', 'seed', 'vidoxlabs.dev'],
    summary: 'Composer-adjacent tray listing admitted files, recalled notes, and selections with tabular token budget and 44px Remove/Clear controls.',
  },
  {
    id: 'session-checkpoint-card',
    file: 'preview/session-checkpoint-card.html',
    category: 'conversation',
    adr: 'ADR-020',
    consumers: ['seed', 'bloom', 'vidoxlabs.dev'],
    summary: 'Resumable thread checkpoint anchoring the last confirmed pause and present resume event with a bounded-reference summary fence and 44px resume actions.',
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
    id: 'tool-call-trace-card',
    file: 'preview/tool-call-trace-card.html',
    category: 'agent-workspace',
    adr: 'ADR-021',
    consumers: ['bloom', 'seed', 'vitools'],
    summary: 'Expandable details/summary trace card for neutral tool invocations showing status dot + label, latency, JSON arguments, output receipt and Copy action.',
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
    summary: 'Agent workspace with a responsive session rail, settings menu, solid conversation canvas and collapsible run inspector.',
  },
  {
    id: 'settings-quick-menu',
    file: 'preview/settings-quick-menu.html',
    category: 'agent-workspace',
    adr: 'ADR-024',
    consumers: ['bloom', 'seed', 'vidoxlabs.dev', 'videsign'],
    summary: 'Compact crystal-glass sidebar quick-settings popover grouping usage telemetry, Dark/Light theme switcher, motion and developer receipt switches, workspace links, and All settings trigger.',
  },
  {
    id: 'settings-surface',
    file: 'preview/settings-surface.html',
    category: 'agent-workspace',
    adr: 'ADR-024',
    consumers: ['bloom', 'seed', 'vidoxlabs.dev', 'videsign'],
    summary: 'Solid two-pane Settings dialog with searchable four-group left rail, General/Export/Danger Zone, neutral model routing and tool connectors, local nodes ledger, and policy/credential/memory panes.',
  },
  {
    id: 'layout-settings',
    file: 'preview/layout-settings.html',
    category: 'agent-workspace',
    adr: 'ADR-024',
    consumers: ['bloom', 'seed', 'videsign'],
    summary: 'Full-viewport responsive Settings layout recomposing between desktop two-pane (1440px), tablet split (1024px), and mobile single-column section drill-down (390px).',
  },
  {
    id: 'plugin-connector-row',
    file: 'preview/plugin-connector-row.html',
    category: 'agent-workspace',
    adr: 'ADR-021',
    consumers: ['bloom', 'seed', 'videsign'],
    summary: 'Health-triage row with a provider binding, masked lease, per-connector permission, and expandable neutral tool scopes.',
  },
  {
    id: 'plugins-connectors-surface',
    file: 'preview/plugins-connectors-surface.html',
    category: 'agent-workspace',
    adr: 'ADR-021',
    consumers: ['bloom', 'seed', 'videsign'],
    summary: 'Solid plugin manager with ownership and category filters, default policy, pinned connection issues and an available catalog.',
  },
  {
    id: 'custom-connector-drawer',
    file: 'preview/custom-connector-drawer.html',
    category: 'agent-workspace',
    adr: 'ADR-024',
    consumers: ['bloom', 'seed', 'videsign'],
    summary: 'Solid connector form with transport, realm, lease and policy fields and a metadata-only pre-admission check.',
  },
  {
    id: 'skills-library-surface',
    file: 'preview/skills-library-surface.html',
    category: 'agent-workspace',
    adr: 'ADR-024',
    consumers: ['bloom', 'seed', 'vitools', 'videsign'],
    summary: 'Canvas-first Skills Library surface with JIT token budget header, ownership tabs, category pills, Subgrid cards, Auto-trigger vs Manual only switches, and a solid SKILL.md inspector drawer.',
  },
  {
    id: 'agents-library-surface',
    file: 'preview/agents-library-surface.html',
    category: 'agent-workspace',
    adr: 'ADR-024',
    consumers: ['bloom', 'seed', 'videsign'],
    summary: 'Agents and Routines Roster separating the five quarantined sovereign VWXYZ persona seats from on-demand specialists and scheduled routines with explicit approval posture and handoff tags.',
  },
  {
    id: 'projects-library-surface',
    file: 'preview/projects-library-surface.html',
    category: 'agent-workspace',
    adr: 'ADR-024',
    consumers: ['bloom', 'seed', 'videsign'],
    summary: 'Projects Directory and two-zone Project Detail Workspace combining hairline project rows, Threads/Sources/Activity tabs, an embedded scoped composer, immutable source budget meter, and explicit memory isolation policy.',
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
    id: 'comparison-matrix',
    file: 'preview/comparison-matrix.html',
    category: 'public-continuity',
    adr: 'ADR-021',
    consumers: ['vidoxlabs.dev', 'vitools'],
    summary: 'Accessible multi-column capability comparison table with semantic row headers, Supported, Planned, and Out of scope state pairs, and an observation-scope footnote.',
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
    id: 'mobile-navigation-sheet',
    file: 'preview/mobile-navigation-sheet.html',
    category: 'public-continuity',
    adr: 'ADR-023',
    consumers: ['vidoxlabs.dev'],
    summary: 'Solid secondary mobile navigation dialog below the 768px breakpoint with six bounded routes, aria-current page state, motion pause, and footer continuity strip.',
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
    id: 'bento-feature-grid',
    file: 'preview/bento-feature-grid.html',
    category: 'public-continuity',
    adr: 'ADR-023',
    consumers: ['vidoxlabs.dev'],
    summary: 'Gapless asymmetric bento grid with exact six-card cell math, tabular-nums evidence counters, and bottom-aligned 44px actions covering the public ecosystem planes.',
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
    id: 'critique-thread-panel',
    file: 'preview/critique-thread-panel.html',
    category: 'design-studio',
    adr: 'ADR-023',
    consumers: ['videsign', 'bloom', 'vidoxlabs.dev'],
    summary: 'Slot-anchored critique thread with Keep / Change / Do not copy classification chips, polite open/resolved state, and a critique composer.',
  },
  {
    id: 'viewport-frame-set',
    file: 'preview/viewport-frame-set.html',
    category: 'design-studio',
    adr: 'ADR-023',
    consumers: ['videsign', 'vidoxlabs.dev'],
    summary: 'The three standard studio viewports (1440px, 1024px, 390px) as labelled schematic frames recomposing the same slot stack with static tertiary bands.',
  },
  {
    id: 'brief-contract-card',
    file: 'preview/brief-contract-card.html',
    category: 'design-studio',
    adr: 'ADR-023',
    consumers: ['videsign', 'bloom', 'vidoxlabs.dev'],
    summary: 'Standalone structured brief dl (archetype, theme, density, viewport) beside the Keep / Change / Do not copy reference contract with a brief-JSON copy control.',
  },
  {
    id: 'guardrail-receipt-panel',
    file: 'preview/guardrail-receipt-panel.html',
    category: 'design-studio',
    adr: 'ADR-023',
    consumers: ['videsign', 'vidoxlabs.dev'],
    summary: 'Polite guardrail receipt pairing text contrast, graph line, glass layers, arbitrary-class and scaffold-tool bounds with export and inspection actions.',
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
    id: 'article-toc-and-meta',
    file: 'preview/article-toc-and-meta.html',
    category: 'public-continuity',
    adr: 'ADR-023',
    consumers: ['vidoxlabs.dev', 'videsign'],
    summary: 'Editorial sidebar rail pairing 44px section jump links, separated Reviewed vs Observed dates, read time, Markdown/llms.txt links, BibTeX, and Ask Violet triggers.',
  },
  {
    id: 'docs-sidebar-nav',
    file: 'preview/docs-sidebar-nav.html',
    category: 'public-continuity',
    adr: 'ADR-024',
    consumers: ['vidoxlabs.dev', 'videsign', 'vitools'],
    summary: 'Collapsible documentation tree with sentence-case mono <details> groups, aria-current page hairline indicator, 44px rows, and external link markers.',
  },
  {
    id: 'docs-quickstart-grid',
    file: 'preview/docs-quickstart-grid.html',
    category: 'public-continuity',
    adr: 'ADR-024',
    consumers: ['vidoxlabs.dev', 'videsign', 'vitools'],
    summary: 'Faceted documentation quickstart grid with eyebrow hairline header, Copy section link, aria-pressed category pills, polite count, and tabular completion-time footers.',
  },
  {
    id: 'docs-page-actions',
    file: 'preview/docs-page-actions.html',
    category: 'public-continuity',
    adr: 'ADR-024',
    consumers: ['vidoxlabs.dev', 'videsign', 'vitools'],
    summary: 'Documentation right-rail utility actions pairing Copy page (.md), View raw .md, llms.txt discovery link, and Ask Violet about this page dock trigger.',
  },
  {
    id: 'layout-docs-portal',
    file: 'preview/layout-docs-portal.html',
    category: 'public-continuity',
    adr: 'ADR-024',
    consumers: ['vidoxlabs.dev', 'videsign', 'vitools'],
    summary: 'Three-column responsive documentation portal uniting crystal-glass header island, Cmd+K palette, collapsible nav rail, Docs Hub + 72ch Article/API canvas, and scroll-spy TOC rail.',
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
    id: 'command-palette-dialog',
    file: 'preview/command-palette-dialog.html',
    category: 'ui-primitives',
    adr: 'ADR-024',
    consumers: ['bloom', 'vidoxlabs.dev', 'videsign', 'seed'],
    summary: 'Solid keyboard-first command palette dialog with focus-visible search header, grouped 44px command rows, shortcut badges and hint footer.',
  },
  {
    id: 'file-dropzone-upload',
    file: 'preview/file-dropzone-upload.html',
    category: 'ui-primitives',
    adr: 'ADR-024',
    consumers: ['bloom', 'seed', 'videsign'],
    summary: 'Dashed file dropzone stating explicit MIME and byte ceilings beside a hairline attachment queue with status-dot states and 44px Remove actions.',
  },
  {
    id: 'kpi-metric-strip',
    file: 'preview/kpi-metric-strip.html',
    category: 'ui-primitives',
    adr: 'ADR-024',
    consumers: ['vidoxlabs.dev', 'bloom', 'seed'],
    summary: 'Responsive four-card KPI summary strip with tabular-nums figures, status-dot + text deltas, and explicit measurement window labels.',
  },
  {
    id: 'drawer-inspector-sheet',
    file: 'preview/drawer-inspector-sheet.html',
    category: 'ui-primitives',
    adr: 'ADR-024',
    consumers: ['bloom', 'vidoxlabs.dev', 'videsign'],
    summary: 'Solid slide-over record inspector dialog with 44px Close control, section tabs, hairline metadata dl, payload preview, and footer actions.',
  },
  {
    id: 'skeleton-row',
    file: 'preview/skeleton-row.html',
    category: 'ui-primitives',
    adr: 'ADR-008',
    consumers: ['vidoxlabs.dev', 'bloom', 'seed'],
    summary: 'Static zero-shimmer tertiary loading row matched to resolved row geometry so data arrival causes zero layout shift.',
  },
  {
    id: 'toast-notification-stack',
    file: 'preview/toast-notification-stack.html',
    category: 'ui-primitives',
    adr: 'ADR-024',
    consumers: ['vidoxlabs.dev', 'bloom', 'seed', 'videsign'],
    summary: 'Non-blocking notification stack pairing polite status and assertive alert rows with status dots, explicit labels, one recovery action, and 44px dismiss controls.',
  },
  {
    id: 'multi-step-stepper',
    file: 'preview/multi-step-stepper.html',
    category: 'ui-primitives',
    adr: 'ADR-024',
    consumers: ['vidoxlabs.dev', 'bloom', 'seed', 'videsign'],
    summary: 'Reusable setup stepper with an ordered list, tabular step numbers, Completed, In progress, Up next, and Blocked states, and >= 3:1 meaning-bearing connectors.',
  },
  {
    id: 'search-and-filter-bar',
    file: 'preview/search-and-filter-bar.html',
    category: 'ui-primitives',
    adr: 'ADR-024',
    consumers: ['vidoxlabs.dev', 'vitools', 'bloom', 'seed'],
    summary: 'Standalone search, facet, chip, and sort toolbar with visible-focus input, aria-pressed facet pills, removable filter chips, and a polite match counter.',
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
    id: 'docs-code-tabs',
    file: 'preview/docs-code-tabs.html',
    category: 'markdown-and-code',
    adr: 'ADR-024',
    consumers: ['vidoxlabs.dev', 'videsign', 'seed', 'vitools'],
    summary: 'Synced multi-language code switcher (TypeScript, Python, cURL, CLI) with height-stable panels, roving arrow-key navigation, localStorage memory, and one-click Copy receipt.',
  },
  {
    id: 'log-stream-viewer',
    file: 'preview/log-stream-viewer.html',
    category: 'markdown-and-code',
    adr: 'ADR-024',
    consumers: ['seed', 'bloom', 'vitools'],
    summary: 'Solid run-log console with a role="log" polite region, tabular-nums timestamps, status-dot severity pairs and a Pause tail toggle.',
  },
  {
    id: 'api-reference-row',
    file: 'preview/api-reference-row.html',
    category: 'markdown-and-code',
    adr: 'ADR-024',
    consumers: ['seed', 'vidoxlabs.dev', 'vitools'],
    summary: 'Endpoint reference rows pairing protocol method chips and mono paths with ADR-021 effect classes (read, write, destructive, credential).',
  },
  {
    id: 'changelog-timeline',
    file: 'preview/changelog-timeline.html',
    category: 'markdown-and-code',
    adr: 'ADR-024',
    consumers: ['vidoxlabs.dev', 'vitools', 'seed'],
    summary: 'Release-notes timeline with version chips, tabular dates, an unreleased block, and Added / Changed / Fixed / Planned hairline ledger rows.',
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
    id: 'vi-orbital-field',
    file: 'preview/vi-orbital-field.html',
    category: 'graphic-maps',
    adr: 'ADR-024',
    consumers: ['vidoxlabs.dev', 'bloom', 'videsign'],
    summary: 'Zero-hex oklch() Canvas 2D orbital capsule hero background with 6-state agentic modulation, pointer repulsion wake, radial clarity scrim, and deterministic reduced-motion fallback.',
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
    id: 'memory-graph-explorer',
    file: 'preview/memory-graph-explorer.html',
    category: 'graphic-maps',
    adr: 'ADR-018',
    consumers: ['videsign', 'bloom'],
    summary: 'Spatial workspace with scene search, one-hop focus, layout and minimap controls, and a solid responsive legend. The browser specimen uses a local sample dataset.',
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
    id: 'persona-switcher',
    file: 'preview/persona-switcher.html',
    category: 'persona-canon',
    adr: 'ADR-006',
    consumers: ['vidoxlabs.dev', 'bloom'],
    summary: 'Crystal-glass shell-and-core five-seat tablist with roving focus, 44px tabs, and locked persona accent dots.',
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
  {
    id: 'credential-activity-ledger',
    file: 'preview/credential-activity-ledger.html',
    category: 'harness-contracts',
    adr: 'ADR-021',
    consumers: ['seed', 'bloom', 'vitools'],
    summary: 'Credential-effect binding ledger with scope, masked reference, rotation and Active / Expired / Revoked state pairs; the secret value never renders.',
  },
  {
    id: 'policy-rule-matrix',
    file: 'preview/policy-rule-matrix.html',
    category: 'harness-contracts',
    adr: 'ADR-021',
    consumers: ['seed', 'bloom', 'vitools'],
    summary: 'Responsive hairline governance table mapping neutral tool patterns and effect classes to Allow, Ask owner, and Deny scope boundaries.',
  },
  {
    id: 'provider-model-selector',
    file: 'preview/provider-model-selector.html',
    category: 'harness-contracts',
    adr: 'ADR-021',
    consumers: ['seed', 'bloom'],
    summary: 'Neutral provider and model routing selector with local and remote slots, tabular context and latency readouts, and an ordered fallback chain ending in a typed hold.',
  },
  {
    id: 'locked-panel',
    file: 'preview/locked-panel.html',
    category: 'harness-contracts',
    adr: 'ADR-016',
    consumers: ['vidoxlabs.dev', 'seed', 'bloom'],
    summary: 'Fail-closed holdback surface keeping controls disabled with explicit unlock conditions and current state until gates clear.',
  },
];

/** Ordered page/app archetypes for brief compilation and page scaffolding. */
const STUDIO_ARCHETYPES = {
  'public-site-landing': [
    'site-header-island',
    'mobile-navigation-sheet',
    'hero-billboard',
    'bento-feature-grid',
    'systems-constellation-map',
    'public-repo-card',
    'ecosystem-plane-map',
    'filterable-catalog-grid',
    'site-footer',
  ],
  'repository-showcase': [
    'site-header-island',
    'public-repo-card',
    'comparison-matrix',
    'systems-constellation-map',
    'run-lifecycle-strip',
    'code-and-diff-viewer',
    'api-reference-row',
    'changelog-timeline',
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
    'policy-rule-matrix',
    'receipt-ledger-row',
    'site-footer',
  ],
  'research-library-article': [
    'site-header-island',
    'article-toc-and-meta',
    'markdown-prose-renderer',
    'claim-maturity-badge',
    'statement-proof-row',
    'evidence-exhibit-figure',
    'receipt-ledger-row',
    'site-footer',
  ],
  'docs-portal': [
    'layout-docs-portal',
    'docs-sidebar-nav',
    'docs-quickstart-grid',
    'docs-code-tabs',
    'docs-page-actions',
    'markdown-prose-renderer',
    'article-toc-and-meta',
    'api-reference-row',
    'command-palette-dialog',
    'mobile-navigation-sheet',
  ],
  'persona-companion-showcase': [
    'site-header-island',
    'persona-switcher',
    'persona-companion-stage',
    'persona-deliberation-stepper',
    'conversation-surface',
    'speaker-marker',
    'site-footer',
  ],
  'agent-harness-workstation': [
    'layout-agent-workspace',
    'group-conversation',
    'session-checkpoint-card',
    'context-attachment-tray',
    'owner-approval-gate',
    'tool-call-trace-card',
    'shared-desktop-catalog',
    'artifact-lineage-reader',
    'agent-roster-card',
    'team-memory-notes',
    'cross-team-handoff',
    'usage-budget-meter',
    'provider-model-selector',
    'log-stream-viewer',
    'policy-rule-matrix',
    'credential-activity-ledger',
  ],
  'settings-workspace': [
    'layout-settings',
    'settings-quick-menu',
    'settings-surface',
    'provider-model-selector',
    'policy-rule-matrix',
    'credential-activity-ledger',
    'usage-budget-meter',
  ],
  'workspace-library': [
    'skills-library-surface',
    'agents-library-surface',
    'projects-library-surface',
    'layout-agent-workspace',
    'filterable-catalog-grid',
    'drawer-inspector-sheet',
  ],
  'collaborative-design-studio': [
    'site-header-island',
    'brief-contract-card',
    'viewport-frame-set',
    'critique-thread-panel',
    'guardrail-receipt-panel',
    'hero-billboard',
    'public-repo-card',
    'site-footer',
  ],
  'ui-primitives-kitchen-sink': [
    'form-controls',
    'button-variants',
    'navigation-primitives',
    'command-palette-dialog',
    'file-dropzone-upload',
    'kpi-metric-strip',
    'drawer-inspector-sheet',
    'feedback-and-empty-states',
    'toast-notification-stack',
    'multi-step-stepper',
    'search-and-filter-bar',
    'disclosure-and-modals',
    'skeleton-row',
    'markdown-prose-renderer',
    'code-and-diff-viewer',
    'log-stream-viewer',
    'api-reference-row',
    'changelog-timeline',
    'data-table',
  ],
};

/** Keep / Change / Do not copy reference contract for rebuilding vidoxlabs.dev cleanly. */
const DEFAULT_REFERENCE_CONTRACT = {
  keep: [
    'Nocturne Museum dark canvas (#0A0A0E primary, #12121A secondary, #1C1C24 tertiary) and #27272A hairline separators',
    'Geist + Geist Mono typography in sentence case with tabular-nums figures and balanced headlines (text-balance)',
    'Crystal glass (vi-glass-shell + vi-glass-core) capped at 3 layers per viewport on navigation/overlays only',
    'Minimum 44px (2.75rem) interactive targets, 4.5:1 text contrast floor, and 3:1 non-text graph-line floor',
    'Status indicators always paired with visible text labels; five VWXYZ signature colours rendered together only',
    'WCAG 2.2.2 visible Pause background motion control in footer, reduced-motion stillness, and smooth token transitions',
    'Keyboard focus visibility (focus-within/focus-visible violet borders), min-h-dvh viewport stability, and skip-to-content navigation',
  ],
  change: [
    'Replace legacy static Astro pages and retired internal infrastructure references with dynamic modular components',
    'Center site navigation and architecture copy on the four published repositories: seed, bloom, videsign, and vitools',
    'Use the four generalized planes (Surfaces, Harness, Providers, Authority stores) and explicit claim maturity badges',
    'Hold navigation at six top-level links plus Chat trigger until the storefront is launched',
    'Apply Tufte data-ink clarity, Miller cognitive chunking (<= 7 items per group), non-wrapping CTAs (whitespace-nowrap), and bottom-aligned grid actions',
  ],
  doNotCopy: [
    'Retired internal container names, hostnames, private endpoints, or internal-only lexicon',
    'Arbitrary Tailwind brackets (w-[...]), raw weight utilities (font-semibold/bold), uppercase transforms, or 32px radii',
    'Colour-only status dots, Xylia crimson text, persona accents on non-persona agents, or shadow-sm dropshadows',
    'Unbacked claims or prohibited authority copy inside chrome (including overclaiming labels)',
    'Em-dashes or en-dashes in UI copy, AI copywriting cliches, h-screen (100vh), bare outline-none focus removal, or nested box-in-box clutter',
  ],
};

/**
 * Proactive Design Craft, Visual Hierarchy, and Anti-Slop Protocol (ADR-025).
 * Harmonizes visual-hierarchy-scaffolding, design-taste-frontend, redesign-existing-projects,
 * high-end-visual-design, gpt-taste, image-to-code, and full-output-enforcement under Nocturne ADRs.
 */
const ARCHETYPE_DIALS = {
  'public-site-landing': { variance: 7, motion: 5, visualDensity: 3 },
  'repository-showcase': { variance: 6, motion: 4, visualDensity: 4 },
  'tool-and-skill-catalog': { variance: 5, motion: 3, visualDensity: 5 },
  'interactive-check-lab': { variance: 4, motion: 4, visualDensity: 5 },
  'research-library-article': { variance: 5, motion: 3, visualDensity: 3 },
  'docs-portal': { variance: 5, motion: 3, visualDensity: 5 },
  'persona-companion-showcase': { variance: 7, motion: 6, visualDensity: 3 },
  'agent-harness-workstation': { variance: 3, motion: 3, visualDensity: 7 },
  'settings-workspace': { variance: 4, motion: 3, visualDensity: 6 },
  'workspace-library': { variance: 5, motion: 3, visualDensity: 6 },
  'collaborative-design-studio': { variance: 5, motion: 4, visualDensity: 5 },
  'ui-primitives-kitchen-sink': { variance: 4, motion: 3, visualDensity: 5 },
};

const DENSITY_TO_SCALE = {
  spacious: 3,
  balanced: 5,
  compact: 7,
};

const PROACTIVE_DESIGN_PROTOCOL = {
  adr: 'ADR-025',
  status: 'Proposed',
  workflow: [
    'Declare a one-line Design Read (surface kind, audience, Nocturne archetype, and dials) before authoring code.',
    'Audit existing components via component_catalog first (Scan -> Diagnose -> Fix) so agents extend rather than duplicate.',
    'Enforce visual hierarchy: F-pattern top-left focal status/actions, Miller <= 7 entities per section/group, Tufte data-ink restraint (avoid nested box-in-box clutter), and Gestalt container proximity.',
    'Complete every interactive state cycle: default, hover (token transition), active tactile response, visible keyboard focus, loading (static skeleton-row), empty, and inline error.',
    'Deliver unabridged, runnable output with zero placeholder stubs (no // ..., TODO, or abbreviated middle sections) and pass all pre-flight checks.',
  ],
  hierarchyRules: {
    maxEntitiesPerGroup: 7,
    eyebrowCapRule: 'At most 1 micro-label eyebrow per 3 page sections; never numbered eyebrows (01 / INDEX, Stage 1).',
    heroLineCap: 2,
    heroSubcopyMaxWords: 20,
    maxMiddleDotsPerLine: 1,
    proseMaxMeasure: '65ch (max-w-prose)',
    bentoGridRule: 'Exact N-item cell count with grid-flow-dense and zero empty void cells.',
  },
  antiSlopBans: [
    'Zero em-dashes or en-dashes in visible UI text',
    'Zero AI copywriting cliches (Elevate, Seamless, Unleash, Next-Gen, Game-changer, Delve, John Doe, Acme, Lorem Ipsum)',
    'Zero bare outline-none without an explicit focus-within or focus-visible indicator',
    'Zero raw h-screen or min-h-screen (use min-h-dvh / h-dvh for mobile viewport stability)',
    'Zero external placeholder image services (via.placeholder.com, picsum.photos, placehold.co, placekitten.com, unsplash); use local solid-color placeholder divs',
    'Zero wrapping single-action CTA buttons on desktop (use whitespace-nowrap and concise 1-3 word labels)',
    'Zero duplicate CTA intents on the same view and zero nested card-inside-card-inside-card stacks',
  ],
  preFlightChecklist: [
    'One-line Design Read and explicit variance / motion / visualDensity dials declared',
    'Zero em-dashes or en-dashes and zero AI copywriting cliches in visible text',
    'Every interactive control meets 44px floor, has smooth token transition, non-wrapping CTA label, and visible keyboard focus',
    'Headlines use text-balance (hero <= 2 lines, subcopy <= 20 words) and body prose constrains width',
    'Page shells use min-h-dvh + overflow-x-hidden, include a skip-to-content link, and collapse cleanly below 768px',
    'Sections stay <= 7 functional entities (sub-grouped above 7) with bottom-aligned card-grid actions and zero empty bento voids',
    'All loading, empty, and inline error states present; zero placeholder stubs or truncated code',
    'Tokens regenerated and all lint, test, canon, and public-safety gates verified with exit 0',
  ],
};

function inferDials(archetype, density, overrides = {}) {
  const base = ARCHETYPE_DIALS[archetype] || { variance: 5, motion: 4, visualDensity: 5 };
  const visualDensity = DENSITY_TO_SCALE[density] || base.visualDensity;
  const variance = overrides.variance !== undefined ? Number(overrides.variance) : base.variance;
  const motion = overrides.motion !== undefined ? Number(overrides.motion) : base.motion;
  for (const [label, value] of [['variance', variance], ['motion', motion]]) {
    if (!Number.isInteger(value) || value < 1 || value > 10) {
      throw new DesignStudioError('INVALID_DIAL', `Invalid ${label} dial "${overrides[label]}". Expected integer 1 to 10.`);
    }
  }
  return { variance, motion, visualDensity };
}

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
  if (/\bvi-graph-explorer\b/.test(combined)) sheets.push('dist/memory-graph-explorer.css');
  if (/vi-agent/.test(combined)) sheets.push('dist/dialects.css');
  if (/vi-orbital/.test(combined)) sheets.push('dist/vi-orbital-hero.css');
  if (/vi-docs-/.test(combined)) sheets.push('dist/docs-portal.css');
  if (/\bvi-(?:chat-stage|composer)\b/.test(combined)) sheets.push('dist/chat.css');
  if (/vi-settings-/.test(combined)) sheets.push('dist/settings-surface.css');
  if (/\b(?:vi-plugins-stage|data-plugin-(?:embed|launch))\b/.test(combined)) sheets.push('dist/plugins.css');
  if (/vi-library-|vi-project-/.test(combined)) sheets.push('dist/library-surface.css');
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
  const dials = inferDials(resolved.archetype, density, options);
  const title = options.title ? String(options.title).trim() : `Vidoxlabs - ${resolved.archetype}`;
  const audience = options.audience ? String(options.audience).trim() : 'Developers, maintainers, and agent-system reviewers';
  const designRead = `Reading this as: ${resolved.archetype} for ${audience}, on Nocturne ${theme} (${density} density; variance ${dials.variance}/10, motion ${dials.motion}/10, visualDensity ${dials.visualDensity}/10) targeting ${framework} at ${viewport}.`;

  return {
    schemaVersion: 'videsign.design-brief/v1',
    adr: 'ADR-023',
    title,
    designRead,
    archetype: resolved.archetype,
    theme,
    density,
    dials,
    viewport,
    framework,
    audience,
    tokensSource: 'DESIGN.md',
    standardSource: 'dist/standard.json',
    platformOutputs: {
      tokensCss: 'dist/tokens.css',
      themesCss: 'dist/themes.css',
      glassCss: 'dist/glass.css',
      chatCss: 'dist/chat.css',
      pluginsCss: 'dist/plugins.css',
      memoryGraphCss: 'dist/memory-graph-explorer.css',
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
      maxEntitiesPerGroup: PROACTIVE_DESIGN_PROTOCOL.hierarchyRules.maxEntitiesPerGroup,
      sentenceCaseOnly: true,
      banArbitraryTailwindValues: true,
      banEmDash: true,
      banRawViewportHeight: true,
      banPlaceholderImageServices: true,
      requireVisibleFocus: true,
    },
    preFlightChecklist: [...PROACTIVE_DESIGN_PROTOCOL.preFlightChecklist],
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
  const usesMemoryGraph = stylesheets.includes('dist/memory-graph-explorer.css');
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
        ...(usesMemoryGraph ? ['  <script src="dist/memory-graph-explorer.js" defer></script>'] : []),
        '</head>',
        '<body class="min-h-dvh overflow-x-hidden bg-surface-background-primary-base text-text-content-primary-base font-typography-family-sans-base">',
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
    designRead: brief.designRead,
    archetype: brief.archetype,
    theme: brief.theme,
    density: brief.density,
    dials: brief.dials,
    framework: brief.framework,
    stylesheets,
    platformTokens: brief.platformOutputs,
    referenceContract: brief.referenceContract,
    preFlightChecklist: brief.preFlightChecklist,
    slots: brief.slots,
    integrationNotes: usesMemoryGraph
      ? [...brief.integrationNotes, 'Load dist/memory-graph-explorer.js for the sample. Serve dist/memory-graph-explorer.json beside it.']
      : brief.integrationNotes,
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
      chatCss: 'dist/chat.css',
      pluginsCss: 'dist/plugins.css',
      tailwindConfig: 'dist/tailwind.config.js',
      typescriptTokens: 'dist/tokens.ts',
      memoryGraphCss: 'dist/memory-graph-explorer.css',
    },
    categories: [...CATALOG_CATEGORIES],
    consumers: [...CATALOG_CONSUMERS],
    viewports: ['1440px', '1024px', '390px'],
    archetypes: Object.fromEntries(
      Object.entries(STUDIO_ARCHETYPES).map(([name, ids]) => [name, [...ids]]),
    ),
    referenceContract: DEFAULT_REFERENCE_CONTRACT,
    proactiveProtocol: PROACTIVE_DESIGN_PROTOCOL,
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
  ARCHETYPE_DIALS,
  CATALOG_CATEGORIES,
  CATALOG_CONSUMERS,
  COMPONENT_CATALOG,
  DEFAULT_REFERENCE_CONTRACT,
  DesignStudioError,
  PROACTIVE_DESIGN_PROTOCOL,
  STUDIO_ARCHETYPES,
  buildComponentsManifest,
  buildDesignBrief,
  inferDials,
  scaffoldPage,
  stylesheetsForSlots,
};
