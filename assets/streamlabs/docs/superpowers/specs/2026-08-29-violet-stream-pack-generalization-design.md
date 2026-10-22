# Violet Stream Pack — Generalization Design Specification

Date: 2026-08-29

## Goal

Generalize the original single-game `Violet-osu-stream-pack` into a Streamlabs asset system that works for streaming any game, with Violet as the consistent main character asset across every layout, while fixing confirmed internal alignment defects from the original pack.

## Problem statement

The original pack hard-baked the gameplay-capture region to `1440×1080, forced 4:3, no stretch` — osu!'s native capture convention — which is wrong for the majority of games (native 16:9, want the full 1920×1080 canvas). Copy text throughout was osu!-flavored. There was no extensibility hook for a second game or layout.

A full audit also found the pack's own internal alignment was not as clean as it looked: the Alert Box had no entry in `scene-layout.json` (no canonical source of truth for its position); its two suggested positions in the setup doc actively conflicted with the pack's own composition rules (one sat inside the "quiet" gameplay zone, the other overlapped the chat interior, and the stated width disagreed with itself by 160px); the two setup docs never cross-referenced each other; the manifest and verification script both had coverage gaps that let this drift go undetected.

## Approved direction

Two independent axes, so the osu! preset stays fully supported without forking shared assets:

- **Layout profile** (gameplay capture geometry): `4x3-rail-osu` (existing right-rail composition, relocated and bug-fixed) and `16x9-full` (new corner-cluster composition for native-16:9 games).
- **Copy preset** (text flavor layered onto shared widgets): `generic` (default) and `osu` (rhythm-flavored, opt-in).

A single shared "brand core" (`shared/`) holds Violet's character art, the Visual Consistency Guide, the Alert Box widget, the chatbox CSS, and generic-copy intermission screens — used by every layout and preset without duplication.

## Exact scene geometry

### `4x3-rail-osu` (canvas 1920×1080 @ 60fps)

| Element | X | Y | Width | Height |
|---|---:|---:|---:|---:|
| Game capture | 0 | 0 | 1440 | 1080 |
| Violet rail | 1440 | 0 | 480 | 1080 |
| Chatbox interior | 1464 | 330 | 432 | 360 |
| Handcam interior | 1452 | 796 | 456 | 256 |
| Alert Box (fixed) | 1440 | 40 | 480 | 260 |

### `16x9-full` (canvas 1920×1080 @ 60fps, new)

| Element | X | Y | Width | Height |
|---|---:|---:|---:|---:|
| Game capture | 0 | 0 | 1920 | 1080 |
| Chat interior | 24 | 776 | 380 | 280 |
| Handcam interior | 1496 | 831 | 400 | 225 |
| Alert Box | 680 | 24 | 560 | 200 |
| Mascot perch (decorative) | 1676 | 521 | 220 | 300 |

All pairwise overlap checks (alert vs. chat, alert vs. handcam, alert vs. mascot, mascot vs. chat, mascot vs. handcam, in both layouts) were computed programmatically and are re-verified on every `verify-pack.sh` run via `assert_no_overlap`.

## Visual system

Unchanged from the original pack's identity anchors and palette (`#090812` / `#15172A` / `#2B1E45` / `#8C63D8` / `#C8ADFF` / `#F2EDFF`) — see `shared/docs/Violet-Visual-Consistency-Guide.md`, now the single source of truth across every layout and preset. The `16x9-full` layout reuses the same thin violet corner-bracket frame language as the original rail frames, applied to its own chat/handcam boxes plus a new mascot-perch box.

## Deliverables

- `shared/` brand core: 3 character poses, Alert Box widget (generic copy, per-alert-type ring/accent variation), chatbox CSS, generic-copy intermission screens, Visual Consistency Guide, Alerts Setup guide.
- `layouts/4x3-rail-osu/`: relocated original assets, Alert Box bug fixed, `scene-layout.json` and setup doc updated and cross-referenced.
- `layouts/16x9-full/`: new corner-cluster overlay assets (`corner-backdrop.png`, `corner-mascot-frame.png`), `scene-layout.json`, setup doc with an explicit "no universally safe corner" caveat.
- `presets/osu/`: osu-flavored intermission screens, alert copy override instructions, the rhythm-styling addendum moved out of the shared guide.
- `source/build-assets.sh` rewritten to be profile-driven (reads `source/profiles/*.json`, no hardcoded pixels) and `source/verify-pack.sh` rewritten to check the full multi-layout tree, manifest completeness, and geometric overlap.

## Acceptance criteria

- Every raster asset has the documented pixel size and correct alpha behavior, for every layout.
- Both `scene-layout.json` files declare an Alert Box entry with a position that provably doesn't overlap chat, handcam, or (16x9-full) the mascot perch.
- `MANIFEST-SHA256.txt` matches the shipped tree exactly — no missing, no orphaned entries.
- Violet reads as the same character across every pose, layout, and preset.
- The `4x3-rail-osu` ambient loop videos loop, contain no audio, and decode as the documented codec/fps/duration.
- A Streamlabs user can reproduce either layout from its setup doc and `scene-layout.json` coordinates alone.
