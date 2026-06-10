// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

(function(global) {
  global.DAD = global.DAD || {};
  const elementBlocking = global.DAD.ElementBlocking = global.DAD.ElementBlocking || {};
  const {
    PICKER_PANEL_ID,
    DEFAULT_TARGET_LEVEL
  } = elementBlocking.constants;

  function normalizeToken(value) {
    return String(value || '').trim().toLowerCase();
  }

  function normalizeNumber(value, fallback, min, max) {
    const numericValue = Number.parseInt(value, 10);
    if (Number.isNaN(numericValue)) return fallback;
    return Math.min(max, Math.max(min, numericValue));
  }

  function getImplicitRole(element) {
    const explicitRole = normalizeToken(element.getAttribute('role'));
    if (explicitRole) return explicitRole;

    const tag = element.tagName.toLowerCase();
    if (tag === 'button') return 'button';
    if (tag === 'a' && element.hasAttribute('href')) return 'link';
    if (tag === 'input') {
      const type = normalizeToken(element.getAttribute('type')) || 'text';
      if (['button', 'submit', 'reset'].includes(type)) return 'button';
      if (type === 'checkbox') return 'checkbox';
      if (type === 'radio') return 'radio';
      return 'textbox';
    }
    if (tag === 'textarea') return 'textbox';
    if (tag === 'select') return 'combobox';

    return '';
  }

  function getStableClassTokens(element) {
    return Array.from(element.classList || [])
      .map(normalizeToken)
      .filter(token => token.length >= 3 && !/\d{3,}/.test(token))
      .slice(0, 8);
  }

  function getLabelTokens(element) {
    const labelText = [
      element.getAttribute('aria-label'),
      element.getAttribute('title'),
      element.getAttribute('alt'),
      element.textContent
    ].filter(Boolean).join(' ');

    return labelText
      .toLowerCase()
      .split(/[^\p{L}\p{N}_-]+/u)
      .map(token => token.trim())
      .filter(token => token.length >= 2)
      .slice(0, 12);
  }

  function getDirectText(element) {
    return Array.from(element.childNodes || [])
      .filter(node => node.nodeType === Node.TEXT_NODE)
      .map(node => node.nodeValue)
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function hasMeaningfulDirectText(element) {
    const text = getDirectText(element);
    return text.length >= 2 && text.length <= 180;
  }

  function getChildSignature(element) {
    return Array.from(element.children || [])
      .slice(0, 8)
      .map(child => {
        const role = getImplicitRole(child);
        return role ? `${child.tagName.toLowerCase()}[${role}]` : child.tagName.toLowerCase();
      });
  }

  function getAncestorSignature(element) {
    const ancestors = [];
    let current = element.parentElement;

    while (current && ancestors.length < 4 && current !== document.body && current !== document.documentElement) {
      const role = getImplicitRole(current);
      ancestors.push(role ? `${current.tagName.toLowerCase()}[${role}]` : current.tagName.toLowerCase());
      current = current.parentElement;
    }

    return ancestors;
  }

  function getTagIndex(element) {
    if (!element.parentElement) return 0;

    return Array.from(element.parentElement.children)
      .filter(sibling => sibling.tagName === element.tagName)
      .indexOf(element);
  }

  function getPositionPath(element) {
    const path = [];
    let current = element;

    while (current && path.length < 6 && current !== document.body && current !== document.documentElement) {
      path.push(`${current.tagName.toLowerCase()}:${getTagIndex(current)}`);
      current = current.parentElement;
    }

    return path;
  }

  function createFingerprint(element) {
    return {
      tag: element.tagName.toLowerCase(),
      role: getImplicitRole(element),
      inputType: normalizeToken(element.getAttribute('type')),
      childCount: element.children.length,
      parentTag: element.parentElement?.tagName.toLowerCase() || '',
      parentRole: element.parentElement ? getImplicitRole(element.parentElement) : '',
      childSignature: getChildSignature(element),
      ancestorSignature: getAncestorSignature(element),
      classTokens: getStableClassTokens(element),
      labelTokens: getLabelTokens(element),
      directTextTokens: getDirectText(element)
        .toLowerCase()
        .split(/[^\p{L}\p{N}_-]+/u)
        .map(token => token.trim())
        .filter(token => token.length >= 2)
        .slice(0, 12),
      positionPath: getPositionPath(element),
      tagIndex: getTagIndex(element)
    };
  }

  function createRuleName(element) {
    const role = getImplicitRole(element);
    const tag = element.tagName.toLowerCase();
    const label = getLabelTokens(element).slice(0, 3).join(' ');
    const baseName = role && role !== tag ? `${role} ${tag}` : tag;
    return label ? `${baseName}: ${label}` : baseName;
  }

  function isPickableElement(element) {
    if (!element || element.nodeType !== Node.ELEMENT_NODE) return false;
    if (element === document.documentElement || element === document.body) return false;
    if (element.closest(`#${PICKER_PANEL_ID}, #dad-block-overlay`)) return false;
    return true;
  }

  function getPickTarget(element) {
    if (!isPickableElement(element)) return null;

    if (hasMeaningfulDirectText(element)) {
      return element;
    }

    const interactiveTarget = element.closest('button, a, input, textarea, select, [role]');
    if (isPickableElement(interactiveTarget)) {
      return interactiveTarget;
    }

    return element;
  }

  function getTextRangeFromPoint(clientX, clientY) {
    if (document.caretRangeFromPoint) {
      return document.caretRangeFromPoint(clientX, clientY);
    }

    if (document.caretPositionFromPoint) {
      const position = document.caretPositionFromPoint(clientX, clientY);
      if (!position) return null;

      const range = document.createRange();
      range.setStart(position.offsetNode, position.offset);
      range.collapse(true);
      return range;
    }

    return null;
  }

  function isPointInsideRect(clientX, clientY, rect, tolerance = 2) {
    return clientX >= rect.left - tolerance
      && clientX <= rect.right + tolerance
      && clientY >= rect.top - tolerance
      && clientY <= rect.bottom + tolerance;
  }

  function getTextContainerFromPoint(clientX, clientY) {
    const caretRange = getTextRangeFromPoint(clientX, clientY);
    const textNode = caretRange?.startContainer;

    if (!textNode || textNode.nodeType !== Node.TEXT_NODE || !textNode.nodeValue.trim()) {
      return null;
    }

    const parentElement = textNode.parentElement;
    if (!isPickableElement(parentElement)) return null;

    const textRange = document.createRange();
    textRange.selectNodeContents(textNode);
    const isInsideText = Array.from(textRange.getClientRects()).some(rect => {
      return isPointInsideRect(clientX, clientY, rect);
    });
    textRange.detach?.();

    return isInsideText ? parentElement : null;
  }

  function getPickTargetFromPoint(clientX, clientY, fallbackElement) {
    const pointElement = document.elementFromPoint(clientX, clientY);
    const baseElement = pointElement || fallbackElement;
    const textContainer = getTextContainerFromPoint(clientX, clientY);

    if (textContainer) {
      return textContainer;
    }

    return getPickTarget(baseElement);
  }

  function getRuleTargetElement(element, targetLevel) {
    const level = normalizeNumber(targetLevel, DEFAULT_TARGET_LEVEL, 0, 3);
    let current = element;

    for (let index = 0; index < level; index++) {
      const parent = current?.parentElement;
      if (!isPickableElement(parent)) break;
      current = parent;
    }

    return current;
  }

  function describeElement(element) {
    if (!element) return 'No element selected';

    const fingerprint = createFingerprint(element);
    const parts = [fingerprint.role, fingerprint.tag]
      .filter(Boolean)
      .filter((part, index, list) => list.indexOf(part) === index);
    const label = fingerprint.labelTokens.slice(0, 5).join(' ');

    return label ? `${parts.join(' ')} · ${label}` : parts.join(' ');
  }

  elementBlocking.fingerprint = {
    normalizeToken,
    normalizeNumber,
    getImplicitRole,
    getLabelTokens,
    getDirectText,
    createFingerprint,
    createRuleName,
    isPickableElement,
    getPickTargetFromPoint,
    getRuleTargetElement,
    describeElement
  };
})(window);
