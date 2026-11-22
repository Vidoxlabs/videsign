/* Local catalog interactions for the state-free chat fragments. */
(() => {
  const rootSelector = '[data-chat-preview]';
  const previewRoots = new WeakSet();
  const panelState = new WeakMap();
  const menuTriggers = new WeakMap();
  const pendingTurns = new WeakMap();
  const nativeFieldSizing = CSS.supports('field-sizing', 'content');

  function stageFor(root) {
    return root.matches('[data-chat-stage]') ? root : root.querySelector('[data-chat-stage]');
  }

  function announce(stage, text) {
    stage.querySelector('[data-chat-announcement]').textContent = text;
  }

  function syncInput(input) {
    const form = input.form;
    const streaming = form.dataset.state === 'streaming';
    const hasText = Boolean(input.value.trim());
    const submit = form.querySelector('[type="submit"]');
    const label = streaming ? 'Stop' : 'Send';
    if (!streaming) form.dataset.state = hasText ? 'composing' : 'idle';
    submit.disabled = !streaming && !hasText;
    submit.setAttribute('aria-label', label);
    submit.title = label;
    if (!nativeFieldSizing && input.getClientRects().length) {
      input.style.blockSize = 'auto';
      input.style.blockSize = input.scrollHeight + 'px';
    }
  }

  function syncAttachments(root, form) {
    const entries = [...form.querySelectorAll('[data-chat-attachment]')];
    let tokens = 0;
    for (const entry of entries) {
      if (!entry.hidden) tokens += Number(entry.dataset.tokens);
      const option = root.querySelector('[data-chat-attach="' + entry.dataset.chatAttachment + '"]');
      option.setAttribute('aria-pressed', String(!entry.hidden));
    }
    form.querySelector('[data-chat-context]').hidden = tokens === 0;
    form.querySelector('[data-chat-budget]').value = tokens.toLocaleString('en-US') + ' / 4,096 tokens';
  }

  function openMenu(menu, trigger) {
    menuTriggers.set(menu, trigger);
    if (!menu.matches(':popover-open')) menu.showPopover();
  }

  function closeMenu(menu, restoreFocus = false) {
    menu.hidePopover();
    if (restoreFocus) menuTriggers.get(menu)?.focus();
  }

  // Native top-layer popovers are positioned relative to the invoking control.
  document.addEventListener('beforetoggle', (event) => {
    const menu = event.target;
    if (event.newState !== 'open' || !menu.matches('.vi-chat-menu')) return;
    const trigger = event.source ?? menuTriggers.get(menu);
    if (!trigger) return;
    menuTriggers.set(menu, trigger);
    const bounds = trigger.getBoundingClientRect();
    const above = bounds.bottom > window.innerHeight / 2;
    menu.dataset.placement = above ? 'above' : 'below';
    menu.style.setProperty('--vi-chat-menu-left', bounds.left + 'px');
    menu.style.setProperty('--vi-chat-menu-top', (above ? bounds.top : bounds.bottom) + 'px');
  }, true);

  function chooseRecipient(stage, choice) {
    const name = choice.dataset.chatSeat ?? choice.dataset.chatRecipient;
    const menu = choice.closest('[popover]');
    menu.querySelectorAll('[aria-pressed]').forEach((button) => {
      button.setAttribute('aria-pressed', String(button === choice));
    });
    stage.querySelectorAll('[data-chat-recipient-label]').forEach((label) => { label.textContent = name; });
    stage.querySelectorAll('[popovertarget="' + menu.id + '"]').forEach((button) => {
      const label = choice.dataset.chatSeat ? 'Choose a seat: ' : 'Choose recipient: ';
      button.setAttribute('aria-label', label + name);
      button.title = label + name;
    });
    const prefix = choice.dataset.chatSeat ? 'Ask ' : 'Message ';
    stage.querySelector('[data-chat-input]').placeholder = prefix + name + ' or type / for skills…';
    stage.querySelector('[data-chat-input-label]').textContent = 'Message ' + name;
    stage.querySelectorAll('[data-chat-monogram]').forEach((mark) => {
      mark.textContent = choice.dataset.monogram ?? name[0];
    });
    closeMenu(menu, true);
  }

  function chooseSlot(stage, choice) {
    const slot = choice.dataset.chatSlot;
    const label = choice.textContent.trim();
    choice.closest('[popover]').querySelectorAll('[data-chat-slot]').forEach((button) => {
      button.setAttribute('aria-pressed', String(button === choice));
    });
    stage.querySelectorAll('[data-chat-slot-label]').forEach((entry) => { entry.textContent = label; });
    stage.querySelectorAll('[data-slot-id]').forEach((entry) => { entry.dataset.slotId = slot; });
    const selector = stage.querySelector('[data-chat-slot-control]');
    selector.setAttribute('aria-label', 'Model slot: ' + label);
    selector.title = 'Model slot: ' + label;
    closeMenu(choice.closest('[popover]'), true);
  }

  function appendTurn(thread, node, follow) {
    const log = thread.closest('[role="log"]');
    const atEnd = log.scrollHeight - log.clientHeight - log.scrollTop < 2;
    thread.append(node);
    if (follow || atEnd) log.scrollTop = log.scrollHeight;
  }

  function makeNode(tag, className, text) {
    const node = document.createElement(tag);
    node.className = className;
    node.textContent = text;
    return node;
  }

  function replySpeaker(stage, thread) {
    const choice = stage.querySelector(':is([data-chat-seat], [data-chat-recipient])[aria-pressed="true"]');
    const name = choice.textContent.trim() || choice.getAttribute('aria-label');
    const last = [...thread.querySelectorAll('.vi-chat-speaker')].findLast((node) => !node.closest('[hidden]'));
    if (last?.dataset.chatVoice === name || last?.children[1]?.textContent.trim() === name) return null;

    const fixture = [...thread.querySelectorAll('[data-chat-seed] .vi-chat-speaker')];
    const matching = fixture.find((node) => node.children[1].textContent.trim() === name);
    const speaker = (matching ?? fixture[0]).cloneNode(true);
    speaker.dataset.chatVoice = name;
    speaker.children[1].textContent = name;
    if (choice.hasAttribute('data-chat-seat')) {
      [...speaker.firstElementChild.children].forEach((bar, index) => {
        const active = stage.querySelectorAll('[data-chat-seat]')[index] === choice;
        bar.classList.toggle('w-indicator-mark-base', active);
        bar.classList.toggle('w-indicator-dot-base', !active);
        bar.classList.toggle('opacity-40', !active);
      });
    }
    return speaker;
  }

  function settleTurn(stage, stopped = false) {
    const turn = pendingTurns.get(stage);
    if (!turn) return;
    clearTimeout(turn.timer);
    pendingTurns.delete(stage);
    const log = turn.thread.closest('[role="log"]');
    const atEnd = log.scrollHeight - log.clientHeight - log.scrollTop < 2;
    turn.reply.removeAttribute('aria-busy');
    if (stopped) {
      turn.prose.textContent = 'Preview reply stopped.';
    } else {
      turn.prose.textContent = 'I can start with the reference material in this session and outline the next step.';
    }
    const fixture = turn.thread.querySelector('[data-chat-seed] .vi-chat-turn-footer');
    if (fixture) {
      const footer = fixture.cloneNode(true);
      const state = footer.querySelector('.vi-chat-status');
      if (stopped) {
        state.firstElementChild.className = 'bg-status-indicator-warning-base';
        state.lastChild.textContent = 'Stopped';
      }
      footer.querySelector('.vi-chat-meta').textContent = '0 model tokens';
      turn.reply.append(footer);
    }
    if (atEnd) log.scrollTop = log.scrollHeight;
    turn.input.form.dataset.state = 'idle';
    syncInput(turn.input);
    announce(stage, stopped ? 'Reply stopped' : 'Reply finished');
  }

  function send(stage, input) {
    const message = input.value.trim();
    if (!message || pendingTurns.has(stage)) return;
    const thread = stage.querySelector('[data-chat-thread]');
    stage.dataset.empty = 'false';
    const title = stage.querySelector('[data-chat-title]');
    if (title && title.textContent === 'New session') title.textContent = 'Untitled session';
    thread.querySelectorAll('[data-chat-latest]').forEach((turn) => {
      turn.removeAttribute('data-chat-latest');
      const followups = turn.querySelector('.vi-chat-followups');
      if (followups) followups.hidden = true;
    });

    const user = makeNode('div', 'vi-chat-turn vi-chat-turn--user', '');
    const bubble = makeNode('p', 'vi-chat-bubble', message);
    bubble.dataset.chatUtterance = message;
    bubble.prepend(makeNode('span', 'sr-only', 'You said: '));
    user.append(bubble);
    appendTurn(thread, user, true);

    const reply = makeNode('article', 'vi-chat-turn', '');
    reply.setAttribute('aria-busy', 'true');
    reply.setAttribute('data-chat-latest', '');
    const speaker = replySpeaker(stage, thread);
    if (speaker) reply.append(speaker);
    const prose = makeNode('p', 'vi-chat-prose', 'Generating preview reply…');
    reply.append(prose);
    appendTurn(thread, reply, true);
    input.value = '';
    input.form.dataset.state = 'streaming';
    syncInput(input);
    announce(stage, 'Reply in progress');
    const timer = window.setTimeout(() => settleTurn(stage), 1400);
    pendingTurns.set(stage, { thread, reply, prose, input, timer });
  }

  function selectSession(root, active, source) {
    const stage = stageFor(root);
    const input = stage.querySelector('[data-chat-input]');
    const seed = stage.querySelector('[data-chat-seed]');
    settleTurn(stage, true);
    for (const child of [...seed.parentElement.children]) {
      if (child !== seed) child.remove();
    }
    seed.hidden = !active;
    const latest = [...seed.querySelectorAll('article')].at(-1);
    if (latest) {
      latest.setAttribute('data-chat-latest', '');
      const followups = latest.querySelector('.vi-chat-followups');
      if (followups) followups.hidden = false;
    }
    stage.dataset.empty = String(!active);
    root.querySelectorAll('[data-chat-session][aria-pressed]').forEach((button) => {
      button.setAttribute('aria-pressed', String(button.dataset.chatSession === (active ? 'active' : 'empty')));
    });
    if (!panelState.has(root)) {
      syncInput(input);
      return;
    }

    const title = stage.querySelector('[data-chat-title]');
    title.textContent = active ? source.textContent.trim() : 'New session';
    const rail = root.querySelector('[data-chat-panel="rail"]');
    rail.querySelectorAll('[aria-current]').forEach((button) => button.removeAttribute('aria-current'));
    if (active && rail.contains(source)) source.setAttribute('aria-current', 'true');
    const panels = panelState.get(root);
    if (!active) {
      panels.inspector = false;
      input.value = '';
      input.form.querySelectorAll('[data-chat-attachment]').forEach((entry) => { entry.hidden = true; });
      syncAttachments(root, input.form);
    }
    panels.railMobile = false;
    syncWorkspace(root);
    syncInput(input);
    input.focus();
  }

  function syncWorkspace(root) {
    const state = panelState.get(root);
    const grid = root.querySelector('.vi-chat-workspace__grid');
    state.wide = getComputedStyle(grid).getPropertyValue('--vi-chat-panels-inline').trim() === '1';
    const rail = root.querySelector('[data-chat-panel="rail"]');
    const inspector = root.querySelector('[data-chat-panel="inspector"]');
    const showRail = state.wide ? state.railDesktop : state.railMobile && !state.inspector;
    const showInspector = state.inspector;
    const modalPanel = !state.wide && (showInspector ? inspector : showRail ? rail : null);
    const stage = stageFor(root);
    const restore = !modalPanel && stage.inert && root.contains(document.activeElement);

    rail.hidden = !showRail;
    rail.toggleAttribute('data-open', showRail);
    inspector.hidden = !showInspector;
    stage.inert = Boolean(modalPanel);
    root.querySelector('[data-chat-scrim]').hidden = !modalPanel;
    for (const [name, panel] of [['rail', rail], ['inspector', inspector]]) {
      root.querySelector('[data-chat-panel-toggle="' + name + '"]').setAttribute('aria-expanded', String(!panel.hidden));
      if (panel === modalPanel) {
        panel.setAttribute('role', 'dialog');
        panel.setAttribute('aria-modal', 'true');
      } else {
        panel.removeAttribute('role');
        panel.removeAttribute('aria-modal');
      }
    }
    if (modalPanel && !modalPanel.contains(document.activeElement)) {
      modalPanel.querySelector('[data-chat-panel-close]').focus();
    } else if (restore && document.activeElement.closest('[hidden]')) {
      stage.querySelector('[data-chat-panel-toggle="rail"]').focus();
    }
  }

  function setPanel(root, panel, open, restoreFocus = true) {
    const state = panelState.get(root);
    if (panel === 'rail') {
      if (state.wide) state.railDesktop = open;
      else {
        state.railMobile = open;
        if (open) state.inspector = false;
      }
    } else {
      state.inspector = open;
      if (open && !state.wide) state.railMobile = false;
    }
    syncWorkspace(root);
    if (open) {
      root.querySelector('[data-chat-panel-close="' + panel + '"]').focus();
    } else if (restoreFocus) {
      root.querySelector('[data-chat-panel-toggle="' + panel + '"]').focus();
    }
  }

  function toggleDock(root, open) {
    const dialog = stageFor(root);
    const launcher = root.querySelector('[data-chat-dock-toggle]');
    if (open) {
      dialog.show();
      const input = dialog.querySelector('[data-chat-input]');
      syncInput(input);
      input.focus();
    } else {
      dialog.close();
      launcher.focus();
    }
    launcher.setAttribute('aria-expanded', String(open));
  }

  function init(root) {
    if (previewRoots.has(root)) return;
    previewRoots.add(root);
    const stage = stageFor(root);
    const input = stage.querySelector('[data-chat-input]');
    syncInput(input);
    syncAttachments(root, input.form);
    if (root.hasAttribute('data-chat-workspace')) {
      panelState.set(root, { railDesktop: true, railMobile: false, inspector: false, wide: false });
      const observer = new ResizeObserver(() => syncWorkspace(root));
      observer.observe(root);
      syncWorkspace(root);
    }
  }

  document.querySelectorAll(rootSelector).forEach(init);
  new MutationObserver((records) => {
    for (const record of records) {
      for (const node of record.addedNodes) {
        if (node.nodeType !== Node.ELEMENT_NODE) continue;
        if (node.matches(rootSelector)) init(node);
        node.querySelectorAll(rootSelector).forEach(init);
      }
    }
  }).observe(document.body, { childList: true, subtree: true });

  document.addEventListener('input', (event) => {
    const control = event.target;
    if (control.matches('[data-chat-input]')) syncInput(control);
    if (control.matches('[data-chat-search]')) {
      const query = control.value.trim().toLowerCase();
      const menu = control.closest('[popover]');
      const results = [...menu.querySelectorAll('[data-chat-search-result]')];
      results.forEach((result) => { result.hidden = !result.textContent.toLowerCase().includes(query); });
      menu.querySelector('[data-chat-search-empty]').hidden = results.some((result) => !result.hidden);
    }
  });

  window.addEventListener('resize', () => {
    if (!nativeFieldSizing) document.querySelectorAll('[data-chat-input]').forEach(syncInput);
  });

  document.addEventListener('submit', (event) => {
    if (!event.target.matches('[data-chat-composer]')) return;
    event.preventDefault();
    const stage = event.target.closest('[data-chat-stage]');
    const input = event.target.querySelector('[data-chat-input]');
    if (pendingTurns.has(stage)) {
      settleTurn(stage, true);
      input.focus();
    } else {
      send(stage, input);
    }
  });

  document.addEventListener('keydown', (event) => {
    const escapeMenu = event.key === 'Escape' ? document.querySelector('.vi-chat-menu:popover-open') : null;
    const root = escapeMenu?.closest(rootSelector)
      ?? event.target.closest?.(rootSelector)
      ?? document.querySelector('[data-chat-workspace]');
    if (!root || event.isComposing || event.defaultPrevented) return;
    const stage = stageFor(root);
    const panels = panelState.get(root);
    const activeMenu = root.querySelector('[popover]:popover-open');
    if (event.key === 'Escape') {
      if (activeMenu) {
        event.preventDefault();
        closeMenu(activeMenu, true);
      } else if (root.querySelector(':modal')) {
        return;
      } else if (stage.matches('dialog[open]')) {
        event.preventDefault();
        toggleDock(root, false);
      } else if (panels?.inspector || panels?.railMobile) {
        event.preventDefault();
        setPanel(root, panels.inspector ? 'inspector' : 'rail', false);
      }
      return;
    }
    if (panels && (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      const trigger = root.querySelector('[data-chat-search-trigger]');
      if (!trigger.getClientRects().length) setPanel(root, 'rail', true);
      const menu = document.getElementById(trigger.getAttribute('popovertarget'));
      openMenu(menu, trigger);
      menu.querySelector('input').focus();
      return;
    }

    const modalPanel = root.querySelector('[data-chat-panel][aria-modal="true"]');
    if (event.key === 'Tab' && modalPanel && !activeMenu && !root.querySelector(':modal')) {
      const targets = [...modalPanel.querySelectorAll('button, summary, a, input')]
        .filter((element) => !element.disabled && element.getClientRects().length);
      const first = targets[0];
      const last = targets.at(-1);
      if (event.shiftKey ? document.activeElement === first : document.activeElement === last) {
        event.preventDefault();
        (event.shiftKey ? last : first)?.focus();
      }
    }

    const input = event.target;
    if (!input.matches?.('[data-chat-input]') || event.metaKey || event.ctrlKey || event.altKey) return;
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      if (!pendingTurns.has(stage) && input.value.trim()) input.form.requestSubmit();
    } else if (event.key === '/' && !input.value) {
      event.preventDefault();
      const menu = document.getElementById(stage.dataset.chatSkills);
      openMenu(menu, input);
      menu.querySelector('button').focus();
    }
  });

  document.addEventListener('click', async (event) => {
    const root = event.target.closest(rootSelector);
    if (!root) return;
    const stage = stageFor(root);
    if (event.target.closest('.vi-chat-skip')) {
      event.preventDefault();
      stage.focus();
      return;
    }
    const input = stage.querySelector('[data-chat-input]');
    const button = event.target.closest('button');
    if (event.target.matches('[data-chat-scrim]')) {
      setPanel(root, panelState.get(root).inspector ? 'inspector' : 'rail', false);
    }
    if (!button) return;
    const menuId = button.getAttribute('popovertarget');
    if (menuId) menuTriggers.set(document.getElementById(menuId), button);
    const data = button.dataset;

    if (data.chatSession) {
      const menu = button.closest('[popover]');
      if (menu) closeMenu(menu);
      selectSession(root, data.chatSession === 'active', button);
    } else if (data.chatSeat || data.chatRecipient) {
      chooseRecipient(stage, button);
    } else if (data.chatSlot) {
      chooseSlot(stage, button);
    } else if ('chatThink' in data) {
      const think = button.getAttribute('aria-pressed') !== 'true';
      button.setAttribute('aria-pressed', String(think));
      button.querySelector('[data-chat-mode-label]').textContent = think ? 'Think' : 'Balanced';
      button.title = think ? 'Think mode' : 'Balanced mode';
      announce(stage, think ? 'Think mode on' : 'Balanced mode');
    } else if (data.chatAttach || data.chatRemove) {
      const entry = input.form.querySelector('[data-chat-attachment="' + (data.chatAttach ?? data.chatRemove) + '"]');
      entry.hidden = data.chatRemove ? true : !entry.hidden;
      syncAttachments(root, input.form);
      if (data.chatRemove) input.focus();
    } else if (data.chatPrompt) {
      const menu = button.closest('[popover]');
      if (menu) closeMenu(menu);
      const panels = panelState.get(root);
      if (panels?.railMobile) setPanel(root, 'rail', false, false);
      input.value = data.chatPrompt;
      syncInput(input);
      input.focus();
    } else if ('chatDockToggle' in data || 'chatDockClose' in data) {
      toggleDock(root, !stage.open);
    } else if (data.chatPanelToggle || data.chatPanelClose) {
      const panel = data.chatPanelToggle ?? data.chatPanelClose;
      setPanel(root, panel, Boolean(data.chatPanelToggle && button.getAttribute('aria-expanded') !== 'true'));
    } else if (data.chatInspect) {
      setPanel(root, 'inspector', true);
      document.getElementById(data.chatInspect).scrollIntoView({ block: 'nearest' });
    } else if (data.chatWorkspaceMode) {
      const workspaceMode = data.chatWorkspaceMode === 'workspace';
      root.querySelectorAll('[data-chat-workspace-mode]').forEach((choice) => {
        choice.setAttribute('aria-pressed', String(choice === button));
      });
      root.querySelector('[data-chat-workspace-context]').hidden = !workspaceMode;
      root.querySelector('[data-chat-panel-toggle="inspector"]').hidden = !workspaceMode;
      if (!workspaceMode) setPanel(root, 'inspector', false, false);
    } else if (data.chatDialogOpen) {
      button.focus();
      document.getElementById(data.chatDialogOpen).showModal();
    } else if ('chatDialogClose' in data) {
      button.closest('dialog').close();
    } else if (data.chatApprovalResult) {
      const card = button.closest('[data-chat-approval]');
      const receipt = card.querySelector('[data-chat-approval-receipt]');
      card.querySelector('[data-chat-approval-request]').hidden = true;
      receipt.hidden = false;
      receipt.textContent = data.chatApprovalResult + ' in this preview.';
      receipt.focus();
    } else if ('chatRetry' in data) {
      const turn = button.closest('article');
      let previous = turn.previousElementSibling;
      while (previous && !previous.matches('.vi-chat-turn--user')) previous = previous.previousElementSibling;
      const bubble = previous?.querySelector('.vi-chat-bubble');
      if (bubble) {
        input.value = bubble.dataset.chatUtterance ?? bubble.lastChild.textContent.trim();
        syncInput(input);
        input.focus();
        input.form.requestSubmit();
      }
    } else if ('chatCopy' in data) {
      const text = button.closest('article').querySelector('.vi-chat-prose').innerText;
      try {
        await navigator.clipboard.writeText(text);
        announce(stage, 'Reply copied');
        button.textContent = 'Copied';
      } catch {
        announce(stage, 'Clipboard unavailable');
        button.textContent = 'Copy unavailable';
      }
      window.setTimeout(() => { button.textContent = 'Copy'; }, 1600);
    }
  });
})();
