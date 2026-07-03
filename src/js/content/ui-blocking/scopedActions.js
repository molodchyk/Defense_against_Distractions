// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

(function(global) {
  global.DAD = global.DAD || {};
  const elementBlocking = global.DAD.ElementBlocking = global.DAD.ElementBlocking || {};

  const SCOPED_ACTION_ELEMENT_LIMIT = 80;
  const IMAGE_ELEMENT_SELECTOR = 'img, picture, svg, canvas, [role="img"], [style*="background-image"]';
  const INTERACTIVE_CONTROL_SELECTOR = [
    'button',
    'input',
    'select',
    'textarea',
    'option',
    'optgroup',
    'summary',
    'a[href]',
    '[role="button"]',
    '[role="link"]',
    '[role="checkbox"]',
    '[role="menuitem"]',
    '[role="option"]',
    '[role="radio"]',
    '[role="switch"]',
    '[role="tab"]',
    '[contenteditable=""]',
    '[contenteditable="true"]',
    '[contenteditable="plaintext-only"]'
  ].join(', ');

  function elementMatchesSelector(element, selector) {
    try {
      return typeof element?.matches === 'function' && element.matches(selector);
    } catch (error) {
      return false;
    }
  }

  function getScopedActionElements(element, selector) {
    const scopedElements = [];

    if (elementMatchesSelector(element, selector)) {
      scopedElements.push(element);
    }

    if (typeof element?.querySelectorAll === 'function') {
      scopedElements.push(...Array.from(element.querySelectorAll(selector)));
    }

    return Array.from(new Set(scopedElements)).slice(0, SCOPED_ACTION_ELEMENT_LIMIT);
  }

  function hideImagesInScope(element, hideElement) {
    const imageElements = getScopedActionElements(element, IMAGE_ELEMENT_SELECTOR);
    imageElements.forEach(hideElement);
    return imageElements.length > 0;
  }

  function disableControlElement(element, rememberElementState) {
    rememberElementState(element);

    if ('disabled' in element) {
      element.disabled = true;
    }

    element.setAttribute('aria-disabled', 'true');
    element.setAttribute('tabindex', '-1');
    element.style.setProperty('pointer-events', 'none', 'important');

    const contentEditableAttribute = element.getAttribute?.('contenteditable');
    if (
      element.isContentEditable === true
      || (
        contentEditableAttribute !== null
        && ['true', 'plaintext-only', ''].includes(String(contentEditableAttribute).toLowerCase())
      )
    ) {
      element.setAttribute('contenteditable', 'false');
    }

    return true;
  }

  function disableControlsInScope(element, rememberElementState) {
    const controlElements = getScopedActionElements(element, INTERACTIVE_CONTROL_SELECTOR);
    controlElements.forEach(controlElement => disableControlElement(controlElement, rememberElementState));
    return controlElements.length > 0;
  }

  elementBlocking.scopedActions = {
    disableControlsInScope,
    hideImagesInScope
  };
})(window);
