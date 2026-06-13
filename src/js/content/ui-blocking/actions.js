// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

(function(global) {
  global.DAD = global.DAD || {};
  const elementBlocking = global.DAD.ElementBlocking = global.DAD.ElementBlocking || {};
  const {
    BLOCKED_ATTRIBUTE,
    ORIGINAL_DISPLAY_ATTRIBUTE,
    ORIGINAL_DISPLAY_PRIORITY_ATTRIBUTE,
    ORIGINAL_DISABLED_ATTRIBUTE,
    ORIGINAL_ARIA_HIDDEN_ATTRIBUTE,
    AUTO_CLICK_ATTRIBUTE,
    AUTO_CLEAR_ATTRIBUTE,
    AUTO_PAUSE_MEDIA_ATTRIBUTE,
    DEFAULT_RULE_ACTION,
    ELEMENT_RULE_ACTIONS
  } = elementBlocking.constants;
  const { normalizeToken } = elementBlocking.fingerprint;
  const { matchesElementRule } = elementBlocking.matcher;

  const clickedRuleKeys = new Set();
  const clearedRuleKeys = new Set();
  const pausedMediaRuleKeys = new Set();
  const CLEARABLE_INPUT_TYPES = new Set([
    'date',
    'datetime-local',
    'email',
    'month',
    'number',
    'password',
    'search',
    'tel',
    'text',
    'time',
    'url',
    'week'
  ]);

  function hideElement(element) {
    if (!element.hasAttribute(BLOCKED_ATTRIBUTE)) {
      element.setAttribute(ORIGINAL_DISPLAY_ATTRIBUTE, element.style.getPropertyValue('display'));
      element.setAttribute(ORIGINAL_DISPLAY_PRIORITY_ATTRIBUTE, element.style.getPropertyPriority('display'));
      element.setAttribute(ORIGINAL_ARIA_HIDDEN_ATTRIBUTE, element.getAttribute('aria-hidden') || '');

      if ('disabled' in element) {
        element.setAttribute(ORIGINAL_DISABLED_ATTRIBUTE, element.disabled ? 'true' : 'false');
      }
    }

    element.setAttribute(BLOCKED_ATTRIBUTE, 'true');
    element.setAttribute('aria-hidden', 'true');
    element.style.setProperty('display', 'none', 'important');

    if ('disabled' in element) {
      element.disabled = true;
    }
  }

  function restoreElement(element) {
    const originalDisplay = element.getAttribute(ORIGINAL_DISPLAY_ATTRIBUTE) || '';
    const originalDisplayPriority = element.getAttribute(ORIGINAL_DISPLAY_PRIORITY_ATTRIBUTE) || '';
    const originalAriaHidden = element.getAttribute(ORIGINAL_ARIA_HIDDEN_ATTRIBUTE) || '';
    const originalDisabled = element.getAttribute(ORIGINAL_DISABLED_ATTRIBUTE);

    element.removeAttribute(BLOCKED_ATTRIBUTE);

    if (originalDisplay) {
      element.style.setProperty('display', originalDisplay, originalDisplayPriority);
    } else {
      element.style.removeProperty('display');
    }

    if (originalAriaHidden) {
      element.setAttribute('aria-hidden', originalAriaHidden);
    } else {
      element.removeAttribute('aria-hidden');
    }

    if ('disabled' in element && originalDisabled !== null) {
      element.disabled = originalDisabled === 'true';
    }

    element.removeAttribute(ORIGINAL_DISPLAY_ATTRIBUTE);
    element.removeAttribute(ORIGINAL_DISPLAY_PRIORITY_ATTRIBUTE);
    element.removeAttribute(ORIGINAL_DISABLED_ATTRIBUTE);
    element.removeAttribute(ORIGINAL_ARIA_HIDDEN_ATTRIBUTE);
  }

  function resetElementBlocks() {
    document.querySelectorAll(`[${BLOCKED_ATTRIBUTE}="true"]`).forEach(restoreElement);
  }

  function ruleAppliesToCurrentUrl(rule) {
    const normalizedUrl = global.DAD.normalizeUrl(location.href);
    const rulePattern = normalizeToken(rule.urlPattern);

    return rulePattern && normalizedUrl.includes(rulePattern);
  }

  function getRuleAction(rule) {
    return Object.values(ELEMENT_RULE_ACTIONS).includes(rule.action)
      ? rule.action
      : DEFAULT_RULE_ACTION;
  }

  function getAutoClickKey(rule) {
    return `${rule.id || 'unknown'}:${location.href}`;
  }

  function getAutoClearKey(rule) {
    return `${rule.id || 'unknown'}:${location.href}`;
  }

  function getAutoPauseMediaKey(rule) {
    return `${rule.id || 'unknown'}:${location.href}`;
  }

  function isAutoClickableElement(element) {
    if (!element || typeof element.click !== 'function') {
      return false;
    }

    if (element.disabled === true || element.getAttribute?.('aria-disabled') === 'true') {
      return false;
    }

    const rect = element.getBoundingClientRect?.();
    if (rect && (rect.width <= 0 || rect.height <= 0)) {
      return false;
    }

    return true;
  }

  function clickElementOnce(element, rule) {
    if (!isAutoClickableElement(element)) {
      return false;
    }

    const clickKey = getAutoClickKey(rule);
    if (clickedRuleKeys.has(clickKey)) {
      return false;
    }

    clickedRuleKeys.add(clickKey);
    element.setAttribute(AUTO_CLICK_ATTRIBUTE, rule.id || 'true');
    element.click();
    return true;
  }

  function isVisibleElement(element) {
    const rect = element.getBoundingClientRect?.();
    return !(rect && (rect.width <= 0 || rect.height <= 0));
  }

  function isClearableField(element) {
    const tagName = String(element?.tagName || '').toLowerCase();
    if (!element || element.disabled === true || element.readOnly === true || element.getAttribute?.('aria-disabled') === 'true') {
      return false;
    }

    if (!isVisibleElement(element)) {
      return false;
    }

    if (tagName === 'textarea') {
      return true;
    }

    if (tagName === 'input') {
      const inputType = String(element.type || 'text').toLowerCase();
      return CLEARABLE_INPUT_TYPES.has(inputType);
    }

    return element.isContentEditable === true || element.getAttribute?.('contenteditable') === 'true';
  }

  function dispatchFieldMutationEvents(element) {
    ['input', 'change'].forEach(eventName => {
      element.dispatchEvent?.(new Event(eventName, { bubbles: true }));
    });
  }

  function clearFieldElementOnce(element, rule) {
    if (!isClearableField(element)) {
      return false;
    }

    const clearKey = getAutoClearKey(rule);
    if (clearedRuleKeys.has(clearKey)) {
      return false;
    }

    const isEditableElement = element.isContentEditable === true || element.getAttribute?.('contenteditable') === 'true';
    const currentValue = isEditableElement ? String(element.textContent || '') : String(element.value || '');
    if (currentValue.length === 0) {
      return false;
    }

    clearedRuleKeys.add(clearKey);
    element.setAttribute(AUTO_CLEAR_ATTRIBUTE, rule.id || 'true');

    if (isEditableElement) {
      element.textContent = '';
    } else {
      element.value = '';
    }

    dispatchFieldMutationEvents(element);
    return true;
  }

  function isMediaElement(element) {
    const tagName = String(element?.tagName || '').toLowerCase();
    return tagName === 'audio' || tagName === 'video';
  }

  function getPauseableMediaElements(element) {
    const mediaElements = [];

    if (isMediaElement(element)) {
      mediaElements.push(element);
    }

    if (typeof element?.querySelectorAll === 'function') {
      mediaElements.push(...Array.from(element.querySelectorAll('audio, video')));
    }

    return Array.from(new Set(mediaElements)).filter(media => typeof media.pause === 'function');
  }

  function pauseMediaElement(media, rule) {
    if (media.paused === true) {
      return false;
    }

    try {
      media.pause();
      media.setAttribute?.(AUTO_PAUSE_MEDIA_ATTRIBUTE, rule.id || 'true');
      return true;
    } catch (error) {
      return false;
    }
  }

  function pauseMediaOnce(element, rule) {
    const pauseKey = getAutoPauseMediaKey(rule);
    if (pausedMediaRuleKeys.has(pauseKey)) {
      return false;
    }

    const pausedCount = getPauseableMediaElements(element)
      .reduce((count, media) => count + (pauseMediaElement(media, rule) ? 1 : 0), 0);

    if (pausedCount === 0) {
      return false;
    }

    pausedMediaRuleKeys.add(pauseKey);
    return true;
  }

  function applyRuleToElement(element, rule) {
    if (getRuleAction(rule) === ELEMENT_RULE_ACTIONS.CLICK) {
      return clickElementOnce(element, rule);
    }

    if (getRuleAction(rule) === ELEMENT_RULE_ACTIONS.CLEAR) {
      return clearFieldElementOnce(element, rule);
    }

    if (getRuleAction(rule) === ELEMENT_RULE_ACTIONS.PAUSE_MEDIA) {
      return pauseMediaOnce(element, rule);
    }

    hideElement(element);
    return true;
  }

  function applyElementRules(rules) {
    const activeRules = (rules || []).filter(rule => {
      return rule.enabled !== false && ruleAppliesToCurrentUrl(rule);
    });

    if (activeRules.length === 0 || !document.body) {
      return;
    }

    const candidates = Array.from(document.body.querySelectorAll('*'));
    activeRules.forEach(rule => {
      const action = getRuleAction(rule);
      for (const element of candidates) {
        if (matchesElementRule(element, rule)) {
          const didApply = applyRuleToElement(element, rule);
          if (
            (
              action === ELEMENT_RULE_ACTIONS.CLICK
              || action === ELEMENT_RULE_ACTIONS.CLEAR
              || action === ELEMENT_RULE_ACTIONS.PAUSE_MEDIA
            )
            && didApply
          ) {
            break;
          }
        }
      }
    });
  }

  elementBlocking.actions = {
    applyElementRules,
    hideElement,
    resetElementBlocks,
    restoreElement
  };
})(window);
