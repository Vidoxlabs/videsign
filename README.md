# videsign

![CI](https://github.com/Vidoxlabs/videsign/actions/workflows/ci.yml/badge.svg)

The canonical Nocturne Museum design system for Vidoxlabs. Provides a semantic
token matrix, pure HTML preview fragments, and an MCP server for cross-repo
consumption by AI agents and product repositories.

## Structure

```
videsign/
├── DESIGN.md        Semantic token matrix (category-role-variant-state) + negative boundaries
├── SKILL.md         Architectural Decision Records (ADRs) and agent guardrails
├── AGENTS.md        Engineering governance and agent initialization protocol
├── canon/
│   └── vwxyz/       VWXYZ character canon v1: palette, vocabulary, schema, checklist
├── lib/
│   ├── contrast.js  WCAG contrast and alpha compositing, shared by tests, primitives and MCP
│   ├── stage.js     Stage backdrop primitive: geometry, SVG renderer, contrast report (ADR-013)
│   └── stage.css    Stage colour and motion from emitted tokens
├── preview/         Pure, flat, state-free HTML component fragments + layout compositions
├── preview/index.html  Visual catalog (open in a browser)
├── brand/           Brand v1 masters (text-only SVG) and MANIFEST.json digests (ADR-011)
├── pipeline/        Persona asset pipeline: animation spec, audit records, templates
├── scripts/
│   ├── generate-tokens.js        Token pipeline: DESIGN.md YAML → Tailwind config, CSS vars, JSON, themes, glass.css, catalog.css
│   ├── generate-standard.js      Agent standard: dist/standard.json and dist/standard.md (rules + ADR index)
│   ├── generate-platforms.js     dist/tokens.ts, ViTokens.swift, videsign_tokens.py, tokens.dtcg.json (ADR-014)
│   ├── generate-canon-style-pack.js  dist/canon-style-pack.json: one-call canon and style reference
│   ├── generate-stage-fragment.js    preview/stage-backdrop.html from lib/stage.js
│   ├── lint-preview.js           Static checks for preview/ fragments
│   ├── check-brand-svg.js        Brand master checks
│   ├── check-public-safety.js    Fail-closed public-safety scan (CI)
│   └── canon-tool.js             VWXYZ candidate validator and sidecar generator
├── test/            node --test contracts: tokens, themes, preview, standard, brand, canon, MCP
├── mcp-server.js    Read-only MCP server: docs, canon, standard, style pack, fragments; tools resolve_token, style_pack, check_contrast, stage_backdrop
├── assets/          Local-only design images (gitignored, never committed)
├── dist/            Generated artifacts (gitignored, run `npm run tokens` to regenerate)
├── eslint.config.js AST validation: enforces no-arbitrary-value rule
└── package.json
```

Character colors, slugs and the asset contract live in `canon/vwxyz/`. UI accent
tokens stay in `DESIGN.md`. Persona images will be served from `{ASSET_BASE}/vi/…`
(planned, ADR-010) and are never committed (ADR-002).

## Quick start

```bash
npm install
npm run tokens     # Generate CSS, Tailwind, TypeScript, Swift, Python and DTCG tokens, the standard and the style pack
npm run mcp        # Start the MCP server on stdio
npm run lint       # Validate against no-arbitrary-value rule
npm test           # Smoke-test the MCP server, tokens, previews and canon
npm run canon:check  # Persona canon contract on its own
```

Run `npm run tokens`, then serve the repository root over HTTP and open `/preview/` for a
styled visual catalog of every component (`python3 -m http.server 8000`). The catalog loads
`dist/tokens.css`, `dist/glass.css` and `dist/catalog.css`, so `dist/` must exist.

## Consuming from a product repo

1. **Tailwind**: Import the generated config — `const videsign = require('@vidoxlabs/videsign/dist/tailwind.config.js')`
   and spread into your `tailwind.config.js` `theme.extend`. Colour utilities are
   `color-mix()` of `var(--vi-colors-<key>, <hex>)`, so import `dist/tokens.css`
   with the config. The hex is the fallback when the variable is unset.
   `color-mix()` needs Safari 16.2+, Chrome 111+, or Firefox 113+.
2. **CSS custom properties**: Import `dist/tokens.css` for `--vi-*` CSS variables.
   Import `dist/themes.css` as well to opt into the product light theme, which
   remaps the base variables.
3. **MCP**: Run `npm run mcp` and query resources/tools from your product repo's agent.
   `dist/standard.json` is the machine-readable rule set (glass, type, motion, stage
   backdrop, five-bar rule, graph line, chat dock, accessibility) with the ADR index.
   Sync it into a product with the product's own token sync script, pinned to a videsign SHA.
4. **Stage backdrop**: `const { renderStageSvg, stageContrastReport } = require('@vidoxlabs/videsign/lib/stage.js')`
   renders the ADR-013 backdrop as an SVG string (or inline `dist/stage-ambient.svg` /
   `dist/stage-hero.svg`). Import `dist/stage.css` with `dist/tokens.css`. Your pause
   control sets `data-motion="paused"` on the root element.
5. **Other platforms (ADR-014)**: use the generated output for your platform, never a hand copy.
   - TypeScript: `dist/tokens.ts` (`tokens`, `cssVar`, `token("colors.persona-accent-violet-base")`).
   - SwiftUI: add `dist/ViTokens.swift` to the target; `ViTokens.Colors.personaAccentVioletBase`,
     `ViTokens.Transition.transitionEasingStandardBase.animation(duration: …)`.
   - Python and Textual: `dist/videsign_tokens.py` (`COLORS["persona-accent-violet-base"]`, `token(…)`).
   - Design tools and converters: `dist/tokens.dtcg.json` (DTCG 2025.10).
6. **Assets**: Use the `{ASSET_BASE}` placeholder in all image URLs. Resolve it at build time
   to your CDN endpoint.

## Token matrix

All design tokens follow the 4-part semantic matrix: `category-role-variant-state`.

Example: `{colors.surface-background-primary-base}` resolves to `#0A0A0E`.

See `DESIGN.md` for the full token definitions and negative boundaries. See
`SKILL.md` for architectural constraints and `AGENTS.md` for the agent
initialization protocol.

## Contributing

1. Modify tokens in `DESIGN.md` YAML front-matter (the single source of truth).
2. Run `npm run tokens` to regenerate `dist/` artifacts.
3. Run `npm run lint` to validate against the `no-arbitrary-value` rule.
4. Verify preview fragments: no `shadow-sm` (ADR-001), no arbitrary Tailwind
   values, no deprecated asset placeholder references, and the signature-colour
   rules (Xylia never text or alone, no gradient between signature colours).
5. A new rule goes into `SKILL.md` as an ADR and into `DESIGN.md` prose; if agents need
   it as data, add it to `scripts/generate-standard.js` and to `test/standard.test.js`.
6. Run `npm test`. CI runs these checks on every push and pull request.

See `AGENTS.md` for the full agent initialization protocol and `SKILL.md` for
architectural decision records.

## Brand

The brand v1 set (mark C), the favicon, lockups, and wordmarks are documented in [brand/README.md](brand/README.md). Full colour is for the dark field. On a lockup, `-dark` and `-light` name the field. On a mark or a wordmark, they name the ink. File digests are in `brand/MANIFEST.json`. Promoted masters use the path `design_system/brand/`.

## License

Copyright (c) 2026 Vidoxlabs LLC. All rights reserved. See [LICENSE](LICENSE)
for the full terms of use. This repository is proprietary — no copying, cloning,
modification, distribution, or commercial use without written permission.
