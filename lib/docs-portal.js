'use strict';

/**
 * Nocturne Museum: Lightweight progressive-enhancement controller for the
 * documentation portal and upgraded renderer (zero dependencies, CSP-safe).
 *
 * Features:
 *   - Scroll-spy TOC active heading tracking via IntersectionObserver
 *   - Cmd+K / Ctrl+K command palette shortcut, live filtering, arrow-key nav, Esc close
 *   - Mobile navigation drawer & Ask Violet sheet open/Esc close with focus restoration
 *   - Hub / Article view switching inside layout-docs-portal
 *   - Client-side quickstart facet filtering with aria-live="polite" count updates
 *   - Synced multi-language code tabs with ArrowLeft, ArrowRight, Home, and End + localStorage persistence
 *   - Clipboard copy (code blocks, heading anchors, section links, page markdown) with live toast
 *
 * Graceful degradation: all semantic links, <details> trees, tabs, and code blocks remain
 * readable and navigable with JavaScript disabled.
 */

(function attachDocsPortal(rootGlobal, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (rootGlobal && typeof rootGlobal === 'object') {
    rootGlobal.ViDocsPortal = api;
  }
  if (typeof document !== 'undefined') {
    var boot = function bootPortal() {
      api.initDocsPortal(document);
    };
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', boot, { once: true });
    } else {
      boot();
    }
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function createDocsPortalApi() {
  var LANG_STORAGE_KEY = 'videsign.docs.lang';

  function readStoredLang() {
    try {
      if (typeof localStorage !== 'undefined' && localStorage) {
        return localStorage.getItem(LANG_STORAGE_KEY) || '';
      }
    } catch (_err) {
      return '';
    }
    return '';
  }

  function writeStoredLang(lang) {
    try {
      if (typeof localStorage !== 'undefined' && localStorage) {
        localStorage.setItem(LANG_STORAGE_KEY, lang);
      }
    } catch (_err) {
      // Ignore storage failures in sandboxed frames or private browsing.
    }
  }

  function copyText(text) {
    if (typeof navigator !== 'undefined' && navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
      return Promise.resolve(navigator.clipboard.writeText(text)).catch(function () {
        return false;
      });
    }
    return Promise.resolve(true);
  }

  function extractArticleMarkdown(root) {
    var article = root.querySelector('[data-docs-article]');
    if (!article) return '';
    var lines = [];
    var nodes = article.querySelectorAll('h1, h2, h3, p, pre code');
    for (var i = 0; i < nodes.length; i += 1) {
      var el = nodes[i];
      var tag = el.tagName ? el.tagName.toLowerCase() : '';
      var raw = (el.textContent || '').replace(/\s+#\s*$/, '').trim();
      if (!raw) continue;
      if (tag === 'h1') lines.push('# ' + raw);
      else if (tag === 'h2') lines.push('## ' + raw);
      else if (tag === 'h3') lines.push('### ' + raw);
      else if (tag === 'code') lines.push('```\n' + el.textContent.trim() + '\n```');
      else lines.push(raw);
    }
    return lines.join('\n\n');
  }

  function initDocsPortal(container) {
    var root = container || (typeof document !== 'undefined' ? document : null);
    if (!root || typeof root.querySelectorAll !== 'function') {
      return { destroy: function noop() {} };
    }

    var doc = root.ownerDocument || (root.nodeType === 9 ? root : (typeof document !== 'undefined' ? document : null));
    var cleanups = [];
    var toastTimer = null;

    function addListener(target, type, handler, options) {
      if (!target || typeof target.addEventListener !== 'function') return;
      target.addEventListener(type, handler, options);
      cleanups.push(function remove() {
        target.removeEventListener(type, handler, options);
      });
    }

    function announceToast(message) {
      var toast = root.querySelector('[data-docs-toast]') || (doc && doc.querySelector('[data-docs-toast]'));
      if (!toast) return;
      toast.textContent = message;
      toast.hidden = false;
      if (toastTimer) clearTimeout(toastTimer);
      toastTimer = setTimeout(function hideToast() {
        toast.hidden = true;
      }, 2200);
    }

    // 1. Synced multi-language code tabs + keyboard roving + localStorage persistence
    var tabGroups = Array.prototype.slice.call(root.querySelectorAll('[data-docs-code-tabs]'));
    function activateCodeLang(syncGroup, lang, persist) {
      tabGroups.forEach(function updateGroup(group) {
        var gName = group.getAttribute('data-docs-sync-group') || 'default';
        if (gName !== syncGroup) return;
        var tabs = Array.prototype.slice.call(group.querySelectorAll('[role="tab"][data-docs-lang]'));
        var hasLang = tabs.some(function (t) { return t.getAttribute('data-docs-lang') === lang; });
        if (!hasLang) return;
        tabs.forEach(function setTab(tab) {
          var isSelected = tab.getAttribute('data-docs-lang') === lang;
          tab.setAttribute('aria-selected', isSelected ? 'true' : 'false');
          tab.setAttribute('tabindex', isSelected ? '0' : '-1');
        });
        var panels = Array.prototype.slice.call(group.querySelectorAll('[role="tabpanel"][data-docs-lang]'));
        panels.forEach(function setPanel(panel) {
          panel.hidden = panel.getAttribute('data-docs-lang') !== lang;
        });
      });
      if (persist) writeStoredLang(lang);
    }

    var savedLang = readStoredLang();
    tabGroups.forEach(function bindCodeGroup(group) {
      if (group._viDocsCodeBound) return;
      group._viDocsCodeBound = true;
      var syncGroup = group.getAttribute('data-docs-sync-group') || 'default';
      var tabs = Array.prototype.slice.call(group.querySelectorAll('[role="tab"][data-docs-lang]'));
      if (savedLang) {
        activateCodeLang(syncGroup, savedLang, false);
      }
      tabs.forEach(function bindTab(tab, idx) {
        addListener(tab, 'click', function onTabClick() {
          var lang = tab.getAttribute('data-docs-lang');
          if (lang) activateCodeLang(syncGroup, lang, true);
        });
        addListener(tab, 'keydown', function onTabKeydown(ev) {
          var nextIdx = -1;
          if (ev.key === 'ArrowRight') nextIdx = (idx + 1) % tabs.length;
          else if (ev.key === 'ArrowLeft') nextIdx = (idx - 1 + tabs.length) % tabs.length;
          else if (ev.key === 'Home') nextIdx = 0;
          else if (ev.key === 'End') nextIdx = tabs.length - 1;
          if (nextIdx === -1) return;
          ev.preventDefault();
          var nextTab = tabs[nextIdx];
          var nextLang = nextTab.getAttribute('data-docs-lang');
          if (nextLang) activateCodeLang(syncGroup, nextLang, true);
          if (typeof nextTab.focus === 'function') nextTab.focus();
        });
      });

      var copyBtn = group.querySelector('[data-docs-copy-code]');
      var statusEl = group.querySelector('[data-docs-code-status]');
      if (copyBtn) {
        addListener(copyBtn, 'click', function onCopyCode() {
          var activePanel = group.querySelector('[role="tabpanel"]:not([hidden])');
          var codeEl = activePanel ? activePanel.querySelector('code') : null;
          var text = codeEl ? codeEl.textContent : '';
          copyText(text).then(function () {
            if (statusEl) statusEl.textContent = 'Copied snippet';
            announceToast('Copied code snippet');
          });
        });
      }
    });

    // 2. Faceted quickstart filtering with aria-live="polite" result counter
    var qsSections = Array.prototype.slice.call(root.querySelectorAll('[data-docs-qs-section]'));
    qsSections.forEach(function bindQsSection(section) {
      if (section._viDocsQsBound) return;
      section._viDocsQsBound = true;
      var pills = Array.prototype.slice.call(section.querySelectorAll('[data-docs-facet]'));
      var cards = Array.prototype.slice.call(section.querySelectorAll('[data-docs-qs-card]'));
      var countEl = section.querySelector('[data-docs-qs-count]');
      var emptyEl = section.querySelector('[data-docs-qs-empty]');
      var resetBtn = section.querySelector('[data-docs-qs-reset]');

      function applyFacet(facet) {
        var visible = 0;
        pills.forEach(function updatePill(pill) {
          pill.setAttribute('aria-pressed', pill.getAttribute('data-docs-facet') === facet ? 'true' : 'false');
        });
        cards.forEach(function updateCard(card) {
          var cat = card.getAttribute('data-docs-category') || '';
          var match = facet === 'all' || cat === facet;
          card.hidden = !match;
          if (match) visible += 1;
        });
        if (countEl) {
          countEl.textContent = 'Showing ' + visible + ' of ' + cards.length + ' quickstarts';
        }
        if (emptyEl) {
          emptyEl.hidden = visible !== 0;
        }
      }

      pills.forEach(function bindPill(pill) {
        addListener(pill, 'click', function onFacetClick() {
          applyFacet(pill.getAttribute('data-docs-facet') || 'all');
        });
      });

      if (resetBtn) {
        addListener(resetBtn, 'click', function onReset() {
          applyFacet('all');
        });
      }
    });

    // 3. View switcher (Docs hub vs Article & API) inside layout-docs-portal
    var viewButtons = Array.prototype.slice.call(root.querySelectorAll('[data-docs-view-tab]'));
    var viewPanels = Array.prototype.slice.call(root.querySelectorAll('[data-docs-view-panel]'));
    function setActiveView(viewId) {
      viewButtons.forEach(function updateViewBtn(btn) {
        var active = btn.getAttribute('data-docs-view-tab') === viewId;
        btn.setAttribute('aria-pressed', active ? 'true' : 'false');
      });
      viewPanels.forEach(function updateViewPanel(panel) {
        panel.hidden = viewId !== 'all' && panel.getAttribute('data-docs-view-panel') !== viewId;
      });
    }
    viewButtons.forEach(function bindViewBtn(btn) {
      if (btn._viDocsViewBound) return;
      btn._viDocsViewBound = true;
      addListener(btn, 'click', function onViewClick() {
        setActiveView(btn.getAttribute('data-docs-view-tab') || 'hub');
      });
    });

    // 4. Scroll-spy TOC active heading tracking via IntersectionObserver
    var tocLinks = Array.prototype.slice.call(root.querySelectorAll('[data-docs-toc-link]'));
    function setActiveTocId(targetId) {
      if (!targetId) return;
      tocLinks.forEach(function updateToc(link) {
        var href = link.getAttribute('href') || '';
        if (href === '#' + targetId) {
          link.setAttribute('aria-current', 'location');
        } else {
          link.removeAttribute('aria-current');
        }
      });
    }

    if (tocLinks.length > 0) {
      var seenIds = {};
      var observedHeadings = [];
      tocLinks.forEach(function collectHeading(link) {
        var href = link.getAttribute('href') || '';
        if (href.charAt(0) === '#') {
          var id = href.slice(1);
          if (id && !seenIds[id]) {
            seenIds[id] = true;
            var heading = doc && typeof doc.getElementById === 'function'
              ? doc.getElementById(id)
              : root.querySelector('#' + id);
            if (heading) observedHeadings.push(heading);
          }
        }
        addListener(link, 'click', function onTocClick() {
          var targetId = (link.getAttribute('href') || '').replace(/^#/, '');
          if (targetId) {
            var articlePanel = root.querySelector('[data-docs-view-panel="article"]');
            if (articlePanel && articlePanel.hidden) setActiveView('article');
            setActiveTocId(targetId);
          }
        });
      });

      if (observedHeadings.length > 0 && typeof IntersectionObserver !== 'undefined') {
        var spyObserver = new IntersectionObserver(function onIntersect(entries) {
          for (var i = 0; i < entries.length; i += 1) {
            if (entries[i].isIntersecting && entries[i].target && entries[i].target.id) {
              setActiveTocId(entries[i].target.id);
              break;
            }
          }
        }, { rootMargin: '-18% 0px -65% 0px', threshold: 0 });
        observedHeadings.forEach(function observeHeading(h) {
          spyObserver.observe(h);
        });
        cleanups.push(function disconnectSpy() {
          spyObserver.disconnect();
        });
      }
    }

    // 5. Dialog overlays (Cmd+K palette, mobile nav drawer, Ask Violet sheet)
    var lastFocused = null;
    var palette = root.querySelector('[data-docs-palette]');
    var drawer = root.querySelector('[data-docs-drawer]');
    var chatSheet = root.querySelector('[data-docs-chat-sheet]');

    function closeAllOverlays() {
      [palette, drawer, chatSheet].forEach(function hideOverlay(el) {
        if (el) el.hidden = true;
      });
      var openers = Array.prototype.slice.call(root.querySelectorAll('[aria-expanded="true"]'));
      openers.forEach(function resetExpanded(btn) {
        btn.setAttribute('aria-expanded', 'false');
      });
      if (lastFocused && typeof lastFocused.focus === 'function') {
        lastFocused.focus();
        lastFocused = null;
      }
    }

    function openOverlay(overlay, trigger) {
      if (!overlay) return;
      closeAllOverlays();
      lastFocused = trigger || (doc && doc.activeElement) || null;
      overlay.hidden = false;
      if (trigger && trigger.hasAttribute('aria-expanded')) {
        trigger.setAttribute('aria-expanded', 'true');
      }
      var firstFocusable = overlay.querySelector('input, button, a[href], textarea');
      if (firstFocusable && typeof firstFocusable.focus === 'function') {
        firstFocusable.focus();
      }
    }

    if (palette) {
      var paletteSearch = palette.querySelector('[data-docs-palette-input]');
      var paletteOptions = Array.prototype.slice.call(palette.querySelectorAll('[data-docs-palette-option]'));
      var paletteCount = palette.querySelector('[data-docs-palette-count]');
      var activeOptionIdx = 0;

      function visibleOptions() {
        return paletteOptions.filter(function (opt) { return !opt.hidden; });
      }

      function highlightOption(index) {
        var opts = visibleOptions();
        if (opts.length === 0) return;
        activeOptionIdx = (index + opts.length) % opts.length;
        opts.forEach(function markOpt(opt, idx) {
          opt.setAttribute('aria-selected', idx === activeOptionIdx ? 'true' : 'false');
        });
      }

      if (paletteSearch) {
        addListener(paletteSearch, 'input', function onPaletteInput() {
          var q = (paletteSearch.value || '').trim().toLowerCase();
          var matched = 0;
          paletteOptions.forEach(function filterOpt(opt) {
            var hay = (opt.textContent || '').toLowerCase();
            var match = !q || hay.indexOf(q) !== -1;
            opt.hidden = !match;
            if (match) matched += 1;
          });
          if (paletteCount) {
            paletteCount.textContent = matched + ' commands matched';
          }
          highlightOption(0);
        });
      }

      addListener(palette, 'keydown', function onPaletteKey(ev) {
        if (ev.key === 'ArrowDown') {
          ev.preventDefault();
          highlightOption(activeOptionIdx + 1);
        } else if (ev.key === 'ArrowUp') {
          ev.preventDefault();
          highlightOption(activeOptionIdx - 1);
        } else if (ev.key === 'Enter') {
          var opts = visibleOptions();
          if (opts[activeOptionIdx]) {
            ev.preventDefault();
            opts[activeOptionIdx].click();
          }
        }
      });

      paletteOptions.forEach(function bindOpt(opt) {
        addListener(opt, 'click', function onOptClick() {
          var targetView = opt.getAttribute('data-docs-jump-view');
          var targetHash = opt.getAttribute('data-docs-jump-hash');
          if (targetView) setActiveView(targetView);
          closeAllOverlays();
          if (targetHash) {
            var el = doc && typeof doc.getElementById === 'function' ? doc.getElementById(targetHash) : null;
            if (el && typeof el.scrollIntoView === 'function') el.scrollIntoView();
          }
        });
      });

      addListener(palette, 'click', function onPaletteBackdrop(ev) {
        if (ev.target === palette) closeAllOverlays();
      });
    }

    if (drawer) {
      addListener(drawer, 'click', function onDrawerBackdrop(ev) {
        if (ev.target === drawer) closeAllOverlays();
      });
    }

    Array.prototype.slice.call(root.querySelectorAll('[data-docs-open-palette]')).forEach(function (btn) {
      addListener(btn, 'click', function () { openOverlay(palette, btn); });
    });
    Array.prototype.slice.call(root.querySelectorAll('[data-docs-open-drawer]')).forEach(function (btn) {
      addListener(btn, 'click', function () { openOverlay(drawer, btn); });
    });
    Array.prototype.slice.call(root.querySelectorAll('[data-docs-open-chat]')).forEach(function (btn) {
      addListener(btn, 'click', function () { openOverlay(chatSheet, btn); });
    });
    Array.prototype.slice.call(root.querySelectorAll('[data-docs-close-overlay]')).forEach(function (btn) {
      addListener(btn, 'click', closeAllOverlays);
    });

    // Global keyboard shortcut: Cmd+K / Ctrl+K opens palette; Escape closes active overlay
    if (doc && (palette || drawer || chatSheet)) {
      addListener(doc, 'keydown', function onGlobalKeydown(ev) {
        if ((ev.metaKey || ev.ctrlKey) && String(ev.key || '').toLowerCase() === 'k') {
          if (palette) {
            ev.preventDefault();
            if (palette.hidden) openOverlay(palette, doc.activeElement);
            else closeAllOverlays();
          }
          return;
        }
        if (ev.key === 'Escape') {
          var anyOpen = (palette && !palette.hidden) || (drawer && !drawer.hidden) || (chatSheet && !chatSheet.hidden);
          if (anyOpen) {
            ev.preventDefault();
            closeAllOverlays();
          }
        }
      });
    }

    // 6. Clipboard copy controls (heading anchors, section links, page markdown)
    Array.prototype.slice.call(root.querySelectorAll('[data-docs-copy-anchor], [data-docs-copy-section]')).forEach(function (btn) {
      if (btn._viDocsCopyBound) return;
      btn._viDocsCopyBound = true;
      addListener(btn, 'click', function onCopyLink() {
        var anchorId = btn.getAttribute('data-docs-copy-anchor') || btn.getAttribute('data-docs-copy-section') || '';
        var base = (typeof location !== 'undefined' && location.href ? location.href.split('#')[0] : '');
        var url = base + '#' + anchorId;
        copyText(url).then(function () {
          announceToast('Copied link #' + anchorId);
        });
      });
    });

    Array.prototype.slice.call(root.querySelectorAll('[data-docs-copy-markdown]')).forEach(function (btn) {
      if (btn._viDocsMdBound) return;
      btn._viDocsMdBound = true;
      addListener(btn, 'click', function onCopyMarkdown() {
        var md = btn.getAttribute('data-docs-md-source') || extractArticleMarkdown(root) || '# Nocturne Museum documentation';
        copyText(md).then(function () {
          var status = root.querySelector('[data-docs-actions-status]');
          if (status) status.textContent = 'Copied page as Markdown';
          announceToast('Copied page as Markdown');
        });
      });
    });

    // 7. Theme toggle inside portal header
    Array.prototype.slice.call(root.querySelectorAll('[data-docs-toggle-theme]')).forEach(function (btn) {
      if (btn._viDocsThemeBound) return;
      btn._viDocsThemeBound = true;
      addListener(btn, 'click', function onToggleTheme() {
        var target = (doc && doc.documentElement) || root;
        var current = target.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
        var next = current === 'dark' ? 'light' : 'dark';
        target.setAttribute('data-theme', next);
        btn.setAttribute('aria-pressed', next === 'light' ? 'true' : 'false');
        btn.textContent = 'Theme: ' + next;
      });
    });

    return {
      activateCodeLang: activateCodeLang,
      setActiveView: setActiveView,
      openPalette: function () { openOverlay(palette, null); },
      closeOverlays: closeAllOverlays,
      destroy: function destroy() {
        if (toastTimer) {
          clearTimeout(toastTimer);
          toastTimer = null;
        }
        for (var i = 0; i < cleanups.length; i += 1) {
          cleanups[i]();
        }
        cleanups.length = 0;
      },
    };
  }

  return {
    LANG_STORAGE_KEY: LANG_STORAGE_KEY,
    extractArticleMarkdown: extractArticleMarkdown,
    initDocsPortal: initDocsPortal,
  };
});
