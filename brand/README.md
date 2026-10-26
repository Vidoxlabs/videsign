# Brand (VWXYZ, mark C)

The mark, favicon, lockups, and wordmarks in this directory are the brand v1 masters. Reference a file by family and version. Do not redraw or approximate the mark.

Promoted masters are kept under the path `design_system/brand/`. Cite that path by name. This repository does not store a link or an id for it.

Digests for every SVG (family, asset, version, sha256) are in [`MANIFEST.json`](MANIFEST.json).

## Mark C

Mark C is the VWXYZ cube.

| Facet | VI |
| --- | --- |
| Top face | Wisteria and Yarrow |
| Side faces | Xylia and Zinnia |
| V band | Violet |

Signature colours:

| VI | Hex | Token |
| --- | --- | --- |
| Violet | `#8B5CF6` | `brand-signature-violet-base` |
| Wisteria | `#B4A7F2` | `brand-signature-wisteria-base` |
| Xylia | `#D92B3A` | `brand-signature-xylia-base` |
| Yarrow | `#F0A020` | `brand-signature-yarrow-base` |
| Zinnia | `#E13D9E` | `brand-signature-zinnia-base` |

Field tiles: dark `#121214` (`brand-field-dark`), light `#F7F7F5` (`brand-field-light`).

Full colour is used on the dark tile. The full-colour mark, the favicon, and the dark lockups do that. The header master is the same full-colour geometry with no tile of its own, and it sits on a dark field. Mono masters are one fill: light `#F7F7F5`, dark `#121214`, or violet `#8B5CF6`. The light lockup uses the dark mono mark and the dark wordmark on the light field. Wordmarks are a single fill, light or dark.

There is no gradient between the five signature colours.

Xylia is never set as text and never appears alone. Text-safe Xylia and text-safe Zinnia are pending. Do not invent those values.

## Names

`brand_{asset}_{variant}_v{NNN}.{ext}`

Examples in this directory: `brand_mark_full-color_v008.svg`, `brand_favicon_px16_v008.svg`, `brand_lockup_horizontal-dark_v004.svg`, `brand_wordmark_dark_v002.svg`.

## Sizes and clear space

Minimum sizes are the master viewBoxes. Do not draw a smaller substitute.

| Use | Minimum |
| --- | --- |
| Favicon | 16px |
| Header mark | 38px |
| Tile mark (full colour and mono) | 81.778px |

Clear space is the padding already inside the master viewBox (the tile, or the same margin on a mono mark). Do not crop the viewBox, and do not place other artwork inside it.

Card and lockup viewBoxes:

| Card | Width | Height |
| --- | --- | --- |
| Horizontal lockup | 226 | 82 |
| Stacked lockup | 146 | 110 |
| Wordmark | 641 | 104 |
| Social card | 1200 | 630 |

## Files

SVG only. Each file is at most 8 KB, text, with no embedded image, no `data:` URI, and no metadata, RDF, or XMP. Raster exports stay out of this repository (ADR-002, amended by ADR-011). The map of facets, sizes, and tokens is in [`brand.json`](brand.json) and [`tokens.json`](tokens.json).
