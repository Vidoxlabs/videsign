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
`{ONEDRIVE_ASSET_BASE}` placeholder. These files exist locally for development
reference only.
