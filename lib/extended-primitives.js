'use strict';

/**
 * Nocturne Museum: Progressive-enhancement controller for Extended UI Primitives
 * (zero dependencies, CSP-safe, Shadow DOM compatible).
 *
 * Controllers:
 *   1. [data-vi-context-menu]  -- WAI-ARIA dropdown/context menu with roving focus & Esc
 *   2. [data-vi-shortcuts]     -- keyboard shortcuts dialog, ? toggle, live filter & reset
 *   3. [data-vi-avatar-group]  -- monogram avatar stack + overflow roster popover toggle
 *   4. [data-vi-command-bar]   -- segmented runner tabs, MCP flag switch & clipboard receipt
 */

(function attachExtendedPrimitives(rootGlobal, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (rootGlobal && typeof rootGlobal === 'object') {
    rootGlobal.ViExtendedPrimitives = api;
  }
  if (typeof document !== 'undefined') {
    var boot = function bootExtended() {
      api.initExtendedPrimitives(document);
    };
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', boot, { once: true });
    } else {
      boot();
    }
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function createExtendedPrimitivesApi() {
  function isEventInside(ev, targetHost) {
    if (ev && typeof ev.composedPath === 'function') {
      return ev.composedPath().indexOf(targetHost) !== -1;
    }
    if (ev && ev.target && typeof targetHost.contains === 'function') {
      return targetHost.contains(ev.target);
    }
    return true;
  }

  function isEditableTarget(ev) {
    var node = ev && typeof ev.composedPath === 'function' ? ev.composedPath()[0] : (ev ? ev.target : null);
    if (!node || typeof node !== 'object') return false;
    var tag = node.tagName ? String(node.tagName).toUpperCase() : '';
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
    return Boolean(node.isContentEditable);
  }

  function initExtendedPrimitives(container) {
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

    // 1. Context Menu Popover
    Array.prototype.slice.call(root.querySelectorAll('[data-vi-context-menu]')).forEach(function (host) {
      if (host._viMenuBound) return;
      host._viMenuBound = true;
      cleanups.push(function () { host._viMenuBound = false; });

      var trigger = host.querySelector('[data-menu-trigger]');
      var panel = host.querySelector('[data-menu-panel]');
      var statusEl = host.querySelector('[data-menu-status]');
      var items = Array.prototype.slice.call(host.querySelectorAll('[data-menu-item]'));

      function setRovingFocus(idx) {
        if (items.length === 0) return;
        var nextIdx = ((idx % items.length) + items.length) % items.length;
        items.forEach(function (item, i) {
          item.setAttribute('tabindex', i === nextIdx ? '0' : '-1');
        });
        if (typeof items[nextIdx].focus === 'function') {
          items[nextIdx].focus();
        }
      }

      function setMenuOpen(open, focusIdx) {
        if (!panel || !trigger) return;
        panel.hidden = !open;
        trigger.setAttribute('aria-expanded', open ? 'true' : 'false');
        if (open) {
          if (typeof focusIdx === 'number') {
            setRovingFocus(focusIdx);
          } else {
            items.forEach(function (item, i) {
              item.setAttribute('tabindex', i === 0 ? '0' : '-1');
            });
          }
        }
      }

      function activateItem(item) {
        if (!item) return;
        var label = item.getAttribute('data-menu-label') || item.textContent.trim();
        if (item.getAttribute('aria-disabled') === 'true') {
          if (statusEl) {
            var reason = item.getAttribute('data-menu-reason') || 'Unavailable';
            statusEl.textContent = label + ' unavailable: ' + reason;
          }
          return;
        }
        var role = item.getAttribute('role');
        if (role === 'menuitemcheckbox') {
          var nextChecked = item.getAttribute('aria-checked') !== 'true';
          item.setAttribute('aria-checked', nextChecked ? 'true' : 'false');
          if (statusEl) statusEl.textContent = label + ': ' + (nextChecked ? 'on' : 'off');
          return;
        }
        if (role === 'menuitemradio') {
          var groupName = item.getAttribute('data-radio-group');
          items.forEach(function (other) {
            if (other.getAttribute('role') === 'menuitemradio' && (!groupName || other.getAttribute('data-radio-group') === groupName)) {
              other.setAttribute('aria-checked', other === item ? 'true' : 'false');
            }
          });
          if (statusEl) statusEl.textContent = 'Density: ' + label;
          return;
        }
        if (statusEl) {
          statusEl.textContent = item.hasAttribute('data-menu-destructive')
            ? 'Staged action: ' + label
            : 'Triggered: ' + label;
        }
        setMenuOpen(false);
        if (trigger && typeof trigger.focus === 'function') trigger.focus();
      }

      if (trigger && panel) {
        on(trigger, 'click', function () {
          var open = panel.hidden;
          setMenuOpen(open, open ? 0 : undefined);
          if (statusEl) statusEl.textContent = open ? 'Menu open' : 'Menu closed';
        });

        on(trigger, 'keydown', function (ev) {
          if (ev.key === 'ArrowDown' || ev.key === 'Enter' || ev.key === ' ') {
            if (panel.hidden) {
              ev.preventDefault();
              setMenuOpen(true, 0);
              if (statusEl) statusEl.textContent = 'Menu open';
            }
          } else if (ev.key === 'ArrowUp') {
            if (panel.hidden) {
              ev.preventDefault();
              setMenuOpen(true, Math.max(0, items.length - 1));
              if (statusEl) statusEl.textContent = 'Menu open';
            }
          } else if (ev.key === 'Escape' && !panel.hidden) {
            ev.preventDefault();
            setMenuOpen(false);
            if (statusEl) statusEl.textContent = 'Menu closed';
          }
        });
      }

      items.forEach(function (item, idx) {
        on(item, 'click', function () {
          activateItem(item);
        });
        on(item, 'keydown', function (ev) {
          if (ev.key === 'ArrowDown') {
            ev.preventDefault();
            setRovingFocus(idx + 1);
          } else if (ev.key === 'ArrowUp') {
            ev.preventDefault();
            setRovingFocus(idx - 1);
          } else if (ev.key === 'Home') {
            ev.preventDefault();
            setRovingFocus(0);
          } else if (ev.key === 'End') {
            ev.preventDefault();
            setRovingFocus(items.length - 1);
          } else if (ev.key === 'Escape') {
            ev.preventDefault();
            setMenuOpen(false);
            if (statusEl) statusEl.textContent = 'Menu closed';
            if (trigger && typeof trigger.focus === 'function') trigger.focus();
          } else if (ev.key === 'Tab') {
            setMenuOpen(false);
          } else if (ev.key === 'Enter' || ev.key === ' ') {
            ev.preventDefault();
            activateItem(item);
          }
        });
      });

      if (doc) {
        on(doc, 'click', function (ev) {
          if (!panel || panel.hidden) return;
          if (!isEventInside(ev, host)) {
            setMenuOpen(false);
            if (statusEl) statusEl.textContent = 'Menu closed';
          }
        });
      }
    });

    // 2. Keyboard Shortcuts Sheet
    Array.prototype.slice.call(root.querySelectorAll('[data-vi-shortcuts]')).forEach(function (host) {
      if (host._viShortcutsBound) return;
      host._viShortcutsBound = true;
      cleanups.push(function () { host._viShortcutsBound = false; });

      var trigger = host.querySelector('[data-shortcuts-trigger]');
      var dialog = host.querySelector('[data-shortcuts-dialog]');
      var closeBtn = host.querySelector('[data-shortcuts-close]');
      var input = host.querySelector('[data-shortcuts-input]');
      var resetBtn = host.querySelector('[data-shortcuts-reset]');
      var emptyEl = host.querySelector('[data-shortcuts-empty]');
      var statusEl = host.querySelector('[data-shortcuts-status]');
      var rows = Array.prototype.slice.call(host.querySelectorAll('[data-shortcut-row]'));
      var groups = Array.prototype.slice.call(host.querySelectorAll('[data-shortcut-group]'));

      function applyFilter() {
        var q = (input ? input.value : '').trim().toLowerCase();
        var visibleCount = 0;
        rows.forEach(function (row) {
          var hay = ((row.getAttribute('data-shortcut-search') || '') + ' ' + (row.textContent || '')).toLowerCase();
          var match = !q || hay.indexOf(q) !== -1;
          row.hidden = !match;
          if (match) visibleCount += 1;
        });
        groups.forEach(function (grp) {
          var any = Array.prototype.slice.call(grp.querySelectorAll('[data-shortcut-row]')).some(function (r) {
            return !r.hidden;
          });
          grp.hidden = !any;
        });
        if (emptyEl) emptyEl.hidden = visibleCount !== 0;
        if (statusEl) {
          statusEl.textContent = visibleCount === 1 ? '1 shortcut' : visibleCount + ' shortcuts';
        }
      }

      function setOpen(open) {
        if (!dialog) return;
        dialog.hidden = !open;
        if (trigger) trigger.setAttribute('aria-expanded', open ? 'true' : 'false');
        if (open) {
          if (input && typeof input.focus === 'function') input.focus();
        } else if (trigger && typeof trigger.focus === 'function') {
          trigger.focus();
        }
      }

      if (input) {
        on(input, 'input', applyFilter);
        on(input, 'keydown', function (ev) {
          if (ev.key === 'Escape') {
            ev.preventDefault();
            if (input.value) {
              input.value = '';
              applyFilter();
            } else {
              setOpen(false);
            }
          }
        });
      }

      if (resetBtn) {
        on(resetBtn, 'click', function () {
          if (input) {
            input.value = '';
            applyFilter();
            if (typeof input.focus === 'function') input.focus();
          }
        });
      }

      if (trigger) {
        on(trigger, 'click', function () {
          if (dialog) setOpen(dialog.hidden);
        });
      }

      if (closeBtn) {
        on(closeBtn, 'click', function () {
          setOpen(false);
        });
      }

      if (dialog) {
        on(dialog, 'keydown', function (ev) {
          if (ev.key === 'Escape') {
            ev.preventDefault();
            if (input && input.value) {
              input.value = '';
              applyFilter();
              if (typeof input.focus === 'function') input.focus();
            } else {
              setOpen(false);
            }
          }
        });
      }

      if (doc) {
        on(doc, 'keydown', function (ev) {
          if (ev.key !== '?' || ev.ctrlKey || ev.metaKey || ev.altKey) return;
          if (isEditableTarget(ev)) return;
          if (!dialog) return;
          ev.preventDefault();
          setOpen(dialog.hidden);
        });
      }

      applyFilter();
    });

    // 3. Avatar Group & Presence
    Array.prototype.slice.call(root.querySelectorAll('[data-vi-avatar-group]')).forEach(function (host) {
      if (host._viAvatarBound) return;
      host._viAvatarBound = true;
      cleanups.push(function () { host._viAvatarBound = false; });

      var overflowBtn = host.querySelector('[data-avatar-overflow]');
      var popover = host.querySelector('[data-avatar-popover]');
      var closeBtn = host.querySelector('[data-avatar-close]');
      var statusEl = host.querySelector('[data-avatar-status]');

      function setPopoverOpen(open) {
        if (!overflowBtn || !popover) return;
        popover.hidden = !open;
        overflowBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
        if (statusEl) {
          statusEl.textContent = open ? '6 team members · overflow open' : '6 team members · 2 in overflow';
        }
      }

      if (overflowBtn && popover) {
        on(overflowBtn, 'click', function () {
          setPopoverOpen(popover.hidden);
        });
        on(overflowBtn, 'keydown', function (ev) {
          if (ev.key === 'Escape' && !popover.hidden) {
            ev.preventDefault();
            setPopoverOpen(false);
          }
        });
        on(popover, 'keydown', function (ev) {
          if (ev.key === 'Escape') {
            ev.preventDefault();
            setPopoverOpen(false);
            if (typeof overflowBtn.focus === 'function') overflowBtn.focus();
          }
        });
      }

      if (closeBtn && overflowBtn) {
        on(closeBtn, 'click', function () {
          setPopoverOpen(false);
          if (typeof overflowBtn.focus === 'function') overflowBtn.focus();
        });
      }

      if (doc) {
        on(doc, 'click', function (ev) {
          if (!popover || popover.hidden) return;
          if (!isEventInside(ev, host)) {
            setPopoverOpen(false);
          }
        });
      }
    });

    // 4. Copy Command Bar
    Array.prototype.slice.call(root.querySelectorAll('[data-vi-command-bar]')).forEach(function (host) {
      if (host._viCmdBarBound) return;
      host._viCmdBarBound = true;
      cleanups.push(function () { host._viCmdBarBound = false; });

      var COMMANDS = {
        npm: {
          base: 'npm install @vidoxlabs/videsign',
          mcp: 'npm install @vidoxlabs/videsign && npx @vidoxlabs/videsign --mcp',
        },
        pnpm: {
          base: 'pnpm add @vidoxlabs/videsign',
          mcp: 'pnpm add @vidoxlabs/videsign && pnpm dlx @vidoxlabs/videsign --mcp',
        },
        cli: {
          base: 'videsign tokens --check',
          mcp: 'videsign tokens --check --with-mcp',
        },
      };

      var tabs = Array.prototype.slice.call(host.querySelectorAll('[data-runner]'));
      var codeEl = host.querySelector('[data-cmd-text]');
      var flagBtn = host.querySelector('[data-cmd-flag]');
      var copyBtn = host.querySelector('[data-cmd-copy]');
      var statusEl = host.querySelector('[data-cmd-status]');
      var currentRunner = 'npm';
      var includeMcp = false;

      function currentCommand() {
        var activeTab = null;
        tabs.forEach(function (t) {
          if (t.getAttribute('data-runner') === currentRunner) activeTab = t;
        });
        if (activeTab) {
          var attrCmd = activeTab.getAttribute(includeMcp ? 'data-cmd-mcp' : 'data-cmd-base');
          if (attrCmd) return attrCmd;
        }
        var entry = COMMANDS[currentRunner] || COMMANDS.npm;
        return includeMcp ? entry.mcp : entry.base;
      }

      function renderCommand(statusText) {
        if (codeEl) codeEl.textContent = currentCommand();
        if (statusEl && statusText) statusEl.textContent = statusText;
      }

      function selectRunner(runner) {
        currentRunner = Object.prototype.hasOwnProperty.call(COMMANDS, runner) ? runner : 'npm';
        tabs.forEach(function (t) {
          var active = t.getAttribute('data-runner') === currentRunner;
          t.setAttribute('aria-selected', active ? 'true' : 'false');
          t.setAttribute('tabindex', active ? '0' : '-1');
        });
        renderCommand('Ready to copy');
      }

      tabs.forEach(function (tab, idx) {
        on(tab, 'click', function () {
          selectRunner(tab.getAttribute('data-runner') || 'npm');
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

      if (flagBtn) {
        on(flagBtn, 'click', function () {
          includeMcp = flagBtn.getAttribute('aria-checked') !== 'true';
          flagBtn.setAttribute('aria-checked', includeMcp ? 'true' : 'false');
          renderCommand(includeMcp ? 'MCP config flag added' : 'MCP config flag removed');
        });
      }

      if (copyBtn) {
        on(copyBtn, 'click', function () {
          var cmd = currentCommand();
          if (typeof navigator !== 'undefined' && navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
            navigator.clipboard.writeText(cmd).then(function () {
              if (statusEl) statusEl.textContent = 'Copied';
            }).catch(function () {
              if (statusEl) statusEl.textContent = 'Copy ready; clipboard access unavailable';
            });
          } else if (statusEl) {
            statusEl.textContent = 'Copied';
          }
        });
      }

      renderCommand('Ready to copy');
    });

    return {
      destroy: function () {
        for (var i = 0; i < cleanups.length; i += 1) cleanups[i]();
        cleanups.length = 0;
      },
    };
  }

  return {
    initExtendedPrimitives: initExtendedPrimitives,
  };
});
