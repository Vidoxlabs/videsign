/* Local fixture controller for the canonical plugin and connector fragments. */
(() => {
  const fragmentBase = new URL('.', document.currentScript.src);
  const fragments = new Map();
  const controllers = new WeakMap();
  const embeddedHosts = new WeakSet();
  const drafts = new WeakMap();
  const menuTriggers = new WeakMap();
  const rootSelector = '[data-plugin-manager], [data-plugin-example]';
  const mountSelector = rootSelector + ', [data-plugin-embed]';
  const labels = { attention: 'Needs attention', connected: 'Connected', catalog: 'Not connected' };
  const scopes = { installed: 'Installed', custom: 'Custom', catalog: 'Catalog' };
  const fixtureTools = [['workspace.metadata.read', 'read'], ['artifacts.note.write', 'write']];
  const leaseTool = ['credentials.lease.read', 'credential'];
  let nextId = 0;

  const fixtures = [
    { id: 'telemetry-sink', name: 'Telemetry sink', mark: 'TS', category: 'developer', binding: 'queue-adapter',
      health: 'attention', description: 'The scoped lease expired. Reconnect to resume event delivery.',
      readyDescription: 'Send workspace run events to the scoped queue.',
      realm: 'workspace', mask: '58d2', tools: [['telemetry.event.write', 'write'], leaseTool] },
    { id: 'local-git', name: 'Local Git', mark: 'LG', category: 'developer', health: 'connected',
      description: 'Read workspace files and stage patch proposals for owner review.',
      realm: 'workspace', permission: 'read-only', bundled: 4, builtIn: true,
      tools: [['vcs.file.read', 'read'], ['vcs.patch.apply', 'write']] },
    { id: 'docs-index-mcp', name: 'Docs index MCP', mark: 'DI', category: 'custom', binding: 'docs-mcp',
      health: 'connected', description: 'Search the shared documentation index by title and topic.',
      custom: true, transport: 'stdio', endpoint: 'docs-index-mcp', auth: 'lease', mask: '7f3a',
      policy: 'ask-on-write', realm: 'team-shared', bundled: 4, tools: [['docs.index.search', 'read'], leaseTool] },
    { id: 'notes-mcp', name: 'Notes MCP', mark: 'NM', category: 'custom', binding: 'memory-fabric',
      health: 'connected', description: 'Read admitted workspace notes and propose edits.',
      custom: true, transport: 'http', endpoint: 'https://notes.example.invalid/mcp', auth: 'none',
      policy: 'ask-on-write', realm: 'workspace', tools: [['notes.item.read', 'read'], ['notes.item.update', 'write']] },
    { id: 'calendar-bridge', name: 'Calendar bridge', mark: 'CB', category: 'workspace', health: 'connected',
      description: 'Read shared availability and draft event proposals.', realm: 'team-shared',
      tools: [['calendar.event.read', 'read'], ['calendar.event.propose', 'write']] },
    { id: 'docs-index', name: 'Docs index', mark: 'DX', category: 'knowledge', health: 'connected',
      description: 'Find passages in the workspace document index.', realm: 'workspace',
      tools: [['docs.passage.search', 'read']] },
    { id: 'review-skills', name: 'Review skills', mark: 'RS', category: 'developer', type: 'skills',
      health: 'connected', description: 'Summarize changes and assemble a review checklist.',
      realm: 'workspace', bundled: 3, tools: [['review.change.summarize', 'read']] },
    { id: 'issue-tracker', name: 'Issue tracker', mark: 'IT', category: 'workspace',
      description: 'Read issues from projects shared with this workspace.', realm: 'external',
      tools: [['issues.item.read', 'read'], ['issues.item.update', 'write']] },
    { id: 'file-vault', name: 'File vault', mark: 'FV', category: 'workspace',
      description: 'List files in an explicitly shared folder.', tools: [['files.folder.list', 'read']] },
    { id: 'release-board', name: 'Release board', mark: 'RB', category: 'developer',
      description: 'Read release milestones from the project board.', tools: [['releases.milestone.read', 'read']] },
    { id: 'search-archive', name: 'Search archive', mark: 'SA', category: 'knowledge',
      description: 'Search the team’s shared reference archive.', realm: 'team-shared', tools: [['archive.entry.search', 'read']] },
    { id: 'citation-kit', name: 'Citation kit', mark: 'CK', category: 'knowledge', type: 'skills',
      description: 'Format citations from the sources you attach.', tools: [['citations.entry.format', 'read']] },
    { id: 'meeting-kit', name: 'Meeting kit', mark: 'MK', category: 'workspace', type: 'skills',
      description: 'Draft agendas from notes admitted to the session.', tools: [['meetings.agenda.draft', 'read']] },
    { id: 'build-log', name: 'Build log', mark: 'BL', category: 'developer',
      description: 'Inspect build output for the current workspace project.', tools: [['builds.log.read', 'read']] },
    { id: 'document-export', name: 'Document export', mark: 'DE', category: 'knowledge',
      description: 'Prepare an export from explicitly attached documents.', tools: [['docs.artifact.export', 'write']] },
    { id: 'schema-review', name: 'Schema review', mark: 'SR', category: 'developer', type: 'skills',
      description: 'Compare two attached schemas and list changed fields.', tools: [['schema.fields.compare', 'read']] },
    { id: 'shared-tasks', name: 'Shared tasks', mark: 'ST', category: 'workspace',
      description: 'Read task summaries from the shared team board.', realm: 'team-shared', tools: [['tasks.summary.read', 'read']] },
    { id: 'reference-digest', name: 'Reference digest', mark: 'RD', category: 'knowledge', type: 'skills',
      description: 'Summarize a set of explicitly admitted references.', tools: [['references.set.summarize', 'read']] },
    { id: 'release-notes', name: 'Release notes', mark: 'RN', category: 'developer', type: 'skills',
      description: 'Draft notes from selected change records.', tools: [['releases.notes.draft', 'read']] },
  ];

  function loadFragment(name) {
    if (!fragments.has(name)) {
      const pending = fetch(new URL(name, fragmentBase)).then(async (response) => {
        if (!response.ok) throw new Error('Fragment unavailable');
        const template = document.createElement('template');
        template.innerHTML = await response.text();
        return template.content;
      }).catch((error) => {
        fragments.delete(name);
        throw error;
      });
      fragments.set(name, pending);
    }
    return fragments.get(name);
  }

  function namespaceIds(root) {
    const prefix = 'plugin-view-' + ++nextId + '-';
    const ids = new Map();
    root.querySelectorAll('[id]').forEach((element) => {
      ids.set(element.id, prefix + element.id);
      element.id = ids.get(element.id);
    });
    for (const attribute of ['for', 'aria-controls', 'aria-labelledby', 'aria-describedby']) {
      root.querySelectorAll('[' + attribute + ']').forEach((element) => {
        const refs = element.getAttribute(attribute).split(/\s+/);
        element.setAttribute(attribute, refs.map((ref) => ids.get(ref) ?? ref).join(' '));
      });
    }
    const heading = root.getAttribute('aria-labelledby');
    if (ids.has(heading)) root.setAttribute('aria-labelledby', ids.get(heading));
    return root;
  }

  function appendTools(list, tools, disposition) {
    list.replaceChildren(...tools.map(([id, effect]) => {
      const entry = document.createElement('div');
      const label = document.createElement('dt');
      const code = document.createElement('code');
      const value = document.createElement('dd');
      code.textContent = id;
      label.append(code);
      value.textContent = disposition ? effect + ' · ' + disposition(effect) : effect;
      entry.append(label, value);
      return entry;
    }));
  }

  function toolDisposition(controller, record, effect) {
    const policy = record.permission && record.permission !== 'default'
      ? record.permission : record.policy ?? controller.policy;
    if (policy === 'deny' || (policy === 'read-only' && effect !== 'read')) return 'Deny';
    if (policy === 'ask' || policy === 'ask-all' || effect !== 'read') return 'Ask owner';
    return 'Allow read-only';
  }

  function renderToolBindings(controller, row, record) {
    appendTools(row.querySelector('[data-plugin-tool-list]'), record.tools, (effect) => toolDisposition(controller, record, effect));
  }

  function rowFor(controller, record) {
    const row = controller.rowTemplate.content.firstElementChild.cloneNode(true);
    const part = (name) => row.querySelector('[data-plugin-' + name + ']');
    const connected = record.health === 'connected';
    row.dataset.pluginId = record.id;
    row.dataset.health = record.health;
    part('name').textContent = record.name;
    part('mark').textContent = record.mark;
    part('provenance').textContent = record.custom ? 'Created by you' : record.builtIn ? 'Built-in connector'
      : record.type === 'skills' ? 'Skill pack' : 'Connector';
    part('description').textContent = record.description;
    part('binding').textContent = record.binding ?? record.id;
    part('realm').textContent = record.realm;
    part('status').textContent = labels[record.health];
    if (record.transport) {
      part('transport').hidden = false;
      part('transport').textContent = record.transport;
    }
    if (record.mask) {
      part('mask').hidden = false;
      part('mask').textContent = 'cred ···· ' + record.mask;
    }
    if (connected) {
      part('permission').hidden = false;
      part('permission').value = record.permission ?? 'default';
      part('permission').setAttribute('aria-label', 'Permission for ' + record.name);
      part('overflow').hidden = false;
      part('overflow').setAttribute('aria-label', 'Options for ' + record.name);
      part('menu').id = 'plugin-options-' + ++nextId;
      part('overflow').setAttribute('aria-controls', part('menu').id);
      part('edit').hidden = !record.custom;
      part('tools').hidden = false;
      part('scope').textContent = 'Realm scope · ' + record.realm;
      renderToolBindings(controller, row, record);
      if (record.bundled) {
        part('bundled').hidden = false;
        part('bundled').textContent = 'Included: ' + record.bundled + ' skills';
      }
    } else {
      const action = part('action');
      action.hidden = false;
      action.textContent = record.health === 'attention' ? 'Reconnect' : 'Connect';
    }
    return row;
  }

  function includesQuery(record, query) {
    const labels = [record.name, record.id, record.binding ?? '', record.description];
    return labels.some((label) => label.toLowerCase().includes(query))
      || record.tools.some(([id]) => id.includes(query));
  }

  function render(controller) {
    const { root, records } = controller;
    if (!controller.rowTemplate) return;
    if (!root.matches('[data-plugin-manager]')) {
      root.querySelector('[data-plugin-example-list]').replaceChildren(...records.map((record) => rowFor(controller, record)));
      return;
    }
    const allGroups = { attention: [], connected: [], catalog: [] };
    const visibleGroups = { attention: [], connected: [], catalog: [] };
    const { ownership, category, type, query } = controller.filters;
    let customs = 0;
    for (const record of records) {
      allGroups[record.health].push(record);
      if (record.custom && record.health !== 'catalog') customs += 1;
      const scopeMatches = ownership === 'catalog' ? record.health === 'catalog'
        : record.health !== 'catalog' && (ownership !== 'custom' || record.custom);
      if (scopeMatches && (type === 'all' || type === record.type)
          && (category === 'all' || category === record.category) && includesQuery(record, query)) {
        visibleGroups[record.health].push(record);
      }
    }
    const counts = {
      installed: allGroups.attention.length + allGroups.connected.length,
      custom: customs,
      catalog: allGroups.catalog.length,
    };
    root.querySelector('[data-plugin-totals]').value =
      allGroups.connected.length + ' connected · ' + allGroups.attention.length + ' needs attention';
    for (const [key, value] of Object.entries(counts)) {
      root.querySelector('[data-plugin-count="' + key + '"]').textContent = '(' + value + ')';
    }
    let matches = 0;
    for (const [key, groupRecords] of Object.entries(visibleGroups)) {
      const group = root.querySelector('[data-plugin-group="' + key + '"]');
      group.hidden = groupRecords.length === 0;
      group.querySelector('[data-plugin-group-count]').textContent = '(' + groupRecords.length + ')';
      group.querySelector('[data-plugin-group-list]').replaceChildren(...groupRecords.map((record) => rowFor(controller, record)));
      matches += groupRecords.length;
    }
    root.querySelector('[data-plugin-matches]').textContent = matches + (matches === 1 ? ' match' : ' matches');
    root.querySelector('[data-plugin-empty]').hidden = matches !== 0;
    root.querySelector('[data-plugin-browse]').hidden = ownership === 'catalog' || matches === 0 || counts.catalog === 0;
  }

  function syncFilters(controller) {
    const { root, filters } = controller;
    for (const key of ['ownership', 'category', 'type']) {
      root.querySelectorAll('[data-plugin-' + key + ']').forEach((button) => {
        const selected = button.getAttribute('data-plugin-' + key) === filters[key];
        button.setAttribute(key === 'type' ? 'aria-selected' : 'aria-pressed', String(selected));
        if (key === 'type') {
          button.tabIndex = selected ? 0 : -1;
          if (selected) root.querySelector('[data-plugin-results]').setAttribute('aria-labelledby', button.id);
        }
      });
    }
    render(controller);
  }

  function receipt(root, text) {
    root.querySelector('[data-plugin-receipt]').textContent = text;
  }

  async function init(root, previewState) {
    if (controllers.has(root)) return controllers.get(root);
    const state = {
      root, records: [], policy: 'ask-on-write', filters: { type: 'all', ownership: 'installed', category: 'all', query: '' },
    };
    controllers.set(root, state);
    if (root.dataset.pluginExample === 'drawer') return state;
    const rows = root.dataset.pluginExample === 'rows';
    state.records = fixtures.filter((record) => !rows || ['telemetry-sink', 'local-git', 'docs-index-mcp', 'issue-tracker'].includes(record.id))
      .map((record) => ({ type: 'connectors', realm: 'workspace', health: 'catalog', ...record }));
    if (previewState && root.hasAttribute('data-plugin-manager')) {
      state.filters.type = previewState;
    }
    try {
      state.rowTemplate = root.querySelector('[data-plugin-row-template]')
        ?? (await loadFragment('plugin-connector-row.html')).querySelector('[data-plugin-row-template]');
      if (rows) {
        root.querySelector('[data-plugin-load]').hidden = true;
        render(state);
      } else syncFilters(state);
    } catch {
      const status = root.querySelector('[data-plugin-matches], [data-plugin-load]');
      status.textContent = 'The row examples could not be loaded.';
    }
    return state;
  }

  function closeMenu(menu, restore = true) {
    const trigger = menuTriggers.get(menu);
    menu.hidePopover();
    trigger.setAttribute('aria-expanded', 'false');
    if (restore) trigger.focus();
  }

  function toggleMenu(row, trigger) {
    const menu = row.querySelector('[data-plugin-menu]');
    if (menu.matches(':popover-open')) {
      closeMenu(menu);
      return;
    }
    const bounds = trigger.getBoundingClientRect();
    const above = bounds.bottom > innerHeight / 2;
    menu.toggleAttribute('data-above', above);
    menu.style.setProperty('--vi-plugin-menu-top', (above ? bounds.top : bounds.bottom) + 'px');
    menu.style.setProperty('--vi-plugin-menu-left', bounds.left + 'px');
    if (!menuTriggers.has(menu)) {
      menuTriggers.set(menu, trigger);
      menu.addEventListener('toggle', (event) => {
        trigger.setAttribute('aria-expanded', String(event.newState === 'open'));
      });
    }
    menu.showPopover({ source: trigger });
    trigger.setAttribute('aria-expanded', 'true');
    menu.querySelector('button').focus();
  }

  function syncTransport(form) {
    const remote = form.elements.transport.value === 'http';
    form.elements.endpoint.placeholder = remote ? 'https://connector.example.invalid/mcp' : 'custom-mcp-alpha';
    form.querySelector('[data-plugin-endpoint-label]').textContent = remote ? 'Endpoint URL' : 'Local command';
    form.querySelector('[data-plugin-endpoint-help]').textContent = remote
      ? 'Enter a sample HTTP or HTTPS URL without credentials, query parameters or a fragment.'
      : 'Enter a sample command name for the preview.';
  }

  function invalidate(form, showReceipt) {
    const state = drafts.get(form);
    const hadCheck = Boolean(state.checked);
    state.checked = null;
    form.querySelector('[data-plugin-save]').disabled = true;
    form.querySelector('[data-plugin-discovered]').hidden = true;
    const status = form.querySelector('[data-plugin-test-receipt]');
    if (!showReceipt) status.textContent = '';
    else if (hadCheck) status.textContent = 'Configuration changed. Test the connection again.';
  }

  function readConfig(form) {
    return Object.fromEntries([...new FormData(form)].map(([key, value]) => [key, value.trim()]));
  }

  function validEndpoint(value) {
    try {
      const url = new URL(value);
      return ['http:', 'https:'].includes(url.protocol) && !url.username && !url.password && !url.search && !url.hash;
    } catch {
      return false;
    }
  }

  function testConnection(form) {
    invalidate(form, false);
    const { controller, editing } = drafts.get(form);
    const data = readConfig(form);
    let message = '';
    let field = '';
    if (!data.name) {
      [field, message] = ['name', 'Enter a connector name.'];
    } else if (!/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/.test(data.slug)) {
      [field, message] = ['slug', 'Enter a neutral slug with lowercase letters, numbers and single hyphens.'];
    } else if (fixtures.some((entry) => entry.id === data.slug && entry.id !== editing?.id)
        || controller.records.some((entry) => entry.id === data.slug && entry !== editing)) {
      [field, message] = ['slug', 'This slug is already in use.'];
    } else if (!data.endpoint || (data.transport === 'http' && !validEndpoint(data.endpoint))) {
      [field, message] = ['endpoint', data.transport === 'http'
        ? 'Enter an HTTP or HTTPS URL without credentials, query parameters or a fragment.'
        : 'Enter a sample command name.'];
    }
    const status = form.querySelector('[data-plugin-test-receipt]');
    if (message) {
      status.textContent = message;
      form.elements.namedItem(field).setAttribute('aria-invalid', 'true');
      form.elements.namedItem(field).focus();
      return;
    }
    const tools = (
      editing ? editing.tools.filter(([, effect]) => effect !== 'credential') : fixtureTools
    ).concat(data.auth === 'lease' ? [leaseTool] : []);
    drafts.get(form).checked = { data, tools };
    const list = form.querySelector('[data-plugin-discovered]');
    appendTools(list, tools);
    list.hidden = false;
    status.textContent = 'Preview check complete. ' + tools.length + ' tools found.';
    form.querySelector('[data-plugin-save]').disabled = false;
    list.focus({ preventScroll: true });
    list.scrollIntoView({ block: 'nearest' });
  }

  async function openDrawer(controller, trigger, editing) {
    const { root } = controller;
    let drawer = root.querySelector('[data-plugin-drawer]');
    if (!drawer) {
      const fragment = await loadFragment('custom-connector-drawer.html');
      if (!root.isConnected) return;
      drawer = root.querySelector('[data-plugin-drawer]');
      if (!drawer) {
        drawer = namespaceIds(fragment.querySelector('[data-plugin-drawer]').cloneNode(true));
        (root.querySelector('[data-plugin-drawer-slot]') ?? root).append(drawer);
      }
    }
    if (drawer.open) return;
    const form = drawer.querySelector('[data-plugin-form]');
    form.reset();
    form.querySelectorAll('[aria-invalid]').forEach((control) => control.removeAttribute('aria-invalid'));
    drafts.set(form, { controller, editing, checked: null });
    if (editing) {
      for (const name of ['name', 'transport', 'endpoint', 'auth', 'realm', 'policy']) {
        form.elements.namedItem(name).value = editing[name];
      }
      form.elements.slug.value = editing.id;
    }
    invalidate(form, false);
    syncTransport(form);
    drawer.querySelector('[data-plugin-drawer-title]').textContent = editing ? 'Edit custom connector' : 'Add a custom connector';
    const focusTarget = trigger.closest('[data-plugin-menu]') ? menuTriggers.get(trigger.closest('[data-plugin-menu]')) : trigger;
    focusTarget?.focus();
    drawer.addEventListener('close', () => {
      const fallback = root.querySelector('[data-plugin-open-drawer]');
      (focusTarget?.isConnected ? focusTarget : fallback)?.focus();
    }, { once: true });
    drawer.showModal();
    form.elements.name.focus();
  }

  function save(form) {
    const { controller, editing, checked } = drafts.get(form);
    if (!checked || JSON.stringify(checked.data) !== JSON.stringify(readConfig(form))) {
      invalidate(form, true);
      return;
    }
    const { root, records } = controller;
    const { slug, ...data } = checked.data;
    const record = {
      ...editing, ...data, id: slug, binding: editing?.id === slug ? editing.binding : slug, mark: editing?.mark ?? 'MC',
      category: 'custom', type: 'connectors', health: 'connected', custom: true,
      description: editing?.description ?? 'Custom connector with sample tool bindings.',
      mask: data.auth === 'lease' ? editing?.mask ?? '7f3a' : null, tools: checked.tools,
    };
    if (editing) records.splice(records.indexOf(editing), 1, record);
    else records.push(record);
    if (root.matches('[data-plugin-manager]')) {
      Object.assign(controller.filters, { type: 'all', ownership: 'custom', category: 'all', query: '' });
      root.querySelector('[data-plugin-search]').value = '';
      syncFilters(controller);
    } else if (controller.rowTemplate) render(controller);
    receipt(root, scopes.custom + ' connector ' + (editing ? 'updated' : 'saved') + ' in the preview.');
    form.closest('dialog').close();
  }

  async function launchManager(trigger) {
    trigger.disabled = true;
    try {
      const fragment = await loadFragment('plugins-connectors-surface.html');
      if (!trigger.isConnected) return;
      const manager = namespaceIds(fragment.querySelector('[data-plugin-manager]').cloneNode(true));
      const dialog = document.createElement('dialog');
      dialog.className = 'vi-plugin-manager-dialog';
      dialog.setAttribute('aria-labelledby', manager.getAttribute('aria-labelledby'));
      const header = document.createElement('header');
      const close = document.createElement('button');
      close.className = 'vi-plugin-action vi-plugin-action--icon';
      close.type = 'button';
      close.textContent = '×';
      close.setAttribute('aria-label', 'Close plugins and connectors');
      close.addEventListener('click', () => dialog.close());
      header.append(close);
      dialog.append(header, manager);
      dialog.addEventListener('close', () => {
        dialog.remove();
        trigger.focus();
      }, { once: true });
      document.body.append(dialog);
      void init(manager, trigger.dataset.pluginLaunch === 'skills' ? 'skills' : undefined);
      trigger.disabled = false;
      trigger.focus();
      dialog.showModal();
    } finally {
      trigger.disabled = false;
    }
  }

  async function mount(node) {
    if (!node.matches('[data-plugin-embed]')) {
      await init(node);
      return;
    }
    if (embeddedHosts.has(node)) return;
    embeddedHosts.add(node);
    try {
      const fragment = await loadFragment('plugins-connectors-surface.html');
      if (!node.isConnected) return;
      const manager = namespaceIds(fragment.querySelector('[data-plugin-manager]').cloneNode(true));
      node.replaceChildren(manager);
      await init(manager);
    } catch {
      node.querySelector('[role="status"]').textContent = 'The connector manager could not be loaded.';
    }
  }

  document.querySelectorAll(mountSelector).forEach((node) => { void mount(node); });
  new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (node.nodeType !== Node.ELEMENT_NODE) continue;
        if (node.matches(mountSelector)) void mount(node);
        node.querySelectorAll(mountSelector).forEach((child) => { void mount(child); });
      }
    }
  }).observe(document.body, { childList: true, subtree: true });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      const menu = document.querySelector('.vi-plugin-menu:popover-open');
      if (menu) {
        event.preventDefault();
        closeMenu(menu);
      }
      return;
    }
    const tab = event.target.closest?.('[data-plugin-type]');
    if (!tab || !['ArrowRight', 'ArrowLeft', 'Home', 'End'].includes(event.key)) return;
    const tabs = [...tab.closest('[role="tablist"]').querySelectorAll('[data-plugin-type]')];
    const index = tabs.indexOf(tab);
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1
      : (index + (event.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length;
    event.preventDefault();
    tabs[next].click();
    tabs[next].focus();
  });

  function updateField(event) {
    const control = event.target;
    const form = control.closest?.('[data-plugin-form]');
    if (form && drafts.has(form)) {
      control.removeAttribute('aria-invalid');
      if (control.name === 'transport') syncTransport(form);
      invalidate(form, true);
    }
    const root = control.closest?.(rootSelector);
    const controller = controllers.get(root);
    if (control.matches?.('[data-plugin-search]') && controller) {
      controller.filters.query = control.value.trim().toLowerCase();
      render(controller);
    }
  }

  document.addEventListener('input', updateField);
  document.addEventListener('change', (event) => {
    const control = event.target;
    if (control.closest?.('[data-plugin-form]')) updateField(event);
    const root = control.closest?.(rootSelector);
    const controller = controllers.get(root);
    if (!controller) return;
    if (control.matches('[data-plugin-default-policy]')) {
      controller.policy = control.value;
      root.querySelectorAll('[data-plugin-row][data-health="connected"]').forEach((row) => {
        const record = controller.records.find((entry) => entry.id === row.dataset.pluginId);
        renderToolBindings(controller, row, record);
      });
      receipt(root, 'Default policy saved · ' + control.selectedOptions[0].textContent);
    } else if (control.matches('[data-plugin-permission]')) {
      const row = control.closest('[data-plugin-row]');
      const record = controller.records.find((entry) => entry.id === row.dataset.pluginId);
      record.permission = control.value;
      renderToolBindings(controller, row, record);
      receipt(root, 'Permission saved for ' + record.name + ' · ' + control.selectedOptions[0].textContent);
    }
  });

  document.addEventListener('submit', (event) => {
    if (!event.target.matches('[data-plugin-form]')) return;
    event.preventDefault();
    save(event.target);
  });

  document.addEventListener('click', (event) => {
    const button = event.target.closest?.('button');
    if (!button) return;
    const root = button.closest(rootSelector);
    if (button.hasAttribute('data-plugin-launch')) {
      void launchManager(button).catch(() => {
        const status = document.createElement('p');
        status.setAttribute('role', 'status');
        status.textContent = 'The connector manager could not be loaded.';
        button.after(status);
      });
      return;
    }
    const controller = controllers.get(root);
    if (!controller) return;
    const row = button.closest('[data-plugin-row]');
    const record = row && controller.records.find((entry) => entry.id === row.dataset.pluginId);
    const data = button.dataset;
    if (data.pluginType || data.pluginOwnership || data.pluginCategory) {
      const key = data.pluginType ? 'type' : data.pluginOwnership ? 'ownership' : 'category';
      controller.filters[key] = button.getAttribute('data-plugin-' + key);
      syncFilters(controller);
    } else if ('pluginReset' in data || 'pluginBrowse' in data) {
      Object.assign(controller.filters, { type: 'all', ownership: 'pluginBrowse' in data ? 'catalog' : 'installed', category: 'all', query: '' });
      const search = root.querySelector('[data-plugin-search]');
      search.value = '';
      syncFilters(controller);
      search.focus();
    } else if ('pluginOpenDrawer' in data || 'pluginEdit' in data) {
      if (record) closeMenu(button.closest('[data-plugin-menu]'), false);
      void openDrawer(controller, button, record || null).catch(() => { receipt(root, 'The custom connector drawer could not be loaded.'); });
    } else if ('pluginCloseDrawer' in data) {
      button.closest('dialog').close();
    } else if ('pluginTest' in data) {
      testConnection(button.closest('form'));
    } else if ('pluginOverflow' in data) {
      toggleMenu(row, button);
    } else if ('pluginInspect' in data) {
      closeMenu(button.closest('[data-plugin-menu]'), false);
      const tools = row.querySelector('[data-plugin-tools]');
      tools.open = true;
      tools.querySelector('summary').focus();
    } else if ('pluginAction' in data || 'pluginDisconnect' in data) {
      if ('pluginDisconnect' in data) closeMenu(button.closest('[data-plugin-menu]'), false);
      const reconnect = record.health === 'attention';
      const connected = 'pluginAction' in data;
      record.health = connected ? 'connected' : 'catalog';
      if (reconnect) record.description = record.readyDescription;
      render(controller);
      receipt(root, record.name + (reconnect ? ' reconnected' : connected ? ' connected' : ' disconnected') + ' in the preview.');
      const replacement = root.querySelector('[data-plugin-id="' + record.id + '"] :is([data-plugin-permission], [data-plugin-action]):not([hidden])');
      (replacement ?? root.querySelector('[data-plugin-search]'))?.focus();
    }
  });
})();
