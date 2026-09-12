## Summary

Brief description of what changed and why.

## Area

- [ ] DESIGN.md tokens
- [ ] Preview fragment
- [ ] MCP server
- [ ] ADR / guardrail
- [ ] Token pipeline
- [ ] CI / tooling
- [ ] Other

## Changes

- 

## Verification

- [ ] `npm run tokens` generates successfully
- [ ] `npm run lint` passes
- [ ] No `shadow-sm` in preview fragments (ADR-001)
- [ ] No arbitrary Tailwind values (`w-[...]`, `flex-[...]`)
- [ ] No `{ONEDRIVE_ASSET_BASE}` references (use `{ASSET_BASE}`)
- [ ] New tokens added to `DESIGN.md` YAML (not hardcoded in fragments)
