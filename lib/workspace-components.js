'use strict';

/**
 * Nocturne Museum: Progressive-enhancement controller for Workspace & Conversation Components
 * (zero dependencies, CSP-safe, Shadow DOM compatible).
 *
 * Controllers:
 *   1. [data-vi-voice-bar]       - Idle / Listening / Review / Mic blocked dictation presets & controls
 *   2. [data-vi-input-request]   - WAI-ARIA radiogroup clarification prompt + collapsed receipt + Reopen
 *   3. [data-vi-run-plan]        - Execution plan All / Open filter preserving step numbers & blocker details
 *   4. [data-vi-inbox]           - Tabbed notification inbox (All / Unread / Approvals), Mark read, Empty + Restore
 */

(function attachWorkspaceComponents(rootGlobal, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (rootGlobal && typeof rootGlobal === 'object') {
    rootGlobal.ViWorkspaceComponents = api;
  }
  if (typeof document !== 'undefined') {
    var boot = function bootWorkspace() {
      api.initWorkspaceComponents(document);
    };
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', boot, { once: true });
    } else {
      boot();
    }
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function createWorkspaceComponentsApi() {
  function initWorkspaceComponents(container) {
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

    // 1. Voice Capture Bar
    Array.prototype.slice.call(root.querySelectorAll('[data-vi-voice-bar]')).forEach(function (host) {
      if (host._viWsVoiceBound) return;
      host._viWsVoiceBound = true;
      cleanups.push(function () { host._viWsVoiceBound = false; });

      var modeBtns = Array.prototype.slice.call(host.querySelectorAll('[data-voice-mode]'));
      var panels = Array.prototype.slice.call(host.querySelectorAll('[data-voice-panel]'));
      var timerEl = host.querySelector('[data-voice-timer]');
      var transcriptInput = host.querySelector('[data-voice-transcript]');
      var holdBtn = host.querySelector('[data-voice-hold]');
      var stopBtn = host.querySelector('[data-voice-stop]');
      var sendBtn = host.querySelector('[data-voice-send]');
      var discardBtns = Array.prototype.slice.call(host.querySelectorAll('[data-voice-discard]'));
      var retryBtn = host.querySelector('[data-voice-retry]');
      var receiptEl = host.querySelector('[data-voice-receipt]');
      var modeNoteEl = host.querySelector('[data-voice-mode-note]');

      var seconds = 8;
      var tickId = null;
      var holdDownAt = 0;
      var holdPointerActive = false;

      function pad2(n) {
        return n < 10 ? '0' + n : String(n);
      }

      function formatTimer(sec) {
        var clamped = Math.max(0, Math.min(120, sec));
        var mins = Math.floor(clamped / 60);
        var rem = clamped % 60;
        return pad2(mins) + ':' + pad2(rem) + ' / 02:00';
      }

      function stopTicker() {
        if (tickId !== null) {
          clearInterval(tickId);
          tickId = null;
        }
      }

      cleanups.push(stopTicker);

      function syncSendDisabled() {
        if (!sendBtn || !transcriptInput) return;
        var hasText = transcriptInput.value.trim().length > 0;
        sendBtn.disabled = !hasText;
        sendBtn.setAttribute('aria-disabled', hasText ? 'false' : 'true');
      }

      function setMode(mode, options) {
        var opts = options || {};
        stopTicker();
        host.setAttribute('data-voice-state', mode);
        modeBtns.forEach(function (btn) {
          btn.setAttribute('aria-pressed', btn.getAttribute('data-voice-mode') === mode ? 'true' : 'false');
        });
        panels.forEach(function (panel) {
          panel.hidden = panel.getAttribute('data-voice-panel') !== mode;
        });

        if (mode === 'listening') {
          seconds = typeof opts.startSeconds === 'number' ? opts.startSeconds : 8;
          if (timerEl) timerEl.textContent = formatTimer(seconds);
          if (opts.liveTick) {
            tickId = setInterval(function () {
              if (seconds < 120) {
                seconds += 1;
                if (timerEl) timerEl.textContent = formatTimer(seconds);
              } else {
                setMode('review');
              }
            }, 1000);
          }
          if (receiptEl && !opts.keepReceipt) {
            receiptEl.textContent = 'Capturing locally · confirmation required before send';
          }
          if (modeNoteEl) modeNoteEl.textContent = 'Listening state';
        } else if (mode === 'review') {
          if (transcriptInput && !transcriptInput.value.trim() && opts.restoreDefault) {
            transcriptInput.value = 'Summarize the schema diff before release review';
          }
          syncSendDisabled();
          if (receiptEl && !opts.keepReceipt) {
            receiptEl.textContent = 'Ready for review · edit transcript or send';
          }
          if (modeNoteEl) modeNoteEl.textContent = 'Review state';
          if (opts.focusInput && transcriptInput && typeof transcriptInput.focus === 'function') {
            transcriptInput.focus();
          }
        } else if (mode === 'blocked') {
          if (receiptEl && !opts.keepReceipt) {
            receiptEl.textContent = 'Microphone access denied · recovery guidance shown';
          }
          if (modeNoteEl) modeNoteEl.textContent = 'Mic blocked state';
        } else {
          if (receiptEl && !opts.keepReceipt) {
            receiptEl.textContent = 'Dictation idle · press Hold to talk to capture';
          }
          if (modeNoteEl) modeNoteEl.textContent = 'Idle state';
        }
      }

      modeBtns.forEach(function (btn) {
        on(btn, 'click', function () {
          var m = btn.getAttribute('data-voice-mode') || 'idle';
          setMode(m, { restoreDefault: m === 'review' });
        });
      });

      if (holdBtn) {
        on(holdBtn, 'pointerdown', function () {
          holdPointerActive = true;
          holdDownAt = Date.now();
          setMode('listening', { startSeconds: 0, liveTick: true });
        });
        on(holdBtn, 'pointerup', function () {
          if (!holdPointerActive) return;
          holdPointerActive = false;
          if (Date.now() - holdDownAt >= 300) {
            setMode('review', { restoreDefault: true, focusInput: true });
          }
        });
        on(holdBtn, 'pointercancel', function () {
          holdPointerActive = false;
        });
        on(holdBtn, 'click', function () {
          if (host.getAttribute('data-voice-state') !== 'listening') {
            setMode('listening', { startSeconds: 0, liveTick: true });
          }
        });
      }

      if (stopBtn) {
        on(stopBtn, 'click', function () {
          setMode('review', { restoreDefault: true, focusInput: true });
        });
      }

      if (transcriptInput) {
        on(transcriptInput, 'input', syncSendDisabled);
      }

      if (sendBtn) {
        on(sendBtn, 'click', function () {
          if (sendBtn.disabled) return;
          var text = transcriptInput ? transcriptInput.value.trim() : '';
          if (!text) return;
          setMode('idle', { keepReceipt: true });
          if (receiptEl) receiptEl.textContent = 'Sent transcript: "' + text + '"';
          if (transcriptInput) transcriptInput.value = '';
          syncSendDisabled();
          if (holdBtn && typeof holdBtn.focus === 'function') holdBtn.focus();
        });
      }

      discardBtns.forEach(function (btn) {
        on(btn, 'click', function () {
          var prev = host.getAttribute('data-voice-state');
          setMode('idle', { keepReceipt: true });
          if (receiptEl) {
            receiptEl.textContent = prev === 'blocked'
              ? 'Mic alert dismissed · type directly in composer'
              : 'Transcript discarded · nothing sent';
          }
          if (holdBtn && typeof holdBtn.focus === 'function') holdBtn.focus();
        });
      });

      if (retryBtn) {
        on(retryBtn, 'click', function () {
          setMode('idle', { keepReceipt: true });
          if (receiptEl) receiptEl.textContent = 'Microphone retry ready · press Hold to talk';
          if (holdBtn && typeof holdBtn.focus === 'function') holdBtn.focus();
        });
      }

      syncSendDisabled();
    });

    // 2. Input Request Card
    Array.prototype.slice.call(root.querySelectorAll('[data-vi-input-request]')).forEach(function (host) {
      if (host._viWsInputBound) return;
      host._viWsInputBound = true;
      cleanups.push(function () { host._viWsInputBound = false; });

      var radios = Array.prototype.slice.call(host.querySelectorAll('[role="radio"]'));
      var noteInput = host.querySelector('[data-input-note]');
      var submitBtn = host.querySelector('[data-input-submit]');
      var defaultBtn = host.querySelector('[data-input-default]');
      var reopenBtn = host.querySelector('[data-input-reopen]');
      var bodyEl = host.querySelector('[data-input-body]');
      var receiptEl = host.querySelector('[data-input-receipt]');
      var receiptTextEl = host.querySelector('[data-input-receipt-text]');
      var statusDot = host.querySelector('[data-input-dot]');
      var statusLabel = host.querySelector('[data-input-status-label]');

      function selectedRadio() {
        return radios.find(function (r) { return r.getAttribute('aria-checked') === 'true'; }) || radios[0] || null;
      }

      function selectRadio(target, shouldFocus) {
        radios.forEach(function (r) {
          var active = r === target;
          r.setAttribute('aria-checked', active ? 'true' : 'false');
          r.setAttribute('tabindex', active ? '0' : '-1');
        });
        if (shouldFocus && target && typeof target.focus === 'function') {
          target.focus();
        }
      }

      function submitChoice(choice, usedDefault) {
        var note = noteInput ? noteInput.value.trim() : '';
        var summary = (usedDefault ? 'Default used · ' : 'Answered · ') + choice;
        if (note) {
          summary += ' (' + note + ')';
        }
        host.setAttribute('data-input-state', 'answered');
        if (bodyEl) bodyEl.hidden = true;
        if (receiptEl) receiptEl.hidden = false;
        if (receiptTextEl) receiptTextEl.textContent = summary;
        if (statusDot && statusDot.classList) {
          statusDot.classList.remove('vi-ws-dot--info');
          statusDot.classList.add('vi-ws-dot--ok');
        }
        if (statusLabel) statusLabel.textContent = 'answered';
        if (reopenBtn && typeof reopenBtn.focus === 'function') reopenBtn.focus();
      }

      radios.forEach(function (radio, idx) {
        on(radio, 'click', function () {
          selectRadio(radio, false);
        });
        on(radio, 'keydown', function (ev) {
          var next = -1;
          if (ev.key === 'ArrowDown' || ev.key === 'ArrowRight') {
            next = (idx + 1) % radios.length;
          } else if (ev.key === 'ArrowUp' || ev.key === 'ArrowLeft') {
            next = (idx - 1 + radios.length) % radios.length;
          } else if (ev.key === 'Home') {
            next = 0;
          } else if (ev.key === 'End') {
            next = radios.length - 1;
          } else if (ev.key === ' ' || ev.key === 'Enter') {
            ev.preventDefault();
            selectRadio(radio, false);
            return;
          }
          if (next !== -1) {
            ev.preventDefault();
            selectRadio(radios[next], true);
          }
        });
      });

      if (submitBtn) {
        on(submitBtn, 'click', function () {
          var current = selectedRadio();
          var val = current ? (current.getAttribute('data-radio-value') || 'Option') : 'Option';
          submitChoice(val, false);
        });
      }

      if (defaultBtn) {
        on(defaultBtn, 'click', function () {
          var rec = radios.find(function (r) { return r.getAttribute('data-radio-default') === 'true'; }) || radios[0];
          if (rec) selectRadio(rec, false);
          var val = rec ? (rec.getAttribute('data-radio-value') || 'Recommended') : 'Recommended';
          submitChoice(val, true);
        });
      }

      if (reopenBtn) {
        on(reopenBtn, 'click', function () {
          host.setAttribute('data-input-state', 'pending');
          if (receiptEl) receiptEl.hidden = true;
          if (bodyEl) bodyEl.hidden = false;
          if (statusDot && statusDot.classList) {
            statusDot.classList.remove('vi-ws-dot--ok');
            statusDot.classList.add('vi-ws-dot--info');
          }
          if (statusLabel) statusLabel.textContent = 'waiting_for_input';
          var current = selectedRadio();
          if (current && typeof current.focus === 'function') current.focus();
        });
      }
    });

    // 3. Run Plan Checklist
    Array.prototype.slice.call(root.querySelectorAll('[data-vi-run-plan]')).forEach(function (host) {
      if (host._viWsPlanBound) return;
      host._viWsPlanBound = true;
      cleanups.push(function () { host._viWsPlanBound = false; });

      var filterBtns = Array.prototype.slice.call(host.querySelectorAll('[data-plan-filter]'));
      var steps = Array.prototype.slice.call(host.querySelectorAll('[data-plan-step]'));
      var ratioEl = host.querySelector('[data-plan-ratio]');

      function applyFilter(mode) {
        var total = steps.length;
        var doneCount = 0;
        var openCount = 0;
        steps.forEach(function (step) {
          var isDone = step.getAttribute('data-step-status') === 'done';
          if (isDone) doneCount += 1;
          else openCount += 1;
          step.hidden = mode === 'open' && isDone;
        });
        filterBtns.forEach(function (btn) {
          btn.setAttribute('aria-pressed', btn.getAttribute('data-plan-filter') === mode ? 'true' : 'false');
        });
        if (ratioEl) {
          ratioEl.textContent = mode === 'open'
            ? openCount + ' / ' + total + ' open steps'
            : doneCount + ' / ' + total + ' steps done';
        }
      }

      filterBtns.forEach(function (btn) {
        on(btn, 'click', function () {
          applyFilter(btn.getAttribute('data-plan-filter') || 'all');
        });
      });

      applyFilter('all');
    });

    // 4. Notification Inbox Panel
    Array.prototype.slice.call(root.querySelectorAll('[data-vi-inbox]')).forEach(function (host) {
      if (host._viWsInboxBound) return;
      host._viWsInboxBound = true;
      cleanups.push(function () { host._viWsInboxBound = false; });

      var tabs = Array.prototype.slice.call(host.querySelectorAll('[data-inbox-tab]'));
      var panelEl = host.querySelector('[data-inbox-panel]');
      var listEl = host.querySelector('[data-inbox-list]');
      var items = Array.prototype.slice.call(host.querySelectorAll('[data-inbox-item]'));
      var countEl = host.querySelector('[data-inbox-count]');
      var markAllBtn = host.querySelector('[data-inbox-mark-all]');
      var emptyEl = host.querySelector('[data-inbox-empty]');
      var emptyTitleEl = host.querySelector('[data-inbox-empty-title]');
      var emptyCopyEl = host.querySelector('[data-inbox-empty-copy]');
      var restoreBtn = host.querySelector('[data-inbox-restore]');
      var restoreInlineBtn = host.querySelector('[data-inbox-restore-inline]');
      var receiptEl = host.querySelector('[data-inbox-receipt]');

      var initialReadStates = items.map(function (item) {
        return item.getAttribute('data-read') === 'true';
      });
      var activeTab = 'all';

      function syncItemControls(item) {
        var isRead = item.getAttribute('data-read') === 'true';
        var btn = item.querySelector('[data-inbox-mark-read]');
        if (!btn) return;
        btn.disabled = isRead;
        btn.setAttribute('aria-disabled', isRead ? 'true' : 'false');
        btn.textContent = isRead ? 'Read' : 'Mark read';
      }

      function render(customReceipt) {
        var unreadCount = 0;
        var visibleCount = 0;
        items.forEach(function (item) {
          var isRead = item.getAttribute('data-read') === 'true';
          var cat = item.getAttribute('data-category') || '';
          if (!isRead) unreadCount += 1;
          var show = activeTab === 'all'
            || (activeTab === 'unread' && !isRead)
            || (activeTab === 'approvals' && cat === 'approvals');
          item.hidden = !show;
          if (show) visibleCount += 1;
          syncItemControls(item);
        });

        if (countEl) {
          countEl.textContent = unreadCount + ' unread';
        }
        if (markAllBtn) {
          markAllBtn.disabled = unreadCount === 0;
          markAllBtn.setAttribute('aria-disabled', unreadCount === 0 ? 'true' : 'false');
        }
        if (listEl) listEl.hidden = visibleCount === 0;
        if (emptyEl) {
          emptyEl.hidden = visibleCount !== 0;
          if (visibleCount === 0) {
            if (emptyTitleEl) emptyTitleEl.textContent = 'All caught up';
            if (emptyCopyEl) {
              emptyCopyEl.textContent = activeTab === 'approvals'
                ? 'No approval items match this filter.'
                : 'No unread notifications remain in this queue.';
            }
          }
        }
        if (restoreInlineBtn) {
          restoreInlineBtn.hidden = !(visibleCount > 0 && unreadCount === 0);
        }
        if (receiptEl) {
          if (customReceipt) {
            receiptEl.textContent = customReceipt;
          } else {
            receiptEl.textContent = unreadCount === 0
              ? 'All demo notifications marked read'
              : unreadCount + ' unread items awaiting triage';
          }
        }
      }

      function selectTab(tabBtn, shouldFocus) {
        activeTab = tabBtn.getAttribute('data-inbox-tab') || 'all';
        tabs.forEach(function (t) {
          var active = t === tabBtn;
          t.setAttribute('aria-selected', active ? 'true' : 'false');
          t.setAttribute('tabindex', active ? '0' : '-1');
        });
        if (panelEl && tabBtn.id) {
          panelEl.setAttribute('aria-labelledby', tabBtn.id);
        }
        if (shouldFocus && typeof tabBtn.focus === 'function') {
          tabBtn.focus();
        }
        render();
      }

      tabs.forEach(function (tab, idx) {
        on(tab, 'click', function () {
          selectTab(tab, false);
        });
        on(tab, 'keydown', function (ev) {
          var next = -1;
          if (ev.key === 'ArrowRight') next = (idx + 1) % tabs.length;
          else if (ev.key === 'ArrowLeft') next = (idx - 1 + tabs.length) % tabs.length;
          else if (ev.key === 'Home') next = 0;
          else if (ev.key === 'End') next = tabs.length - 1;
          if (next === -1) return;
          ev.preventDefault();
          selectTab(tabs[next], true);
        });
      });

      items.forEach(function (item) {
        var markBtn = item.querySelector('[data-inbox-mark-read]');
        var openBtn = item.querySelector('[data-inbox-open]');
        var titleEl = item.querySelector('[data-inbox-title]');
        if (markBtn) {
          on(markBtn, 'click', function () {
            if (item.getAttribute('data-read') === 'true') return;
            item.setAttribute('data-read', 'true');
            render('Marked notification read');
          });
        }
        if (openBtn) {
          on(openBtn, 'click', function () {
            var label = titleEl ? titleEl.textContent.trim() : 'notification';
            if (receiptEl) receiptEl.textContent = 'Opened: ' + label;
          });
        }
      });

      if (markAllBtn) {
        on(markAllBtn, 'click', function () {
          items.forEach(function (item) {
            item.setAttribute('data-read', 'true');
          });
          render('All notifications marked read');
        });
      }

      function restoreDemo() {
        items.forEach(function (item, idx) {
          item.setAttribute('data-read', initialReadStates[idx] ? 'true' : 'false');
        });
        render('Demo notifications restored');
      }

      if (restoreBtn) on(restoreBtn, 'click', restoreDemo);
      if (restoreInlineBtn) on(restoreInlineBtn, 'click', restoreDemo);

      render();
    });

    return {
      destroy: function () {
        for (var i = 0; i < cleanups.length; i += 1) cleanups[i]();
        cleanups.length = 0;
      },
    };
  }

  return {
    initWorkspaceComponents: initWorkspaceComponents,
  };
});
