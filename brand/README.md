# Brand v1 (mark C)

The mark, favicon, lockups, and wordmarks in this directory are the brand v1 masters. Reference a file by family and version. Do not redraw or approximate the mark.

Promoted masters are kept under the path `design_system/brand/`. Cite that path by name. This repository does not store a link or an id for it.

Digests for every SVG (family, asset, version, sha256) are in [`MANIFEST.json`](MANIFEST.json).

`brand-signature-*` in [`tokens.json`](tokens.json) is the target signature set. Those values become the persona accents once the canon record lands. Until then the persona accents in `DESIGN.md` stay in force. `ambient-glow-teal-base` in `DESIGN.md` stays the default glow. `ambient-glow-wisteria-base` is the pending successor.

## Mark C

Mark C is the five-colour cube.

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

Full colour is used on the dark tile. The full-colour mark, the favicon, and the horizontal lockup on the dark field do that. The header master is the same full-colour geometry with no tile of its own, and it sits on a dark field. Mono masters are one fill: light `#F7F7F5` on a dark field, dark `#121214` on a light field, or violet `#8B5CF6`. The horizontal lockup on the light field uses the dark mono mark and the dark wordmark on the light field. Wordmarks are a single fill, light ink on a dark field or dark ink on a light field.

On a lockup, `horizontal-dark`, `horizontal-light`, and `stacked-dark` name the field. On a mark, `mono-dark` and `mono-light` name the ink. On a wordmark, `dark` and `light` name the ink. `on-dark` and `on-light` would name the field. Shipped masters keep the brand-index filenames. Versions are never reused.

Full colour is banned on the light field `#F7F7F5`. Wisteria `#B4A7F2` and Yarrow `#F0A020` are about 2.01:1 on that field, below 3:1.

There is no gradient between the five signature colours.

Xylia is never set as text and never appears alone. Text-safe Xylia and text-safe Zinnia are pending. Do not invent those values.

## Interim contrast rule (pending the owner)

No normal-size label of any colour on Violet `#8B5CF6`. Measured against that fill: `#121214` is 4.42:1, white is 4.23:1, and `#F7F7F5` is 3.95:1. All three fail 4.5:1 for normal text and pass 3:1 for large text (at least 24px, or at least 18.66px and bold). This is a revisable default pending the owner.

#7C3AED is to be retired once ADR-011 is ratified. Until then the live value for new CTA fills and focus rings stays `#7C3AED`. Persona Violet `#8B5CF6` is the target for those fills and rings after that ratification, under this label rule. The `DESIGN.md` value of `{colors.surface-accent-violet-base}` stays `#7C3AED` until a follow-up changes it. `{effects.ambient-glow-violet-base}` stays `rgba(124, 58, 237, 0.30)`.

## Names

`brand_{asset}_{variant}_v{NNN}.{ext}`

Lockup suffixes name the field. Mark and wordmark suffixes name the ink. `on-dark` and `on-light` would name the field. Shipped files keep the brand-index names.

Examples in this directory: `brand_mark_full-color_v008.svg`, `brand_favicon_px16_v008.svg`, `brand_lockup_horizontal-dark_v004.svg`, `brand_wordmark_light_v002.svg`.

## Sizes and clear space

Minimum sizes are the master viewBoxes. Do not draw a smaller substitute, except the header case below.

| Use | Minimum |
| --- | --- |
| Favicon | 16px |
| Header mark | 38px |
| Header under 38px | favicon-grade mark, down to 24px |
| Tile mark (full colour and mono) | 81.778px |

Headers under 38px may use the favicon-grade mark down to 24px. This directory has the px16 master. It does not contain a px32 master.

Clear space is the padding already inside the master viewBox (the tile, or the same margin on a mono mark). Do not crop the viewBox, and do not place other artwork inside it.

Card and lockup viewBoxes:

| Card | Width | Height |
| --- | --- | --- |
| Horizontal lockup | 226 | 82 |
| Stacked lockup | 146 | 110 |
| Wordmark | 641 | 104 |
| Social card | 1200 | 630 |

## Files

SVG only. Each file is at most 8 KB of SVG text. The check is an allow-list: elements `svg`, `g`, `path`, and `rect`; a closed set of attributes; fills and strokes only from the five signature colours and the two field neutrals. `use`, `href`, `xlink:href`, and `xmlns:xlink` are rejected, including a same-document fragment. A leading byte-order mark is rejected. It rejects comments, editor namespaces, script, event-handler attributes, `foreignObject`, external references, external `url()`, `title` and `desc`, non-SVG text, `javascript:` and `data:` in any attribute, and any other colour. `none` and `currentColor` are rejected because these masters do not use them. Raster exports stay out of this repository (ADR-002, proposed amendment ADR-011). The map of facets, sizes, and tokens is in [`brand.json`](brand.json) and [`tokens.json`](tokens.json).
