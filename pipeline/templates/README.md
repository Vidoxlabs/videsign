# VWXYZ asset pipeline templates

- **Date:** 2026-11-02.
- **Status:** Proposed (same owner gate as the character canon v1).
- **Scan:** this directory is part of the default `scripts/check-public-safety.js` targets.

## Files

- `build-request-pack.js` → `request-pack.json`: one asset request per first-wave asset (each VI's sheet anchor, the 20-slot chibi animation set, one bg plate, plus the group lineup). Every entry validates against `$defs/request` in `canon/vwxyz/asset-manifest.schema.json`. The `dedupe_key` is the SHA-256 of `vidoxlabs.vwxyz.request/v1|{asset_id}|{purpose}`, so the pack rebuilds byte-identically. The lineup entry carries `vi: violet` because the request schema's `vi` enum is character-only; its `asset_id` is the canonical `group/sheet/lineup/v001`.
- `build-generation-pack.js` → `generation-pack.json`: anchor-locked composition rules for all five VIs — palette channels (machine-copied from `canon/vwxyz/palette.json`), tie and lower-body rules, expression notes (from `vocabulary.json`), per-VI drift negatives (from `reviewer-checklist.md`), negative-prompt components, reference images and the first-wave slot list with canvas specs. Final prompt prose is assembled at generation time and is not published here (ADR-010).
- `sidecar-template.json`: the fill-in skeleton for a generation sidecar. The canon tool emits a fully valid document from a real PNG (`npm run canon:tool -- sidecar <file.png> --tool t --model m --prompt p --negative n`); `test/canon-tool.test.js` proves the emitted sidecar and manifest entry validate against the canon schema.

## Rebuild

```bash
node pipeline/templates/build-request-pack.js
node pipeline/templates/build-generation-pack.js
```

Both builders read only canon files and emit deterministic output. Review the diff after any canon change; a palette edit changes `palette_sha256` consumers, not these packs' structure.
