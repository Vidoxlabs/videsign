# Engineering Governance Layer

This file governs the engineering, operations, and deployment layer for the `videsign` repository
and interacting agents.

## Repository Architecture

The `videsign` repository is the canonical source of truth for the **Nocturne Museum**
design system — the shared visual language for all Vidoxlabs products and applications.

- **DESIGN.md**: The Visual Truth Layer. Read this file to understand the semantic token
  matrix (`category-role-variant-state`) and negative UI boundaries.
- **SKILL.md**: The Decision Ledger. Read this file immediately upon initialization to
  understand architectural constraints (ADRs) and negative generation guardrails.
- **preview/**: Pure, flat, semantic, state-free HTML fragments for every component.
  Agents inspect these to capture clean structural snippets instead of hallucinating
  framework-specific state logic. `preview/index.html` renders a visual catalog of
  all fragments. Layout compositions are in `preview/layout-*.html`.
- **scripts/generate-tokens.js**: Token generation pipeline. Parses `DESIGN.md` YAML
  front-matter and emits `dist/tailwind.config.js`, `dist/tokens.css`,
  `dist/tokens.json`, `dist/glass.css` (crystal glass with literal Safari-safe
  declarations, ADR-006) and `dist/catalog.css` (Tailwind utilities for the preview
  catalog only). Run `npm run tokens` to regenerate.
- **scripts/lint-preview.js**: Static checks for `preview/*.html` (arbitrary values,
  `shadow-sm`, inline style or script, emoji, overclaiming text, glass scope, nesting and
  layer limit). `npm run lint` runs ESLint and then this script.
- **mcp-server.js**: The MCP server that exposes this design system to product
  repositories for cross-repo token and fragment fetching. Also provides a
  `resolve_token` tool for querying individual token values.
- **assets/**: Local-only design images (gitignored). See `assets/README.md` for the
  naming convention. Raster binaries are not committed. Text-only SVG under `brand/`
  is a proposed exception (ADR-011, awaiting ratification).
- **dist/**: Generated artifacts (gitignored). Produced by `npm run tokens`. Consuming
  repos import `dist/tailwind.config.js` or `dist/tokens.css` from this repo.
- **brand/**: Brand v1 mark C masters (text-only SVG, ADR-011). See `brand/README.md`
  and `brand/MANIFEST.json`. Do not redraw the mark.

## AI Agent Initialization & Cross-Repo Fetching

When an AI agent initializes in any product repository that consumes this design system,
it MUST execute the following routine:

1. **Query MCP Server**: Query the `videsign` MCP server (`npm run mcp`) to fetch the
   latest unified specifications.
2. **Fetch Tokens**: Read the YAML front-matter from `DESIGN.md` via MCP to understand
   the available `category-role-variant-state` tokens.
3. **Inspect Fragments**: Use the `preview/` HTML fragments exposed via MCP to capture
   clean structural snippets instead of hallucinating framework-specific state logic.

## Approved CLI Commands

Within the `videsign` repository, agents are restricted to the following commands:

- `npm run lint`: Executes ESLint and then `scripts/lint-preview.js`, which checks the
  preview fragments (ESLint alone never saw them).
- `npm run mcp`: Starts the local MCP server for cross-repo communication.
- `npm run tokens`: Parses `DESIGN.md` and regenerates `dist/tailwind.config.js`,
  `dist/tokens.css`, and `dist/tokens.json`. Run this after modifying tokens in
  `DESIGN.md`.
- `npm test`: Runs the MCP stdio smoke test, the token contract tests
  (`test/tokens.test.js`) and the preview fragment contract (`test/preview.test.js`).
  Run this after changing `mcp-server.js`, `DESIGN.md` tokens or any fragment.

## `{ASSET_BASE}` resolution

The `{ASSET_BASE}` placeholder appears in `DESIGN.md`, `SKILL.md`, and preview fragments.
It is a build-time variable that consuming repos resolve to their CDN endpoint. This
repository does not define the value — each product repo sets it in its environment:

- **Vite**: `import.meta.env.VITE_ASSET_BASE` or a define plugin replacement
- **Next.js**: `next.config.js` env or `process.env.ASSET_BASE`
- **Static HTML**: string replacement at deploy time

Never hardcode a URL in place of `{ASSET_BASE}`. Always use the placeholder.

## Token Matrix Format

All design tokens follow the 4-part semantic matrix: `category-role-variant-state`.

| Part       | Examples                                   | Description                         |
| ---------- | ------------------------------------------ | ----------------------------------- |
| category   | `colors`, `typography`, `effects`, `spacing` | Token domain                        |
| role       | `surface-background`, `text-content`, `status-indicator` | Functional role within the category |
| variant    | `primary`, `secondary`, `violet`, `success` | Specific variant of the role        |
| state      | `base`, `hover`, `active`                  | Interaction state                   |

Agents bind tokens using the reference syntax: `{colors.surface-background-primary-base}`.
Never invent tokens outside this matrix. If a needed value is missing, add it to
`DESIGN.md` first, then reference it.

## AST Validation Pipeline

Agents must never introduce arbitrary UI values (e.g., `w-[15px]`, `text-[#FF0000]`). The
`tailwindcss/no-arbitrary-value` ESLint rule strictly enforces the use of explicitly defined design
tokens from the semantic matrix. Any generated code must pass `npm run lint`.

## Brand rules for agents

The live persona accents are the `DESIGN.md` matrix. Those older persona hexes are being retired. `brand/tokens.json` holds the target signatures, and they become the persona accents in a follow-up after the canon record lands. Until that follow-up, do not treat the brand file as the live matrix, and do not invent a replacement hex.

The canon palette file lands with that canon record. It is not a dependency of this branch. Brand artwork uses the target signatures in `brand/tokens.json`: Violet `#8B5CF6`, Wisteria `#B4A7F2`, Xylia `#D92B3A`, Yarrow `#F0A020`, Zinnia `#E13D9E`. Field tiles are `#121214` and `#F7F7F5`.

Do not draw or approximate the mark. Reference a file in `brand/` by family and version (`brand_{asset}_{variant}_v{NNN}.{ext}`). `on-dark` and `on-light` would name the field, not the ink. Shipped masters keep the brand-index filenames. Versions are not reused.

Full colour is for the dark field. Do not place the full-colour mark on the light field `#F7F7F5`.

#7C3AED is to be retired once ADR-011 is ratified. Use Persona Violet `#8B5CF6` for those fills and rings, and follow the interim contrast rule in `brand/README.md` (pending the owner): no normal-size label of any colour on that violet. The `DESIGN.md` value of `{colors.surface-accent-violet-base}` stays `#7C3AED` until a follow-up changes it.

Xylia is never text and never appears alone. Do not build a gradient between the five signature colours. Text-safe Xylia and text-safe Zinnia are pending. Do not define them.

Being retired for brand artwork: teal `#2DD4BF` and rose `#F43F5E` as persona colours, `#7226FA`, `#A78BFA`, the V-shield mark, the chevron favicon, `cube.png` paths, and Inter. They remain the `DESIGN.md` persona values until the follow-up. Status error `#F43F5E` and status warning `#F59E0B` stay status tokens.

Promoted masters live at the path `design_system/brand/`. Cite that path by name only.
