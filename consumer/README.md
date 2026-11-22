# Consumer toolkit

The token sync that product repositories run to turn published videsign artifacts into
their own tracked stylesheets.

## Why it lives here

It previously lived in the site repository as `scripts/sync-videsign-tokens.mjs` plus
`scripts/lib/videsign-standard.mjs` and `scripts/lib/brand-v1.mjs`. That repository is
scheduled for deletion in a rebuild, and it held the only working consumer. Moving it
here means the design canon owns its own consumption path, and the site becomes an
ordinary caller that can be discarded without losing the tool.

## What it does

Reads a pinned `videsign-tokens-source.json` and `videsign-glass-source.css`, validates
them against the token contract, and writes tracked stylesheets carrying provenance.

```
node consumer/sync-videsign-tokens.mjs \
  --source consumer/videsign-tokens-source.json \
  --glass  consumer/videsign-glass-source.css \
  --sha    <videsign commit sha> \
  [--out <path>] [--glass-out <path>]
```

It fails closed, and the failure modes are the point:

- a missing source, or a source that does not exist
- a missing SHA, because an artifact without provenance is not traceable
- a malformed source
- a missing required token
- a fluid token that is not a `clamp()` capped in rem, or that exceeds `3.5rem`
- `typography-fluid-hero-base` at anything other than exactly `5.25rem` (ADR-005)
- a glass stylesheet without literal backdrop declarations

`npm run consumer:test` proves those eight behaviours.

## The pin is stale

`videsign-source-digests.json` and the pinned sources were captured at videsign
`eb9a67d`, 2026-11-12. That is **30 commits behind** the current head, and
`lib/` has gained 4,791 lines since, including the memory field and the orbital field
engine. The pin was carried over verbatim so nothing was lost in the move. It is
**not** the pin a rebuilt site should ship with.

Refreshing it is part of the rebuild, not part of this move.

## Relationship to the canon

`lib/videsign-standard.mjs` also assembles the agent standard that product repositories
consume, and reads its pin from this directory. It resolved from the repository root
before the move; `SITE_ROOT` now resolves to `consumer/`.

This directory is a consumer, not a source of truth. Values come from `DESIGN.md` through
`npm run tokens`. Nothing here may invent a token.
