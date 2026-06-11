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

effects:
  glass-functional-overlay-base: "backdrop-blur-sm bg-white/5"
  glass-functional-overlay-hover: "backdrop-blur-md bg-white/10"
  glass-functional-overlay-active: "backdrop-blur-lg bg-white/15"

spacing:
  layout-radius-standard-base: "14px"
  layout-radius-control-base: "10px"
  layout-padding-small-base: "8px"
  layout-padding-medium-base: "16px"
  layout-padding-large-base: "24px"
---

# Visual Truth Layer: Nocturne Museum

This file serves as the canonical source of truth for the **Nocturne Museum** theme. The YAML front-matter contains the deterministic design tokens that must be strictly adhered to by all code generation agents.

## Semantic Matrix Rules
All design tokens must strictly adhere to the 4-part matrix: `category-role-variant-state`. 
Agents must utilize the Token Reference Syntax when binding component states (e.g., `{colors.surface-background-primary-base}`).

## Component Rules
> [!IMPORTANT]
> ### Sidebar Architecture
> - Sidebars must use full-height glassmorphism.
> - Sidebars must be rounded on the **right edge only** (`border-radius: 0 1rem 1rem 0`).

## Negative Boundaries (Strict AI Guardrails)
To prevent "AI drift" and the generation of generic or hallucinated UI elements, agents MUST abide by the following constraints:

> [!WARNING]
> ### 1. Typography Guardrails
> - **Enforce Sentence case**: Use sentence case for all default interactions and labels (e.g., "Submit your form").
> - **BAN Title Case**: The generation of Title Case text is comprehensively banned across all UI components.
> - **Family Rules**: Use `{typography.typography-family-mono-base}` for nav, labels, and status. Use `{typography.typography-family-sans-base}` for section titles and descriptions.

> [!CAUTION]
> ### 2. Imagery & Icons
> - **BAN Emojis**: Explicitly forbid the use of decorative emojis anywhere in the markup. 
> - **Asset Storage Rule**: Absolutely no binary assets (PNG, JPG, SVG, video) may be stored in the repository. All assets must be referenced via OneDrive URLs. Use the placeholder `{ONEDRIVE_ASSET_BASE}` for all asset paths (e.g. `<img src="{ONEDRIVE_ASSET_BASE}/assets/logos/vidoxlabs/cube.png" />`).

> [!IMPORTANT]
> ### 3. Geometry & Elevation
> - **Strict Radius**: Command the agent to build using a strict flat `14px` layout (`--r-lg`). For small controls/inputs, use `10px` (`layout-radius-control-base`).
> - **BAN 32px Radii**: Explicitly and aggressively forbid the use of the standard `32px` web radii that LLMs frequently hallucinate.

> [!CAUTION]
> ### 4. Glassmorphism Application
> - **Functional Allowed**: Functional glassmorphism is permitted for the Nocturne theme (e.g., sidebars, modals, floating navigational elements).
> - **BAN Legacy Semi-transparent**: Explicitly ban legacy, semi-transparent glassmorphism layers on standard flat surfaces. Surfaces should be solid colors (e.g., `#0A0A0E`) unless explicitly acting as a functional overlay.

> [!CAUTION]
> ### 5. Code Validation
> - **BAN Arbitrary Tailwind Values**: Never generate Tailwind arbitrary values (e.g., `w-[15px]`). Always use semantic tokens mapped in the design system.
