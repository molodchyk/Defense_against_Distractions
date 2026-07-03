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
    ORIGINAL_ARIA_DISABLED_ATTRIBUTE,
    ORIGINAL_TAB_INDEX_ATTRIBUTE,
    ORIGINAL_POINTER_EVENTS_ATTRIBUTE,
    ORIGINAL_POINTER_EVENTS_PRIORITY_ATTRIBUTE,
    ORIGINAL_CONTENT_EDITABLE_ATTRIBUTE
  } = elementBlocking.constants;

  function rememberElementState(element) {
    if (element.hasAttribute(BLOCKED_ATTRIBUTE)) {
      return;
    }

    element.setAttribute(ORIGINAL_DISPLAY_ATTRIBUTE, element.style.getPropertyValue('display'));
    element.setAttribute(ORIGINAL_DISPLAY_PRIORITY_ATTRIBUTE, element.style.getPropertyPriority('display'));
    element.setAttribute(ORIGINAL_ARIA_HIDDEN_ATTRIBUTE, element.getAttribute('aria-hidden') || '');
    element.setAttribute(ORIGINAL_ARIA_DISABLED_ATTRIBUTE, element.getAttribute('aria-disabled') || '');
    element.setAttribute(ORIGINAL_TAB_INDEX_ATTRIBUTE, element.getAttribute('tabindex') || '');
    element.setAttribute(ORIGINAL_POINTER_EVENTS_ATTRIBUTE, element.style.getPropertyValue('pointer-events'));
    element.setAttribute(ORIGINAL_POINTER_EVENTS_PRIORITY_ATTRIBUTE, element.style.getPropertyPriority('pointer-events'));
    element.setAttribute(ORIGINAL_CONTENT_EDITABLE_ATTRIBUTE, element.getAttribute('contenteditable') || '');

    if ('disabled' in element) {
      element.setAttribute(ORIGINAL_DISABLED_ATTRIBUTE, element.disabled ? 'true' : 'false');
    }

    element.setAttribute(BLOCKED_ATTRIBUTE, 'true');
  }

  function hideElement(element) {
    rememberElementState(element);
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
    const originalAriaDisabled = element.getAttribute(ORIGINAL_ARIA_DISABLED_ATTRIBUTE) || '';
    const originalTabIndex = element.getAttribute(ORIGINAL_TAB_INDEX_ATTRIBUTE) || '';
    const originalPointerEvents = element.getAttribute(ORIGINAL_POINTER_EVENTS_ATTRIBUTE) || '';
    const originalPointerEventsPriority = element.getAttribute(ORIGINAL_POINTER_EVENTS_PRIORITY_ATTRIBUTE) || '';
    const originalContentEditable = element.getAttribute(ORIGINAL_CONTENT_EDITABLE_ATTRIBUTE) || '';
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

    if (originalAriaDisabled) {
      element.setAttribute('aria-disabled', originalAriaDisabled);
    } else {
      element.removeAttribute('aria-disabled');
    }

    if (originalTabIndex) {
      element.setAttribute('tabindex', originalTabIndex);
    } else {
      element.removeAttribute('tabindex');
    }

    if (originalPointerEvents) {
      element.style.setProperty('pointer-events', originalPointerEvents, originalPointerEventsPriority);
    } else {
      element.style.removeProperty('pointer-events');
    }

    if (originalContentEditable) {
      element.setAttribute('contenteditable', originalContentEditable);
    } else {
      element.removeAttribute('contenteditable');
    }

    if ('disabled' in element && originalDisabled !== null) {
      element.disabled = originalDisabled === 'true';
    }

    element.removeAttribute(ORIGINAL_DISPLAY_ATTRIBUTE);
    element.removeAttribute(ORIGINAL_DISPLAY_PRIORITY_ATTRIBUTE);
    element.removeAttribute(ORIGINAL_DISABLED_ATTRIBUTE);
    element.removeAttribute(ORIGINAL_ARIA_HIDDEN_ATTRIBUTE);
    element.removeAttribute(ORIGINAL_ARIA_DISABLED_ATTRIBUTE);
    element.removeAttribute(ORIGINAL_TAB_INDEX_ATTRIBUTE);
    element.removeAttribute(ORIGINAL_POINTER_EVENTS_ATTRIBUTE);
    element.removeAttribute(ORIGINAL_POINTER_EVENTS_PRIORITY_ATTRIBUTE);
    element.removeAttribute(ORIGINAL_CONTENT_EDITABLE_ATTRIBUTE);
  }

  function resetElementBlocks() {
    document.querySelectorAll(`[${BLOCKED_ATTRIBUTE}="true"]`).forEach(restoreElement);
  }

  elementBlocking.elementState = {
    hideElement,
    rememberElementState,
    resetElementBlocks,
    restoreElement
  };
})(window);
