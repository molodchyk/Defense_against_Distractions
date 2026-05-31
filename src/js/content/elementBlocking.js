// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

(function(global) {
  global.DAD = global.DAD || {};

  const PICKER_STYLE_ID = 'dad-element-picker-style';
  const PICKER_STATUS_ID = 'dad-element-picker-status';
  const BLOCKED_ATTRIBUTE = 'data-dad-element-blocked';
  const PICKER_ATTRIBUTE = 'data-dad-element-picker-active';
  const ELEMENT_RULE_VERSION = 1;
  const ELEMENT_RULES_STORAGE_KEY = 'elementBlockRules';
  const DEFAULT_MIN_SCORE = 12;
  const DEFAULT_ANCESTOR_DEPTH = 2;

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
    return normalizeToken(`${location.hostname}${location.pathname}`.replace(/\/$/, '')) || normalizeToken(location.hostname);
  }

  function createRuleName(element) {
    const role = getImplicitRole(element);
    const tag = element.tagName.toLowerCase();
    return role ? `${role} ${tag}` : tag;
  }

  function isPickableElement(element) {
    if (!element || element.nodeType !== Node.ELEMENT_NODE) return false;
    if (element === document.documentElement || element === document.body) return false;
    if (element.closest(`#${PICKER_STATUS_ID}, #dad-block-overlay`)) return false;
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
    element.setAttribute(BLOCKED_ATTRIBUTE, 'true');
    element.setAttribute('aria-hidden', 'true');
    element.style.setProperty('display', 'none', 'important');

    if ('disabled' in element) {
      element.disabled = true;
    }
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
      [${PICKER_ATTRIBUTE}="true"] {
        outline: 3px solid #3d8bfd !important;
        outline-offset: 3px !important;
        cursor: crosshair !important;
      }

      #${PICKER_STATUS_ID} {
        position: fixed;
        left: 16px;
        bottom: 16px;
        z-index: 2147483647;
        max-width: min(420px, calc(100vw - 32px));
        padding: 10px 12px;
        border-radius: 8px;
        background: #111318;
        color: #eef2f7;
        box-shadow: 0 12px 32px rgba(0, 0, 0, 0.28);
        font: 14px/1.4 Arial, sans-serif;
      }
    `;
    document.documentElement.appendChild(style);
  }

  function setPickerStatus(text) {
    let status = document.getElementById(PICKER_STATUS_ID);
    if (!status) {
      status = document.createElement('div');
      status.id = PICKER_STATUS_ID;
      document.documentElement.appendChild(status);
    }
    status.textContent = text;
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
    setPickerStatus('DaD element picker: hover an element, click to block it, or press Esc to cancel.');

    const onMouseOver = event => {
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

      const rule = global.DAD.createElementBlockRule(pickTarget, {
        strategy,
        minScore,
        ancestorDepth,
        labelMatch
      });
      const updatedRules = await saveElementRule(rule);
      applyElementRules(updatedRules);
      observeElementRules(updatedRules);
      setPickerStatus('Element blocking rule saved.');
      window.setTimeout(stopPicker, 900);
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

    pickerCleanup = () => {
      window.removeEventListener('mouseover', onMouseOver, true);
      window.removeEventListener('click', onClick, true);
      window.removeEventListener('keydown', onKeyDown, true);
      clearHighlight();
      document.getElementById(PICKER_STATUS_ID)?.remove();
    };
  };
})(window);
