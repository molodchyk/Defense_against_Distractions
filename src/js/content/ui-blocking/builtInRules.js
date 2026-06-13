// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

(function(global) {
  global.DAD = global.DAD || {};
  const elementBlocking = global.DAD.ElementBlocking = global.DAD.ElementBlocking || {};

  const BUILT_IN_BLOCKED_ATTRIBUTE = 'data-dad-built-in-ui-blocked';
  const ORIGINAL_DISPLAY_ATTRIBUTE = 'data-dad-built-in-original-display';
  const ORIGINAL_DISPLAY_PRIORITY_ATTRIBUTE = 'data-dad-built-in-original-display-priority';
  const ORIGINAL_ARIA_HIDDEN_ATTRIBUTE = 'data-dad-built-in-original-aria-hidden';
  const ORIGINAL_DISABLED_ATTRIBUTE = 'data-dad-built-in-original-disabled';
  const ACTION_LABELS = new Set([
    'bad response',
    'copy',
    'copy message',
    'dislike',
    'good response',
    'like',
    'more',
    'more actions',
    'report',
    'report content',
    'share',
    'share message',
    'thumbs down',
    'thumbs up'
  ]);
  const ACTION_TEST_ID_PARTS = [
    'bad-response-turn-action',
    'copy-turn-action',
    'good-response-turn-action',
    'more-actions',
    'report',
    'share-turn-action'
  ];

  let builtInRuleObserver = null;

  function normalizeText(value) {
    return String(value || '').toLowerCase().replace(/\s+/g, ' ').trim();
  }

  function getHostname() {
    return normalizeText(global.location?.hostname);
  }

  function isChatGptHost(hostname = getHostname()) {
    const normalized = normalizeText(hostname);
    return normalized === 'chatgpt.com'
      || normalized.endsWith('.chatgpt.com')
      || normalized === 'chat.openai.com';
  }

  function getElementLabel(element) {
    return normalizeText([
      element?.getAttribute?.('aria-label'),
      element?.getAttribute?.('title'),
      element?.textContent
    ].filter(Boolean).join(' '));
  }

  function getElementTestId(element) {
    return normalizeText(element?.getAttribute?.('data-testid') || element?.dataset?.testid);
  }

  function isActionLabel(label) {
    return ACTION_LABELS.has(normalizeText(label));
  }

  function isActionTestId(testId) {
    const normalized = normalizeText(testId);
    return ACTION_TEST_ID_PARTS.some(part => normalized.includes(part));
  }

  function isMessageScoped(element) {
    return Boolean(element?.closest?.([
      'article',
      '[data-message-author-role]',
      '[data-testid*="conversation-turn"]',
      '[data-testid*="message"]'
    ].join(',')));
  }

  function isControlElement(element) {
    return Boolean(element?.matches?.('button, [role="button"], [data-testid], [aria-label], [title]'));
  }

  function isChatGptMessageActionControl(element, hostname = getHostname()) {
    if (!isChatGptHost(hostname) || !isControlElement(element) || !isMessageScoped(element)) {
      return false;
    }

    return isActionTestId(getElementTestId(element)) || isActionLabel(getElementLabel(element));
  }

  function rememberElementStyle(element) {
    if (element.hasAttribute(BUILT_IN_BLOCKED_ATTRIBUTE)) {
      return;
    }

    element.setAttribute(ORIGINAL_DISPLAY_ATTRIBUTE, element.style.getPropertyValue('display'));
    element.setAttribute(ORIGINAL_DISPLAY_PRIORITY_ATTRIBUTE, element.style.getPropertyPriority('display'));
    element.setAttribute(ORIGINAL_ARIA_HIDDEN_ATTRIBUTE, element.getAttribute('aria-hidden') || '');

    if ('disabled' in element) {
      element.setAttribute(ORIGINAL_DISABLED_ATTRIBUTE, element.disabled ? 'true' : 'false');
    }
  }

  function hideBuiltInElement(element) {
    rememberElementStyle(element);
    element.setAttribute(BUILT_IN_BLOCKED_ATTRIBUTE, 'chatgpt-message-action');
    element.setAttribute('aria-hidden', 'true');
    element.style.setProperty('display', 'none', 'important');

    if ('disabled' in element) {
      element.disabled = true;
    }
  }

  function restoreBuiltInElement(element) {
    const display = element.getAttribute(ORIGINAL_DISPLAY_ATTRIBUTE) || '';
    const displayPriority = element.getAttribute(ORIGINAL_DISPLAY_PRIORITY_ATTRIBUTE) || '';
    const ariaHidden = element.getAttribute(ORIGINAL_ARIA_HIDDEN_ATTRIBUTE) || '';
    const disabled = element.getAttribute(ORIGINAL_DISABLED_ATTRIBUTE);

    if (display) {
      element.style.setProperty('display', display, displayPriority);
    } else {
      element.style.removeProperty('display');
    }

    if (ariaHidden) {
      element.setAttribute('aria-hidden', ariaHidden);
    } else {
      element.removeAttribute('aria-hidden');
    }

    if ('disabled' in element && disabled !== null) {
      element.disabled = disabled === 'true';
    }

    element.removeAttribute(BUILT_IN_BLOCKED_ATTRIBUTE);
    element.removeAttribute(ORIGINAL_DISPLAY_ATTRIBUTE);
    element.removeAttribute(ORIGINAL_DISPLAY_PRIORITY_ATTRIBUTE);
    element.removeAttribute(ORIGINAL_ARIA_HIDDEN_ATTRIBUTE);
    element.removeAttribute(ORIGINAL_DISABLED_ATTRIBUTE);
  }

  function resetBuiltInElementBlocks() {
    global.document?.querySelectorAll?.(`[${BUILT_IN_BLOCKED_ATTRIBUTE}]`).forEach(restoreBuiltInElement);
  }

  function getBuiltInCandidates(root = global.document) {
    return Array.from(root?.querySelectorAll?.('button, [role="button"], [data-testid], [aria-label], [title]') || []);
  }

  function applyBuiltInElementRules(root = global.document) {
    if (!isChatGptHost()) {
      resetBuiltInElementBlocks();
      return 0;
    }

    let hiddenCount = 0;
    getBuiltInCandidates(root).forEach(element => {
      if (isChatGptMessageActionControl(element)) {
        hideBuiltInElement(element);
        hiddenCount += 1;
      }
    });
    return hiddenCount;
  }

  function observeBuiltInElementRules() {
    if (builtInRuleObserver) {
      builtInRuleObserver.disconnect();
      builtInRuleObserver = null;
    }

    if (!global.document?.body || !isChatGptHost()) {
      resetBuiltInElementBlocks();
      return;
    }

    builtInRuleObserver = new global.MutationObserver(() => applyBuiltInElementRules());
    builtInRuleObserver.observe(global.document.body, { childList: true, subtree: true });
  }

  elementBlocking.builtInRules = {
    applyBuiltInElementRules,
    isActionLabel,
    isActionTestId,
    isChatGptHost,
    isChatGptMessageActionControl,
    observeBuiltInElementRules,
    resetBuiltInElementBlocks
  };
})(window);
