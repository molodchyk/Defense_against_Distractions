// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

(function(global) {
  global.DAD = global.DAD || {};
  const intent = global.DAD.IntentIntervention = global.DAD.IntentIntervention || {};
  const {
    PROMPT_ID
  } = intent.constants;
  const {
    getIntentMessage
  } = intent.messages;

  let active = false;
  let listenersInstalled = false;
  let suppressedCount = 0;

  function getEventElement(event) {
    const target = event?.target;
    if (!target) {
      return null;
    }

    return target.nodeType === Node.ELEMENT_NODE ? target : target.parentElement;
  }

  function getAnchor(event) {
    const element = getEventElement(event);
    return element?.closest?.('a[href]') || null;
  }

  function isPromptAnchor(anchor) {
    return Boolean(anchor?.closest?.(`#${PROMPT_ID}`));
  }

  function hasNewTabTarget(anchor) {
    const target = String(anchor?.getAttribute?.('target') || '').trim().toLowerCase();
    return Boolean(target && target !== '_self');
  }

  function isNewTabMouseGesture(event, anchor) {
    if (event.type === 'auxclick' && event.button === 1) {
      return true;
    }

    if (event.type !== 'click') {
      return false;
    }

    return Boolean(event.ctrlKey || event.metaKey || event.shiftKey || hasNewTabTarget(anchor));
  }

  function isNewTabKeyboardGesture(event, anchor) {
    if (event.type !== 'keydown' || event.key !== 'Enter') {
      return false;
    }

    return Boolean(event.ctrlKey || event.metaKey || event.shiftKey || hasNewTabTarget(anchor));
  }

  function updatePromptSummary() {
    const prompt = global.document.getElementById(PROMPT_ID);
    const summary = prompt?.querySelector('[data-dad-intent-summary]');
    if (summary) {
      summary.textContent = getIntentMessage('intentPromptNewTabsFrozen');
    }
  }

  function maybeSuppressNewTab(event) {
    if (!active) {
      return;
    }

    const anchor = getAnchor(event);
    if (!anchor || isPromptAnchor(anchor)) {
      return;
    }

    if (!isNewTabMouseGesture(event, anchor) && !isNewTabKeyboardGesture(event, anchor)) {
      return;
    }

    suppressedCount += 1;
    event.preventDefault();
    event.stopImmediatePropagation();
    updatePromptSummary();
  }

  function installListeners() {
    if (listenersInstalled) {
      return;
    }

    global.document.addEventListener('click', maybeSuppressNewTab, true);
    global.document.addEventListener('auxclick', maybeSuppressNewTab, true);
    global.document.addEventListener('keydown', maybeSuppressNewTab, true);
    listenersInstalled = true;
  }

  function applyNewTabFreeze(decision = {}) {
    if (!decision.freezeNewTabs) {
      clearNewTabFreeze();
      return;
    }

    installListeners();
    active = true;
  }

  function clearNewTabFreeze() {
    active = false;
  }

  function getNewTabFreezeState() {
    return {
      active,
      suppressedCount
    };
  }

  intent.newTabFreeze = {
    applyNewTabFreeze,
    clearNewTabFreeze,
    getNewTabFreezeState
  };
})(window);
