# videsign

The canonical Nocturne Museum design system for Vidoxlabs. Provides a semantic
token matrix, pure HTML preview fragments, and an MCP server for cross-repo
consumption by AI agents and product repositories.

## Structure

```
videsign/
├── DESIGN.md        Semantic token matrix (category-role-variant-state) + negative boundaries
├── SKILL.md         Architectural Decision Records (ADRs) and agent guardrails
├── AGENTS.md        Engineering governance and agent initialization protocol
├── preview/         Pure, flat, state-free HTML component fragments
├── mcp-server.js    Read-only MCP server exposing tokens and fragments to product repos
├── assets/          Local-only design images (gitignored, never committed)
├── .eslintrc.js     AST validation: enforces no-arbitrary-value rule
└── package.json
```

## Quick start

```bash
npm install
npm run mcp      # Start the MCP server on stdio
npm run lint      # Validate against no-arbitrary-value rule
```

## Token matrix

All design tokens follow the 4-part semantic matrix: `category-role-variant-state`.

Example: `{colors.surface-background-primary-base}` resolves to `#0A0A0E`.

See `DESIGN.md` for the full token definitions and negative boundaries. See
`SKILL.md` for architectural constraints and `AGENTS.md` for the agent
initialization protocol.

## License

Copyright Vidoxlabs. All rights reserved.
