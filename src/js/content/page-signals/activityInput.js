// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

(function(global) {
  global.DAD = global.DAD || {};

  const NON_TEXT_INPUT_TYPES = new Set([
    'button',
    'checkbox',
    'color',
    'file',
    'hidden',
    'image',
    'radio',
    'range',
    'reset',
    'submit'
  ]);

  let keyEvents = 0;
  let inputEvents = 0;
  let activeInputMs = 0;
  let activeInputStartedAt = null;

  function isPageVisible() {
    return global.document.visibilityState !== 'hidden';
  }

  function isDisabledOrReadonly(element) {
    return element?.disabled === true || element?.readOnly === true;
  }

  function isEditableElement(element) {
    if (!element || element.nodeType !== global.Node?.ELEMENT_NODE) {
      return false;
    }

    const tagName = String(element.tagName || '').toUpperCase();
    if (tagName === 'TEXTAREA') {
      return !isDisabledOrReadonly(element);
    }

    if (tagName === 'INPUT') {
      const type = String(element.getAttribute?.('type') || element.type || 'text').toLowerCase();
      return !NON_TEXT_INPUT_TYPES.has(type) && !isDisabledOrReadonly(element);
    }

    if (element.isContentEditable === true) {
      return true;
    }

    const contentEditable = String(element.getAttribute?.('contenteditable') || '').toLowerCase();
    return Boolean(contentEditable) && contentEditable !== 'false';
  }

  function getEditableTarget(target) {
    let current = target;
    while (current && current !== global.document) {
      if (isEditableElement(current)) {
        return current;
      }
      current = current.parentElement;
    }

    return null;
  }

  function refreshActiveInputTime(nextHasActiveInput) {
    const now = Date.now();
    if (activeInputStartedAt !== null) {
      activeInputMs += Math.max(0, now - activeInputStartedAt);
    }

    activeInputStartedAt = nextHasActiveInput && isPageVisible() ? now : null;
  }

  function recordEditableActivity(target) {
    if (!getEditableTarget(target) || !isPageVisible()) {
      return false;
    }

    if (activeInputStartedAt === null) {
      activeInputStartedAt = Date.now();
    }
    return true;
  }

  function getActiveInputMs() {
    const currentActiveMs = activeInputStartedAt !== null && isPageVisible()
      ? Date.now() - activeInputStartedAt
      : 0;
    return Math.max(0, activeInputMs + currentActiveMs);
  }

  function updateActiveInputTime() {
    refreshActiveInputTime(Boolean(getEditableTarget(global.document.activeElement)));
  }

  function getInputActivitySignals() {
    return {
      keyEvents,
      inputEvents,
      activeInputMs: Math.round(getActiveInputMs())
    };
  }

  function resetInputActivity() {
    keyEvents = 0;
    inputEvents = 0;
    activeInputMs = 0;
    activeInputStartedAt = getEditableTarget(global.document.activeElement) && isPageVisible()
      ? Date.now()
      : null;
  }

  function installInputActivityListeners(schedulePageSignalReport) {
    global.addEventListener('keydown', event => {
      keyEvents += 1;
      recordEditableActivity(event.target);
      schedulePageSignalReport();
    }, { passive: true });

    global.addEventListener('input', event => {
      inputEvents += 1;
      recordEditableActivity(event.target);
      schedulePageSignalReport();
    }, { passive: true });

    global.document.addEventListener('focusin', event => {
      if (recordEditableActivity(event.target)) {
        schedulePageSignalReport();
      }
    }, true);

    global.document.addEventListener('focusout', event => {
      if (getEditableTarget(event.target) || activeInputStartedAt !== null) {
        refreshActiveInputTime(false);
        schedulePageSignalReport();
      }
    }, true);
  }

  global.DAD.PageSignalInputActivity = {
    getInputActivitySignals,
    installInputActivityListeners,
    resetInputActivity,
    updateActiveInputTime
  };
})(window);
