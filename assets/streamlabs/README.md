# Violet Stream Pack

A Streamlabs overlay system built around Violet — a consistent anime mascot character — for streaming any game. One shared brand core (character art, palette, Alert Box, chatbox, consistency guide) drives multiple selectable layouts and copy presets, so Violet stays on-model everywhere while the gameplay-capture geometry adapts to whatever you're streaming.

![Gameplay scene preview](layouts/16x9-full/assets/previews/gameplay-scene-preview.png)

## Which layout do I want?

| Your game | Use this layout | Why |
|---|---|---|
| Native 16:9 (most modern games) | [`layouts/16x9-full/`](layouts/16x9-full/docs/Streamlabs-Setup.md) | Game fills the full 1920×1080 canvas; Violet, chat, and the hand camera become corner overlays. |
| Native 4:3, a retro/emulator title, or you're streaming osu! | [`layouts/4x3-rail-osu/`](layouts/4x3-rail-osu/docs/Streamlabs-Setup.md) | Game sits in a fixed 1440×1080 4:3 region; the remaining 480px right rail hosts a full Violet presence, chat, and a larger hand camera. |

Both layouts share the same Alert Box and chatbox — see [`shared/docs/Streamlabs-Alerts-Setup.md`](shared/docs/Streamlabs-Alerts-Setup.md) regardless of which layout you pick.

## Fast setup

1. Set the Streamlabs base canvas to **1920×1080**.
2. Pick a layout from the table above and open its `Streamlabs-Setup.md`.
3. Add its sources in the listed bottom-to-top order using its `scene-layout.json` coordinates.
4. Set up the shared Alert Box per `shared/docs/Streamlabs-Alerts-Setup.md`, positioned per your layout's table row in that doc.
5. Pick generic or osu!-flavored intermission screens (`shared/scenes/intermission/` vs. `presets/osu/scenes/intermission/`) and lock every finished source.

## Pack contents

- `shared/` — Violet's brand core: 3 character poses, the Alert Box widget (generic copy, per-alert-type accents), chatbox CSS, generic-copy intermission screens, the Visual Consistency Guide, and the Alerts setup guide. Single-sourced — every layout and preset reuses these files as-is.
- `layouts/16x9-full/` — full-canvas game capture with a corner-cluster overlay (chat, hand camera, Alert Box, Violet mascot perch). The default choice for most games.
- `layouts/4x3-rail-osu/` — the original right-rail composition: 1440×1080 4:3 game capture beside a 480px Violet rail with an ambient rain/skyline loop.
- `presets/osu/` — osu!-flavored intermission screens and a one-line alert-copy override, for pairing with `4x3-rail-osu` when streaming osu! specifically.
- `source/` — the profile-driven build pipeline (`build-assets.sh`, `verify-pack.sh`, `profiles/*.json`) and a `layout-preview.html` QA tool that draws `scene-layout.json` safe zones over a screenshot.
- `docs/superpowers/` — the design spec and implementation plan behind this pack, for reference if you extend it with a new layout or preset.

## Adding a new layout or preset

- **New layout** (different gameplay-capture geometry): add `source/profiles/<name>.json` with its geometry (mirroring the existing two), a `build_layout_<name>()` function in `source/build-assets.sh`, a `layouts/<name>/scene-layout.json` + `docs/Streamlabs-Setup.md`, and required-file checks in `source/verify-pack.sh`. Keep the Alert Box entry in `movingElements` and run the overlap checks against your new `safeInteriors`/`decorativeElements` before shipping — this is exactly the bug class fixed in the 2026-08-29 rework.
- **New copy preset** (different text flavor over existing geometry): add `presets/<name>/copy.json` (mirrors `presets/osu/copy.json`) for intermission screens, and an `alert-copy-overrides.md` if the alert text should change too. No new art needed.

## Verification

Run `source/verify-pack.sh` after any change — it checks every shared/preset/layout required file, exact pixel dimensions and alpha behavior, that both layouts declare an Alert Box with provably non-overlapping geometry, and that `MANIFEST-SHA256.txt` matches the tree exactly (no missing or orphaned entries). Needs `convert`/`identify`/`montage` (ImageMagick), `ffmpeg`/`ffprobe`, and `jq` on `PATH`.

## Brand note

The rhythm-circle details in the osu preset are original visual motifs. No official osu! cookie logo or modified official brand mark is included anywhere in this pack.
