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
  front-matter and emits `dist/tailwind.config.js`, `dist/tokens.css`, and
  `dist/tokens.json`. Run `npm run tokens` to regenerate.
- **mcp-server.js**: The MCP server that exposes this design system to product
  repositories for cross-repo token and fragment fetching. Also provides a
  `resolve_token` tool for querying individual token values.
- **assets/**: Local-only design images (gitignored). See `assets/README.md` for the
  naming convention. No binary assets are committed to the repository.
- **dist/**: Generated artifacts (gitignored). Produced by `npm run tokens`. Consuming
  repos import `dist/tailwind.config.js` or `dist/tokens.css` from this repo.

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

- `npm run lint`: Executes AST validation against the codebase (enforcing `no-arbitrary-value`).
- `npm run mcp`: Starts the local MCP server for cross-repo communication.
- `npm run tokens`: Parses `DESIGN.md` and regenerates `dist/tailwind.config.js`,
  `dist/tokens.css`, and `dist/tokens.json`. Run this after modifying tokens in
  `DESIGN.md`.

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
