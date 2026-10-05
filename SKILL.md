---
name: "videsign"
description: "Workflow, architectural decisions, and constraints for the videsign repository"
---

# Workflow and Decision Ledger

This file houses Architectural Decision Records (ADRs) and serves as the mandatory first read for any agent initializing in this repository.

## ADR-001: Strict Surface Layering

> **Amended by ADR-006 (2026-10-05):** crystal glass is the sanctioned material for public product surfaces, limited to controls and lenses. The flat-surface, no-extraneous-shadow rules below still govern every non-glass surface.

**Context**: In complex multi-repo architectures, LLMs frequently hallucinate surface elevations, adding unwanted drop shadows or nested glassmorphism that degrades visual determinism.

**Decision**: The Nocturne Museum design system strictly enforces a flat surface architecture with functional glass overlays only.

1.  **Base Surfaces**: All core surfaces must use a solid color token (e.g., `{colors.surface-background-primary-base}`).
2.  **No Extraneous Shadows**: Standard components (cards, standard buttons, layout panels) must NOT use drop shadows.
3.  **Functional Glassmorphism**: Glass effects (e.g., `{effects.glass-functional-overlay-active}`) are reserved exclusively for:
    - Modals and dialogs
    - Floating contextual menus
    - Fixed navigation bars (apply glass effect persistently once the user has scrolled past the page top, until scrolled back to top)

## ADR-002: Asset & Media Hosting

**Context**: Storing binary assets (PNG, JPG, SVG, video) directly within the repository leads to unacceptable repo bloat and slows down CI/CD pipelines.

**Decision**:
1. No binary assets or base64-embedded images may be stored in the repository.
2. All assets must be hosted on an external CDN.
3. Agents must reference assets using the `{ASSET_BASE}` placeholder followed by the relative path (e.g., `{ASSET_BASE}/assets/logos/vidoxlabs/cube.png`). Consuming repos resolve this at build time via their environment configuration.
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
4. Persona Violet (#8B5CF6) is distinct from the brand accent `{colors.surface-accent-violet-base}` (#7C3AED). The brand accent stays reserved for key CTAs and focus outlines.
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
2.  **Two kinds of effect value.** The legacy `glass-functional-*` entries are Tailwind class strings; the new entries are literal CSS values. The generator distinguishes them (`isTailwindClassString`), emits every effect as `--vi-effects-*`, and never feeds CSS values to Tailwind.
3.  **Literal stylesheet.** The pipeline emits `dist/glass.css` with literal, prefixed and unprefixed `backdrop-filter` declarations (classes `vi-glass`, `vi-glass--control`, `vi-glass-shell`, `vi-glass-core`). A custom property is never used inside a backdrop-filter declaration.
4.  **Scope.** Glass appears only on: the floating island navigation, overlays and popovers, the question bar, the persona switcher, and the evidence lens over a field. Never on paragraphs, cards or section containers.
5.  **Limits.** At most three glass layers per viewport; never glass on glass; never backdrop blur on scrolling containers; the blur is never animated or transitioned. The evidence lens is a glass shell around a near-opaque core (`glass-crystal-core-base`), so reading text sits on a scrim rather than on a second blur.
6.  **Legibility floor.** Text on glass reaches 4.5:1 against the worst backdrop it can pass over, verified by pixel-sampling screenshots over the busiest legitimate backdrop, not by the prettiest state. Where the guarantee is analytic (the lens core over a fully white backdrop) it is asserted in `test/tokens.test.js`. If a measurement fails, the tokens change, not the threshold.
7.  **Fallback.** Under `prefers-reduced-transparency: reduce`, `prefers-contrast: more`, `forced-colors: active`, or `@supports not ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px)))`, the same shapes render as the solid surface (`glass-crystal-solid-base`, or `Canvas` under forced colours) with the same rim. The support query tests both properties because Safari before 18 ships only the prefixed one; testing the unprefixed property alone would wrongly strip glass there. Refraction (SVG displacement) is out of scope.
8.  **Untouched.** The legacy `glass-functional-overlay` tokens and the dashboard sidebar rule keep their meaning; this ADR does not retrofit them.

**Consequences**: Consumers import `dist/glass.css` and use the `vi-glass*` classes; they never write their own backdrop declarations. `eslint` cannot see fragments, so `scripts/lint-preview.js` enforces the scope, nesting and layer limits on the preview catalog. Contrast of single-layer glass depends on the backdrop, so each consuming site re-runs worst-backdrop sampling.

**Measured amendment (2026-10-05, from the vidoxlabs.dev foundation PR)**: the first site measurements, taken with real pages instead of the catalog stage, changed three things. The 4.5:1 floor was not moved; the tokens and the fragment were.

1.  **Ambient values lowered.** Free secondary text (`text-content-secondary-base`) sitting over the first ambient values (violet `0.55`, teal `0.28`, dots `0.35`) measured 3.62:1 to 4.54:1 on real routes. The values are now violet `0.30`, teal `0.16`, dots `0.14`, with an analytic bound in `test/tokens.test.js` (secondary text over the strongest glow with a dot on top).
2.  **Text-bearing controls are shell + core.** A single `vi-glass` layer cannot reach 4.5:1 over white imagery: `brightness(0.5)` makes white 128 grey, which is about 3.9:1 for white text and near 1:1 for grey text. The catalog stage had no large light areas, so the PR 1 sweep did not expose this. `island-nav` is now a shell + core pill (radius full, so the bezel stays concentric). A single `vi-glass` layer is reserved for glass without text.
3.  **A named ancestor is a backdrop root.** A `backdrop-filter` inside an element with a `view-transition-name` (Astro assigns one to `transition:persist` elements), a `filter`, `opacity < 1`, `mask`, `clip-path`, `mix-blend-mode` or `will-change` sees only that ancestor's own box. A consumer must keep glass out of such ancestors or opt them out; the site's persisted header sets `view-transition-name: none`.

## ADR-007: Typography (Geist and Geist Mono)

**Status**: Proposed (awaiting owner ratification). Supersedes the Inter and JetBrains Mono family values in the token matrix, and the font choice in vidoxlabs.dev ADR 0029 on PR #8.

**Context**: Inter is the most common interface typeface on the web and the high-end visual standard flags it as generic. The approved typography review chose a single coherent superfamily whose mono shares its proportions, so labels and prose read as one voice.

**Decision**:

1.  `typography-family-sans-base` is `Geist, ui-sans-serif, system-ui, sans-serif`; `typography-family-mono-base` is `Geist Mono, ui-monospace, SFMono-Regular, Menlo, monospace`. The Tailwind `fontFamily` map is derived from these tokens rather than hardcoded.
2.  Display text is Geist 600 with tight tracking; body is Geist 400; labels and navigation are Geist Mono in sentence case.
3.  **Licence and hosting.** Geist and Geist Mono are SIL Open Font License 1.1. Per ADR-002 no binary lives in this repository; the consuming site self-hosts subsetted WOFF2 under its own `font-src 'self'` policy, ships the OFL text with the binaries, and measures its own metric-matched fallback faces on its own tree. The preview catalog uses the fonts if installed and otherwise the system stack.
4.  The ADR-005 hero ceiling is unchanged (5.25rem, hero only; 3.5rem for everything else).

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

## Negative Constraints against Boilerplate Generation

Agents MUST NOT generate the following boilerplate or generic patterns:

-   **Tailwind Defaults**: Do not use default Tailwind colors (e.g., `blue-500`, `red-400`). Always map to the `category-role-variant-state` matrix defined in `DESIGN.md`.
-   **Placeholder Images**: Do not use external placeholder image services (e.g., `via.placeholder.com`). If an image is required for a preview, use a local, solid color semantic placeholder div.
-   **Generic Copy**: Do not use "Lorem Ipsum". Use contextually relevant, realistic content that adheres to the Sentence case typography guardrail.

## Agent Instructions

1.  **Read First**: This file (`SKILL.md`) is your starting point.
2.  **Consult DESIGN.md**: For specific color codes and strict negative boundaries.
3.  **Inspect previews**: Look at the `preview/` directory for pure HTML implementations.
