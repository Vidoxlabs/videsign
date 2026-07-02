# Engineering Governance Layer

This file governs the engineering, operations, and deployment layer for the `videsign` repository and interacting agents.

## Repository Architecture

The `videsign` repository serves as the canonical source of truth for the **Nocturne Museum** theme. 

- **DESIGN.md**: The Visual Truth Layer. Read this file to understand the semantic token matrix and negative UI boundaries.
- **references/**: External site design captures (Grok, Mistral, etc.) for inspiration only — not canonical tokens.
- **SKILL.md**: The Decision Ledger. Read this file immediately upon initialization to understand architectural constraints (ADRs).
- **preview/**: Directory containing pure, flat, semantic, state-free HTML fragments. 
- **mcp-server.js**: The central MCP server that exposes this design system to other product repositories.

## AI Agent Initialization & Cross-Repo Fetching

When an AI agent initializes in a *product* repository (e.g., Playcards, website), it MUST execute the following routine:

1. **Query MCP Server**: Immediately query the `videsign` centralized MCP server to fetch the latest unified specifications.
2. **Fetch Tokens**: Read the YAML front-matter from `DESIGN.md` via MCP to understand the available `category-role-variant-state` tokens.
3. **Inspect Fragments**: Use the `preview/` HTML fragments exposed via MCP to capture clean structural snippets instead of hallucinating complex React/Angular state logic.

## Approved CLI Commands

Within the `videsign` repository, agents are restricted to the following commands to prevent destructive actions:

- `npm run lint`: Executes AST validation against the codebase (enforcing `no-arbitrary-value`).
- `npm run mcp`: Starts the local MCP server for cross-repo communication.

## AST Validation Pipeline

Agents must never introduce arbitrary UI values (e.g., `w-[15px]`, `text-[#FF0000]`). 
The `tailwindcss/no-arbitrary-value` ESLint rule strictly enforces the use of explicitly defined design tokens from the semantic matrix. Any generated code must pass `npm run lint`.
