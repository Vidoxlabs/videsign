'use strict';

/**
 * Nocturne Museum: Progressive-enhancement controller for Family Surfaces
 * (zero dependencies, CSP-safe, Shadow DOM compatible).
 *
 * Controllers:
 *   1. [data-vi-model-profile] - Closed 5-slot model profile presets with explicit provenance
 *   2. [data-vi-trace-replay]  - Unified trace viewer (4 read-only views + monotonic seq 1..6 stepper)
 *   3. [data-vi-eval-report]   - Deterministic eval harness summary & All/Passed/Failed filters
 *   4. [data-vi-cap-ledger]    - Capability horizon filter (All/Now/Next/Later) & sync freshness toggle
 *   5. [data-vi-family-stack]  - Interactive 9-repo Vidoxlabs family stack inspector
 */

(function attachFamilySurfaces(rootGlobal, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (rootGlobal && typeof rootGlobal === 'object') {
    rootGlobal.ViFamilySurfaces = api;
  }
  if (typeof document !== 'undefined') {
    var boot = function bootFamilySurfaces() {
      api.initFamilySurfaces(document);
    };
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', boot, { once: true });
    } else {
      boot();
    }
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function createFamilySurfacesApi() {
  var PROFILE_PRESETS = {
    'probed-local': {
      requestedAlias: 'local-fast',
      backendModel: 'inkling-2-mini-q4',
      deprecated: false,
      replacedBy: '',
      statusNote: 'Probed local profile loaded · 5 closed slots',
      slots: {
        model: { value: 'inkling-2-mini-q4', source: 'probed' },
        contextLength: { value: '32768', source: 'reported' },
        toolCalling: { value: 'true', source: 'reported' },
        constrainedOutput: { value: 'false', source: 'reported' },
        streaming: { value: 'true', source: 'probed' },
      },
    },
    'partial-unknown': {
      requestedAlias: 'local-fast',
      backendModel: 'inkling-2-mini-q4',
      deprecated: false,
      replacedBy: '',
      statusNote: 'Partial unknown profile · unknown slots stay null without guessing',
      slots: {
        model: { value: 'inkling-2-mini-q4', source: 'probed' },
        contextLength: { value: 'Unreported / unknown', source: 'unknown' },
        toolCalling: { value: 'Unreported / unknown', source: 'unknown' },
        constrainedOutput: { value: 'Unreported / unknown', source: 'unknown' },
        streaming: { value: 'true', source: 'probed' },
      },
    },
    'deprecated-alias': {
      requestedAlias: 'legacy-chat',
      backendModel: 'inkling-1-base',
      deprecated: true,
      replacedBy: 'local-fast',
      statusNote: 'Deprecated alias resolved to its own backend model · caller decides swap',
      slots: {
        model: { value: 'inkling-1-base', source: 'probed' },
        contextLength: { value: '16384', source: 'reported' },
        toolCalling: { value: 'false', source: 'reported' },
        constrainedOutput: { value: 'false', source: 'reported' },
        streaming: { value: 'true', source: 'probed' },
      },
    },
  };

  var TRACE_EVENTS = [
    {
      seq: 1,
      type: 'turn.started',
      run: 'run-9a4f',
      attempt: '1',
      step: '1',
      seat: 'chair',
      delta: 'Started attempt 1 with alias local-fast',
      debug: 'model=local-fast | titleDigest=sha256:1b40e29a | endpoint=omitted',
      tokenDelta: 'No streamed assistant text delta at seq 1',
      usage: 'input: unreported, output: unreported, total: unreported, cacheRead: unreported, cacheWrite: unreported, costUSD: unreported',
    },
    {
      seq: 2,
      type: 'team.recall',
      run: 'run-9a4f',
      attempt: '1',
      step: '2',
      seat: 'framing',
      delta: 'Recalled 2 consented notes via SHA-256 digests only',
      debug: 'hit=true | count=2 | digests=[sha256:9f2c81a4, sha256:4b1e70d3] | rawNotes=redacted',
      tokenDelta: 'No streamed assistant text delta at seq 2',
      usage: 'input: unreported, output: unreported, total: unreported, cacheRead: unreported, cacheWrite: unreported, costUSD: unreported',
    },
    {
      seq: 3,
      type: 'model.call',
      run: 'run-9a4f',
      attempt: '1',
      step: '3',
      seat: 'risk',
      delta: 'Model call 1 completed in 412 ms (in 640, out 184)',
      debug: 'call=1 | durationMs=412 | usageComplete=partial | cacheRead=null | costUSD=null',
      tokenDelta: 'No streamed assistant text delta at seq 3',
      usage: 'input: 640, output: 184, total: 824, cacheRead: unreported, cacheWrite: unreported, costUSD: unreported',
    },
    {
      seq: 4,
      type: 'tool.updated',
      run: 'run-9a4f',
      attempt: '1',
      step: '4',
      seat: 'coherence',
      delta: 'toolId vcs.file.read finished (exitCode 0, 28 ms, 3412 bytes)',
      debug: 'toolId=vcs.file.read | durationMs=28 | exitCode=0 | bytes=3412 | truncatedBytes=0 | outputSha256=sha256:4a91e802c1f7',
      tokenDelta: 'No streamed assistant text delta at seq 4',
      usage: 'input: 640, output: 184, total: 824, cacheRead: unreported, cacheWrite: unreported, costUSD: unreported',
    },
    {
      seq: 5,
      type: 'assistant.delta',
      run: 'run-9a4f',
      attempt: '1',
      step: '5',
      seat: 'sequencing',
      delta: 'Streamed assistant text delta (+18 tokens)',
      debug: 'chunkBytes=56 | digest=sha256:7c22a901 | seat=sequencing',
      tokenDelta: 'Validated 5 closed slots; unknown capabilities stay null.',
      usage: 'input: 640, output: 202, total: 842, cacheRead: unreported, cacheWrite: unreported, costUSD: unreported',
    },
    {
      seq: 6,
      type: 'turn.finished',
      run: 'run-9a4f',
      attempt: '1',
      step: '6',
      seat: 'chair',
      delta: 'Closed run attempt with status complete (objective-settled)',
      debug: 'status=complete | reason=objective-settled | events=6 | endpoint=omitted',
      tokenDelta: 'Stream settled at seq 6 (final text complete)',
      usage: 'input: 640, output: 202, total: 842, cacheRead: unreported, cacheWrite: unreported, costUSD: unreported',
    },
  ];

  var STACK_REPOS = {
    bloom: {
      repo: 'bloom',
      tier: 'Top tier · Composer',
      role: 'Team workspace and coding loop orchestrator; the only composer.',
      contracts: 'docs/architecture.md, CAP-04, CAP-08, CAP-10, CAP-14',
      rule: 'May call peers or seed; peers never import each other.',
      url: 'https://github.com/Vidoxlabs/bloom',
    },
    capillary: {
      repo: 'capillary',
      tier: 'Middle tier · Independent peer',
      role: 'Codebase-to-context packer producing bounded, provenance-honest packets.',
      contracts: 'docs/contracts/retrieval.md, CAP-05, CAP-18',
      rule: 'Peers never import each other.',
      url: 'https://github.com/Vidoxlabs/capillary',
    },
    myosotis: {
      repo: 'myosotis',
      tier: 'Middle tier · Independent peer',
      role: 'Memory fabric owning consent, keep, supersede, and structural forget.',
      contracts: 'docs/contracts/records.md, consent.md, forget.md, CAP-11',
      rule: 'Peers never import each other; storage stays inside myosotis.',
      url: 'https://github.com/Vidoxlabs/myosotis',
    },
    aestivation: {
      repo: 'aestivation',
      tier: 'Middle tier · Independent peer',
      role: 'Admission and review peer governing plan digests, verdicts, and gates.',
      contracts: 'docs/contracts/plan.md, verdict.md, gate.md, CAP-07',
      rule: 'Peers never import each other; review never ratifies owner gate.',
      url: 'https://github.com/Vidoxlabs/aestivation',
    },
    drosera: {
      repo: 'drosera',
      tier: 'Middle tier · Independent peer',
      role: 'External tool faces, skills, fail-closed hooks, and cookbook recipes.',
      contracts: 'docs/contracts/hooks.md, CAP-09, CAP-19',
      rule: 'Peers never import each other.',
      url: 'https://github.com/Vidoxlabs/drosera',
    },
    seed: {
      repo: 'seed',
      tier: 'Floor tier · Foundation contracts',
      role: 'Harness foundation: run records, tool-ID grammar, provider seam, model profiles.',
      contracts: 'docs/contracts/run-model.md, tool-id.md, provider.md, CAP-03, CAP-16',
      rule: 'Foundation floor below peers; zero network calls inside seed.',
      url: 'https://github.com/Vidoxlabs/seed',
    },
    trellis: {
      repo: 'trellis',
      tier: 'Aside · Outside the call path',
      role: 'Testing lattice executing 4-point shape, behavior, consistency, and operational probes.',
      contracts: 'docs/contracts/grid.md, probes.md',
      rule: 'Stands outside the call path; observes and reports without patching.',
      url: 'https://github.com/Vidoxlabs/trellis',
    },
    docs: {
      repo: 'docs',
      tier: 'Aside · Plain-named hub',
      role: 'Family timeline, capability ledger, and verbatim SHA-256 synced sources hub.',
      contracts: 'docs/sync.md, docs/timeline/ledger.md, CAP-01, CAP-02',
      rule: 'Plain-named infrastructure; sources/ mirrors upstream docs verbatim.',
      url: 'https://github.com/Vidoxlabs/docs',
    },
    videsign: {
      repo: 'videsign',
      tier: 'Aside · Plain-named design canon',
      role: 'Nocturne Museum design token matrix, components, and verification contracts.',
      contracts: 'DESIGN.md, SKILL.md, dist/components.manifest.json',
      rule: 'Plain-named design canon; shared visual language for all products.',
      url: 'https://github.com/Vidoxlabs/videsign',
    },
  };

  function setStatusDotClass(dotEl, variant) {
    if (!dotEl) return;
    var next = 'vi-fs-dot vi-fs-dot--' + variant;
    dotEl.className = next;
    if (dotEl.classList) {
      dotEl.classList.remove('vi-fs-dot--ok', 'vi-fs-dot--info', 'vi-fs-dot--muted', 'vi-fs-dot--warn', 'vi-fs-dot--danger');
      dotEl.classList.add('vi-fs-dot', 'vi-fs-dot--' + variant);
    }
  }

  function sourceVariant(source) {
    if (source === 'probed') return 'ok';
    if (source === 'reported') return 'info';
    return 'muted';
  }

  function initFamilySurfaces(container) {
    var root = container || (typeof document !== 'undefined' ? document : null);
    if (!root || typeof root.querySelectorAll !== 'function') {
      return { destroy: function noop() {} };
    }

    var cleanups = [];

    function on(target, type, handler, opts) {
      if (!target || typeof target.addEventListener !== 'function') return;
      target.addEventListener(type, handler, opts);
      cleanups.push(function () {
        target.removeEventListener(type, handler, opts);
      });
    }

    // 1. Model Profile Card
    Array.prototype.slice.call(root.querySelectorAll('[data-vi-model-profile]')).forEach(function (host) {
      if (host._viFsProfileBound) return;
      host._viFsProfileBound = true;
      cleanups.push(function () { host._viFsProfileBound = false; });

      var presetBtns = Array.prototype.slice.call(host.querySelectorAll('[data-profile-preset]'));
      var reqEl = host.querySelector('[data-profile-requested]');
      var backendEl = host.querySelector('[data-profile-backend]');
      var depBanner = host.querySelector('[data-profile-deprecated]');
      var depTextEl = host.querySelector('[data-profile-deprecated-text]');
      var statusEl = host.querySelector('[data-profile-status]');
      var slotRows = Array.prototype.slice.call(host.querySelectorAll('[data-profile-slot]'));

      function applyPreset(key) {
        var preset = PROFILE_PRESETS[key] || PROFILE_PRESETS['probed-local'];
        presetBtns.forEach(function (btn) {
          btn.setAttribute('aria-pressed', btn.getAttribute('data-profile-preset') === key ? 'true' : 'false');
        });
        if (reqEl) reqEl.textContent = preset.requestedAlias;
        if (backendEl) backendEl.textContent = preset.backendModel;
        if (depBanner) depBanner.hidden = !preset.deprecated;
        if (depTextEl && preset.deprecated) {
          depTextEl.textContent = 'replacedBy: ' + preset.replacedBy + ' (label only; caller decides)';
        }
        slotRows.forEach(function (row) {
          var slotName = row.getAttribute('data-profile-slot');
          var data = preset.slots[slotName];
          if (!data) return;
          var valEl = row.querySelector('[data-slot-value]');
          var srcEl = row.querySelector('[data-slot-source]');
          var dotEl = row.querySelector('[data-slot-dot]');
          if (valEl) valEl.textContent = data.value;
          if (srcEl) srcEl.textContent = data.source;
          setStatusDotClass(dotEl, sourceVariant(data.source));
        });
        if (statusEl) statusEl.textContent = preset.statusNote;
      }

      presetBtns.forEach(function (btn) {
        on(btn, 'click', function () {
          applyPreset(btn.getAttribute('data-profile-preset') || 'probed-local');
        });
      });

      applyPreset('probed-local');
    });

    // 2. Trace Replay Panel
    Array.prototype.slice.call(root.querySelectorAll('[data-vi-trace-replay]')).forEach(function (host) {
      if (host._viFsTraceBound) return;
      host._viFsTraceBound = true;
      cleanups.push(function () { host._viFsTraceBound = false; });

      var tabs = Array.prototype.slice.call(host.querySelectorAll('[data-trace-view]'));
      var panels = Array.prototype.slice.call(host.querySelectorAll('[data-trace-panel]'));
      var prevBtn = host.querySelector('[data-trace-prev]');
      var nextBtn = host.querySelector('[data-trace-next]');
      var seqLabel = host.querySelector('[data-trace-seq-label]');
      var corrRun = host.querySelector('[data-corr-run]');
      var corrAttempt = host.querySelector('[data-corr-attempt]');
      var corrStep = host.querySelector('[data-corr-step]');
      var corrSeat = host.querySelector('[data-corr-seat]');
      var deltaOut = host.querySelector('[data-trace-delta-out]');
      var debugOut = host.querySelector('[data-trace-debug-out]');
      var tokenOut = host.querySelector('[data-trace-token-out]');
      var usageOut = host.querySelector('[data-trace-usage-out]');
      var statusOut = host.querySelector('[data-trace-status]');
      var eventItems = Array.prototype.slice.call(host.querySelectorAll('[data-trace-seq]'));

      var currentSeq = 4;
      var activeView = 'full';

      function renderTrace() {
        var ev = TRACE_EVENTS[currentSeq - 1] || TRACE_EVENTS[0];
        if (seqLabel) seqLabel.textContent = 'seq ' + ev.seq + ' / ' + TRACE_EVENTS.length + ' · ' + ev.type;
        if (prevBtn) {
          prevBtn.disabled = currentSeq <= 1;
          prevBtn.setAttribute('aria-disabled', currentSeq <= 1 ? 'true' : 'false');
        }
        if (nextBtn) {
          nextBtn.disabled = currentSeq >= TRACE_EVENTS.length;
          nextBtn.setAttribute('aria-disabled', currentSeq >= TRACE_EVENTS.length ? 'true' : 'false');
        }
        if (corrRun) corrRun.textContent = ev.run;
        if (corrAttempt) corrAttempt.textContent = ev.attempt;
        if (corrStep) corrStep.textContent = ev.step;
        if (corrSeat) corrSeat.textContent = ev.seat;
        if (deltaOut) deltaOut.textContent = ev.delta;
        if (debugOut) debugOut.textContent = ev.debug;
        if (tokenOut) tokenOut.textContent = ev.tokenDelta;
        if (usageOut) usageOut.textContent = ev.usage;

        eventItems.forEach(function (item) {
          var s = Number(item.getAttribute('data-trace-seq') || 0);
          item.hidden = s > currentSeq;
          item.setAttribute('data-trace-active', s === currentSeq ? 'true' : 'false');
        });

        tabs.forEach(function (tab) {
          var selected = tab.getAttribute('data-trace-view') === activeView;
          tab.setAttribute('aria-selected', selected ? 'true' : 'false');
          tab.setAttribute('tabindex', selected ? '0' : '-1');
        });
        panels.forEach(function (panel) {
          panel.hidden = panel.getAttribute('data-trace-panel') !== activeView;
        });
        if (statusOut) {
          statusOut.textContent = 'Read-only view ' + activeView + ' at seq ' + ev.seq;
        }
      }

      tabs.forEach(function (tab, idx) {
        on(tab, 'click', function () {
          activeView = tab.getAttribute('data-trace-view') || 'full';
          renderTrace();
        });
        on(tab, 'keydown', function (ev) {
          var next = -1;
          if (ev.key === 'ArrowRight') next = (idx + 1) % tabs.length;
          else if (ev.key === 'ArrowLeft') next = (idx - 1 + tabs.length) % tabs.length;
          else if (ev.key === 'Home') next = 0;
          else if (ev.key === 'End') next = tabs.length - 1;
          if (next === -1) return;
          ev.preventDefault();
          activeView = tabs[next].getAttribute('data-trace-view') || 'full';
          renderTrace();
          if (typeof tabs[next].focus === 'function') tabs[next].focus();
        });
      });

      if (prevBtn) {
        on(prevBtn, 'click', function () {
          if (currentSeq > 1) {
            currentSeq -= 1;
            renderTrace();
          }
        });
      }
      if (nextBtn) {
        on(nextBtn, 'click', function () {
          if (currentSeq < TRACE_EVENTS.length) {
            currentSeq += 1;
            renderTrace();
          }
        });
      }

      renderTrace();
    });

    // 3. Eval Harness Report
    Array.prototype.slice.call(root.querySelectorAll('[data-vi-eval-report]')).forEach(function (host) {
      if (host._viFsEvalBound) return;
      host._viFsEvalBound = true;
      cleanups.push(function () { host._viFsEvalBound = false; });

      var filterBtns = Array.prototype.slice.call(host.querySelectorAll('[data-eval-filter]'));
      var rows = Array.prototype.slice.call(host.querySelectorAll('[data-eval-case]'));
      var statusEl = host.querySelector('[data-eval-status]');

      function applyFilter(mode) {
        var shown = 0;
        rows.forEach(function (row) {
          var verdict = row.getAttribute('data-eval-verdict') || '';
          var show = mode === 'all' || verdict === mode;
          row.hidden = !show;
          if (show) shown += 1;
        });
        filterBtns.forEach(function (btn) {
          btn.setAttribute('aria-pressed', btn.getAttribute('data-eval-filter') === mode ? 'true' : 'false');
        });
        if (statusEl) {
          statusEl.textContent = 'Showing ' + shown + ' case(s) · judge never overrides failing deterministic checks';
        }
      }

      filterBtns.forEach(function (btn) {
        on(btn, 'click', function () {
          applyFilter(btn.getAttribute('data-eval-filter') || 'all');
        });
      });

      applyFilter('all');
    });

    // 4. Capability Ledger Panel
    Array.prototype.slice.call(root.querySelectorAll('[data-vi-cap-ledger]')).forEach(function (host) {
      if (host._viFsCapBound) return;
      host._viFsCapBound = true;
      cleanups.push(function () { host._viFsCapBound = false; });

      var horizonBtns = Array.prototype.slice.call(host.querySelectorAll('[data-cap-horizon]'));
      var rows = Array.prototype.slice.call(host.querySelectorAll('[data-cap-row]'));
      var syncBtns = Array.prototype.slice.call(host.querySelectorAll('[data-sync-mode]'));
      var syncBanner = host.querySelector('[data-sync-drift-banner]');
      var seedSyncDot = host.querySelector('[data-sync-seed-dot]');
      var seedSyncLabel = host.querySelector('[data-sync-seed-label]');
      var statusEl = host.querySelector('[data-cap-status]');

      var activeHorizon = 'all';
      var activeSyncMode = 'match';

      function renderCap() {
        var visible = 0;
        rows.forEach(function (row) {
          var hz = row.getAttribute('data-cap-hz') || '';
          var show = activeHorizon === 'all' || hz === activeHorizon;
          row.hidden = !show;
          if (show) visible += 1;
        });
        horizonBtns.forEach(function (btn) {
          btn.setAttribute('aria-pressed', btn.getAttribute('data-cap-horizon') === activeHorizon ? 'true' : 'false');
        });
        syncBtns.forEach(function (btn) {
          btn.setAttribute('aria-pressed', btn.getAttribute('data-sync-mode') === activeSyncMode ? 'true' : 'false');
        });

        var isDrift = activeSyncMode === 'drift';
        if (syncBanner) syncBanner.hidden = !isDrift;
        setStatusDotClass(seedSyncDot, isDrift ? 'danger' : 'ok');
        if (seedSyncLabel) {
          seedSyncLabel.textContent = isDrift ? 'Refused: sha256 mismatch' : 'Digests match manifest';
        }
        if (statusEl) {
          statusEl.textContent = isDrift
            ? 'Showing ' + visible + ' capabilities · sync drift refused fail-closed'
            : 'Showing ' + visible + ' capabilities · all source digests match manifest';
        }
      }

      horizonBtns.forEach(function (btn) {
        on(btn, 'click', function () {
          activeHorizon = btn.getAttribute('data-cap-horizon') || 'all';
          renderCap();
        });
      });

      syncBtns.forEach(function (btn) {
        on(btn, 'click', function () {
          activeSyncMode = btn.getAttribute('data-sync-mode') || 'match';
          renderCap();
        });
      });

      renderCap();
    });

    // 5. Family Stack Diagram
    Array.prototype.slice.call(root.querySelectorAll('[data-vi-family-stack]')).forEach(function (host) {
      if (host._viFsStackBound) return;
      host._viFsStackBound = true;
      cleanups.push(function () { host._viFsStackBound = false; });

      var nodes = Array.prototype.slice.call(host.querySelectorAll('[data-stack-repo]'));
      var repoEl = host.querySelector('[data-stack-detail-repo]');
      var roleEl = host.querySelector('[data-stack-detail-role]');
      var contractsEl = host.querySelector('[data-stack-detail-contracts]');
      var ruleEl = host.querySelector('[data-stack-detail-rule]');
      var urlEl = host.querySelector('[data-stack-detail-url]');
      var statusEl = host.querySelector('[data-stack-status]');

      function selectRepo(key) {
        var entry = STACK_REPOS[key] || STACK_REPOS.seed;
        nodes.forEach(function (btn) {
          btn.setAttribute('aria-pressed', btn.getAttribute('data-stack-repo') === key ? 'true' : 'false');
        });
        if (repoEl) repoEl.textContent = entry.repo + ' (' + entry.tier + ')';
        if (roleEl) roleEl.textContent = entry.role;
        if (contractsEl) contractsEl.textContent = entry.contracts;
        if (ruleEl) ruleEl.textContent = entry.rule;
        if (urlEl) {
          urlEl.textContent = entry.url;
          urlEl.setAttribute('href', entry.url);
        }
        if (statusEl) statusEl.textContent = 'Selected ' + entry.repo + ' (' + entry.tier + ')';
      }

      nodes.forEach(function (btn) {
        on(btn, 'click', function () {
          selectRepo(btn.getAttribute('data-stack-repo') || 'seed');
        });
      });

      selectRepo('seed');
    });

    return {
      destroy: function () {
        for (var i = 0; i < cleanups.length; i += 1) cleanups[i]();
        cleanups.length = 0;
      },
    };
  }

  return {
    initFamilySurfaces: initFamilySurfaces,
  };
});
