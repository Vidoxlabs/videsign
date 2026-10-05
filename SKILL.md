---
name: "videsign"
description: "Workflow, architectural decisions, and constraints for the videsign repository"
---

# Workflow and Decision Ledger

This file houses Architectural Decision Records (ADRs) and serves as the mandatory first read for any agent initializing in this repository.

## ADR-001: Strict Surface Layering

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

## Negative Constraints against Boilerplate Generation

Agents MUST NOT generate the following boilerplate or generic patterns:

-   **Tailwind Defaults**: Do not use default Tailwind colors (e.g., `blue-500`, `red-400`). Always map to the `category-role-variant-state` matrix defined in `DESIGN.md`.
-   **Placeholder Images**: Do not use external placeholder image services (e.g., `via.placeholder.com`). If an image is required for a preview, use a local, solid color semantic placeholder div.
-   **Generic Copy**: Do not use "Lorem Ipsum". Use contextually relevant, realistic content that adheres to the Sentence case typography guardrail.

## Agent Instructions

1.  **Read First**: This file (`SKILL.md`) is your starting point.
2.  **Consult DESIGN.md**: For specific color codes and strict negative boundaries.
3.  **Inspect previews**: Look at the `preview/` directory for pure HTML implementations.
