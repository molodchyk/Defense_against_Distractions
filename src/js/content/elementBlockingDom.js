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
    PREVIEW_ATTRIBUTE,
    PREVIEW_DISPLAY_ATTRIBUTE,
    PREVIEW_DISPLAY_PRIORITY_ATTRIBUTE,
    PREVIEW_DISABLED_ATTRIBUTE,
    PREVIEW_ARIA_HIDDEN_ATTRIBUTE,
    PREVIEW_OUTLINE_ATTRIBUTE,
    PREVIEW_OUTLINE_PRIORITY_ATTRIBUTE,
    PREVIEW_OUTLINE_OFFSET_ATTRIBUTE,
    PREVIEW_OUTLINE_OFFSET_PRIORITY_ATTRIBUTE,
    PREVIEW_BOX_SHADOW_ATTRIBUTE,
    PREVIEW_BOX_SHADOW_PRIORITY_ATTRIBUTE,
    DEFAULT_PREVIEW_MODE
  } = elementBlocking.constants;
  const { normalizeToken } = elementBlocking.fingerprint;
  const { matchesElementRule } = elementBlocking.matcher;

  let elementRuleObserver = null;

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

  function rememberPreviewStyle(element) {
    if (element.hasAttribute(PREVIEW_ATTRIBUTE)) return;

    element.setAttribute(PREVIEW_DISPLAY_ATTRIBUTE, element.style.getPropertyValue('display'));
    element.setAttribute(PREVIEW_DISPLAY_PRIORITY_ATTRIBUTE, element.style.getPropertyPriority('display'));
    element.setAttribute(PREVIEW_ARIA_HIDDEN_ATTRIBUTE, element.getAttribute('aria-hidden') || '');
    element.setAttribute(PREVIEW_OUTLINE_ATTRIBUTE, element.style.getPropertyValue('outline'));
    element.setAttribute(PREVIEW_OUTLINE_PRIORITY_ATTRIBUTE, element.style.getPropertyPriority('outline'));
    element.setAttribute(PREVIEW_OUTLINE_OFFSET_ATTRIBUTE, element.style.getPropertyValue('outline-offset'));
    element.setAttribute(PREVIEW_OUTLINE_OFFSET_PRIORITY_ATTRIBUTE, element.style.getPropertyPriority('outline-offset'));
    element.setAttribute(PREVIEW_BOX_SHADOW_ATTRIBUTE, element.style.getPropertyValue('box-shadow'));
    element.setAttribute(PREVIEW_BOX_SHADOW_PRIORITY_ATTRIBUTE, element.style.getPropertyPriority('box-shadow'));

    if ('disabled' in element) {
      element.setAttribute(PREVIEW_DISABLED_ATTRIBUTE, element.disabled ? 'true' : 'false');
    }

    element.setAttribute(PREVIEW_ATTRIBUTE, 'true');
  }

  function hidePreviewElement(element) {
    rememberPreviewStyle(element);
    element.setAttribute('aria-hidden', 'true');
    element.style.setProperty('display', 'none', 'important');

    if ('disabled' in element) {
      element.disabled = true;
    }
  }

  function outlinePreviewElement(element) {
    rememberPreviewStyle(element);
    element.style.setProperty('outline', '3px solid #ffbf47', 'important');
    element.style.setProperty('outline-offset', '3px', 'important');
    element.style.setProperty('box-shadow', '0 0 0 2px rgba(0, 0, 0, 0.35)', 'important');
  }

  function restorePreviewElement(element) {
    const originalDisplay = element.getAttribute(PREVIEW_DISPLAY_ATTRIBUTE) || '';
    const originalDisplayPriority = element.getAttribute(PREVIEW_DISPLAY_PRIORITY_ATTRIBUTE) || '';
    const originalAriaHidden = element.getAttribute(PREVIEW_ARIA_HIDDEN_ATTRIBUTE) || '';
    const originalDisabled = element.getAttribute(PREVIEW_DISABLED_ATTRIBUTE);
    const originalOutline = element.getAttribute(PREVIEW_OUTLINE_ATTRIBUTE) || '';
    const originalOutlinePriority = element.getAttribute(PREVIEW_OUTLINE_PRIORITY_ATTRIBUTE) || '';
    const originalOutlineOffset = element.getAttribute(PREVIEW_OUTLINE_OFFSET_ATTRIBUTE) || '';
    const originalOutlineOffsetPriority = element.getAttribute(PREVIEW_OUTLINE_OFFSET_PRIORITY_ATTRIBUTE) || '';
    const originalBoxShadow = element.getAttribute(PREVIEW_BOX_SHADOW_ATTRIBUTE) || '';
    const originalBoxShadowPriority = element.getAttribute(PREVIEW_BOX_SHADOW_PRIORITY_ATTRIBUTE) || '';

    element.removeAttribute(PREVIEW_ATTRIBUTE);

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

    if (originalOutline) {
      element.style.setProperty('outline', originalOutline, originalOutlinePriority);
    } else {
      element.style.removeProperty('outline');
    }

    if (originalOutlineOffset) {
      element.style.setProperty('outline-offset', originalOutlineOffset, originalOutlineOffsetPriority);
    } else {
      element.style.removeProperty('outline-offset');
    }

    if (originalBoxShadow) {
      element.style.setProperty('box-shadow', originalBoxShadow, originalBoxShadowPriority);
    } else {
      element.style.removeProperty('box-shadow');
    }

    element.removeAttribute(PREVIEW_DISPLAY_ATTRIBUTE);
    element.removeAttribute(PREVIEW_DISPLAY_PRIORITY_ATTRIBUTE);
    element.removeAttribute(PREVIEW_DISABLED_ATTRIBUTE);
    element.removeAttribute(PREVIEW_ARIA_HIDDEN_ATTRIBUTE);
    element.removeAttribute(PREVIEW_OUTLINE_ATTRIBUTE);
    element.removeAttribute(PREVIEW_OUTLINE_PRIORITY_ATTRIBUTE);
    element.removeAttribute(PREVIEW_OUTLINE_OFFSET_ATTRIBUTE);
    element.removeAttribute(PREVIEW_OUTLINE_OFFSET_PRIORITY_ATTRIBUTE);
    element.removeAttribute(PREVIEW_BOX_SHADOW_ATTRIBUTE);
    element.removeAttribute(PREVIEW_BOX_SHADOW_PRIORITY_ATTRIBUTE);
  }

  function clearPreviewBlocks() {
    document.querySelectorAll(`[${PREVIEW_ATTRIBUTE}="true"]`).forEach(restorePreviewElement);
  }

  function previewElementRule(rule, previewMode = DEFAULT_PREVIEW_MODE) {
    clearPreviewBlocks();

    if (!document.body) return 0;

    let hiddenCount = 0;
    document.body.querySelectorAll('*').forEach(element => {
      if (element.hasAttribute(BLOCKED_ATTRIBUTE)) return;

      if (matchesElementRule(element, rule)) {
        if (previewMode === 'outline') {
          outlinePreviewElement(element);
        } else {
          hidePreviewElement(element);
        }
        hiddenCount += 1;
      }
    });

    return hiddenCount;
  }

  function ruleAppliesToCurrentUrl(rule) {
    const normalizedUrl = global.DAD.normalizeUrl(location.href);
    const rulePattern = normalizeToken(rule.urlPattern);

    return rulePattern && normalizedUrl.includes(rulePattern);
  }

  function applyElementRules(rules) {
    const activeRules = (rules || []).filter(rule => {
      return rule.enabled !== false && ruleAppliesToCurrentUrl(rule);
    });

    if (activeRules.length === 0 || !document.body) {
      return;
    }

    const candidates = document.body.querySelectorAll('*');
    activeRules.forEach(rule => {
      candidates.forEach(element => {
        if (matchesElementRule(element, rule)) {
          hideElement(element);
        }
      });
    });
  }

  function observeElementRules(rules) {
    if (elementRuleObserver) {
      elementRuleObserver.disconnect();
      elementRuleObserver = null;
    }

    if (!document.body) return;

    elementRuleObserver = new MutationObserver(() => {
      applyElementRules(rules);
    });
    elementRuleObserver.observe(document.body, { childList: true, subtree: true });
  }

  elementBlocking.dom = {
    applyElementRules,
    clearPreviewBlocks,
    observeElementRules,
    previewElementRule,
    resetElementBlocks
  };
})(window);
