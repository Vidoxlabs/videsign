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
  `dist/tokens.json`, `dist/themes.css` (product light theme mappings under
  `[data-theme="light"]`, ADR-012), `dist/glass.css` (crystal glass with literal Safari-safe
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
- **canon/vwxyz/**: Persona character canon. Never invent character colors. Images will be served from the asset service (planned, ADR-010).
- **dist/**: Generated artifacts (gitignored). Produced by `npm run tokens`. Consuming
  repos import `dist/tailwind.config.js` together with `dist/tokens.css`. Colour
  utilities are `color-mix()` of `var(--vi-colors-<key>, <hex>)`: `tokens.css`
  supplies the variable, and the hex is the fallback when that variable is unset.
  `color-mix()` needs Safari 16.2+, Chrome 111+, or Firefox 113+. `dist/themes.css`
  is an explicit opt-in that remaps those variables for the product light theme.
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
  `dist/tokens.css`, `dist/tokens.json`, and `dist/themes.css`. Run this after modifying tokens in
  `DESIGN.md`.
- `npm test`: Runs `node --test test/*.test.js`: the MCP stdio smoke test
  (`test/mcp-server.test.js`), the token contract (`test/tokens.test.js`),
  the theme contract (`test/themes.test.js`), the preview fragment contract
  (`test/preview.test.js`), the brand contract (`test/brand.test.js`),
  the agent standard contract (`test/standard.test.js`), and the persona canon
  contract (`test/persona-canon.test.js`).
  Run this after changing `mcp-server.js`, `DESIGN.md` tokens, `canon/vwxyz/`, `brand/`, or any fragment.
- `npm run canon:check`: Runs the persona canon contract on its own.

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
| state      | `base`, `hover`, `active`                  | Interaction state. `light` is a theme suffix, not an interaction state. |

`light` is the product-theme suffix. It is not a `hover` or `active` state. `dist/themes.css` maps each light colour onto the matching `base` variable.

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

Do not draw or approximate the mark. Reference a file in `brand/` by family and version (`brand_{asset}_{variant}_v{NNN}.{ext}`). On a lockup, `horizontal-dark`, `horizontal-light`, and `stacked-dark` name the field. On a mark, `mono-dark` and `mono-light` name the ink. On a wordmark, `dark` and `light` name the ink. `on-dark` and `on-light` would name the field. Shipped masters keep the brand-index filenames. Versions are not reused.

Full colour is for the dark field. Do not place the full-colour mark on the light field `#F7F7F5`.

ADR-011 item 10 is Accepted 2026-10-28: CTA fills and focus rings are #8B5CF6 (`{colors.surface-accent-violet-base}`). Item 7 is Accepted 2026-10-28. Items 1-6, 8 and 9 stay Proposed. Hover #6D28D9 (violet-700) and active #5B21B6 (violet-800) are darker steps of #8B5CF6, Accepted 2026-10-28. Focus rings use #8B5CF6. Item 7 is Accepted 2026-10-28: white on #8B5CF6 is 4.23:1. CTA labels are large: bold xl or larger, or 2xl or larger. No normal-size label of any colour on that violet. `{effects.ambient-glow-violet-base}` stays `rgba(124, 58, 237, 0.30)`. `{effects.ambient-glow-teal-base}` stays the default glow.

Xylia is never text and never appears alone. Do not build a gradient between the five signature colours. Text-safe Xylia and text-safe Zinnia are pending. Do not define them.

Being retired for brand artwork: teal `#2DD4BF` and rose `#F43F5E` as persona colours, `#7226FA`, `#A78BFA`, the V-shield mark, the chevron favicon, `cube.png` paths, and Inter. They remain the `DESIGN.md` persona values until the follow-up. Status error `#F43F5E` and status warning `#F59E0B` stay status tokens.

Promoted masters live at the path `design_system/brand/`. Cite that path by name only.
