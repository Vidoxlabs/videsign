'use strict';

/**
 * Nocturne Museum: Progressive-enhancement controller for Family Contracts
 * (zero dependencies, CSP-safe, Shadow DOM compatible).
 *
 * Controllers:
 *   1. [data-vi-packet]       -- capillary bounded context packet & epoch guard refusal
 *   2. [data-vi-memory-epoch] -- myosotis 4 memory classes, consent ledger & structural forget
 *   3. [data-vi-gate-card]    -- aestivation assemblyGate precedence & verdict ledger
 *   4. [data-vi-hooks]        -- drosera pack-ordered hooks, CAP-19 scan & cookbook recipe
 *   5. [data-vi-trellis]      -- trellis 4-point family probe matrix & strict rollup math
 */

(function attachFamilyContracts(rootGlobal, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (rootGlobal && typeof rootGlobal === 'object') {
    rootGlobal.ViFamilyContracts = api;
  }
  if (typeof document !== 'undefined') {
    var boot = function bootFamilyContracts() {
      api.initFamilyContracts(document);
    };
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', boot, { once: true });
    } else {
      boot();
    }
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function createFamilyContractsApi() {
  function initFamilyContracts(container) {
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

    function bindTabListNavigation(tabs, onSelect) {
      tabs.forEach(function (tab, idx) {
        on(tab, 'click', function () {
          onSelect(tab, idx);
        });
        on(tab, 'keydown', function (ev) {
          var next = -1;
          if (ev.key === 'ArrowRight') next = (idx + 1) % tabs.length;
          else if (ev.key === 'ArrowLeft') next = (idx - 1 + tabs.length) % tabs.length;
          else if (ev.key === 'Home') next = 0;
          else if (ev.key === 'End') next = tabs.length - 1;
          if (next === -1) return;
          ev.preventDefault();
          tabs[next].click();
          if (typeof tabs[next].focus === 'function') tabs[next].focus();
        });
      });
    }

    // 1. Context Packet Inspector (capillary)
    Array.prototype.slice.call(root.querySelectorAll('[data-vi-packet]')).forEach(function (host) {
      if (host._viPacketBound) return;
      host._viPacketBound = true;
      cleanups.push(function () { host._viPacketBound = false; });

      var modeBtns = Array.prototype.slice.call(host.querySelectorAll('[data-packet-mode]'));
      var tabs = Array.prototype.slice.call(host.querySelectorAll('[data-packet-tab]'));
      var panels = Array.prototype.slice.call(host.querySelectorAll('[data-packet-panel]'));
      var input = host.querySelector('[data-packet-search]');
      var resetBtn = host.querySelector('[data-packet-reset]');
      var emptyEl = host.querySelector('[data-packet-empty]');
      var statusEl = host.querySelector('[data-packet-status]');
      var bodyEl = host.querySelector('[data-packet-body]');
      var refusalEl = host.querySelector('[data-packet-refusal]');
      var epochReadout = host.querySelector('[data-packet-epoch-readout]');
      var activeTab = 'admitted';
      var activeMode = 'stable';

      function syncFilter() {
        if (activeMode === 'refusal') {
          if (statusEl) statusEl.textContent = 'refused: deletion-epoch-changed, 0 items returned';
          return;
        }
        var q = (input ? input.value : '').trim().toLowerCase();
        var activePanel = null;
        panels.forEach(function (p) {
          var match = p.getAttribute('data-packet-panel') === activeTab;
          p.hidden = !match;
          if (match) activePanel = p;
        });
        var visible = 0;
        if (activePanel) {
          var items = Array.prototype.slice.call(activePanel.querySelectorAll('[data-packet-item]'));
          items.forEach(function (row) {
            var hay = ((row.getAttribute('data-packet-search-text') || '') + ' ' + (row.textContent || '')).toLowerCase();
            var match = !q || hay.indexOf(q) !== -1;
            row.hidden = !match;
            if (match) visible += 1;
          });
        }
        if (emptyEl) emptyEl.hidden = visible !== 0;
        if (statusEl) {
          statusEl.textContent = visible + ' ' + activeTab + ' shown';
        }
      }

      function setMode(mode) {
        activeMode = mode === 'refusal' ? 'refusal' : 'stable';
        modeBtns.forEach(function (b) {
          b.setAttribute('aria-pressed', b.getAttribute('data-packet-mode') === activeMode ? 'true' : 'false');
        });
        var isRefusal = activeMode === 'refusal';
        if (bodyEl) bodyEl.hidden = isRefusal;
        if (refusalEl) refusalEl.hidden = !isRefusal;
        if (epochReadout) {
          epochReadout.textContent = isRefusal
            ? 'epochStart 14 to epochEnd 15'
            : 'deletionEpoch: 14';
        }
        syncFilter();
      }

      function setTab(tabKey) {
        activeTab = tabKey || 'admitted';
        tabs.forEach(function (t) {
          var selected = t.getAttribute('data-packet-tab') === activeTab;
          t.setAttribute('aria-selected', selected ? 'true' : 'false');
          t.setAttribute('tabindex', selected ? '0' : '-1');
        });
        syncFilter();
      }

      modeBtns.forEach(function (btn) {
        on(btn, 'click', function () {
          setMode(btn.getAttribute('data-packet-mode'));
        });
      });

      bindTabListNavigation(tabs, function (tab) {
        setTab(tab.getAttribute('data-packet-tab'));
      });

      if (input) {
        on(input, 'input', syncFilter);
        on(input, 'keydown', function (ev) {
          if (ev.key === 'Escape' && input.value) {
            ev.preventDefault();
            input.value = '';
            syncFilter();
          }
        });
      }

      if (resetBtn) {
        on(resetBtn, 'click', function () {
          if (input) {
            input.value = '';
            syncFilter();
            if (typeof input.focus === 'function') input.focus();
          }
        });
      }

      setMode('stable');
      setTab('admitted');
    });

    // 2. Memory Consent & Epoch (myosotis)
    Array.prototype.slice.call(root.querySelectorAll('[data-vi-memory-epoch]')).forEach(function (host) {
      if (host._viMemEpochBound) return;
      host._viMemEpochBound = true;
      cleanups.push(function () { host._viMemEpochBound = false; });

      var confirmBox = host.querySelector('[data-mem-confirm]');
      var forgetBtn = host.querySelector('[data-mem-forget]');
      var rebuildBtn = host.querySelector('[data-mem-rebuild]');
      var resetBtn = host.querySelector('[data-mem-reset]');
      var epochEl = host.querySelector('[data-mem-epoch-val]');
      var projEl = host.querySelector('[data-mem-proj-val]');
      var continuityEl = host.querySelector('[data-mem-continuity]');
      var statusEl = host.querySelector('[data-mem-status]');
      var activeRecEl = host.querySelector('[data-mem-active-record]');
      var tombEl = host.querySelector('[data-mem-tombstone]');
      var recallNoteEl = host.querySelector('[data-mem-recall-note]');

      var epoch = 4;
      var stamp = 4;
      var erased = false;

      function syncState() {
        var confirmed = Boolean(confirmBox && confirmBox.checked);
        var stale = stamp !== epoch;
        if (forgetBtn) {
          var canForget = !erased && confirmed;
          forgetBtn.disabled = !canForget;
          forgetBtn.setAttribute('aria-disabled', canForget ? 'false' : 'true');
        }
        if (rebuildBtn) {
          rebuildBtn.disabled = !stale;
          rebuildBtn.setAttribute('aria-disabled', stale ? 'false' : 'true');
        }
        if (confirmBox) {
          confirmBox.disabled = erased;
        }
        if (epochEl) epochEl.textContent = String(epoch);
        if (projEl) {
          projEl.textContent = stale
            ? 'refused: stale (stamp ' + stamp + ' != epoch ' + epoch + '; nothing served partially)'
            : 'stamp = ' + stamp + ' · current';
        }
        if (continuityEl) {
          continuityEl.textContent = stale ? 'continuity: projection held' : 'continuity: active';
        }
        if (activeRecEl) activeRecEl.hidden = erased;
        if (tombEl) tombEl.hidden = !erased;
        if (recallNoteEl) {
          if (!erased) {
            recallNoteEl.textContent = 'Prompt summary includes mem-17 at stamp 4.';
          } else if (stale) {
            recallNoteEl.textContent = 'Projection refused: stamp 4 != epoch 5; rebuild before serving.';
          } else {
            recallNoteEl.textContent = 'Rebuilt at stamp 5; mem-17 and mem-12 absent from recall.';
          }
        }
        if (statusEl) {
          if (!erased) {
            statusEl.textContent = 'store.epoch = ' + epoch + ' · stamp = ' + stamp + ' current';
          } else if (stale) {
            statusEl.textContent = 'store.epoch = ' + epoch + ' · refused: stale projection';
          } else {
            statusEl.textContent = 'store.epoch = ' + epoch + ' · stamp = ' + stamp + ' rebuilt';
          }
        }
      }

      if (confirmBox) {
        on(confirmBox, 'change', syncState);
      }

      if (forgetBtn) {
        on(forgetBtn, 'click', function () {
          if (erased || !confirmBox || !confirmBox.checked) return;
          erased = true;
          epoch = 5;
          syncState();
        });
      }

      if (rebuildBtn) {
        on(rebuildBtn, 'click', function () {
          if (stamp === epoch) return;
          stamp = epoch;
          syncState();
        });
      }

      if (resetBtn) {
        on(resetBtn, 'click', function () {
          epoch = 4;
          stamp = 4;
          erased = false;
          if (confirmBox) {
            confirmBox.checked = false;
            confirmBox.disabled = false;
          }
          syncState();
        });
      }

      syncState();
    });

    // 3. Assembly Gate Card (aestivation)
    Array.prototype.slice.call(root.querySelectorAll('[data-vi-gate-card]')).forEach(function (host) {
      if (host._viGateBound) return;
      host._viGateBound = true;
      cleanups.push(function () { host._viGateBound = false; });

      var SCENARIOS = {
        permitted: {
          digest: 'sha256: b85cf91',
          replan: 'Replan 1 / 2',
          verdict: 'permitted: true',
          dot: 'vi-fc-dot vi-fc-dot--ok',
          notice: 'vi-fc-notice vi-fc-notice--ok',
          reason: 'Valid plan, sound verdict ledger, and approve verdict on sha256: b85cf91.',
          orderStatus: 'Pass (review precedes assemble)',
          verdictJudge: 'reviewer-01',
          verdictDigest: 'sha256: b85cf91',
          verdictDecision: 'approve',
          verdictReasons: 'Rules pass; steps scoped within workspace',
        },
        'review-stale': {
          digest: 'sha256: c41e09a',
          replan: 'Replan 2 / 2',
          verdict: 'permitted: false · held: review-stale',
          dot: 'vi-fc-dot vi-fc-dot--warn',
          notice: 'vi-fc-notice vi-fc-notice--warn',
          reason: 'Step edit changed planDigest to sha256: c41e09a; latest verdict covered sha256: b85cf91.',
          orderStatus: 'Pass (review precedes assemble)',
          verdictJudge: 'reviewer-01',
          verdictDigest: 'sha256: b85cf91',
          verdictDecision: 'approve',
          verdictReasons: 'Approved prior digest sha256: b85cf91 only',
        },
        'revisions-requested': {
          digest: 'sha256: b85cf91',
          replan: 'Replan 1 / 2',
          verdict: 'permitted: false · held: revisions-requested',
          dot: 'vi-fc-dot vi-fc-dot--warn',
          notice: 'vi-fc-notice vi-fc-notice--warn',
          reason: 'Latest verdict is revise; gate stays closed until a revised proposal earns approval.',
          orderStatus: 'Pass (review precedes assemble)',
          verdictJudge: 'reviewer-02',
          verdictDigest: 'sha256: b85cf91',
          verdictDecision: 'revise',
          verdictReasons: 'Narrow test step before assembly stage',
        },
        'plan-invalid': {
          digest: 'sha256: d910f4c',
          replan: 'Replan 1 / 2',
          verdict: 'permitted: false · held: plan-invalid',
          dot: 'vi-fc-dot vi-fc-dot--danger',
          notice: 'vi-fc-notice vi-fc-notice--danger',
          reason: 'Deterministic rule failed (assemble placed before review); outranks approve verdict.',
          orderStatus: 'Fail (assemble before review)',
          verdictJudge: 'reviewer-01',
          verdictDigest: 'sha256: d910f4c',
          verdictDecision: 'approve',
          verdictReasons: 'Approve cannot waive rule 4 failure',
        },
      };

      var tabs = Array.prototype.slice.call(host.querySelectorAll('[data-gate-scenario]'));
      var digestEl = host.querySelector('[data-gate-digest]');
      var replanEl = host.querySelector('[data-gate-replan]');
      var bannerEl = host.querySelector('[data-gate-banner]');
      var dotEl = host.querySelector('[data-gate-dot]');
      var verdictEl = host.querySelector('[data-gate-verdict]');
      var reasonEl = host.querySelector('[data-gate-reason]');
      var orderRuleEl = host.querySelector('[data-gate-order-rule]');
      var vJudgeEl = host.querySelector('[data-gate-v-judge]');
      var vDigestEl = host.querySelector('[data-gate-v-digest]');
      var vDecisionEl = host.querySelector('[data-gate-v-decision]');
      var vReasonsEl = host.querySelector('[data-gate-v-reasons]');

      function applyScenario(key) {
        var s = SCENARIOS[key] || SCENARIOS.permitted;
        tabs.forEach(function (t) {
          var active = t.getAttribute('data-gate-scenario') === key;
          t.setAttribute('aria-selected', active ? 'true' : 'false');
          t.setAttribute('tabindex', active ? '0' : '-1');
        });
        if (digestEl) digestEl.textContent = s.digest;
        if (replanEl) replanEl.textContent = s.replan;
        if (bannerEl) bannerEl.className = s.notice;
        if (dotEl) dotEl.className = s.dot;
        if (verdictEl) verdictEl.textContent = s.verdict;
        if (reasonEl) reasonEl.textContent = s.reason;
        if (orderRuleEl) orderRuleEl.textContent = s.orderStatus;
        if (vJudgeEl) vJudgeEl.textContent = s.verdictJudge;
        if (vDigestEl) vDigestEl.textContent = s.verdictDigest;
        if (vDecisionEl) vDecisionEl.textContent = s.verdictDecision;
        if (vReasonsEl) vReasonsEl.textContent = s.verdictReasons;
      }

      bindTabListNavigation(tabs, function (tab) {
        applyScenario(tab.getAttribute('data-gate-scenario') || 'permitted');
      });

      applyScenario('permitted');
    });

    // 4. Hook Chain Inspector (drosera)
    Array.prototype.slice.call(root.querySelectorAll('[data-vi-hooks]')).forEach(function (host) {
      if (host._viHooksBound) return;
      host._viHooksBound = true;
      cleanups.push(function () { host._viHooksBound = false; });

      var tabs = Array.prototype.slice.call(host.querySelectorAll('[data-hook-filter]'));
      var rows = Array.prototype.slice.call(host.querySelectorAll('[data-hook-row]'));
      var statusEl = host.querySelector('[data-hook-status]');

      function applyFilter(eventFilter) {
        var key = eventFilter || 'all';
        tabs.forEach(function (t) {
          var active = t.getAttribute('data-hook-filter') === key;
          t.setAttribute('aria-selected', active ? 'true' : 'false');
          t.setAttribute('tabindex', active ? '0' : '-1');
        });
        var shown = 0;
        var blocked = 0;
        rows.forEach(function (row) {
          var evName = row.getAttribute('data-hook-event') || '';
          var match = key === 'all' || evName === key;
          row.hidden = !match;
          if (match) {
            shown += 1;
            if (row.getAttribute('data-hook-outcome') === 'blocked') blocked += 1;
          }
        });
        if (statusEl) {
          statusEl.textContent = shown + (shown === 1 ? ' hook shown' : ' hooks shown') + (blocked > 0 ? ' (' + blocked + ' blocked)' : ' (all passed)');
        }
      }

      bindTabListNavigation(tabs, function (tab) {
        applyFilter(tab.getAttribute('data-hook-filter') || 'all');
      });

      applyFilter('all');
    });

    // 5. Trellis Probe Matrix (trellis)
    Array.prototype.slice.call(root.querySelectorAll('[data-vi-trellis]')).forEach(function (host) {
      if (host._viTrellisBound) return;
      host._viTrellisBound = true;
      cleanups.push(function () { host._viTrellisBound = false; });

      var SCENARIOS = {
        clean: {
          verdictText: 'verdict: pass · 62 pass, 0 fail, 0 unknown',
          verdictDot: 'vi-fc-dot vi-fc-dot--ok',
          seedBehavior: '11 pass',
          seedOp: '1 pass',
          seedVerdict: 'pass',
          seedDot: 'vi-fc-dot vi-fc-dot--ok',
          droseraBehavior: '9 pass',
          droseraVerdict: 'pass',
          droseraDot: 'vi-fc-dot vi-fc-dot--ok',
          note: 'Exit code 0 across all 62 probes; every subject clean.',
        },
        unknown: {
          verdictText: 'verdict: unknown · 61 pass, 0 fail, 1 unknown',
          verdictDot: 'vi-fc-dot vi-fc-dot--warn',
          seedBehavior: '11 pass',
          seedOp: '1 unknown',
          seedVerdict: 'unknown',
          seedDot: 'vi-fc-dot vi-fc-dot--warn',
          droseraBehavior: '9 pass',
          droseraVerdict: 'pass',
          droseraDot: 'vi-fc-dot vi-fc-dot--ok',
          note: 'Older seed checkout holds 1 unknown operational probe; unknown rolls up to top verdict.',
        },
        fail: {
          verdictText: 'verdict: fail · 60 pass, 1 fail, 1 unknown',
          verdictDot: 'vi-fc-dot vi-fc-dot--danger',
          seedBehavior: '11 pass',
          seedOp: '1 unknown',
          seedVerdict: 'unknown',
          seedDot: 'vi-fc-dot vi-fc-dot--warn',
          droseraBehavior: '8 pass, 1 fail',
          droseraVerdict: 'fail',
          droseraDot: 'vi-fc-dot vi-fc-dot--danger',
          note: 'Strict rollup: 1 behavior fail outranks 1 unknown and 60 passes; no averaging.',
        },
      };

      var tabs = Array.prototype.slice.call(host.querySelectorAll('[data-trellis-scenario]'));
      var verdictDot = host.querySelector('[data-trellis-dot]');
      var verdictText = host.querySelector('[data-trellis-verdict]');
      var noteEl = host.querySelector('[data-trellis-note]');
      var seedBehEl = host.querySelector('[data-trellis-seed-behavior]');
      var seedOpEl = host.querySelector('[data-trellis-seed-op]');
      var seedDotEl = host.querySelector('[data-trellis-seed-dot]');
      var seedVerEl = host.querySelector('[data-trellis-seed-verdict]');
      var droBehEl = host.querySelector('[data-trellis-drosera-behavior]');
      var droDotEl = host.querySelector('[data-trellis-drosera-dot]');
      var droVerEl = host.querySelector('[data-trellis-drosera-verdict]');

      function applyScenario(key) {
        var s = SCENARIOS[key] || SCENARIOS.clean;
        tabs.forEach(function (t) {
          var active = t.getAttribute('data-trellis-scenario') === key;
          t.setAttribute('aria-selected', active ? 'true' : 'false');
          t.setAttribute('tabindex', active ? '0' : '-1');
        });
        if (verdictDot) verdictDot.className = s.verdictDot;
        if (verdictText) verdictText.textContent = s.verdictText;
        if (noteEl) noteEl.textContent = s.note;
        if (seedBehEl) seedBehEl.textContent = s.seedBehavior;
        if (seedOpEl) seedOpEl.textContent = s.seedOp;
        if (seedDotEl) seedDotEl.className = s.seedDot;
        if (seedVerEl) seedVerEl.textContent = s.seedVerdict;
        if (droBehEl) droBehEl.textContent = s.droseraBehavior;
        if (droDotEl) droDotEl.className = s.droseraDot;
        if (droVerEl) droVerEl.textContent = s.droseraVerdict;
      }

      bindTabListNavigation(tabs, function (tab) {
        applyScenario(tab.getAttribute('data-trellis-scenario') || 'clean');
      });

      applyScenario('clean');
    });

    return {
      destroy: function () {
        for (var i = 0; i < cleanups.length; i += 1) cleanups[i]();
        cleanups.length = 0;
      },
    };
  }

  return {
    initFamilyContracts: initFamilyContracts,
  };
});
