# VWXYZ corrected wave receipts — re-anchor + palette-snap (2026-11-03)

- **Authority:** Owner directive 2026-11-03 ("pass all owner-gated changes"); executed per `run_20261102-2015/C5_REANCHOR_PROPOSAL.md` ratified items 1–3 with the item-4 scope extended to all five VIs ("pass all").
- **Output:** `assets/quarantine/run_20261103-snap/` — 65 corrected copies as the v005 (violet) / v003 (others) next-version candidates, plus sidecars with `post_re_anchor` + `post_correction` blocks and §8a re-sampled receipts. **Status: all 65 remain `hold`; promotion to published stays human-gated (§8d).**

## Feasibility note (proposal correction)

The proposal's "11 headroom-limited" finding inverted the constraint: a downward re-anchor truncates the canvas bottom, so the true per-file condition is `Δy ≤ H − solesRow` (all satisfied), not the top-headroom rule that produced 11 false limits. Executed `dy` range: 64–301px (full `Δy`, no partial shifts needed), so the proposal's limited-file fallback never engaged. Correction recorded here for the record; the proposal document's table remains as the pre-flight estimate it was.

## Results (measured on the 65 corrected copies)

| VI | files | soles % | C4 band leak | single figure | post-snap avg ΔE00 (lit base) |
| --- | --- | --- | --- | --- | --- |
| violet v005 | 13 | 97 | 0 | 13/13 | hair 4.92 · underlight 3.78 · eyes 5.21 · trim 1.99 · tail 1.26 · shirt 1.52 · blazer 6.60 |
| wisteria v003 | 13 | 97 | 0 | 13/13 | hair 18.59 · underlight 12.42 · eyes 17.90 · trim 5.40 · tail 0.91 · shirt 5.29 · blazer 5.11 |
| xylia v003 | 13 | 97 | 0 | 13/13 | hair 1.88 · underlight 11.74 · eyes 14.03 · trim 7.90 · tail 5.08 · shirt 2.29 · blazer 7.26 |
| yarrow v003 | 13 | 97 | 0 | 13/13 | hair 5.43 · underlight 6.91 · eyes 10.53 · trim 4.27 · tail 0.62 · shirt 1.41 · blazer 6.59 |
| zinnia v003 | 13 | 97 | 0 | 13/13 | hair 5.85 · underlight 8.47 · eyes 6.74 · trim 3.37 · tail 0.77 · shirt 4.57 · blazer 9.67 |

- **Re-anchor:** core-pixel preservation asserted (0 dropped core on all 65), dropped glow rows ≤ ~1.6k per file (recorded per file), bottom band alpha-cleared 0–69 px, top band leak 0. C5 now passes everywhere by the machine check (soles at the 97% padding line; center drift ≤ tolerance).
- **Snap:** scope `underlight/trim/tail_tip` per `correction.palette_snap`; visible corrections where lawful: Xylia trim 16.2 → 7.9, Yarrow trim ~2 stays, violet all ≤ ~6. Codified residual fronts:
  - **Wisteria hair/eyes** sit outside the snap scope (`never_touch`), so their washout persists (hair 18.6, eyes 17.9) — a candidate for a regeneration wave (option B) or a pale-family exception ruling; the v1.2 chroma ramp floor (`C ≥ 15`) also mechanically excludes low-chroma pale pixels from remap membership by design.
  - **Xylia underlight** improved to 11.7 but remains over-limit (crimson compression); the membership window shrinks the effective reach for the darkest crimson renders.
  - **Yarrow eyes** average 10.5 with some |needs-region-confirm| items in the v1 receipts — the 65 evidence grids must be viewed by a human per §8a before score溶s are treated as final.
- **Two instruments, recorded separately:** the region-confirmed §8a sampler (reviewer-grammar) is the instrument of record for the *scored* C8; the videsign repo's `canon-tool` drift-form additionally flags structural stray interior colors (bright render-noise pixels within ΔE00 ~9–10 of a foreign signature). Those stray colors pre-date the snap (same family in the pre-snap files, e.g. `#FF007F vs zinnia 8.75` on `violet_chibi_alert_v004`), so the corrected files' repo-canon C8 failures are a pre-existing render-noise family, not a snap regression — recorded for the owner's future reconciliation between the two instruments (the checklist-version fork tracked in the run UI notes).

## What still gates publication

1. **§8d human sign-off** (Gavin) per file after ViCanon visual review of the 65 evidence grids (worse for Wisteria/Xylia given the residual fronts — the v005/v003 wave is review-ready for violet and yarrow first-wa限ing; wisteria/xylia may be rere-gen'd instead of snapped further).
2. The two instrument reconciliation decisions above.
3. The viesign-side palette digest fork (`7dd02a5f…` Drive canon vs repo `01a8b5cc…`) already flagged in the receipts — unchanged by this wave.
