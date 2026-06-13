// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

(function(global) {
  global.DAD = global.DAD || {};
  const intent = global.DAD.IntentIntervention = global.DAD.IntentIntervention || {};

  const REDUCED_ATTRIBUTE = 'data-dad-intent-reduced';
  const REDUCTION_STYLE_ID = 'dad-intent-element-reduction-style';
  const MAX_REDUCED_ELEMENTS = 36;
  const NOISE_SELECTORS = [
    '[role="feed"]',
    '[aria-label*="feed" i]',
    '[aria-label*="recommend" i]',
    '[aria-label*="related" i]',
    '[aria-label*="suggest" i]',
    '[aria-label*="up next" i]',
    '[aria-label*="comments" i]',
    '[id*="feed" i]',
    '[id*="recommend" i]',
    '[id*="related" i]',
    '[id*="suggest" i]',
    '[id*="up-next" i]',
    '[id*="comments" i]',
    '[id*="shorts" i]',
    '[id*="reels" i]',
    '[class*="feed" i]',
    '[class*="recommend" i]',
    '[class*="related" i]',
    '[class*="suggest" i]',
    '[class*="up-next" i]',
    '[class*="comments" i]',
    '[class*="shorts" i]',
    '[class*="reels" i]',
    '[class*="trending" i]',
    '[data-testid*="feed" i]',
    '[data-testid*="recommend" i]',
    '[data-testid*="related" i]',
    '[data-testid*="comments" i]'
  ];

  function installReductionStyle() {
    if (global.document.getElementById(REDUCTION_STYLE_ID)) {
      return;
    }

    const style = global.document.createElement('style');
    style.id = REDUCTION_STYLE_ID;
    style.textContent = `
      [${REDUCED_ATTRIBUTE}="true"] {
        display: none !important;
      }
    `;
    global.document.documentElement.appendChild(style);
  }

  function isReducibleElement(element) {
    if (!element || !element.matches || !element.isConnected) {
      return false;
    }

    if (['HTML', 'BODY', 'HEAD', 'SCRIPT', 'STYLE', 'NOSCRIPT'].includes(element.tagName)) {
      return false;
    }

    if (element.closest?.(`#${intent.constants?.PROMPT_ID || 'dad-intent-prompt'}, #dad-block-overlay, #dad-element-picker-panel`)) {
      return false;
    }

    const rect = element.getBoundingClientRect?.();
    if (!rect || rect.width <= 0 || rect.height <= 0) {
      return false;
    }

    const viewportArea = Math.max(1, Number(global.innerWidth || 0) * Number(global.innerHeight || 0));
    const elementArea = rect.width * rect.height;
    return elementArea <= viewportArea * 1.2;
  }

  function getReducibleElements() {
    const elements = new Set();
    NOISE_SELECTORS.forEach(selector => {
      try {
        global.document.querySelectorAll(selector).forEach(element => {
          if (isReducibleElement(element)) {
            elements.add(element);
          }
        });
      } catch {
        // A selector failure should not block the rest of the intervention.
      }
    });

    return Array.from(elements).slice(0, MAX_REDUCED_ELEMENTS);
  }

  function applyElementReduction() {
    installReductionStyle();
    const elements = getReducibleElements();
    elements.forEach(element => element.setAttribute(REDUCED_ATTRIBUTE, 'true'));
    return elements.length;
  }

  function clearElementReduction() {
    global.document
      .querySelectorAll(`[${REDUCED_ATTRIBUTE}="true"]`)
      .forEach(element => element.removeAttribute(REDUCED_ATTRIBUTE));
  }

  intent.elementReduction = {
    applyElementReduction,
    clearElementReduction
  };
})(window);
