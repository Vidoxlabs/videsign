# Family repository banners

- Date: Tuesday, 24 November 2026, America/New_York
- Status: family banner system, 24 November 2026.
- Folder: `repo-assets/banners/` (this directory)
- Contact sheet: `contact-sheet.png` (all eight, light and dark; sha256 `c73f9bcf1809f75dae171ac109895a09f96d791f4dc939a2e23a036c1eec0ffb`; kept outside videsign)
- Close-up sheet: `contact-sheet-closeup.png` (Seed and Bloom, light, full size; sha256 `026b950db0c7af15a09252f04f502ed7218942e79e792ac7599d94d0f8383cf1`; kept outside videsign)

These banners are a typographic system with one line-drawn botanic glyph per repository. They are meant for GitHub README headers, GitHub social previews, and other covers such as a notebook header. They follow videsign tokens. They are not the 22 November 2026 filled-tile marks; those remain a separate proposal for repository icons.

## 1. The system

One layout, eight instances. Shared grid, type, palette, mark placement, and stroke weight. The only things that change are the glyph, the repository name, and the tagline.

### 1.1 Field and ink

| Role | Token | Hex | Use |
| --- | --- | --- | --- |
| Dark field | `brand-field-dark` | `#121214` | Dark banners and the default social card |
| Light field | `brand-field-light` | `#F7F7F5` | Light banners and the optional light social card |
| Title and glyph on dark | `brand-field-light` | `#F7F7F5` | One ink on the dark field (17.44:1) |
| Tagline on dark | `text-content-secondary-base` | `#A1A1AA` | One-line role (7.30:1 on `#121214`) |
| Title and glyph on light | `brand-field-dark` | `#121214` | One ink on the light field (17.44:1) |
| Tagline on light | `text-content-secondary-light` | `#475569` | One-line role (7.06:1 on `#F7F7F5`) |
| Five-bar | `brand-signature-violet-base` … `zinnia-base` (same hex as the five house accents) | `#8B5CF6` `#B4A7F2` `#D92B3A` `#F0A020` `#E13D9E` | Official order, left to right |
| Five-bar chip (light only) | `brand-field-dark` | `#121214` | See the five-bar note below |

Anything that carries the mark or the wordmark uses the brand fields, not the product-UI surfaces. Title and glyph share one ink per field: `#F7F7F5` on dark, `#121214` on light. There is no white (`#FFFFFF`) next to `#F7F7F5`, and no `#0F172A` next to `#121214`.

Glyphs are monoline. Colour lives in Mark C and the five-bar, not as a per-repo coat of paint. That keeps the products from reading as characters.

### 1.2 Grid

**README banner, 1280×320**

- Margin 80px left and right.
- A reserved 82px mark column starts at the left margin. The title starts 20px to the right of that column (x=182) on both fields, so the five-bar does not jump under `prefers-color-scheme`.
- Dark field: `brand_mark_header_v008.svg` (no tile, minimum 38px) at 48px, right-aligned in the column, vertically centred on the title cap-height.
- Light field: `brand_mark_mono-dark_v008.svg` at 82px (at or above the 81.778px tile minimum), filling the column. Full colour is not used on the light field.
- Title: Geist 600, 64px, tracking −0.02em (`typography-tracking-tight-base`).
- Tagline: Geist 400, 22px, tracking 0, under the title.
- Five-bar (28×5px pills, 3px gutters) under the tagline, left-aligned with the title, at the same origin on light and dark. On the dark field the bars sit on `#121214`. On the light field they sit on a `#121214` chip, outdented 8px / 6px around that origin (4px radius). The chip is kept because Wisteria and Yarrow fail the 3:1 graphics floor on `#F7F7F5` (2.01:1). Dropping the bar would lose the family identifier that ties the eight banners together.
- Glyph in a 200px square, right-aligned at the 80px margin, vertically centred in the banner. Each glyph stays inside the 6-unit inset of that square, stroke included.
- The type block is vertically centred as a unit.

**Social / notebook cover, 1280×640**

These cards use GitHub's recommended social-preview size (1280×640). Canon `social_og` remains 1200×630 for Open Graph; these banners are the GitHub size only.

- Margin 96px.
- Top-left: the canonical horizontal lockup, unmodified, at its own 226×82 minimum. Dark: `brand_lockup_horizontal-dark_v004.svg` on `#121214` (the lockup's field rect merges with the card). Light: `brand_lockup_horizontal-light_v005.svg` on `#F7F7F5`. The lockup is not assembled from a separate mark and wordmark.
- Title: Geist 600, 80px, tracking −0.02em.
- Tagline: Geist 400, 26px.
- Five-bar under the tagline, same bar geometry and origin rule as the README banner.
- Glyph in a 280px square, right side, vertically centred.
- Type sits in the field below the lockup. The extra field is intentional.

No glow, no gradient, no glass, no texture, no drop shadow, no 3D, no sparkles, no circuit or brain motifs, no stock “AI” decoration. Stroke weight is uniform: one fortieth of the glyph square (5px at 200px, 7px at 280px), round caps and joins.

### 1.3 Glyphs

Each glyph is a geometric line drawing of the plant the repository is named for, with one restrained nod to what the system does. Designed on a 64-unit grid with a 6-unit inset.

| Repo | Glyph |
| --- | --- |
| Seed | A fuller pointed almond with a vertical contract seam |
| Bloom | An opened flower: five long pointed petals and a small centre |
| Capillary | One trunk dividing into finer veins: a midrib and two laterals, each of which splits once |
| Drosera | Three sundew tendrils from a basal pad, each ending in a hook (a small circle) |
| Aestivation | A closed bud: a pointed inner oval with two open sepal strokes wrapping it |
| Myosotis | A forget-me-not: five notched petals and a clear central eye |
| Trellis | A 3×3 lattice with five check-points (four corners and the centre) |
| Docs | An asymmetric leaf (tighter left, fuller right) with a midrib, three right-hand laterals, and a short petiole |

Bloom and Myosotis are both five-petal flowers on purpose, but they do not share a silhouette: Bloom is open and pointed; Myosotis is notched, like the living forget-me-not.

### 1.4 Type and license

- Family: Geist, which is videsign’s `typography-family-sans-base`.
- License: SIL Open Font License 1.1. Copyright The Geist Project Authors (https://github.com/vercel/geist-font). Geist 1.800 was used. A copy is in `LICENSE-Geist-OFL.txt`.
- Outlining is allowed: the OFL’s font-license requirement does not apply to a document made with the font. The reserved name is not used inside the SVG files; the letters are paths.
- Final SVGs contain no `font-family`, no `@font-face`, no external references, and no scripts. GitHub will not need to load a web font.

## 2. Taglines

Plain, short, and taken from each repository’s role and current README, not from marketing language.

| Repo | Tagline |
| --- | --- |
| Seed | Contracts and schemas for the runtime |
| Bloom | Workspace, CLI, and terminal UI |
| Capillary | Context with its sources attached |
| Drosera | Tools, skills, hooks, and cookbooks |
| Aestivation | Plans, verdicts, and the assembly gate |
| Myosotis | Memory that keeps only what you allow |
| Trellis | Multi-point tests for the family |
| Docs | The documentation hub |

No terminal period. These are labels, not sentences. The Capillary and Myosotis taglines were revised on 24 November 2026; the other six are unchanged.

## 3. Files

Authoritative digests for every file, including `@2x` PNGs, are in `SHA256SUMS`. Primary files:

| File | sha256 |
| --- | --- |
| `seed-banner.svg` | `2f7185c94d152547a6c3e9e0e54eac56a8c020c3bfd1c62c83fc61d8eb929807` |
| `seed-banner-dark.svg` | `4d65bf9f29edfa5bfdbe725e40597a2814e017297d56ed1142014136185955c1` |
| `seed-social.svg` | `378e112f8a58c6708d330925d2749aa23e12bbafcb884ed9003dc011de4a6df2` |
| `bloom-banner.svg` | `4082fe33ac19b370d2658582b8a8d74472e3512824f1f026ee63001079415a11` |
| `bloom-banner-dark.svg` | `1b16925d688f7cb7bbc628256dd6fc23933accb9bf86974715dcd0696861ae13` |
| `bloom-social.svg` | `4976818679f268e40fb9f089475060ecda52a226db71cff737aed39bfc058155` |
| `capillary-banner.svg` | `fa728accccdf2d56288a6cb753b52ce7478e446c5bcc69b2bf7f444fd9ce971f` |
| `capillary-banner-dark.svg` | `b3d892b4eb17920e7694a95a6a4d1cd3d6e95cb0b583703ff0d6cf9b5262d736` |
| `capillary-social.svg` | `bd665d2f49abbd425abc88c42e2b71a8046a2a94c2d0422196581d30d1aa8c3b` |
| `drosera-banner.svg` | `f37c4470a2b8b5b8a91b9dbe953ba37f5e0231ca44ee01969bd660f65d595308` |
| `drosera-banner-dark.svg` | `f53b6e56eebd0c30e1ce6f56062bfa4cfd95e77bf1d5e0c56aef7356f1c518f1` |
| `drosera-social.svg` | `c0042275e2a62c43cb58fd4077c1204acb0e22dd08be7e9a261f93285e00365b` |
| `aestivation-banner.svg` | `e68afabcc9e467bccad0c88ce5d01f5fd858d33cdb09d760a924d6f6842efaf6` |
| `aestivation-banner-dark.svg` | `3fbf509d3f7e4fac8607a7906977fb30b23caf0e2ecd9fd774e35ed7eec0b690` |
| `aestivation-social.svg` | `8daf71b1d2b0c5b81bbbd27f1723341fb032413c5dec5ec24a3be4e3d2094523` |
| `myosotis-banner.svg` | `42a10d162a5b2596bfee3d0a1f2db784a79460b0aec1deb672ab101a576a32d3` |
| `myosotis-banner-dark.svg` | `08805063a15db505a5489cc8b435fa0c9185cdc3d48b1b9b1b09686b04a25c6f` |
| `myosotis-social.svg` | `9db8f43d61654ad310285fa27d134acfb039465255d5312427d985f34841f48c` |
| `trellis-banner.svg` | `e4fc141c192323c59837be8b4a5aa3b64ba0b6a71954f114a0f782643848cd12` |
| `trellis-banner-dark.svg` | `17c3eabfef6e0e0197a929382b36876be08e6343efd92186ebce323d9af763f4` |
| `trellis-social.svg` | `22c0b4778e44ac4fe7158fdb47de5abcf9d22369c38f3a0119bf6c85a34bdecf` |
| `docs-banner.svg` | `134631e8ecea56e348bc0c3b0de7ece9fb785d74e3c6c87c85f4209238a30cae` |
| `docs-banner-dark.svg` | `bdff0532cc96eee694cc872e1939ce2eaf77c89893a14a526f43a44a9ba4f97b` |
| `docs-social.svg` | `500043efb9c044b234341540c9a6a7802117de8334c3c19448c3c01607dec576` |
| `contact-sheet.png` (kept outside videsign) | `c73f9bcf1809f75dae171ac109895a09f96d791f4dc939a2e23a036c1eec0ffb` |
| `contact-sheet-closeup.png` (kept outside videsign) | `026b950db0c7af15a09252f04f502ed7218942e79e792ac7599d94d0f8383cf1` |
| `LICENSE-Geist-OFL.txt` | `021caa749f89fecd7c2e40a50499de29e84d2bc19251659b47d499c2fbfffc17` |

Each repository also has:

- `{repo}-banner.png` and `{repo}-banner@2x.png` (1280×320 and 2560×640, light)
- `{repo}-banner-dark.png` and `{repo}-banner-dark@2x.png`
- `{repo}-social.png` (1280×640, dark — the default GitHub social preview and notebook cover)
- `{repo}-social-light.png` and matching `.svg` (optional light cover)

PNGs were rendered from the SVGs in a headless browser at 1× and 2×, then saved without text chunks. The SVGs are the source of truth.

## 4. README snippet

Ship both the light and dark README banners with a `<picture>` block and `prefers-color-scheme`. GitHub documents support for `<picture>` in README files. The light banner is a self-contained card and still reads if the dark source is ignored. Example for Seed; swap the name, files, and alt text for the others. Paths are `.github/assets/` in each family repository. The `img` sets `width` only, so GitHub's `max-width: 100%` keeps the 4:1 aspect at narrow widths. The README's first line under the banner repeats the tagline in text.

```html
<picture>
  <source media="(prefers-color-scheme: dark)" srcset=".github/assets/seed-banner-dark.svg">
  <img src=".github/assets/seed-banner.svg" alt="Seed banner: a seed with a vertical contract seam, and the tagline Contracts and schemas for the runtime." width="1280">
</picture>

Contracts and schemas for the runtime
```

Alt text for every repository is in `_build.py` (`REPOS[].alt`) and follows the 22 November rule: name the product, describe the glyph in plain language, do not name a character.

A custom GitHub social preview is not set by committing a file. After a later, approved merge, `{repo}-social.png` still has to be uploaded in the repository Settings.

## 5. Trademark note

The official Mark C (and, on the social cards, the official wordmark) stays on the MIT family repositories. The note below is the exact text to use. It is two sentences, in plain language.

> The Vidoxlabs name and mark are trademarks of Vidoxlabs LLC. They are not covered by this repository's MIT license.

Placement, on each of the eight MIT family repositories (seed, bloom, capillary, drosera, aestivation, myosotis, trellis, and docs):

1. README footer: the same two sentences at the end of the README, after the license mention.
2. A `TRADEMARKS.md` file at the repository root, containing only those two sentences.

videsign is not an MIT repository and does not take this note. Its own license file already covers that tree.

Example README close, for any of the eight:

```markdown
## License

This software is licensed under the MIT License. See [LICENSE](LICENSE).

The Vidoxlabs name and mark are trademarks of Vidoxlabs LLC. They are not covered by this repository's MIT license.
```

## 6. Confirmed paths (for a later apply)

None of the eight repositories currently has an `assets/` or `.github/assets/` folder. Paths are now confirmed:

- **Each family repository:** `.github/assets/`, keeping the file names in this pack (`seed-banner.svg`, and so on). That matches the 22 November asset-pack convention and keeps the README images out of the library source tree.
- **videsign:** `brand/repo-banners/`, as the design-continuity library. videsign does not get a ninth product banner in this round.

What each destination receives is listed in §8.

## 7. videsign notes and mismatches

videsign tokens were read from `DESIGN.md` and `brand/tokens.json` on `main` (head `d887940` at the time of this work). They win for these banners.

The in-repo character-canon signature hexes match the videsign accent tokens exactly (`#8B5CF6`, `#B4A7F2`, `#D92B3A`, `#F0A020`, `#E13D9E`). Those are the only character-canon values used here. Character-only colours (hair, skin, eyes, backgrounds) are not used.

Field-token differences, already present in videsign, and how the banners resolve them:

| Surface | Brand field | DESIGN.md surface | Banners use |
| --- | --- | --- | --- |
| Dark | `brand-field-dark` `#121214` | `surface-background-primary-base` `#0A0A0E` (secondary `#12121A`) | `#121214`. Product UI keeps the DESIGN.md surfaces; brand artefacts use the brand fields. |
| Light | `brand-field-light` `#F7F7F5` | `surface-background-primary-light` `#F8F9FA` | `#F7F7F5` |
| Title and glyph | — | — | `#F7F7F5` on dark, `#121214` on light. One ink per field. |

Contrast rules already recorded in videsign still apply and were respected:

- White on `#8B5CF6` is 4.23:1 and fails for normal text. No title or tagline sits on a violet fill.
- Wisteria and Yarrow are 2.01:1 on a light field and fail the 3:1 graphics floor. Full colour, including the five-bar, never sits directly on the light field. The bars use a `#121214` chip. Light banners use the mono-dark mark, not the full-colour tiled mark.
- The first signature red is never used as text and never appears alone. It appears only as one bar in the five-bar, or as one facet of Mark C.

Geist is already the videsign sans family, so there is no font mismatch.

## 8. Later PR plan (not to be run now)

Nine squash pull requests, never pushed to `main`, after a later apply is approved. No issue comments, no settings changes, and no social-preview upload in those PRs. Settings (topics, homepage, the GitHub social-preview upload) remain a separate, approved pass.

### 8.1 Each family repository (eight PRs)

One PR per repository. Title only, for example: `Add the family README banner and social card.`

New files, shown here for Seed; swap the repository id for the others:

- `.github/assets/seed-banner.svg`
- `.github/assets/seed-banner-dark.svg`
- `.github/assets/seed-banner.png`
- `.github/assets/seed-banner@2x.png`
- `.github/assets/seed-banner-dark.png`
- `.github/assets/seed-banner-dark@2x.png`
- `.github/assets/seed-social.png` (dark default, kept on hand for a later Settings upload)
- `TRADEMARKS.md` (the two-sentence note in §5)

README edits in the same PR: the `<picture>` header in §4, and the trademark footer in §5.

The social SVGs and the optional light social PNG stay in the videsign library. They are not required in the family PR.

### 8.2 videsign (one PR)

Title only, for example: `Add the family repository banner library.` Destination: `brand/repo-banners/`.

videsign receives the SVG sources, the PNG exports, this spec, the builder, and the font license, under a narrow canon exception recorded as ADR-026. It does not receive the contact sheets. Those remain in this reports folder only. The same PR adds the ADR, scopes the PNG gitignore and the brand SVG checker to leave `brand/repo-banners/` alone, and checks that folder separately against this digest list.

For each of the eight repositories:

- `{repo}-banner.svg`, `{repo}-banner-dark.svg`, `{repo}-social.svg`, `{repo}-social-light.svg`
- `{repo}-banner.png`, `{repo}-banner@2x.png`, `{repo}-banner-dark.png`, `{repo}-banner-dark@2x.png`, `{repo}-social.png`, `{repo}-social-light.png`

Plus, once:

- `banners-spec.md`
- `_build.py`
- `LICENSE-Geist-OFL.txt`

That is 32 SVGs, 48 PNGs, and the three supporting files. Committing these PNG exports in videsign is an explicit exception to the usual binary-asset rule, limited to this folder.

## 9. Owner's choices

Owner's choices:

1. Redraw the Capillary glyph so it reads as branching capillary veins (one trunk dividing into finer branches, same stroke weight and bounding box). Done in this revision; check it on `contact-sheet.png` next to the others.
2. Taglines: Myosotis is "Memory that keeps only what you allow"; Capillary is "Context with its sources attached". The other six are unchanged.
3. Ship both light and dark README banners through a `<picture>` block with `prefers-color-scheme`.
4. Paths: `.github/assets/` in each family repository; `brand/repo-banners/` in videsign.
5. Keep the Vidoxlabs mark on the MIT repositories, with the short trademark note in §5.
6. videsign receives SVGs, PNG exports, and this spec, not the contact sheets, under a narrow canon exception for `brand/repo-banners/`.

Default social card remains the dark `{repo}-social.png`. Light covers stay in the pack for notebooks and for the videsign library.

## 10. Hygiene

A scan was run on every file in this folder against the standard hygiene needle lists, and against a structural list of Mac paths, LAN and loopback addresses, hosted-worker preview URLs, and dashboard URLs. Result: 0 hits. SVG files have no scripts, no external references, no live fonts, and no editor metadata. PNG files have no text chunks.
