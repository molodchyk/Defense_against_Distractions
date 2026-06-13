// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import vm from 'node:vm';

const CONSTANTS_PATH = 'src/js/content/intent/constants.js';
const MESSAGES_PATH = 'src/js/content/intent/messages.js';
const PROMPT_PATH = 'src/js/content/intent/prompt.js';

function loadPrompt() {
  const document = createDocument();
  const window = {
    document,
    DAD: {
      IntentIntervention: {
        style: { installStyle() {} },
        theme: {
          applyPromptTheme(prompt) {
            prompt.dataset.theme = 'dark';
          },
          installThemeSync() {}
        }
      },
      UiLanguage: {
        applyDirection(element) {
          element?.setAttribute?.('dir', 'ltr');
        }
      }
    }
  };
  window.window = window;

  vm.createContext(window);
  vm.runInContext(readFileSync(CONSTANTS_PATH, 'utf8'), window);
  vm.runInContext(readFileSync(MESSAGES_PATH, 'utf8'), window);
  vm.runInContext(readFileSync(PROMPT_PATH, 'utf8'), window);

  return {
    document,
    prompt: window.DAD.IntentIntervention.prompt,
    promptId: window.DAD.IntentIntervention.constants.PROMPT_ID
  };
}

describe('intent prompt rendering', () => {
  it('shows the last coherent recovery target and first drift point on the intervention prompt', () => {
    const { document, prompt, promptId } = loadPrompt();

    prompt.renderPrompt({
      interventionId: 'session-1:intervene:visit-2',
      action: 'prompt',
      shouldIntervene: true,
      riskState: 'intervene',
      coherenceScore: 31,
      origin: {
        hostname: 'docs.example.com',
        title: 'Research index'
      },
      recoveryVisit: {
        hostname: 'docs.example.com',
        title: 'PDE5 notes'
      },
      driftVisit: {
        hostname: 'video.example.com',
        title: 'Sidebar recommendation'
      },
      currentVisit: {
        hostname: 'video.example.com',
        title: 'Unrelated recommendations'
      },
      reasonLines: ['Recommendation or feed clicks are driving the chain']
    }, createPromptHandlers());

    const renderedPrompt = document.getElementById(promptId);
    const rows = findAll(renderedPrompt, node => node.dataset?.dadIntentMeta === 'true')
      .map(collectText);

    assert.deepEqual(rows.slice(0, 5), [
      'Coherence: 31 / 100 · intervene',
      'Origin: docs.example.com - Research index',
      'Last coherent: docs.example.com - PDE5 notes',
      'First drift: video.example.com - Sidebar recommendation',
      'Current: video.example.com - Unrelated recommendations'
    ]);
  });

  it('shows hard-chain drift tab scope before chain cleanup actions', () => {
    const { document, prompt, promptId } = loadPrompt();

    prompt.renderPrompt({
      interventionId: 'session-1:block:visit-3',
      action: 'block',
      shouldIntervene: true,
      hardBlocked: true,
      riskState: 'locked',
      coherenceScore: 9,
      recoveryUrl: 'https://docs.example.com/pde5-notes',
      origin: {
        hostname: 'docs.example.com',
        title: 'Research index'
      },
      recoveryVisit: {
        hostname: 'docs.example.com',
        title: 'PDE5 notes'
      },
      driftVisit: {
        hostname: 'video.example.com',
        title: 'Sidebar recommendation'
      },
      currentVisit: {
        hostname: 'video.example.com',
        title: 'Unrelated recommendations'
      },
      chainBlock: {
        active: true,
        cooldownActive: true,
        cooldownMs: 5000,
        cooldownRemainingMs: 3200,
        driftDescendantTabCount: 2,
        chainReturnTabCount: 3
      },
      reasonLines: ['Current tab descends from a drifted chain']
    }, createPromptHandlers());

    const renderedPrompt = document.getElementById(promptId);
    const rows = findAll(renderedPrompt, node => node.dataset?.dadIntentMeta === 'true')
      .map(collectText);

    assert.deepEqual(rows.slice(0, 7), [
      'Coherence: 9 / 100 · locked',
      'Origin: docs.example.com - Research index',
      'Last coherent: docs.example.com - PDE5 notes',
      'First drift: video.example.com - Sidebar recommendation',
      'Current: video.example.com - Unrelated recommendations',
      'Drift tabs: 2 other drift tabs in this chain. Return chain also affects this tab.',
      'Cooldown: 4s before isolation is available. Return is available now.'
    ]);
  });
});

function createPromptHandlers() {
  return {
    closeDriftDescendantTabs() {},
    dismissAndRemove() {},
    isolateCurrentPage() {},
    moveDriftDescendantTabs() {},
    removePrompt() {},
    returnChainToRecovery() {},
    returnDriftDescendantTabs() {},
    returnToRecovery() {},
    scheduleCooldownRefresh() {},
    showIntentGraph() {},
    suspendDriftDescendantTabs() {}
  };
}

function createDocument() {
  const elementsById = new Map();

  function createTextNode(text) {
    return {
      nodeType: 3,
      textContent: String(text || '')
    };
  }

  function createElement(tagName) {
    const element = {
      attributes: {},
      children: [],
      dataset: {},
      disabled: false,
      parentElement: null,
      tagName: String(tagName || '').toUpperCase(),
      textContent: '',
      addEventListener() {},
      append(...nodes) {
        nodes.forEach(node => this.appendChild(typeof node === 'string' ? createTextNode(node) : node));
      },
      appendChild(node) {
        node.parentElement = this;
        this.children.push(node);
        registerElement(node);
        return node;
      },
      remove() {
        if (!this.parentElement) {
          return;
        }

        this.parentElement.children = this.parentElement.children.filter(child => child !== this);
        this.parentElement = null;
      },
      setAttribute(name, value) {
        this.attributes[name] = String(value);
      }
    };

    Object.defineProperty(element, 'id', {
      get() {
        return this.attributes.id || '';
      },
      set(value) {
        this.attributes.id = String(value || '');
        registerElement(this);
      }
    });

    return element;
  }

  function registerElement(node) {
    if (node?.nodeType === 3) {
      return;
    }

    if (node?.id) {
      elementsById.set(node.id, node);
    }

    node?.children?.forEach(registerElement);
  }

  const documentElement = createElement('html');

  return {
    createElement,
    createTextNode,
    documentElement,
    getElementById(id) {
      return elementsById.get(String(id || '')) || null;
    }
  };
}

function findAll(node, predicate, result = []) {
  if (!node) {
    return result;
  }

  if (predicate(node)) {
    result.push(node);
  }

  node.children?.forEach(child => findAll(child, predicate, result));
  return result;
}

function collectText(node) {
  if (!node) {
    return '';
  }

  const ownText = node.textContent || '';
  const childText = (node.children || []).map(collectText).join('');
  return `${ownText}${childText}`;
}
