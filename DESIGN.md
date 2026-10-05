---
# NOCTURNE MUSEUM: SEMANTIC TOKEN MATRIX
# Format: category-role-variant-state
colors:
  surface-background-primary-base: "#0A0A0E"
  surface-background-secondary-base: "#12121A"
  surface-background-tertiary-base: "#1C1C24"
  surface-accent-violet-base: "#7C3AED"
  surface-accent-violet-hover: "#6B46C1"
  surface-accent-violet-active: "#5B21B6"
  text-content-primary-base: "#FFFFFF"
  text-content-secondary-base: "#A1A1AA"
  border-separator-primary-base: "#27272A"
  status-indicator-success-base: "#10B981"
  status-indicator-warning-base: "#F59E0B"
  status-indicator-error-base: "#F43F5E"
  status-indicator-info-base: "#06B6D4"
  persona-accent-violet-base: "#8B5CF6"
  persona-accent-wisteria-base: "#A78BFA"
  persona-accent-xylia-base: "#2DD4BF"
  persona-accent-yarrow-base: "#F59E0B"
  persona-accent-zinnia-base: "#F43F5E"

typography:
  typography-family-sans-base: "Geist, ui-sans-serif, system-ui, sans-serif"
  typography-family-mono-base: "Geist Mono, ui-monospace, SFMono-Regular, Menlo, monospace"
  typography-weight-regular-base: "400"
  typography-weight-medium-base: "500"
  typography-weight-semibold-base: "600"
  typography-weight-bold-base: "700"
  typography-tracking-tight-base: "-0.02em"
  typography-tracking-normal-base: "0"
  typography-tracking-wide-base: "0.04em"
  typography-tracking-widest-base: "0.08em"
  typography-leading-none-base: "1"
  typography-leading-tight-base: "1.25"
  typography-leading-normal-base: "1.5"
  typography-size-xs-base: "0.75rem"
  typography-size-sm-base: "0.875rem"
  typography-size-md-base: "1rem"
  typography-size-lg-base: "1.125rem"
  typography-size-xl-base: "1.25rem"
  typography-size-2xl-base: "1.5rem"
  typography-size-3xl-base: "1.875rem"
  typography-size-4xl-base: "2.5rem"
  typography-size-5xl-base: "3.5rem"
  typography-fluid-display-base: "clamp(2rem, 1.5rem + 2vw, 3.5rem)"
  typography-fluid-h1-base: "clamp(2rem, 1.5rem + 2vw, 3.5rem)"
  typography-fluid-h2-base: "clamp(1.5rem, 1.25rem + 1vw, 2.5rem)"
  typography-fluid-h3-base: "clamp(1.25rem, 1.1rem + 0.6vw, 2rem)"
  typography-fluid-lede-base: "clamp(1rem, 0.95rem + 0.2vw, 1.25rem)"
  typography-fluid-body-base: "clamp(1rem, 0.96rem + 0.15vw, 1.0625rem)"
  typography-fluid-caption-base: "clamp(0.75rem, 0.73rem + 0.08vw, 0.8125rem)"
  typography-fluid-hero-base: "clamp(2.75rem, 6vw + 0.5rem, 5.25rem)"

# effects: crystal glass and ambient values only (ADR-006). All values are
# literal CSS. Legacy glass-functional-* Tailwind class strings are removed.
effects:
  glass-crystal-surface-base: "rgba(255, 255, 255, 0.035)"
  glass-crystal-surface-hover: "rgba(255, 255, 255, 0.07)"
  glass-crystal-rim-base: "rgba(255, 255, 255, 0.26)"
  glass-crystal-rim-hover: "rgba(255, 255, 255, 0.4)"
  glass-crystal-highlight-base: "inset 0 1px 0 rgba(255, 255, 255, 0.32), inset 0 0 0 1px rgba(255, 255, 255, 0.03)"
  glass-crystal-sheen-base: "linear-gradient(160deg, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0) 35%)"
  glass-crystal-shadow-base: "0 12px 30px rgba(0, 0, 0, 0.3)"
  glass-crystal-backdrop-base: "blur(14px) brightness(0.5) saturate(150%)"
  glass-crystal-core-base: "rgba(10, 10, 14, 0.85)"
  glass-crystal-solid-base: "#12121A"
  ambient-glow-violet-base: "rgba(124, 58, 237, 0.30)"
  ambient-glow-teal-base: "rgba(45, 212, 191, 0.16)"
  ambient-dots-base: "rgba(161, 161, 170, 0.14)"

spacing:
  layout-radius-standard-base: "14px"
  layout-radius-control-base: "10px"
  layout-radius-full-base: "9999px"
  layout-radius-glass-base: "20px"
  layout-padding-small-base: "8px"
  layout-padding-medium-base: "16px"
  layout-padding-large-base: "24px"
  layout-padding-bezel-base: "6px"

size:
  action-min-default: "2.75rem"
  action-dense-default: "3rem"
  action-wide-default: "3.5rem"
  layout-width-sidebar-base: "16rem"
  layout-width-inspector-base: "20rem"
  layout-width-content-base: "80rem"
  icon-xs-base: "1rem"
  icon-sm-base: "1.5rem"
  icon-md-base: "2rem"
  icon-lg-base: "2.75rem"
  indicator-dot-base: "0.5rem"
  indicator-mark-base: "0.75rem"
  indicator-brand-base: "1.75rem"

space:
  gap-dense-default: "0.25rem"
  gap-compact-default: "0.5rem"
  gap-comfortable-default: "0.75rem"
  gap-spacious-default: "1rem"
  gap-section-default: "1.25rem"
  inset-compact-default: "0.5rem"
  inset-operator-default: "0.75rem"
  layout-stack-default: "1rem"
  rhythm-1-base: "0.25rem"
  rhythm-2-base: "0.5rem"
  rhythm-3-base: "0.75rem"
  rhythm-4-base: "1rem"
  rhythm-5-base: "1.25rem"
  rhythm-6-base: "1.5rem"
  rhythm-8-base: "2rem"
  rhythm-10-base: "2.5rem"
  rhythm-12-base: "3rem"
  rhythm-16-base: "4rem"
  rhythm-20-base: "5rem"
  rhythm-24-base: "6rem"
  rhythm-page-gutter-base: "1.5rem"
  rhythm-section-y-base: "4rem"
  rhythm-macro-base: "6rem"

transition:
  transition-duration-fast-base: "150ms"
  transition-duration-normal-base: "200ms"
  transition-duration-slow-base: "300ms"
  transition-duration-entrance-base: "500ms"
  transition-easing-standard-base: "cubic-bezier(0.16, 1, 0.3, 1)"
  transition-easing-spring-base: "cubic-bezier(0.32, 0.72, 0, 1)"
---

# Visual Truth Layer: Nocturne Museum

This file serves as the canonical source of truth for the **Nocturne Museum** theme. The YAML front-matter contains the deterministic design tokens that must be strictly adhered to by all code generation agents.

## Semantic Matrix Rules

All design tokens must strictly adhere to the 4-part matrix: `category-role-variant-state`.
Agents must utilize the Token Reference Syntax when binding component states (e.g., `{colors.surface-background-primary-base}`).

## Component Rules
>
> [!IMPORTANT]
>
> ### Sidebar Architecture
>
> - Sidebars are opaque secondary surfaces, not glass (ADR-006).
> - Sidebars must be rounded on the **right edge only** (`rounded-r-layout-radius-standard-base`).

> [!IMPORTANT]
>
> ### Sovereign Persona Console
>
> - The console is the standard frame for presenting the five sovereign personas (Violet, Wisteria, Xylia, Yarrow, Zinnia) in any consuming product.
> - Every persona retains an identical structural grid: an identity status header rendered in `{typography.typography-family-mono-base}`, a primary operational viewport, an evidence trail panel, and a command bar.
> - The shared console frame stays mounted while switching personas; internal panels morph via named view transitions with zero layout shift. The frame persists; only the addressed persona's panels change.
> - Persona differentiation uses localized persona accent tokens and micro-badges only — never layout changes, never Title Case, never decorative emoji.
> - Console controls use `{spacing.layout-radius-control-base}` radii and meet the 44px touch target floor (`{size.action-min-default}`).

> [!IMPORTANT]
>
> ### Persona identity accents
>
> - Persona identity accents are locked. Violet is always `{colors.persona-accent-violet-base}` (#8B5CF6), Wisteria is always `{colors.persona-accent-wisteria-base}` (#A78BFA), Xylia is always `{colors.persona-accent-xylia-base}` (#2DD4BF), Yarrow is always `{colors.persona-accent-yarrow-base}` (#F59E0B), and Zinnia is always `{colors.persona-accent-zinnia-base}` (#F43F5E).
> - Persona accents are identity markers only. They never substitute for status indicators: Yarrow amber shares its hex with `{colors.status-indicator-warning-base}` and Zinnia rose with `{colors.status-indicator-error-base}` — a shared hex never makes the roles interchangeable. Status semantics always use status tokens; persona identity always uses persona accent tokens.
> - Persona Violet (#8B5CF6) is distinct from the brand accent `{colors.surface-accent-violet-base}` (#7C3AED), which stays reserved for key CTAs and focus outlines.
> - **Accent text lives on the primary surface only.** Measured: Violet `{colors.persona-accent-violet-base}` is 4.67:1 on `{colors.surface-background-primary-base}` but 4.40:1 on secondary and 4.00:1 on tertiary, so it fails AA as small text on both. On secondary and tertiary surfaces a persona accent appears only as a non-text indicator (dot, bar, ring, 3:1). Wisteria, Xylia, Yarrow and Zinnia pass 4.5:1 on all three surfaces (Zinnia on tertiary is marginal at 4.61:1).
> - Never invent persona hex values locally. New persona states (hover, active) or any new persona color must be added to the `colors` matrix in this file first, then referenced.

> [!IMPORTANT]
>
> ### Hero billboard scale (ADR-005)
>
> - `typography-fluid-hero-base` (max 5.25rem, emitted `--vi-typography-typography-fluid-hero-base`) is the sanctioned primary-landing-hero scale — one usage per page, page title only.
> - The 3.5rem ceiling stays binding for `fluid-display`, `fluid-h1`–`fluid-h3` and static `4xl`/`5xl`. Section headings, cards, and prose never consume the hero token.

## Continuous Interaction Standards

Consuming products present sovereign personas and evidence inside static-edge constraints (static builds, zero runtime bindings, strict CSP `script-src 'self'`). Continuity therefore comes from browser-native primitives, never client-framework hydration.

- **Motion vocabulary**: durations come only from `{transition.transition-duration-fast-base}` (150ms), `{transition.transition-duration-normal-base}` (200ms), `{transition.transition-duration-slow-base}` (300ms) and, for entrances only, `{transition.transition-duration-entrance-base}` (500ms: scroll reveals, opening the lens, highlighting the field). Easing is `{transition.transition-easing-standard-base}` by default and `{transition.transition-easing-spring-base}` for lens and sheet motion. Animated properties are `transform` and `opacity` only; blur is never animated. Zero bounce: neither easing overshoots (ADR-008).
- **View transitions**: document-level navigation cross-fades via the View Transitions API with a 200ms fade (`{transition.transition-easing-standard-base}`). Non-supporting browsers perform an instant swap. Shared shell elements (header, navigation) persist across navigation.
- **Scroll-driven motion**: editorial surfaces reveal via `animation-timeline: view()` (entry 10% to cover 30%), opacity and `transform` only, zero JavaScript. Unsupported browsers see the completed static layout.
- **Discrete panel transitions**: drawers, filters, and metadata panels animate entry and exit with `@starting-style` and `transition-behavior: allow-discrete` instead of JavaScript style manipulation. Unsupported browsers snap instantly.
- **Top-layer navigation**: mobile and contextual menus use the HTML Popover API (`popover` attribute) for native top-layer, light-dismiss, and Escape handling — never z-index stacking hacks.
- **Reduced motion obedience**: every motion declaration sits under the consuming product's global `prefers-reduced-motion: reduce` override — view-transition animations none, scroll timelines inert, discrete transitions instant.
- **Fail-closed states**: on network or schema failure, panels never display speculative, simulated, or cached numbers. Affected panels transition to an explicit fail-closed state that locks interactive controls and displays the failure receipt directly. Loading skeletons use `{colors.surface-background-tertiary-base}` geometry matched to the resolved layout so data arrival causes zero layout shift.
- **Script posture**: continuity motion is pure CSS; behavioral scripts in consuming products are external, CSP-safe, and idempotent (see SKILL.md ADR-003).

## Crystal glass (ADR-006)

Crystal glass is the one sanctioned glass material for public product surfaces. It is near-clear, with a bright rim and a top highlight; it dims and softens what is behind it instead of tinting it milky. Tokens: `{effects.glass-crystal-surface-base}`, `{effects.glass-crystal-rim-base}`, `{effects.glass-crystal-highlight-base}`, `{effects.glass-crystal-sheen-base}`, `{effects.glass-crystal-shadow-base}`, `{effects.glass-crystal-backdrop-base}`, `{effects.glass-crystal-core-base}`, and the solid fallback `{effects.glass-crystal-solid-base}`. The generator emits them as `--vi-effects-*` custom properties and as a generated `dist/glass.css` with literal values, because Safari does not resolve custom properties inside `-webkit-backdrop-filter`.

- **Scope.** Glass marks controls and lenses: the floating island navigation, overlays and popovers, the question bar, the persona switcher, and the evidence lens over a field. Never on paragraphs, cards or section containers. Content stays solid and readable.
- **Limits.** At most three glass layers per viewport. Never glass on glass (the lens core is a scrim, not a second blur). Never backdrop blur on scrolling containers. Never animate or transition the blur.
- **Double bezel.** Glass shells use the outer radius `{spacing.layout-radius-glass-base}` (20px), `{spacing.layout-padding-bezel-base}` (6px) padding, and an inner core at `{spacing.layout-radius-standard-base}` (14px): 20 = 6 + 14, concentric. The rim is an inset box-shadow (not a border box) so the arithmetic holds. Pill shapes use `vi-glass-shell--pill` / `vi-glass-core--pill` so plain-CSS consumers get the full radius without relying on a later Tailwind utility.
- **Composition.** Clear glass floats over the field, imagery and ambient glows (`{effects.ambient-glow-violet-base}`, `{effects.ambient-glow-teal-base}`, `{effects.ambient-dots-base}`), never directly over body copy. A headline may pass beneath the island while scrolling.
- **Legibility floor.** Text on glass reaches 4.5:1 against the worst backdrop it can pass over, verified by pixel-sampling screenshots, not by the prettiest state. Reading text in the lens sits on the core scrim, which clears 4.5:1 over a fully white backdrop even if the engine does not render the backdrop filter at all (analytic bound in `test/tokens.test.js`).
- **Text-bearing controls are shell + core.** Any glass control that carries text and can pass over bright imagery (the island navigation, the question bar, the persona switcher) is a `vi-glass-shell` around a `vi-glass-core`, not a single `vi-glass` layer. `brightness(0.5)` turns white into mid grey, so one translucent layer cannot reach 4.5:1 over a white screenshot; the core scrim can. A single `vi-glass` layer is reserved for glass that carries no text.
- **Ambient field.** The ambient glows and dots sit behind free page text as well as behind glass, so their peak values are bounded by the legibility floor: secondary text clears 4.5:1 over the strongest glow with a dot on top (analytic bound in `test/tokens.test.js`).
- **Fallbacks.** Under `prefers-reduced-transparency: reduce`, `prefers-contrast: more`, `forced-colors: active`, or when `backdrop-filter` (prefixed or not) is unsupported, the same shapes render as the solid surface with the same rim. Refraction (SVG displacement) is out of scope.
- **Type.** Eyebrows and labels use `{typography.typography-family-mono-base}` in sentence case with `{typography.typography-tracking-wide-base}` (or widest for micro-labels). Never the Tailwind `uppercase` utility.

## Spacing rhythm (ADR-009)

All page spacing resolves to the 4px rhythm under `{space.rhythm-*-base}` plus the named page roles `{space.rhythm-page-gutter-base}`, `{space.rhythm-section-y-base}` and `{space.rhythm-macro-base}`. Existing gap/inset tokens remain aliases of the same scale. Consumers must not invent rem lengths outside this set.

## Negative Boundaries (Strict AI Guardrails)

To prevent "AI drift" and the generation of generic or hallucinated UI elements, agents MUST abide by the following constraints:

> [!WARNING]
>
> ### 1. Typography Guardrails
>
> - **Enforce Sentence case**: Use sentence case for all default interactions and labels (e.g., "Submit your form"). Eyebrows and labels are Geist Mono in sentence case with a tracking token — never `text-transform: uppercase` or the Tailwind `uppercase` utility.
> - **BAN Title Case**: The generation of Title Case text is comprehensively banned across all UI components.
> - **Family Rules**: Use `{typography.typography-family-mono-base}` (Geist Mono) for nav, labels, and status. Use `{typography.typography-family-sans-base}` (Geist) for section titles and descriptions (ADR-007).
> - **Weight, tracking, leading**: use only the typography weight/tracking/leading tokens (`font-typography-weight-*`, `tracking-typography-tracking-*`, `leading-typography-leading-*`). Ban raw `font-medium` / `font-bold` / `tracking-*` / `leading-*`.

> [!CAUTION]
>
> ### 2. Imagery & Icons
>
> - **BAN Emojis**: Explicitly forbid the use of decorative emojis anywhere in the markup.
> - **Asset Storage Rule**: Absolutely no binary assets (PNG, JPG, SVG, video) may be stored in the repository. All assets must be referenced via the `{ASSET_BASE}` placeholder (e.g. `<img src="{ASSET_BASE}/assets/logos/vidoxlabs/cube.png" />`). Consuming repos resolve `{ASSET_BASE}` at build time to their CDN endpoint.

> [!IMPORTANT]
>
> ### 3. Geometry & Elevation
>
> - **Strict Radius**: Command the agent to build using a strict flat `14px` layout (`--r-lg`). For small controls/inputs, use `10px` (`layout-radius-control-base`). Glass shells alone use `20px` (`layout-radius-glass-base`) around a `14px` core with `6px` bezel padding (ADR-006, ADR-008).
> - **BAN 32px Radii**: Explicitly and aggressively forbid the use of the standard `32px` web radii that LLMs frequently hallucinate.

> [!CAUTION]
>
> ### 4. Glassmorphism Application
>
> - **One material.** Crystal glass (ADR-006) is the only glass. It appears only on controls and lenses: island navigation, overlays and popovers, the question bar, the persona switcher and the evidence lens. Sidebars, cards, section containers and paragraphs stay solid opaque surfaces.
> - **BAN Legacy Semi-transparent**: Ban legacy `backdrop-blur-*` / `bg-white/*` glass class strings and any other milky overlay. Never glass on glass; at most three glass layers per viewport; never backdrop blur on scrolling containers.

> [!CAUTION]
>
> ### 5. Code Validation
>
> - **BAN Arbitrary Tailwind Values**: Never generate Tailwind arbitrary values (e.g., `w-[15px]`). Always use semantic tokens mapped in the design system.

## Permitted Tailwind Utilities

The following structural Tailwind utilities are permitted alongside semantic tokens. They are
layout or interaction primitives and do not require individual tokens:

| Category     | Permitted utilities                          | Notes                                |
| ------------ | -------------------------------------------- | ------------------------------------ |
| Flexbox      | `flex`, `flex-col`, `flex-row`, `flex-1`, `items-*`, `justify-*`, `shrink-0` | Layout primitives, not visual tokens |
| Display      | `block`, `inline`, `inline-flex`, `inline-block`, `grid`, `place-items-*`, `hidden`, `relative`, `absolute`, `sr-only` | Structural, not visual               |
| Overflow     | `overflow-hidden`, `overflow-y-auto`, `overflow-x-auto` | Behavioral, not visual               |
| Opacity      | `opacity-20`, `opacity-40`, `opacity-50`, `opacity-80`, `opacity-100` | Modifier on semantic color tokens    |
| Z-index      | `z-10`, `z-20`, `z-30`                        | Stacking order                       |
| Last-child   | `last:border-b-0`, `last:pb-0`               | Structural selectors                 |
| Group        | `group`, `group-hover:*`                     | Interaction composition              |
| Stretch      | `w-full`, `h-full`, `h-screen`, `w-screen`, `min-w-0`, `min-h-screen`, `h-auto` | Fill / viewport chrome               |
| Borders      | `border`, `border-t`, `border-b`, `border-r`, `border-l`, `border-l-2`, `border-l-4`, `border-2`, `border-dashed`, `border-collapse` | Presence only; colour/radius stay tokens |
| Transforms   | `transform`, `-translate-x-1/2`, `-translate-y-1/2`, `top-*`, `left-*`, `origin-left`, `truncate`, `underline`, `tabular-nums`, `cursor-not-allowed`, `outline-none`, `bg-transparent` | Field canvas and a11y helpers        |

All spacing, sizing, color, typography weight/tracking/leading, radius, and transition
values must use semantic tokens. Raw utilities like `gap-2`, `w-64`, `text-sm`,
`font-medium`, `tracking-wide`, `leading-tight`, `duration-200`, `uppercase`,
`backdrop-blur-*` and `bg-white/*` are banned. Use token equivalents
(`gap-gap-compact-default`, `w-indicator-dot-base`, `font-typography-weight-medium-base`,
`tracking-typography-tracking-wide-base`, `duration-transition-duration-normal-base`).

## Accessibility Guardrails

> [!IMPORTANT]
>
> ### Minimum touch targets
>
> Interactive elements must meet a minimum 44px touch target (`{size.action-min-default}` = 2.75rem).
> This is non-negotiable for buttons, nav items, toolbar controls, and any click/tap target.

> [!IMPORTANT]
>
> ### Image accessibility
>
> All `<img>` elements using `{ASSET_BASE}` must include descriptive `alt` text.
> Decorative images use `alt=""`. Never omit the attribute.

> [!IMPORTANT]
>
> ### Color contrast
>
> Measured WCAG ratios (relative luminance, 2026-10-05). The palette is built for AA, but not every pair passes:
>
> | Foreground | on primary `#0A0A0E` | on secondary `#12121A` | on tertiary `#1C1C24` |
> | --- | --- | --- | --- |
> | `{colors.text-content-primary-base}` `#FFFFFF` | 19.76:1 | 18.63:1 | 16.92:1 |
> | `{colors.text-content-secondary-base}` `#A1A1AA` | 7.71:1 | 7.27:1 | 6.60:1 |
> | Persona Violet `#8B5CF6` | 4.67:1 | **4.40:1 (fails AA text)** | **4.00:1 (fails AA text)** |
> | Persona Wisteria `#A78BFA` | 7.26:1 | 6.85:1 | 6.22:1 |
> | Persona Xylia `#2DD4BF` | 10.62:1 | 10.01:1 | 9.09:1 |
> | Persona Yarrow `#F59E0B` | 9.20:1 | 8.67:1 | 7.88:1 |
> | Persona Zinnia `#F43F5E` | 5.38:1 | 5.07:1 | 4.61:1 |
> | Brand accent `#7C3AED` | 3.47:1 (3:1 indicator or fill only, not text) | | |
> | White on brand accent fill | 5.70:1 (hover 6.42:1) | | |
>
> - Secondary text on tertiary is 6.60:1; the earlier warning that it drops below AA was wrong.
> - Violet persona accent text stays on the primary surface (see Persona identity accents).
> - Text on crystal glass is measured over the worst backdrop in the catalog, not from these static pairs (see Crystal glass).
