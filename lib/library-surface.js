'use strict';

/**
 * Nocturne Museum: Lightweight progressive-enhancement controller for Skills, Agents,
 * and Projects Library surfaces (zero dependencies, CSP-safe).
 *
 * Capabilities:
 *   - Skills Library: live search, ownership tabs, category pills, Grid/List toggle,
 *     Auto-trigger vs Manual only switches, and slide-over SKILL.md inspector drawer (Esc close)
 *   - Agents & Routines Roster: live search and All / Sovereign seats / Specialists / Routines
 *     filtering with polite match count and launch receipts
 *   - Projects Directory & Detail Workspace: Directory vs Project Detail view switch, scope tabs,
 *     sort select, Table/Card toggle, Threads/Sources/Activity tabs, mobile split tabs (< 64rem),
 *     memory policy switcher, and embedded composer receipt
 */

(function attachLibrarySurface(rootGlobal, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (rootGlobal && typeof rootGlobal === 'object') {
    rootGlobal.ViLibrarySurface = api;
  }
  if (typeof document !== 'undefined') {
    var boot = function bootLibrary() {
      api.initLibrarySurface(document);
    };
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', boot, { once: true });
    } else {
      boot();
    }
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function createLibrarySurfaceApi() {
  function initLibrarySurface(container) {
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

    // 1. Skills Library controllers
    var skillStages = Array.prototype.slice.call(root.querySelectorAll('[data-library-skills]'));
    skillStages.forEach(function bindSkills(stage) {
      if (stage._viLibSkillsBound) return;
      stage._viLibSkillsBound = true;

      var searchEl = stage.querySelector('[data-skills-search]');
      var ownerTabs = Array.prototype.slice.call(stage.querySelectorAll('[data-skills-owner]'));
      var catPills = Array.prototype.slice.call(stage.querySelectorAll('[data-skills-category]'));
      var viewBtns = Array.prototype.slice.call(stage.querySelectorAll('[data-skills-view]'));
      var gridEl = stage.querySelector('[data-skills-grid]');
      var cards = Array.prototype.slice.call(stage.querySelectorAll('[data-skill-card]'));
      var countEl = stage.querySelector('[data-skills-count]');
      var emptyEl = stage.querySelector('[data-skills-empty]');
      var resetBtn = stage.querySelector('[data-skills-reset]');
      var receiptEl = stage.querySelector('[data-skills-receipt]');

      var drawer = stage.querySelector('[data-skill-drawer]');
      var drawerTitle = stage.querySelector('[data-skill-drawer-title]');
      var drawerMeta = stage.querySelector('[data-skill-drawer-meta]');
      var drawerYaml = stage.querySelector('[data-skill-drawer-yaml]');
      var drawerBody = stage.querySelector('[data-skill-drawer-body]');
      var drawerTools = stage.querySelector('[data-skill-drawer-tools]');
      var lastDrawerTrigger = null;

      var state = { query: '', owner: 'all', category: 'all' };

      function applySkillFilters() {
        var q = state.query.trim().toLowerCase();
        var shown = 0;
        cards.forEach(function filterCard(card) {
          var owner = card.getAttribute('data-skill-owner') || '';
          var cat = card.getAttribute('data-skill-category') || '';
          var hay = ((card.textContent || '') + ' ' + (card.getAttribute('data-skill-tools') || '')).toLowerCase();
          var okOwner = state.owner === 'all' || owner === state.owner;
          var okCat = state.category === 'all' || cat === state.category;
          var okQ = !q || hay.indexOf(q) !== -1;
          var show = okOwner && okCat && okQ;
          card.hidden = !show;
          if (show) shown += 1;
        });
        if (countEl) countEl.textContent = 'Showing ' + shown + ' of ' + cards.length + ' skills';
        if (emptyEl) emptyEl.hidden = shown !== 0;
      }

      if (searchEl) {
        addListener(searchEl, 'input', function () {
          state.query = searchEl.value || '';
          applySkillFilters();
        });
      }

      ownerTabs.forEach(function (tab, idx) {
        addListener(tab, 'click', function () {
          state.owner = tab.getAttribute('data-skills-owner') || 'all';
          ownerTabs.forEach(function (t) {
            var active = t === tab;
            t.setAttribute('aria-selected', active ? 'true' : 'false');
            t.setAttribute('tabindex', active ? '0' : '-1');
          });
          applySkillFilters();
        });
        addListener(tab, 'keydown', function (ev) {
          var next = -1;
          if (ev.key === 'ArrowRight') next = (idx + 1) % ownerTabs.length;
          else if (ev.key === 'ArrowLeft') next = (idx - 1 + ownerTabs.length) % ownerTabs.length;
          else if (ev.key === 'Home') next = 0;
          else if (ev.key === 'End') next = ownerTabs.length - 1;
          if (next === -1) return;
          ev.preventDefault();
          ownerTabs[next].click();
          if (typeof ownerTabs[next].focus === 'function') ownerTabs[next].focus();
        });
      });

      catPills.forEach(function (pill) {
        addListener(pill, 'click', function () {
          state.category = pill.getAttribute('data-skills-category') || 'all';
          catPills.forEach(function (p) {
            p.setAttribute('aria-pressed', p === pill ? 'true' : 'false');
          });
          applySkillFilters();
        });
      });

      viewBtns.forEach(function (btn) {
        addListener(btn, 'click', function () {
          var mode = btn.getAttribute('data-skills-view') || 'grid';
          if (gridEl) gridEl.setAttribute('data-view', mode);
          viewBtns.forEach(function (b) {
            b.setAttribute('aria-pressed', b === btn ? 'true' : 'false');
          });
        });
      });

      if (resetBtn) {
        addListener(resetBtn, 'click', function () {
          state.query = '';
          state.owner = 'all';
          state.category = 'all';
          if (searchEl) searchEl.value = '';
          ownerTabs.forEach(function (t) {
            var active = t.getAttribute('data-skills-owner') === 'all';
            t.setAttribute('aria-selected', active ? 'true' : 'false');
            t.setAttribute('tabindex', active ? '0' : '-1');
          });
          catPills.forEach(function (p) {
            p.setAttribute('aria-pressed', p.getAttribute('data-skills-category') === 'all' ? 'true' : 'false');
          });
          applySkillFilters();
        });
      }

      // Skill Auto-trigger vs Manual only switches
      Array.prototype.slice.call(stage.querySelectorAll('[role="switch"][data-skill-trigger]')).forEach(function (sw) {
        addListener(sw, 'click', function () {
          var next = sw.getAttribute('aria-checked') !== 'true';
          sw.setAttribute('aria-checked', next ? 'true' : 'false');
          var lbl = sw.querySelector('[data-switch-label]');
          if (lbl) lbl.textContent = next ? 'Auto-trigger' : 'Manual only';
          var slug = sw.getAttribute('data-skill-trigger') || 'skill';
          if (receiptEl) receiptEl.textContent = slug + ' set to ' + (next ? 'Auto-trigger' : 'Manual only');
        });
      });

      // Skill Inspector Drawer
      function closeDrawer() {
        if (!drawer || drawer.hidden) return;
        drawer.hidden = true;
        if (lastDrawerTrigger && typeof lastDrawerTrigger.focus === 'function') {
          lastDrawerTrigger.focus();
          lastDrawerTrigger = null;
        }
      }

      Array.prototype.slice.call(stage.querySelectorAll('[data-skill-inspect]')).forEach(function (btn) {
        addListener(btn, 'click', function () {
          if (!drawer) return;
          lastDrawerTrigger = btn;
          var card = btn.closest ? btn.closest('[data-skill-card]') : null;
          var slug = btn.getAttribute('data-skill-inspect') || '/schema-audit';
          var owner = (card && card.getAttribute('data-skill-owner')) || 'custom';
          var tok = (card && card.getAttribute('data-skill-tokens')) || '~110 tok';
          var tools = (card && card.getAttribute('data-skill-tools')) || 'vcs.diff.read';
          var directive = (card && card.getAttribute('data-skill-directive')) || 'Inspect target contract and emit structured receipt.';
          if (drawerTitle) drawerTitle.textContent = slug;
          if (drawerMeta) drawerMeta.textContent = owner + ' · ' + tok + ' JIT header';
          if (drawerYaml) {
            drawerYaml.textContent = '---\nname: ' + slug.replace(/^\//, '') + '\norigin: ' + owner + '\nindex_budget: ' + tok + '\ntools: [' + tools + ']\n---';
          }
          if (drawerBody) drawerBody.textContent = directive;
          if (drawerTools) drawerTools.textContent = tools;
          drawer.hidden = false;
          var closeBtn = drawer.querySelector('[data-skill-drawer-close]');
          if (closeBtn && typeof closeBtn.focus === 'function') closeBtn.focus();
        });
      });

      Array.prototype.slice.call(stage.querySelectorAll('[data-skill-drawer-close]')).forEach(function (btn) {
        addListener(btn, 'click', closeDrawer);
      });

      var runBtn = stage.querySelector('[data-skill-drawer-run]');
      if (runBtn) {
        addListener(runBtn, 'click', function () {
          var slug = drawerTitle ? drawerTitle.textContent : 'skill';
          if (receiptEl) receiptEl.textContent = 'Prepared new session with ' + slug;
          closeDrawer();
        });
      }

      Array.prototype.slice.call(stage.querySelectorAll('[data-skill-action]')).forEach(function (btn) {
        addListener(btn, 'click', function () {
          var label = btn.getAttribute('data-skill-action') || 'Skill action';
          if (receiptEl) receiptEl.textContent = label + ' ready in workspace';
        });
      });

      if (drawer) {
        addListener(drawer, 'click', function (ev) {
          if (ev.target === drawer) closeDrawer();
        });
        if (doc) {
          addListener(doc, 'keydown', function (ev) {
            if (ev.key === 'Escape' && !drawer.hidden) {
              ev.preventDefault();
              closeDrawer();
            }
          });
        }
      }
    });

    // 2. Agents & Routines Roster controllers
    var agentStages = Array.prototype.slice.call(root.querySelectorAll('[data-library-agents]'));
    agentStages.forEach(function bindAgents(stage) {
      if (stage._viLibAgentsBound) return;
      stage._viLibAgentsBound = true;

      var searchEl = stage.querySelector('[data-agents-search]');
      var kindTabs = Array.prototype.slice.call(stage.querySelectorAll('[data-agents-kind]'));
      var items = Array.prototype.slice.call(stage.querySelectorAll('[data-agent-item]'));
      var sections = Array.prototype.slice.call(stage.querySelectorAll('[data-agent-section]'));
      var countEl = stage.querySelector('[data-agents-count]');
      var emptyEl = stage.querySelector('[data-agents-empty]');
      var resetBtn = stage.querySelector('[data-agents-reset]');
      var receiptEl = stage.querySelector('[data-agents-receipt]');

      var state = { query: '', kind: 'all' };

      function applyAgentFilters() {
        var q = state.query.trim().toLowerCase();
        var shown = 0;
        items.forEach(function filterItem(item) {
          var kind = item.getAttribute('data-agent-kind') || '';
          var hay = (item.textContent || '').toLowerCase();
          var okKind = state.kind === 'all' || kind === state.kind;
          var okQ = !q || hay.indexOf(q) !== -1;
          var show = okKind && okQ;
          item.hidden = !show;
          if (show) shown += 1;
        });
        sections.forEach(function updateSection(sec) {
          var secItems = Array.prototype.slice.call(sec.querySelectorAll('[data-agent-item]'));
          sec.hidden = secItems.every(function (i) { return i.hidden; });
        });
        if (countEl) countEl.textContent = 'Showing ' + shown + ' of ' + items.length + ' agents and routines';
        if (emptyEl) emptyEl.hidden = shown !== 0;
      }

      if (searchEl) {
        addListener(searchEl, 'input', function () {
          state.query = searchEl.value || '';
          applyAgentFilters();
        });
      }

      kindTabs.forEach(function (tab, idx) {
        addListener(tab, 'click', function () {
          state.kind = tab.getAttribute('data-agents-kind') || 'all';
          kindTabs.forEach(function (t) {
            var active = t === tab;
            t.setAttribute('aria-selected', active ? 'true' : 'false');
            t.setAttribute('tabindex', active ? '0' : '-1');
          });
          applyAgentFilters();
        });
        addListener(tab, 'keydown', function (ev) {
          var next = -1;
          if (ev.key === 'ArrowRight') next = (idx + 1) % kindTabs.length;
          else if (ev.key === 'ArrowLeft') next = (idx - 1 + kindTabs.length) % kindTabs.length;
          else if (ev.key === 'Home') next = 0;
          else if (ev.key === 'End') next = kindTabs.length - 1;
          if (next === -1) return;
          ev.preventDefault();
          kindTabs[next].click();
          if (typeof kindTabs[next].focus === 'function') kindTabs[next].focus();
        });
      });

      if (resetBtn) {
        addListener(resetBtn, 'click', function () {
          state.query = '';
          state.kind = 'all';
          if (searchEl) searchEl.value = '';
          kindTabs.forEach(function (t) {
            var active = t.getAttribute('data-agents-kind') === 'all';
            t.setAttribute('aria-selected', active ? 'true' : 'false');
            t.setAttribute('tabindex', active ? '0' : '-1');
          });
          applyAgentFilters();
        });
      }

      Array.prototype.slice.call(stage.querySelectorAll('[data-agent-action]')).forEach(function (btn) {
        addListener(btn, 'click', function () {
          var label = btn.getAttribute('data-agent-action') || 'Agent action';
          if (receiptEl) receiptEl.textContent = label + ' queued in workspace';
        });
      });
    });

    // 3. Projects Directory & Detail Workspace controllers
    var projectStages = Array.prototype.slice.call(root.querySelectorAll('[data-library-projects]'));
    projectStages.forEach(function bindProjects(stage) {
      if (stage._viLibProjectsBound) return;
      stage._viLibProjectsBound = true;

      var viewTabs = Array.prototype.slice.call(stage.querySelectorAll('[data-projects-mode]'));
      var viewPanels = Array.prototype.slice.call(stage.querySelectorAll('[data-projects-view-panel]'));
      var searchEl = stage.querySelector('[data-projects-search]');
      var sortEl = stage.querySelector('[data-projects-sort]');
      var scopeTabs = Array.prototype.slice.call(stage.querySelectorAll('[data-projects-scope]'));
      var layoutBtns = Array.prototype.slice.call(stage.querySelectorAll('[data-projects-layout]'));
      var tableEl = stage.querySelector('[data-projects-table]');
      var cardsEl = stage.querySelector('[data-projects-cards]');
      var items = Array.prototype.slice.call(stage.querySelectorAll('[data-project-item]'));
      var countEl = stage.querySelector('[data-projects-count]');
      var emptyEl = stage.querySelector('[data-projects-empty]');
      var resetBtn = stage.querySelector('[data-projects-reset]');
      var detailTitle = stage.querySelector('[data-project-detail-title]');
      var detailCrumb = stage.querySelector('[data-project-detail-crumb]');
      var detailTabs = Array.prototype.slice.call(stage.querySelectorAll('[data-project-subtab]'));
      var detailPanels = Array.prototype.slice.call(stage.querySelectorAll('[data-project-subpanel]'));
      var splitEl = stage.querySelector('[data-project-split]');
      var mobileTabs = Array.prototype.slice.call(stage.querySelectorAll('[data-project-mobile-tab]'));
      var memoryBtns = Array.prototype.slice.call(stage.querySelectorAll('[data-project-memory]'));
      var composerForm = stage.querySelector('[data-project-composer]');
      var receiptEl = stage.querySelector('[data-projects-receipt]');

      var state = { query: '', scope: 'all', layout: 'table' };

      function setMode(mode) {
        viewTabs.forEach(function (t) {
          var active = t.getAttribute('data-projects-mode') === mode;
          t.setAttribute('aria-selected', active ? 'true' : 'false');
          t.setAttribute('tabindex', active ? '0' : '-1');
        });
        viewPanels.forEach(function (p) {
          p.hidden = p.getAttribute('data-projects-view-panel') !== mode;
        });
      }

      viewTabs.forEach(function (tab, idx) {
        addListener(tab, 'click', function () {
          setMode(tab.getAttribute('data-projects-mode') || 'directory');
        });
        addListener(tab, 'keydown', function (ev) {
          var next = -1;
          if (ev.key === 'ArrowRight') next = (idx + 1) % viewTabs.length;
          else if (ev.key === 'ArrowLeft') next = (idx - 1 + viewTabs.length) % viewTabs.length;
          else if (ev.key === 'Home') next = 0;
          else if (ev.key === 'End') next = viewTabs.length - 1;
          if (next === -1) return;
          ev.preventDefault();
          viewTabs[next].click();
          if (typeof viewTabs[next].focus === 'function') viewTabs[next].focus();
        });
      });

      function applyProjectFilters() {
        var q = state.query.trim().toLowerCase();
        var shownTable = 0;
        var totalTable = 0;
        items.forEach(function (item) {
          var scope = item.getAttribute('data-project-scope') || '';
          var hay = (item.textContent || '').toLowerCase();
          var okScope = state.scope === 'all' || scope === state.scope;
          var okQ = !q || hay.indexOf(q) !== -1;
          var show = okScope && okQ;
          item.hidden = !show;
          if (item.getAttribute('data-project-surface') === 'table') {
            totalTable += 1;
            if (show) shownTable += 1;
          }
        });
        if (countEl) countEl.textContent = 'Showing ' + shownTable + ' of ' + totalTable + ' projects';
        if (emptyEl) emptyEl.hidden = shownTable !== 0;
      }

      if (searchEl) {
        addListener(searchEl, 'input', function () {
          state.query = searchEl.value || '';
          applyProjectFilters();
        });
      }

      if (sortEl) {
        addListener(sortEl, 'change', function () {
          var mode = sortEl.value || 'updated';
          function sortContainer(containerEl, surface) {
            if (!containerEl) return;
            var rows = items.filter(function (el) {
              return el.getAttribute('data-project-surface') === surface;
            });
            rows.sort(function (a, b) {
              if (mode === 'name') {
                return (a.getAttribute('data-project-name') || '').localeCompare(b.getAttribute('data-project-name') || '');
              }
              return Number(a.getAttribute('data-project-order') || '0') - Number(b.getAttribute('data-project-order') || '0');
            });
            rows.forEach(function (r) {
              containerEl.appendChild(r);
            });
          }
          sortContainer(tableEl, 'table');
          sortContainer(cardsEl, 'cards');
          if (receiptEl) receiptEl.textContent = 'Sorted projects by ' + (mode === 'name' ? 'Name' : 'Last updated');
        });
      }

      scopeTabs.forEach(function (tab) {
        addListener(tab, 'click', function () {
          state.scope = tab.getAttribute('data-projects-scope') || 'all';
          scopeTabs.forEach(function (t) {
            t.setAttribute('aria-selected', t === tab ? 'true' : 'false');
          });
          applyProjectFilters();
        });
      });

      layoutBtns.forEach(function (btn) {
        addListener(btn, 'click', function () {
          state.layout = btn.getAttribute('data-projects-layout') || 'table';
          layoutBtns.forEach(function (b) {
            b.setAttribute('aria-pressed', b === btn ? 'true' : 'false');
          });
          if (tableEl) tableEl.hidden = state.layout !== 'table';
          if (cardsEl) cardsEl.hidden = state.layout !== 'cards';
        });
      });

      if (resetBtn) {
        addListener(resetBtn, 'click', function () {
          state.query = '';
          state.scope = 'all';
          if (searchEl) searchEl.value = '';
          scopeTabs.forEach(function (t) {
            t.setAttribute('aria-selected', t.getAttribute('data-projects-scope') === 'all' ? 'true' : 'false');
          });
          applyProjectFilters();
        });
      }

      Array.prototype.slice.call(stage.querySelectorAll('[data-open-project]')).forEach(function (btn) {
        addListener(btn, 'click', function () {
          var name = btn.getAttribute('data-open-project') || 'Nocturne Design System';
          if (detailTitle) detailTitle.textContent = name;
          if (detailCrumb) detailCrumb.textContent = name;
          setMode('detail');
          if (receiptEl) receiptEl.textContent = 'Opened project workspace: ' + name;
        });
      });

      detailTabs.forEach(function (tab) {
        addListener(tab, 'click', function () {
          var target = tab.getAttribute('data-project-subtab') || 'threads';
          detailTabs.forEach(function (t) {
            t.setAttribute('aria-selected', t === tab ? 'true' : 'false');
          });
          detailPanels.forEach(function (p) {
            p.hidden = p.getAttribute('data-project-subpanel') !== target;
          });
        });
      });

      mobileTabs.forEach(function (tab) {
        addListener(tab, 'click', function () {
          var pane = tab.getAttribute('data-project-mobile-tab') || 'main';
          if (splitEl) splitEl.setAttribute('data-mobile-pane', pane);
          mobileTabs.forEach(function (t) {
            t.setAttribute('aria-pressed', t === tab ? 'true' : 'false');
          });
        });
      });

      memoryBtns.forEach(function (btn) {
        addListener(btn, 'click', function () {
          memoryBtns.forEach(function (b) {
            b.setAttribute('aria-pressed', b === btn ? 'true' : 'false');
          });
          if (receiptEl) receiptEl.textContent = 'Memory policy set to ' + (btn.textContent || '').trim();
        });
      });

      Array.prototype.slice.call(stage.querySelectorAll('[data-projects-back]')).forEach(function (btn) {
        addListener(btn, 'click', function () {
          setMode('directory');
        });
      });

      if (composerForm) {
        addListener(composerForm, 'submit', function (ev) {
          ev.preventDefault();
          var input = composerForm.querySelector('textarea, input');
          var text = input && input.value ? input.value.trim() : '';
          var title = detailTitle ? detailTitle.textContent : 'project';
          if (receiptEl) {
            receiptEl.textContent = text ? 'Started scoped thread in ' + title : 'Enter a prompt to start a scoped thread in ' + title;
          }
          if (input && text) input.value = '';
        });
      }

      Array.prototype.slice.call(stage.querySelectorAll('[data-project-action]')).forEach(function (btn) {
        addListener(btn, 'click', function () {
          var label = btn.getAttribute('data-project-action') || 'Project action';
          if (receiptEl) receiptEl.textContent = label + ' ready in workspace';
        });
      });
    });

    return {
      destroy: function destroy() {
        for (var i = 0; i < cleanups.length; i += 1) {
          cleanups[i]();
        }
        cleanups.length = 0;
      },
    };
  }

  return {
    initLibrarySurface: initLibrarySurface,
  };
});
