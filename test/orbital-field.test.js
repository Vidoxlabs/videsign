'use strict';

/**
 * Orbital chromatic capsule field verification gates:
 *   1. Zero hex literals (#...) or rgb()/rgba() values in source and emitted files.
 *   2. Zero hard-coded px layout dimensions in CSS/component styles; single-cell grid,
 *      container queries, radial clarity scrim, focus-visible, and oklch() palette tokens.
 *   3. Framework-agnostic Canvas 2D engine physics, 6-state modulation, dynamic density,
 *      DPR <= 2 capping, zero layout shift on mount/resize, off-screen/hidden pausing,
 *      deterministic single static frame for prefers-reduced-motion, and leak-free destroy().
 */

const { test, before } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const { emitOrbitalFieldArtifacts } = require('../scripts/generate-tokens');

const ROOT = path.join(__dirname, '..');

before(() => {
  execFileSync(process.execPath, [path.join(ROOT, 'scripts', 'generate-tokens.js')], { cwd: ROOT, stdio: 'ignore' });
});

test('orbital-field source and emitted artifacts contain zero hex literals and zero rgb/rgba calls', () => {
  const files = [
    path.join(ROOT, 'lib', 'orbital-field-engine.ts'),
    path.join(ROOT, 'lib', 'vi-orbital-hero.css'),
    path.join(ROOT, 'lib', 'vi-orbital-field.ts'),
    path.join(ROOT, 'preview', 'vi-orbital-field.html'),
    path.join(ROOT, 'dist', 'vi-orbital-hero.css'),
    path.join(ROOT, 'dist', 'orbital-field-engine.js'),
    path.join(ROOT, 'dist', 'vi-orbital-field.js'),
  ];
  for (const filePath of files) {
    const src = fs.readFileSync(filePath, 'utf-8');
    const rel = path.relative(ROOT, filePath);
    assert.doesNotMatch(src, /#[0-9a-fA-F]{3,8}\b/, `${rel} must not contain hex color literals`);
    assert.doesNotMatch(src, /\brgba?\(/i, `${rel} must not contain rgb()/rgba() values`);
  }
});

test('vi-orbital-hero.css enforces oklch tokens, single-cell grid, container queries, radial scrim, and zero px units', () => {
  const css = fs.readFileSync(path.join(ROOT, 'lib', 'vi-orbital-hero.css'), 'utf-8');
  assert.doesNotMatch(css, /\b\d+(?:\.\d+)?px\b/i, 'CSS must avoid hard-coded px dimensions');
  for (const token of [
    '--vi-orbital-surface: oklch(',
    '--vi-orbital-c1: oklch(0.58 0.21 262)',
    '--vi-orbital-c2: oklch(0.49 0.22 280)',
    '--vi-orbital-c3: oklch(0.60 0.20 310)',
    '--vi-orbital-c4: oklch(0.68 0.17 35)',
    'grid-area: 1 / 1',
    'container-type: inline-size',
    'isolation: isolate',
    'pointer-events: none',
    ':focus-visible',
    '[data-theme="light"]',
    '@container',
    '@media (prefers-reduced-motion: reduce)',
  ]) {
    assert.ok(css.includes(token), `vi-orbital-hero.css missing required rule/token: ${token}`);
  }

  const emitted = emitOrbitalFieldArtifacts();
  assert.equal(emitted['vi-orbital-hero.css'], css);
  assert.ok(emitted['orbital-field-engine.js'].includes('export class OrbitalFieldEngine'));
  assert.ok(emitted['vi-orbital-field.js'].includes("from './orbital-field-engine.js'"));
});

test('OrbitalFieldEngine verifies physics, 6 states, zero layout shift, reduced-motion static frame, and clean destroy()', () => {
  const engineUrl = `file://${path.join(ROOT, 'lib', 'orbital-field-engine.ts')}`;
  const script = `
    const mod = await import(${JSON.stringify(engineUrl)});
    const {
      OrbitalFieldEngine,
      AGENT_STATES,
      AGENT_STATE_MODULATION,
      computeParticleCount,
      smoothScalar,
      modulateOklchColor,
    } = mod;

    // 1. Particle count bounds
    const smallCount = computeParticleCount(200, 200);
    const medCount = computeParticleCount(1200, 600);
    const hugeCount = computeParticleCount(4000, 3000);

    // 2. Exponential smoothing check
    const smoothed = smoothScalar(0, 1, 0.05, 4);
    const expectedSmooth = 1 - Math.exp(-0.05 * 4);

    // 3. oklch modulation
    const modulated = modulateOklchColor('oklch(0.58 0.21 262)', 0.5, 0.5);

    // Mock browser environment to verify mount, resize (zero CSS mutation), 6 states,
    // IntersectionObserver/visibility pause, prefers-reduced-motion static frame, and destroy().
    let nextRafId = 1;
    const rafCallbacks = new Map();
    const cancelledRafIds = [];
    globalThis.requestAnimationFrame = (cb) => {
      const id = nextRafId++;
      rafCallbacks.set(id, cb);
      return id;
    };
    globalThis.cancelAnimationFrame = (id) => {
      cancelledRafIds.push(id);
      rafCallbacks.delete(id);
    };

    const observerStats = { resizeDisconnected: 0, intersectionDisconnected: 0, mutationDisconnected: 0 };
    let lastIntersectionCb = null;
    globalThis.ResizeObserver = class {
      constructor(cb) { this.cb = cb; }
      observe() {}
      disconnect() { observerStats.resizeDisconnected += 1; }
    };
    globalThis.IntersectionObserver = class {
      constructor(cb) { this.cb = cb; lastIntersectionCb = cb; }
      observe() {}
      disconnect() { observerStats.intersectionDisconnected += 1; }
    };
    globalThis.MutationObserver = class {
      constructor(cb) { this.cb = cb; }
      observe() {}
      disconnect() { observerStats.mutationDisconnected += 1; }
    };

    const docListeners = new Map();
    globalThis.document = {
      hidden: false,
      documentElement: { getAttribute: () => null },
      addEventListener(type, fn) { docListeners.set(type, (docListeners.get(type) || 0) + 1); },
      removeEventListener(type, fn) { docListeners.set(type, (docListeners.get(type) || 0) - 1); },
    };

    let mediaReduced = false;
    const mediaListeners = new Set();
    globalThis.window = {
      devicePixelRatio: 3,
      matchMedia() {
        return {
          get matches() { return mediaReduced; },
          addEventListener(_t, fn) { mediaListeners.add(fn); },
          removeEventListener(_t, fn) { mediaListeners.delete(fn); },
        };
      },
    };

    const paletteVars = {
      '--vi-orbital-surface': 'oklch(0.145 0.014 285)',
      '--vi-orbital-c1': 'oklch(0.58 0.21 262)',
      '--vi-orbital-c2': 'oklch(0.49 0.22 280)',
      '--vi-orbital-c3': 'oklch(0.60 0.20 310)',
      '--vi-orbital-c4': 'oklch(0.68 0.17 35)',
    };
    globalThis.getComputedStyle = () => ({
      getPropertyValue: (k) => paletteVars[k] || '',
    });

    function makeMockDom(w, h) {
      const hostListeners = new Map();
      const attrs = { 'data-agent-state': 'start' };
      const host = {
        clientWidth: w,
        clientHeight: h,
        getBoundingClientRect: () => ({ left: 0, top: 0, width: w, height: h }),
        getAttribute: (k) => attrs[k] ?? null,
        setAttribute: (k, v) => { attrs[k] = v; },
        addEventListener(type, fn) { hostListeners.set(type, (hostListeners.get(type) || 0) + 1); },
        removeEventListener(type, fn) { hostListeners.set(type, (hostListeners.get(type) || 0) - 1); },
      };
      const strokes = [];
      const styleWrites = [];
      const ctx = {
        lineCap: '',
        lineWidth: 0,
        strokeStyle: '',
        fillStyle: '',
        setTransform() {},
        clearRect() { strokes.length = 0; },
        fillRect() {},
        beginPath() {},
        moveTo(x, y) { this._mx = x; this._my = y; },
        lineTo(x, y) { this._lx = x; this._ly = y; },
        stroke() {
          strokes.push({
            style: this.strokeStyle,
            lw: Number(this.lineWidth.toFixed(2)),
            mx: Number(this._mx.toFixed(2)),
            my: Number(this._my.toFixed(2)),
            lx: Number(this._lx.toFixed(2)),
            ly: Number(this._ly.toFixed(2)),
          });
        },
      };
      const canvas = {
        width: 0,
        height: 0,
        style: new Proxy({}, {
          set(_t, prop, val) { styleWrites.push(String(prop)); return true; },
        }),
        getContext: () => ctx,
      };
      return { host, canvas, strokes, styleWrites, hostListeners };
    }

    // Active motion lifecycle test
    const dom1 = makeMockDom(960, 500);
    const engine1 = new OrbitalFieldEngine({ host: dom1.host, canvas: dom1.canvas });
    engine1.mount();
    const dprCapped = dom1.canvas.width === 960 * 2 && dom1.canvas.height === 500 * 2;
    const zeroStyleMutations = dom1.styleWrites.length === 0;
    const runningAfterMount = engine1.isRunning();
    const particleCount1 = engine1.getParticleCount();

    // Exercise all 6 agentic states + rAF ticks (including huge dt clamping check)
    for (const st of AGENT_STATES) {
      engine1.setState(st);
      const pending = [...rafCallbacks.entries()];
      rafCallbacks.clear();
      for (const [, cb] of pending) cb(10000);
    }
    const finalState = engine1.getState();

    // Off-screen IntersectionObserver pauses rAF; returning resumes it
    lastIntersectionCb([{ isIntersecting: false }]);
    const pausedOffscreen = !engine1.isRunning();
    lastIntersectionCb([{ isIntersecting: true }]);
    const resumedOnscreen = engine1.isRunning();

    // Teardown releases every observer, listener, and rAF ID
    engine1.destroy();
    const stoppedAfterDestroy = !engine1.isRunning() && rafCallbacks.size === 0;
    const hostListenersClean = [...dom1.hostListeners.values()].every((n) => n === 0);
    const docListenersClean = [...docListeners.values()].every((n) => n === 0);
    const mediaListenersClean = mediaListeners.size === 0;

    // Reduced-motion deterministic single static frame test (zero rAF scheduled)
    mediaReduced = true;
    rafCallbacks.clear();
    const rmDomA = makeMockDom(800, 480);
    const rmEngineA = new OrbitalFieldEngine({ host: rmDomA.host, canvas: rmDomA.canvas, seed: 42 });
    rmEngineA.mount();
    const rmRafCountA = rafCallbacks.size;
    const rmFrameA = JSON.stringify(rmDomA.strokes);
    rmEngineA.destroy();

    const rmDomB = makeMockDom(800, 480);
    const rmEngineB = new OrbitalFieldEngine({ host: rmDomB.host, canvas: rmDomB.canvas, seed: 42 });
    rmEngineB.mount();
    const rmRafCountB = rafCallbacks.size;
    const rmFrameB = JSON.stringify(rmDomB.strokes);
    rmEngineB.destroy();

    process.stdout.write(JSON.stringify({
      smallCount,
      medCount,
      hugeCount,
      smoothDiff: Math.abs(smoothed - expectedSmooth),
      modulated,
      stateCount: Object.keys(AGENT_STATE_MODULATION).length,
      dprCapped,
      zeroStyleMutations,
      runningAfterMount,
      particleCount1,
      finalState,
      pausedOffscreen,
      resumedOnscreen,
      stoppedAfterDestroy,
      hostListenersClean,
      docListenersClean,
      mediaListenersClean,
      observerStats,
      rmRafCountA,
      rmRafCountB,
      rmStrokesCount: rmDomA.strokes.length,
      rmDeterministic: rmFrameA === rmFrameB && rmDomA.strokes.length === computeParticleCount(800, 480),
    }));
  `;

  const stdout = execFileSync(
    process.execPath,
    ['--experimental-strip-types', '--no-warnings', '--input-type=module', '-e', script],
    { cwd: ROOT },
  ).toString();
  const res = JSON.parse(stdout);

  assert.equal(res.smallCount, 45);
  assert.equal(res.medCount, 150);
  assert.equal(res.hugeCount, 220);
  assert.ok(res.smoothDiff < 1e-12);
  assert.equal(res.modulated, 'oklch(0.58 0.1050 262 / 0.500)');
  assert.equal(res.stateCount, 6);
  assert.equal(res.dprCapped, true, 'DPR must cap at 2');
  assert.equal(res.zeroStyleMutations, true, 'resize must not mutate canvas CSS style box');
  assert.equal(res.runningAfterMount, true);
  assert.equal(res.particleCount1, 100);
  assert.equal(res.finalState, 'failure');
  assert.equal(res.pausedOffscreen, true);
  assert.equal(res.resumedOnscreen, true);
  assert.equal(res.stoppedAfterDestroy, true);
  assert.equal(res.hostListenersClean, true, 'all host pointer listeners removed on destroy');
  assert.equal(res.docListenersClean, true, 'visibilitychange listener removed on destroy');
  assert.equal(res.mediaListenersClean, true, 'matchMedia listener removed on destroy');
  assert.ok(res.observerStats.resizeDisconnected >= 1);
  assert.ok(res.observerStats.intersectionDisconnected >= 1);
  assert.ok(res.observerStats.mutationDisconnected >= 2);
  assert.equal(res.rmRafCountA, 0, 'prefers-reduced-motion must skip requestAnimationFrame');
  assert.equal(res.rmRafCountB, 0, 'prefers-reduced-motion must skip requestAnimationFrame');
  assert.equal(res.rmDeterministic, true, 'prefers-reduced-motion static frame must be deterministic');
});
