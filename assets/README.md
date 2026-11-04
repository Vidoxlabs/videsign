# Design assets

Local working images for the Nocturne Museum design system. These files are
gitignored — they are never committed to the repository.

## Naming convention

```
{category}-{descriptor}-{NN}.png
```

- lowercase, hyphenated, zero-padded sequence
- `category` describes the asset type (hero-banner, brand-mark, design-board,
  dashboard-mockup, mobile-mockup, screen-mockup)
- `NN` is a two-digit sequence starting at 01

## Current inventory

| File                  | Dimensions  | Purpose                          |
| --------------------- | ----------- | -------------------------------- |
| hero-banner-01.png    | 2172 x 724  | Wide hero/banner concept A       |
| hero-banner-02.png    | 2172 x 724  | Wide hero/banner concept B       |
| hero-banner-03.png    | 2172 x 724  | Finalized wide hero (opaque)     |
| brand-mark-01.png     | 1254 x 1254 | Logo/brand mark concept (alpha)   |
| design-board-01.png   | 1254 x 1254 | Square design board               |
| design-board-02.png   | 1254 x 1254 | Square design board variant       |
| dashboard-mockup-01.png | 1731 x 909 | Desktop dashboard mockup A       |
| dashboard-mockup-02.png | 1731 x 909 | Desktop dashboard mockup B       |
| mobile-mockup-01.png  | 1122 x 1402 | Portrait/mobile mockup            |
| screen-mockup-01.png  | 1672 x 941  | Alternative screen mockup         |

## Hosting rule

Per ADR-002 (see `SKILL.md`), no binary assets may be stored in the repository.
All assets must be hosted on an external CDN and referenced via the
`{ASSET_BASE}` placeholder. These files exist locally for development
reference only.

## Persona and character images

Persona/character images do not use this convention or folder. See `canon/vwxyz/README.md` (naming `{vi}_{type}_{slot}_v{NNN}.png`; images will be served via `{ASSET_BASE}/vi/…`, planned, ADR-010).


## Archived / superseded assets (2026-11-03)

**Agents: read this section before reusing anything in this tree.** The canon of record lives in `canon/vwxyz/`; any asset consumed by an agent must be traceable to a current run folder or to a canon anchor.

| Target | Class | Status | Notes |
| --- | --- | --- | --- |
| `assets/quarantine/run_20261102-1955/` | ViForge pilot run (chibi v002 attempts) | **BURNED — ARCHIVED** | All five files failed C4/C8 self-checks and were archived at the image-permission gate. Never publish, never reference as current. Successor: `run_20261103-snap/` (+ receipts in `pipeline/audit/`). |
| `assets/quarantine/run_20261102-2015/` | ViForge main run (13-slot first wave) | **BURNED — ARCHIVED** | Every in-run version recorded burned per Instructions v1.2 §7; the matte phase turned originals into matted review copies; the palette-snap wave moved the working set onward. Successor: `run_20261103-snap/`. |
| `assets/quarantine/run_20261103-snap/` | snap-corrected candidates (violet v005 / others v003) | **retained as review candidates** | Hold status; awaiting §8d human sign-off. |
| `assets/quarantine/run_20261103-regen/` | procedural fixture candidates | **retained as fixtures only** | `synthetic: true`; explicitly NOT character art. |
| `assets/hero-banner-0*.png`, `assets/design-board-0*.png`, `assets/brand-mark-01.png`, `assets/dashboard-mockup-0*.png`, `assets/mobile-mockup-01.png`, `assets/screen-mockup-01.png` | early design exploration (pre-Brand v1) | **LEGACY — ARCHIVED** | Superseded by `brand/` (mark C + `MANIFEST.json`); do not reference from any product. |
| `assets/spotify/`, `assets/streamlabs/` | third-party app mock references | **LEGACY — ARCHIVED** | Design-exploration references only; not canon, not runtime. |
| `assets/anchors-incoming/` | Set B canon anchors | **LIVE — NOT ARCHIVED** | These are the vi anchor references cited in canon v1 (`{vi}/sheet/anchor/v001`). Do not retire or move without a canon-v2 decision. |

Archive semantics follow canon `cleanup_policy` (mark-only): files are never deleted or moved; supersession is recorded here and in `pipeline/audit/vwxyz-snap-receipts-2026-11-03.md`. ViApp's legacy 16-slot runtime set and vijobs' 13-state companion manifest are documented separately in each repo's own receipts and remain the sanctioned runtime defaults until the v005+ wave is approved and cut over.
