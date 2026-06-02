// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

(function(global) {
  global.DAD = global.DAD || {};
  const contentBlocking = global.DAD.ContentBlocking = global.DAD.ContentBlocking || {};
  const {
    BLOCK_SCORE_THRESHOLD,
    DEFAULT_CONTEXT_WORDS,
    DEFAULT_CONTEXT_LENGTH
  } = contentBlocking.constants;
  const { blockPage } = contentBlocking.blocker;

  function extractContext(text, keyword, maxWords = DEFAULT_CONTEXT_WORDS, maxLength = DEFAULT_CONTEXT_LENGTH) {
    if (global.pageBlocked) return;
    const words = text.split(/\s+/);
    const keywordIndex = words.findIndex(w => w.toLowerCase().includes(keyword.toLowerCase()));

    if (keywordIndex >= 0) {
      const start = Math.max(keywordIndex - Math.floor(maxWords / 2), 0);
      const end = Math.min(start + maxWords, words.length);
      let context = words.slice(start, end).join(' ');

      if (context.length > maxLength) {
        context = context.substring(0, maxLength) + '...';
      }
      return context;
    }
    return '';
  }

  function scanTextNodes(element, calculateScore) {
    if (global.pageBlocked) return;

    let valueToSubtract = 0;
    const scanAndProcessText = (text, node) => {
      if (global.processedNodes.has(node)) return;

      global.parsedKeywords.forEach(keywordObj => {
        if (keywordObj) {
          const { keyword, operation, value } = keywordObj;
          const regex = global.DAD.createKeywordRegex(keyword);
          const matches = text.match(regex);

          if (matches && matches.length > 0) {
            matches.forEach(() => {
              const contextText = extractContext(text, keyword);
              calculateScore(operation, value, keyword, contextText);
              valueToSubtract += value;
            });
          }
        }
      });

      processTextNode(text, node);
    };

    const processTextNode = (text, node) => {
      global.setTimeout(() => {
        if (node.textContent.trim() !== text) {
          processTextNode(node.textContent.trim(), node);
        } else {
          global.processedNodes.add(node);
          global.parsedKeywords.forEach(keywordObj => {
            if (keywordObj) {
              const { keyword, operation, value } = keywordObj;
              const regex = global.DAD.createKeywordRegex(keyword);
              const matches = text.match(regex);

              if (matches && matches.length > 0) {
                matches.forEach(() => {
                  const contextText = extractContext(text, keyword);
                  if (value - valueToSubtract > 0) {
                    calculateScore(operation, value, keyword, contextText);
                    valueToSubtract -= value;
                  }
                });
              }
            }
          });
        }
      }, 1000);
    };

    const recursiveScan = node => {
      if (node.nodeType === Node.TEXT_NODE) {
        const text = node.textContent.trim();
        if (text) {
          scanAndProcessText(text, node);
        }
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        Array.from(node.childNodes).forEach(child => {
          recursiveScan(child);
        });
      }
    };

    recursiveScan(element);
  }

  function updateBadgeScore(timerRemaining = null) {
    let badgeText;
    if (timerRemaining !== null) {
      badgeText = Math.round(timerRemaining).toString();
    } else {
      badgeText = Math.round(global.pageScore).toString();
    }
    chrome.runtime.sendMessage({ action: 'updateBadge', score: badgeText });
  }

  function calculateScore(operation, value, keyword, contextText) {
    if (global.pageBlocked) return;
    if (operation === '*') {
      global.pageScore = global.pageScore === 0 ? value : global.pageScore * value;
    } else if (operation === '+') {
      global.pageScore += value;
    }
    updateBadgeScore();
    if (global.pageScore >= BLOCK_SCORE_THRESHOLD && !global.pageBlocked) {
      blockPage();
    }
  }

  function observeMutations(keywords) {
    keywords = Array.isArray(keywords) ? keywords : [];

    global.DAD.disconnectKeywordObserver();

    if (!document.body) {
      return;
    }

    global.keywordObserver = new MutationObserver(mutations => {
      mutations.forEach(mutation => {
        mutation.addedNodes.forEach(node => {
          global.parsedKeywords = keywords.map(global.DAD.parseKeyword);
          scanTextNodes(node, calculateScore);
        });
      });
    });

    const config = { childList: true, subtree: true };
    global.keywordObserver.observe(document.body, config);
  }

  contentBlocking.keywords = {
    calculateScore,
    extractContext,
    observeMutations,
    scanTextNodes,
    updateBadgeScore
  };
})(window);
