# Violet Visual Consistency Guide

Use this guide whenever Violet needs a new pose, emote, alert, thumbnail, or scene — for any layout profile or game. The goal is recognition first: pose and action can change, but her identity anchors do not.

This is the single source of truth for Violet's character identity across the whole pack. Layout profiles (`layouts/*/`) and copy presets (`presets/*/`) may add their own styling notes on top of this guide — see `presets/osu/Rhythm-game-styling.md` for the osu! preset's motif rules — but none of them may override the identity anchors or palette below.

## Identity anchors

**Outfit updated 2026-08-29** (second revision, same day): the identity anchors below reflect the approved "VioletLabs desk" direction — black hoodie with a violet V-chevron logo, not the earlier tailored blazer. If you find blazer-era art anywhere in this pack, it's pending an update, not a second valid variant.

| Area | Keep consistent | Avoid |
|---|---|---|
| Age and proportions | Adult woman; mature, elegant anime proportions | Childlike or chibi body proportions for primary art |
| Face | Soft V-shaped jaw, restrained nose, violet almond eyes, subtle confident smile | Round toddler-like face, oversized circular eyes, broad grin |
| Hair | Short straight black bob, jaw-to-neck length, controlled violet underlights | Long hair, ponytails, blue-dominant hair, heavy curls |
| Ears | Black cat ears, pale inner fur, balanced size and placement | Animal muzzle, extra ears, oversized costume ears |
| Outfit | Black hoodie, drawstrings, violet V-chevron logo on the left sleeve | Tailored blazer/tie, exposed midriff, bright multicolor accessories |
| Mood | Calm, capable, slightly smug, quietly warm | Frantic reaction-face energy or aggressive expression |
| Rendering | Polished semi-realistic anime, crisp silhouette, cool rim light | Flat clip art, heavy cel-shaded outlines, photorealism |

## Environment anchors (desk setup)

New as of the "VioletLabs desk" revision — these props establish the setting whenever Violet is shown at her desk (intermission screens, and any future full-scene render):

| Element | Detail |
|---|---|
| Monitors | Dual monitor stack; top monitor shows the violet V-chevron logo + "VIOLETLABS" wordmark; bottom monitor shows stream chat |
| Desk lighting | Neon cat-face lamp beside the monitors, violet LED strip along the desk edge, mechanical keyboard with violet backlighting |
| Shelf details | Black cat plushie/figure, a large violet V-chevron neon sign, a framed "FOCUS / PLAN / EXECUTE" poster, a small potted plant |
| Mug | Black mug with the same V-chevron logo, matches the sleeve logo |
| Backdrop | Rainy night skyline through a window — unchanged from the original pack's atmosphere, this is the one element that survived the outfit revision |
| Seating | Dark gaming chair |

## Core palette

| Token | Hex | Use |
|---|---|---|
| Night Black | `#090812` | Deep backgrounds |
| Glass Navy | `#15172A` | Panel interiors |
| Smoky Violet | `#2B1E45` | Secondary surfaces |
| Violet Edge | `#8C63D8` | Suit piping and edge light |
| Soft Lavender | `#C8ADFF` | Names and small highlights |
| Moon White | `#F2EDFF` | Primary text and shirt highlights |

Violet accents should stay controlled. Large bright-purple fills make the stream louder and weaken the late-night mood. Any new layout, alert accent, or per-type visual variation (see `shared/widgets/alerts/alertbox.css`'s per-`data-type` rules) must be built from these exact tokens — do not introduce new hues.

*(Note: a separate `Design System/` brand system elsewhere in this workspace defines a `#7c3aed`-family palette for Vidoxlabs product/website UI. That is a different, unrelated brand system for app chrome — it is not the authority for this character. This table is.)*

## Pose system

Actions should be readable from silhouette at small sizes. Good additions include:

- Adjusting headphones or listening to game audio.
- Holding a mug during a break.
- Checking a tablet, stylus, or notes.
- Resting a hand on the desk while watching the screen.
- A compact blink, breath, steam, or edge-glow loop.

Keep hands anatomically clear and keep props simple. Do not place UI text inside tablets or screens; it tends to become noisy and inconsistent.

## Composition rules

- Gameplay owns the largest and quietest region of any layout.
- Violet faces may establish a focal point, but should not look directly out of every asset.
- Secondary Violets should be smaller and lower contrast than the top anchor.
- Chat and handcam interiors stay unobstructed by any character, animation, or frame ornament — see each layout's `scene-layout.json` `safeInteriors`.
- Decorative motion stays confined to Violet's own zone (the rail in `4x3-rail-osu`, the corner cluster in `16x9-full`) — it never spills across the live game area.
- Stagger animation cues; do not trigger several loops at once.

## Reusable generation brief

> Preserve the same Violet character identity: adult anime woman, mature elegant face and proportions, short straight black bob with restrained violet underlights, violet almond-shaped eyes, black cat ears with pale inner fur, black hoodie with a violet V-chevron logo on the left sleeve. Render in a polished semi-realistic anime style with a crisp silhouette, controlled deep-violet highlights, and soft cool rim light. Keep the expression calm, capable, and subtly smug. Isolate the complete figure and props on a genuine transparent alpha background; include no scenery, panel, text, logo, or extra character.

Attach the existing Violet references and at least one approved pose whenever generating new art. Compare the new face, hair silhouette, ear placement, hoodie logo placement, and eye color beside the current pose lineup before accepting it.

**Known gap (2026-08-29 revision):** the pack does not yet have transparent, isolated character-cutout art in this hoodie outfit — only finished full-scene composites (`shared/scenes/intermission/*.png`), which already include the desk background baked in. The 3 pose cutouts in `shared/characters/` (`violet-headphones.png`, `violet-mug.png`, `violet-tablet.png`) and the `layouts/4x3-rail-osu` gameplay background/rail still show the earlier blazer outfit and have not been updated to match. Regenerating those against this brief — as isolated alpha cutouts, not full scenes — is the next step to bring the rest of the pack in line.
