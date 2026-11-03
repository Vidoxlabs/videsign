# VWXYZ cross-repository asset & digital identification audit

- **Date:** 2026-11-02.
- **Scope:** `videsign` (canon of record) against the consuming checkouts `ViApp`, `vijobs`, `ViWeb` and `vidoxlabs.dev`.
- **Method:** hash verification against the mission 20 chibi asset hash record (`ViApp/docs/`) and `videsign/brand/MANIFEST.json`; slot mapping against `canon/vwxyz/vocabulary.json`; pattern scans for deprecated `cube.png` paths and non-matrix `--vi-persona-*` aliases.

## 1. ViApp Violet Chibi v1 (16 slots)

`ViApp/app/Sources/ViApp/Resources/Chibi/` holds the 16 approved v1 PNGs. All sixteen SHA-256 digests match the mission 20 chibi asset hash record in `ViApp/docs/` exactly (re-hashed 2026-11-02; byte integrity confirmed). Runtime cells measure 463x798 with alpha, which is exactly half of the canon `chibi` master canvas (926x1596 RGBA, `canon/vwxyz/README.md` section 6).

### 1.1 Slot mapping to the canon vocabulary

| ViApp slot | Canon class | Canon slot | Notes |
| --- | --- | --- | --- |
| `neutral` | expression | `neutral` | direct |
| `happy` | expression | `happy` | direct |
| `excited` | expression | `excited` | direct; not staged in vijobs |
| `sad` | expression | `sad` | direct |
| `smug` | expression | `smug` | direct |
| `wink` | expression | `wink` | direct |
| `thinking` | expression | `thinking` | direct |
| `shocked` | expression | `shocked` | direct; not staged in vijobs |
| `alert` | state | `alert` | direct (Living-Interface state) |
| `keyboard` | state | `keyboard` | direct |
| `loading` | state | `loading` | direct |
| `planning` | state | `planning` | direct |
| `success` | state | `success` | direct |
| `carefree` | legacy | propose alias `smile` | no `carefree` slug in `vocabulary.json`; nearest canonical positive expression is `smile` |
| `lockedin` | legacy | propose alias `focused` | no `lockedin` slug; nearest canonical expression is `focused` |
| `sleeping` | legacy | propose alias `sleepy` | canon vocabulary carries `sleepy`, not `sleeping`; not staged in vijobs |

**Recommendation:** when the 16 v1 slots are registered as canon manifest entries, record `legacy_alias` as above (`carefree -> smile`, `lockedin -> focused`, `sleeping -> sleepy`). These aliases are proposals for owner review, not canon changes; the vocabulary itself needs no new slugs.

### 1.2 Rig candidate

`ViApp/app/Sources/ViApp/Resources/Chibi/RigCandidate/` holds a 22-part cutout rig (`head`, `torso`, `arm_l/r`, `hand_l/r`, `leg_l/r`, `foot_l/r`, `hips`, `chest`, `ear_l/r`, `eyes`, `eyes_closed`, `mouth_open`, `mouth_rest`, `mouth_rounded`, `mouth_wide`, `tail`, `rig.json`). Layer names overlap the canon animation layer anchors (`pipeline/animation/vwxyz-animation-v1.json`) but are not identical; the animation spec ships an explicit mapping table. Per workspace policy this procedural rig is a fixture that proves articulation only, not approved character art.

## 2. vijobs companion

- `vijobs/web/src/companion/manifest.json` pins 13 states (`neutral`, `thinking`, `happy`, `alert`, `success`, `planning`, `loading`, `keyboard`, `carefree`, `lockedin`, `sad`, `smug`, `wink`). Every pinned SHA-256 matches the ViApp v1 digests. Entries carry `review_status: documented_runtime_reference` and `approval_record_verified_for_this_file: false`, which is honest pre-canon posture.
- File naming (`violet-chibi-<state>.png`) predates the canon naming standard (`{vi}_{type}_{slot}_v{NNN}.png`); no sidecars, no canon asset ids. Migration path: register canonical entries with `legacy_alias` (including the two legacy state names `carefree` and `lockedin`) and keep the runtime filenames as display aliases until a staged cutover.
- `vijobs/web/companion-staging/` holds the 13 staged PNGs (gitignored bytes), matching the manifest list one for one.
- `vijobs/web/src/assets/PROVENANCE.json` records byte-identical Brand v1 SVG copies with SHA-256 digests equal to `videsign/brand/MANIFEST.json` at source revision `f48a2ad`. Copy method (`shutil.copy2`, digest checked before write) is recorded. No deprecated `cube.png` paths and no non-matrix persona aliases were found anywhere in the checkout.

## 3. vidoxlabs.dev

- `public/favicon.svg` digest equals `brand_favicon_px16_v008.svg` (`07bc0643...`) from `brand/MANIFEST.json` — a verified Brand v1 copy.
- No `cube.png` references and no `--vi-persona-*` research aliases in `src/`.

## 4. ViWeb

- `web/public/favicon.svg` (284 bytes, digest `d3fd83fa...`) matches **no** row of `brand/MANIFEST.json`; the `web/dist/` copy is the same lineage. This is an unverified legacy favicon, presumably pre-Brand-v1. **Recommendation:** replace it with a byte copy of `brand_favicon_px16_v008.svg` and record the digest in a ViWeb provenance file, or drop it in favour of the vidoxlabs.dev-verified copy.
- No `cube.png` references and no non-matrix persona aliases in code; the one documentation hit correctly instructs agents to use the canonical emitted names.

## 5. Summary of actions

| Finding | Severity | Proposed action |
| --- | --- | --- |
| 3 legacy ViApp slot names not in vocabulary | low | `legacy_alias` mapping at manifest registration (proposals in section 1.1) |
| vijobs pre-canon naming, no sidecars | low | migrate to canon naming + sidecars via `scripts/canon-tool.js`; keep runtime aliases until cutover |
| ViWeb favicon not in brand manifest | medium | re-copy from `videsign/brand` with digest provenance, or remove |
| ViApp rig layer names differ from canon anchors | info | adopt the mapping table in `pipeline/animation/vwxyz-animation-v1.json` |
| No `cube.png` / non-matrix alias usage anywhere | pass | none |
| All 16 ViApp chibi hashes match the record | pass | none |
| vijobs brand SVG copies byte-verified against the manifest | pass | none |
| vidoxlabs.dev favicon verified against the manifest | pass | none |
