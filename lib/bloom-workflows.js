'use strict';

/**
 * Nocturne Museum: Progressive-enhancement controller for Bloom Workflows
 * (zero dependencies, CSP-safe, Shadow DOM compatible).
 *
 * Controllers:
 *   1. [data-vi-session-composer] - Coding session composer validation, sample starters & preview
 *   2. [data-vi-token-map]        - Deterministic context packer budget presets & file toggles
 *   3. [data-vi-seat-fanout]      - Ordered bounded seat fan-out & role inspection
 *   4. [data-vi-research-flow]    - Cited claims vs uncited gaps tabs & provenance URI inspection
 */

(function attachBloomWorkflows(rootGlobal, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (rootGlobal && typeof rootGlobal === 'object') {
    rootGlobal.ViBloomWorkflows = api;
  }
  if (typeof document !== 'undefined') {
    var boot = function bootBloomWorkflows() {
      api.initBloomWorkflows(document);
    };
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', boot, { once: true });
    } else {
      boot();
    }
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function createBloomWorkflowsApi() {
  var SAMPLE_TASKS = {
    research: {
      jurisdiction: 'Coordinate evidence extraction, source review, and guide assembly.',
      task: 'Create a researcher to extract claims from the attached sources, a reviewer to check them, and an assembler to write a guide. Flag any evidence gaps.',
    },
    audit: {
      jurisdiction: 'Inspect contract files and check schema coverage without mutating workspace files.',
      task: 'Inspect docs/contracts/ and check schema validation coverage across active tool faces.',
    },
  };

  var SEAT_DETAILS = {
    chair: {
      roleId: 'chair',
      stepIndex: '1 of 5',
      phase: 'plan',
      tools: 'workspace.tree.list, context.repo.pack.read',
      note: 'Plans bounded assignments; stores closed roleId only.',
    },
    framing: {
      roleId: 'framing',
      stepIndex: '2 of 5 (parallel cap 2)',
      phase: 'fanout',
      tools: 'context.repo.pack.read, workspace.file.outline.read',
      note: 'Frames scope and context packet bounds without modifying files.',
    },
    risk: {
      roleId: 'risk',
      stepIndex: '3 of 5 (parallel cap 2)',
      phase: 'fanout',
      tools: 'vcs.repo.diff.read, vcs.repo.log.read',
      note: 'Inspects change risk and schema boundaries; cannot widen allowedTools.',
    },
    coherence: {
      roleId: 'coherence',
      stepIndex: '4 of 5',
      phase: 'review',
      tools: 'deterministic check (0 model calls)',
      note: 'Checks file digests and invariants; revise verdict stops downstream assembly.',
    },
    sequencing: {
      roleId: 'sequencing',
      stepIndex: '5 of 5',
      phase: 'merge',
      tools: 'workspace.tree.list',
      note: 'Merges parallel outputs deterministically in original plan order.',
    },
  };

  var PROVENANCE_RECORDS = {
    'clm-01': {
      id: 'clm-01',
      status: 'cited',
      sourceId: 'src-seed-provider',
      digest: 'sha256:a98b4035f2c1',
      uri: 'https://github.com/Vidoxlabs/seed/blob/main/docs/contracts/provider.md',
    },
    'clm-02': {
      id: 'clm-02',
      status: 'cited',
      sourceId: 'src-capillary-retrieval',
      digest: 'sha256:71016924b8e3',
      uri: 'https://github.com/Vidoxlabs/capillary/blob/main/docs/contracts/retrieval.md',
    },
    'gap-01': {
      id: 'gap-01',
      status: 'uncited',
      sourceId: 'none (uncited gap)',
      digest: 'none recorded',
      uri: '',
    },
    'gap-02': {
      id: 'gap-02',
      status: 'uncited',
      sourceId: 'none (uncited gap)',
      digest: 'none recorded',
      uri: '',
    },
  };

  function setDotVariant(dotEl, variant) {
    if (!dotEl) return;
    dotEl.className = 'vi-bw-dot vi-bw-dot--' + variant;
    if (dotEl.classList) {
      dotEl.classList.remove('vi-bw-dot--ok', 'vi-bw-dot--warn', 'vi-bw-dot--danger', 'vi-bw-dot--info', 'vi-bw-dot--accent', 'vi-bw-dot--muted');
      dotEl.classList.add('vi-bw-dot', 'vi-bw-dot--' + variant);
    }
  }

  function barWidthClass(ratio) {
    if (ratio >= 0.92) return 'vi-bw-bar-fill--100';
    if (ratio >= 0.77) return 'vi-bw-bar-fill--85';
    if (ratio >= 0.62) return 'vi-bw-bar-fill--70';
    if (ratio >= 0.50) return 'vi-bw-bar-fill--55';
    if (ratio >= 0.37) return 'vi-bw-bar-fill--45';
    if (ratio >= 0.25) return 'vi-bw-bar-fill--30';
    if (ratio >= 0.15) return 'vi-bw-bar-fill--20';
    if (ratio > 0) return 'vi-bw-bar-fill--10';
    return 'vi-bw-bar-fill--0';
  }

  function setBarFill(barEl, ratio) {
    if (!barEl) return;
    var cls = barWidthClass(ratio);
    var sizes = ['vi-bw-bar-fill--100', 'vi-bw-bar-fill--85', 'vi-bw-bar-fill--70', 'vi-bw-bar-fill--55', 'vi-bw-bar-fill--45', 'vi-bw-bar-fill--30', 'vi-bw-bar-fill--20', 'vi-bw-bar-fill--10', 'vi-bw-bar-fill--0'];
    if (barEl.classList) {
      sizes.forEach(function (s) { barEl.classList.remove(s); });
      barEl.classList.add(cls);
    }
  }

  function initBloomWorkflows(container) {
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

    // 1. Session Setup Composer
    Array.prototype.slice.call(root.querySelectorAll('[data-vi-session-composer]')).forEach(function (host) {
      if (host._viBwSessionBound) return;
      host._viBwSessionBound = true;
      cleanups.push(function () { host._viBwSessionBound = false; });

      var formEl = host.querySelector('[data-session-form]');
      var headInput = host.querySelector('[data-session-head-name]');
      var jurInput = host.querySelector('[data-session-jurisdiction]');
      var modelInput = host.querySelector('[data-session-model]');
      var callsInput = host.querySelector('[data-session-calls]');
      var tokenInput = host.querySelector('[data-session-tokens]');
      var taskInput = host.querySelector('[data-session-task]');
      var sampleBtns = Array.prototype.slice.call(host.querySelectorAll('[data-session-sample]'));
      var statusEl = host.querySelector('[data-session-status]');
      var statusDot = host.querySelector('[data-session-dot]');
      var previewBanner = host.querySelector('[data-session-preview]');
      var previewText = host.querySelector('[data-session-preview-text]');

      sampleBtns.forEach(function (btn) {
        on(btn, 'click', function () {
          var key = btn.getAttribute('data-session-sample') || 'research';
          var sample = SAMPLE_TASKS[key] || SAMPLE_TASKS.research;
          if (jurInput && !jurInput.value.trim()) jurInput.value = sample.jurisdiction;
          if (taskInput) taskInput.value = sample.task;
          setDotVariant(statusDot, 'info');
          if (statusEl) statusEl.textContent = 'Sample task loaded into composer';
          if (previewBanner) previewBanner.hidden = true;
        });
      });

      function validateAndCreate() {
        var head = headInput ? headInput.value.trim() : '';
        var jur = jurInput ? jurInput.value.trim() : '';
        var model = modelInput && modelInput.value.trim() ? modelInput.value.trim() : 'Default';
        var rawCalls = callsInput ? Number(callsInput.value || 6) : 6;
        var calls = Math.max(1, Math.min(20, Math.round(Number.isFinite(rawCalls) ? rawCalls : 6)));
        var tokens = tokenInput && tokenInput.value.trim() ? tokenInput.value.trim() : 'unbounded';
        var task = taskInput ? taskInput.value.trim() : '';

        if (!head) {
          setDotVariant(statusDot, 'danger');
          if (statusEl) statusEl.textContent = 'Head agent name is required.';
          if (previewBanner) previewBanner.hidden = true;
          if (headInput && typeof headInput.focus === 'function') headInput.focus();
          return;
        }
        if (!jur) {
          setDotVariant(statusDot, 'danger');
          if (statusEl) statusEl.textContent = 'Enter Jurisdiction: what this head agent should be responsible for.';
          if (previewBanner) previewBanner.hidden = true;
          if (jurInput && typeof jurInput.focus === 'function') jurInput.focus();
          return;
        }

        setDotVariant(statusDot, 'ok');
        if (statusEl) {
          statusEl.textContent = 'Coding session ready · ' + head + ' in Scratch';
        }
        if (previewBanner) previewBanner.hidden = false;
        if (previewText) {
          previewText.textContent = 'Model: ' + model + ', Model calls: ' + calls + ', Token limit: ' + tokens + (task ? ', Task queued' : ', Awaiting first turn');
        }
      }

      if (formEl) {
        on(formEl, 'submit', function (ev) {
          if (ev && typeof ev.preventDefault === 'function') ev.preventDefault();
          validateAndCreate();
        });
      }
    });

    // 2. Symbol Outline & Token Map
    Array.prototype.slice.call(root.querySelectorAll('[data-vi-token-map]')).forEach(function (host) {
      if (host._viBwTokenBound) return;
      host._viBwTokenBound = true;
      cleanups.push(function () { host._viBwTokenBound = false; });

      var budgetBtns = Array.prototype.slice.call(host.querySelectorAll('[data-budget-preset]'));
      var rows = Array.prototype.slice.call(host.querySelectorAll('[data-token-file]'));
      var totalEl = host.querySelector('[data-token-total]');
      var omissionEl = host.querySelector('[data-token-omissions]');
      var statusEl = host.querySelector('[data-token-status]');

      var budget = 16000;

      function recompute() {
        var used = 0;
        var outOfBudgetCount = 0;
        var unknownCount = 0;
        var includedSupported = 0;

        rows.forEach(function (row) {
          var isUnknown = row.getAttribute('data-file-unknown') === 'true';
          var est = Number(row.getAttribute('data-file-estimate') || 0);
          var toggleBtn = row.querySelector('[data-file-toggle]');
          var stateLabel = row.querySelector('[data-file-state]');
          var stateDot = row.querySelector('[data-file-dot]');
          var barEl = row.querySelector('[data-file-bar]');
          var isIncluded = row.getAttribute('data-file-included') !== 'false';

          if (isUnknown) {
            unknownCount += 1;
            setBarFill(barEl, 0);
            return;
          }

          if (!isIncluded) {
            if (toggleBtn) {
              toggleBtn.setAttribute('aria-pressed', 'false');
              toggleBtn.textContent = 'Excluded';
            }
            if (stateLabel) stateLabel.textContent = 'excluded';
            setDotVariant(stateDot, 'muted');
            setBarFill(barEl, 0);
            return;
          }

          if (toggleBtn) {
            toggleBtn.setAttribute('aria-pressed', 'true');
            toggleBtn.textContent = 'Included';
          }

          if (used + est <= budget) {
            used += est;
            includedSupported += 1;
            if (stateLabel) stateLabel.textContent = 'admitted';
            setDotVariant(stateDot, 'ok');
            setBarFill(barEl, est / budget);
          } else {
            outOfBudgetCount += 1;
            if (stateLabel) stateLabel.textContent = 'out-of-budget';
            setDotVariant(stateDot, 'warn');
            setBarFill(barEl, 0);
          }
        });

        budgetBtns.forEach(function (btn) {
          var active = Number(btn.getAttribute('data-budget-preset') || 0) === budget;
          btn.setAttribute('aria-pressed', active ? 'true' : 'false');
        });

        if (totalEl) totalEl.textContent = used.toLocaleString('en-US') + ' / ' + budget.toLocaleString('en-US') + ' est. tokens';
        if (omissionEl) omissionEl.textContent = outOfBudgetCount + ' out-of-budget · ' + unknownCount + ' unknown';
        if (statusEl) {
          statusEl.textContent = includedSupported + ' admitted under ' + budget.toLocaleString('en-US') + ' estimate budget';
        }
      }

      budgetBtns.forEach(function (btn) {
        on(btn, 'click', function () {
          budget = Number(btn.getAttribute('data-budget-preset') || 16000);
          recompute();
        });
      });

      rows.forEach(function (row) {
        if (row.getAttribute('data-file-unknown') === 'true') return;
        var toggleBtn = row.querySelector('[data-file-toggle]');
        if (!toggleBtn) return;
        on(toggleBtn, 'click', function () {
          var cur = row.getAttribute('data-file-included') !== 'false';
          row.setAttribute('data-file-included', cur ? 'false' : 'true');
          recompute();
        });
      });

      recompute();
    });

    // 3. Seat Fanout Orchestrator
    Array.prototype.slice.call(root.querySelectorAll('[data-vi-seat-fanout]')).forEach(function (host) {
      if (host._viBwSeatBound) return;
      host._viBwSeatBound = true;
      cleanups.push(function () { host._viBwSeatBound = false; });

      var seatBtns = Array.prototype.slice.call(host.querySelectorAll('[data-seat-select]'));
      var seatRows = Array.prototype.slice.call(host.querySelectorAll('[data-seat-row]'));
      var runBtn = host.querySelector('[data-fanout-run]');
      var resetBtn = host.querySelector('[data-fanout-reset]');
      var detailRole = host.querySelector('[data-seat-detail-role]');
      var detailStep = host.querySelector('[data-seat-detail-step]');
      var detailTools = host.querySelector('[data-seat-detail-tools]');
      var detailNote = host.querySelector('[data-seat-detail-note]');
      var statusEl = host.querySelector('[data-fanout-status]');

      var phaseIdx = 0;
      var stepTimer = null;

      function clearStepTimer() {
        if (stepTimer !== null) {
          clearInterval(stepTimer);
          stepTimer = null;
        }
      }

      cleanups.push(clearStepTimer);

      function selectSeat(roleId) {
        var info = SEAT_DETAILS[roleId] || SEAT_DETAILS.chair;
        seatBtns.forEach(function (btn) {
          btn.setAttribute('aria-pressed', btn.getAttribute('data-seat-select') === roleId ? 'true' : 'false');
        });
        if (detailRole) detailRole.textContent = info.roleId + ' · phase ' + info.phase;
        if (detailStep) detailStep.textContent = info.stepIndex;
        if (detailTools) detailTools.textContent = info.tools;
        if (detailNote) detailNote.textContent = info.note;
      }

      function paintPhase(idx) {
        phaseIdx = idx;
        var mapByRole = {
          0: { chair: 'done', framing: 'queued', risk: 'queued', coherence: 'queued', sequencing: 'queued' },
          1: { chair: 'done', framing: 'running', risk: 'running', coherence: 'queued', sequencing: 'queued' },
          2: { chair: 'done', framing: 'done', risk: 'done', coherence: 'running', sequencing: 'queued' },
          3: { chair: 'done', framing: 'done', risk: 'done', coherence: 'done', sequencing: 'done' },
        };
        var stateMap = mapByRole[idx] || mapByRole[0];
        seatRows.forEach(function (row) {
          var r = row.getAttribute('data-seat-row');
          var st = stateMap[r] || 'queued';
          var stLbl = row.querySelector('[data-seat-state-label]');
          var stDot = row.querySelector('[data-seat-state-dot]');
          if (stLbl) stLbl.textContent = st;
          setDotVariant(stDot, st === 'done' ? 'ok' : (st === 'running' ? 'info' : 'muted'));
        });
        if (statusEl) {
          if (idx === 0) statusEl.textContent = 'Ready · chair planned bounded parallel fan-out (cap 2)';
          else if (idx === 1) statusEl.textContent = 'Running parallel fan-out · framing and risk active';
          else if (idx === 2) statusEl.textContent = 'Running deterministic verifier · coherence (0 model calls)';
          else statusEl.textContent = 'Complete · sequencing merged all 5 seats in plan order';
        }
      }

      seatBtns.forEach(function (btn) {
        on(btn, 'click', function () {
          selectSeat(btn.getAttribute('data-seat-select') || 'chair');
        });
      });

      if (runBtn) {
        on(runBtn, 'click', function () {
          clearStepTimer();
          var reduced = false;
          if (typeof document !== 'undefined' && document.documentElement) {
            var dm = document.documentElement.getAttribute('data-motion');
            if (dm === 'paused' || dm === 'reduced') reduced = true;
          }
          if (reduced) {
            paintPhase(3);
            return;
          }
          paintPhase(phaseIdx >= 3 ? 1 : phaseIdx + 1);
          if (phaseIdx < 3) {
            stepTimer = setInterval(function () {
              if (phaseIdx < 3) {
                paintPhase(phaseIdx + 1);
              } else {
                clearStepTimer();
              }
            }, 450);
          }
        });
      }

      if (resetBtn) {
        on(resetBtn, 'click', function () {
          clearStepTimer();
          paintPhase(0);
          selectSeat('chair');
        });
      }

      selectSeat('chair');
      paintPhase(0);
    });

    // 4. Research Flow Tracker
    Array.prototype.slice.call(root.querySelectorAll('[data-vi-research-flow]')).forEach(function (host) {
      if (host._viBwResearchBound) return;
      host._viBwResearchBound = true;
      cleanups.push(function () { host._viBwResearchBound = false; });

      var tabs = Array.prototype.slice.call(host.querySelectorAll('[data-research-tab]'));
      var panelEl = host.querySelector('[data-research-panel]');
      var items = Array.prototype.slice.call(host.querySelectorAll('[data-research-item]'));
      var inspectBtns = Array.prototype.slice.call(host.querySelectorAll('[data-inspect-claim]'));
      var provIdEl = host.querySelector('[data-prov-id]');
      var provStatusEl = host.querySelector('[data-prov-status]');
      var provSourceEl = host.querySelector('[data-prov-source]');
      var provDigestEl = host.querySelector('[data-prov-digest]');
      var provUriEl = host.querySelector('[data-prov-uri]');
      var provNoneEl = host.querySelector('[data-prov-none]');
      var statusEl = host.querySelector('[data-research-status]');

      var activeTab = 'cited';

      function renderTab() {
        var visible = 0;
        items.forEach(function (item) {
          var kind = item.getAttribute('data-claim-kind') || '';
          var show = kind === activeTab;
          item.hidden = !show;
          if (show) visible += 1;
        });
        tabs.forEach(function (tab) {
          var sel = tab.getAttribute('data-research-tab') === activeTab;
          tab.setAttribute('aria-selected', sel ? 'true' : 'false');
          tab.setAttribute('tabindex', sel ? '0' : '-1');
          if (sel && panelEl && tab.id) {
            panelEl.setAttribute('aria-labelledby', tab.id);
          }
        });
        if (statusEl) {
          statusEl.textContent = activeTab === 'cited'
            ? 'Showing ' + visible + ' cited claims backed by capillary sources'
            : 'Showing ' + visible + ' uncited gaps lacking supporting sources';
        }
      }

      function inspectClaim(claimId) {
        var rec = PROVENANCE_RECORDS[claimId] || PROVENANCE_RECORDS['clm-01'];
        inspectBtns.forEach(function (b) {
          b.setAttribute('aria-pressed', b.getAttribute('data-inspect-claim') === rec.id ? 'true' : 'false');
        });
        if (provIdEl) provIdEl.textContent = rec.id;
        if (provStatusEl) provStatusEl.textContent = rec.status;
        if (provSourceEl) provSourceEl.textContent = rec.sourceId;
        if (provDigestEl) provDigestEl.textContent = rec.digest;
        if (rec.uri) {
          if (provUriEl) {
            provUriEl.hidden = false;
            provUriEl.textContent = rec.uri;
            provUriEl.setAttribute('href', rec.uri);
          }
          if (provNoneEl) provNoneEl.hidden = true;
        } else {
          if (provUriEl) provUriEl.hidden = true;
          if (provNoneEl) provNoneEl.hidden = false;
        }
      }

      tabs.forEach(function (tab, idx) {
        on(tab, 'click', function () {
          activeTab = tab.getAttribute('data-research-tab') || 'cited';
          renderTab();
          inspectClaim(activeTab === 'cited' ? 'clm-01' : 'gap-01');
        });
        on(tab, 'keydown', function (ev) {
          var next = -1;
          if (ev.key === 'ArrowRight') next = (idx + 1) % tabs.length;
          else if (ev.key === 'ArrowLeft') next = (idx - 1 + tabs.length) % tabs.length;
          else if (ev.key === 'Home') next = 0;
          else if (ev.key === 'End') next = tabs.length - 1;
          if (next === -1) return;
          ev.preventDefault();
          activeTab = tabs[next].getAttribute('data-research-tab') || 'cited';
          renderTab();
          inspectClaim(activeTab === 'cited' ? 'clm-01' : 'gap-01');
          if (typeof tabs[next].focus === 'function') tabs[next].focus();
        });
      });

      inspectBtns.forEach(function (btn) {
        on(btn, 'click', function () {
          inspectClaim(btn.getAttribute('data-inspect-claim') || 'clm-01');
        });
      });

      renderTab();
      inspectClaim('clm-01');
    });

    return {
      destroy: function () {
        for (var i = 0; i < cleanups.length; i += 1) cleanups[i]();
        cleanups.length = 0;
      },
    };
  }

  return {
    initBloomWorkflows: initBloomWorkflows,
  };
});
