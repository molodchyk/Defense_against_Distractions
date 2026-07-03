// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

(function(global) {
  global.DAD = global.DAD || {};

  const MAX_SELECTION_SOURCE_LENGTH = 1000;
  const MAX_SELECTION_TEXT_LENGTH = 160;
  const SELECTION_TOKEN_LIMIT = 12;
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

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  function normalizeSelectionText(value) {
    return String(value || '').replace(/\s+/g, ' ').trim();
  }

  function capSelectionText(value) {
    const text = String(value || '');
    if (text.length <= MAX_SELECTION_TEXT_LENGTH) {
      return text;
    }

    return text.slice(0, MAX_SELECTION_TEXT_LENGTH).trimEnd();
  }

  function getElementFromNode(node) {
    if (!node) {
      return null;
    }

    if (node.nodeType === global.Node?.ELEMENT_NODE) {
      return node;
    }

    return node.parentElement || null;
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

  function getEditableAncestor(node) {
    let current = getElementFromNode(node);

    while (current && current !== global.document) {
      if (isEditableElement(current)) {
        return current;
      }
      current = current.parentElement;
    }

    return null;
  }

  function isSelectionInsideEditable(selection) {
    if (getEditableAncestor(selection.anchorNode) || getEditableAncestor(selection.focusNode)) {
      return true;
    }

    try {
      return Boolean(getEditableAncestor(selection.getRangeAt?.(0)?.commonAncestorContainer));
    } catch (error) {
      return false;
    }
  }

  function getSelectionTokens(normalizedText) {
    return global.DAD.PageSignalContextTokens?.extractContextTokens?.(normalizedText, SELECTION_TOKEN_LIMIT) || [];
  }

  function estimateSelectionScore({ normalizedText, tokens, insideEditable }) {
    if (tokens.length === 0) {
      return 0;
    }

    let score = 10;
    if (tokens.length === 1) {
      score = tokens[0].length >= 8 ? 20 : 12;
    } else if (tokens.length <= 3) {
      score = 28;
    } else {
      score = 36;
    }

    if (normalizedText.length >= 48) {
      score += 4;
    }

    if (/\p{N}/u.test(normalizedText)) {
      score += 4;
    }

    if (insideEditable) {
      score -= 10;
    }

    return clamp(Math.round(score), 5, 60);
  }

  function createSelectionCandidate(selection, options = {}) {
    if (!selection || selection.isCollapsed) {
      return null;
    }

    const normalizedText = normalizeSelectionText(selection.toString?.());
    if (
      normalizedText.length < 2
      || normalizedText.length > MAX_SELECTION_SOURCE_LENGTH
      || !/[\p{L}\p{N}]/u.test(normalizedText)
    ) {
      return null;
    }

    const text = capSelectionText(normalizedText);
    const tokens = getSelectionTokens(text);
    if (tokens.length === 0) {
      return null;
    }

    const insideEditable = isSelectionInsideEditable(selection);

    return {
      text,
      normalizedText: text.toLowerCase(),
      tokens,
      host: String(options.host || global.location?.hostname || ''),
      source: 'userSelection',
      insideEditable,
      selectionLength: normalizedText.length,
      estimatedScore100: estimateSelectionScore({ normalizedText, tokens, insideEditable }),
      wouldBlockCurrentPage: false
    };
  }

  function getActiveSelectionCandidate() {
    const selection = global.document.getSelection?.() || global.getSelection?.();
    return createSelectionCandidate(selection);
  }

  global.DAD.PageSignalSelectionCandidate = {
    createSelectionCandidate,
    estimateSelectionScore,
    getActiveSelectionCandidate,
    normalizeSelectionText
  };
})(window);
