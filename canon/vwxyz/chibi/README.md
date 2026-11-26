# Chibi reference set, first wave

Reference art for the five VWXYZ personas, committed so that agents and humans
can see what a correct chibi looks like before drawing a new expression, pose
or runtime state.

These are **not published assets**. They are **not** approved canon. Read the
status section before using them.

## What is here

- 65 PNGs: five personas x thirteen slots (`neutral`, `happy`, `thinking`,
  `alert`, `success`, `sad`, `smug`, `wink`, and the visemes `viseme-a`, `-e`,
  `-i`, `-o`, `-u`).
- `INDEX.json`: the machine-readable index. One entry per file, carrying the
  canonical asset id, slot, version, SHA-256, sampled colour deltas and the
  recorded review verdict.

Versions differ per persona: Violet is at `v005`, the other four are at `v003`.
Versions are never reused, so a persona's files move on independently of the
others.

File names, canvas and colour mode follow the canon: `926x1596`, `RGBA`,
`{vi}_chibi_{slot}_v{NNN}.png`. The canvas is the chibi master size, not a
downscale, so a file here can be compared with a fresh candidate directly.

## Status: HOLD, and the colour check fails

Every file carries `review.status: hold` with no reviewer. None of them has had
the canon sign-off that promotion requires. Treat the whole set as candidate
art.

Mechanical checks, run with `node scripts/canon-tool.js check`, give this
picture across all 65 files:

| Check | Result |
| --- | --- |
| C1 name and slot vocabulary | 65/65 pass |
| C3 canvas and colour mode | 65/65 pass |
| C4 transparent border | 65/65 pass |
| C8 colour and identity | 65/65 fail |

The C8 failure is the same shape in every file: a saturated red-to-pink family
in the `#FF00xx` and `#FF0050` to `#FF005F` range sits within ΔE00 10 of
another persona's signature, so the identity test rejects it.

Two causes, both recorded rather than assumed:

1. **Edge ringing, about 61% of the offending pixels.** They sit within two
   pixels of a silhouette edge, where a resample from the 928x1600 generation
   down to the 926x1596 master leaves single-pixel overshoot. This is a
   processing artifact, not a drawing error.
2. **Over-saturated accents, the remainder.** Some frames carry highlight
   colours more saturated than the canon signature allows.

Neither cause is a wrong costume, a wrong persona or a missing element. Rejected
candidates are not deleted and versions are not reused; a corrected file is a
new version, for example `violet_chibi_neutral_v006.png`.

Do not record a pass for C8 without a fresh `canon-tool check` result on the
new files.

## How to use this set

Reading it as a target:

- `INDEX.json` maps slot to file to asset id. Filter by `vi` for one persona.
- The canon itself, not these images, is authoritative. Read
  [`../palette.json`](../palette.json) for hexes,
  [`../vocabulary.json`](../vocabulary.json) for allowed slots and
  [`../reviewer-checklist.md`](../reviewer-checklist.md) for the checks. If an
  image here and a canon file disagree, the canon file wins.

Adding an expression, pose or runtime state:

1. Check the slot is in `vocabulary.json` before using it. Unknown slugs are
   rejected, so a new expression is a vocabulary change first.
2. Match the silhouette and the family constants: one tail, two biological cat
   ears and no human ears, the shared black blazer with signature piping, the
   white shirt, a solid tie, the short bob with a coloured under-light, and the
   tail tip in the signature colour.
3. Take the drawing to `canon-tool check`, then to review. A new file is a new
   version number.

What the set deliberately does **not** provide:

- **No rig.** Each slot is an independent drawing. Pose, scale and head
  position differ between frames, so these cannot be swapped over one another
  for lip-sync or idle animation. Measured across one persona's five viseme
  frames, the figure's top edge moves by 121 to 250 pixels. A swappable runtime
  set needs one pose with the head locked, produced separately.
- **No consistent scale.** Neutral figure heights span 934 to 1149 pixels
  across the five personas, about 23%. Side by side the set looks uneven. Any
  presentation copy that needs even sizing must normalise the figures first.
- **No generation sidecars.** Sidecars live beside the local masters, not here,
  because they carry prompt text and external file identifiers that this
  repository does not publish.

## Provenance

The set comes from the `2026-11-03` snap wave, which superseded two earlier
waves recorded as burned. Earlier versions (`v001` to `v004`) and the burned
runs stay out of the repository; only the current candidate of each slot is
committed.

## Related

- [`../README.md`](../README.md): the character canon, including the palette,
  backgrounds, image specs and naming.
- [`../../../SKILL.md`](../../../SKILL.md): the decision ledger. The exception
  that allows these files to be committed is recorded there.
