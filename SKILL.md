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
| Wisteria | `{colors.persona-accent-wisteria-base}` | #B4A7F2 | `--vi-persona-wisteria-base` |
| Xylia | `{colors.persona-accent-xylia-base}` | #D92B3A | `--vi-persona-xylia-base` |
| Yarrow | `{colors.persona-accent-yarrow-base}` | #F0A020 | `--vi-persona-yarrow-base` |
| Zinnia | `{colors.persona-accent-zinnia-base}` | #E13D9E | `--vi-persona-zinnia-base` |

2. Emitted custom properties follow the pipeline format `--vi-colors-persona-accent-<persona>-base`.
3. Persona accents are identity markers only. Since the 2026-11-03 accent re-sync, no persona accent shares a hex with a status token (warning stays `#F59E0B`, error stays `#F43F5E`); the roles are still separate by name. Xylia is never text and never appears alone. Persona-identity uses persona tokens; status semantics always use status tokens.
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

**Status**: Proposed for items 1-6 and 8. Items 7, 9 and 10 are Accepted (7 and 10 on 2026-10-28; 9 on 2026-11-03). Amends ADR-002.

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
9. **Accepted 2026-11-03 (owner ratification).** `brand-signature-*` is the persona accent in `DESIGN.md` (Wisteria `#B4A7F2`, Xylia `#D92B3A`, Yarrow `#F0A020`, Zinnia `#E13D9E`; Violet unchanged). The ADR-010 §2 UI-equality requirement is now a live canon test. The persona accent re-sync did NOT touch ambient glows: `{effects.ambient-glow-violet-base}` stays `rgba(124, 58, 237, 0.30)`, the teal glow stays the default glow, and `ambient-glow-wisteria-base` remains the pending successor in `brand/tokens.json` under its own decision.
10. Item 10 is Accepted 2026-10-28: CTA fills and focus rings are #8B5CF6 (`{colors.surface-accent-violet-base}`). Hover #6D28D9 (violet-700) and active #5B21B6 (violet-800) are darker steps of #8B5CF6, Accepted 2026-10-28. Focus rings use #8B5CF6 and do not use #6D28D9. This item does not change `{effects.ambient-glow-violet-base}` (`rgba(124, 58, 237, 0.30)`), which remains with item 9.

**Consequences**: `.gitignore` re-includes `brand/**/*.svg`; rasters stay ignored. Those SVGs are `-text`. Items 1-6 and 8 stay Proposed until the owner ratifies them. Items 7 and 10 are Accepted 2026-10-28; item 9 is Accepted 2026-11-03 (the caused accent re-sync lives in DESIGN.md).


## ADR-012: Product light theme and semantic foregrounds

**Status**: Accepted 2026-10-27. Used by the web app redesign.

**Decision**: Keep the existing default dark matrix and persona/brand values. Light counterparts remain flat matrix entries with the light state suffix. Generated `dist/themes.css` maps those counterparts onto the existing base semantic variables under `[data-theme="light"]`; consumers import the generated mapping rather than authoring overrides. The normal-text foreground clears 4.5:1 on every reading surface. The border candidate was strengthened from the old consumer override to improve control delineation. `text-content-on-accent-base` stays white across themes for readable brand CTA labels. Status and persona colors remain identity/indicator roles; colored text must be independently measured.

Light glass uses the canonical solid light surface and rim, with blur disabled. Forced colors uses Canvas/CanvasText and the same geometry. Dark crystal defaults remain unchanged. Existing consumers importing only tokens/glass keep their current behavior; themes.css is an explicit opt-in. This decision does not ratify ADR-010/011 or alter character/brand artwork.

## ADR-013: Stage backdrop, five-bar rule, graph line and chat dock

**Status**: Proposed (awaiting owner ratification). First consumer: vidoxlabs.dev ADR 0041 and ADR 0042. Amends ADR-001 item 3 and ADR-006 item 4 (glass scope gains the chat dock dialog).

**Context**: The owner supplied a reference for the Vidoxlabs background: an arc of five persona lights over a glowing stage, with rings and light planes, and the five-bar rule under the wordmark. Diagrams on the site drew meaningful lines in the hairline separator (1.26:1). The owner also asked for a persistent persona chat on every page. Research for the change: WCAG 2.2.2 (Pause, Stop, Hide) requires a pause control for motion longer than five seconds beside content; WCAG 1.4.11 requires 3:1 for graphics that carry meaning; a chat log is a labelled `role="log"` polite live region; the CSS Custom Highlight API and URL text fragments highlight text without changing markup.

**Decision**:

1.  **Stage backdrop.** A decorative SVG: an arc with the five persona lights in canon order (Xylia at the crown, never alone), faint concentric arcs, sparse fixed points of light (no grid), light planes and a centre beam in violet only, and a stage ring split into five single-colour segments in the canon cycle. Every gradient carries one signature colour. Motion is transform and opacity only, on `{transition.transition-duration-ambient-drift-base}` and `{transition.transition-duration-ambient-pulse-base}`; it stops under `prefers-reduced-motion` and under a visible pause control. Behind reading text the stage runs at an opacity where every layer keeps secondary text at 4.5:1; text placed over a full-strength stage sits on a scrim.
2.  **Dot grid retired.** The ambient dot pattern is no longer used for the page background. `{effects.ambient-dots-base}` stays as a token for existing consumers.
3.  **Five-bar rule.** Five hard segments, one signature colour each, in canon order, `{size.indicator-fivebar-base}` tall. Used under the wordmark or a hero headline, along the top of bezelled fact panels, and along the foot of the chat launcher. Never a blended gradient.
4.  **Graph line.** Lines and outlines that carry meaning in diagrams use `{colors.border-graph-line-base}` (`#80808A`, at least 4.3:1 on every dark surface) and `{colors.border-graph-line-light}` (`#64748B`) in the light theme. `{colors.border-separator-primary-base}` stays the hairline for layout separators only.
5.  **Chat dock.** A launcher fixed bottom right (at least 44px; a tracked brand file or the five seat dots, never a drawn mark; a label; a five-bar foot) opens a non-modal dialog that Escape closes, returning focus to the launcher: glass shell and core (an overlay, ADR-006), a persona switcher of the five seats, a `role="log"` conversation, solid message cards, chips for actions, a composer (Enter sends, Shift+Enter adds a line) and a one-line disclosure of how answers are produced. Seat names stay in the primary text colour; seat colours mark dots, rings and bars only. A message from a seat carries a five-segment marker with that seat lit, so no seat colour appears alone.

**Consequences**: `preview/five-bar-rule.html` and `preview/chat-dock.html` show the structures. The stage is a shared primitive: `lib/stage.js` holds the geometry and the alpha of every painted layer, renders the SVG (`renderStageSvg`), and computes the bound (`stageContrastReport`, `maxSafeStageOpacity`) over the page field, so a product picks its ambient opacity from a number instead of a guess. `lib/stage.css` sets colour and motion from emitted tokens. `npm run tokens` ships both, plus one SVG per variant, to `dist/`; `preview/stage-backdrop.html` is generated from the renderer and the MCP tool `stage_backdrop` returns the SVG with its report. The generated standard (`dist/standard.json`, `dist/standard.md`) carries these rules as `rules.stage`, `rules.fiveBar`, `rules.graphLine`, `rules.chatDock` and `rules.motion.ambient`, so a consuming product's agent preflight reads them without parsing prose. `scripts/lint-preview.js` rejects Xylia as text, Xylia without the other four, and a signature colour as a gradient stop. Consumers adopt the new tokens on their next sync.

## ADR-014: One token source, native outputs for every platform

**Status**: Proposed (awaiting owner ratification).

**Context**: Vidoxlabs ships on several platforms: static web (vidoxlabs.dev), React web apps, a native macOS app (ViApp, SwiftUI) and Python terminal UIs (the CLI cockpit). Only the web products consumed videsign, as copied CSS pinned to a commit. The others restated colours by hand and drifted: on 2026-11-06 the terminal UI palette carried the retired violet `#7c3aed` and a secondary text colour of `#8e8e93` instead of `#A1A1AA`, and ViApp used system purple and indigo instead of the persona accents.

**Decision**:

1.  `DESIGN.md` stays the only source. `npm run tokens` also writes `dist/tokens.ts` (typed raw values, CSS variable names, `token()`), `dist/ViTokens.swift` (SwiftUI `Color`, points, seconds, easing curves), `dist/videsign_tokens.py` (read-only mappings for Python and Textual) and `dist/tokens.dtcg.json` (W3C Design Tokens Community Group format 2025.10).
2.  Every value is read once by `scripts/lib/token-values.js`, so no platform converts a value differently. Units: 1px = 1pt, 1rem = 16pt, durations in seconds.
3.  Values a platform cannot express are never approximated. Shadows, gradients and backdrop filters stay CSS-only and each output lists them. DTCG has no type for `em` or `clamp()`, so those are listed under `$extensions` rather than mistyped; native outputs carry `em` as a multiplier and `clamp()` as its min and max.
4.  Products consume the output for their platform and never restate a token value. A product that needs a value that is not in the matrix adds it to `DESIGN.md` first.

**Consequences**: `test/platforms.test.js` executes the TypeScript and Python outputs and checks every converted value against `DESIGN.md`; the Swift output is checked structurally because no Swift toolchain runs in CI. The generated standard lists the outputs under `meta.platformOutputs`, and the MCP server serves them as resources. Distribution (versioned releases, a shared sync command) is a separate decision.

## ADR-015: Persona dialects on agent surfaces

**Status**: Proposed (awaiting owner ratification). Chosen strength: moderate. Scope: agent surfaces only.

**Context**: The owner asked that each persona have its own design aligned with its personality and biases, so the five seats stay interesting, while products keep one consistent system. The canon already records each seat's setting and mood (`canon/vwxyz/palette.json`, `background.name` and `background.mood`), and the chat guides already give each seat a role.

**Decision**:

1.  **One skeleton, five dialects.** Grid, components, accessibility and brand rules are shared. A dialect changes only: interaction tempo (duration, easing, entrance), density (gap, padding), label type (family, tracking, leading, numerals), a decorative motif, and the order a reply leads with.
2.  **Tokens only.** Every setting references an existing token. The dialect adds no colour, length or duration; the only new numbers are motif alphas and stripe spacings, which are decorative.
3.  **Seats.**

    | Seat | Canon setting and mood | Tempo | Density | Labels | Motif | Leads with |
    | --- | --- | --- | --- | --- | --- | --- |
    | Violet | Orchestration Deck: calm command, quietly mysterious | normal, standard | comfortable | mono, wide | rings | summary, highlights, sources |
    | Wisteria | Lattice Studio: warm, composed, editorial daylight | slow, standard | spacious | sans | lattice | options, explorations, sources |
    | Xylia | Review Chamber: austere, exact, monochrome | fast, no flourish | compact | mono, widest, tabular | hairline (monochrome) | limits, evidence, sources |
    | Yarrow | Map Room: grounded, steady, oriented | normal, slow entrance | comfortable | mono, tabular | contour | alternatives, comparison, sources |
    | Zinnia | Launch Lane: bright, brisk, forward motion | fast, spring | compact | sans, tabular | lane | steps, progress, sources |

4.  **Agent surfaces only.** The stylesheet is scoped to `.vi-agent` with `data-persona`. Page content outside an agent surface is never restyled. A surface with no seat speaks Violet's dialect, as the coordinator. A dialect varies inside the conversation surface skeleton (ADR-016) and adds no chrome to it: on a conversation surface it sets tempo, density, label type and lead order, and the motif element is not placed. The motif belongs to agent panels and persona consoles.
5.  **Rules that still hold.** Seat names and text stay in text tokens. Each motif paints one colour: the seat's own accent mixed with transparent, or, for Xylia, the monochrome graph line, so her crimson appears only in the five-segment marker beside the other four. Motion is transform and opacity only and stops under reduced motion. Lead order is applied in the DOM by the renderer, never by CSS `order`, so reading order matches what is shown.

**Consequences**: `lib/dialects.js` is the source. `npm run tokens` writes `dist/dialects.css` and `dist/dialects.json`, and the TypeScript, Swift and Python outputs carry the resolved dialects (`dialects`, `ViDialects.forPersona`, `DIALECTS`). `preview/persona-dialects.html` is generated by `npm run dialects:fragment`. `test/dialects.test.js` checks every reference, the scope, the motif colours and the lead order. A stronger variation (seats rearranging their own layouts) needs its own ADR.

## ADR-016: Conversation surface

**Status**: Proposed (awaiting owner ratification). First consumer: the vidoxlabs.dev chat dock. Refines ADR-013 item 5: the launcher, the dialog semantics and the log's live region stay as written there; this record sets what the surface shows. Numbered 016 because 014 and 015 are held by an open proposal (platform token outputs and persona dialects).

**Context**: The first chat dock opened with eighteen controls in nine stacked rows before the visitor had typed anything: a product title, a seat line, a model badge, a state label, a menu, a close button, a strip of five named pills, a message header with a copy button, eight intent chips, a second row of suggested topics, three separate composer boxes and a four-line disclosure. Each part was reasonable alone. Together they competed with the two things a chat is for: the persona and the reply. The owner asked for a clean, clutter-free chat that keeps the sprites and the smooth motion, and for one standard that every later AI chat interface follows. Research for the change: an empty chat should offer a few starters, because a blank field leaves a visitor unsure what to ask and a wall of chips reads as a menu; controls that are needed rarely belong behind the thing they act on.

**Decision**:

1.  **Chrome budget.** At rest a conversation surface shows four things: one header row, the conversation, one composer field and one disclosure line. Everything else appears when it is asked for or when it becomes true (a failure, a fallback).
2.  **Header: one row.** The avatar (the seat's sprite, or its crest where no art is approved) stands at the start and sets the row's height. Beside it a first line holds the seat's name in `{colors.text-content-primary-base}`, its role in a mono micro-label, at most one overflow menu, and close; a second line holds the seat dots. No product title, model badge or state label is printed. The surface's accessible name carries the title; the avatar and a visually hidden live text carry the companion state. A docked surface is `{size.layout-width-conversation-base}` wide (27.5rem, added to the matrix by this record). On a narrower surface the role is dropped; nothing wraps.
3.  **Seat dots.** The switcher is five dots in canon order, one per seat, each a button with `aria-pressed` and the seat's name as its accessible name. Each hit area is at least `{size.action-min-default}` in both dimensions, and adjacent hit areas touch. The pressed seat carries a ring in its own colour. The five dots sit together, so no seat colour appears alone. The switcher prints no names: the header names the active seat.
4.  **Messages.** A guide's reply is text on the core with no card around it. The visitor's turn is the only bubble: `{colors.surface-background-tertiary-base}`, aligned to the end. Sources, cautions and ordered steps inside a reply are separated by the hairline, not boxed.
5.  **Speaker marker on change only.** The five-segment marker and the seat's name head a reply when the speaker differs from the previous guide reply, and on the first reply. Consecutive replies from one seat carry no header.
6.  **Message actions on demand.** Copy and other per-message commands show on hover and on keyboard focus inside the message. Where hover is unavailable they show on the latest reply. They are never the only route to content.
7.  **Provenance by exception.** A reply is labelled only when it leaves the default path (a fallback, an offline answer). The default path is stated once, in the disclosure.
8.  **Starters.** An empty conversation offers at most four starters from one source. They leave when the visitor sends a turn.
9.  **Follow-ups.** At most three action chips, on the latest reply only.
10. **Composer: one field.** One bordered field holds the text area and the send control. An optional input mode (dictation) sits inside the same field and shows only while the field is empty. Enter sends and Shift+Enter adds a line. The placeholder names the seat. Send is disabled until there is text.
11. **Disclosure: one line.** One line of secondary text says how replies are produced, and the detail (what is sent, what happens on failure) opens in place from it. Where a surface sends what the visitor types to a service, the full statement stands in place of the line until the visitor's first turn, so what is sent is read before anything is sent. After that turn it rests at one line.
12. **States.** Idle, composing, thinking, streaming, settled and failed each map to an avatar state. Thinking is the five-segment pulse with a short label; streaming is a cursor; failed is one plain sentence with one retry. No spinner and no skeleton bubble.
13. **Motion.** The surface opens and closes on `{transition.transition-duration-slow-base}` with `{transition.transition-easing-spring-base}`. A turn enters on `{transition.transition-duration-normal-base}`. Sprites cross-fade; they never pop. The thinking pulse is the only loop, it ends when the reply starts, and it is static under `prefers-reduced-motion`.
14. **Scope.** The chat dock, a full-page chat and native product panels follow this record at their next redesign. A full-page chat keeps reply text to a 65ch measure.

**Consequences**: `preview/conversation-surface.html` shows the empty state and `preview/chat-dock.html` shows a conversation in progress above the launcher; both follow this record. ADR-013 item 5's "persona switcher of the five seats" is met by the seat dots, and its "solid message cards" is superseded by item 4 here: the dock's core is the near-opaque scrim of ADR-006, so reply text on it keeps the legibility floor. The generated standard carries the record as `rules.conversation`. `test/preview.test.js` holds both fragments to the budget (one header row, five seat dots, at most four starters, one composer field, a one-line disclosure). This record sets the skeleton every seat shares. The open persona dialects proposal would vary tempo, density and label type per seat inside that skeleton; it adds no chrome to it.

## ADR-017: Explorable instrument

**Status**: Proposed (awaiting owner ratification). First consumer: the vidoxlabs.dev research explorers. Numbered 017 for the same reason as ADR-016.

**Context**: The research articles carry small interactive panels: sliders that compute a score, toggles that change a refusal receipt, stage pickers. A review found three recurring faults. Some controls changed nothing a reader could see (a stage picker that only rewrote one label). Controls were browser defaults, so each panel looked unfinished and unlike the next. No panel said what to try or which claim it supported, so a reader was left in a sandbox. Research for the change: an interactive explains something only when it is tied to a point the text makes and gives the reader a task with feedback; a diagram the reader cannot affect should be a figure, not a control.

**Decision**:

1.  **Every control has a consequence.** A control stays only if operating it changes the readout or the diagram. A picker that changes a label is removed; the diagram shows that state itself.
2.  **Claim and task.** An instrument opens with one line naming what it shows and one line telling the reader what to try. Both are plain sentences above the controls.
3.  **Anatomy.** One solid panel: a diagram that reads out state, the controls, and a receipt. Controls and receipt sit side by side from the medium breakpoint and stack below it. The panel is a card on `{colors.surface-background-secondary-base}`; it is not glass.
4.  **Controls.** A boolean is a switch row: label first, switch at the end, the whole row the hit area at `{size.action-min-default}`. A number is a labelled range with its value in tabular mono figures. A choice among presets is one segmented control. No bordered fieldset, no default checkbox, no duplicate heading and legend.
5.  **Diagram as readout.** Nodes and edges use `{colors.border-graph-line-base}`. The current state is the accent outline; a blocked state is the status error token with a text label, never colour alone. Labels sit outside or beneath their node and never overlap an edge or another label.
6.  **Receipt as ledger.** The result is a list of hairline-separated rows: a mono micro-label and a value. Machine values are set in mono. The receipt is a polite live region.
7.  **Synthetic by statement.** An instrument that runs on fixtures says so once, in the line under its heading. It never implies a live system.
8.  **Seat colours.** A seat colour appears only where the five seats appear together, and only as a dot, ring or bar. A single stage or gate is never painted in one seat's colour.

**Consequences**: `preview/instrument.html` shows the anatomy. The generated standard carries the record as `rules.instrument`. Consumers move their explorers to it at their next change to each one.

## ADR-018: Memory field

**Status**: Proposed (awaiting owner ratification). First consumers: the vidoxlabs.dev Memorix and ARKSRRA pages (pipeline and constellation figures) and the web app's CRS context view (constellation mode). Numbered 018 because 014 to 017 are held by open proposals.

**Context**: The owner asked for memory views modelled on a public memory-system architecture diagram (sources, indexes, recall lanes, an agent loop, a background worker) and its companion constellation (about 120 memory nodes with a halo and core, larger hubs, and a faint web of curved edges in four link colours). Vidoxlabs already has the parts that diagram describes: CRS ingest into messages and retrieval chunks, Memorix hybrid retrieval (semantic, lexical, authority, recency and a one-hop Neo4j boost, with abstention), ARKSRRA as the reasoning and ratification loop, and a Postgres authority with Redis, Neo4j and MinIO projections and a deletion epoch that makes Forget bypass and rebuild every projection. The web app draws a radial CRS graph whose relation colours reuse two persona hexes and the warning hex, and the site has no architecture figure at all. A faint web cannot carry meaning at WCAG 1.4.11, curved edges cannot draw in with transform alone, and nothing kept the site and the web app drawing the same picture.

**Decision**:

1.  **Link codes and tokens.** The memory field keeps the web app's four relation codes, defined for individual memories. CR cluster: correlation by semantic similarity or a shared concept, domain or service. RR reasoned: inferred by synthesis and not yet confirmed. LR linked: an explicit pointer (`LINKS_TO`, `crs://`, ViLink). TR tree: lineage or sequence (conversation to message to chunk, trajectory steps). Each code has a `base` and `light` token, `border-graph-{cluster,reasoned,linked,tree}-*`, at least 3:1 on every surface of its theme, at least 15 deltaE00 from every persona, status and graph-line colour and at least 20 from each other. No persona colour marks a link type.
2.  **Never colour alone.** CR is solid and its width grows with the link count; RR is a long dash; LR is dotted with round caps; TR is solid with an arrowhead toward the child. Every legend and every lit edge's accessible name carries the code's label.
3.  **Edge states.** Rest edges are the ambient web: quadratic curves at low opacity in an `aria-hidden` layer; they are decoration. Lit edges (the focus set or a recall result) are straight lines at full token colour and carry the meaning. Dim edges sit at 20% opacity.
4.  **Nodes.** A neutral fill (`{colors.surface-background-tertiary-base}`) with a `{colors.border-graph-line-base}` outline. Memory class is the outline shape: organizational solid, consented personal a ring with a centre dot, active-thread a double ring, unconfirmed observation a dashed ring. Mass is the log of the recall count in three radius steps. Recency is three opacity bands (fresh, warm, cold) on the mark only; the label keeps full secondary contrast. A lit node takes the accent ring.
5.  **Deterministic layout.** `layoutMemoryField` seeds groups on a ring with a seeded generator, relaxes a force layout for a fixed number of steps and rounds to 0.1. The same data and seed give the same picture; there is no runtime physics. Over 300 nodes or 3,000 edges it refuses with `MEMORY_FIELD_OVER_BUDGET`; the product samples or aggregates first.
6.  **Motion.** Five named motions, transform and opacity only, from the duration and easing tokens: entrance draw-in (lit edges scale from their source end, nodes fade in by recency band, `{transition.transition-duration-entrance-base}`); recall pulse (a dot travels along each lit edge from the query to its hits, then the rest dims); Forget retraction (a forgotten node's edges scale back into it and the node fades, across every projection); ambient drift (the rest layer translates slowly on `{transition.transition-duration-ambient-drift-base}`); pipeline flow (dots travel along pipeline connectors on `{transition.transition-duration-ambient-pulse-base}`). Drift and flow are the only loops. All five render their final state under `prefers-reduced-motion: reduce` and under `data-motion="paused"` on the root.
7.  **Pipeline figure.** `renderMemoryPipelineSvg` draws groups, steps (rounded rectangles), stores (cylinders) and labelled flows with arrowheads in `{colors.border-graph-line-base}`; a flow may carry a link code. It describes real components only.
8.  **Text equivalent and contrast.** Every field ships `renderMemoryFieldTable` (each node's links grouped by code label) beside the figure, and `memoryFieldContrastReport` states the worst lit-link contrast per theme. A field running on fixtures says so in its caption (ADR-017 item 7).
9.  **One renderer.** Products never redraw the field. The site renders the SVG at build time and drives motion with CSS (ADR-003); the web app may render the same layout as elements that carry the same classes, so focus and selection stay native.

**Consequences**: `lib/memory-field.js` and `lib/memory-field.css` ship to `dist/` with two sample SVGs; `preview/memory-field.html` and `preview/memory-pipeline.html` are generated from the renderer; the MCP tool `memory_field` returns the SVG, the text equivalent and the contrast report; the generated standard carries the record as `rules.memoryField`. The web app's relation legend changes colour on adoption, because its current colours reuse persona and status hexes.

## ADR-019: Reactive stage and accessible memory views

**Status**: Proposed (awaiting owner ratification). First consumer: the vidoxlabs.dev ambient backdrop and chat dock. Extends ADR-013 item 1. Numbered 019 because 014 to 018 are held by open proposals.

**Context**: On 2026-11-19 the owner asked for the site background to be more fluid, modern and reactive, in step with the newer interactive parts of the site. The ADR-013 stage loops on its own clock and ignores the visitor; the site already grew one seat's light on hover, but outside the primitive. Anything reactive has to keep the ADR-013 guarantees: CSP-safe markup, transform and opacity only, every layer inside the 4.5:1 bound for secondary text, and still under reduced motion and the pause control.

**Decision**:

1.  **Depth planes.** `renderStageSvg` groups the stage into three planes, `stage__plane--far` (the veils), `--mid` (sky, arc, lights) and `--near` (floor, ring). The product eases the pointer and writes `--stage-pointer-x` and `--stage-pointer-y` (each -1..1) on any ancestor; the sheet translates each plane by `STAGE_DEPTH` (6, 12 and 20 view units), using the individual `translate` property so it composes with every loop. These two custom properties and `--stage-depth` are the only non-token variables the sheet reads (`STAGE_RUNTIME_PROPERTIES`).
2.  **Persona veils.** Five broad single-colour radial glows, one per seat in canon order (all five or none), drift on the ambient clock with five phases so the field never repeats in step. Their alpha is a table entry (`veils`, an area layer counted twice) checked by `stageContrastReport`; the ambient ceiling stays 0.28.
3.  **Active seat.** `data-active-persona` on the root grows that seat's veil (scale 1.25) and light (scale 1.6), holds its ring segment at the top of its breath and steps the other veils back to 45%. Scaling spreads a layer without raising its peak, and stepping back only lowers it.
4.  **Scroll depth.** Where `animation-timeline: scroll()` exists, the ambient floor sinks (90 units) and the veils rise (40 units) across the page scroll. Browsers without scroll timelines keep the still planes. The hero variant does not take it.
5.  **Stillness.** Under `prefers-reduced-motion: reduce` the planes hold still (`translate: none`) and nothing transitions. Under `data-motion="paused"` every loop pauses and the product stops writing the pointer pair. Forced colours still remove the stage.

6.  **Who sets the active seat.** Any surface that addresses one seat may set `data-active-persona`: a seat card under the pointer or focus, and the chat dock while it is open (its selected seat). The surface clears it when it stops addressing that seat. The backdrop never sets it.
7.  **Accessible memory views (amends ADR-018 items 2, 4 and 8).** `renderMemoryFieldSvg(layout, { summary: true })` renders a field as one image (`role="img"`) whose long description comes from `describeMemoryField`: memory and link counts per code and, for a recall or a Forget, the memories it reaches. Use it wherever the nodes are not links; the interactive render keeps the node list and refuses nothing. In the interactive render every named group carries a role (nodes and lit links are `role="img"`), because ARIA does not expose a name on a bare group. Under `prefers-contrast: more` recency yields to full-strength marks and the rest web is dropped; under `forced-colors: active` every line and mark takes `CanvasText` (lit nodes `Highlight`) and the codes stay apart by dash and arrowhead.

**Consequences**: `lib/stage.js` exports `veils`, `STAGE_DEPTH` and `STAGE_RUNTIME_PROPERTIES`; `lib/stage.css` carries the planes, veils, seat rules and scroll depth; both preview fragments are regenerated. Products that only render the SVG get the veils and seat rules with no script; pointer depth needs a small product script that eases the pointer and respects both stillness conditions.

## ADR-020: Agent-harness group-conversation surface

**Status**: Proposed (awaiting owner ratification). Extends ADR-016 to multi-agent harness threads.

**Context**: ADR-016 defines the conversation surface for the five sovereign personas (seat dots, five-segment speaker marker, persona sprites), while agent-harness interfaces (such as Bloom) run a group thread of dynamic, runtime-created agents: a coordinating head agent plus created specialists that hand off tasks, emit activity and tool receipts, share artifact and file cards, and report usage and budget counters. Reusing the five persona accent colours or the five-seat switcher for runtime agents confuses sovereign persona identity with ephemeral worker roles, while ad-hoc harness threads drift into multi-card chat bubbles, spinners, inline file preview panes and unbudgeted chrome.

**Decision**:

1.  **Persona accent ban on non-persona agents.** The five persona signature tokens (`{colors.persona-accent-violet-base}` `#8B5CF6`, `{colors.persona-accent-wisteria-base}` `#B4A7F2`, `{colors.persona-accent-xylia-base}` `#D92B3A`, `{colors.persona-accent-yarrow-base}` `#F0A020`, `{colors.persona-accent-zinnia-base}` `#E13D9E`) belong exclusively to the five sovereign VWXYZ seats and are never reused for dynamic, non-persona agents, specialist roles or harness products.
2.  **Deterministic monogram identity.** Every runtime agent is identified by a deterministic one- or two-letter monogram (initials in `{typography.typography-family-mono-base}`, `{colors.text-content-primary-base}`) inside a circular badge (`{spacing.layout-radius-full-base}`) with a neutral fill (`{colors.surface-background-tertiary-base}` or `{colors.surface-background-secondary-base}`) and a `{colors.border-graph-line-base}` outline (at least 3:1 on every surface). The coordinating/head agent reserves a `{colors.surface-accent-violet-base}` ring (at least 3:1 as a non-text indicator) to distinguish orchestration authority from created specialists.
3.  **Mono role micro-labels.** Each agent's role or specialty sits beside its name as a sentence-case micro-label in `{typography.typography-family-mono-base}` (`{typography.typography-size-xs-base}`, `{typography.typography-tracking-wide-base}`, `{colors.text-content-secondary-base}`), never uppercase-transformed.
4.  **Speaker rhythm.** The monogram badge, agent name (`{colors.text-content-primary-base}`) and role micro-label head a turn only when the speaker changes, and on the first agent turn. Consecutive turns from the same agent carry no repeated header. As in ADR-016 item 4, the visitor's turn is the only bubble (`{colors.surface-background-tertiary-base}`, aligned to the end); agent replies are text on the core with no card around prose.
5.  **Receipt-ledger activity, usage and budget rows.** Visible handoffs between the head agent and specialists, tool activity, and token/cost usage and budget readouts render as hairline-separated ledger rows (`{colors.border-separator-primary-base}`, per ADR-017 item 6): a mono micro-label (`{typography.typography-family-mono-base}`, `{typography.typography-tracking-wide-base}`, `{colors.text-content-secondary-base}`) paired with a mono value (`tabular-nums`, `{colors.text-content-primary-base}`), inside a polite live region where counters update.
6.  **Artifact and file cards.** Shared files and produced artifacts render as solid cards on `{colors.surface-background-secondary-base}` (never glass) with `{spacing.layout-radius-standard-base}` (14px) radius and a `{colors.border-separator-primary-base}` border. Each card shows the filename in sans primary text and a mono micro-line recording the short content hash and authoring agent. Inline preview panes, nested code viewers and drop shadows are banned in the stream.
7.  **Turn-state grammar.** Turn and task states map to the status tokens with a text label (never colour alone): `running` uses `{colors.status-indicator-info-base}`, `stopping` uses `{colors.status-indicator-warning-base}`, `finished` uses `{colors.status-indicator-success-base}`, and `failed` uses `{colors.status-indicator-error-base}` (one plain sentence with one retry control on failure). A thinking pulse is the only loop, ending when output starts and static under `prefers-reduced-motion: reduce`; spinners and skeleton bubbles are banned.
8.  **Message actions on demand.** Copy and per-turn commands appear on hover and on keyboard focus inside the message (`{size.action-min-default}` hit target), or on the latest reply where hover is unavailable.

**Consequences**: `preview/group-conversation.html` shows a multi-agent harness thread in progress. The generated standard carries the record as `rules.groupConversation`. `test/standard.test.js` and `test/preview.test.js` assert parity and the persona-accent ban on non-persona agent threads.
