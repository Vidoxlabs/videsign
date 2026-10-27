# VWXYZ character canon v1

- **Status:** Proposed (pending owner confirmation). Canon v1. Anchor is the Set B sheets dated 2026-06-24. Decisions marked *DEFAULT — revisable* may change in a later canon version.
- **Date:** 2026-10-26.
- **Machine source:** `palette.json`. If this document and `palette.json` disagree, `palette.json` wins.
- **Companion files:** `vocabulary.json` (controlled slugs), `asset-manifest.schema.json` (palette, manifest entry, generation sidecar, request), `reviewer-checklist.md` (C1–C13).

Anchors are asset ids. This directory does not cite external file hosts.

| VI | Anchor asset id |
| --- | --- |
| Violet | `violet/sheet/anchor/v001` |
| Wisteria | `wisteria/sheet/anchor/v001` |
| Xylia | `xylia/sheet/anchor/v001` |
| Yarrow | `yarrow/sheet/anchor/v001` |
| Zinnia | `zinnia/sheet/anchor/v001` |
| Group lineup | `group/sheet/lineup/v001` |

Where an anchor and `palette.json` disagree on a color, the palette wins. Anchors define shape, silhouette, cut and proportion.

Sheet adjustments that are part of canon v1:

- **Violet.** Add the black tail with a violet tip. The full figure wears trousers. *DEFAULT — revisable.* Existing chibi sets stay as they are.
- **Wisteria.** Add the lavender tail tip. She is the pale, low-chroma family exception. *DEFAULT — revisable.*
- **Xylia.** The anchor matches canon. Thin crimson glasses are an optional prop and never appear on the neutral anchor. *DEFAULT — revisable.*
- **Yarrow.** Trim is amber, the tie is charcoal, and the skirt pinstripe is charcoal. Add the amber tail tip. *DEFAULT — revisable.*
- **Zinnia.** Ignore any baked-in caption on older sheets.

## 1. Scope

The five personas are Violet, Wisteria, Xylia, Yarrow and Zinnia. This canon locks character color, family silhouette, backgrounds, canvas sizes and file names. It does not change UI accent tokens. See section 8.

Hex values are canon by decision. They are the values in `palette.json`, used exactly. Do not invent, approximate or substitute a color.

## 2. Shared family constants

| Element | Constant |
| --- | --- |
| Read | Kemonomimi woman. Two biological cat ears in the hair, no human ears. One tail on all five. |
| Hair | Short bob, jaw to chin, with straight or lightly feathered bangs. A colored under-light on the underside of the bangs and the inner trim. |
| Ears | Outer color equals hair. Inner fuzz is the per-VI `inner_ear` hex. Upright by default. |
| Tail | Same color as the hair. The last ~15% is the signature color. *DEFAULT — revisable.* Medium thickness, slight S-curve, from the lower back under the blazer hem. |
| Blazer | Black `#121214`, single-breasted, two buttons, notch lapel, flap pockets, hip length. Thin signature piping on the lapel, outer collar, pocket flaps and cuff edge. Same cut on all five. |
| Shirt | White `#F7F7F5`, point collar. |
| Tie | Solid, standard width, four-in-hand, no pattern and no tie bar. Black `#121214` or charcoal `#3A3A42`, per VI. |
| Shoes | Black only. No colored soles. |
| Skin | `#F6D5C3`, flat, one shadow tone. |
| Line and render | Uniform line `#1A1A1F`. Flat cel shading: one shadow tone and at most one highlight. Large flat eyes with simple white highlights. No photoreal skin, 3D gradients, complex strands or detailed shadow. |
| Full proportions | Adult, about 7 to 7.5 heads tall. Mature face. |
| Chibi proportions | About 1.8 to 2 heads tall. The head is about 55% of the figure height. |
| Banned on all | Baked-in text, watermarks, logos, extra limbs or fingers, human ears, headband ears, colored blazers, a missing tie, jewellery. No brooch, pin, flower or hat. |

## 3. Signature palette

Signature is the trim, under-light and tail-tip color: the color that identifies the VI at thumbnail size.

| VI | Hair | Under-light | Eyes | Trim | Tie | Tail tip | Secondary | Inner ear |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Violet | `#1F1D26` | `#8B5CF6` | `#A066EE` | `#8B5CF6` | `#121214` | `#8B5CF6` | `#C4B5FD` | `#CDB3BC` |
| Wisteria | `#CDC3EE` | `#B4A7F2` | `#86A6F2` | `#B4A7F2` | `#3A3A42` | `#B4A7F2` | `#8FBF9F` | `#ECE9EE` |
| Xylia | `#E4E6EA` | `#D92B3A` | `#C42434` | `#D92B3A` | `#121214` | `#D92B3A` | `#9AA3AE` | `#D9BEC3` |
| Yarrow | `#D6BE8C` | `#F0A020` | `#D99A2B` | `#F0A020` | `#3A3A42` | `#F0A020` | `#B08D57` | `#E6DDCC` |
| Zinnia | `#5A3A30` | `#E13D9E` | `#E04AA0` | `#E13D9E` | `#3A3A42` | `#E13D9E` | `#FF8FC8` | `#D9BCC6` |

Recorded CIEDE2000 of the signature channel (also in `palette.json` under `delta_e_matrix_signature`):

| | Violet | Wisteria | Xylia | Yarrow | Zinnia |
| --- | --- | --- | --- | --- | --- |
| Violet | — | 21.1 | 38.7 | 63.3 | 22.9 |
| Wisteria | 21.1 | — | 41.5 | 50.6 | 28.6 |
| Xylia | 38.7 | 41.5 | — | 39.3 | 23.3 |
| Yarrow | 63.3 | 50.6 | 39.3 | — | 55.4 |
| Zinnia | 22.9 | 28.6 | 23.3 | 55.4 | — |

Minimum signature pair: Violet–Wisteria, 21.1. Every signature pair is at least 20.

Eyes, reported for review, also clear 20. The closest eye pair is Violet–Zinnia at 20.0. Hair is not an accent channel. The closest hair pair is Wisteria–Xylia at 16.5 (pale lavender against silver-white); their under-lights carry that separation. A cross-channel comparison (one VI's eyes against another's trim) can sit under 20 and still pass, because the identity test compares the same element.

Wisteria is the deliberate pale exception: high lightness, lower chroma. Raising her chroma collapses her into Violet. The shared blazer, shirt, piping width and render keep her in the family. *DEFAULT — revisable.*

Review thresholds live in `palette.json`: ΔE00 at most 10 on signature, hair and eyes, and pairwise signature ΔE00 at least 20.

## 4. Lower body and props

None of the props is required on an anchor. The neutral anchor has no prop.

| VI | Lower body | Hosiery and shoes | Tail | Allowed props | Silhouette |
| --- | --- | --- | --- | --- | --- |
| Violet | Black straight trousers | Black loafers | Black, violet tip | Optional floating panel | Minimal and sharp |
| Wisteria | Black straight trousers | Black low pumps | Lavender hair color, lavender tip | Optional stylus | Softer lines |
| Xylia | Black pleated knee-length skirt | Opaque black tights, black loafers | Silver-white, crimson tip | Optional crimson glasses, never on the neutral anchor | Stricter tailoring, less softness |
| Yarrow | Black pencil skirt, charcoal pinstripe | Sheer dark tights, black pumps | Sandy blonde, amber tip | Optional tablet with a map or graph | Stable, not flashy |
| Zinnia | Black plain pencil skirt | Sheer dark tights, black pumps | Dark espresso, magenta tip | Optional tablet and stylus | Kinetic, still composed |

Accessory allowance: no brooches, pins, flowers or jewellery. A small chest emblem already on an approved Violet chibi may remain on that existing set. New art does not add it.

## 5. Backgrounds

### Shared rules

1. Flat-shaded minimalist interior, same line family as the character, slightly lighter.
2. Exactly three planes: floor, back wall or window, and one mid-ground element off center, never behind the head.
3. Eye-level camera. Horizon near the hip, about 45% from the bottom. No extreme perspective.
4. Soft daylight from the upper left, flat fill, no cast shadows on the wall. The persona accent appears only as an emissive line or glow.
5. Base is light so the black blazer stays a clear silhouette. Accent area is at most 10% of the frame and never sits directly behind the head or ears.
6. Base and mid stay low chroma, tinted toward the persona hue. Only accent lines use full signature saturation.
7. No people, text, logos or legible copy. At most one plant or prop.
8. Canvas 2560x1440. The character safe area is the central 60% of the width.

### Concepts

| VI | Name | Setting | Base / mid / line | Mood | Motifs | Avoid |
| --- | --- | --- | --- | --- | --- | --- |
| Violet | Orchestration Deck | Quiet operations deck, wide window, low console, violet routing lines toward a soft V | `#ECE9F4` / `#D5CFE6` / `#8B5CF6` | Calm command, quietly mysterious | Converging lines, a faint V | Dark bridge clutter, a literal logo |
| Wisteria | Lattice Studio | Bright editorial room, lattice wall, a few lavender ribbons, a writing desk | `#F3F0F7` / `#DCD6EA` / `#B4A7F2` | Warm, composed daylight | Lattice and a vine-like ribbon. Sage `#8FBF9F` at most 3% | Flower overload, floral wallpaper |
| Xylia | Review Chamber | Austere audit room, one glass partition, one crimson line dividing a panel | `#EEF0F2` / `#CDD2D8` / `#D92B3A` | Austere, exact, monochrome | One dividing line, symmetric panels | Alarm red, horror cues, more than one red element |
| Yarrow | Map Room | Warm analysis room, pale-gold contour lines, a faint compass rose in the floor | `#F4EFE4` / `#E0D5BE` / `#E3B65A` | Grounded, steady, oriented | Contour lines, compass rose at low opacity | Explorer kitsch, library clutter |
| Zinnia | Launch Lane | Bright operations floor, a magenta timeline track along wall and floor | `#F6EEF3` / `#E6D2DE` / `#E13D9E` | Bright, brisk, forward | Lane stripes, small flat markers | Stadium literalism, confetti, orange or red |

Background slugs are in `vocabulary.json`: `orchestration-deck`, `lattice-studio`, `review-chamber`, `map-room`, `launch-lane`.

## 6. Image specs

| type | Master | Mode | Framing |
| --- | --- | --- | --- |
| `full` | 1536x2048 | RGBA, transparent | One figure, head to toe. Ear tips at 5% ±1% from the top, soles at 96% ±1%, midline within 3%. Tail inside a 4% side margin. |
| `chibi` | 926x1596 | RGBA, transparent | Twice the 463x798 runtime cell. 3% padding. Feet on the bottom padding line. Outer outline about 6 px `#1A1A1F`. Signature sticker rim about 4–6 px at about 60% opacity. |
| `bg` | 2560x1440 | RGB | No characters. Section 5. |
| `sheet` | 2048x1144 | RGB | Front, three-quarter, side and back at equal height. View labels are allowed only here. |

The default full pose is a neutral stand, relaxed, front or a slight three-quarter, matching the anchor front view.

A character-on-background composite is an export only. Edits happen on the transparent master. Name a full composite with slot `scene-neutral` (or another `scene-` slot) at 2560x1440, figure height about 88% of the canvas, inside the central 60% of the width.

Chibi first wave, per VI: `neutral`, `happy`, `thinking`, `alert`, `success`, `sad`, `smug`, `wink`, plus viseme slots `viseme-a`, `viseme-e`, `viseme-i`, `viseme-o`, `viseme-u`. The outfit is the full outfit simplified, including that VI's lower body and the signature tail tip.

## 7. Naming

```
{vi}_{type}_{slot}_v{NNN}.png
```

- `vi` is `violet`, `wisteria`, `xylia`, `yarrow` or `zinnia`.
- `type` is `full`, `chibi`, `bg` or `sheet`.
- `slot` is a lowercase kebab-case slug from `vocabulary.json`.
- `vNNN` is three digits, starting at `v001`. The number is never reused, including after a rejection.

A slot is one of:

- an expression (`neutral`, `happy`, …)
- a pose, on `full` only (`standing`, `point-forward`, `arms-crossed`, `holding-tablet`, `typing`, `wave`, `walking`, `seated`)
- a pose plus an expression, joined with a hyphen
- a viseme (`viseme-` plus `a`, `e`, `i`, `o` or `u`)
- a Violet chibi runtime state (`alert`, `loading`, `searching`, `success`, `planning`, `keyboard`, `snack`)
- a background slug
- a sheet anchor (`anchor`)
- the group lineup (`lineup`). Its asset id uses vi `group`, which is not a character
- a scene slot (`scene-` plus a kebab slug) for a full composite

Examples: `xylia_full_neutral_v001.png`, `zinnia_chibi_viseme-a_v003.png`, `yarrow_bg_map-room_v001.png`, `violet_sheet_anchor_v001.png`.

Published object keys use the same parts as a path: `{ASSET_BASE}/vi/{vi}/{type}/{file}`. Keys are immutable. A new version is a new name, never an overwrite.

The asset id form is `{vi}/{type}/{slot}/v{NNN}`, for example `violet/sheet/anchor/v001`.

New expressions, poses, states or background slugs are added to `vocabulary.json` before they are used. Unknown slugs are rejected.

Expression notes in the vocabulary are binding. Xylia's `angry` and `disgusted` are cold disapproval, not villain-coded, and her `laugh` is a restrained smirk. Zinnia is never goofy. Yarrow stays measured. Wisteria's `angry` is quiet disappointment. Violet's `disgusted` is a dry side-eye.

## 8. UI accents and ADR-002

Character color and UI accent color are different layers.

| VI | Character signature (`palette.json`) | UI accent token in `DESIGN.md` (not changed here) |
| --- | --- | --- |
| Violet | `#8B5CF6` | `#8B5CF6` |
| Wisteria | `#B4A7F2` | `#A78BFA` |
| Xylia | `#D92B3A` | `#2DD4BF` |
| Yarrow | `#F0A020` | `#F59E0B` |
| Zinnia | `#E13D9E` | `#F43F5E` |

`palette.json` is the source for character art. `DESIGN.md` persona accent tokens are the source for UI dots, rings and badges. This canon does not edit those tokens. ADR-010 requires each UI accent to equal the canon signature, or an explicitly listed text-safe variant. Enforcement of that equality is a later token change, not this document.

Do not paint character art with the UI teal or the UI rose. Xylia's character signature is crimson `#D92B3A`. Zinnia's is magenta `#E13D9E`. Both of those UI retirements are *DEFAULT — revisable* and land with the token change.

Persona images follow ADR-002. They are never committed to this repository. No binary masters, sheets or boards belong here. The public path will be `{ASSET_BASE}/vi/{vi}/{type}/{file}` (planned, ADR-010). Consumers resolve `{ASSET_BASE}` in their own build.

Every persona image needs alt text that names the persona and the expression or pose, for example `alt="Violet, confused"`.

## 9. How to get assets

1. Read `palette.json`, `vocabulary.json` and `reviewer-checklist.md` from this directory, or from the videsign MCP resources that serve the same files.
2. The public URL will be `{ASSET_BASE}/vi/{vi}/{type}/{vi}_{type}_{slot}_v{NNN}.png` (planned, ADR-010). Example: `{ASSET_BASE}/vi/violet/chibi/violet_chibi_neutral_v001.png`.
3. Use only assets that have passed review. A generation sidecar validates against the sidecar subschema. It records tool, model, seed, the final prompt, the negative prompt, the anchor `asset_id`, hashes, canvas and the checklist result. Prompt text is not published in this repository.
4. Fetch tools on the MCP server are not part of this version. Until they exist, consumers use the URL pattern above. Do not hotlink an external file host, and do not commit the PNG.
