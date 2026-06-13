// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

(function(global) {
  global.DAD = global.DAD || {};
  const elementBlocking = global.DAD.ElementBlocking = global.DAD.ElementBlocking || {};
  const {
    BLOCKED_ATTRIBUTE,
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
    PREVIEW_OUTLINE_CONTAINER_ID,
    DEFAULT_PREVIEW_MODE
  } = elementBlocking.constants;
  const { matchesElementRule } = elementBlocking.matcher;
  const {
    applyElementRules,
    resetElementBlocks
  } = elementBlocking.actions;

  let elementRuleObserver = null;

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
    drawOutlinePreview(element);
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
    clearOutlinePreviews();
  }

  function clearOutlinePreviews() {
    document.getElementById(PREVIEW_OUTLINE_CONTAINER_ID)?.remove();
  }

  function ensureOutlineContainer() {
    const existingContainer = document.getElementById(PREVIEW_OUTLINE_CONTAINER_ID);
    if (existingContainer) return existingContainer;

    const container = document.createElement('div');
    container.id = PREVIEW_OUTLINE_CONTAINER_ID;
    container.setAttribute('aria-hidden', 'true');
    container.style.cssText = [
      'position:fixed',
      'inset:0',
      'z-index:2147483646',
      'pointer-events:none',
      'contain:strict'
    ].join(';');
    document.documentElement.appendChild(container);
    return container;
  }

  function getVisibleRect(rect) {
    const left = Math.max(0, rect.left);
    const top = Math.max(0, rect.top);
    const right = Math.min(global.innerWidth, rect.right);
    const bottom = Math.min(global.innerHeight, rect.bottom);
    const width = right - left;
    const height = bottom - top;

    if (width < 2 || height < 2) return null;
    return { left, top, width, height };
  }

  function getElementPreviewRects(element) {
    const rects = Array.from(element.getClientRects ? element.getClientRects() : []);
    const visibleRects = rects
      .map(getVisibleRect)
      .filter(Boolean);

    if (visibleRects.length > 0) {
      return visibleRects.slice(0, 8);
    }

    const boundingRect = element.getBoundingClientRect?.();
    const visibleBoundingRect = boundingRect ? getVisibleRect(boundingRect) : null;
    return visibleBoundingRect ? [visibleBoundingRect] : [];
  }

  function drawOutlinePreview(element) {
    const container = ensureOutlineContainer();
    const rects = getElementPreviewRects(element);

    rects.forEach(rect => {
      const outline = document.createElement('div');
      outline.style.cssText = [
        'position:fixed',
        `left:${rect.left}px`,
        `top:${rect.top}px`,
        `width:${rect.width}px`,
        `height:${rect.height}px`,
        'border:3px solid #ffbf47',
        'box-shadow:0 0 0 2px rgba(0, 0, 0, 0.55), inset 0 0 0 1px rgba(0, 0, 0, 0.35)',
        'border-radius:2px',
        'box-sizing:border-box',
        'pointer-events:none'
      ].join(';');
      container.appendChild(outline);
    });
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
