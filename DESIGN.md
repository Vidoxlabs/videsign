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

typography:
  typography-family-sans-base: "Inter, sans-serif"
  typography-family-mono-base: "JetBrains Mono, monospace"
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

effects:
  glass-functional-overlay-base: "backdrop-blur-sm bg-white/5"
  glass-functional-overlay-hover: "backdrop-blur-md bg-white/10"
  glass-functional-overlay-active: "backdrop-blur-lg bg-white/15"

spacing:
  layout-radius-standard-base: "14px"
  layout-radius-control-base: "10px"
  layout-radius-full-base: "9999px"
  layout-padding-small-base: "8px"
  layout-padding-medium-base: "16px"
  layout-padding-large-base: "24px"

size:
  action-min-default: "2.75rem"
  action-dense-default: "3rem"
  action-wide-default: "3.5rem"
  layout-width-sidebar-base: "16rem"
  layout-width-inspector-base: "20rem"
  icon-xs-base: "1rem"
  icon-sm-base: "1.5rem"
  icon-md-base: "2rem"
  icon-lg-base: "2.75rem"

space:
  gap-dense-default: "0.25rem"
  gap-compact-default: "0.5rem"
  gap-comfortable-default: "0.75rem"
  gap-spacious-default: "1rem"
  gap-section-default: "1.25rem"
  inset-compact-default: "0.5rem"
  inset-operator-default: "0.75rem"
  layout-stack-default: "1rem"

transition:
  transition-duration-fast-base: "150ms"
  transition-duration-normal-base: "200ms"
  transition-duration-slow-base: "300ms"
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
> - Sidebars must use full-height glassmorphism.
> - Sidebars must be rounded on the **right edge only** (`border-radius: 0 1rem 1rem 0`).

## Negative Boundaries (Strict AI Guardrails)

To prevent "AI drift" and the generation of generic or hallucinated UI elements, agents MUST abide by the following constraints:

> [!WARNING]
>
> ### 1. Typography Guardrails
>
> - **Enforce Sentence case**: Use sentence case for all default interactions and labels (e.g., "Submit your form").
> - **BAN Title Case**: The generation of Title Case text is comprehensively banned across all UI components.
> - **Family Rules**: Use `{typography.typography-family-mono-base}` for nav, labels, and status. Use `{typography.typography-family-sans-base}` for section titles and descriptions.

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
> - **Strict Radius**: Command the agent to build using a strict flat `14px` layout (`--r-lg`). For small controls/inputs, use `10px` (`layout-radius-control-base`).
> - **BAN 32px Radii**: Explicitly and aggressively forbid the use of the standard `32px` web radii that LLMs frequently hallucinate.

> [!CAUTION]
>
> ### 4. Glassmorphism Application
>
> - **Functional Allowed**: Functional glassmorphism is permitted for the Nocturne theme (e.g., sidebars, modals, floating navigational elements).
> - **BAN Legacy Semi-transparent**: Explicitly ban legacy, semi-transparent glassmorphism layers on standard flat surfaces. Surfaces should be solid colors (e.g., `#0A0A0E`) unless explicitly acting as a functional overlay.

> [!CAUTION]
>
> ### 5. Code Validation
>
> - **BAN Arbitrary Tailwind Values**: Never generate Tailwind arbitrary values (e.g., `w-[15px]`). Always use semantic tokens mapped in the design system.

## Permitted Tailwind Utilities

The following structural Tailwind utilities are permitted alongside semantic tokens. They are
part of Tailwind's core scale (4px baseline) and do not require individual tokens:

| Category     | Permitted utilities                          | Notes                                |
| ------------ | -------------------------------------------- | ------------------------------------ |
| Flexbox      | `flex`, `flex-col`, `flex-row`, `flex-1`, `items-*`, `justify-*`, `shrink-0` | Layout primitives, not visual tokens |
| Display      | `block`, `inline`, `hidden`, `relative`, `absolute` | Structural, not visual               |
| Overflow     | `overflow-hidden`, `overflow-y-auto`, `overflow-x-auto` | Behavioral, not visual               |
| Opacity      | `opacity-20`, `opacity-40`, `opacity-50`, `opacity-80`, `opacity-100` | Modifier on semantic color tokens    |
| Z-index      | `z-10`, `z-20`, `z-30`                        | Stacking order                       |
| Last-child   | `last:border-b-0`, `last:pb-0`               | Structural selectors                 |
| Group        | `group`, `group-hover:*`                     | Interaction composition              |

All spacing, sizing, color, typography, radius, and transition values must use semantic tokens.
Raw utilities like `gap-2`, `w-64`, `text-sm`, `duration-200` must be replaced with their
token equivalents (`gap-gap-compact-default`, `w-layout-width-sidebar-base`,
`text-typography-size-sm-base`, `transition-duration-normal-base`).

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
> The Nocturne Museum palette is designed for WCAG AA compliance:
>
> - `{colors.text-content-primary-base}` (#FFFFFF) on `{colors.surface-background-primary-base}` (#0A0A0E): 19.3:1
> - `{colors.text-content-secondary-base}` (#A1A1AA) on `{colors.surface-background-primary-base}` (#0A0A0E): 8.6:1
> - `{colors.text-content-primary-base}` on `{colors.surface-background-secondary-base}` (#12121A): 17.9:1
>
> Do not place `{colors.text-content-secondary-base}` on `{colors.surface-background-tertiary-base}` without an
> opacity modifier — contrast drops below AA for small text.
