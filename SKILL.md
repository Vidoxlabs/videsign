---
name: "Nocturne Museum Design System Rules"
description: "Workflow, architectural decisions, and constraints for the videsign repository"
---

# Workflow and Decision Ledger

This file houses Architectural Decision Records (ADRs) and serves as the mandatory first read for any agent initializing in this repository.

## ADR-007: Strict Surface Layering

**Context**: In complex multi-repo architectures, LLMs frequently hallucinate surface elevations, adding unwanted drop shadows or nested glassmorphism that degrades visual determinism.

**Decision**: The Nocturne Museum theme strictly enforces a flat surface architecture with functional glass overlays ONLY.

1.  **Base Surfaces**: All core surfaces must use a solid color token (e.g., `{colors.surface-background-primary-base}`). 
2.  **No Extraneous Shadows**: Standard components (cards, standard buttons, layout panels) must NOT use drop shadows.
3.  **Functional Glassmorphism**: Glass effects (e.g., `{effects.glass-functional-overlay-active}`) are reserved exclusively for:
    - Modals and dialogs
    - Floating contextual menus
    - Fixed navigation bars (when scrolled)

## ADR-008: Asset & Media Hosting

**Context**: Storing binary assets (PNG, JPG, SVG, video) directly within the GitHub repository leads to unacceptable repo bloat and slows down CI/CD pipelines.

**Decision**: 
1. Absolutely no binary assets or base64 embedded images may be stored in the GitHub repository.
2. All assets must be hosted externally on the Vidoxlabs OneDrive CDN.
3. AI Agents must strictly reference these assets using the predefined placeholder `{ONEDRIVE_ASSET_BASE}` followed by the relative path (e.g., `{ONEDRIVE_ASSET_BASE}/assets/logos/vidoxlabs/cube.png`).

## Negative Constraints against Boilerplate Generation

Agents MUST NOT generate the following boilerplate or generic patterns:

-   **Tailwind Defaults**: Do not use default Tailwind colors (e.g., `blue-500`, `red-400`). Always map to the `category-role-variant-state` matrix defined in `DESIGN.md`.
-   **Placeholder Images**: Do not use external placeholder image services (e.g., `via.placeholder.com`). If an image is required for a preview, use a local, solid color semantic placeholder div.
-   **Generic Copy**: Do not use "Lorem Ipsum". Use contextually relevant, realistic content that adheres to the Sentence case typography guardrail.

## Agent Instructions

1.  **Read First**: This file (`SKILL.md`) is your starting point.
2.  **Consult DESIGN.md**: For specific color codes and strict negative boundaries.
3.  **Inspect previews**: Look at the `preview/` directory for pure HTML implementations.
