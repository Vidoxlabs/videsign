'use strict';

/**
 * Nocturne Museum: Progressive-enhancement controller for Core Production Components
 * (zero dependencies, CSP-safe, Shadow DOM compatible).
 *
 * Controllers:
 *   1. [data-vi-combobox]         — searchable multi-select combobox with arrow keys, chips & empty recovery
 *   2. [data-vi-daterange]        — preset tabs (24h/7d/30d/Custom) + arrow-key calendar grid
 *   3. [data-vi-tooltip-demo]     — accessible focus/hover tooltips + entity hover card with Esc dismiss
 *   4. [data-vi-file-tree]        — WAI-ARIA treeview keyboard navigation (arrows, expand/collapse)
 *   5. [data-vi-split-pane]       — focusable role="separator" keyboard & pointer resize + collapse snap
 *   6. [data-vi-telemetry-chart]  — colorblind-safe chart series switcher + polite metric readout
 *   7. [data-vi-reasoning-trace]  — streaming vs settled deliberation trace state toggle
 *   8. [data-vi-citation-demo]    — numbered inline citation chips + anchored source receipt popover
 *   9. [data-vi-danger-guard]     — exact-phrase typed confirmation unlocking destructive submit
 *  10. [data-vi-error-boundary]   — 404 / 500 / Offline recovery scenarios + diagnostic copy receipt
 */

(function attachCoreComponents(rootGlobal, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (rootGlobal && typeof rootGlobal === 'object') {
    rootGlobal.ViCoreComponents = api;
  }
  if (typeof document !== 'undefined') {
    var boot = function bootCore() {
      api.initCoreComponents(document);
    };
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', boot, { once: true });
    } else {
      boot();
    }
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function createCoreComponentsApi() {
  function initCoreComponents(container) {
    var root = container || (typeof document !== 'undefined' ? document : null);
    if (!root || typeof root.querySelectorAll !== 'function') {
      return { destroy: function noop() {} };
    }

    var doc = root.ownerDocument || (root.nodeType === 9 ? root : (typeof document !== 'undefined' ? document : null));
    var cleanups = [];

    function on(target, type, handler, opts) {
      if (!target || typeof target.addEventListener !== 'function') return;
      target.addEventListener(type, handler, opts);
      cleanups.push(function () {
        target.removeEventListener(type, handler, opts);
      });
    }

    // 1. Combobox Multiselect
    Array.prototype.slice.call(root.querySelectorAll('[data-vi-combobox]')).forEach(function (host) {
      if (host._viComboBound) return;
      host._viComboBound = true;

      var input = host.querySelector('[data-combo-input]');
      var listbox = host.querySelector('[data-combo-list]');
      var chipsHost = host.querySelector('[data-combo-chips]');
      var emptyEl = host.querySelector('[data-combo-empty]');
      var resetBtn = host.querySelector('[data-combo-reset]');
      var statusEl = host.querySelector('[data-combo-status]');
      var options = Array.prototype.slice.call(host.querySelectorAll('[role="option"]'));
      var groups = Array.prototype.slice.call(host.querySelectorAll('[data-combo-group]'));
      var activeIndex = -1;

      function visibleOptions() {
        return options.filter(function (o) { return !o.hidden; });
      }

      function setActive(idx) {
        var vis = visibleOptions();
        options.forEach(function (o) { o.classList.remove('is-active'); });
        if (vis.length === 0 || idx < 0) {
          activeIndex = -1;
          if (input) input.removeAttribute('aria-activedescendant');
          return;
        }
        activeIndex = ((idx % vis.length) + vis.length) % vis.length;
        var opt = vis[activeIndex];
        opt.classList.add('is-active');
        if (input && opt.id) input.setAttribute('aria-activedescendant', opt.id);
      }

      function renderChips() {
        if (!chipsHost || !doc) return;
        chipsHost.innerHTML = '';
        var selected = options.filter(function (o) { return o.getAttribute('aria-selected') === 'true'; });
        selected.forEach(function (opt) {
          var val = opt.getAttribute('data-option-value') || opt.textContent.trim();
          var lbl = opt.getAttribute('data-option-label') || val;
          var chip = doc.createElement('span');
          chip.className = 'vi-combo-chip';
          var txt = doc.createElement('span');
          txt.textContent = lbl;
          var rm = doc.createElement('button');
          rm.type = 'button';
          rm.className = 'vi-combo-chip-rm h-action-min-default';
          rm.setAttribute('aria-label', 'Remove ' + lbl);
          rm.textContent = '×';
          rm.addEventListener('click', function () {
            opt.setAttribute('aria-selected', 'false');
            var chk = opt.querySelector('[data-option-check]');
            if (chk) chk.textContent = 'Select';
            renderChips();
            if (input && typeof input.focus === 'function') input.focus();
          });
          chip.append(txt, rm);
          chipsHost.appendChild(chip);
        });
        if (statusEl) {
          statusEl.textContent = selected.length + ' selected · ' + visibleOptions().length + ' matching options';
        }
      }

      function toggleOption(opt) {
        if (!opt) return;
        var next = opt.getAttribute('aria-selected') !== 'true';
        opt.setAttribute('aria-selected', next ? 'true' : 'false');
        var chk = opt.querySelector('[data-option-check]');
        if (chk) chk.textContent = next ? 'Selected' : 'Select';
        renderChips();
      }

      function filterOptions() {
        var q = (input ? input.value : '').trim().toLowerCase();
        var shown = 0;
        options.forEach(function (opt) {
          var hay = ((opt.getAttribute('data-option-label') || '') + ' ' + (opt.getAttribute('data-option-value') || '') + ' ' + (opt.textContent || '')).toLowerCase();
          var match = !q || hay.indexOf(q) !== -1;
          opt.hidden = !match;
          if (match) shown += 1;
        });
        groups.forEach(function (grp) {
          var any = Array.prototype.slice.call(grp.querySelectorAll('[role="option"]')).some(function (o) { return !o.hidden; });
          grp.hidden = !any;
        });
        if (emptyEl) emptyEl.hidden = shown !== 0;
        if (listbox) listbox.hidden = false;
        if (input) input.setAttribute('aria-expanded', 'true');
        setActive(shown > 0 ? 0 : -1);
        renderChips();
      }

      options.forEach(function (opt) {
        on(opt, 'click', function () {
          toggleOption(opt);
          if (input && typeof input.focus === 'function') input.focus();
        });
      });

      if (input) {
        on(input, 'input', filterOptions);
        on(input, 'focus', function () {
          if (listbox) listbox.hidden = false;
          input.setAttribute('aria-expanded', 'true');
        });
        on(input, 'keydown', function (ev) {
          var vis = visibleOptions();
          if (ev.key === 'ArrowDown') {
            ev.preventDefault();
            if (listbox) listbox.hidden = false;
            input.setAttribute('aria-expanded', 'true');
            setActive(activeIndex + 1);
          } else if (ev.key === 'ArrowUp') {
            ev.preventDefault();
            setActive(activeIndex <= 0 ? vis.length - 1 : activeIndex - 1);
          } else if (ev.key === 'Enter' && activeIndex >= 0 && vis[activeIndex]) {
            ev.preventDefault();
            toggleOption(vis[activeIndex]);
          } else if (ev.key === 'Backspace' && !input.value) {
            var selected = options.filter(function (o) { return o.getAttribute('aria-selected') === 'true'; });
            if (selected.length > 0) {
              toggleOption(selected[selected.length - 1]);
            }
          } else if (ev.key === 'Escape') {
            ev.preventDefault();
            if (input.value) {
              input.value = '';
              filterOptions();
            } else if (listbox) {
              listbox.hidden = true;
              input.setAttribute('aria-expanded', 'false');
              setActive(-1);
            }
          }
        });
      }

      if (resetBtn) {
        on(resetBtn, 'click', function () {
          if (input) {
            input.value = '';
            filterOptions();
            if (typeof input.focus === 'function') input.focus();
          }
        });
      }

      renderChips();
    });

    // 2. Date Range Picker
    Array.prototype.slice.call(root.querySelectorAll('[data-vi-daterange]')).forEach(function (host) {
      if (host._viDateBound) return;
      host._viDateBound = true;

      var tabs = Array.prototype.slice.call(host.querySelectorAll('[data-range-preset]'));
      var days = Array.prototype.slice.call(host.querySelectorAll('[data-cal-day]'));
      var readout = host.querySelector('[data-range-readout]');
      var startDay = 16;
      var endDay = 22;
      var pendingStart = null;

      function pad2(n) { return n < 10 ? '0' + n : String(n); }

      function paintRange() {
        var lo = Math.min(startDay, endDay);
        var hi = Math.max(startDay, endDay);
        days.forEach(function (btn) {
          var d = Number(btn.getAttribute('data-cal-day'));
          var inRange = d >= lo && d <= hi;
          btn.setAttribute('data-in-range', inRange ? 'true' : 'false');
          btn.setAttribute('aria-pressed', inRange ? 'true' : 'false');
          if (d === lo) btn.setAttribute('data-range-edge', 'start');
          else if (d === hi) btn.setAttribute('data-range-edge', 'end');
          else btn.removeAttribute('data-range-edge');
        });
        if (readout) {
          readout.textContent = '2026-11-' + pad2(lo) + ' to 2026-11-' + pad2(hi) + ' (' + (hi - lo + 1) + 'd)';
        }
      }

      function selectPreset(preset) {
        tabs.forEach(function (t) {
          var active = t.getAttribute('data-range-preset') === preset;
          t.setAttribute('aria-selected', active ? 'true' : 'false');
          t.setAttribute('tabindex', active ? '0' : '-1');
        });
        pendingStart = null;
        if (preset === '24h') { startDay = 21; endDay = 22; }
        else if (preset === '7d') { startDay = 16; endDay = 22; }
        else if (preset === '30d') { startDay = 1; endDay = 30; }
        paintRange();
      }

      tabs.forEach(function (tab, idx) {
        on(tab, 'click', function () {
          selectPreset(tab.getAttribute('data-range-preset') || '7d');
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

      days.forEach(function (btn, idx) {
        on(btn, 'click', function () {
          var d = Number(btn.getAttribute('data-cal-day'));
          if (pendingStart === null) {
            pendingStart = d;
            startDay = d;
            endDay = d;
          } else {
            startDay = Math.min(pendingStart, d);
            endDay = Math.max(pendingStart, d);
            pendingStart = null;
          }
          tabs.forEach(function (t) {
            var active = t.getAttribute('data-range-preset') === 'custom';
            t.setAttribute('aria-selected', active ? 'true' : 'false');
            t.setAttribute('tabindex', active ? '0' : '-1');
          });
          paintRange();
        });
        on(btn, 'keydown', function (ev) {
          var target = -1;
          if (ev.key === 'ArrowRight') target = Math.min(days.length - 1, idx + 1);
          else if (ev.key === 'ArrowLeft') target = Math.max(0, idx - 1);
          else if (ev.key === 'ArrowDown') target = Math.min(days.length - 1, idx + 7);
          else if (ev.key === 'ArrowUp') target = Math.max(0, idx - 7);
          else if (ev.key === 'Home') target = 0;
          else if (ev.key === 'End') target = days.length - 1;
          else if (ev.key === 'Escape') {
            ev.preventDefault();
            selectPreset('7d');
            return;
          }
          if (target !== -1) {
            ev.preventDefault();
            if (typeof days[target].focus === 'function') days[target].focus();
          }
        });
      });

      paintRange();
    });

    // 3. Tooltip & Hover Card
    Array.prototype.slice.call(root.querySelectorAll('[data-vi-tooltip-demo]')).forEach(function (host) {
      if (host._viTipBound) return;
      host._viTipBound = true;

      var wraps = Array.prototype.slice.call(host.querySelectorAll('[data-tip-wrap]'));
      var cardTrigger = host.querySelector('[data-hover-card-trigger]');
      var hoverCard = host.querySelector('[data-hover-card]');
      var cardClose = host.querySelector('[data-hover-card-close]');

      wraps.forEach(function (wrap) {
        var btn = wrap.querySelector('button');
        if (!btn) return;
        on(btn, 'focus', function () { wrap.removeAttribute('data-tip-dismissed'); });
        on(wrap, 'mouseenter', function () { wrap.removeAttribute('data-tip-dismissed'); });
        on(btn, 'keydown', function (ev) {
          if (ev.key === 'Escape') {
            ev.preventDefault();
            wrap.setAttribute('data-tip-dismissed', 'true');
          }
        });
      });

      function setCardOpen(open) {
        if (!hoverCard || !cardTrigger) return;
        hoverCard.hidden = !open;
        cardTrigger.setAttribute('aria-expanded', open ? 'true' : 'false');
      }

      if (cardTrigger && hoverCard) {
        on(cardTrigger, 'click', function () {
          setCardOpen(hoverCard.hidden);
        });
        on(cardTrigger, 'keydown', function (ev) {
          if (ev.key === 'Escape' && !hoverCard.hidden) {
            ev.preventDefault();
            setCardOpen(false);
          }
        });
        on(hoverCard, 'keydown', function (ev) {
          if (ev.key === 'Escape') {
            ev.preventDefault();
            setCardOpen(false);
            if (typeof cardTrigger.focus === 'function') cardTrigger.focus();
          }
        });
      }
      if (cardClose && cardTrigger) {
        on(cardClose, 'click', function () {
          setCardOpen(false);
          if (typeof cardTrigger.focus === 'function') cardTrigger.focus();
        });
      }
    });

    // 4. File Tree Explorer
    Array.prototype.slice.call(root.querySelectorAll('[data-vi-file-tree]')).forEach(function (host) {
      if (host._viTreeBound) return;
      host._viTreeBound = true;

      var items = Array.prototype.slice.call(host.querySelectorAll('[role="treeitem"]'));
      var statusEl = host.querySelector('[data-tree-status]');

      function isVisibleItem(el) {
        var cur = el.parentNode;
        while (cur && cur !== host) {
          if (cur.hidden) return false;
          cur = cur.parentNode;
        }
        return true;
      }

      function visibleItems() {
        return items.filter(isVisibleItem);
      }

      function selectItem(item) {
        items.forEach(function (i) {
          var active = i === item;
          i.setAttribute('aria-selected', active ? 'true' : 'false');
          i.setAttribute('tabindex', active ? '0' : '-1');
        });
        if (statusEl) {
          var pathName = item.getAttribute('data-tree-path') || item.textContent.trim();
          var st = item.getAttribute('data-tree-state') || 'Admitted';
          statusEl.textContent = 'Focused ' + pathName + ' · ' + st;
        }
      }

      function setExpanded(item, expanded) {
        var groupId = item.getAttribute('data-tree-controls');
        if (!groupId) return;
        var grp = host.querySelector('#' + groupId);
        if (!grp) return;
        item.setAttribute('aria-expanded', expanded ? 'true' : 'false');
        grp.hidden = !expanded;
      }

      items.forEach(function (item) {
        on(item, 'click', function () {
          selectItem(item);
          if (item.hasAttribute('aria-expanded')) {
            setExpanded(item, item.getAttribute('aria-expanded') !== 'true');
          }
        });
        on(item, 'keydown', function (ev) {
          var vis = visibleItems();
          var idx = vis.indexOf(item);
          if (ev.key === 'ArrowDown') {
            ev.preventDefault();
            var next = vis[Math.min(vis.length - 1, idx + 1)];
            if (next) { selectItem(next); if (typeof next.focus === 'function') next.focus(); }
          } else if (ev.key === 'ArrowUp') {
            ev.preventDefault();
            var prev = vis[Math.max(0, idx - 1)];
            if (prev) { selectItem(prev); if (typeof prev.focus === 'function') prev.focus(); }
          } else if (ev.key === 'ArrowRight') {
            if (item.hasAttribute('aria-expanded')) {
              ev.preventDefault();
              if (item.getAttribute('aria-expanded') === 'false') {
                setExpanded(item, true);
              } else {
                var child = vis[idx + 1];
                if (child) { selectItem(child); if (typeof child.focus === 'function') child.focus(); }
              }
            }
          } else if (ev.key === 'ArrowLeft') {
            if (item.hasAttribute('aria-expanded') && item.getAttribute('aria-expanded') === 'true') {
              ev.preventDefault();
              setExpanded(item, false);
            } else {
              var parentId = item.getAttribute('data-tree-parent');
              var parentItem = parentId ? host.querySelector('[data-tree-controls="' + parentId + '"]') : null;
              if (parentItem) {
                ev.preventDefault();
                selectItem(parentItem);
                if (typeof parentItem.focus === 'function') parentItem.focus();
              }
            }
          } else if (ev.key === 'Home') {
            ev.preventDefault();
            if (vis[0]) { selectItem(vis[0]); if (typeof vis[0].focus === 'function') vis[0].focus(); }
          } else if (ev.key === 'End') {
            ev.preventDefault();
            var last = vis[vis.length - 1];
            if (last) { selectItem(last); if (typeof last.focus === 'function') last.focus(); }
          } else if (ev.key === 'Enter' || ev.key === ' ') {
            ev.preventDefault();
            item.click();
          }
        });
      });
    });

    // 5. Resizable Split Pane
    Array.prototype.slice.call(root.querySelectorAll('[data-vi-split-pane]')).forEach(function (host) {
      if (host._viSplitBound) return;
      host._viSplitBound = true;

      var stage = host.querySelector('[data-split-stage]');
      var handle = host.querySelector('[role="separator"]');
      var readout = host.querySelector('[data-split-readout]');
      var dirBtns = Array.prototype.slice.call(host.querySelectorAll('[data-split-dir-btn]'));
      var snapBtns = Array.prototype.slice.call(host.querySelectorAll('[data-split-snap]'));
      var pct = 42;
      var dir = 'horizontal';

      function applySplit(nextPct) {
        pct = Math.max(20, Math.min(80, Math.round(nextPct)));
        if (stage && stage.style) stage.style.setProperty('--vi-split-pct', pct + '%');
        if (handle) handle.setAttribute('aria-valuenow', String(pct));
        if (readout) readout.textContent = pct + '% / ' + (100 - pct) + '% · ' + dir;
      }

      dirBtns.forEach(function (btn) {
        on(btn, 'click', function () {
          dir = btn.getAttribute('data-split-dir-btn') || 'horizontal';
          if (stage) stage.setAttribute('data-split-dir', dir);
          if (handle) handle.setAttribute('aria-orientation', dir === 'horizontal' ? 'vertical' : 'horizontal');
          dirBtns.forEach(function (b) {
            b.setAttribute('aria-pressed', b === btn ? 'true' : 'false');
          });
          applySplit(pct);
        });
      });

      snapBtns.forEach(function (btn) {
        on(btn, 'click', function () {
          applySplit(Number(btn.getAttribute('data-split-snap') || 50));
        });
      });

      if (handle) {
        on(handle, 'keydown', function (ev) {
          if (ev.key === 'ArrowLeft' || ev.key === 'ArrowUp') {
            ev.preventDefault();
            applySplit(pct - 5);
          } else if (ev.key === 'ArrowRight' || ev.key === 'ArrowDown') {
            ev.preventDefault();
            applySplit(pct + 5);
          } else if (ev.key === 'Home') {
            ev.preventDefault();
            applySplit(20);
          } else if (ev.key === 'End') {
            ev.preventDefault();
            applySplit(80);
          } else if (ev.key === 'Enter') {
            ev.preventDefault();
            applySplit(50);
          }
        });

        var dragging = false;
        on(handle, 'pointerdown', function (ev) {
          dragging = true;
          if (typeof handle.setPointerCapture === 'function') {
            try { handle.setPointerCapture(ev.pointerId); } catch (e) { void e; }
          }
        });
        on(handle, 'pointermove', function (ev) {
          if (!dragging || !stage || typeof stage.getBoundingClientRect !== 'function') return;
          var rect = stage.getBoundingClientRect();
          if (dir === 'horizontal' && rect.width > 0) {
            applySplit(((ev.clientX - rect.left) / rect.width) * 100);
          } else if (dir === 'vertical' && rect.height > 0) {
            applySplit(((ev.clientY - rect.top) / rect.height) * 100);
          }
        });
        on(handle, 'pointerup', function () { dragging = false; });
        on(handle, 'pointercancel', function () { dragging = false; });
      }

      applySplit(pct);
    });

    // 6. Telemetry Chart Card
    Array.prototype.slice.call(root.querySelectorAll('[data-vi-telemetry-chart]')).forEach(function (host) {
      if (host._viChartBound) return;
      host._viChartBound = true;

      var modeBtns = Array.prototype.slice.call(host.querySelectorAll('[data-chart-mode]'));
      var valEl = host.querySelector('[data-chart-value]');
      var deltaEl = host.querySelector('[data-chart-delta]');
      var seriesA = host.querySelector('[data-chart-series="latency"]');
      var seriesB = host.querySelector('[data-chart-series="throughput"]');

      modeBtns.forEach(function (btn) {
        on(btn, 'click', function () {
          var mode = btn.getAttribute('data-chart-mode') || 'both';
          modeBtns.forEach(function (b) { b.setAttribute('aria-pressed', b === btn ? 'true' : 'false'); });
          if (seriesA) seriesA.style.display = mode === 'throughput' ? 'none' : '';
          if (seriesB) seriesB.style.display = mode === 'latency' ? 'none' : '';
          if (valEl) valEl.textContent = mode === 'throughput' ? '1,840 tok/s' : '142 ms';
          if (deltaEl) deltaEl.textContent = mode === 'throughput' ? '+8.6% vs 7d baseline' : '-11.4% vs 7d baseline';
        });
      });
    });

    // 7. Reasoning Trace Block
    Array.prototype.slice.call(root.querySelectorAll('[data-vi-reasoning-trace]')).forEach(function (host) {
      if (host._viTraceBound) return;
      host._viTraceBound = true;

      var modeBtns = Array.prototype.slice.call(host.querySelectorAll('[data-trace-mode]'));
      var labelEl = host.querySelector('[data-trace-label]');
      var durEl = host.querySelector('[data-trace-duration]');

      modeBtns.forEach(function (btn) {
        on(btn, 'click', function () {
          var mode = btn.getAttribute('data-trace-mode') || 'streaming';
          host.setAttribute('data-trace-state', mode);
          modeBtns.forEach(function (b) { b.setAttribute('aria-pressed', b === btn ? 'true' : 'false'); });
          if (labelEl) labelEl.textContent = mode === 'streaming' ? 'Streaming deliberation' : 'Settled trace';
          if (durEl) durEl.textContent = mode === 'streaming' ? '2.4s · 4 steps · 418 tok' : '3.1s · 4 steps · 462 tok';
        });
      });
    });

    // 8. Inline Citation Popover
    Array.prototype.slice.call(root.querySelectorAll('[data-vi-citation-demo]')).forEach(function (host) {
      if (host._viCiteBound) return;
      host._viCiteBound = true;

      var citeBtns = Array.prototype.slice.call(host.querySelectorAll('[data-cite-id]'));
      var popover = host.querySelector('[data-cite-popover]');
      var pathEl = popover ? popover.querySelector('[data-cite-path]') : null;
      var linesEl = popover ? popover.querySelector('[data-cite-lines]') : null;
      var statusEl = popover ? popover.querySelector('[data-cite-status]') : null;
      var quoteEl = popover ? popover.querySelector('[data-cite-quote]') : null;
      var closeBtn = popover ? popover.querySelector('[data-cite-close]') : null;
      var lastBtn = null;

      function closePop() {
        if (!popover) return;
        popover.hidden = true;
        citeBtns.forEach(function (b) { b.setAttribute('aria-expanded', 'false'); });
        if (lastBtn && typeof lastBtn.focus === 'function') lastBtn.focus();
      }

      citeBtns.forEach(function (btn) {
        on(btn, 'click', function () {
          var alreadyOpen = btn.getAttribute('aria-expanded') === 'true' && popover && !popover.hidden;
          if (alreadyOpen) {
            closePop();
            return;
          }
          lastBtn = btn;
          citeBtns.forEach(function (b) { b.setAttribute('aria-expanded', b === btn ? 'true' : 'false'); });
          if (pathEl) pathEl.textContent = btn.getAttribute('data-cite-path') || '';
          if (linesEl) linesEl.textContent = btn.getAttribute('data-cite-lines') || '';
          if (statusEl) statusEl.textContent = btn.getAttribute('data-cite-status') || 'Observed';
          if (quoteEl) quoteEl.textContent = btn.getAttribute('data-cite-quote') || '';
          if (popover) popover.hidden = false;
        });
        on(btn, 'keydown', function (ev) {
          if (ev.key === 'Escape' && popover && !popover.hidden) {
            ev.preventDefault();
            closePop();
          }
        });
      });

      if (popover) {
        on(popover, 'keydown', function (ev) {
          if (ev.key === 'Escape') {
            ev.preventDefault();
            closePop();
          }
        });
      }
      if (closeBtn) on(closeBtn, 'click', closePop);
    });

    // 9. Destructive Action Guard
    Array.prototype.slice.call(root.querySelectorAll('[data-vi-danger-guard]')).forEach(function (host) {
      if (host._viDangerBound) return;
      host._viDangerBound = true;

      var input = host.querySelector('[data-danger-input]');
      var submitBtn = host.querySelector('[data-danger-submit]');
      var cancelBtn = host.querySelector('[data-danger-cancel]');
      var statusEl = host.querySelector('[data-danger-status]');
      var expected = host.getAttribute('data-confirm-phrase') || 'purge-local-cache';

      function syncUnlock() {
        var matched = Boolean(input && input.value.trim() === expected);
        if (submitBtn) {
          submitBtn.disabled = !matched;
          submitBtn.setAttribute('aria-disabled', matched ? 'false' : 'true');
        }
        if (statusEl) {
          statusEl.textContent = matched
            ? 'Phrase matched · destructive action unlocked'
            : 'Locked · type "' + expected + '" to enable confirmation';
        }
      }

      if (input) on(input, 'input', syncUnlock);
      if (cancelBtn) {
        on(cancelBtn, 'click', function () {
          if (input) input.value = '';
          syncUnlock();
          if (statusEl) statusEl.textContent = 'Cancelled · no local cache entries were removed';
        });
      }
      if (submitBtn) {
        on(submitBtn, 'click', function () {
          if (submitBtn.disabled) return;
          if (input) input.value = '';
          syncUnlock();
          if (statusEl) statusEl.textContent = 'Dry-run receipt recorded · 3 local cache projections queued for purge';
        });
      }
      syncUnlock();
    });

    // 10. System Error Boundary
    Array.prototype.slice.call(root.querySelectorAll('[data-vi-error-boundary]')).forEach(function (host) {
      if (host._viErrBound) return;
      host._viErrBound = true;

      var SCENARIOS = {
        '404': {
          code: 'HTTP 404 · Not found',
          title: 'Specimen route not found',
          copy: 'The requested catalog entry is missing or was retired in an earlier consolidation pass.',
          reqId: 'req_01j8m4q9x2',
          runId: 'run_01j8k2',
          cta: 'Return to catalog',
        },
        '500': {
          code: 'HTTP 500 · Runtime fault',
          title: 'Renderer boundary caught an unexpected error',
          copy: 'The isolated stage stopped safely before mutating workspace state. Copy the diagnostic receipt or retry.',
          reqId: 'req_01j8m5r3z8',
          runId: 'run_01j8k5',
          cta: 'Retry request',
        },
        offline: {
          code: 'NETWORK · Offline',
          title: 'Local workspace is offline',
          copy: 'Cached specimens remain readable; live remote fetches pause until connectivity returns.',
          reqId: 'req_offline_local',
          runId: 'run_local_hold',
          cta: 'Reconnect now',
        },
      };

      var modeBtns = Array.prototype.slice.call(host.querySelectorAll('[data-err-mode]'));
      var codeEl = host.querySelector('[data-err-code]');
      var titleEl = host.querySelector('[data-err-title]');
      var copyEl = host.querySelector('[data-err-copy]');
      var reqEl = host.querySelector('[data-err-req]');
      var runEl = host.querySelector('[data-err-run]');
      var ctaBtn = host.querySelector('[data-err-cta]');
      var copyBtn = host.querySelector('[data-err-copy-btn]');
      var statusEl = host.querySelector('[data-err-status]');
      var currentKey = '500';

      function applyScenario(key) {
        var s = SCENARIOS[key] || SCENARIOS['500'];
        currentKey = key;
        modeBtns.forEach(function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-err-mode') === key ? 'true' : 'false'); });
        if (codeEl) codeEl.textContent = s.code;
        if (titleEl) titleEl.textContent = s.title;
        if (copyEl) copyEl.textContent = s.copy;
        if (reqEl) reqEl.textContent = s.reqId;
        if (runEl) runEl.textContent = s.runId;
        if (ctaBtn) ctaBtn.textContent = s.cta;
        if (statusEl) statusEl.textContent = 'Diagnostic payload ready for ' + s.reqId;
      }

      modeBtns.forEach(function (btn) {
        on(btn, 'click', function () {
          applyScenario(btn.getAttribute('data-err-mode') || '500');
        });
      });

      if (copyBtn) {
        on(copyBtn, 'click', function () {
          var s = SCENARIOS[currentKey] || SCENARIOS['500'];
          var payload = JSON.stringify({ status: s.code, req_id: s.reqId, run_id: s.runId, route: '/catalog/specimens' });
          if (typeof navigator !== 'undefined' && navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
            navigator.clipboard.writeText(payload).then(function () {
              if (statusEl) statusEl.textContent = 'Copied diagnostics for ' + s.reqId;
            }).catch(function () {
              if (statusEl) statusEl.textContent = 'Diagnostic receipt prepared for ' + s.reqId;
            });
          } else if (statusEl) {
            statusEl.textContent = 'Diagnostic receipt prepared for ' + s.reqId;
          }
        });
      }

      if (ctaBtn) {
        on(ctaBtn, 'click', function () {
          if (statusEl) statusEl.textContent = 'Recovery action triggered: ' + ctaBtn.textContent;
        });
      }
    });

    return {
      destroy: function () {
        for (var i = 0; i < cleanups.length; i += 1) cleanups[i]();
        cleanups.length = 0;
      },
    };
  }

  return {
    initCoreComponents: initCoreComponents,
  };
});
