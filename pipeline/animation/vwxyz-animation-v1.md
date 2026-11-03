# VWXYZ animation & rigging-ready specification v1

- **Status:** Proposed companion to VWXYZ character canon v1 (pending owner confirmation, same gate as `canon/vwxyz/README.md`).
- **Date:** 2026-11-02.
- **Machine source:** `vwxyz-animation-v1.json` next to this file. If the two disagree, the JSON wins.
- **Compatibility:** This is a companion specification. It changes nothing in `canon/vwxyz/palette.json`, `vocabulary.json`, `asset-manifest.schema.json` or `reviewer-checklist.md`; every slot name it uses already exists in `vocabulary.json`, so all existing canon assertions hold unchanged.

## 1. Scope

This specification makes Violet, Wisteria, Xylia, Yarrow and Zinnia effortless to animate across:

1. **2D state-reactive companion UIs** (Living Interface): chibi sprites swap expression/state/viseme slots in response to runtime state.
2. **Lip-synced speech:** the vvs viseme stream on the ViBot host maps onto the five canonical `viseme-a..u` chibi slots.
3. **Future layered 2.5D / cutout rigs:** any approved `full` (1536x2048) or `chibi` (926x1596) master can be separated into the articulated layer stack in section 3 while keeping a pixel-identical silhouette and the 3% border padding (reviewer checks C4/C5).

Character art still has to pass C1–C13 and owner approval before publication (ADR-010). This spec says nothing about color; `palette.json` remains the only color source.

## 2. State-reactive sprite matrix (first-wave chibi pack, per VI)

Each VI gets one `chibi` master set at 926x1596 RGBA. All slots exist in `vocabulary.json` today; no new slugs are introduced.

### 2.1 Core expressions (8)

`neutral`, `happy`, `thinking`, `focused`, `sad`, `smug`, `wink`, `surprised`.

Mapping notes for existing assets: ViApp v1 `lockedin` covers `focused`; v1 `shocked` stays valid as the `shocked` expression but the first wave uses `surprised` (the vijobs manifest already treats `shocked` as unstaged). Expression notes in `vocabulary.json` are binding (Xylia's disapproval is never villain-coded; Zinnia is never goofy; Yarrow stays measured; Wisteria's anger is quiet disappointment).

### 2.2 Living-Interface operational states (7)

`alert`, `loading`, `searching`, `success`, `planning`, `keyboard`, `snack`.

The state layer is an **overlay posture**, not a replacement sprite: a state may add props (keyboard, snack) or motion posture (loading, searching) on top of the current expression. ViApp v1 covers `alert`, `loading`, `planning`, `keyboard`, `success` today; `searching` and `snack` are new first-wave slots. Legacy v1 `carefree` maps to the `smile` expression posture.

### 2.3 Speech visemes (5)

`viseme-a`, `viseme-e`, `viseme-i`, `viseme-o`, `viseme-u`. These are mouth-shape-only slots: eyes, brows and pose come from the current expression sprite. The vvs lip-sync stream emits viseme classes at utterance granularity; the runtime binds each class to the matching slot with a fast opacity cross-fade (section 5). When no viseme is active the mouth returns to the expression's resting mouth.

### 2.4 Runtime cell

Masters are 926x1596 (2x of the 463x798 runtime cell). Consumers render at the cell size and let the master serve 2x displays. Slot swaps never resize the canvas; every slot in a set shares identical canvas, padding and registration so cross-fades cause zero layout shift.

## 3. Articulation & cutout layer anchors (rigging)

A riggable master is delivered as the flat published PNG plus a layered source that separates into exactly these layers, back to front. Layer names are the canonical z-order anchors; they are the only names a rig importer may rely on.

| # | Layer | Content | Registration pivot (normalized, origin top-left) |
| --- | --- | --- | --- |
| 1 | `tail_back` | Tail root and shaft behind the torso | root at (0.50, 0.62); rotates about the root |
| 2 | `tail_tip_signature` | Last ~15% of the tail in the signature colour | inherits `tail_back` transform |
| 3 | `hair_back` | Hair mass behind head and shoulders | head pivot (0.50, 0.30) |
| 4 | `torso_blazer_shirt_tie` | Blazer, shirt, tie, arms at rest baseline | body pivot (0.50, 0.55); no rotation in default rig |
| 5 | `arm_left` | Left arm, hand | shoulder at (0.38, 0.38) |
| 6 | `arm_right` | Right arm, hand | shoulder at (0.62, 0.38) |
| 7 | `head_base` | Face base, skin, cheeks | head pivot (0.50, 0.30) |
| 8 | `eyes_iris_whites` | Whites + iris for open and closed variants | head pivot; blink swaps open/closed variant by opacity |
| 9 | `eyebrows` | Brow shapes per expression | head pivot |
| 10 | `mouth_viseme` | Rest mouth + five viseme shapes | head pivot; viseme swap by opacity |
| 11 | `hair_bangs_underlight` | Bangs front mass with signature under-light | head pivot |
| 12 | `ear_left` | Left cat ear | base of ear (0.40, 0.16); subtle tilt only |
| 13 | `ear_right` | Right cat ear | base of ear (0.60, 0.16); subtle tilt only |

Rules:

- Separation must keep the flattened composite pixel-identical to the approved flat master (same silhouette, same 3% border padding). If flattening the layers changes pixels, the master fails C4/C5 review.
- `mouth_viseme` and `eyes_iris_whites` are the only layers a lip-sync runtime may drive; everything else is pose/expression level.
- Pivots are normalized coordinates so the same rig binds to `full` (1536x2048) and `chibi` (926x1596) masters without rescaling logic.
- No layer may carry a baked drop shadow, gradient or outline change; line art stays uniform `#1A1A1F` (canon section 2).

### 3.1 Mapping from the ViApp rig candidate

The ViApp `RigCandidate` fixture uses shorter names. Importers accept this mapping, then speak only the canonical names:

| Canonical anchor | RigCandidate part(s) |
| --- | --- |
| `tail_back` + `tail_tip_signature` | `tail` (split at ~85% along the visible tail path) |
| `hair_back` | (not separated in the fixture; keep flat under `head`) |
| `torso_blazer_shirt_tie` | `torso`, `chest`, `hips` (flatten to one torso group) |
| `arm_left` / `arm_right` | `arm_l` + `hand_l` / `arm_r` + `hand_r` (optionally `hand_r_point`) |
| `head_base` | `head` |
| `eyes_iris_whites` | `eyes`, `eyes_closed` (variants of one layer) |
| `eyebrows` | (not present in the fixture; draw from the expression sprite) |
| `mouth_viseme` | `mouth_rest`, `mouth_open`, `mouth_rounded`, `mouth_wide` (rest + three of the five visemes; add `viseme-e`, `viseme-i` shapes to complete the set) |
| `hair_bangs_underlight` | (not separated in the fixture) |
| `ear_left` / `ear_right` | `ear_l` / `ear_r` |

## 4. Asset delivery contract

- Sprite sets are published per the canon naming and digital identification rules: `{vi}_{type}_{slot}_v{NNN}.png`, canonical asset id `{vi}/{type}/{slot}/v{NNN}`, JSON sidecar, manifest entry with SHA-256 and `palette_sha256` (see `canon/vwxyz/asset-manifest.schema.json`). Version numbers are never reused.
- Rig sources are layered working files, not published assets; the flat PNG is the only runtime artifact. Rig exports keep a `rig.json` binding that names the section-3 layers and pivots.
- Rasters are never committed to a git repository (ADR-002); only manifests, sidecars, schemas and SHA-256 records are.

## 5. Deterministic CSS / web motion binding

All motion obeys ADR-008 and the Nocturne motion vocabulary; the canon tokens are restated here so a runtime can bind without reading the UI matrix:

- **Animated properties:** `transform` and `opacity` only. Blur, filters and geometry never animate.
- **Durations:** interaction swaps use the fast token (150ms); expression changes use the normal token (200ms); operational-state entries may use the slow token (300ms); a full companion entrance (mounting the sprite) may use the entrance token (500ms). No other durations.
- **Easing:** the standard token `cubic-bezier(0.16, 1, 0.3, 1)` for swaps; the spring token `cubic-bezier(0.32, 0.72, 0, 1)` for sheet/lens-like motion. Neither overshoots; zero bounce.
- **Sprite swap:** old slot fades out (opacity 1 -> 0) while the new slot fades in, same pivot, cross-fade at the fast duration. Because all slots share canvas and registration, no transform compensation is needed.
- **Blink:** a `viseme`-independent idle cue implemented as an opacity swap of the open/closed `eyes_iris_whites` variants. Blink is a micro-transition at the fast duration. Persistent companion motion stays state-reactive (Living Interface): no decorative loops; a breathing sway runs only while an explicit idle state is active, uses `transform: translateY` with the spring easing at multi-second period, and never runs under reduced motion.
- **Visemes:** driven by the vvs stream; each viseme class maps 1:1 to a `viseme-*` slot; mouth transitions use the fast duration; the mouth holds while the class holds and releases to the rest mouth on stream end.
- **Reduced motion:** under `prefers-reduced-motion: reduce` every transition renders its final state instantly (duration 0, no animated swap), the blink cue stops on the open eye, and idle sway is off. Compliance is absolute, matching ADR-008.
- **Transform budget for rigs:** `tail_back`/`tail_tip_signature` rotate about the root (max about 8 degrees), ears tilt (max about 4 degrees), arms rotate about the shoulders. Rigs animate transforms of the section-3 layers only; they never re-compose the layer order.

## 6. Verification

- Every slot name in `vwxyz-animation-v1.json` resolves through `canon/vwxyz/vocabulary.json` (expression, state or `viseme-` prefix).
- The motion tokens listed above exist verbatim in `DESIGN.md` front matter; the pipeline animation contract test re-checks this so a token rename cannot silently break runtimes.
- Public-safety: this directory is scanned by `scripts/check-public-safety.js` (no home paths, private addresses or external file hosts).
