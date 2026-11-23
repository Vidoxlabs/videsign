'use strict';

/**
 * Nocturne Museum: Visual Catalog Shell Controller (zero dependencies, CSP-safe).
 * Drives dynamic manifest-backed counts, de-duplicated sidebar filtering, bottom Legacy toggle,
 * keyboard shortcuts ('/' search focus, 'Escape' clear/close), URL hash sync, height-matched
 * IntersectionObserver lazy hydration, Shadow DOM style isolation, per-specimen viewport frames
 * (320px / 768px / 1024px / Full), runtime data-theme / data-motion / data-glass toggles,
 * and the shared 4-tab Specimen Inspector Drawer.
 */

(function attachCatalogShell(rootGlobal, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (rootGlobal && typeof rootGlobal === 'object') {
    rootGlobal.ViCatalogShell = api;
  }
  if (typeof document !== 'undefined') {
    var boot = function bootCatalog() {
      if (rootGlobal && rootGlobal.VIDESIGN_CATALOG_DATA) {
        api.initCatalogShell(document, rootGlobal.VIDESIGN_CATALOG_DATA);
      }
    };
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', boot, { once: true });
    } else {
      boot();
    }
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function createCatalogShellApi() {
  var DIST_SHEETS = [
    '../dist/tokens.css',
    '../dist/themes.css',
    '../dist/catalog.css',
    '../dist/glass.css',
    '../dist/stage.css',
    '../dist/dialects.css',
    '../dist/memory-field.css',
    '../dist/vi-orbital-hero.css',
    '../dist/docs-portal.css',
    '../dist/settings-surface.css',
    '../dist/library-surface.css',
  ];

  var ISOLATION_BASE_CSS = [
    ':host { display: block; inline-size: 100%; }',
    '.vi-specimen-root { inline-size: 100%; color: var(--vi-colors-text-content-primary-base); font-family: var(--vi-typography-typography-family-sans-base); }',
    '.vi-specimen-root > [class*="fixed"] { position: static; transform: none; }',
    '.vi-specimen-root.is-stage-specimen { position: relative; block-size: 22.5rem; overflow: hidden; }',
    '.vi-specimen-root.is-stage-specimen > div { position: relative; inline-size: 100%; block-size: 100%; }',
    '.vi-specimen-root[data-motion="paused"] *, .vi-specimen-root[data-motion="paused"] *::before, .vi-specimen-root[data-motion="paused"] *::after,',
    '.vi-specimen-root[data-motion="reduced"] *, .vi-specimen-root[data-motion="reduced"] *::before, .vi-specimen-root[data-motion="reduced"] *::after {',
    '  transition-duration: 0ms !important; animation-duration: 0ms !important; scroll-behavior: auto !important;',
    '}',
  ].join('\n');

  function parseHashState(rawHash) {
    var hash = String(rawHash || '').trim();
    var out = { category: 'all', q: '', legacy: false, specimen: '' };
    if (!hash || hash === '#') return out;
    if (hash.indexOf('#frag-') === 0) {
      out.specimen = decodeURIComponent(hash.slice(6));
      return out;
    }
    var qIndex = hash.indexOf('?');
    if (qIndex === -1) return out;
    var queryStr = hash.slice(qIndex + 1);
    var params = new URLSearchParams(queryStr);
    if (params.get('category')) out.category = params.get('category').trim().toLowerCase();
    if (params.get('q')) out.q = params.get('q');
    if (params.get('legacy') === '1' || params.get('legacy') === 'true') out.legacy = true;
    if (params.get('specimen')) out.specimen = params.get('specimen').trim();
    return out;
  }

  function serializeHashState(state) {
    var params = new URLSearchParams();
    if (state.category && state.category !== 'all') params.set('category', state.category);
    if (state.q && state.q.trim()) params.set('q', state.q.trim());
    if (state.legacy) params.set('legacy', '1');
    if (state.specimen) params.set('specimen', state.specimen);
    var qs = params.toString();
    return qs ? '#catalog?' + qs : '#catalog';
  }

  function resolveAssets(raw) {
    return String(raw || '')
      .replace(/\{ASSET_BASE\}\/vi\/([^/]+)\/chibi\//g, '../assets/quarantine/run_20261103-snap/')
      .replace(/\{ASSET_BASE\}/g, '..');
  }

  function extractTokenReferences(html, allCssVarNames) {
    var found = new Set();
    var text = String(html || '');
    var varRe = /--vi-[a-z0-9-]+/gi;
    var m;
    while ((m = varRe.exec(text)) !== null) {
      found.add(m[0]);
    }
    var classRe = /\bclass="([^"]*)"/g;
    var classes = [];
    while ((m = classRe.exec(text)) !== null) {
      m[1].split(/\s+/).forEach(function (c) {
        if (c) classes.push(c);
      });
    }
    var tokenMap = {
      'bg-surface-': '--vi-colors-surface-',
      'text-text-': '--vi-colors-text-',
      'border-border-': '--vi-colors-border-',
      'border-surface-': '--vi-colors-surface-',
      'bg-persona-': '--vi-colors-persona-',
      'text-persona-': '--vi-colors-persona-',
      'bg-status-': '--vi-colors-status-',
      'text-status-': '--vi-colors-status-',
      'font-typography-': '--vi-typography-typography-',
      'text-typography-': '--vi-typography-typography-',
      'tracking-typography-': '--vi-typography-typography-',
      'leading-typography-': '--vi-typography-typography-',
      'rounded-layout-': '--vi-spacing-layout-',
      'p-layout-': '--vi-spacing-layout-',
      'px-layout-': '--vi-spacing-layout-',
      'py-layout-': '--vi-spacing-layout-',
      'gap-gap-': '--vi-space-gap-',
      'h-action-': '--vi-size-action-',
      'w-action-': '--vi-size-action-',
      'w-layout-': '--vi-size-layout-',
      'h-indicator-': '--vi-size-indicator-',
      'w-indicator-': '--vi-size-indicator-',
      'duration-transition-': '--vi-transition-transition-',
      'ease-transition-': '--vi-transition-transition-',
    };
    var prefixes = Object.keys(tokenMap);
    classes.forEach(function (rawCls) {
      var base = rawCls.indexOf(':') !== -1 ? rawCls.slice(rawCls.lastIndexOf(':') + 1) : rawCls;
      for (var i = 0; i < prefixes.length; i += 1) {
        var pre = prefixes[i];
        if (base.indexOf(pre) === 0) {
          var suffix = base.slice(pre.length);
          var candidate = tokenMap[pre] + suffix;
          if (!allCssVarNames || allCssVarNames.size === 0 || allCssVarNames.has(candidate)) {
            found.add(candidate);
          }
          break;
        }
      }
      if (base.indexOf('vi-glass') === 0) {
        found.add('--vi-effects-glass-crystal-surface-base');
        found.add('--vi-effects-glass-crystal-rim-base');
        found.add('--vi-effects-glass-crystal-core-base');
      }
      if (base.indexOf('vi-library-') === 0) {
        found.add('--vi-library-surface');
        found.add('--vi-library-card-bg');
        found.add('--vi-library-border-subtle');
        found.add('--vi-library-ink');
        found.add('--vi-library-accent');
      }
      if (base.indexOf('vi-settings-') === 0) {
        found.add('--vi-settings-rail-bg');
        found.add('--vi-settings-pane-bg');
        found.add('--vi-settings-border');
        found.add('--vi-settings-danger-border');
      }
      if (base.indexOf('vi-docs-') === 0) {
        found.add('--vi-docs-surface');
        found.add('--vi-docs-panel');
        found.add('--vi-docs-border');
      }
      if (base.indexOf('vi-agent') === 0) {
        found.add('--vi-dialect-gap');
        found.add('--vi-dialect-padding');
        found.add('--vi-dialect-leading');
      }
      if (base.indexOf('vi-orbital-') === 0) {
        found.add('--vi-orbital-surface');
        found.add('--vi-orbital-c1');
        found.add('--vi-orbital-c2');
        found.add('--vi-orbital-c3');
        found.add('--vi-orbital-c4');
      }
    });
    return Array.from(found).sort();
  }

  function accessibleNameOf(el, rootNode) {
    if (!el || typeof el.getAttribute !== 'function') return '';
    var ariaLabel = el.getAttribute('aria-label');
    if (ariaLabel && ariaLabel.trim()) return ariaLabel.trim();
    var labelledBy = el.getAttribute('aria-labelledby');
    if (labelledBy && rootNode && typeof rootNode.querySelector === 'function') {
      var parts = labelledBy.trim().split(/\s+/).map(function (id) {
        var target = rootNode.querySelector('#' + id);
        return target && target.textContent ? target.textContent.trim() : '';
      }).filter(Boolean);
      if (parts.length) return parts.join(' ');
    }
    if (el.id && rootNode && typeof rootNode.querySelector === 'function') {
      var lbl = rootNode.querySelector('label[for="' + el.id + '"]');
      if (lbl && lbl.textContent && lbl.textContent.trim()) return lbl.textContent.trim();
    }
    var txt = (el.textContent || el.getAttribute('placeholder') || el.getAttribute('alt') || '').replace(/\s+/g, ' ').trim();
    return txt.slice(0, 80);
  }

  function buildAccessibilitySnapshot(rootNode) {
    var snapshot = {
      landmarks: [],
      roles: [],
      interactive: [],
      touchPass: 0,
      touchWarn: 0,
    };
    if (!rootNode || typeof rootNode.querySelectorAll !== 'function') return snapshot;

    var landmarkSel = 'header, nav, main, aside, footer, section[aria-label], section[aria-labelledby], [role="region"], [role="dialog"], [role="log"], [role="search"]';
    Array.prototype.slice.call(rootNode.querySelectorAll(landmarkSel)).forEach(function (el) {
      var tag = (el.tagName || '').toLowerCase();
      var role = el.getAttribute('role') || tag;
      snapshot.landmarks.push({
        tag: tag,
        role: role,
        name: accessibleNameOf(el, rootNode) || '(unnamed)',
      });
    });

    Array.prototype.slice.call(rootNode.querySelectorAll('[role]')).forEach(function (el) {
      var role = el.getAttribute('role') || '';
      if (role === 'presentation' || role === 'none') return;
      var states = [];
      ['aria-selected', 'aria-pressed', 'aria-checked', 'aria-expanded', 'aria-live', 'aria-modal'].forEach(function (attr) {
        if (el.hasAttribute(attr)) states.push(attr + '=' + el.getAttribute(attr));
      });
      snapshot.roles.push({
        role: role,
        name: accessibleNameOf(el, rootNode) || '(unnamed)',
        states: states.join(', '),
      });
    });

    var interSel = 'button, a[href], input, select, textarea, summary, [role="button"], [role="tab"], [role="switch"], [role="radio"]';
    Array.prototype.slice.call(rootNode.querySelectorAll(interSel)).forEach(function (el) {
      if (el.hidden) return;
      var rect = typeof el.getBoundingClientRect === 'function' ? el.getBoundingClientRect() : null;
      var w = rect ? Math.round(rect.width) : 0;
      var h = rect ? Math.round(rect.height) : 0;
      var measured = w > 0 || h > 0;
      var passesTouch = !measured || h >= 44 || w >= 44;
      if (measured) {
        if (h >= 44) snapshot.touchPass += 1;
        else snapshot.touchWarn += 1;
      }
      snapshot.interactive.push({
        tag: (el.tagName || '').toLowerCase(),
        role: el.getAttribute('role') || (el.tagName || '').toLowerCase(),
        name: accessibleNameOf(el, rootNode) || '(unnamed)',
        size: measured ? (w + 'x' + h + 'px') : 'hidden/offscreen',
        passesTouch: passesTouch,
      });
    });

    return snapshot;
  }

  function isColorLike(val) {
    if (!val) return false;
    var v = val.trim().toLowerCase();
    return v.indexOf('oklch(') === 0 || v.indexOf('#') === 0 || v.indexOf('rgb') === 0 || v.indexOf('hsl') === 0;
  }

  function initCatalogShell(doc, config) {
    var rootDoc = doc || (typeof document !== 'undefined' ? document : null);
    if (!rootDoc || !config) return { destroy: function noop() {} };

    var TIERS = config.tiers || [];
    var FRAGMENTS = config.fragments || [];
    var win = rootDoc.defaultView || (typeof window !== 'undefined' ? window : null);

    var initialHash = parseHashState(win && win.location ? win.location.hash : '');
    var state = {
      category: initialHash.category || 'all',
      q: initialHash.q || '',
      legacy: Boolean(initialHash.legacy),
      specimen: initialHash.specimen || '',
      theme: rootDoc.documentElement.getAttribute('data-theme') || 'dark',
      motion: rootDoc.documentElement.getAttribute('data-motion') || 'paused',
      glass: rootDoc.documentElement.getAttribute('data-glass') || 'solid',
    };

    var activeFragments = FRAGMENTS.filter(function (f) { return f.tier !== 'legacy'; });
    var legacyFragments = FRAGMENTS.filter(function (f) { return f.tier === 'legacy'; });
    var manifestMap = {};
    var manifestComponentCount = null;
    var allCssVarNames = new Set();
    var sharedSheetsPromise = null;

    var mountedShadowRoots = [];
    var mountedIframes = [];
    var fragmentHtmlCache = {};
    var sectionNodes = {};
    var cardRecords = [];
    var recordById = {};
    var cleanups = [];

    function on(target, type, handler, opts) {
      if (!target || typeof target.addEventListener !== 'function') return;
      target.addEventListener(type, handler, opts);
      cleanups.push(function () {
        target.removeEventListener(type, handler, opts);
      });
    }

    function syncRuntimeAttributes() {
      var el = rootDoc.documentElement;
      el.setAttribute('data-theme', state.theme);
      el.setAttribute('data-motion', state.motion);
      el.setAttribute('data-glass', state.glass);

      mountedShadowRoots.forEach(function (entry) {
        if (entry.wrapper) {
          entry.wrapper.setAttribute('data-theme', state.theme);
          entry.wrapper.setAttribute('data-motion', state.motion);
          entry.wrapper.setAttribute('data-glass', state.glass);
        }
      });

      mountedIframes.forEach(function (iframe) {
        try {
          var idoc = iframe.contentDocument;
          if (!idoc || !idoc.documentElement) return;
          idoc.documentElement.setAttribute('data-theme', state.theme);
          idoc.documentElement.setAttribute('data-motion', state.motion);
          idoc.documentElement.setAttribute('data-glass', state.glass);
        } catch (err) {
          void err;
        }
      });

      if (inspectorState.open && inspectorState.record) {
        if (inspectorState.previewWrapper) {
          inspectorState.previewWrapper.setAttribute('data-theme', state.theme);
          inspectorState.previewWrapper.setAttribute('data-motion', state.motion);
          inspectorState.previewWrapper.setAttribute('data-glass', state.glass);
        }
        refreshInspectorDynamicTabs(inspectorState.record);
      }
    }

    function pushHashState() {
      if (!win || !win.history || typeof win.history.replaceState !== 'function') return;
      var nextHash = serializeHashState(state);
      if (win.location && win.location.hash !== nextHash) {
        try {
          win.history.replaceState(null, '', nextHash);
        } catch (err) {
          void err;
        }
      }
    }

    function loadSharedStyleSheets() {
      if (sharedSheetsPromise) return sharedSheetsPromise;
      var supportsAdopted = typeof CSSStyleSheet === 'function' &&
        typeof ShadowRoot !== 'undefined' &&
        'adoptedStyleSheets' in ShadowRoot.prototype &&
        typeof fetch === 'function';
      if (!supportsAdopted) {
        sharedSheetsPromise = Promise.resolve(null);
        return sharedSheetsPromise;
      }
      sharedSheetsPromise = Promise.all(
        DIST_SHEETS.map(function (href) {
          return fetch(href)
            .then(function (r) { return r.ok ? r.text() : ''; })
            .then(function (cssText) {
              var m;
              var re = /(--vi-[a-z0-9-]+)\s*:/gi;
              while ((m = re.exec(cssText)) !== null) allCssVarNames.add(m[1]);
              var sheet = new CSSStyleSheet();
              sheet.replaceSync(cssText);
              return sheet;
            })
            .catch(function () { return null; });
        }),
      ).then(function (sheets) {
        var baseSheet = new CSSStyleSheet();
        baseSheet.replaceSync(ISOLATION_BASE_CSS);
        var valid = sheets.filter(Boolean);
        valid.push(baseSheet);
        return valid;
      });
      return sharedSheetsPromise;
    }

    function framedDocument(html) {
      var base = rootDoc.baseURI || '';
      var links = DIST_SHEETS.map(function (href) {
        return '<link rel="stylesheet" href="' + href + '">';
      }).join('');
      return '<!DOCTYPE html><html lang="en" data-theme="' + state.theme + '" data-motion="' + state.motion + '" data-glass="' + state.glass + '"><head><base href="' + base + '">' +
        '<meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" />' +
        links +
        '<script type="module" src="../dist/vi-orbital-field.js"></scr' + 'ipt>' +
        '<script defer src="../dist/docs-portal.js"></scr' + 'ipt>' +
        '<script defer src="../dist/settings-surface.js"></scr' + 'ipt>' +
        '<script defer src="../dist/library-surface.js"></scr' + 'ipt>' +
        '<style>body{margin:0;min-height:100dvh;background:var(--vi-colors-surface-background-primary-base);color:var(--vi-colors-text-content-primary-base);font-family:var(--vi-typography-typography-family-sans-base)}[data-motion="paused"] *,[data-motion="reduced"] *{transition-duration:0ms!important;animation-duration:0ms!important}</style>' +
        '</head><body>' + html + '</body></html>';
    }

    function normalizeSpecimenHeadings(container) {
      Array.prototype.slice.call(container.querySelectorAll('h1, h2, h3, h4')).forEach(function (heading) {
        var div = rootDoc.createElement('div');
        div.setAttribute('role', 'presentation');
        for (var i = 0; i < heading.attributes.length; i += 1) {
          var attr = heading.attributes[i];
          if (attr.name !== 'role') div.setAttribute(attr.name, attr.value);
        }
        while (heading.firstChild) div.appendChild(heading.firstChild);
        heading.replaceWith(div);
      });
    }

    function syncManifestMetricsIn(container) {
      if (!manifestComponentCount || !container || typeof container.querySelectorAll !== 'function') return;
      Array.prototype.slice.call(container.querySelectorAll('[data-manifest-metric="componentCount"]')).forEach(function (el) {
        var tmpl = el.getAttribute('data-manifest-template') || '{count}';
        el.textContent = tmpl.replace(/\{count\}/g, String(manifestComponentCount));
      });
    }

    function initComponentControllers(container) {
      if (!win) return;
      if (win.ViDocsPortal && typeof win.ViDocsPortal.initDocsPortal === 'function') {
        win.ViDocsPortal.initDocsPortal(container);
      }
      if (win.ViSettingsSurface && typeof win.ViSettingsSurface.initSettingsSurface === 'function') {
        win.ViSettingsSurface.initSettingsSurface(container);
      }
      if (win.ViLibrarySurface && typeof win.ViLibrarySurface.initLibrarySurface === 'function') {
        win.ViLibrarySurface.initLibrarySurface(container);
      }
      Array.prototype.slice.call(container.querySelectorAll('img[data-chibi-fallback]')).forEach(function (img) {
        img.addEventListener('error', function () {
          img.classList.add('hidden');
        }, { once: true });
      });
    }

    function mountIsolatedComponent(hostEl, html, meta) {
      return loadSharedStyleSheets().then(function (sheets) {
        hostEl.innerHTML = '';
        var wrapper = rootDoc.createElement('div');
        wrapper.className = 'vi-specimen-root' + (meta && meta.stageSpecimen ? ' is-stage-specimen' : '');
        wrapper.setAttribute('data-theme', state.theme);
        wrapper.setAttribute('data-motion', state.motion);
        wrapper.setAttribute('data-glass', state.glass);
        wrapper.innerHTML = html;
        normalizeSpecimenHeadings(wrapper);
        syncManifestMetricsIn(wrapper);

        if (sheets && typeof hostEl.attachShadow === 'function') {
          var shadow = hostEl.shadowRoot || hostEl.attachShadow({ mode: 'open' });
          shadow.adoptedStyleSheets = sheets;
          shadow.innerHTML = '';
          shadow.appendChild(wrapper);
          hostEl.setAttribute('data-isolation', 'shadow-dom');
          mountedShadowRoots.push({ host: hostEl, shadow: shadow, wrapper: wrapper });
          initComponentControllers(wrapper);
          return { mode: 'Shadow DOM isolated', root: wrapper };
        }

        hostEl.setAttribute('data-isolation', 'scoped-container');
        hostEl.appendChild(wrapper);
        mountedShadowRoots.push({ host: hostEl, shadow: null, wrapper: wrapper });
        initComponentControllers(wrapper);
        return { mode: 'Scoped container isolated', root: wrapper };
      });
    }

    function applyViewportScale(viewport) {
      if (!viewport) return;
      var iframe = viewport.querySelector('iframe');
      if (!iframe) return;
      var rawW = viewport.getAttribute('data-stage-width') || 'full';
      var targetW = rawW === 'full' ? 1440 : Number(rawW);
      var availW = viewport.clientWidth || targetW;
      var availH = viewport.clientHeight || 640;
      var scale = availW < targetW ? availW / targetW : 1;
      iframe.style.width = targetW + 'px';
      iframe.style.height = Math.round(availH / scale) + 'px';
      iframe.style.transform = scale < 1 ? 'scale(' + scale.toFixed(4) + ')' : '';
    }

    var viewportResizeObserver = win && 'ResizeObserver' in win
      ? new win.ResizeObserver(function (entries) {
          entries.forEach(function (entry) { applyViewportScale(entry.target); });
        })
      : null;

    function fetchFragmentHtml(file) {
      if (Object.prototype.hasOwnProperty.call(fragmentHtmlCache, file)) {
        return Promise.resolve(fragmentHtmlCache[file]);
      }
      return fetch(file)
        .then(function (r) {
          if (!r.ok) throw new Error('HTTP ' + r.status);
          return r.text();
        })
        .then(function (raw) {
          fragmentHtmlCache[file] = raw;
          return raw;
        });
    }

    function loadFragment(record) {
      if (record.loaded) return record.loadPromise || Promise.resolve();
      record.loaded = true;
      var f = record.meta;
      record.loadPromise = fetchFragmentHtml(f.file)
        .then(function (raw) {
          var html = resolveAssets(raw);
          if (f.frame) {
            var iframe = rootDoc.createElement('iframe');
            iframe.title = f.label;
            iframe.loading = 'lazy';
            iframe.srcdoc = framedDocument(html);
            record.viewport.innerHTML = '';
            record.viewport.appendChild(iframe);
            mountedIframes.push(iframe);
            record.iframe = iframe;
            applyViewportScale(record.viewport);
            if (viewportResizeObserver) viewportResizeObserver.observe(record.viewport);
            if (record.openLink && typeof Blob === 'function' && win && win.URL && win.URL.createObjectURL) {
              var blob = new Blob([framedDocument(html)], { type: 'text/html' });
              record.openLink.href = win.URL.createObjectURL(blob);
            }
            record.isolationMode = 'Iframe srcdoc isolated';
          } else {
            return mountIsolatedComponent(record.stageSlot, html, f).then(function (res) {
              record.mountedRoot = res.root;
              record.isolationMode = res.mode;
            });
          }
          return undefined;
        })
        .catch(function () {
          var target = f.frame ? record.viewport : record.stageSlot;
          target.textContent = 'Could not load ' + f.file;
        });
      return record.loadPromise;
    }

    var lazyObserver = win && 'IntersectionObserver' in win
      ? new win.IntersectionObserver(function (entries) {
          entries.forEach(function (entry) {
            if (!entry.isIntersecting) return;
            var rec = entry.target._record;
            if (rec) {
              loadFragment(rec);
              lazyObserver.unobserve(entry.target);
            }
          });
        }, { rootMargin: '320px 0px' })
      : null;

    // --- DOM References ---
    var mainHost = rootDoc.getElementById('catalog-sections');
    var emptyState = rootDoc.getElementById('empty-state');
    var emptyCopy = rootDoc.getElementById('empty-state-copy');
    var sidebarIndex = rootDoc.getElementById('sidebar-index');
    var sidebarTotal = rootDoc.getElementById('sidebar-total');
    var allActiveBtn = rootDoc.getElementById('filter-all-active');
    var allActiveCount = rootDoc.getElementById('all-active-count');
    var legacyToggleBtn = rootDoc.getElementById('toggle-legacy');
    var legacyToggleText = rootDoc.getElementById('legacy-toggle-text');
    var legacyToggleCount = rootDoc.getElementById('legacy-toggle-count');
    var mobileTierList = rootDoc.getElementById('mobile-tier-list');
    var countEl = rootDoc.getElementById('catalog-count');
    var searchDesktop = rootDoc.getElementById('catalog-search');
    var searchMobile = rootDoc.getElementById('mobile-search');
    var resetFiltersBtn = rootDoc.getElementById('reset-filters');

    var themeBtn = rootDoc.getElementById('toggle-theme');
    var motionBtn = rootDoc.getElementById('toggle-motion');
    var glassBtn = rootDoc.getElementById('toggle-glass');

    // Inspector Drawer refs
    var inspectorBackdrop = rootDoc.getElementById('specimen-inspector-backdrop');
    var inspectorTitle = rootDoc.getElementById('inspector-title');
    var inspectorFile = rootDoc.getElementById('inspector-file');
    var inspectorAdr = rootDoc.getElementById('inspector-adr');
    var inspectorDesc = rootDoc.getElementById('inspector-desc');
    var inspectorCloseBtn = rootDoc.getElementById('inspector-close');
    var inspectorTabs = Array.prototype.slice.call(rootDoc.querySelectorAll('[data-inspector-tab]'));
    var inspectorPanels = Array.prototype.slice.call(rootDoc.querySelectorAll('[data-inspector-panel]'));
    var inspectorPreviewHost = rootDoc.getElementById('inspector-preview-host');
    var inspectorIsoBadge = rootDoc.getElementById('inspector-isolation-badge');
    var inspectorMarkupCode = rootDoc.getElementById('inspector-markup-code');
    var inspectorCopyBtn = rootDoc.getElementById('inspector-copy-html');
    var inspectorCopyStatus = rootDoc.getElementById('inspector-copy-status');
    var inspectorTokensBody = rootDoc.getElementById('inspector-tokens-body');
    var inspectorTokensTheme = rootDoc.getElementById('inspector-tokens-theme');
    var inspectorA11ySummary = rootDoc.getElementById('inspector-a11y-summary');
    var inspectorA11yBody = rootDoc.getElementById('inspector-a11y-body');

    var inspectorState = { open: false, record: null, trigger: null, activeTab: 'preview', previewWrapper: null };

    function updateDynamicHeaderCounts() {
      if (allActiveCount) allActiveCount.textContent = String(activeFragments.length);
      if (legacyToggleCount) legacyToggleCount.textContent = String(legacyFragments.length);
      if (legacyToggleText) {
        legacyToggleText.textContent = state.legacy ? 'Legacy reference · shown' : 'Legacy reference · hidden';
      }
      if (legacyToggleBtn) legacyToggleBtn.setAttribute('aria-pressed', state.legacy ? 'true' : 'false');
      if (sidebarTotal) {
        var prefix = manifestComponentCount ? manifestComponentCount + ' manifest · ' : '';
        sidebarTotal.textContent = prefix + activeFragments.length + ' active';
      }
    }

    function updateRuntimeButtons() {
      if (themeBtn) {
        var isLight = state.theme === 'light';
        themeBtn.setAttribute('aria-pressed', isLight ? 'true' : 'false');
        themeBtn.setAttribute('data-state', isLight ? 'accent' : 'default');
        var tLbl = themeBtn.querySelector('[data-toggle-label]');
        if (tLbl) tLbl.textContent = 'Theme: ' + state.theme;
      }
      if (motionBtn) {
        var isRunning = state.motion === 'running';
        motionBtn.setAttribute('aria-pressed', isRunning ? 'true' : 'false');
        motionBtn.setAttribute('data-state', isRunning ? 'active' : 'default');
        var mLbl = motionBtn.querySelector('[data-toggle-label]');
        if (mLbl) mLbl.textContent = 'Motion: ' + state.motion;
      }
      if (glassBtn) {
        var isGlass = state.glass === 'tactile-blur';
        glassBtn.setAttribute('aria-pressed', isGlass ? 'true' : 'false');
        glassBtn.setAttribute('data-state', isGlass ? 'accent' : 'default');
        var gLbl = glassBtn.querySelector('[data-toggle-label]');
        if (gLbl) gLbl.textContent = 'Glass: ' + state.glass;
      }
    }

    function setInspectorTab(tabId) {
      inspectorState.activeTab = tabId;
      inspectorTabs.forEach(function (t) {
        var active = t.getAttribute('data-inspector-tab') === tabId;
        t.setAttribute('aria-selected', active ? 'true' : 'false');
        t.setAttribute('tabindex', active ? '0' : '-1');
      });
      inspectorPanels.forEach(function (p) {
        p.hidden = p.getAttribute('data-inspector-panel') !== tabId;
      });
      if (tabId === 'a11y' && inspectorState.record) {
        renderInspectorA11y(inspectorState.record);
      }
    }

    function renderInspectorTokens(record, rawHtml) {
      if (!inspectorTokensBody) return;
      if (inspectorTokensTheme) {
        inspectorTokensTheme.textContent = 'Theme: ' + state.theme + ' · computed values';
      }
      var tokenNames = extractTokenReferences(rawHtml, allCssVarNames);
      var docStyles = win && typeof win.getComputedStyle === 'function' ? win.getComputedStyle(rootDoc.documentElement) : null;
      var innerStyles = record.mountedRoot && win && typeof win.getComputedStyle === 'function'
        ? win.getComputedStyle(record.mountedRoot)
        : null;
      inspectorTokensBody.innerHTML = '';
      if (tokenNames.length === 0) {
        var emptyTr = rootDoc.createElement('tr');
        var emptyTd = rootDoc.createElement('td');
        emptyTd.colSpan = 2;
        emptyTd.textContent = 'No direct --vi-* custom properties detected in this specimen.';
        emptyTr.appendChild(emptyTd);
        inspectorTokensBody.appendChild(emptyTr);
        return;
      }
      tokenNames.forEach(function (name) {
        var val = (innerStyles && innerStyles.getPropertyValue(name).trim()) ||
          (docStyles && docStyles.getPropertyValue(name).trim()) ||
          '(inherited / component scoped)';
        var tr = rootDoc.createElement('tr');
        var tdName = rootDoc.createElement('td');
        tdName.textContent = name;
        var tdVal = rootDoc.createElement('td');
        if (isColorLike(val)) {
          var sw = rootDoc.createElement('span');
          sw.className = 'inspector-swatch';
          sw.setAttribute('aria-hidden', 'true');
          sw.style.setProperty('background-color', val);
          tdVal.appendChild(sw);
        }
        tdVal.appendChild(rootDoc.createTextNode(val));
        tr.append(tdName, tdVal);
        inspectorTokensBody.appendChild(tr);
      });
    }

    function renderInspectorA11y(record) {
      if (!inspectorA11ySummary || !inspectorA11yBody) return;
      var inspectRoot = record.mountedRoot || null;
      if (!inspectRoot && record.iframe) {
        try {
          inspectRoot = record.iframe.contentDocument ? record.iframe.contentDocument.body : null;
        } catch (err) {
          inspectRoot = null;
        }
      }
      var snap = buildAccessibilitySnapshot(inspectRoot);
      inspectorA11ySummary.innerHTML = '';
      var stats = [
        ['Landmarks', String(snap.landmarks.length)],
        ['ARIA roles', String(snap.roles.length)],
        ['Interactive', String(snap.interactive.length)],
        ['Touch >= 44px', snap.touchPass + ' / ' + (snap.touchPass + snap.touchWarn)],
      ];
      stats.forEach(function (pair) {
        var box = rootDoc.createElement('div');
        box.className = 'inspector-stat';
        var l = rootDoc.createElement('span');
        l.className = 'inspector-stat-label';
        l.textContent = pair[0];
        var v = rootDoc.createElement('span');
        v.className = 'inspector-stat-val';
        v.textContent = pair[1];
        box.append(l, v);
        inspectorA11ySummary.appendChild(box);
      });

      inspectorA11yBody.innerHTML = '';
      var rows = [];
      snap.landmarks.forEach(function (lm) {
        rows.push(['Landmark', lm.role + ' <' + lm.tag + '>', lm.name, 'OK']);
      });
      snap.roles.forEach(function (r) {
        rows.push(['ARIA role', r.role, r.name, r.states || 'default']);
      });
      snap.interactive.forEach(function (it) {
        rows.push(['Control', it.role + ' <' + it.tag + '>', it.name, it.size + (it.passesTouch ? ' (pass)' : ' (<44px)')]);
      });

      if (rows.length === 0) {
        var tr0 = rootDoc.createElement('tr');
        var td0 = rootDoc.createElement('td');
        td0.colSpan = 4;
        td0.textContent = 'Decorative or static specimen (no interactive landmarks or controls).';
        tr0.appendChild(td0);
        inspectorA11yBody.appendChild(tr0);
        return;
      }

      rows.slice(0, 60).forEach(function (r) {
        var tr = rootDoc.createElement('tr');
        r.forEach(function (cell) {
          var td = rootDoc.createElement('td');
          td.textContent = cell;
          tr.appendChild(td);
        });
        inspectorA11yBody.appendChild(tr);
      });
    }

    function refreshInspectorDynamicTabs(record) {
      var raw = fragmentHtmlCache[record.meta.file] || '';
      if (inspectorIsoBadge) {
        inspectorIsoBadge.textContent = (record.isolationMode || 'Isolated') + ' · theme: ' + state.theme + ' · motion: ' + state.motion + ' · glass: ' + state.glass;
      }
      renderInspectorTokens(record, raw);
      if (inspectorState.activeTab === 'a11y') {
        renderInspectorA11y(record);
      }
    }

    function openInspector(record, triggerBtn) {
      if (!inspectorBackdrop || !record) return;
      inspectorState.open = true;
      inspectorState.record = record;
      inspectorState.trigger = triggerBtn || null;
      if (inspectorTitle) inspectorTitle.textContent = record.meta.label;
      if (inspectorFile) inspectorFile.textContent = record.meta.file;
      if (inspectorAdr) {
        inspectorAdr.textContent = record.adr || 'ADR-024';
        inspectorAdr.hidden = !record.adr;
      }
      if (inspectorDesc) inspectorDesc.textContent = record.meta.desc || '';
      if (inspectorCopyStatus) inspectorCopyStatus.textContent = '';

      setInspectorTab('preview');
      inspectorBackdrop.hidden = false;
      if (inspectorCloseBtn && typeof inspectorCloseBtn.focus === 'function') inspectorCloseBtn.focus();

      loadFragment(record).then(function () {
        return fetchFragmentHtml(record.meta.file);
      }).then(function (raw) {
        if (inspectorMarkupCode) inspectorMarkupCode.textContent = raw;
        var resolved = resolveAssets(raw);
        if (inspectorPreviewHost) {
          inspectorPreviewHost.innerHTML = '';
          inspectorState.previewWrapper = null;
          if (record.meta.frame) {
            var iframe = rootDoc.createElement('iframe');
            iframe.title = record.meta.label + ' isolated preview';
            iframe.srcdoc = framedDocument(resolved);
            iframe.style.width = '100%';
            iframe.style.height = '28rem';
            iframe.style.border = '0';
            inspectorPreviewHost.appendChild(iframe);
            mountedIframes.push(iframe);
            if (inspectorIsoBadge) {
              inspectorIsoBadge.textContent = 'Iframe srcdoc isolated · theme: ' + state.theme + ' · motion: ' + state.motion + ' · glass: ' + state.glass;
            }
          } else {
            var previewMount = rootDoc.createElement('div');
            inspectorPreviewHost.appendChild(previewMount);
            mountIsolatedComponent(previewMount, resolved, record.meta).then(function (res) {
              inspectorState.previewWrapper = res.root;
              if (inspectorIsoBadge) {
                inspectorIsoBadge.textContent = res.mode + ' · theme: ' + state.theme + ' · motion: ' + state.motion + ' · glass: ' + state.glass;
              }
            });
          }
        }
        renderInspectorTokens(record, raw);
        renderInspectorA11y(record);
      });
    }

    function closeInspector() {
      if (!inspectorState.open || !inspectorBackdrop) return;
      inspectorState.open = false;
      inspectorBackdrop.hidden = true;
      if (inspectorState.trigger && typeof inspectorState.trigger.focus === 'function') {
        inspectorState.trigger.focus();
      }
      inspectorState.record = null;
      inspectorState.trigger = null;
    }

    if (inspectorCloseBtn) on(inspectorCloseBtn, 'click', closeInspector);
    if (inspectorBackdrop) {
      on(inspectorBackdrop, 'click', function (ev) {
        if (ev.target === inspectorBackdrop) closeInspector();
      });
    }

    inspectorTabs.forEach(function (tab, idx) {
      on(tab, 'click', function () {
        setInspectorTab(tab.getAttribute('data-inspector-tab') || 'preview');
      });
      on(tab, 'keydown', function (ev) {
        var next = -1;
        if (ev.key === 'ArrowRight') next = (idx + 1) % inspectorTabs.length;
        else if (ev.key === 'ArrowLeft') next = (idx - 1 + inspectorTabs.length) % inspectorTabs.length;
        else if (ev.key === 'Home') next = 0;
        else if (ev.key === 'End') next = inspectorTabs.length - 1;
        if (next === -1) return;
        ev.preventDefault();
        inspectorTabs[next].click();
        if (typeof inspectorTabs[next].focus === 'function') inspectorTabs[next].focus();
      });
    });

    if (inspectorCopyBtn) {
      on(inspectorCopyBtn, 'click', function () {
        var text = inspectorMarkupCode ? inspectorMarkupCode.textContent : '';
        if (!text) return;
        if (typeof navigator !== 'undefined' && navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
          navigator.clipboard.writeText(text).then(function () {
            if (inspectorCopyStatus) inspectorCopyStatus.textContent = 'Copied HTML to clipboard';
          }).catch(function () {
            if (inspectorCopyStatus) inspectorCopyStatus.textContent = 'Clipboard unavailable';
          });
        } else if (inspectorCopyStatus) {
          inspectorCopyStatus.textContent = 'Markup ready';
        }
      });
    }

    // --- Build Sidebar Tree & Specimen Sections ---
    TIERS.forEach(function (tier) {
      var tierItems = FRAGMENTS.filter(function (f) { return f.tier === tier.id; });
      var isLegacy = tier.id === 'legacy';

      var navGroup = rootDoc.createElement('details');
      navGroup.className = 'sidebar-group';
      navGroup.setAttribute('data-tier', tier.id);
      if (!isLegacy) navGroup.open = true;

      var navHead = rootDoc.createElement('summary');
      navHead.className = 'sidebar-group-head';
      navHead.setAttribute('data-tier-filter', tier.id);
      navHead.setAttribute('data-active', 'false');

      var lblSpan = rootDoc.createElement('span');
      lblSpan.className = 'sidebar-group-label';
      lblSpan.textContent = tier.shortLabel;

      var metaSpan = rootDoc.createElement('span');
      metaSpan.className = 'sidebar-group-meta';
      var cntSpan = rootDoc.createElement('span');
      cntSpan.className = 'count-num';
      cntSpan.textContent = String(tierItems.length);
      var chevHit = rootDoc.createElement('span');
      chevHit.className = 'sidebar-chevron-hit';
      chevHit.setAttribute('data-tier-chevron', tier.id);
      chevHit.setAttribute('aria-hidden', 'true');
      var chev = rootDoc.createElement('span');
      chev.className = 'sidebar-chevron';
      chev.innerHTML = '&#8250;';
      chevHit.appendChild(chev);
      metaSpan.append(cntSpan, chevHit);
      navHead.append(lblSpan, metaSpan);
      navGroup.appendChild(navHead);

      on(navHead, 'click', function (ev) {
        if (ev.target && ev.target.closest && ev.target.closest('[data-tier-chevron]')) {
          return;
        }
        ev.preventDefault();
        if (isLegacy) state.legacy = true;
        state.category = state.category === tier.id ? 'all' : tier.id;
        state.specimen = '';
        navGroup.open = true;
        applyFilters(true);
      });

      var navLinks = rootDoc.createElement('div');
      navLinks.className = 'sidebar-group-links';
      navGroup.appendChild(navLinks);

      // Mobile tier button
      var mobBtn = null;
      if (mobileTierList && !isLegacy) {
        mobBtn = rootDoc.createElement('button');
        mobBtn.type = 'button';
        mobBtn.className = 'ctl-btn';
        mobBtn.setAttribute('data-mobile-tier', tier.id);
        mobBtn.setAttribute('aria-pressed', 'false');
        mobBtn.textContent = tier.shortLabel + ' (' + tierItems.length + ')';
        on(mobBtn, 'click', function () {
          state.category = state.category === tier.id ? 'all' : tier.id;
          state.specimen = '';
          applyFilters(true);
        });
        mobileTierList.appendChild(mobBtn);
      }

      var sec = rootDoc.createElement('section');
      sec.className = 'tier-section';
      sec.id = 'tier-' + tier.id;
      var head = rootDoc.createElement('div');
      head.className = 'tier-header';
      var headLeft = rootDoc.createElement('div');
      var h2 = rootDoc.createElement('h2');
      h2.textContent = tier.label;
      var sumP = rootDoc.createElement('p');
      sumP.className = 'tier-summary';
      sumP.textContent = tier.summary;
      headLeft.append(h2, sumP);
      var secCount = rootDoc.createElement('span');
      secCount.className = 'count-num';
      secCount.textContent = tierItems.length + ' specimens';
      head.append(headLeft, secCount);

      var list = rootDoc.createElement('div');
      list.className = 'specimen-list';
      sec.append(head, list);
      mainHost.insertBefore(sec, emptyState);

      sectionNodes[tier.id] = { container: sec, navGroup: navGroup, navHead: navHead, tier: tier, mobBtn: mobBtn, secCount: secCount };

      tierItems.forEach(function (f) {
        var id = f.file.replace('.html', '');
        var card = rootDoc.createElement('article');
        card.className = 'fragment-section';
        card.id = 'frag-' + id;

        // Compact single-row specimen header
        var cHead = rootDoc.createElement('div');
        cHead.className = 'specimen-head';

        var identity = rootDoc.createElement('div');
        identity.className = 'specimen-identity';

        var h3 = rootDoc.createElement('h3');
        h3.className = 'fragment-label';
        var anchor = rootDoc.createElement('a');
        anchor.href = '#catalog?specimen=' + encodeURIComponent(id);
        anchor.textContent = f.label;
        on(anchor, 'click', function (ev) {
          ev.preventDefault();
          focusSpecimen(id, true);
        });
        h3.appendChild(anchor);

        var fileBadge = rootDoc.createElement('span');
        fileBadge.className = 'fragment-file';
        fileBadge.textContent = f.file;

        var adrMatch = (f.desc || '').match(/ADR-\d+/);
        var adrText = f.adr || (adrMatch ? adrMatch[0] : '');
        var adrBadge = rootDoc.createElement('span');
        adrBadge.className = 'fragment-adr';
        adrBadge.textContent = adrText || 'Canon';
        if (!adrText) adrBadge.hidden = true;

        identity.append(h3, fileBadge, adrBadge);
        if (f.note) {
          var noteEl = rootDoc.createElement('span');
          noteEl.className = 'fragment-note';
          noteEl.textContent = f.note;
          identity.appendChild(noteEl);
        }

        // Per-specimen viewport switcher (320px, 768px, 1024px, Full) + Inspect button
        var tools = rootDoc.createElement('div');
        tools.className = 'specimen-tools';

        var vpGroup = rootDoc.createElement('div');
        vpGroup.className = 'vp-group';
        vpGroup.setAttribute('role', 'group');
        vpGroup.setAttribute('aria-label', f.label + ' viewport width');

        var frame = rootDoc.createElement('div');
        frame.className = 'fragment-frame' +
          (f.glass ? ' glass-stage' : '') +
          (f.stageSpecimen ? ' stage-specimen' : '') +
          (f.frame ? ' layout-frame' : '');

        var stageSlot = null;
        var viewport = null;
        var openLink = null;

        if (f.frame) {
          viewport = rootDoc.createElement('div');
          viewport.className = 'layout-viewport';
          viewport.setAttribute('data-stage-width', 'full');
          var layoutSkel = rootDoc.createElement('div');
          layoutSkel.className = 'specimen-skeleton specimen-skeleton--layout';
          layoutSkel.innerHTML = '<span class="specimen-skeleton-bar"></span><span class="specimen-skeleton-bar specimen-skeleton-bar--short"></span><span class="specimen-skeleton-label">Deferred layout frame · ' + f.file + '</span>';
          viewport.appendChild(layoutSkel);
          frame.appendChild(viewport);
        } else {
          stageSlot = rootDoc.createElement('div');
          stageSlot.className = 'specimen-stage-slot';
          stageSlot.setAttribute('data-stage-width', 'full');
          var skel = rootDoc.createElement('div');
          var tall = f.tier === 'workspace' || f.file.indexOf('library') !== -1 || f.file.indexOf('settings') !== -1 || f.file.indexOf('docs') !== -1;
          skel.className = 'specimen-skeleton' + (tall ? ' specimen-skeleton--tall' : '');
          skel.innerHTML = '<span class="specimen-skeleton-bar"></span><span class="specimen-skeleton-bar specimen-skeleton-bar--short"></span><span class="specimen-skeleton-label">Lazy mount · ' + f.file + '</span>';
          stageSlot.appendChild(skel);
          frame.appendChild(stageSlot);
        }

        [
          { key: '320', label: '320px' },
          { key: '768', label: '768px' },
          { key: '1024', label: '1024px' },
          { key: 'full', label: 'Full' },
        ].forEach(function (vp) {
          var vpBtn = rootDoc.createElement('button');
          vpBtn.type = 'button';
          vpBtn.className = 'vp-btn';
          vpBtn.textContent = vp.label;
          vpBtn.setAttribute('data-vp', vp.key);
          vpBtn.setAttribute('aria-pressed', vp.key === 'full' ? 'true' : 'false');
          on(vpBtn, 'click', function () {
            var targetContainer = f.frame ? viewport : stageSlot;
            if (targetContainer) targetContainer.setAttribute('data-stage-width', vp.key);
            Array.prototype.slice.call(vpGroup.querySelectorAll('[data-vp]')).forEach(function (b) {
              b.setAttribute('aria-pressed', b === vpBtn ? 'true' : 'false');
            });
            if (f.frame && win && typeof win.requestAnimationFrame === 'function') {
              win.requestAnimationFrame(function () { applyViewportScale(viewport); });
            }
          });
          vpGroup.appendChild(vpBtn);
        });
        tools.appendChild(vpGroup);

        if (f.frame) {
          openLink = rootDoc.createElement('a');
          openLink.className = 'ctl-btn';
          openLink.textContent = 'Isolated';
          openLink.target = '_blank';
          openLink.rel = 'noopener';
          openLink.href = f.file;
          tools.appendChild(openLink);
        }

        var inspectBtn = rootDoc.createElement('button');
        inspectBtn.type = 'button';
        inspectBtn.className = 'ctl-btn';
        inspectBtn.setAttribute('data-inspect-specimen', id);
        inspectBtn.textContent = 'Inspect';
        tools.appendChild(inspectBtn);

        cHead.append(identity, tools);
        card.appendChild(cHead);

        if (f.orbitalControls) {
          var subBar = rootDoc.createElement('div');
          subBar.className = 'specimen-subbar';
          subBar.setAttribute('role', 'group');
          subBar.setAttribute('aria-label', 'Orbital agentic state modulation');
          ['start', 'send', 'waiting', 'streaming', 'finish', 'failure'].forEach(function (st) {
            var stBtn = rootDoc.createElement('button');
            stBtn.type = 'button';
            stBtn.className = 'vp-btn';
            stBtn.textContent = st;
            stBtn.setAttribute('data-orb-state', st);
            stBtn.setAttribute('aria-pressed', st === 'start' ? 'true' : 'false');
            on(stBtn, 'click', function () {
              var hostEl = record.mountedRoot ? record.mountedRoot.querySelector('vi-orbital-field') : null;
              if (hostEl) {
                hostEl.setAttribute('data-motion', 'running');
                hostEl.setAttribute('data-agent-state', st);
              }
              Array.prototype.slice.call(subBar.querySelectorAll('[data-orb-state]')).forEach(function (b) {
                b.setAttribute('aria-pressed', b === stBtn ? 'true' : 'false');
              });
            });
            subBar.appendChild(stBtn);
          });
          card.appendChild(subBar);
        }

        card.appendChild(frame);
        list.appendChild(card);

        var link = rootDoc.createElement('a');
        link.className = 'sidebar-link';
        link.href = '#catalog?specimen=' + encodeURIComponent(id);
        var linkText = rootDoc.createElement('span');
        linkText.textContent = f.label;
        link.appendChild(linkText);
        on(link, 'click', function (ev) {
          ev.preventDefault();
          focusSpecimen(id, true);
        });
        navLinks.appendChild(link);

        var record = {
          id: id,
          meta: f,
          adr: adrText,
          adrBadge: adrBadge,
          card: card,
          frame: frame,
          stageSlot: stageSlot,
          viewport: viewport,
          openLink: openLink,
          link: link,
          loaded: false,
          loadPromise: null,
          mountedRoot: null,
          iframe: null,
          isolationMode: f.frame ? 'Iframe srcdoc isolated' : 'Shadow DOM isolated',
          haystack: (f.label + ' ' + f.file + ' ' + (f.desc || '') + ' ' + (f.note || '') + ' ' + f.tier + ' ' + adrText).toLowerCase(),
        };

        on(inspectBtn, 'click', function () {
          openInspector(record, inspectBtn);
        });

        card._record = record;
        cardRecords.push(record);
        recordById[id] = record;

        if (!isLegacy && lazyObserver) {
          lazyObserver.observe(card);
        }
      });

      if (isLegacy) {
        var legacyFoot = rootDoc.getElementById('sidebar-legacy-links');
        if (legacyFoot) legacyFoot.appendChild(navGroup);
      } else if (sidebarIndex) {
        sidebarIndex.appendChild(navGroup);
      }
    });

    function focusSpecimen(id, updateUrl) {
      var rec = recordById[id];
      if (!rec) return;
      if (rec.meta.tier === 'legacy') state.legacy = true;
      if (state.category !== 'all' && state.category !== rec.meta.tier) state.category = 'all';
      state.specimen = id;
      applyFilters(updateUrl);
      loadFragment(rec);
      cardRecords.forEach(function (r) {
        r.card.classList.toggle('is-focused-specimen', r.id === id);
        r.link.setAttribute('aria-current', r.id === id ? 'true' : 'false');
      });
      if (typeof rec.card.scrollIntoView === 'function') {
        rec.card.scrollIntoView({ behavior: 'auto', block: 'start' });
      }
    }

    function applyFilters(syncUrl) {
      var q = state.q.trim().toLowerCase();
      var visibleActive = 0;
      var visibleLegacy = 0;
      var tierCounts = {};

      if (allActiveBtn) {
        allActiveBtn.setAttribute('aria-pressed', state.category === 'all' && !q ? 'true' : 'false');
      }

      cardRecords.forEach(function (rec) {
        var isLegacy = rec.meta.tier === 'legacy';
        var legacyAllowed = state.legacy || state.category === 'legacy';
        if (isLegacy && !legacyAllowed) {
          rec.card.classList.add('hidden-item');
          rec.link.classList.add('hidden-item');
          return;
        }
        var tierMatch = state.category === 'all' || rec.meta.tier === state.category;
        var queryMatch = !q || rec.haystack.indexOf(q) !== -1;
        var show = tierMatch && queryMatch;
        rec.card.classList.toggle('hidden-item', !show);
        rec.link.classList.toggle('hidden-item', !show);
        if (show) {
          tierCounts[rec.meta.tier] = (tierCounts[rec.meta.tier] || 0) + 1;
          if (isLegacy) {
            visibleLegacy += 1;
            if (lazyObserver && !rec.loaded) lazyObserver.observe(rec.card);
          } else {
            visibleActive += 1;
          }
        }
      });

      TIERS.forEach(function (t) {
        var node = sectionNodes[t.id];
        var count = tierCounts[t.id] || 0;
        var isLegacy = t.id === 'legacy';
        var showTier = count > 0;
        node.container.classList.toggle('hidden-item', !showTier);
        node.navGroup.classList.toggle('hidden-item', isLegacy ? (!state.legacy && state.category !== 'legacy') : (q && !showTier));
        node.navHead.setAttribute('data-active', state.category === t.id ? 'true' : 'false');
        if (node.mobBtn) node.mobBtn.setAttribute('aria-pressed', state.category === t.id ? 'true' : 'false');
        if (node.secCount) node.secCount.textContent = count + (count === 1 ? ' specimen' : ' specimens');
        if (q && showTier) {
          node.navGroup.open = true;
        } else if (!q && !isLegacy) {
          node.navGroup.open = state.category === 'all' || state.category === t.id;
        } else if (isLegacy) {
          node.navGroup.open = state.legacy || state.category === 'legacy';
        }
      });

      var visibleTotal = visibleActive + visibleLegacy;
      if (countEl) {
        if (!q && state.category === 'all' && !state.legacy) {
          countEl.textContent = 'Showing ' + visibleActive + ' active · ' + legacyFragments.length + ' legacy hidden';
        } else if (!state.legacy && state.category !== 'legacy') {
          countEl.textContent = 'Showing ' + visibleActive + ' of ' + activeFragments.length + ' active · ' + legacyFragments.length + ' legacy hidden';
        } else if (state.category === 'legacy') {
          countEl.textContent = 'Showing ' + visibleLegacy + ' of ' + legacyFragments.length + ' legacy';
        } else {
          countEl.textContent = 'Showing ' + visibleActive + ' active · ' + visibleLegacy + ' legacy shown';
        }
      }

      if (emptyState) {
        emptyState.classList.toggle('visible', visibleTotal === 0);
        if (emptyCopy && visibleTotal === 0) {
          var scopeLabel = state.category === 'all' ? 'active catalog' : state.category;
          emptyCopy.innerHTML = '';
          emptyCopy.appendChild(rootDoc.createTextNode('No specimens match '));
          var qSpan = rootDoc.createElement('span');
          qSpan.className = 'empty-state-query';
          qSpan.textContent = q ? ('"' + state.q.trim() + '"') : 'current filters';
          emptyCopy.appendChild(qSpan);
          emptyCopy.appendChild(rootDoc.createTextNode(' in ' + scopeLabel + '.'));
        }
      }

      updateDynamicHeaderCounts();
      if (syncUrl) pushHashState();
    }

    function setSearchQuery(val, syncUrl) {
      state.q = val;
      if (searchDesktop && searchDesktop.value !== val) searchDesktop.value = val;
      if (searchMobile && searchMobile.value !== val) searchMobile.value = val;
      applyFilters(syncUrl);
    }

    if (searchDesktop) on(searchDesktop, 'input', function (e) { setSearchQuery(e.target.value, true); });
    if (searchMobile) on(searchMobile, 'input', function (e) { setSearchQuery(e.target.value, true); });

    if (allActiveBtn) {
      on(allActiveBtn, 'click', function () {
        state.category = 'all';
        state.specimen = '';
        setSearchQuery('', true);
      });
    }

    if (legacyToggleBtn) {
      on(legacyToggleBtn, 'click', function () {
        state.legacy = !state.legacy;
        if (!state.legacy && state.category === 'legacy') state.category = 'all';
        applyFilters(true);
      });
    }

    if (resetFiltersBtn) {
      on(resetFiltersBtn, 'click', function () {
        state.category = 'all';
        state.specimen = '';
        setSearchQuery('', true);
      });
    }

    // Runtime top-bar toggles
    if (themeBtn) {
      on(themeBtn, 'click', function () {
        state.theme = state.theme === 'dark' ? 'light' : 'dark';
        updateRuntimeButtons();
        syncRuntimeAttributes();
      });
    }

    if (motionBtn) {
      on(motionBtn, 'click', function () {
        state.motion = state.motion === 'running' ? 'paused' : 'running';
        updateRuntimeButtons();
        syncRuntimeAttributes();
      });
    }

    if (glassBtn) {
      on(glassBtn, 'click', function () {
        state.glass = state.glass === 'tactile-blur' ? 'solid' : 'tactile-blur';
        updateRuntimeButtons();
        syncRuntimeAttributes();
      });
    }

    // Global keyboard shortcuts: '/' focuses search, 'Escape' closes drawer or clears search
    on(rootDoc, 'keydown', function (ev) {
      if (ev.key === 'Escape') {
        if (inspectorState.open) {
          ev.preventDefault();
          closeInspector();
          return;
        }
        var activeEl = rootDoc.activeElement;
        var inSearch = activeEl === searchDesktop || activeEl === searchMobile;
        if (state.q.trim() || inSearch) {
          ev.preventDefault();
          setSearchQuery('', true);
          if (inSearch && typeof activeEl.blur === 'function') activeEl.blur();
        }
        return;
      }

      if (ev.key === '/' && !ev.ctrlKey && !ev.metaKey && !ev.altKey) {
        var el = rootDoc.activeElement;
        var tag = el && el.tagName ? el.tagName.toUpperCase() : '';
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || (el && el.isContentEditable)) return;
        ev.preventDefault();
        var targetInput = searchDesktop && searchDesktop.offsetParent !== null ? searchDesktop : (searchMobile || searchDesktop);
        if (targetInput && typeof targetInput.focus === 'function') {
          targetInput.focus();
          if (typeof targetInput.select === 'function') targetInput.select();
        }
      }
    });

    if (win) {
      on(win, 'hashchange', function () {
        var next = parseHashState(win.location.hash);
        state.category = next.category || 'all';
        state.legacy = Boolean(next.legacy);
        state.specimen = next.specimen || '';
        setSearchQuery(next.q || '', false);
        if (state.specimen && recordById[state.specimen]) {
          focusSpecimen(state.specimen, false);
        }
      });
    }

    // Fetch generated manifest dynamically for zero hardcoded counts & authoritative ADR tags
    if (typeof fetch === 'function') {
      fetch('../dist/components.manifest.json')
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(function (manifest) {
          if (!manifest || !Array.isArray(manifest.components)) return;
          manifestComponentCount = Number(manifest.componentCount || manifest.components.length);
          manifest.components.forEach(function (entry) {
            manifestMap[entry.id] = entry;
            var rec = recordById[entry.id];
            if (rec && entry.adr) {
              rec.adr = entry.adr;
              rec.adrBadge.textContent = entry.adr;
              rec.adrBadge.hidden = false;
              rec.haystack += ' ' + entry.adr.toLowerCase();
            }
          });
          updateDynamicHeaderCounts();
          cardRecords.forEach(function (rec) {
            if (rec.mountedRoot) syncManifestMetricsIn(rec.mountedRoot);
          });
        })
        .catch(function () {});
    }

    // Initial boot hydration
    if (searchDesktop && state.q) searchDesktop.value = state.q;
    if (searchMobile && state.q) searchMobile.value = state.q;
    updateRuntimeButtons();
    syncRuntimeAttributes();
    applyFilters(false);

    if (state.specimen && recordById[state.specimen]) {
      focusSpecimen(state.specimen, false);
    } else if (!lazyObserver) {
      cardRecords.slice(0, 8).forEach(function (rec) {
        if (rec.meta.tier !== 'legacy') loadFragment(rec);
      });
    }

    return {
      getState: function () { return Object.assign({}, state); },
      openInspector: function (id) { if (recordById[id]) openInspector(recordById[id], null); },
      closeInspector: closeInspector,
      destroy: function () {
        for (var i = 0; i < cleanups.length; i += 1) cleanups[i]();
        cleanups.length = 0;
        if (lazyObserver) lazyObserver.disconnect();
        if (viewportResizeObserver) viewportResizeObserver.disconnect();
      },
    };
  }

  return {
    parseHashState: parseHashState,
    serializeHashState: serializeHashState,
    extractTokenReferences: extractTokenReferences,
    buildAccessibilitySnapshot: buildAccessibilitySnapshot,
    initCatalogShell: initCatalogShell,
  };
});
