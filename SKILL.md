---
name: "videsign"
description: "Workflow, architectural decisions, and constraints for the videsign repository"
---

# Workflow and Decision Ledger

This file houses Architectural Decision Records (ADRs) and serves as the mandatory first read for any agent initializing in this repository.

## ADR-001: Strict Surface Layering

> **Amended by ADR-006 (2026-10-05):** crystal glass is the sanctioned material for public product surfaces, limited to controls and lenses. The flat-surface, no-extraneous-shadow rules below still govern every non-glass surface.

**Context**: In complex multi-repo architectures, LLMs frequently hallucinate surface elevations, adding unwanted drop shadows or nested glassmorphism that degrades visual determinism.

**Decision**: The Nocturne Museum design system strictly enforces a flat surface architecture. Crystal glass (ADR-006) is the only glass material.

1.  **Base Surfaces**: All core surfaces must use a solid color token (e.g., `{colors.surface-background-primary-base}`).
2.  **No Extraneous Shadows**: Standard components (cards, standard buttons, layout panels) must NOT use drop shadows.
3.  **Crystal glass only (ADR-006)**: Glass appears only on controls and lenses — island navigation, overlays and popovers, the question bar, the persona switcher, and the evidence lens. Never on paragraphs, cards, section containers or sidebars.

## ADR-002: Asset & Media Hosting

> **Proposed amendment (ADR-011, awaiting ratification):** binary rasters stay banned. The only exception would be text-only `brand/**/*.svg` at or under 8 KB, checked in test.

**Context**: Storing binary assets (PNG, JPG, SVG, video) directly within the repository leads to unacceptable repo bloat and slows down CI/CD pipelines.

**Decision**:
1. No binary assets or base64-embedded images may be stored in the repository.
2. All assets must be hosted on an external CDN.
3. Agents must reference assets using the `{ASSET_BASE}` placeholder followed by the relative path (e.g., `{ASSET_BASE}/brand/brand_mark_header_v008.svg`). `cube.png` paths are deprecated. Consuming repos resolve this at build time via their environment configuration.
4. The `assets/` directory exists for local development reference only; its contents are gitignored and never committed.

## ADR-003: Continuous Interaction via Browser Primitives

**Context**: Vidoxlabs consuming products (for example the vidoxlabs.dev portfolio worker on Cloudflare Workers Static Assets) enforce static output, zero runtime bindings, and strict CSP `script-src 'self'` with no hashes or nonces. Episodic page-cut navigation breaks multi-persona continuity and shared working context.

**Decision**:

1. Continuity comes from browser-native primitives only: the View Transitions API for document navigation, CSS scroll-driven animations for editorial motion, `@starting-style` with `transition-behavior: allow-discrete` for panel entry/exit, and the HTML Popover API for top-layer menus.
2. Client-side routing, where used, is an external progressive-enhancement script (for example Astro `<ClientRouter fallback="swap" />` compiled under `assetsInlineLimit: 0` into an external `/_astro/` asset). It is not component hydration and adds no runtime worker bindings — but a consumer adding it to a static-only worker must record its own ADR first.
3. All route-scoped scripts register lifecycle listeners (for example `astro:page-load`), guard execution with `data-wired` idempotency markers, and tear down on the navigation-away event so listeners never accumulate across route transitions.
4. Shared shell elements (site header, mobile navigation) persist across navigation via `transition:persist` (for example `transition:persist="primary-header"` with `transition:animate="none"`) so menu state and scroll anchors survive.
5. Never React/Vue islands, never JavaScript animation libraries (GSAP, Lenis, Framer, or similar), never inline scripts. Inline JS dead-toggles under hash/nonce-free CSP.

## ADR-004: Persona Identity Accents

**Context**: The five sovereign personas (Violet, Wisteria, Xylia, Yarrow, Zinnia) require fixed visual identity across every consuming product. Research artifacts have circulated short, non-matrix variable names (for example `--vi-persona-violet-base`); those names do not exist in the token pipeline and must never be consumed.

**Decision**:

1. Persona identity accents are locked in the DESIGN.md `colors` matrix and are the only sanctioned persona colors:

| Persona | Canonical token | Value | Research-doc alias (never consume) |
| --- | --- | --- | --- |
| Violet | `{colors.persona-accent-violet-base}` | #8B5CF6 | `--vi-persona-violet-base` |
| Wisteria | `{colors.persona-accent-wisteria-base}` | #A78BFA | `--vi-persona-wisteria-base` |
| Xylia | `{colors.persona-accent-xylia-base}` | #2DD4BF | `--vi-persona-xylia-base` |
| Yarrow | `{colors.persona-accent-yarrow-base}` | #F59E0B | `--vi-persona-yarrow-base` |
| Zinnia | `{colors.persona-accent-zinnia-base}` | #F43F5E | `--vi-persona-zinnia-base` |

2. Emitted custom properties follow the pipeline format `--vi-colors-persona-accent-<persona>-base`.
3. Persona accents are identity markers only. Yarrow shares a hex with the warning status token and Zinnia with the error status token; shared hexes never make the roles interchangeable. Status semantics always use status tokens.
4. The persona token `{colors.persona-accent-violet-base}` and the CTA and focus token `{colors.surface-accent-violet-base}` share #8B5CF6. The roles stay separate: persona identity uses the persona token; CTA fills and focus rings use the surface accent. Hover is #6D28D9 and active is #5B21B6. Never use #7C3AED for CTA fills, hover/active states or focus rings.
5. New persona states (hover, active) or any new persona color must be added to the DESIGN.md matrix first, then referenced — never invented locally in a consuming product.

## ADR-005: Hero Billboard Exception

**Context**: The typography matrix caps heading fluid tokens at 3.5rem, and consuming-site standards historically prohibited any larger "billboard" maxima. Primary landing heroes (for example the vidoxlabs.dev `/research` page title) need a sanctioned larger scale, or consumers will hardcode off-token clamps. Research artifacts have also circulated a short alias `--vi-typography-fluid-display-hero`; that name does not exist in the pipeline.

**Decision**:

1.  `typography.fluid-hero-base` (`clamp(2.75rem, 6vw + 0.5rem, 5.25rem)`, emitted as `--vi-typography-typography-fluid-hero-base`) is the sanctioned primary-landing-hero scale.
2.  The 5.25rem maximum applies to heroes only. The 3.5rem ceiling remains binding for `fluid-display`, `fluid-h1`, `fluid-h2`, and `fluid-h3`; static sizes `4xl` and `5xl` stay capped at 3.5rem.
3.  One hero-scale usage per page (the page title). Section headings, cards, and editorial prose never consume the hero token.
4.  Research-doc aliases `--vi-typography-fluid-display-hero` and `--vi-layout-content-max` are never consumed; the canonical emitted names are `--vi-typography-typography-fluid-hero-base` and `--vi-size-layout-width-content-base` (80rem).

## ADR-006: Crystal Glass Material

**Status**: Proposed (awaiting owner ratification). Amends ADR-001.

**Context**: The vidoxlabs.dev redesign uses one visual idiom: a field of real things (systems, evidence records) with a glass lens floating over it. ADR-001 allowed only generic "functional glass" expressed as Tailwind class strings (`backdrop-blur-sm bg-white/5`), which cannot carry a rim, a highlight, a sheen or a measured legibility guarantee. Safari also does not resolve custom properties inside `-webkit-backdrop-filter`, so a token-only expression of a backdrop treatment silently fails there.

**Decision**:

1.  **Material.** Clear crystal, legible: a near-clear surface, a bright rim, a top highlight and a 160-degree sheen that fades by 35%; the glass dims and softens what is behind it instead of tinting it milky. Tokens in the `effects` category, `category-role-variant-state` grammar: `glass-crystal-surface-base|hover`, `glass-crystal-rim-base|hover`, `glass-crystal-highlight-base`, `glass-crystal-sheen-base`, `glass-crystal-shadow-base`, `glass-crystal-backdrop-base`, `glass-crystal-core-base`, `glass-crystal-solid-base`, plus the backdrop-field tokens `ambient-glow-violet-base`, `ambient-glow-teal-base`, `ambient-dots-base`. Starting values come from the approved "legible" mockup: surface `rgba(255,255,255,.035)`, rim `rgba(255,255,255,.26)`, highlight `inset 0 1px 0 rgba(255,255,255,.32)`, backdrop `blur(14px) brightness(.5) saturate(150%)`.
2.  **One effects category of CSS values.** Every `effects` entry is a literal CSS value (`rgba(...)`, `blur(...)`, `#12121A`, gradients, shadows). Legacy `glass-functional-*` Tailwind class strings are removed. The generator emits every effect as `--vi-effects-*` and never invents a `backdropBlur` scale.
3.  **Literal stylesheet.** The pipeline emits `dist/glass.css` with literal, prefixed and unprefixed `backdrop-filter` declarations (classes `vi-glass`, `vi-glass--control`, `vi-glass-shell`, `vi-glass-core`, plus `--pill` variants). A custom property is never used inside a backdrop-filter declaration. The rim is an inset box-shadow (not a border box) so shell 20px, bezel 6px and core 14px stay concentric.
4.  **Scope.** Glass appears only on: the floating island navigation, overlays and popovers, the question bar, the persona switcher, and the evidence lens over a field. Never on paragraphs, cards, section containers or sidebars.
5.  **Limits.** At most three glass layers per viewport; never glass on glass; never backdrop blur on scrolling containers; the blur is never animated or transitioned. The evidence lens is a glass shell around a near-opaque core (`glass-crystal-core-base`), so reading text sits on a scrim rather than on a second blur.
6.  **Legibility floor.** Text on glass reaches 4.5:1 against the worst backdrop it can pass over, verified by pixel-sampling screenshots over the busiest legitimate backdrop, not by the prettiest state. Where the guarantee is analytic (the lens core over a fully white backdrop) it is asserted in `test/tokens.test.js`. If a measurement fails, the tokens change, not the threshold.
7.  **Fallback.** Under `prefers-reduced-transparency: reduce`, `prefers-contrast: more`, `forced-colors: active`, or `@supports not ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px)))`, the same shapes render as the solid surface (`glass-crystal-solid-base`, or `Canvas` under forced colours) with the same rim. The support query tests both properties because Safari before 18 ships only the prefixed one; testing the unprefixed property alone would wrongly strip glass there. Refraction (SVG displacement) is out of scope.
8.  **Text-bearing glass is shell + core.** The island navigation, question bar and persona switcher are `vi-glass-shell` (+ `--pill` where needed) around `vi-glass-core`. A single `vi-glass` layer is reserved for glass that carries no text.

**Consequences**: Consumers import `dist/glass.css` and use the `vi-glass*` classes; they never write their own backdrop declarations. `eslint` cannot see fragments, so `scripts/lint-preview.js` enforces the scope, nesting and layer limits on the preview catalog. Contrast of single-layer glass depends on the backdrop, so each consuming site re-runs worst-backdrop sampling.

**Measured amendment (2026-10-05, from the vidoxlabs.dev foundation PR)**: the first site measurements, taken with real pages instead of the catalog stage, changed four things. The 4.5:1 floor was not moved; the tokens and the fragment were.

1.  **Ambient values lowered.** Free secondary text (`text-content-secondary-base`) sitting over the first ambient values (violet `0.55`, teal `0.28`, dots `0.35`) measured 3.62:1 to 4.54:1 on real routes. The values are now violet `0.30`, teal `0.16`, dots `0.14`, with an analytic bound in `test/tokens.test.js` (secondary text over the strongest glow with a dot on top).
2.  **Text-bearing controls are shell + core.** A single `vi-glass` layer cannot reach 4.5:1 over white imagery: `brightness(0.5)` makes white 128 grey, which is about 3.9:1 for white text and near 1:1 for grey text. The catalog stage had no large light areas, so the PR 1 sweep did not expose this. `island-nav`, `question-bar` and `persona-switcher` are shell + core pills (`vi-glass-shell--pill` / `vi-glass-core--pill`). A single `vi-glass` layer is reserved for glass without text.
3.  **Core scrim carries the contrast alone.** The core alpha is `0.85` (was `0.72`). With `brightness(0.5)` working, `0.72` cleared 4.5:1 in Chromium, but Playwright's WebKit and Firefox did not render `brightness()` on a backdrop, where a fully white backdrop under `0.72` gives about 3.2:1 for secondary text. The analytic test now assumes no backdrop filter at all, so the guarantee holds in any engine.
4.  **A named ancestor is a backdrop root.** A `backdrop-filter` inside an element with a `view-transition-name` (Astro assigns one to `transition:persist` elements), a `filter`, `opacity < 1`, `mask`, `clip-path`, `mix-blend-mode` or `will-change` sees only that ancestor's own box. A consumer must keep glass out of such ancestors or opt them out; the site's persisted header sets `view-transition-name: none`.

## ADR-007: Typography (Geist and Geist Mono)

**Status**: Proposed (awaiting owner ratification). Supersedes the Inter and JetBrains Mono family values in the token matrix, and the font choice in vidoxlabs.dev ADR 0029 on PR #8.

**Context**: Inter is the most common interface typeface on the web and the high-end visual standard flags it as generic. The approved typography review chose a single coherent superfamily whose mono shares its proportions, so labels and prose read as one voice.

**Decision**:

1.  `typography-family-sans-base` is `Geist, ui-sans-serif, system-ui, sans-serif`; `typography-family-mono-base` is `Geist Mono, ui-monospace, SFMono-Regular, Menlo, monospace`. The Tailwind `fontFamily` map is derived from these tokens rather than hardcoded.
2.  Display text is Geist 600 (`typography-weight-semibold-base`) with tight tracking (`typography-tracking-tight-base`); body is Geist 400 (`typography-weight-regular-base`); labels and navigation are Geist Mono in sentence case with `typography-tracking-wide-base` (or widest for micro-labels). The Tailwind `uppercase` utility is banned.
3.  Weight, tracking and leading are tokens (`typography-weight-*`, `typography-tracking-*`, `typography-leading-*`). Fragments and consumers must not use raw `font-medium` / `font-bold` / bare `tracking-*` / `leading-*`.
4.  **Licence and hosting.** Geist and Geist Mono are SIL Open Font License 1.1. Per ADR-002 no binary lives in this repository; the consuming site self-hosts subsetted WOFF2 under its own `font-src 'self'` policy, ships the OFL text with the binaries, and measures its own metric-matched fallback faces on its own tree. The preview catalog uses the fonts if installed and otherwise the system stack.
5.  The ADR-005 hero ceiling is unchanged (5.25rem, hero only; 3.5rem for everything else).

**Consequences**: Product repositories swap their font binaries and fallback metrics when they sync tokens. Fallback override numbers must be measured per tree, never copied from research documents.

## ADR-008: Motion and Radii

**Status**: Proposed (awaiting owner ratification). Extends ADR-003 and the Nocturne motion budget.

**Context**: The continuous-interaction standard hardcoded `cubic-bezier(0.16, 1, 0.3, 1)` in prose and had no token for entrance motion or for the glass shell geometry, so consumers would invent values locally.

**Decision**:

1.  **Easing tokens.** `transition-easing-standard-base` is `cubic-bezier(0.16, 1, 0.3, 1)`; `transition-easing-spring-base` is `cubic-bezier(0.32, 0.72, 0, 1)`. Neither overshoots (control-point y stays within 0 to 1), so the zero-bounce rule holds.
2.  **Entrance duration.** `transition-duration-entrance-base` is `500ms`, reserved for scroll reveals, opening the lens and highlighting the field. Interactions keep `150ms`, `200ms` and `300ms`. Entrances animate `transform` and `opacity` only; blur is never animated.
3.  **Radii and padding.** `layout-radius-glass-base` is `20px` (glass shell) and `layout-padding-bezel-base` is `6px`. The inner core is the existing `layout-radius-standard-base` (14px), so shell, bezel and core are concentric (20 = 6 + 14). The 32px radius ban stands.
4.  **Reduced motion.** Every entrance sits under the consuming product's `prefers-reduced-motion: reduce` override and renders its final state.

**Consequences**: The generator splits `transition` tokens into `transitionDuration` and `transitionTimingFunction` in the Tailwind config, and a test asserts both easings never overshoot.

## ADR-009: Spacing Rhythm

**Status**: Proposed (awaiting owner ratification).

**Context**: DESIGN.md's gap and inset tokens stopped at 1.25rem. Consuming sites invented dozens of raw rem lengths for section padding, page gutters and macro whitespace, so the design system could not police drift.

**Decision**:

1.  Add a 4px-base rhythm under `space.rhythm-{1,2,3,4,5,6,8,10,12,16,20,24}-base` (0.25rem through 6rem).
2.  Name the high-end page roles: `rhythm-page-gutter-base` (1.5rem), `rhythm-section-y-base` (4rem), `rhythm-macro-base` (6rem).
3.  Keep existing `gap-*` / `inset-*` / `layout-stack-default` tokens as the short names for the same scale; new work prefers `rhythm-*` for page composition.
4.  Indicator geometry uses `size.indicator-{dot,mark,brand}-base` instead of bare `w-2` / `h-2` / `w-7`.

**Consequences**: `npm run tokens` maps rhythm keys into Tailwind `padding`, `margin` and `gap`. Lint and the site raw-value audit treat lengths outside this set as drift.

## ADR-010: VWXYZ Character Canon and Persona Assets

**Status**: Proposed (pending owner confirmation).

**Context**: Character art and UI accents had diverged (teal and rose versus crimson and magenta). The two layers were being treated as one palette.

**Decision**:

1.  `canon/vwxyz/palette.json` is the source of truth for character colors.
2.  UI persona accents in `DESIGN.md` must equal the canon signature, or be an explicitly listed text-safe variant. CI enforces this in the token-alignment change that follows this record. This record does not change token values.
3.  Persona images follow ADR-002: they will be served from the asset service under `{ASSET_BASE}/vi/{vi}/{type}/{file}` (planned, ADR-010), with immutable versioned keys, and are never committed.
4.  The naming standard and the vocabulary are controlled lists. New expressions are added to `canon/vwxyz/vocabulary.json` first.
5.  Only assets that pass ViCanon review and Gavin's approval are published.

**Negative guardrails**: Never generate persona art without the anchor reference. Never invent persona hex values. Never hotlink Drive.

**Consequences**: Read `canon/vwxyz/` before specifying a character color or a persona image. Product UI keeps using `colors.persona-accent-*` from `DESIGN.md` until the alignment change lands. Persona images require alt text that names the persona and the expression or pose.

## Negative Constraints against Boilerplate Generation

Agents MUST NOT generate the following boilerplate or generic patterns:

-   **Tailwind Defaults**: Do not use default Tailwind colors (e.g., `blue-500`, `red-400`). Always map to the `category-role-variant-state` matrix defined in `DESIGN.md`.
-   **Placeholder Images**: Do not use external placeholder image services (e.g., `via.placeholder.com`). If an image is required for a preview, use a local, solid color semantic placeholder div.
-   **Generic Copy**: Do not use "Lorem Ipsum". Use contextually relevant, realistic content that adheres to the Sentence case typography guardrail.

## Agent Instructions

1.  **Read First**: This file (`SKILL.md`) is your starting point.
2.  **Consult DESIGN.md**: For specific color codes and strict negative boundaries.
3.  **Inspect previews**: Look at the `preview/` directory for pure HTML implementations.

## ADR-011: Brand identity (brand v1)

**Status**: Proposed for items 1-6, 8 and 9. Items 7 and 10 are Accepted 2026-10-28. #8B5CF6 is the brand accent (Accepted 2026-10-28). Amends ADR-002.

**Context**: Mark C needs SVG masters here. ADR-002 bans SVG. Rasters stay out of git.

**Decision**:

1. PNG, JPG, GIF, WebP, and video stay banned, including under `brand/`.
2. `brand/**/*.svg` at or under 8 KB may be committed if a fail-closed allow-list passes. Elements: `svg`, `g`, `path`, `rect`. Closed attribute set; none on a closing tag. Reject `use`, `href`, `xlink:href`, `xmlns:xlink` (including a fragment), a byte-order mark, comments, editor namespaces, script, event handlers, `foreignObject`, external references, external `url()`, `title`, `desc`, non-SVG text, `javascript:`, `data:`, `none`, `currentColor`, and any other colour. Fills and strokes: `#8B5CF6`, `#B4A7F2`, `#D92B3A`, `#F0A020`, `#E13D9E`, `#121214`, `#F7F7F5`. `npm test` checks `brand/`. Empty SVG denied. Zero SVGs pass the size check.
3. Facets: Wisteria and Yarrow top, Xylia and Zinnia sides, Violet on the V. Full colour only on `#121214`; banned on `#F7F7F5` (about 2.01:1 for Wisteria and Yarrow). Mono: `#F7F7F5` on dark, `#121214` on light, `#8B5CF6`. No gradient.
4. Xylia is never text and never alone. Text-safe Xylia and Zinnia are pending and undefined.
5. Names: `brand_{asset}_{variant}_v{NNN}.{ext}`. Lockup `horizontal-dark`, `horizontal-light`, `stacked-dark` name the field. Mark `mono-dark`, `mono-light` and wordmark `dark`, `light` name the ink. `on-dark` and `on-light` would name the field. Keep brand-index filenames. Never reuse a version. Do not draw the mark.
6. Promoted masters: path `design_system/brand/` (a name, not a link).
7. Item 7 is Accepted 2026-10-28: white on #8B5CF6 is 4.23:1. CTA labels are large: bold xl or larger, or 2xl or larger. No normal-size label of any colour on `#8B5CF6`. `#121214` is 4.42:1, white is 4.23:1, `#F7F7F5` is 3.95:1. Fail 4.5:1 for normal text; pass 3:1 for large text (at least 24px, or at least 18.66px and bold).
8. Headers under 38px may use the favicon-grade mark down to 24px. px16 is in `brand/`. No px32 master here.
9. `brand-signature-*` becomes the persona accent once the canon record lands. Until then `DESIGN.md` persona accents stay. `{effects.ambient-glow-violet-base}` stays `rgba(124, 58, 237, 0.30)`. Teal glow stays the default. `ambient-glow-wisteria-base` in `brand/tokens.json` is the pending successor, not a `DESIGN.md` token.
10. Accepted. ADR-011 item 10 is Accepted: CTA fills and focus rings are #8B5CF6 (`{colors.surface-accent-violet-base}`). Hover #6D28D9 (violet-700) and active #5B21B6 (violet-800) are darker steps of #8B5CF6, Accepted 2026-10-28. Focus rings use #8B5CF6 and do not use #6D28D9. This item does not change `{effects.ambient-glow-violet-base}` (`rgba(124, 58, 237, 0.30)`), which remains with item 9.

**Consequences**: `.gitignore` re-includes `brand/**/*.svg`; rasters stay ignored. Those SVGs are `-text`. Items 1-6, 8 and 9 stay Proposed until the owner ratifies them. Item 7 is Accepted 2026-10-28. Item 10 is Accepted 2026-10-28.


## ADR-012: Product light theme and semantic foregrounds

**Status**: Used by the web app redesign (2026-10-27).

**Decision**: Keep the existing default dark matrix and persona/brand values. Light counterparts remain flat matrix entries with the light state suffix. Generated `dist/themes.css` maps those counterparts onto the existing base semantic variables under `[data-theme="light"]`; consumers import the generated mapping rather than authoring overrides. The normal-text foreground clears 4.5:1 on every reading surface. The border candidate was strengthened from the old consumer override to improve control delineation. `text-content-on-accent-base` stays white across themes for readable brand CTA labels. Status and persona colors remain identity/indicator roles; colored text must be independently measured.

Light glass uses the canonical solid light surface and rim, with blur disabled. Forced colors uses Canvas/CanvasText and the same geometry. Dark crystal defaults remain unchanged. Existing consumers importing only tokens/glass keep their current behavior; themes.css is an explicit opt-in. This decision does not ratify ADR-010/011 or alter character/brand artwork.
