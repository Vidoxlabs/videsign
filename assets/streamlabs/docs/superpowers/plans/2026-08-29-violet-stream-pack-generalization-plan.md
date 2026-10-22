# Violet Stream Pack Generalization — Implementation Plan

**Goal:** Turn the single-game `Violet-osu-stream-pack` into a multi-layout, multi-preset Streamlabs pack (`Violet-Stream-Pack`) that works for any game, fixes the confirmed Alert Box alignment defects, and keeps Violet's identity single-sourced.

**Architecture:** `shared/` brand core (character art, alert widget, chatbox CSS, consistency guide, generic intermission copy) + `layouts/*/` (gameplay-capture geometry: `4x3-rail-osu`, `16x9-full`) + `presets/*/` (copy overlays: `osu`). `source/build-assets.sh` is profile-driven, reading `source/profiles/*.json` for all geometry instead of hardcoding pixels.

**Tooling:** ImageMagick (`convert`, `montage`), FFmpeg/FFprobe, `jq`, shell, Markdown/JSON.

---

### Task 1: Lock the rework contract

**Files:** `docs/superpowers/specs/2026-08-29-violet-stream-pack-generalization-design.md`, this plan doc, `source/profiles/4x3-rail-osu.json`, `source/profiles/16x9-full.json`, `layouts/4x3-rail-osu/scene-layout.json`, `layouts/16x9-full/scene-layout.json`.

1. Record the approved geometry for both layouts, with the Alert Box fix embedded from the start.
2. Verify all pairwise overlap checks (alert/mascot vs. chat/handcam) programmatically before building any art.

### Task 2: Relocate and fix the existing osu pack in place

**Files:** `shared/characters/*`, `shared/widgets/*`, `presets/osu/scenes/intermission/*` (verbatim copy), `layouts/4x3-rail-osu/assets/*` (verbatim copy), `source/*.png` (raw inputs, `approved-concept.png` dropped as confirmed dead).

1. Copy reusable assets into their new homes without regenerating pixels yet.
2. Fix the Alert Box's HTML/JS/CSS: generic follower copy, `data-type` attribute, per-alert-type ring count/accent (Follow=1 ring, Sub=2, Tip/Cheer=amount-scaled glow, Raid=3 cascading), all using existing palette tokens only.

### Task 3: Write the shared and per-layout docs

**Files:** `shared/docs/Violet-Visual-Consistency-Guide.md`, `shared/docs/Streamlabs-Alerts-Setup.md`, `layouts/4x3-rail-osu/docs/Streamlabs-Setup.md`, `layouts/16x9-full/docs/Streamlabs-Setup.md`, `presets/osu/Rhythm-game-styling.md`, `presets/osu/alert-copy-overrides.md`.

1. Move the "Rhythm-game styling" section out of the shared guide into the osu preset.
2. Resolve the Alert Box's two conflicting positions to one canonical number per layout, with the overlap math shown inline.
3. Cross-reference the Alerts doc from each layout's main setup doc (previously missing entirely).
4. Add a sound-cue section (Streamlabs' native per-alert upload field — this pipeline can't fabricate audio).

### Task 4: Parameterize and run the build pipeline

**Files:** `source/build-assets.sh`, `source/profiles/*.json`, `presets/generic-copy.json`, `presets/osu/copy.json`.

1. Rewrite the build script so every pixel offset is read from a profile JSON via `jq` — no hardcoded geometry.
2. Regenerate: shared intermission screens (generic copy), osu preset intermission screens, the full `4x3-rail-osu` asset set (proving the parameterized script reproduces the original composition), and the new `16x9-full` corner-cluster assets (`corner-backdrop.png`, `corner-mascot-frame.png`).
3. MVP mascot art: crop/resize the existing `violet-headphones.png` into the perch box rather than commissioning new ImageGen art.

### Task 5: Extend verification

**Files:** `source/verify-pack.sh`.

1. Check every shared/preset/layout required file, dimensions, and alpha behavior.
2. Add `assert_no_overlap` / `assert_layout_no_overlap`, run against both `scene-layout.json` files for every alert/mascot-vs-chat/handcam pair.
3. Add `assert_alert_box_present` so the original bug class (Alert Box silently absent from the geometry contract) can't regress undetected.
4. Add a manifest-completeness diff (`find` vs. `MANIFEST-SHA256.txt`) so files can't ship unlisted or get orphaned in the manifest again.

### Task 6: Manifest, README, manual QA tooling

**Files:** `MANIFEST-SHA256.txt`, root `README.md`, `source/layout-preview.html`.

1. Regenerate the manifest over the complete new tree.
2. Write a profile-picker README (which layout for which game).
3. Build a layout-preview tool that draws `scene-layout.json` rectangles over a sample screenshot for visual safe-zone review.

### Task 7: Package

1. Run `verify-pack.sh` clean.
2. Zip the pack for distribution.
