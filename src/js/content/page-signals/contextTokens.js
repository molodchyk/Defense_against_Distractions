// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

(function(global) {
  global.DAD = global.DAD || {};

  const CONTEXT_TEXT_LIMIT = 1000;
  const CONTEXT_TOKEN_LIMIT = 12;
  const CONTEXT_STOP_WORDS = new Set([
    'about',
    'and',
    'are',
    'das',
    'der',
    'die',
    'for',
    'from',
    'how',
    'mit',
    'not',
    'oder',
    'that',
    'the',
    'this',
    'und',
    'was',
    'what',
    'with',
    'you'
  ]);

  function extractContextTokens(text, tokenLimit = CONTEXT_TOKEN_LIMIT) {
    const tokenStats = new Map();

    String(text || '')
      .slice(0, CONTEXT_TEXT_LIMIT)
      .toLowerCase()
      .split(/[^\p{L}\p{N}_]+/u)
      .map(token => token.replace(/^[_-]+|[_-]+$/g, ''))
      .filter(token => token.length >= 3 && !CONTEXT_STOP_WORDS.has(token))
      .forEach(token => {
        const current = tokenStats.get(token) || { token, count: 0, firstIndex: tokenStats.size };
        current.count += 1;
        tokenStats.set(token, current);
      });

    return Array.from(tokenStats.values())
      .sort((first, second) => second.count - first.count || first.firstIndex - second.firstIndex)
      .slice(0, tokenLimit)
      .map(item => item.token);
  }

  function getElementText(element) {
    if (!element) {
      return '';
    }

    const values = [
      element.innerText,
      element.textContent,
      element.getAttribute?.('aria-label'),
      element.getAttribute?.('title')
    ];

    return values.filter(Boolean).join(' ').replace(/\s+/g, ' ').trim().slice(0, CONTEXT_TEXT_LIMIT);
  }

  function getClickedLinkTokens(target) {
    const element = target?.nodeType === Node.ELEMENT_NODE ? target : target?.parentElement;
    const anchor = element?.closest?.('a[href]');
    return extractContextTokens(getElementText(anchor));
  }

  function getSelectedTextTokens() {
    const selection = global.document.getSelection?.() || global.getSelection?.();
    if (!selection || selection.isCollapsed) {
      return [];
    }

    const selectedText = String(selection.toString?.() || '').replace(/\s+/g, ' ').trim();
    return extractContextTokens(selectedText);
  }

  global.DAD.PageSignalContextTokens = {
    extractContextTokens,
    getClickedLinkTokens,
    getSelectedTextTokens
  };
})(window);
