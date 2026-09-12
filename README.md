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
├── preview/         Pure, flat, state-free HTML component fragments + layout compositions
├── preview/index.html  Visual catalog (open in a browser)
├── scripts/
│   └── generate-tokens.js  Token pipeline: DESIGN.md YAML → Tailwind config, CSS vars, JSON
├── mcp-server.js    Read-only MCP server: tokens, fragments, resolve_token tool
├── assets/          Local-only design images (gitignored, never committed)
├── dist/            Generated artifacts (gitignored, run `npm run tokens` to regenerate)
├── .eslintrc.js     AST validation: enforces no-arbitrary-value rule
└── package.json
```

## Quick start

```bash
npm install
npm run tokens     # Generate Tailwind config, CSS vars, and JSON from DESIGN.md
npm run mcp        # Start the MCP server on stdio
npm run lint       # Validate against no-arbitrary-value rule
```

Open `preview/index.html` in a browser for a visual catalog of all components.

## Consuming from a product repo

1. **Tailwind**: Import the generated config — `const videsign = require('@vidoxlabs/videsign/dist/tailwind.config.js')`
   and spread into your `tailwind.config.js` `theme.extend`.
2. **CSS custom properties**: Import `dist/tokens.css` for `--vi-*` CSS variables.
3. **MCP**: Run `npm run mcp` and query resources/tools from your product repo's agent.
4. **Assets**: Use the `{ASSET_BASE}` placeholder in all image URLs. Resolve it at build time
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
   values, no deprecated asset placeholder references.
5. CI runs these checks on every push and pull request.

See `AGENTS.md` for the full agent initialization protocol and `SKILL.md` for
architectural decision records.

## License

Copyright (c) 2026 Vidoxlabs LLC. All rights reserved. See [LICENSE](LICENSE)
for the full terms of use. This repository is proprietary — no copying, cloning,
modification, distribution, or commercial use without written permission.
