// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

(function(global) {
  global.DAD = global.DAD || {};

  const PICKER_STYLE_ID = 'dad-element-picker-style';
  const PICKER_PANEL_ID = 'dad-element-picker-panel';
  const BLOCKED_ATTRIBUTE = 'data-dad-element-blocked';
  const ORIGINAL_DISPLAY_ATTRIBUTE = 'data-dad-original-display';
  const ORIGINAL_DISPLAY_PRIORITY_ATTRIBUTE = 'data-dad-original-display-priority';
  const ORIGINAL_DISABLED_ATTRIBUTE = 'data-dad-original-disabled';
  const ORIGINAL_ARIA_HIDDEN_ATTRIBUTE = 'data-dad-original-aria-hidden';
  const PREVIEW_ATTRIBUTE = 'data-dad-element-block-preview';
  const PREVIEW_DISPLAY_ATTRIBUTE = 'data-dad-preview-display';
  const PREVIEW_DISPLAY_PRIORITY_ATTRIBUTE = 'data-dad-preview-display-priority';
  const PREVIEW_DISABLED_ATTRIBUTE = 'data-dad-preview-disabled';
  const PREVIEW_ARIA_HIDDEN_ATTRIBUTE = 'data-dad-preview-aria-hidden';
  const PREVIEW_OUTLINE_ATTRIBUTE = 'data-dad-preview-outline';
  const PREVIEW_OUTLINE_PRIORITY_ATTRIBUTE = 'data-dad-preview-outline-priority';
  const PREVIEW_OUTLINE_OFFSET_ATTRIBUTE = 'data-dad-preview-outline-offset';
  const PREVIEW_OUTLINE_OFFSET_PRIORITY_ATTRIBUTE = 'data-dad-preview-outline-offset-priority';
  const PREVIEW_BOX_SHADOW_ATTRIBUTE = 'data-dad-preview-box-shadow';
  const PREVIEW_BOX_SHADOW_PRIORITY_ATTRIBUTE = 'data-dad-preview-box-shadow-priority';
  const PICKER_ATTRIBUTE = 'data-dad-element-picker-active';
  const ELEMENT_RULE_VERSION = 1;
  const ELEMENT_RULES_STORAGE_KEY = 'elementBlockRules';
  const DEFAULT_MIN_SCORE = 12;
  const DEFAULT_ANCESTOR_DEPTH = 2;
  const DEFAULT_PREVIEW_MODE = 'hide';
  const THEME_STORAGE_KEY = 'uiThemeMode';
  const DEFAULT_THEME_MODE = 'system';

  let highlightedElement = null;
  let elementRuleObserver = null;
  let pickerCleanup = null;

  function normalizeToken(value) {
    return String(value || '').trim().toLowerCase();
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
      positionPath: getPositionPath(element),
      tagIndex: getTagIndex(element)
    };
  }

  function getUrlPattern() {
    return normalizeToken(location.hostname);
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
    const interactiveTarget = element.closest('button, a, input, textarea, select, [role]');
    if (isPickableElement(interactiveTarget)) {
      return interactiveTarget;
    }

    return element;
  }

  function tokenOverlap(first = [], second = []) {
    const firstSet = new Set(first);
    return second.filter(token => firstSet.has(token)).length;
  }

  function hasAncestorPrefixMatch(candidateAncestors, ruleAncestors, depth) {
    if (!depth) return true;

    for (let index = 0; index < depth; index++) {
      if (!ruleAncestors[index]) return true;
      if (candidateAncestors[index] !== ruleAncestors[index]) return false;
    }

    return true;
  }

  function hasPositionPathMatch(candidatePath, rulePath, depth) {
    const pathDepth = Math.max(1, Math.min(depth + 1, rulePath.length));

    for (let index = 0; index < pathDepth; index++) {
      if (candidatePath[index] !== rulePath[index]) return false;
    }

    return true;
  }

  function scoreElementMatch(element, rule) {
    const { fingerprint } = rule;
    const candidate = createFingerprint(element);
    let score = 0;

    if (candidate.tag !== fingerprint.tag) return 0;
    score += 3;

    if (fingerprint.role && candidate.role === fingerprint.role) score += 2;
    if (fingerprint.inputType && candidate.inputType === fingerprint.inputType) score += 2;
    if (candidate.parentTag === fingerprint.parentTag) score += 2;
    if (fingerprint.parentRole && candidate.parentRole === fingerprint.parentRole) score += 2;
    if (candidate.childCount === fingerprint.childCount) score += 1;
    if (candidate.tagIndex === fingerprint.tagIndex) score += 3;

    const childOverlap = tokenOverlap(candidate.childSignature, fingerprint.childSignature);
    const ancestorOverlap = tokenOverlap(candidate.ancestorSignature, fingerprint.ancestorSignature);
    const classOverlap = tokenOverlap(candidate.classTokens, fingerprint.classTokens);
    const labelOverlap = tokenOverlap(candidate.labelTokens, fingerprint.labelTokens);

    score += Math.min(3, childOverlap);
    score += Math.min(3, ancestorOverlap);
    score += Math.min(3, classOverlap);
    if ((rule.labelMatch || 'prefer') !== 'ignore') {
      score += Math.min(4, labelOverlap * 2);
    }

    return score;
  }

  function normalizeNumber(value, fallback, min, max) {
    const numericValue = Number.parseInt(value, 10);
    if (Number.isNaN(numericValue)) return fallback;
    return Math.min(max, Math.max(min, numericValue));
  }

  function matchesElementRule(element, rule) {
    if (!isPickableElement(element) || element.hasAttribute(BLOCKED_ATTRIBUTE)) {
      return false;
    }

    const candidate = createFingerprint(element);
    const strategy = rule.strategy || rule.mode || 'samePosition';
    const ancestorDepth = normalizeNumber(rule.ancestorDepth, DEFAULT_ANCESTOR_DEPTH, 0, 6);
    const minScore = normalizeNumber(rule.minScore, DEFAULT_MIN_SCORE, 6, 24);
    const labelOverlap = tokenOverlap(candidate.labelTokens, rule.fingerprint.labelTokens);

    if (!hasAncestorPrefixMatch(candidate.ancestorSignature, rule.fingerprint.ancestorSignature, ancestorDepth)) {
      return false;
    }

    if (strategy === 'samePosition' && !hasPositionPathMatch(candidate.positionPath, rule.fingerprint.positionPath || [], 1)) {
      return false;
    }

    if (strategy === 'exact') {
      if (!hasPositionPathMatch(candidate.positionPath, rule.fingerprint.positionPath || [], ancestorDepth)) return false;
      if (candidate.parentTag !== rule.fingerprint.parentTag) return false;
    }

    if ((rule.labelMatch || 'prefer') === 'require' && rule.fingerprint.labelTokens.length > 0 && labelOverlap === 0) {
      return false;
    }

    return scoreElementMatch(element, rule) >= minScore;
  }

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

  function ensurePickerStyle() {
    if (document.getElementById(PICKER_STYLE_ID)) return;

    const style = document.createElement('style');
    style.id = PICKER_STYLE_ID;
    style.textContent = `
      #${PICKER_PANEL_ID} {
        --dad-picker-bg: #111318;
        --dad-picker-surface: #1a1e26;
        --dad-picker-field: #151922;
        --dad-picker-border: #343b49;
        --dad-picker-text: #eef2f7;
        --dad-picker-muted: #a8b0bf;
        --dad-picker-primary: #3d8bfd;
        --dad-picker-neutral: #343b49;
        --dad-picker-disabled: #596477;
      }

      #${PICKER_PANEL_ID}[data-theme="light"] {
        --dad-picker-bg: #ffffff;
        --dad-picker-surface: #f5f7fb;
        --dad-picker-field: #ffffff;
        --dad-picker-border: #cfd6e2;
        --dad-picker-text: #17202e;
        --dad-picker-muted: #526173;
        --dad-picker-primary: #2463d6;
        --dad-picker-neutral: #68758a;
        --dad-picker-disabled: #d8dee8;
      }

      [${PICKER_ATTRIBUTE}="true"] {
        outline: 3px solid #3d8bfd !important;
        outline-offset: 3px !important;
        cursor: crosshair !important;
      }

      #${PICKER_PANEL_ID} {
        position: fixed;
        right: 16px;
        bottom: 16px;
        z-index: 2147483647;
        width: min(420px, calc(100vw - 32px));
        border-radius: 8px;
        background: var(--dad-picker-bg);
        color: var(--dad-picker-text);
        box-shadow: 0 12px 32px rgba(0, 0, 0, 0.28);
        font: 14px/1.4 Arial, sans-serif;
        overflow: hidden;
      }

      #${PICKER_PANEL_ID} label {
        display: grid;
        gap: 4px;
        color: var(--dad-picker-muted);
        font: 700 12px/1.3 Arial, sans-serif;
      }

      #${PICKER_PANEL_ID} select,
      #${PICKER_PANEL_ID} input {
        appearance: auto !important;
        min-height: 32px;
        width: 100%;
        border: 1px solid var(--dad-picker-border);
        border-radius: 6px;
        background: var(--dad-picker-field);
        color: var(--dad-picker-text);
        padding: 6px 8px;
        font: 13px/1.3 Arial, sans-serif;
      }

      #${PICKER_PANEL_ID} input[type="number"]::-webkit-inner-spin-button,
      #${PICKER_PANEL_ID} input[type="number"]::-webkit-outer-spin-button {
        opacity: 1 !important;
        -webkit-appearance: auto !important;
        appearance: auto !important;
      }

      #${PICKER_PANEL_ID} button {
        min-height: 32px;
        border: 1px solid transparent;
        border-radius: 6px;
        padding: 6px 10px;
        background: var(--dad-picker-primary);
        color: #ffffff;
        cursor: pointer;
        font: 700 13px/1.2 Arial, sans-serif;
      }

      #${PICKER_PANEL_ID} button[data-dad-secondary="true"] {
        background: var(--dad-picker-neutral);
      }

      #${PICKER_PANEL_ID} button:disabled {
        background: var(--dad-picker-disabled);
        color: var(--dad-picker-muted);
        cursor: not-allowed;
      }

    `;
    document.documentElement.appendChild(style);
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

  function createPickerButton(text, onClick, isSecondary = false) {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = text;
    if (isSecondary) {
      button.dataset.dadSecondary = 'true';
    }
    button.addEventListener('click', event => {
      event.preventDefault();
      event.stopPropagation();
      onClick();
    });
    return button;
  }

  function makePickerPanelDraggable(panel, handle) {
    let pointerOffsetX = 0;
    let pointerOffsetY = 0;

    const onPointerMove = event => {
      const nextLeft = Math.max(8, Math.min(window.innerWidth - panel.offsetWidth - 8, event.clientX - pointerOffsetX));
      const nextTop = Math.max(8, Math.min(window.innerHeight - panel.offsetHeight - 8, event.clientY - pointerOffsetY));

      panel.style.left = `${nextLeft}px`;
      panel.style.top = `${nextTop}px`;
      panel.style.right = 'auto';
      panel.style.bottom = 'auto';
    };

    const onPointerUp = () => {
      window.removeEventListener('pointermove', onPointerMove, true);
      window.removeEventListener('pointerup', onPointerUp, true);
    };

    handle.addEventListener('pointerdown', event => {
      if (event.button !== 0) return;
      const rect = panel.getBoundingClientRect();
      pointerOffsetX = event.clientX - rect.left;
      pointerOffsetY = event.clientY - rect.top;
      window.addEventListener('pointermove', onPointerMove, true);
      window.addEventListener('pointerup', onPointerUp, true);
    });
  }

  function resolveThemeMode(mode) {
    if (mode === 'dark' || mode === 'light') return mode;
    return global.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  function applyPickerTheme(panel, mode) {
    panel.dataset.theme = resolveThemeMode(mode || DEFAULT_THEME_MODE);
  }

  function syncPickerTheme(panel) {
    chrome.storage.sync.get({ [THEME_STORAGE_KEY]: DEFAULT_THEME_MODE }, result => {
      applyPickerTheme(panel, result[THEME_STORAGE_KEY]);
    });
  }

  function createPickerSelect(options, selectedValue, onChange) {
    const select = document.createElement('select');
    options.forEach(([value, label]) => {
      const option = document.createElement('option');
      option.value = value;
      option.textContent = label;
      select.appendChild(option);
    });
    select.value = selectedValue;
    select.addEventListener('change', () => onChange(select.value));
    return select;
  }

  function createPickerNumberInput(value, min, max, onChange) {
    const input = document.createElement('input');
    input.type = 'number';
    input.min = String(min);
    input.max = String(max);
    input.value = String(value);
    input.addEventListener('change', () => {
      const normalizedValue = normalizeNumber(input.value, value, min, max);
      input.value = String(normalizedValue);
      onChange(normalizedValue);
    });
    return input;
  }

  function createPickerControl(labelText, control) {
    const label = document.createElement('label');
    const text = document.createElement('span');
    text.textContent = labelText;
    label.appendChild(text);
    label.appendChild(control);
    return label;
  }

  function createPickerPanel({ controls, onControlsChange, onSave, onChooseAgain, onCancel }) {
    document.getElementById(PICKER_PANEL_ID)?.remove();

    const panel = document.createElement('section');
    panel.id = PICKER_PANEL_ID;
    syncPickerTheme(panel);

    const handle = document.createElement('div');
    handle.style.cssText = 'display:grid;gap:2px;padding:12px 12px 8px;cursor:move;border-bottom:1px solid var(--dad-picker-border);';

    const title = document.createElement('strong');
    title.textContent = 'DaD UI picker';

    const message = document.createElement('span');
    message.style.cssText = 'color:var(--dad-picker-muted);font-size:12px;';
    message.textContent = 'Hover an element, click to preview the rule, then save or choose again.';

    handle.appendChild(title);
    handle.appendChild(message);

    const selectedText = document.createElement('div');
    selectedText.style.cssText = 'padding:10px 12px 0;color:var(--dad-picker-text);overflow-wrap:anywhere;';
    selectedText.textContent = 'No element selected';

    const controlGrid = document.createElement('div');
    controlGrid.style.cssText = 'display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;padding:10px 12px 0;';

    controlGrid.appendChild(createPickerControl(
      'Preview',
      createPickerSelect([
        ['hide', 'Hide matched'],
        ['outline', 'Outline matched']
      ], controls.previewMode, value => onControlsChange({ previewMode: value }))
    ));
    controlGrid.appendChild(createPickerControl(
      'Strategy',
      createPickerSelect([
        ['samePosition', 'Same position'],
        ['similar', 'Similar'],
        ['exact', 'Closest']
      ], controls.strategy, value => onControlsChange({ strategy: value }))
    ));
    controlGrid.appendChild(createPickerControl(
      'Minimum score',
      createPickerNumberInput(controls.minScore, 6, 24, value => onControlsChange({ minScore: value }))
    ));
    controlGrid.appendChild(createPickerControl(
      'Ancestor depth',
      createPickerNumberInput(controls.ancestorDepth, 0, 6, value => onControlsChange({ ancestorDepth: value }))
    ));
    controlGrid.appendChild(createPickerControl(
      'Label match',
      createPickerSelect([
        ['prefer', 'Prefer label'],
        ['ignore', 'Ignore label'],
        ['require', 'Require label']
      ], controls.labelMatch, value => onControlsChange({ labelMatch: value }))
    ));

    const actions = document.createElement('div');
    actions.style.cssText = 'display:flex;gap:8px;justify-content:flex-end;padding:0 12px 12px;flex-wrap:wrap;';

    const saveButton = createPickerButton('Save rule', onSave);
    saveButton.disabled = true;
    actions.appendChild(createPickerButton('Choose again', onChooseAgain, true));
    actions.appendChild(createPickerButton('Cancel', onCancel, true));
    actions.appendChild(saveButton);

    panel.appendChild(handle);
    panel.appendChild(selectedText);
    panel.appendChild(controlGrid);
    panel.appendChild(actions);
    document.documentElement.appendChild(panel);
    makePickerPanelDraggable(panel, handle);

    return {
      setSelection(element) {
        selectedText.textContent = describeElement(element);
        saveButton.disabled = !element;
      },
      setMessage(text) {
        message.textContent = text;
      },
      remove() {
        panel.remove();
      }
    };
  }

  function clearHighlight() {
    if (highlightedElement) {
      highlightedElement.removeAttribute(PICKER_ATTRIBUTE);
      highlightedElement = null;
    }
  }

  function stopPicker() {
    if (pickerCleanup) {
      pickerCleanup();
      pickerCleanup = null;
    }
  }

  function loadElementRules(callback) {
    chrome.storage.sync.get({ [ELEMENT_RULES_STORAGE_KEY]: [] }, result => {
      callback(result[ELEMENT_RULES_STORAGE_KEY] || []);
    });
  }

  function saveElementRule(rule) {
    return new Promise((resolve, reject) => {
      chrome.storage.sync.get({ [ELEMENT_RULES_STORAGE_KEY]: [] }, result => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
          return;
        }

        const nextRules = [...(result[ELEMENT_RULES_STORAGE_KEY] || []), rule];

        chrome.storage.sync.set({ [ELEMENT_RULES_STORAGE_KEY]: nextRules }, () => {
          if (chrome.runtime.lastError) {
            reject(chrome.runtime.lastError);
            return;
          }

          resolve(nextRules);
        });
      });
    });
  }

  global.DAD.createElementBlockRule = function(element, options = {}) {
    return {
      id: `element_rule_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      version: ELEMENT_RULE_VERSION,
      enabled: true,
      strategy: options.strategy || 'samePosition',
      minScore: normalizeNumber(options.minScore, DEFAULT_MIN_SCORE, 6, 24),
      ancestorDepth: normalizeNumber(options.ancestorDepth, DEFAULT_ANCESTOR_DEPTH, 0, 6),
      labelMatch: options.labelMatch || 'prefer',
      name: options.name || createRuleName(element),
      urlPattern: options.urlPattern || getUrlPattern(),
      urlScope: options.urlScope || 'host',
      createdAt: new Date().toISOString(),
      fingerprint: createFingerprint(element)
    };
  };

  global.DAD.applyElementBlockRules = function() {
    loadElementRules(rules => {
      applyElementRules(rules);
      observeElementRules(rules);
    });
  };

  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === 'sync' && changes[THEME_STORAGE_KEY]) {
      const pickerPanel = document.getElementById(PICKER_PANEL_ID);
      if (pickerPanel) {
        applyPickerTheme(pickerPanel, changes[THEME_STORAGE_KEY].newValue);
      }
    }

    if (areaName !== 'sync' || !changes[ELEMENT_RULES_STORAGE_KEY]) return;

    const rules = changes[ELEMENT_RULES_STORAGE_KEY].newValue || [];
    resetElementBlocks();
    applyElementRules(rules);
    observeElementRules(rules);
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', global.DAD.applyElementBlockRules, { once: true });
  } else {
    global.DAD.applyElementBlockRules();
  }

  global.DAD.startElementPicker = function({
    strategy = 'samePosition',
    minScore = DEFAULT_MIN_SCORE,
    ancestorDepth = DEFAULT_ANCESTOR_DEPTH,
    labelMatch = 'prefer'
  } = {}) {
    stopPicker();
    ensurePickerStyle();
    let selectedElement = null;
    let previewRule = null;
    let previewObserver = null;
    let previewUpdateTimer = null;
    const pickerControls = {
      strategy,
      minScore: normalizeNumber(minScore, DEFAULT_MIN_SCORE, 6, 24),
      ancestorDepth: normalizeNumber(ancestorDepth, DEFAULT_ANCESTOR_DEPTH, 0, 6),
      labelMatch,
      previewMode: DEFAULT_PREVIEW_MODE
    };
    let pickerPanel = null;

    const disconnectPreviewObserver = () => {
      if (previewObserver) {
        previewObserver.disconnect();
        previewObserver = null;
      }

      if (previewUpdateTimer) {
        global.clearTimeout(previewUpdateTimer);
        previewUpdateTimer = null;
      }
    };

    const buildPreviewRule = () => {
      if (!selectedElement) return null;

      return global.DAD.createElementBlockRule(selectedElement, pickerControls);
    };

    const updatePreview = () => {
      if (!selectedElement || !pickerPanel) return;

      previewRule = buildPreviewRule();
      const matchCount = previewElementRule(previewRule, pickerControls.previewMode);
      const verb = pickerControls.previewMode === 'outline' ? 'outlining' : 'hiding';
      pickerPanel.setSelection(selectedElement);
      pickerPanel.setMessage(`Preview is ${verb} ${matchCount} ${matchCount === 1 ? 'element' : 'elements'}. Adjust settings, save, choose again, or cancel.`);
    };

    const schedulePreviewUpdate = () => {
      if (!selectedElement) return;
      global.clearTimeout(previewUpdateTimer);
      previewUpdateTimer = global.setTimeout(updatePreview, 120);
    };

    const observePreviewChanges = () => {
      disconnectPreviewObserver();
      if (!document.body) return;

      previewObserver = new MutationObserver(schedulePreviewUpdate);
      previewObserver.observe(document.body, { childList: true, subtree: true });
    };

    const onMouseOver = event => {
      if (selectedElement) return;
      const pickTarget = getPickTarget(event.target);
      if (!isPickableElement(pickTarget)) return;
      clearHighlight();
      highlightedElement = pickTarget;
      highlightedElement.setAttribute(PICKER_ATTRIBUTE, 'true');
    };

    const onClick = async event => {
      const pickTarget = getPickTarget(event.target);
      if (!isPickableElement(pickTarget)) return;
      event.preventDefault();
      event.stopImmediatePropagation();

      clearPreviewBlocks();
      selectedElement = pickTarget;
      clearHighlight();
      updatePreview();
      observePreviewChanges();
    };

    const saveSelection = async () => {
      if (!previewRule) return;

      clearPreviewBlocks();
      const updatedRules = await saveElementRule(previewRule);
      applyElementRules(updatedRules);
      observeElementRules(updatedRules);
      pickerPanel.setMessage('Element blocking rule saved.');
      window.setTimeout(stopPicker, 500);
    };

    const chooseAgain = () => {
      disconnectPreviewObserver();
      clearPreviewBlocks();
      selectedElement = null;
      previewRule = null;
      clearHighlight();
      pickerPanel.setSelection(null);
      pickerPanel.setMessage('Hover an element and click to preview the rule.');
    };

    const onKeyDown = event => {
      if (event.key === 'Escape') {
        event.preventDefault();
        stopPicker();
      }
    };

    window.addEventListener('mouseover', onMouseOver, true);
    window.addEventListener('click', onClick, true);
    window.addEventListener('keydown', onKeyDown, true);
    pickerPanel = createPickerPanel({
      controls: pickerControls,
      onControlsChange: patch => {
        Object.assign(pickerControls, patch);
        updatePreview();
      },
      onSave: () => {
        saveSelection().catch(error => {
          console.error('Failed to save element blocking rule:', error);
          pickerPanel.setMessage('Could not save this rule. Try again.');
        });
      },
      onChooseAgain: chooseAgain,
      onCancel: stopPicker
    });

    pickerCleanup = () => {
      window.removeEventListener('mouseover', onMouseOver, true);
      window.removeEventListener('click', onClick, true);
      window.removeEventListener('keydown', onKeyDown, true);
      disconnectPreviewObserver();
      clearPreviewBlocks();
      clearHighlight();
      pickerPanel?.remove();
    };
  };
})(window);
