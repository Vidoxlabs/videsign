/**
 * Nocturne Museum: Framework-agnostic Canvas 2D orbital capsule field engine.
 *
 * Drives a zero-gravity field of rounded chromatic capsule dashes in polar orbits
 * with radial breathing, smooth pointer repulsion wake, 6-state agentic modulation,
 * ResizeObserver backing-store sync (zero layout shift), IntersectionObserver and
 * visibility pausing, and deterministic static fallback for prefers-reduced-motion.
 *
 * Zero hardcoded colors: palette values are read dynamically from CSS custom
 * properties (--vi-orbital-surface, --vi-orbital-c1..c4) via getComputedStyle(host).
 */

export type AgentState = 'start' | 'send' | 'waiting' | 'streaming' | 'finish' | 'failure';

export const AGENT_STATES: readonly AgentState[] = [
  'start',
  'send',
  'waiting',
  'streaming',
  'finish',
  'failure',
] as const;

export interface StateScalars {
  readonly speedMult: number;
  readonly radialExpand: number;
  readonly alphaMult: number;
  readonly chromaSat: number;
  readonly pulseImpulse: number;
}

export const AGENT_STATE_MODULATION: Readonly<Record<AgentState, StateScalars>> = {
  start: { speedMult: 0.72, radialExpand: 1.0, alphaMult: 0.78, chromaSat: 0.94, pulseImpulse: 0 },
  send: { speedMult: 1.38, radialExpand: 1.18, alphaMult: 0.95, chromaSat: 1.08, pulseImpulse: 1.0 },
  waiting: { speedMult: 1.58, radialExpand: 0.84, alphaMult: 0.86, chromaSat: 0.98, pulseImpulse: 0 },
  streaming: { speedMult: 2.15, radialExpand: 1.12, alphaMult: 1.0, chromaSat: 1.18, pulseImpulse: 0 },
  finish: { speedMult: 0.56, radialExpand: 0.96, alphaMult: 0.74, chromaSat: 0.88, pulseImpulse: 0 },
  failure: { speedMult: 0.16, radialExpand: 0.92, alphaMult: 0.38, chromaSat: 0.45, pulseImpulse: 0 },
};

export interface OrbitalParticle {
  angle: number;
  radiusRatio: number;
  angularVelocity: number;
  length: number;
  thickness: number;
  colorIndex: number;
  phase: number;
  ox: number;
  oy: number;
  vx: number;
  vy: number;
}

export interface OrbitalPalette {
  surface: string;
  colors: readonly [string, string, string, string];
}

export interface OrbitalFieldOptions {
  host: HTMLElement;
  canvas: HTMLCanvasElement;
  seed?: number;
  maxDpr?: number;
  initialState?: AgentState;
  observeAttributes?: boolean;
}

const DEFAULT_SEED = 20261122;
const MAX_DT_SECONDS = 0.05;
const SMOOTHING_RATE = 4;
const MIN_PARTICLES = 45;
const MAX_PARTICLES = 220;
const AREA_PER_PARTICLE = 4800;

export function isAgentState(value: string | null | undefined): value is AgentState {
  return value !== null && value !== undefined && (AGENT_STATES as readonly string[]).includes(value);
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function computeParticleCount(width: number, height: number): number {
  const area = Math.max(0, width) * Math.max(0, height);
  return Math.round(clamp(area / AREA_PER_PARTICLE, MIN_PARTICLES, MAX_PARTICLES));
}

export function createSeededRng(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function smoothScalar(current: number, target: number, dt: number, rate = SMOOTHING_RATE): number {
  const factor = 1 - Math.exp(-Math.max(0, dt) * rate);
  return current + (target - current) * factor;
}

export function createParticles(count: number, seed = DEFAULT_SEED): OrbitalParticle[] {
  const rand = createSeededRng(seed);
  const particles: OrbitalParticle[] = [];
  for (let i = 0; i < count; i += 1) {
    const band = Math.sqrt(rand());
    const radiusRatio = 0.22 + band * 0.74;
    const baseSpeed = (0.09 + (1 - radiusRatio) * 0.14) * (0.7 + rand() * 0.6);
    const direction = rand() < 0.86 ? 1 : -1;
    particles.push({
      angle: rand() * Math.PI * 2,
      radiusRatio,
      angularVelocity: baseSpeed * direction,
      length: 5 + rand() * 11,
      thickness: 1.6 + rand() * 1.9,
      colorIndex: i % 4,
      phase: rand() * Math.PI * 2,
      ox: 0,
      oy: 0,
      vx: 0,
      vy: 0,
    });
  }
  return particles;
}

const OKLCH_RE = /oklch\(\s*([0-9.]+%?)\s+([0-9.]+)\s+([0-9.]+(?:deg|rad|turn)?)(?:\s*\/\s*([0-9.]+%?))?\s*\)/i;

/**
 * Modulates chroma saturation and alpha on an oklch() token string.
 * Non-oklch CSS values pass through unchanged so the canvas still honors the token.
 */
export function modulateOklchColor(tokenValue: string, chromaSat: number, alpha: number): string {
  const trimmed = tokenValue.trim();
  const match = trimmed.match(OKLCH_RE);
  if (!match) return trimmed;
  const lightness = match[1];
  const baseChroma = Number.parseFloat(match[2]);
  const hue = match[3];
  const baseAlpha = match[4]
    ? (match[4].endsWith('%') ? Number.parseFloat(match[4]) / 100 : Number.parseFloat(match[4]))
    : 1;
  const nextChroma = clamp(baseChroma * chromaSat, 0, 0.37).toFixed(4);
  const nextAlpha = clamp(baseAlpha * alpha, 0, 1).toFixed(3);
  return `oklch(${lightness} ${nextChroma} ${hue} / ${nextAlpha})`;
}

export function readPaletteFromHost(host: HTMLElement): OrbitalPalette {
  const computed = typeof getComputedStyle === 'function' ? getComputedStyle(host) : null;
  const readVar = (name: string): string => (computed ? computed.getPropertyValue(name).trim() : '');
  return {
    surface: readVar('--vi-orbital-surface'),
    colors: [
      readVar('--vi-orbital-c1'),
      readVar('--vi-orbital-c2'),
      readVar('--vi-orbital-c3'),
      readVar('--vi-orbital-c4'),
    ],
  };
}

interface ActiveScalars {
  speedMult: number;
  radialExpand: number;
  alphaMult: number;
  chromaSat: number;
}

export class OrbitalFieldEngine {
  private readonly host: HTMLElement;
  private readonly canvas: HTMLCanvasElement;
  private readonly seed: number;
  private readonly maxDpr: number;
  private readonly observeAttributes: boolean;

  private ctx: CanvasRenderingContext2D | null = null;
  private width = 0;
  private height = 0;
  private dpr = 1;
  private particles: OrbitalParticle[] = [];
  private palette: OrbitalPalette = { surface: '', colors: ['', '', '', ''] };

  private state: AgentState = 'start';
  private scalars: ActiveScalars = { ...AGENT_STATE_MODULATION.start };
  private pulseEnergy = 0;
  private elapsed = 0;

  private pointerActive = false;
  private pointerX = 0;
  private pointerY = 0;

  private mounted = false;
  private inViewport = true;
  private docVisible = true;
  private reducedMotion = false;
  private pausedByAttr = false;
  private rafId: number | null = null;
  private lastTimestamp = 0;

  private resizeObserver: ResizeObserver | null = null;
  private intersectionObserver: IntersectionObserver | null = null;
  private hostMutationObserver: MutationObserver | null = null;
  private rootMutationObserver: MutationObserver | null = null;
  private motionMediaQuery: MediaQueryList | null = null;

  private readonly onPointerMove = (event: PointerEvent): void => {
    const rect = this.host.getBoundingClientRect();
    this.pointerX = event.clientX - rect.left;
    this.pointerY = event.clientY - rect.top;
    this.pointerActive = true;
  };

  private readonly onPointerLeave = (): void => {
    this.pointerActive = false;
  };

  private readonly onVisibilityChange = (): void => {
    this.docVisible = typeof document === 'undefined' ? true : !document.hidden;
    this.syncLoop();
  };

  private readonly onReducedMotionChange = (event: MediaQueryListEvent): void => {
    this.reducedMotion = event.matches;
    if (this.reducedMotion) {
      this.stopLoop();
      this.renderStaticFrame();
    } else {
      this.syncLoop();
    }
  };

  private readonly tick = (timestamp: number): void => {
    this.rafId = null;
    if (!this.shouldAnimate()) return;

    const rawDt = this.lastTimestamp > 0 ? (timestamp - this.lastTimestamp) / 1000 : 1 / 60;
    this.lastTimestamp = timestamp;
    const dt = clamp(rawDt, 0, MAX_DT_SECONDS);

    this.step(dt);
    this.draw();
    this.rafId = requestAnimationFrame(this.tick);
  };

  constructor(options: OrbitalFieldOptions) {
    this.host = options.host;
    this.canvas = options.canvas;
    this.seed = options.seed ?? DEFAULT_SEED;
    this.maxDpr = options.maxDpr ?? 2;
    this.observeAttributes = options.observeAttributes ?? true;
    if (options.initialState && isAgentState(options.initialState)) {
      this.state = options.initialState;
      this.scalars = { ...AGENT_STATE_MODULATION[this.state] };
    }
  }

  public getState(): AgentState {
    return this.state;
  }

  public getParticleCount(): number {
    return this.particles.length;
  }

  public isRunning(): boolean {
    return this.rafId !== null;
  }

  public mount(): void {
    if (this.mounted) return;
    this.mounted = true;
    this.ctx = this.canvas.getContext('2d');

    const attrState = this.host.getAttribute('data-agent-state');
    if (isAgentState(attrState)) {
      this.state = attrState;
      this.scalars = { ...AGENT_STATE_MODULATION[this.state] };
    }

    this.readEnvironmentFlags();
    this.refreshPalette();
    this.resize();

    if (typeof ResizeObserver === 'function') {
      this.resizeObserver = new ResizeObserver(() => this.resize());
      this.resizeObserver.observe(this.host);
    }

    if (typeof IntersectionObserver === 'function') {
      this.intersectionObserver = new IntersectionObserver(
        (entries) => {
          const entry = entries[entries.length - 1];
          if (!entry) return;
          this.inViewport = entry.isIntersecting;
          this.syncLoop();
        },
        { threshold: 0.01 },
      );
      this.intersectionObserver.observe(this.host);
    }

    if (this.observeAttributes && typeof MutationObserver === 'function') {
      this.hostMutationObserver = new MutationObserver(() => this.syncFromAttributes());
      this.hostMutationObserver.observe(this.host, {
        attributes: true,
        attributeFilter: ['data-agent-state', 'data-theme', 'data-motion', 'class', 'style'],
      });
      if (typeof document !== 'undefined' && document.documentElement && document.documentElement !== this.host) {
        this.rootMutationObserver = new MutationObserver(() => this.syncFromAttributes());
        this.rootMutationObserver.observe(document.documentElement, {
          attributes: true,
          attributeFilter: ['data-theme', 'data-motion'],
        });
      }
    }

    this.host.addEventListener('pointermove', this.onPointerMove, { passive: true });
    this.host.addEventListener('pointerleave', this.onPointerLeave, { passive: true });

    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', this.onVisibilityChange);
    }

    if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
      this.motionMediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
      this.reducedMotion = this.motionMediaQuery.matches;
      this.motionMediaQuery.addEventListener('change', this.onReducedMotionChange);
    }

    if (this.reducedMotion || this.pausedByAttr) {
      this.renderStaticFrame();
    } else {
      this.draw();
      this.syncLoop();
    }
  }

  public resize(): void {
    const rect = this.host.getBoundingClientRect();
    const nextWidth = Math.max(0, rect.width || this.host.clientWidth || 0);
    const nextHeight = Math.max(0, rect.height || this.host.clientHeight || 0);
    const deviceRatio = typeof window !== 'undefined' && window.devicePixelRatio ? window.devicePixelRatio : 1;
    const nextDpr = clamp(deviceRatio, 1, this.maxDpr);

    if (nextWidth === 0 || nextHeight === 0) return;

    const backingW = Math.max(1, Math.round(nextWidth * nextDpr));
    const backingH = Math.max(1, Math.round(nextHeight * nextDpr));

    if (this.canvas.width !== backingW) this.canvas.width = backingW;
    if (this.canvas.height !== backingH) this.canvas.height = backingH;

    this.width = nextWidth;
    this.height = nextHeight;
    this.dpr = nextDpr;

    if (this.ctx) {
      this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    }

    const desiredCount = computeParticleCount(this.width, this.height);
    if (this.particles.length !== desiredCount) {
      this.particles = createParticles(desiredCount, this.seed);
    }

    if (this.reducedMotion || this.pausedByAttr) {
      this.renderStaticFrame();
    } else {
      this.draw();
    }
  }

  public setState(nextState: AgentState): void {
    if (!isAgentState(nextState)) return;
    const changed = nextState !== this.state;
    this.state = nextState;
    if (changed && nextState === 'send') {
      this.pulseEnergy = AGENT_STATE_MODULATION.send.pulseImpulse;
    }
    if (!this.shouldAnimate()) {
      this.scalars = { ...AGENT_STATE_MODULATION[this.state] };
      this.draw();
    }
  }

  public refreshPalette(): void {
    this.palette = readPaletteFromHost(this.host);
  }

  public syncEnvironment(): void {
    this.syncFromAttributes();
  }

  public renderStaticFrame(): void {
    if (this.width <= 0 || this.height <= 0) return;
    const count = computeParticleCount(this.width, this.height);
    this.particles = createParticles(count, this.seed);
    this.scalars = { ...AGENT_STATE_MODULATION[this.state] };
    this.pulseEnergy = 0;
    this.elapsed = 0;
    this.draw();
  }

  public destroy(): void {
    if (!this.mounted) return;
    this.mounted = false;
    this.stopLoop();

    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }
    if (this.intersectionObserver) {
      this.intersectionObserver.disconnect();
      this.intersectionObserver = null;
    }
    if (this.hostMutationObserver) {
      this.hostMutationObserver.disconnect();
      this.hostMutationObserver = null;
    }
    if (this.rootMutationObserver) {
      this.rootMutationObserver.disconnect();
      this.rootMutationObserver = null;
    }
    if (this.motionMediaQuery) {
      this.motionMediaQuery.removeEventListener('change', this.onReducedMotionChange);
      this.motionMediaQuery = null;
    }

    this.host.removeEventListener('pointermove', this.onPointerMove);
    this.host.removeEventListener('pointerleave', this.onPointerLeave);

    if (typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', this.onVisibilityChange);
    }

    this.particles = [];
    this.pointerActive = false;
    this.ctx = null;
  }

  private readEnvironmentFlags(): void {
    this.docVisible = typeof document === 'undefined' ? true : !document.hidden;
    const hostMotion = this.host.getAttribute('data-motion');
    const rootMotion = typeof document !== 'undefined' && document.documentElement
      ? document.documentElement.getAttribute('data-motion')
      : null;
    const isStopped = (val: string | null): boolean => val === 'paused' || val === 'reduced';
    // Host-level data-motion overrides document-level data-motion when explicitly set.
    this.pausedByAttr = hostMotion ? isStopped(hostMotion) : isStopped(rootMotion);
  }

  private syncFromAttributes(): void {
    const prevPaused = this.pausedByAttr;
    this.readEnvironmentFlags();
    this.refreshPalette();

    const attrState = this.host.getAttribute('data-agent-state');
    if (isAgentState(attrState) && attrState !== this.state) {
      this.setState(attrState);
    }

    if (this.reducedMotion || this.pausedByAttr) {
      this.stopLoop();
      if (!prevPaused || this.reducedMotion) {
        this.renderStaticFrame();
      } else {
        this.draw();
      }
    } else {
      this.syncLoop();
      this.draw();
    }
  }

  private shouldAnimate(): boolean {
    return this.mounted && this.inViewport && this.docVisible && !this.reducedMotion && !this.pausedByAttr;
  }

  private syncLoop(): void {
    if (this.shouldAnimate()) {
      if (this.rafId === null && typeof requestAnimationFrame === 'function') {
        this.lastTimestamp = 0;
        this.rafId = requestAnimationFrame(this.tick);
      }
    } else {
      this.stopLoop();
    }
  }

  private stopLoop(): void {
    if (this.rafId !== null && typeof cancelAnimationFrame === 'function') {
      cancelAnimationFrame(this.rafId);
    }
    this.rafId = null;
    this.lastTimestamp = 0;
  }

  private step(dt: number): void {
    const target = AGENT_STATE_MODULATION[this.state];
    this.scalars.speedMult = smoothScalar(this.scalars.speedMult, target.speedMult, dt, SMOOTHING_RATE);
    this.scalars.radialExpand = smoothScalar(this.scalars.radialExpand, target.radialExpand, dt, SMOOTHING_RATE);
    this.scalars.alphaMult = smoothScalar(this.scalars.alphaMult, target.alphaMult, dt, SMOOTHING_RATE);
    this.scalars.chromaSat = smoothScalar(this.scalars.chromaSat, target.chromaSat, dt, SMOOTHING_RATE);
    this.elapsed += dt;

    const pulsePush = this.pulseEnergy * 180;
    this.pulseEnergy *= Math.exp(-dt * 3.2);
    if (this.pulseEnergy < 0.002) this.pulseEnergy = 0;

    const cx = this.width * 0.5;
    const cy = this.height * 0.5;
    const maxRadius = Math.hypot(cx, cy) * 0.94;
    const pointerRadius = Math.min(this.width, this.height) * 0.26;
    const springK = 26;
    const damping = Math.exp(-dt * 6.4);

    for (let i = 0; i < this.particles.length; i += 1) {
      const p = this.particles[i];
      p.angle += p.angularVelocity * this.scalars.speedMult * dt;

      const breath = 1 + Math.sin(this.elapsed * 0.85 + p.phase) * 0.028;
      const orbitR = maxRadius * p.radiusRatio * this.scalars.radialExpand * breath;
      const cosA = Math.cos(p.angle);
      const sinA = Math.sin(p.angle);
      const bx = cx + cosA * orbitR;
      const by = cy + sinA * orbitR;

      if (pulsePush > 0.1) {
        p.vx += cosA * pulsePush * dt;
        p.vy += sinA * pulsePush * dt;
      }

      if (this.pointerActive && pointerRadius > 1) {
        const px = bx + p.ox - this.pointerX;
        const py = by + p.oy - this.pointerY;
        const dist = Math.hypot(px, py);
        if (dist > 0.5 && dist < pointerRadius) {
          const strength = (1 - dist / pointerRadius);
          const force = strength * strength * 420;
          p.vx += (px / dist) * force * dt;
          p.vy += (py / dist) * force * dt;
        }
      }

      // Spring-back toward equilibrium offset (0, 0).
      p.vx += -p.ox * springK * dt;
      p.vy += -p.oy * springK * dt;
      p.vx *= damping;
      p.vy *= damping;
      p.ox += p.vx * dt;
      p.oy += p.vy * dt;
    }
  }

  private draw(): void {
    const ctx = this.ctx;
    if (!ctx || this.width <= 0 || this.height <= 0) return;

    ctx.clearRect(0, 0, this.width, this.height);
    if (this.palette.surface) {
      ctx.fillStyle = this.palette.surface;
      ctx.fillRect(0, 0, this.width, this.height);
    }

    const cx = this.width * 0.5;
    const cy = this.height * 0.5;
    const maxRadius = Math.hypot(cx, cy) * 0.94;
    const aspectY = this.height / Math.max(1, this.width);
    const ellipseY = clamp(0.76 + aspectY * 0.24, 0.78, 1.0);

    ctx.lineCap = 'round';

    for (let i = 0; i < this.particles.length; i += 1) {
      const p = this.particles[i];
      const baseColor = this.palette.colors[p.colorIndex];
      if (!baseColor) continue;

      const breath = 1 + Math.sin(this.elapsed * 0.85 + p.phase) * 0.028;
      const orbitR = maxRadius * p.radiusRatio * this.scalars.radialExpand * breath;
      const cosA = Math.cos(p.angle);
      const sinA = Math.sin(p.angle);
      const x = cx + cosA * orbitR + p.ox;
      const y = cy + sinA * orbitR * ellipseY + p.oy;

      // Tangential velocity combined with spring-offset wake drives orientation and capsule length.
      const tangSpeed = orbitR * p.angularVelocity * this.scalars.speedMult;
      const velX = -sinA * tangSpeed + p.vx;
      const velY = cosA * tangSpeed * ellipseY + p.vy;
      const speedMag = Math.hypot(velX, velY);
      const heading = speedMag > 0.001 ? Math.atan2(velY, velX) : p.angle + Math.PI * 0.5;

      const radialFactor = 0.72 + p.radiusRatio * 0.58;
      const speedStretch = 1 + clamp(speedMag / 240, 0, 0.85);
      const capsuleLength = p.length * radialFactor * speedStretch;
      const halfLen = capsuleLength * 0.5;

      // Fade subtly toward the hero center so central typography stays serene.
      const centerClearance = clamp((p.radiusRatio - 0.18) / 0.34, 0.22, 1);
      const alpha = clamp(centerClearance * (0.45 + p.radiusRatio * 0.5) * this.scalars.alphaMult, 0.08, 0.96);

      ctx.strokeStyle = modulateOklchColor(baseColor, this.scalars.chromaSat, alpha);
      ctx.lineWidth = p.thickness;

      const dx = Math.cos(heading) * halfLen;
      const dy = Math.sin(heading) * halfLen;

      ctx.beginPath();
      ctx.moveTo(x - dx, y - dy);
      ctx.lineTo(x + dx, y + dy);
      ctx.stroke();
    }
  }
}
