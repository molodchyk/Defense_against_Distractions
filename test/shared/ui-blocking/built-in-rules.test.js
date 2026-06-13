// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import vm from 'node:vm';

const BUILT_IN_RULES_PATH = 'src/js/content/ui-blocking/builtInRules.js';

function loadBuiltInRules(hostname = 'chatgpt.com') {
  const window = {
    DAD: {
      ElementBlocking: {}
    },
    location: { hostname },
    document: {
      body: null,
      querySelectorAll: () => []
    },
    MutationObserver: class {
      disconnect() {}
      observe() {}
    }
  };
  window.window = window;
  vm.createContext(window);
  vm.runInContext(readFileSync(BUILT_IN_RULES_PATH, 'utf8'), window);
  return window.DAD.ElementBlocking.builtInRules;
}

function createStyle() {
  const values = new Map();
  const priorities = new Map();
  return {
    getPropertyValue: name => values.get(name) || '',
    getPropertyPriority: name => priorities.get(name) || '',
    removeProperty: name => {
      values.delete(name);
      priorities.delete(name);
    },
    setProperty: (name, value, priority = '') => {
      values.set(name, value);
      priorities.set(name, priority);
    }
  };
}

function createElement({
  ariaLabel = '',
  disabled = false,
  messageScoped = true,
  role = '',
  tagName = 'BUTTON',
  testId = '',
  textContent = '',
  title = ''
} = {}) {
  const attributes = new Map();
  if (ariaLabel) attributes.set('aria-label', ariaLabel);
  if (role) attributes.set('role', role);
  if (testId) attributes.set('data-testid', testId);
  if (title) attributes.set('title', title);

  return {
    dataset: testId ? { testid: testId } : {},
    disabled,
    style: createStyle(),
    tagName,
    textContent,
    closest: selector => (messageScoped && selector.includes('article') ? { tagName: 'ARTICLE' } : null),
    getAttribute: name => attributes.get(name) || null,
    hasAttribute: name => attributes.has(name),
    matches: selector => Boolean(
      (selector.includes('button') && tagName.toLowerCase() === 'button')
        || (selector.includes('[role="button"]') && role === 'button')
        || (selector.includes('[data-testid]') && testId)
        || (selector.includes('[aria-label]') && ariaLabel)
        || (selector.includes('[title]') && title)
    ),
    removeAttribute: name => attributes.delete(name),
    setAttribute: (name, value) => attributes.set(name, String(value))
  };
}

describe('built-in UI blocking rules', () => {
  it('matches ChatGPT message action controls by label or test id', () => {
    const rules = loadBuiltInRules();

    assert.equal(rules.isChatGptMessageActionControl(createElement({ ariaLabel: 'Good response' }), 'chatgpt.com'), true);
    assert.equal(rules.isChatGptMessageActionControl(createElement({ testId: 'copy-turn-action-button' }), 'chatgpt.com'), true);
    assert.equal(rules.isChatGptMessageActionControl(createElement({ ariaLabel: 'Share message' }), 'chat.openai.com'), true);
  });

  it('does not match unrelated hosts, unscoped controls, or code-copy controls', () => {
    const rules = loadBuiltInRules();

    assert.equal(rules.isChatGptMessageActionControl(createElement({ ariaLabel: 'Copy' }), 'example.com'), false);
    assert.equal(rules.isChatGptMessageActionControl(createElement({ ariaLabel: 'Copy', messageScoped: false }), 'chatgpt.com'), false);
    assert.equal(rules.isChatGptMessageActionControl(createElement({ ariaLabel: 'Copy code' }), 'chatgpt.com'), false);
  });

  it('hides only matching ChatGPT message action controls', () => {
    const copyButton = createElement({ ariaLabel: 'Copy' });
    const codeCopyButton = createElement({ ariaLabel: 'Copy code' });
    const rules = loadBuiltInRules();
    const hiddenCount = rules.applyBuiltInElementRules({
      querySelectorAll: () => [copyButton, codeCopyButton]
    });

    assert.equal(hiddenCount, 1);
    assert.equal(copyButton.getAttribute('data-dad-built-in-ui-blocked'), 'chatgpt-message-action');
    assert.equal(copyButton.getAttribute('aria-hidden'), 'true');
    assert.equal(copyButton.style.getPropertyValue('display'), 'none');
    assert.equal(copyButton.disabled, true);
    assert.equal(codeCopyButton.getAttribute('data-dad-built-in-ui-blocked'), null);
  });
});
