# VWXYZ reviewer checklist v1

Compare every candidate with that VI's reference anchor and with `palette.json`. If this checklist and `palette.json` disagree on a hex, `palette.json` wins.

Sample each channel from a flat region: the median of a patch of at least 200 px, avoiding line art and highlights. Channels: hair, under-light, eyes (iris), trim, tie and tail tip. Compare with CIEDE2000.

## Thresholds

- Signature (trim, under-light and tail tip), hair and eyes: **ΔE00 ≤ 10** against that VI's canon hex.
- Blazer, shirt and tie: **ΔE00 ≤ 10** against the shared or per-VI hex.
- **Identity-confusion test:** the sampled signature must be closer to its own VI than to any other VI. If it is closer to someone else, it fails even when ΔE00 ≤ 10.
- A borderline color (ΔE00 from 8 to 10) passes and adds a warning in `notes`.

Any fail rejects the file. Record failed item ids and the swatch ΔE00 values.

## Common checks

### C1. Name

The file name matches:

```
^(violet|wisteria|xylia|yarrow|zinnia)_(full|chibi|bg|sheet)_[a-z0-9-]+_v[0-9]{3}\.png$
```

The version number has not been used for that VI, type and slot.

### C2. Sidecar

A JSON sidecar sits next to the PNG. It validates against the sidecar subschema in `asset-manifest.schema.json`. `sha256` matches the PNG. `canon_version` matches `palette.json`. `reference_images` includes the anchor `asset_id` (`{vi}/sheet/anchor/v001`).

### C3. Canvas

| type | Canvas | Mode |
| --- | --- | --- |
| full | 1536x2048 | RGBA |
| chibi | 926x1596 | RGBA |
| bg | 2560x1440 | RGB |
| sheet | 2048x1144 | RGB |

### C4. Alpha

Full and chibi masters have alpha 0 at all four corners and across a border of at least 3% of the canvas. There is no white fringe.

### C5. Framing

- Full: ear tips at 4–6% from the top, soles at 95–97% of the height, body midline within 3% of center. The tail stays inside a 4% side margin.
- Chibi: the figure sits inside the 3% padding, feet on the bottom padding line, horizontally centered.

### C6. Anatomy

Applies to `full`, `chibi` and `sheet`. A `bg` plate has no figure, so C6 does not apply to `bg`.

Exactly one character. Two cat ears, zero human ears, one tail, two arms, and five fingers on each visible hand.

### C7. Family constants

Applies to `full`, `chibi` and `sheet`. A `bg` plate has no figure, so C7 does not apply to `bg`.

All of these are present:

- Black blazer (`#121214`, ΔE00 ≤ 10), single-breasted, notch lapel, with signature piping on the lapel and the collar.
- White shirt (`#F7F7F5`).
- Solid tie, no pattern.
- Short bob with a colored under-light.
- Tail tip in the signature color (last ~15%).
- Flat cel shading: one shadow tone and at most one highlight. Uniform line `#1A1A1F`. No photoreal texture, no 3D gradient, no painterly strands.

### C8. Color

Every sampled channel is inside the thresholds above, and the identity-confusion test passes.

### C9. Text

No legible text, watermark or logo. OCR finds zero words. View labels are allowed only on `sheet`.

### C10. Extras

No brooch, pin, flower, jewellery, hat or colored blazer. Props only from that VI's allowed list in `README.md`. The neutral anchor has no prop.

### C11. Per-VI drift

None of the drift negatives in the table below are present.

### C12. Similarity

Record perceptual similarity to the reference anchor. The numeric gate is not calibrated, so C12 does not reject on its own. Do not invent a cutoff.

### C13. Background plate

Applies to `bg` only. No people. Accent pixels are at most 10% of the frame and do not sit behind the head zone. Base lightness is L* 88–95. Exactly three planes: floor, back wall or window, and one off-center mid-ground element. Nothing busy, no readable copy.

## Per-VI drift negatives

| VI | Must pass | Fails when |
| --- | --- | --- |
| Violet | Hair `#1F1D26` with violet under-light. Eyes `#A066EE`. Trim, under-light and tail tip `#8B5CF6`. Tie black. Full figure wears trousers. Ears are soft black outside and `#CDB3BC` inside. Tail is present. | Brown or plain dark-grey hair, blue eyes, a skirt on a full figure, missing tail, missing violet trim. |
| Wisteria | Hair `#CDC3EE`. Eyes `#86A6F2` (fail if the iris is closer to `#A066EE` than to `#86A6F2`). Trim and tail tip `#B4A7F2`. Tie charcoal. Trousers. | Flowers or florals, a brooch, purple eyes, a black tie, long wavy hair. |
| Xylia | Hair `#E4E6EA` with crimson under-light. Eyes `#C42434`. Trim and tail tip `#D92B3A`. Tie black. Pleated skirt and opaque tights. Expression is severe and composed. | Any teal or cyan, a sneer, glowing eyes, or other villain-coded drift. Grey jacket. Missing tie. |
| Yarrow | Hair `#D6BE8C` with amber under-light. Honey-amber eyes. Trim and tail tip `#F0A020`. Tie charcoal. Pencil skirt with charcoal pinstripe. | Purple trim, purple tie, purple pinstripe, or a green jacket. |
| Zinnia | Hair `#5A3A30`. Magenta under-light and eyes. Trim and tail tip `#E13D9E`. Tie charcoal. Plain pencil skirt. | Orange or ginger hair. Trim closer to `#F43F5E` than to `#E13D9E`. Red or orange blazer. Baked-in text. |

## Verdict

- `full`, `chibi` and `sheet`: C1–C11 pass. C13 does not apply. Outcome: `approved`.
- `bg`: C1–C3, C8–C11 and C13 pass. C6 and C7 do not apply to `bg`. Outcome: `approved`.
- Any applicable check fails: `rejected`, with `failed_items` and swatch ΔE00 values.
- C12 is recorded and is not a gate until a cutoff is calibrated in a later canon version.
