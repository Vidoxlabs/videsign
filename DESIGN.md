---
# NOCTURNE MUSEUM: SEMANTIC TOKEN MATRIX
# Format: category-role-variant-state
colors:
  surface-background-primary-base: "#0A0A0E"
  surface-background-secondary-base: "#12121A"
  surface-background-tertiary-base: "#1C1C24"
  surface-accent-violet-base: "#8B5CF6"
  surface-accent-violet-hover: "#6D28D9"
  surface-accent-violet-active: "#5B21B6"
# ADR-011 item 10 is Accepted 2026-10-28: CTA fills and focus rings are #8B5CF6. Hover #6D28D9 (violet-700) and active #5B21B6 (violet-800) are darker steps of #8B5CF6, Accepted 2026-10-28. Item 7 is Accepted 2026-10-28. Items 1-6, 8 and 9 stay Proposed.
  text-content-primary-base: "#FFFFFF"
  text-content-secondary-base: "#A1A1AA"
  border-separator-primary-base: "#27272A"
  text-content-on-accent-base: "#FFFFFF"
  surface-background-primary-light: "#F8F9FA"
  surface-background-secondary-light: "#FFFFFF"
  surface-background-tertiary-light: "#F1F3F5"
  text-content-primary-light: "#0F172A"
  text-content-secondary-light: "#475569"
  border-separator-primary-light: "#CBD5E1"
  border-graph-line-base: "#80808A"
  border-graph-line-light: "#64748B"
  status-indicator-success-base: "#10B981"
  status-indicator-warning-base: "#F59E0B"
  status-indicator-error-base: "#F43F5E"
  status-indicator-info-base: "#06B6D4"
  persona-accent-violet-base: "#8B5CF6"
  persona-accent-wisteria-base: "#B4A7F2"
  persona-accent-xylia-base: "#D92B3A"
  persona-accent-yarrow-base: "#F0A020"
  persona-accent-zinnia-base: "#E13D9E"

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
  glass-crystal-solid-light: "#FFFFFF"
  glass-crystal-rim-light: "rgba(15, 23, 42, 0.24)"
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
  layout-width-conversation-base: "27.5rem"
  layout-width-content-base: "80rem"
  icon-xs-base: "1rem"
  icon-sm-base: "1.5rem"
  icon-md-base: "2rem"
  icon-lg-base: "2.75rem"
  indicator-dot-base: "0.5rem"
  indicator-mark-base: "0.75rem"
  indicator-brand-base: "1.75rem"
  indicator-fivebar-base: "3px"

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
  transition-duration-ambient-drift-base: "32s"
  transition-duration-ambient-pulse-base: "6s"
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
> - Persona identity accents are locked and equal the canon signatures (ratified 2026-11-03, ADR-010 §2 + ADR-011 item 9). Violet is always `{colors.persona-accent-violet-base}` (#8B5CF6), Wisteria is always `{colors.persona-accent-wisteria-base}` (#B4A7F2), Xylia is always `{colors.persona-accent-xylia-base}` (#D92B3A), Yarrow is always `{colors.persona-accent-yarrow-base}` (#F0A020), and Zinnia is always `{colors.persona-accent-zinnia-base}` (#E13D9E). The retired UI-only teal/rose/lavender persona values are gone from the matrix.
> - The matrix now equals the canon signatures in force (ratified 2026-11-03). Status error `#F43F5E` and status warning `#F59E0B` remain status tokens with their own roles — neither shares a hex with a persona accent anymore, so a shared-hex collision no longer exists.
> - Persona accents are identity markers only. They never substitute for status indicators; status semantics always use status tokens. Since the 2026-11-03 re-sync no persona accent shares a hex with a status token (warning `#F59E0B`, error `#F43F5E` keep their exclusive role tokens).
> - The legacy UI-only persona values (`#A78BFA`, `#2DD4BF`, `#F59E0B`-as-persona, `#F43F5E`-as-persona) are being retired from every consumer as the three product overlays retire at their next token sync.
> - ADR-011 item 10 is Accepted 2026-10-28: CTA fills and focus rings are #8B5CF6 (`{colors.surface-accent-violet-base}`). Items 1-6, 8 and 9 stay Proposed. Hover #6D28D9 (violet-700) and active #5B21B6 (violet-800) are darker steps of #8B5CF6, Accepted 2026-10-28. Item 7 is Accepted 2026-10-28: white on #8B5CF6 is 4.23:1. CTA labels are large: bold xl or larger, or 2xl or larger. No normal-size label of any colour on `#8B5CF6`. `{effects.ambient-glow-violet-base}` stays `rgba(124, 58, 237, 0.30)`.
> - **Accent text lives on the primary surface only.** Measured: Violet `{colors.persona-accent-violet-base}` is 4.67:1 on `{colors.surface-background-primary-base}` but 4.40:1 on secondary and 4.00:1 on tertiary, so it fails AA as small text on both. On secondary and tertiary surfaces a persona accent appears only as a non-text indicator (dot, bar, ring, 3:1). Wisteria, Xylia, Yarrow and Zinnia pass 4.5:1 on all three surfaces (Zinnia on tertiary is marginal at 4.61:1).
> - Never invent persona hex values locally. New persona states (hover, active) or any new persona color must be added to the `colors` matrix in this file first, then referenced.

> [!IMPORTANT]
>
> ### Persona character assets
>
> - Character art for Violet, Wisteria, Xylia, Yarrow and Zinnia follows ADR-010. Character colors come from `canon/vwxyz/palette.json`. The `colors` matrix in this file is unchanged.
> - Persona images are never stored in the repository (ADR-002). They will be served at `{ASSET_BASE}/vi/{vi}/{type}/{file}` (planned, ADR-010).
> - Every persona image has alt text naming the persona and the expression or pose, for example `alt="Violet, confused"`.

> [!IMPORTANT]
>
> ### Hero billboard scale (ADR-005)
>
> - `typography-fluid-hero-base` (max 5.25rem, emitted `--vi-typography-typography-fluid-hero-base`) is the sanctioned primary-landing-hero scale — one usage per page, page title only.
> - The 3.5rem ceiling stays binding for `fluid-display`, `fluid-h1`–`fluid-h3` and static `4xl`/`5xl`. Section headings, cards, and prose never consume the hero token.

> [!IMPORTANT]
>
> ### Stage backdrop (ADR-013)
>
> - Render it with `lib/stage.js` (`renderStageSvg({ variant })`) and style it with `dist/stage.css`. Never redraw the arc, the ring or the planes by hand, and never change a layer's alpha outside the module's table.
> - The `ambient` variant sits behind reading text at 0.26 (0.16 below 768px). `stageContrastReport` proves every layer keeps secondary text at 4.5:1 over the page field, broad glows counted twice; `maxSafeStageOpacity` gives the ceiling. Opaque surfaces cover the stage, so text on a card never meets it.
> - The `hero` variant is full strength. Copy over it sits on a scrim of the field colour at 72% (`STAGE_TEXT_SCRIM`).
> - It is decorative (`aria-hidden="true"`), carries no inline style, stops under `prefers-reduced-motion`, under `data-motion="paused"` on the root element, and is not painted under `forced-colors: active`.
> - Reference: `preview/stage-backdrop.html` (generated by `npm run stage:fragment`).

> [!IMPORTANT]
>
> ### Five-bar rule (ADR-013)
>
> - Five hard segments, one signature colour each, in canon order: Violet, Wisteria, Xylia, Yarrow, Zinnia. Height `{size.indicator-fivebar-base}` (3px).
> - Each segment is its own fill. Never a blended gradient, never fewer than five segments, never a reordered set.
> - Used under the wordmark or a hero headline, along the top of bezelled fact panels, and along the foot of the chat launcher. Decorative: `aria-hidden="true"`.
> - Reference: `preview/five-bar-rule.html`.

> [!IMPORTANT]
>
> ### Chat dock (ADR-013)
>
> - A launcher fixed bottom right opens a non-modal dialog (`role="dialog"`, `aria-modal="false"`, labelled by its title). Escape closes it and returns focus to the launcher.
> - The launcher is at least `{size.action-min-default}`, carries a label, and shows a tracked brand file or the five seat dots, never a drawn or approximated mark. A five-bar rule runs along its foot.
> - The dialog is a glass shell around a core (ADR-006). Inside: a persona switcher of all five seats (`aria-pressed`), a conversation log (`role="log"`, `aria-live="polite"`, `aria-relevant="additions"`, `aria-label`), action chips, a composer (Enter sends, Shift+Enter adds a line) and a one-line disclosure of how answers are produced. What those parts look like is set by the conversation surface (ADR-014).
> - Seat names stay in `{colors.text-content-primary-base}`. Seat colours mark dots, rings and bars only. A seat's message carries a five-segment marker with that seat lit, so no seat colour appears alone.
> - The log follows new messages only while the reader is at the bottom; it never scrolls a reader away from what they are reading.
> - Reference: `preview/chat-dock.html`.

> [!IMPORTANT]
>
> ### Conversation surface (ADR-014)
>
> The standard for every Vidoxlabs AI chat: the chat dock, a full-page chat and native product panels.
>
> - **Chrome budget.** At rest the surface shows one header row, the conversation, one composer field and one disclosure line. Anything else appears when asked for, or when it becomes true.
> - **Header.** One row, as tall as the avatar (the seat's sprite, or its crest where no art is approved). Beside the avatar a first line holds the seat's name in `{colors.text-content-primary-base}`, its role in a mono micro-label, at most one overflow menu and close; a second line holds the seat dots. No product title, model badge or state label in view; the accessible name and a visually hidden live text carry them. A docked surface is `{size.layout-width-conversation-base}` wide; on a narrower surface the role is dropped and nothing wraps.
> - **Seat dots.** Five dots in canon order, each a button with `aria-pressed` and the seat's name as its accessible name. Each hit area is at least `{size.action-min-default}` in both dimensions. The pressed seat carries a ring in its own colour. The switcher prints no names.
> - **Messages.** A guide's reply is text on the core, no card. The visitor's turn is the only bubble, on `{colors.surface-background-tertiary-base}`, aligned to the end. Parts of a reply are separated by the hairline, never boxed.
> - **Speaker marker.** The five-segment marker and seat name head a reply only when the speaker changes, and on the first reply.
> - **Message actions.** Shown on hover and on keyboard focus; on the latest reply where hover is unavailable.
> - **Provenance by exception.** A reply is labelled only when it leaves the default path.
> - **Starters and follow-ups.** At most four starters on an empty conversation, from one source; they leave after the first turn. At most three follow-up chips, on the latest reply only.
> - **Composer.** One bordered field holding the text area and send. Dictation, where offered, sits inside the field and shows only while it is empty. Enter sends, Shift+Enter adds a line.
> - **Disclosure.** One line at rest; the detail expands in place. Where typed text is sent to a service, the full statement stands until the visitor's first turn, then rests at one line.
> - **States.** Idle, composing, thinking, streaming, settled, failed. Thinking is the five-segment pulse; no spinner, no skeleton bubble.
> - **Motion.** Opens on `{transition.transition-duration-slow-base}` with `{transition.transition-easing-spring-base}`; a turn enters on `{transition.transition-duration-normal-base}`; sprites cross-fade. The thinking pulse is the only loop.
> - Reference: `preview/conversation-surface.html` (empty state) and `preview/chat-dock.html` (in progress).

> [!IMPORTANT]
>
> ### Explorable instrument (ADR-015)
>
> The standard for interactive panels inside articles and proofs.
>
> - **Every control has a consequence.** Operating a control changes the readout or the diagram, or the control is removed.
> - **Claim and task.** One line says what the instrument shows; one line says what to try.
> - **Anatomy.** One solid panel on `{colors.surface-background-secondary-base}`: a diagram that reads out state, the controls, and a receipt. Never glass.
> - **Controls.** A boolean is a switch row with the whole row as the hit area at `{size.action-min-default}`. A number is a labelled range with its value in tabular mono figures. A choice among presets is one segmented control. No bordered fieldset and no default checkbox.
> - **Diagram as readout.** Lines use `{colors.border-graph-line-base}`. The current state is the accent outline; a blocked state uses `{colors.status-indicator-error-base}` with a text label. Labels never overlap an edge or another label.
> - **Receipt as ledger.** Hairline-separated rows of a mono micro-label and a value, in a polite live region.
> - **Synthetic by statement.** An instrument that runs on fixtures says so once.
> - **Seat colours.** Only where the five seats appear together, as a dot, ring or bar.
> - Reference: `preview/instrument.html`.

## Continuous Interaction Standards

Consuming products present sovereign personas and evidence inside static-edge constraints (static builds, zero runtime bindings, strict CSP `script-src 'self'`). Continuity therefore comes from browser-native primitives, never client-framework hydration.

- **Motion vocabulary**: durations come only from `{transition.transition-duration-fast-base}` (150ms), `{transition.transition-duration-normal-base}` (200ms), `{transition.transition-duration-slow-base}` (300ms) and, for entrances only, `{transition.transition-duration-entrance-base}` (500ms: scroll reveals, opening the lens, highlighting the field). Easing is `{transition.transition-easing-standard-base}` by default and `{transition.transition-easing-spring-base}` for lens and sheet motion. Animated properties are `transform` and `opacity` only; blur is never animated. Zero bounce: neither easing overshoots (ADR-008). Ambient loops are the one exception to the interaction durations: the stage backdrop drifts on `{transition.transition-duration-ambient-drift-base}` (32s) and breathes on `{transition.transition-duration-ambient-pulse-base}` (6s), transform and opacity only, and every product ships a visible pause control for them (WCAG 2.2.2, ADR-013).
- **View transitions**: document-level navigation cross-fades via the View Transitions API with a 200ms fade (`{transition.transition-easing-standard-base}`). Non-supporting browsers perform an instant swap. Shared shell elements (header, navigation) persist across navigation.
- **Scroll-driven motion**: editorial surfaces reveal via `animation-timeline: view()` (entry 10% to cover 30%), opacity and `transform` only, zero JavaScript. Unsupported browsers see the completed static layout.
- **Discrete panel transitions**: drawers, filters, and metadata panels animate entry and exit with `@starting-style` and `transition-behavior: allow-discrete` instead of JavaScript style manipulation. Unsupported browsers snap instantly.
- **Top-layer navigation**: mobile and contextual menus use the HTML Popover API (`popover` attribute) for native top-layer, light-dismiss, and Escape handling — never z-index stacking hacks.
- **Reduced motion obedience**: every motion declaration sits under the consuming product's global `prefers-reduced-motion: reduce` override — view-transition animations none, scroll timelines inert, discrete transitions instant.
- **Fail-closed states**: on network or schema failure, panels never display speculative, simulated, or cached numbers. Affected panels transition to an explicit fail-closed state that locks interactive controls and displays the failure receipt directly. Loading skeletons use `{colors.surface-background-tertiary-base}` geometry matched to the resolved layout so data arrival causes zero layout shift.
- **Script posture**: continuity motion is pure CSS; behavioral scripts in consuming products are external, CSP-safe, and idempotent (see SKILL.md ADR-003).

## Crystal glass (ADR-006)

Crystal glass is the one sanctioned glass material for public product surfaces. It is near-clear, with a bright rim and a top highlight; it dims and softens what is behind it instead of tinting it milky. Tokens: `{effects.glass-crystal-surface-base}`, `{effects.glass-crystal-rim-base}`, `{effects.glass-crystal-highlight-base}`, `{effects.glass-crystal-sheen-base}`, `{effects.glass-crystal-shadow-base}`, `{effects.glass-crystal-backdrop-base}`, `{effects.glass-crystal-core-base}`, and the solid fallback `{effects.glass-crystal-solid-base}`. The generator emits them as `--vi-effects-*` custom properties and as a generated `dist/glass.css` with literal values, because Safari does not resolve custom properties inside `-webkit-backdrop-filter`.

- **Scope.** Glass marks controls and lenses: the floating island navigation, overlays and popovers, the question bar, the persona switcher, the evidence lens over a field, and the chat dock dialog (an overlay, ADR-013). Never on paragraphs, cards or section containers. Content stays solid and readable; chat text sits on the dock's core scrim and the visitor's turn is a solid bubble (ADR-014).
- **Limits.** At most three glass layers per viewport. Never glass on glass (the lens core is a scrim, not a second blur). Never backdrop blur on scrolling containers. Never animate or transition the blur.
- **Double bezel.** Glass shells use the outer radius `{spacing.layout-radius-glass-base}` (20px), `{spacing.layout-padding-bezel-base}` (6px) padding, and an inner core at `{spacing.layout-radius-standard-base}` (14px): 20 = 6 + 14, concentric. The rim is an inset box-shadow (not a border box) so the arithmetic holds. Pill shapes use `vi-glass-shell--pill` / `vi-glass-core--pill` so plain-CSS consumers get the full radius without relying on a later Tailwind utility.
- **Composition.** Clear glass floats over the field, imagery and the ambient layer, never directly over body copy. The page background is the stage backdrop (ADR-013). The glow tokens (`{effects.ambient-glow-violet-base}`, `{effects.ambient-glow-teal-base}`) and the dot token (`{effects.ambient-dots-base}`) stay for existing consumers; the dot grid is retired for new page backgrounds. A headline may pass beneath the island while scrolling.
- **Legibility floor.** Text on glass reaches 4.5:1 against the worst backdrop it can pass over, verified by pixel-sampling screenshots, not by the prettiest state. Reading text in the lens sits on the core scrim, which clears 4.5:1 over a fully white backdrop even if the engine does not render the backdrop filter at all (analytic bound in `test/tokens.test.js`).
- **Text-bearing controls are shell + core.** Any glass control that carries text and can pass over bright imagery (the island navigation, the question bar, the persona switcher) is a `vi-glass-shell` around a `vi-glass-core`, not a single `vi-glass` layer. `brightness(0.5)` turns white into mid grey, so one translucent layer cannot reach 4.5:1 over a white screenshot; the core scrim can. A single `vi-glass` layer is reserved for glass that carries no text.
- **Ambient field.** Whatever ambient layer a product paints sits behind free page text as well as behind glass, so its peak values are bounded by the legibility floor. For the legacy glows and dots, secondary text clears 4.5:1 over the strongest glow with a dot on top (analytic bound in `test/tokens.test.js`). For the stage backdrop, the consuming product computes the bound from its own layer alphas (ADR-013 item 1).
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
> - **Ban overclaim copy**: Preview and fixture copy must not use the words `verified`, `signed`, or the phrase `Authorize action` — those are reserved for real evidence claims, not chrome.
> - **BAN Title Case**: The generation of Title Case text is comprehensively banned across all UI components.
> - **Family Rules**: Use `{typography.typography-family-mono-base}` (Geist Mono) for nav, labels, and status. Use `{typography.typography-family-sans-base}` (Geist) for section titles and descriptions (ADR-007).
> - **Weight, tracking, leading**: use only the typography weight/tracking/leading tokens (`font-typography-weight-*`, `tracking-typography-tracking-*`, `leading-typography-leading-*`). Ban raw `font-medium` / `font-bold` / `tracking-*` / `leading-*`.

> [!CAUTION]
>
> ### 2. Imagery & Icons
>
> - **BAN Emojis**: Explicitly forbid the use of decorative emojis anywhere in the markup.
> - **Asset Storage Rule**: Absolutely no binary assets (PNG, JPG, SVG, video) may be stored in the repository, with one proposed exception: text-only `brand/**/*.svg` masters at or under 8 KB (ADR-011, awaiting ratification). All other assets must be referenced via the `{ASSET_BASE}` placeholder (e.g. `<img src="{ASSET_BASE}/brand/brand_mark_header_v008.svg" />`). `cube.png` paths are deprecated. Consuming repos resolve `{ASSET_BASE}` at build time to their CDN endpoint.

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
> - **One material.** Crystal glass (ADR-006) is the only glass. It appears only on controls and lenses: island navigation, overlays and popovers, the question bar, the persona switcher, the evidence lens and the chat dock dialog (ADR-013). Sidebars, cards, section containers and paragraphs stay solid opaque surfaces.
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
| Aspect       | `aspect-video`                               | Media and backdrop frames (stage backdrop) |
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
> | Persona Violet `#8B5CF6` | 4.67:1 (AA text) | **4.40:1 (indicator only ≥3:1)** | **4.00:1 (indicator only ≥3:1)** |
> | Persona Wisteria `#B4A7F2` | 9.18:1 | 8.65:1 | 7.86:1 (AA text on all three dark surfaces; indicator only on the light theme) |
> | Persona Xylia `#D92B3A` | **4.10:1 (never text — 4.5 fails)** | **3.87:1 (indicator only ≥3:1)** | **3.51:1 (indicator only ≥3:1)** |
> | Persona Yarrow `#F0A020` | 9.18:1 | 8.65:1 | 7.86:1 (AA text on all three dark surfaces; indicator only on the light theme) |
> | Persona Zinnia `#E13D9E` | 5.05:1 (AA text) | 4.76:1 (AA text) | **4.32:1 (indicator only ≥3:1)** |
> | Brand accent `#8B5CF6` (CTA fill and focus; same hex as persona violet) | 4.67:1 | **4.40:1 (fails AA text)** | **4.00:1 (fails AA text)** |
> | White on brand accent fill | 4.23:1 (fails 4.5:1 for normal text; hover 7.10:1, active 8.98:1) | | |
>
> - Secondary text on tertiary is 6.60:1; the earlier warning that it drops below AA was wrong.
> - Per the measured table above: Violet persona-accent text stays on the primary surface; on secondary and tertiary it is an indicator only. Xylia is never text on any surface and never appears alone. Zinnia drops to indicator-only on tertiary surfaces.
> - Text on crystal glass is measured over the worst backdrop in the catalog, not from these static pairs (see Crystal glass).

> [!IMPORTANT]
>
> ### Non-text contrast (WCAG 1.4.11, ADR-013)
>
> Lines and outlines that carry meaning in diagrams (edges, node outlines, axes, map links) need 3:1 against their surface. The hairline separator does not reach it, so it is for layout separators only. Measured (2026-11-06):
>
> | Line | on primary | on secondary | on tertiary |
> | --- | --- | --- | --- |
> | `{colors.border-graph-line-base}` `#80808A` (dark) | 5.06:1 | 4.77:1 | 4.33:1 |
> | `{colors.border-separator-primary-base}` `#27272A` (hairline) | **1.33:1 (separators only)** | **1.25:1** | **1.14:1** |
> | `{colors.border-graph-line-light}` `#64748B` (light theme) | 4.51:1 | 4.76:1 | 4.28:1 |
> | `{colors.border-separator-primary-light}` `#CBD5E1` (light hairline) | **1.41:1 (separators only)** | **1.48:1** | **1.33:1** |
>
> An SVG that contains links is `role="group"` with a label, not `role="img"`, which hides its links from assistive technology.

> [!IMPORTANT]
>
> ### Motion that loops (WCAG 2.2.2, ADR-013)
>
> Motion that starts on its own, lasts more than five seconds and runs beside content (the stage backdrop, any ambient loop) needs a visible control that pauses it. The control is a real button with `aria-pressed`, it stops every loop on the page, and it holds for the visit. `prefers-reduced-motion: reduce` stops the same loops without the control.
