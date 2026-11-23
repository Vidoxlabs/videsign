/**
 * Nocturne Museum: <vi-orbital-field> Web Component wrapper.
 *
 * Framework-agnostic custom element (works natively in HTML, Astro, React, and Svelte)
 * with Shadow DOM single-cell grid encapsulation, a default <slot> for hero content,
 * zero hardcoded hex/rgb values, and full lifecycle cleanup via OrbitalFieldEngine.
 */

import { OrbitalFieldEngine, isAgentState } from './orbital-field-engine.ts';
import type { AgentState } from './orbital-field-engine.ts';

const SHADOW_TEMPLATE = `
<style>
  :host {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    grid-template-rows: minmax(0, 1fr);
    inline-size: 100%;
    min-block-size: clamp(22rem, 48cqb, 32rem);
    container-type: inline-size;
    isolation: isolate;
    position: relative;
    overflow: hidden;
    background-color: var(--vi-orbital-surface, oklch(0.145 0.014 285));
    color: var(--vi-orbital-ink, oklch(0.967 0.003 286));
  }
  .vi-orbital-canvas {
    grid-area: 1 / 1;
    position: absolute;
    inset: 0;
    inline-size: 100%;
    block-size: 100%;
    display: block;
    pointer-events: none;
    z-index: 0;
  }
  .vi-orbital-scrim {
    grid-area: 1 / 1;
    position: absolute;
    inset: 0;
    inline-size: 100%;
    block-size: 100%;
    pointer-events: none;
    z-index: 1;
    background: radial-gradient(
      ellipse 64% 62% at 50% 50%,
      var(--vi-orbital-scrim-center, oklch(0.145 0.014 285 / 0.88)) 0%,
      var(--vi-orbital-scrim-mid, oklch(0.145 0.014 285 / 0.54)) 52%,
      var(--vi-orbital-scrim-edge, oklch(0.145 0.014 285 / 0)) 100%
    );
  }
  .vi-orbital-content {
    grid-area: 1 / 1;
    z-index: 2;
    display: grid;
    place-items: center;
    align-content: center;
    min-inline-size: 0;
    padding-block: clamp(2rem, 8cqi, 5rem);
    padding-inline: clamp(1.25rem, 6cqi, 4rem);
  }
  ::slotted(:focus-visible) {
    outline: 0.125rem solid var(--vi-orbital-focus, oklch(0.606 0.25 292.7));
    outline-offset: 0.125rem;
  }
  @container (max-width: 36rem) {
    .vi-orbital-scrim {
      background: radial-gradient(
        ellipse 84% 78% at 50% 50%,
        var(--vi-orbital-scrim-center, oklch(0.145 0.014 285 / 0.88)) 0%,
        var(--vi-orbital-scrim-mid, oklch(0.145 0.014 285 / 0.54)) 62%,
        var(--vi-orbital-scrim-edge, oklch(0.145 0.014 285 / 0)) 100%
      );
    }
    .vi-orbital-content {
      padding-block: clamp(1.75rem, 7cqi, 3rem);
      padding-inline: clamp(1rem, 5cqi, 2rem);
    }
  }
  @media (forced-colors: active) {
    :host {
      background-color: Canvas;
      color: CanvasText;
    }
    .vi-orbital-canvas,
    .vi-orbital-scrim {
      display: none;
    }
  }
</style>
<canvas class="vi-orbital-canvas" aria-hidden="true"></canvas>
<div class="vi-orbital-scrim" aria-hidden="true"></div>
<div class="vi-orbital-content"><slot></slot></div>
`;

const BaseElement = (typeof HTMLElement === 'function' ? HTMLElement : class {}) as typeof HTMLElement;

export class ViOrbitalFieldElement extends BaseElement {
  public static readonly observedAttributes: readonly string[] = ['data-agent-state', 'data-theme', 'data-motion'];

  private engine: OrbitalFieldEngine | null = null;
  private canvasEl: HTMLCanvasElement | null = null;

  constructor() {
    super();
    if (typeof this.attachShadow === 'function') {
      const root = this.attachShadow({ mode: 'open' });
      root.innerHTML = SHADOW_TEMPLATE;
      this.canvasEl = root.querySelector('canvas');
    }
  }

  public connectedCallback(): void {
    if (!this.canvasEl) return;
    if (!this.classList.contains('vi-orbital-host')) {
      this.classList.add('vi-orbital-host');
    }
    const seedAttr = this.getAttribute('data-seed');
    const parsedSeed = seedAttr ? Number.parseInt(seedAttr, 10) : Number.NaN;
    const rawState = this.getAttribute('data-agent-state');
    const initialState: AgentState = isAgentState(rawState) ? rawState : 'start';

    this.engine = new OrbitalFieldEngine({
      host: this,
      canvas: this.canvasEl,
      seed: Number.isFinite(parsedSeed) ? parsedSeed : undefined,
      initialState,
    });
    this.engine.mount();
  }

  public attributeChangedCallback(name: string, _oldValue: string | null, newValue: string | null): void {
    if (!this.engine) return;
    if (name === 'data-agent-state' && isAgentState(newValue)) {
      this.engine.setState(newValue);
    } else if (name === 'data-theme') {
      this.engine.refreshPalette();
    } else if (name === 'data-motion') {
      this.engine.syncEnvironment();
    }
  }

  public disconnectedCallback(): void {
    if (this.engine) {
      this.engine.destroy();
      this.engine = null;
    }
  }

  public setAgentState(state: AgentState): void {
    if (!isAgentState(state)) return;
    this.setAttribute('data-agent-state', state);
    if (this.engine) {
      this.engine.setState(state);
    }
  }
}

export function defineViOrbitalField(tagName = 'vi-orbital-field'): void {
  if (typeof customElements !== 'undefined' && !customElements.get(tagName)) {
    customElements.define(tagName, ViOrbitalFieldElement);
  }
}

defineViOrbitalField();
