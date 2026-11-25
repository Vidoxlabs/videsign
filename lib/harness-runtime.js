'use strict';

/**
 * Nocturne Museum: Progressive-enhancement controller for Harness Runtime Components
 * (zero dependencies, CSP-safe, Shadow DOM compatible).
 *
 * Controllers:
 *   1. [data-vi-schema-repair]   -- CAP-03 typed tool I/O schema validator & 1-turn repair budget
 *   2. [data-vi-sandbox-policy]  -- CAP-17 + CAP-04 containment & shell allowlist probe gate
 *   3. [data-vi-owner-decision]  -- CAP-06 digest-bound owner gate decision editor
 *   4. [data-vi-step-graph]      -- CAP-12 step-graph checkpoint, durability & interrupt resume
 */

(function attachHarnessRuntime(rootGlobal, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (rootGlobal && typeof rootGlobal === 'object') {
    rootGlobal.ViHarnessRuntime = api;
  }
  if (typeof document !== 'undefined') {
    var boot = function bootHarnessRuntime() {
      api.initHarnessRuntime(document);
    };
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', boot, { once: true });
    } else {
      boot();
    }
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function createHarnessRuntimeApi() {
  function initHarnessRuntime(container) {
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

    // 1. Schema Validation & 1-Turn Repair (CAP-03)
    Array.prototype.slice.call(root.querySelectorAll('[data-vi-schema-repair]')).forEach(function (host) {
      if (host._viSchemaBound) return;
      host._viSchemaBound = true;
      cleanups.push(function () { host._viSchemaBound = false; });

      var inspectBtn = host.querySelector('[data-schema-inspect]');
      var repairBtn = host.querySelector('[data-schema-repair]');
      var resetBtn = host.querySelector('[data-schema-reset]');
      var dotEl = host.querySelector('[data-schema-dot]');
      var statusEl = host.querySelector('[data-schema-status]');
      var budgetEl = host.querySelector('[data-schema-budget]');
      var payloadEl = host.querySelector('[data-schema-payload]');
      var diagList = host.querySelector('[data-schema-diags]');
      var validBanner = host.querySelector('[data-schema-valid-banner]');

      var FAILING_PAYLOAD = '{"tool":"workspace.file.write","args":{"path":"","content":"ok"},"sandbox":{"allowShell":true}}';
      var SECOND_FAIL_PAYLOAD = '{"tool":"workspace.file.write","args":{"path":"","content":"ok"},"sandbox":{"allowShell":false}}';
      var REPAIRED_PAYLOAD = '{"tool":"workspace.file.write","args":{"path":"src/index.mjs","content":"export const ok = true;"}}';

      // phase: 'initial' | 'inspected' | 'repaired' | 'malformed'
      var phase = 'initial';

      function syncView() {
        if (phase === 'initial' || phase === 'inspected') {
          if (dotEl) dotEl.className = 'vi-hr-dot vi-hr-dot--warn';
          if (statusEl) {
            statusEl.textContent = phase === 'inspected'
              ? 'schema-invalid (tool executor blocked; 1 repair turn available)'
              : 'schema-invalid (pre-dispatch validation blocked)';
          }
          if (budgetEl) budgetEl.textContent = 'Turn 1 of 1';
          if (payloadEl) payloadEl.textContent = FAILING_PAYLOAD;
          if (diagList) diagList.hidden = false;
          if (validBanner) validBanner.hidden = true;
          if (repairBtn) {
            repairBtn.disabled = false;
            repairBtn.setAttribute('aria-disabled', 'false');
          }
        } else if (phase === 'repaired') {
          if (dotEl) dotEl.className = 'vi-hr-dot vi-hr-dot--ok';
          if (statusEl) statusEl.textContent = 'Valid inputSchema (ready for dispatch; 1-turn budget spent)';
          if (budgetEl) budgetEl.textContent = 'Turn 1 of 1 spent';
          if (payloadEl) payloadEl.textContent = REPAIRED_PAYLOAD;
          if (diagList) diagList.hidden = true;
          if (validBanner) validBanner.hidden = false;
          if (repairBtn) {
            repairBtn.disabled = true;
            repairBtn.setAttribute('aria-disabled', 'true');
          }
        } else {
          if (dotEl) dotEl.className = 'vi-hr-dot vi-hr-dot--danger';
          if (statusEl) statusEl.textContent = 'malformed (1-turn repair budget exhausted; stopped)';
          if (budgetEl) budgetEl.textContent = 'Turn 1 of 1 exhausted';
          if (payloadEl) payloadEl.textContent = SECOND_FAIL_PAYLOAD;
          if (diagList) diagList.hidden = false;
          if (validBanner) validBanner.hidden = true;
          if (repairBtn) {
            repairBtn.disabled = true;
            repairBtn.setAttribute('aria-disabled', 'true');
          }
        }
      }

      if (inspectBtn) {
        on(inspectBtn, 'click', function () {
          phase = phase === 'repaired' ? 'malformed' : 'inspected';
          syncView();
        });
      }

      if (repairBtn) {
        on(repairBtn, 'click', function () {
          if (phase === 'repaired' || phase === 'malformed') return;
          phase = 'repaired';
          syncView();
        });
      }

      if (resetBtn) {
        on(resetBtn, 'click', function () {
          phase = 'initial';
          syncView();
        });
      }

      syncView();
    });

    // 2. Sandbox Scope & Shell Policy (CAP-17 + CAP-04)
    Array.prototype.slice.call(root.querySelectorAll('[data-vi-sandbox-policy]')).forEach(function (host) {
      if (host._viSandboxBound) return;
      host._viSandboxBound = true;
      cleanups.push(function () { host._viSandboxBound = false; });

      var shellToggle = host.querySelector('[data-sandbox-shell-toggle]');
      var shellLabel = host.querySelector('[data-sandbox-shell-label]');
      var probeTabs = Array.prototype.slice.call(host.querySelectorAll('[data-sandbox-probe]'));
      var bannerEl = host.querySelector('[data-sandbox-verdict-banner]');
      var dotEl = host.querySelector('[data-sandbox-dot]');
      var verdictEl = host.querySelector('[data-sandbox-verdict]');
      var targetEl = host.querySelector('[data-sandbox-target]');
      var reasonEl = host.querySelector('[data-sandbox-reason]');

      var allowShell = false;
      var activeProbe = 'read-workspace';

      function evaluateProbe() {
        var verdict = 'Deny';
        var dotCls = 'vi-hr-dot vi-hr-dot--danger';
        var bannerCls = 'vi-hr-notice vi-hr-notice--danger';
        var target = '';
        var reason = '';

        if (activeProbe === 'read-workspace') {
          verdict = 'Allow';
          dotCls = 'vi-hr-dot vi-hr-dot--ok';
          bannerCls = 'vi-hr-notice vi-hr-notice--ok';
          target = 'workspace.file.read -> primary/src/index.mjs';
          reason = 'Path normalizes inside declared root primary (read-write); no symlink escape.';
        } else if (activeProbe === 'escape-parent') {
          verdict = 'Deny (policy-denied)';
          target = 'workspace.file.read -> primary/../secrets/env.json';
          reason = 'Virtual path contains parent traversal .. outside admitted workspace roots; refused before I/O.';
        } else if (activeProbe === 'git-status') {
          target = 'workspace.shell.execute -> git status';
          if (allowShell) {
            verdict = 'Allow (per-call owner gate required)';
            dotCls = 'vi-hr-dot vi-hr-dot--ok';
            bannerCls = 'vi-hr-notice vi-hr-notice--ok';
            reason = 'allowShell: true enabled; git is allowlisted, local-only, and free of banned config flags.';
          } else {
            verdict = 'Deny (policy-denied)';
            reason = 'Shell execution is disabled by default (allowShell: false); toggle opt-in required with owner approval.';
          }
        } else {
          verdict = 'Deny (policy-denied)';
          target = 'workspace.shell.execute -> git push --force';
          reason = 'Remote git push and --force violate local-only allowlist policy even when allowShell is true.';
        }

        if (bannerEl) bannerEl.className = bannerCls;
        if (dotEl) dotEl.className = dotCls;
        if (verdictEl) verdictEl.textContent = verdict;
        if (targetEl) targetEl.textContent = target;
        if (reasonEl) reasonEl.textContent = reason;
      }

      if (shellToggle) {
        on(shellToggle, 'click', function () {
          allowShell = shellToggle.getAttribute('aria-checked') !== 'true';
          shellToggle.setAttribute('aria-checked', allowShell ? 'true' : 'false');
          if (shellLabel) shellLabel.textContent = allowShell ? 'allowShell: true' : 'allowShell: false';
          evaluateProbe();
        });
      }

      bindTabListNavigation(probeTabs, function (tab) {
        activeProbe = tab.getAttribute('data-sandbox-probe') || 'read-workspace';
        probeTabs.forEach(function (t) {
          var selected = t.getAttribute('data-sandbox-probe') === activeProbe;
          t.setAttribute('aria-selected', selected ? 'true' : 'false');
          t.setAttribute('tabindex', selected ? '0' : '-1');
        });
        evaluateProbe();
      });

      evaluateProbe();
    });

    // 3. Owner Decision Editor (CAP-06)
    Array.prototype.slice.call(root.querySelectorAll('[data-vi-owner-decision]')).forEach(function (host) {
      if (host._viOwnerBound) return;
      host._viOwnerBound = true;
      cleanups.push(function () { host._viOwnerBound = false; });

      var TIERS = {
        standard: {
          toolId: 'workspace.file.update',
          effect: 'write',
          argsDigest: 'sha256: 4b9e1d0',
          egress: 'false',
          defaultEditJson: '{\n  "path": "src/index.mjs",\n  "oldText": "v1",\n  "newText": "v2"\n}',
        },
        credential: {
          toolId: 'vault.token.bind',
          effect: 'credential',
          argsDigest: 'sha256: 7f3a81c',
          egress: 'false',
          defaultEditJson: '{\n  "scope": "repo:runbooks:read",\n  "ttlSeconds": 300\n}',
        },
        destructive: {
          toolId: 'workspace.cache.purge',
          effect: 'destructive',
          argsDigest: 'sha256: 9c2d10e',
          egress: 'false',
          defaultEditJson: '{\n  "shard": "local-projections",\n  "dryRun": true\n}',
        },
      };

      var tierTabs = Array.prototype.slice.call(host.querySelectorAll('[data-risk-tier]'));
      var decisionBtns = Array.prototype.slice.call(host.querySelectorAll('[data-decision-kind]'));
      var toolEl = host.querySelector('[data-owner-tool]');
      var effectEl = host.querySelector('[data-owner-effect]');
      var digestEl = host.querySelector('[data-owner-digest]');
      var guardEl = host.querySelector('[data-decision-guard]');
      var editPanel = host.querySelector('[data-decision-edit-panel]');
      var editArea = host.querySelector('[data-decision-edit-json]');
      var rejectPanel = host.querySelector('[data-decision-reject-panel]');
      var rejectInput = host.querySelector('[data-decision-reject-reason]');
      var respondPanel = host.querySelector('[data-decision-respond-panel]');
      var respondInput = host.querySelector('[data-decision-respond-text]');
      var commitBtn = host.querySelector('[data-decision-commit]');
      var resetBtn = host.querySelector('[data-decision-reset]');
      var receiptEl = host.querySelector('[data-decision-receipt]');
      var receiptDot = host.querySelector('[data-decision-receipt-dot]');
      var receiptText = host.querySelector('[data-decision-receipt-text]');

      var currentTier = 'standard';
      var currentDecision = 'approve';

      function syncControls() {
        var tier = TIERS[currentTier] || TIERS.standard;
        var privileged = currentTier === 'credential' || currentTier === 'destructive';

        if (privileged && currentDecision === 'respond') {
          currentDecision = 'approve';
        }

        tierTabs.forEach(function (t) {
          var selected = t.getAttribute('data-risk-tier') === currentTier;
          t.setAttribute('aria-selected', selected ? 'true' : 'false');
          t.setAttribute('tabindex', selected ? '0' : '-1');
        });

        decisionBtns.forEach(function (b) {
          var kind = b.getAttribute('data-decision-kind');
          var isRespond = kind === 'respond';
          var disabled = privileged && isRespond;
          b.disabled = disabled;
          b.setAttribute('aria-disabled', disabled ? 'true' : 'false');
          b.setAttribute('aria-checked', kind === currentDecision ? 'true' : 'false');
        });

        if (toolEl) toolEl.textContent = tier.toolId;
        if (effectEl) effectEl.textContent = tier.effect;
        if (digestEl) digestEl.textContent = tier.argsDigest;
        if (guardEl) guardEl.hidden = !privileged;
        if (editPanel) editPanel.hidden = currentDecision !== 'edit';
        if (rejectPanel) rejectPanel.hidden = currentDecision !== 'reject';
        if (respondPanel) respondPanel.hidden = currentDecision !== 'respond';
      }

      bindTabListNavigation(tierTabs, function (tab) {
        currentTier = tab.getAttribute('data-risk-tier') || 'standard';
        if (editArea && TIERS[currentTier]) {
          editArea.value = TIERS[currentTier].defaultEditJson;
        }
        if (receiptEl) receiptEl.className = 'vi-hr-notice vi-hr-notice--accent';
        if (receiptDot) receiptDot.className = 'vi-hr-dot vi-hr-dot--accent';
        if (receiptText) receiptText.textContent = 'waiting_for_owner: pending decision on ' + (TIERS[currentTier] ? TIERS[currentTier].toolId : '');
        syncControls();
      });

      decisionBtns.forEach(function (btn) {
        on(btn, 'click', function () {
          if (btn.disabled || btn.getAttribute('aria-disabled') === 'true') return;
          currentDecision = btn.getAttribute('data-decision-kind') || 'approve';
          syncControls();
        });
      });

      if (commitBtn) {
        on(commitBtn, 'click', function () {
          var tier = TIERS[currentTier] || TIERS.standard;
          if (currentDecision === 'edit') {
            var raw = editArea ? editArea.value.trim() : '';
            var parsedOk = false;
            try {
              var obj = JSON.parse(raw);
              parsedOk = Boolean(obj && typeof obj === 'object' && !Array.isArray(obj));
            } catch (e) {
              parsedOk = false;
            }
            if (!parsedOk) {
              if (receiptEl) receiptEl.className = 'vi-hr-notice vi-hr-notice--danger';
              if (receiptDot) receiptDot.className = 'vi-hr-dot vi-hr-dot--danger';
              if (receiptText) receiptText.textContent = 'Edit refused: replacement args must be a valid JSON object matching inputSchema.';
              return;
            }
            if (receiptEl) receiptEl.className = 'vi-hr-notice vi-hr-notice--ok';
            if (receiptDot) receiptDot.className = 'vi-hr-dot vi-hr-dot--ok';
            if (receiptText) {
              receiptText.textContent = 'Recorded edit on ' + tier.toolId + ' (editedArgsDigest sha256: e7c3a12; linked ' + tier.argsDigest + ').';
            }
            return;
          }

          if (currentDecision === 'reject') {
            var reason = rejectInput ? rejectInput.value.trim() : '';
            if (!reason) {
              if (receiptEl) receiptEl.className = 'vi-hr-notice vi-hr-notice--danger';
              if (receiptDot) receiptDot.className = 'vi-hr-dot vi-hr-dot--danger';
              if (receiptText) receiptText.textContent = 'Rejection requires a non-empty reason before committing.';
              return;
            }
            if (receiptEl) receiptEl.className = 'vi-hr-notice vi-hr-notice--warn';
            if (receiptDot) receiptDot.className = 'vi-hr-dot vi-hr-dot--warn';
            if (receiptText) {
              receiptText.textContent = 'Recorded reject on ' + tier.toolId + ' (gate-denied; reason: ' + reason + ').';
            }
            return;
          }

          if (currentDecision === 'respond') {
            var reply = respondInput ? respondInput.value.trim() : '';
            if (!reply) {
              if (receiptEl) receiptEl.className = 'vi-hr-notice vi-hr-notice--danger';
              if (receiptDot) receiptDot.className = 'vi-hr-dot vi-hr-dot--danger';
              if (receiptText) receiptText.textContent = 'Respond requires non-empty owner reply text.';
              return;
            }
            if (receiptEl) receiptEl.className = 'vi-hr-notice vi-hr-notice--ok';
            if (receiptDot) receiptDot.className = 'vi-hr-dot vi-hr-dot--ok';
            if (receiptText) {
              receiptText.textContent = 'Recorded respond (tool skipped; owner input delivered: "' + reply + '").';
            }
            return;
          }

          if (receiptEl) receiptEl.className = 'vi-hr-notice vi-hr-notice--ok';
          if (receiptDot) receiptDot.className = 'vi-hr-dot vi-hr-dot--ok';
          if (receiptText) {
            receiptText.textContent = 'Recorded approve on ' + tier.toolId + ' bound to ' + tier.argsDigest + '.';
          }
        });
      }

      if (resetBtn) {
        on(resetBtn, 'click', function () {
          currentTier = 'standard';
          currentDecision = 'approve';
          if (editArea) editArea.value = TIERS.standard.defaultEditJson;
          if (rejectInput) rejectInput.value = 'Scope exceeds target file';
          if (respondInput) respondInput.value = 'Keep existing header copy';
          if (receiptEl) receiptEl.className = 'vi-hr-notice vi-hr-notice--accent';
          if (receiptDot) receiptDot.className = 'vi-hr-dot vi-hr-dot--accent';
          if (receiptText) receiptText.textContent = 'waiting_for_owner: pending decision on workspace.file.update';
          syncControls();
        });
      }

      syncControls();
    });

    // 4. Step Graph Checkpoint & Interrupt (CAP-12)
    Array.prototype.slice.call(root.querySelectorAll('[data-vi-step-graph]')).forEach(function (host) {
      if (host._viGraphBound) return;
      host._viGraphBound = true;
      cleanups.push(function () { host._viGraphBound = false; });

      var DURABILITY_NOTES = {
        'per-step': 'Persist checkpoint after every step before advancing; never silently downgraded.',
        'on-interrupt': 'Persist checkpoint at interrupts, failures, and completion.',
        none: 'In-memory frontier only; matches linear resumeSteps with no persistent checkpoint writes.',
      };

      var durTabs = Array.prototype.slice.call(host.querySelectorAll('[data-durability-mode]'));
      var interruptBtn = host.querySelector('[data-graph-interrupt]');
      var resumeBtn = host.querySelector('[data-graph-resume]');
      var resetBtn = host.querySelector('[data-graph-reset]');
      var dotEl = host.querySelector('[data-graph-dot]');
      var statusEl = host.querySelector('[data-graph-status]');
      var durNoteEl = host.querySelector('[data-graph-durability-note]');
      var frontierEl = host.querySelector('[data-graph-frontier]');
      var step3Row = host.querySelector('[data-graph-step="review"]');
      var step3State = host.querySelector('[data-graph-step-state="review"]');

      var durability = 'per-step';
      // graphPhase: 'active' | 'interrupted' | 'resumed'
      var graphPhase = 'active';

      function syncGraph() {
        durTabs.forEach(function (t) {
          var selected = t.getAttribute('data-durability-mode') === durability;
          t.setAttribute('aria-selected', selected ? 'true' : 'false');
          t.setAttribute('tabindex', selected ? '0' : '-1');
        });
        if (durNoteEl) durNoteEl.textContent = DURABILITY_NOTES[durability] || DURABILITY_NOTES['per-step'];

        if (graphPhase === 'active') {
          if (dotEl) dotEl.className = 'vi-hr-dot vi-hr-dot--info';
          if (statusEl) statusEl.textContent = 'Running · frontier seq 2 (cp-02)';
          if (frontierEl) frontierEl.textContent = 'cp-02 (parent: cp-01; mode: ' + durability + ')';
          if (step3Row) step3Row.className = 'vi-hr-row vi-hr-row--compact vi-hr-row--active';
          if (step3State) step3State.textContent = 'Active';
          if (interruptBtn) {
            interruptBtn.disabled = false;
            interruptBtn.setAttribute('aria-disabled', 'false');
          }
          if (resumeBtn) {
            resumeBtn.disabled = true;
            resumeBtn.setAttribute('aria-disabled', 'true');
          }
        } else if (graphPhase === 'interrupted') {
          if (dotEl) dotEl.className = 'vi-hr-dot vi-hr-dot--warn';
          if (statusEl) statusEl.textContent = 'Interrupted (waiting_for_owner; 1 recordedIntent pending)';
          if (frontierEl) frontierEl.textContent = 'cp-02 held (parent: cp-01; mode: ' + durability + ')';
          if (step3Row) step3Row.className = 'vi-hr-row vi-hr-row--compact vi-hr-row--warn';
          if (step3State) step3State.textContent = 'Interrupted';
          if (interruptBtn) {
            interruptBtn.disabled = true;
            interruptBtn.setAttribute('aria-disabled', 'true');
          }
          if (resumeBtn) {
            resumeBtn.disabled = false;
            resumeBtn.setAttribute('aria-disabled', 'false');
          }
        } else {
          if (dotEl) dotEl.className = 'vi-hr-dot vi-hr-dot--ok';
          if (statusEl) statusEl.textContent = 'Resumed from cp-02 · frontier seq 3 (cp-03)';
          if (frontierEl) frontierEl.textContent = 'cp-03 (parent: cp-02; mode: ' + durability + ')';
          if (step3Row) step3Row.className = 'vi-hr-row vi-hr-row--compact vi-hr-row--active';
          if (step3State) step3State.textContent = 'Checkpointed (cp-03)';
          if (interruptBtn) {
            interruptBtn.disabled = false;
            interruptBtn.setAttribute('aria-disabled', 'false');
          }
          if (resumeBtn) {
            resumeBtn.disabled = true;
            resumeBtn.setAttribute('aria-disabled', 'true');
          }
        }
      }

      bindTabListNavigation(durTabs, function (tab) {
        durability = tab.getAttribute('data-durability-mode') || 'per-step';
        syncGraph();
      });

      if (interruptBtn) {
        on(interruptBtn, 'click', function () {
          if (graphPhase === 'interrupted') return;
          graphPhase = 'interrupted';
          syncGraph();
        });
      }

      if (resumeBtn) {
        on(resumeBtn, 'click', function () {
          if (graphPhase !== 'interrupted') return;
          graphPhase = 'resumed';
          syncGraph();
        });
      }

      if (resetBtn) {
        on(resetBtn, 'click', function () {
          durability = 'per-step';
          graphPhase = 'active';
          syncGraph();
        });
      }

      syncGraph();
    });

    return {
      destroy: function () {
        for (var i = 0; i < cleanups.length; i += 1) cleanups[i]();
        cleanups.length = 0;
      },
    };
  }

  return {
    initHarnessRuntime: initHarnessRuntime,
  };
});
