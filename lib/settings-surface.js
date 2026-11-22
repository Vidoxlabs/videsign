'use strict';

/**
 * Nocturne Museum: Lightweight progressive-enhancement controller for modernized
 * Settings interfaces (zero dependencies, CSP-safe).
 *
 * Capabilities:
 *   - Live client-side settings search filtering with aria-live="polite" match counts
 *   - Two-pane tab switching with ArrowUp, ArrowDown, Home, and End keyboard roving
 *   - Mobile (< 48rem) single-column drill-down between section list and active detail pane
 *   - Accessible role="switch" toggles with explicit On/Off text and save receipts
 *   - Model routing role="radio" slot selection and theme Dark/Light segmented switcher
 *   - Copyable workspace ID, per-store data export receipts, revoke status transitions,
 *     and owner-gated danger zone confirmation notices
 *   - Modal/popover Escape dismissal with focus restoration and leak-free destroy()
 */

(function attachSettingsSurface(rootGlobal, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (rootGlobal && typeof rootGlobal === 'object') {
    rootGlobal.ViSettingsSurface = api;
  }
  if (typeof document !== 'undefined') {
    var boot = function bootSettings() {
      api.initSettingsSurface(document);
    };
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', boot, { once: true });
    } else {
      boot();
    }
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function createSettingsSurfaceApi() {
  function copyText(text) {
    if (typeof navigator !== 'undefined' && navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
      return Promise.resolve(navigator.clipboard.writeText(text)).catch(function () {
        return false;
      });
    }
    return Promise.resolve(true);
  }

  function initSettingsSurface(container) {
    var root = container || (typeof document !== 'undefined' ? document : null);
    if (!root || typeof root.querySelectorAll !== 'function') {
      return { destroy: function noop() {} };
    }

    var doc = root.ownerDocument || (root.nodeType === 9 ? root : (typeof document !== 'undefined' ? document : null));
    var cleanups = [];

    function addListener(target, type, handler, options) {
      if (!target || typeof target.addEventListener !== 'function') return;
      target.addEventListener(type, handler, options);
      cleanups.push(function remove() {
        target.removeEventListener(type, handler, options);
      });
    }

    function setReceipt(scope, message) {
      var receipt = (scope && scope.querySelector('[data-settings-receipt]')) ||
        root.querySelector('[data-settings-receipt]');
      if (receipt) receipt.textContent = message;
    }

    // 1. Bind every two-pane Settings shell
    var shells = Array.prototype.slice.call(root.querySelectorAll('[data-settings-shell]'));
    shells.forEach(function bindShell(shell) {
      if (shell._viSettingsBound) return;
      shell._viSettingsBound = true;

      var searchInput = shell.querySelector('[data-settings-search]');
      var searchCount = shell.querySelector('[data-settings-search-count]');
      var emptyState = shell.querySelector('[data-settings-search-empty]');
      var resetBtn = shell.querySelector('[data-settings-search-reset]');
      var navGroups = Array.prototype.slice.call(shell.querySelectorAll('[data-settings-group]'));
      var navTabs = Array.prototype.slice.call(shell.querySelectorAll('[role="tab"][data-settings-target]'));
      var panels = Array.prototype.slice.call(shell.querySelectorAll('[role="tabpanel"][data-settings-panel]'));
      var mobileBackBtn = shell.querySelector('[data-settings-mobile-back]');
      var mobileHeading = shell.querySelector('[data-settings-mobile-heading]');

      function activateTab(tab, moveFocus) {
        if (!tab) return;
        var targetPanel = tab.getAttribute('data-settings-target') || 'general';
        var sectionAnchor = tab.getAttribute('data-settings-anchor') || '';
        navTabs.forEach(function updateTab(btn) {
          var selected = btn === tab;
          btn.setAttribute('aria-selected', selected ? 'true' : 'false');
          btn.setAttribute('tabindex', selected ? '0' : '-1');
        });
        panels.forEach(function updatePanel(panel) {
          panel.hidden = panel.getAttribute('data-settings-panel') !== targetPanel;
        });
        if (mobileHeading) {
          mobileHeading.textContent = (tab.textContent || '').trim();
        }
        shell.setAttribute('data-mobile-view', 'pane');
        if (moveFocus && typeof tab.focus === 'function') {
          tab.focus();
        }
        if (sectionAnchor) {
          var anchorEl = shell.querySelector('#' + sectionAnchor);
          if (anchorEl && typeof anchorEl.scrollIntoView === 'function') {
            anchorEl.scrollIntoView({ behavior: 'auto', block: 'start' });
          }
        }
      }

      navTabs.forEach(function bindTab(tab) {
        addListener(tab, 'click', function onTabClick() {
          activateTab(tab, false);
        });
        addListener(tab, 'keydown', function onTabKey(ev) {
          var visibleTabs = navTabs.filter(function (t) { return !t.hidden; });
          var cur = visibleTabs.indexOf(tab);
          if (cur === -1 || visibleTabs.length === 0) return;
          var next = -1;
          if (ev.key === 'ArrowDown' || ev.key === 'ArrowRight') next = (cur + 1) % visibleTabs.length;
          else if (ev.key === 'ArrowUp' || ev.key === 'ArrowLeft') next = (cur - 1 + visibleTabs.length) % visibleTabs.length;
          else if (ev.key === 'Home') next = 0;
          else if (ev.key === 'End') next = visibleTabs.length - 1;
          if (next === -1) return;
          ev.preventDefault();
          activateTab(visibleTabs[next], true);
        });
      });

      if (mobileBackBtn) {
        addListener(mobileBackBtn, 'click', function onMobileBack() {
          var cur = shell.getAttribute('data-mobile-view');
          shell.setAttribute('data-mobile-view', cur === 'nav' ? 'pane' : 'nav');
        });
      }

      function applyFilter(rawQuery) {
        var q = String(rawQuery || '').trim().toLowerCase();
        var matched = 0;
        navGroups.forEach(function filterGroup(group) {
          var items = Array.prototype.slice.call(group.querySelectorAll('[role="tab"][data-settings-target]'));
          var groupHits = 0;
          items.forEach(function filterItem(item) {
            var hay = ((item.textContent || '') + ' ' + (item.getAttribute('data-settings-keywords') || '')).toLowerCase();
            var match = !q || hay.indexOf(q) !== -1;
            item.hidden = !match;
            if (match) {
              groupHits += 1;
              matched += 1;
            }
          });
          group.hidden = groupHits === 0;
        });
        if (searchCount) {
          searchCount.textContent = matched + ' of ' + navTabs.length + ' sections shown';
        }
        if (emptyState) {
          emptyState.hidden = matched !== 0;
        }
      }

      if (searchInput) {
        addListener(searchInput, 'input', function onSearchInput() {
          applyFilter(searchInput.value);
        });
      }

      if (resetBtn) {
        addListener(resetBtn, 'click', function onResetSearch() {
          if (searchInput) searchInput.value = '';
          applyFilter('');
          if (searchInput && typeof searchInput.focus === 'function') searchInput.focus();
        });
      }
    });

    // 2. Accessible role="switch" toggles (paired with explicit On / Off label)
    var switches = Array.prototype.slice.call(root.querySelectorAll('[role="switch"][data-settings-switch]'));
    switches.forEach(function bindSwitch(btn) {
      if (btn._viSettingsSwitchBound) return;
      btn._viSettingsSwitchBound = true;
      addListener(btn, 'click', function onSwitchToggle() {
        var next = btn.getAttribute('aria-checked') !== 'true';
        btn.setAttribute('aria-checked', next ? 'true' : 'false');
        var stateLabel = btn.querySelector('[data-settings-switch-label]');
        if (stateLabel) stateLabel.textContent = next ? 'On' : 'Off';
        var settingName = btn.getAttribute('data-settings-switch') || 'Preference';
        if (settingName === 'Background motion' && doc && doc.documentElement) {
          doc.documentElement.setAttribute('data-motion', next ? 'running' : 'paused');
        }
        setReceipt(root, settingName + ' set to ' + (next ? 'On' : 'Off'));
      });
    });

    // 3. Theme Dark / Light segmented buttons
    var themeButtons = Array.prototype.slice.call(root.querySelectorAll('[data-settings-theme]'));
    function setTheme(themeName) {
      var normalized = themeName === 'light' ? 'light' : 'dark';
      if (doc && doc.documentElement) {
        doc.documentElement.setAttribute('data-theme', normalized);
      }
      themeButtons.forEach(function updateThemeBtn(b) {
        b.setAttribute('aria-pressed', b.getAttribute('data-settings-theme') === normalized ? 'true' : 'false');
      });
      setReceipt(root, 'Theme switched to ' + normalized);
    }
    themeButtons.forEach(function bindThemeBtn(btn) {
      if (btn._viSettingsThemeBound) return;
      btn._viSettingsThemeBound = true;
      addListener(btn, 'click', function onThemeClick() {
        setTheme(btn.getAttribute('data-settings-theme') || 'dark');
      });
    });

    // 4. Segmented density / preference controls
    var segGroups = Array.prototype.slice.call(root.querySelectorAll('[data-settings-segmented]'));
    segGroups.forEach(function bindSeg(group) {
      if (group._viSettingsSegBound) return;
      group._viSettingsSegBound = true;
      var btns = Array.prototype.slice.call(group.querySelectorAll('[aria-pressed]'));
      var name = group.getAttribute('data-settings-segmented') || 'Preference';
      btns.forEach(function bindSegBtn(btn) {
        addListener(btn, 'click', function onSegClick() {
          btns.forEach(function markSeg(other) {
            other.setAttribute('aria-pressed', other === btn ? 'true' : 'false');
          });
          setReceipt(root, name + ' updated to ' + (btn.textContent || '').trim());
        });
      });
    });

    // 5. Neutral model routing radio slots
    var radioGroups = Array.prototype.slice.call(root.querySelectorAll('[role="radiogroup"][data-settings-routing]'));
    radioGroups.forEach(function bindRouting(group) {
      if (group._viSettingsRouteBound) return;
      group._viSettingsRouteBound = true;
      var radios = Array.prototype.slice.call(group.querySelectorAll('[role="radio"]'));
      radios.forEach(function bindRadio(radio) {
        addListener(radio, 'click', function onRadioClick() {
          radios.forEach(function markRadio(other) {
            var checked = other === radio;
            other.setAttribute('aria-checked', checked ? 'true' : 'false');
            var parentSlot = other.parentNode;
            if (parentSlot && typeof parentSlot.setAttribute === 'function') {
              parentSlot.setAttribute('data-selected', checked ? 'true' : 'false');
            }
          });
          var slotId = radio.getAttribute('data-settings-slot') || 'slot';
          setReceipt(root, 'Default routing slot set to ' + slotId);
        });
      });
    });

    // 6. Copy workspace ID, per-store exports, revoke buttons, and danger-zone owner gate
    Array.prototype.slice.call(root.querySelectorAll('[data-settings-copy]')).forEach(function bindCopy(btn) {
      if (btn._viSettingsCopyBound) return;
      btn._viSettingsCopyBound = true;
      addListener(btn, 'click', function onCopyClick() {
        var val = btn.getAttribute('data-settings-copy') || '';
        copyText(val).then(function () {
          setReceipt(root, 'Copied ' + val + ' to clipboard');
        });
      });
    });

    Array.prototype.slice.call(root.querySelectorAll('[data-settings-export]')).forEach(function bindExport(btn) {
      if (btn._viSettingsExportBound) return;
      btn._viSettingsExportBound = true;
      addListener(btn, 'click', function onExportClick() {
        var bundle = btn.getAttribute('data-settings-export') || 'export bundle';
        setReceipt(root, 'Prepared read-only export request for ' + bundle);
      });
    });

    Array.prototype.slice.call(root.querySelectorAll('[data-settings-revoke]')).forEach(function bindRevoke(btn) {
      if (btn._viSettingsRevokeBound) return;
      btn._viSettingsRevokeBound = true;
      addListener(btn, 'click', function onRevokeClick() {
        var subject = btn.getAttribute('data-settings-revoke') || 'target';
        setReceipt(root, 'Revocation queued for ' + subject + ' (paused at waiting_for_owner)');
      });
    });

    Array.prototype.slice.call(root.querySelectorAll('[data-settings-danger-action]')).forEach(function bindDanger(btn) {
      if (btn._viSettingsDangerBound) return;
      btn._viSettingsDangerBound = true;
      addListener(btn, 'click', function onDangerClick() {
        var action = btn.getAttribute('data-settings-danger-action') || 'destructive action';
        setReceipt(root, action + ' requires explicit confirmation and pauses at waiting_for_owner');
      });
    });

    // 7. Modal / Popover open + Escape close with focus restoration
    var lastFocused = null;
    var modalBackdrop = root.querySelector('[data-settings-modal]');

    function closeModal() {
      if (!modalBackdrop || modalBackdrop.hidden) return;
      modalBackdrop.hidden = true;
      Array.prototype.slice.call(root.querySelectorAll('[data-settings-open-modal][aria-expanded="true"]')).forEach(function (b) {
        b.setAttribute('aria-expanded', 'false');
      });
      if (lastFocused && typeof lastFocused.focus === 'function') {
        lastFocused.focus();
        lastFocused = null;
      }
    }

    function openModal(trigger) {
      if (!modalBackdrop) return;
      lastFocused = trigger || (doc && doc.activeElement) || null;
      modalBackdrop.hidden = false;
      if (trigger && trigger.hasAttribute('aria-expanded')) {
        trigger.setAttribute('aria-expanded', 'true');
      }
      var focusTarget = modalBackdrop.querySelector('input, button, select');
      if (focusTarget && typeof focusTarget.focus === 'function') {
        focusTarget.focus();
      }
    }

    Array.prototype.slice.call(root.querySelectorAll('[data-settings-open-modal]')).forEach(function bindOpen(btn) {
      if (btn._viSettingsOpenBound) return;
      btn._viSettingsOpenBound = true;
      addListener(btn, 'click', function onOpenClick() {
        openModal(btn);
      });
    });

    Array.prototype.slice.call(root.querySelectorAll('[data-settings-close-modal]')).forEach(function bindClose(btn) {
      if (btn._viSettingsCloseBound) return;
      btn._viSettingsCloseBound = true;
      addListener(btn, 'click', closeModal);
    });

    if (modalBackdrop) {
      addListener(modalBackdrop, 'click', function onBackdropClick(ev) {
        if (ev.target === modalBackdrop) closeModal();
      });
      if (doc) {
        addListener(doc, 'keydown', function onEsc(ev) {
          if (ev.key === 'Escape' && !ev.defaultPrevented && !modalBackdrop.hidden &&
              !doc.querySelector('dialog:modal, [popover]:popover-open')) {
            ev.preventDefault();
            closeModal();
          }
        });
      }
    }

    return {
      setTheme: setTheme,
      openModal: openModal,
      closeModal: closeModal,
      destroy: function destroy() {
        for (var i = 0; i < cleanups.length; i += 1) {
          cleanups[i]();
        }
        cleanups.length = 0;
      },
    };
  }

  return {
    initSettingsSurface: initSettingsSurface,
  };
});
