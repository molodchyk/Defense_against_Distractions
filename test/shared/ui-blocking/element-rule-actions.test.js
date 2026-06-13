// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import vm from 'node:vm';

const CONSTANTS_PATH = 'src/js/content/ui-blocking/constants.js';
const ACTIONS_PATH = 'src/js/content/ui-blocking/actions.js';
const DOM_PATH = 'src/js/content/ui-blocking/dom.js';

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
  disabled = false,
  matchesRule = true,
  rect = { width: 20, height: 10 },
  tagName = 'BUTTON',
  type = 'button',
  value = '',
  readOnly = false,
  contentEditable = false,
  textContent = '',
  mediaChildren = [],
  paused = true,
  pauseThrows = false
} = {}) {
  const attributes = new Map();
  let clicks = 0;
  let pauses = 0;
  let isPaused = paused;
  const dispatchedEvents = [];

  return {
    disabled,
    matchesRule,
    readOnly,
    tagName,
    type,
    value,
    isContentEditable: contentEditable,
    textContent,
    style: createStyle(),
    get paused() {
      return isPaused;
    },
    set paused(value) {
      isPaused = Boolean(value);
    },
    get pauseCount() {
      return pauses;
    },
    pause: () => {
      if (pauseThrows) {
        throw new Error('pause failed');
      }

      pauses += 1;
      isPaused = true;
    },
    click: () => {
      clicks += 1;
    },
    get clickCount() {
      return clicks;
    },
    get dispatchedEvents() {
      return dispatchedEvents;
    },
    dispatchEvent: event => {
      dispatchedEvents.push(event.type);
      return true;
    },
    querySelectorAll: selector => (selector === 'audio, video' ? mediaChildren : []),
    getAttribute: name => attributes.get(name) || null,
    getBoundingClientRect: () => rect,
    hasAttribute: name => attributes.has(name),
    removeAttribute: name => attributes.delete(name),
    setAttribute: (name, value) => attributes.set(name, String(value))
  };
}

function loadDom(elements, href = 'https://example.com/page') {
  const window = {
    DAD: {
      ElementBlocking: {},
      normalizeUrl: value => String(value || '').toLowerCase()
    },
    location: { href },
    document: {
      body: {
        querySelectorAll: () => elements
      },
      documentElement: {
        appendChild: () => {}
      },
      createElement: () => ({ style: {}, appendChild: () => {} }),
      getElementById: () => null,
      querySelectorAll: () => []
    },
    innerHeight: 800,
    innerWidth: 1200,
    Event: class {
      constructor(type) {
        this.type = type;
      }
    },
    MutationObserver: class {
      disconnect() {}
      observe() {}
    }
  };
  window.window = window;
  vm.createContext(window);
  vm.runInContext(readFileSync(CONSTANTS_PATH, 'utf8'), window);
  window.DAD.ElementBlocking.fingerprint = {
    normalizeToken: value => String(value || '').toLowerCase()
  };
  window.DAD.ElementBlocking.matcher = {
    matchesElementRule: element => element.matchesRule
  };
  vm.runInContext(readFileSync(ACTIONS_PATH, 'utf8'), window);
  vm.runInContext(readFileSync(DOM_PATH, 'utf8'), window);
  return window;
}

describe('UI element rule actions', () => {
  it('hides all matching elements by default', () => {
    const first = createElement();
    const second = createElement();
    const window = loadDom([first, second]);

    window.DAD.ElementBlocking.dom.applyElementRules([{
      id: 'rule_hide',
      enabled: true,
      urlPattern: 'example.com'
    }]);

    assert.equal(first.getAttribute('data-dad-element-blocked'), 'true');
    assert.equal(second.getAttribute('data-dad-element-blocked'), 'true');
    assert.equal(first.style.getPropertyValue('display'), 'none');
    assert.equal(second.style.getPropertyValue('display'), 'none');
  });

  it('clicks the first matching element only once per page URL', () => {
    const first = createElement();
    const second = createElement();
    const window = loadDom([first, second]);
    const rule = {
      id: 'rule_click',
      action: 'click',
      enabled: true,
      urlPattern: 'example.com'
    };

    window.DAD.ElementBlocking.dom.applyElementRules([rule]);
    window.DAD.ElementBlocking.dom.applyElementRules([rule]);

    assert.equal(first.clickCount, 1);
    assert.equal(second.clickCount, 0);
    assert.equal(first.getAttribute('data-dad-element-auto-clicked'), 'rule_click');

    window.location.href = 'https://example.com/next-page';
    window.DAD.ElementBlocking.dom.applyElementRules([rule]);

    assert.equal(first.clickCount, 2);
    assert.equal(second.clickCount, 0);
  });

  it('skips disabled auto-click matches and tries the next matching element', () => {
    const disabled = createElement({ disabled: true });
    const enabled = createElement();
    const window = loadDom([disabled, enabled]);

    window.DAD.ElementBlocking.dom.applyElementRules([{
      id: 'rule_click_enabled',
      action: 'click',
      enabled: true,
      urlPattern: 'example.com'
    }]);

    assert.equal(disabled.clickCount, 0);
    assert.equal(enabled.clickCount, 1);
  });

  it('clears the first matching editable field once per page URL', () => {
    const first = createElement({ tagName: 'INPUT', type: 'text', value: 'draft text' });
    const second = createElement({ tagName: 'TEXTAREA', value: 'second draft' });
    const window = loadDom([first, second]);
    const rule = {
      id: 'rule_clear',
      action: 'clear',
      enabled: true,
      urlPattern: 'example.com'
    };

    window.DAD.ElementBlocking.dom.applyElementRules([rule]);
    window.DAD.ElementBlocking.dom.applyElementRules([rule]);

    assert.equal(first.value, '');
    assert.equal(second.value, 'second draft');
    assert.deepEqual(first.dispatchedEvents, ['input', 'change']);
    assert.equal(first.getAttribute('data-dad-element-auto-cleared'), 'rule_clear');

    first.value = 'next page text';
    window.location.href = 'https://example.com/next-page';
    window.DAD.ElementBlocking.dom.applyElementRules([rule]);

    assert.equal(first.value, '');
    assert.deepEqual(first.dispatchedEvents, ['input', 'change', 'input', 'change']);
  });

  it('skips non-editable or empty clear matches and tries the next field', () => {
    const hiddenField = createElement({
      tagName: 'INPUT',
      type: 'text',
      value: 'hidden',
      rect: { width: 0, height: 0 }
    });
    const emptyField = createElement({ tagName: 'INPUT', type: 'text', value: '' });
    const fullField = createElement({ tagName: 'TEXTAREA', value: 'clear me' });
    const button = createElement({ tagName: 'BUTTON', type: 'button', value: 'ignore' });
    const window = loadDom([hiddenField, emptyField, button, fullField]);

    window.DAD.ElementBlocking.dom.applyElementRules([{
      id: 'rule_clear_next',
      action: 'clear',
      enabled: true,
      urlPattern: 'example.com'
    }]);

    assert.equal(hiddenField.value, 'hidden');
    assert.equal(emptyField.value, '');
    assert.equal(button.value, 'ignore');
    assert.equal(fullField.value, '');
    assert.deepEqual(fullField.dispatchedEvents, ['input', 'change']);
  });

  it('clears contenteditable text without storing replacement content', () => {
    const editable = createElement({
      tagName: 'DIV',
      contentEditable: true,
      textContent: 'editable text'
    });
    const window = loadDom([editable]);

    window.DAD.ElementBlocking.dom.applyElementRules([{
      id: 'rule_clear_editable',
      action: 'clear',
      enabled: true,
      urlPattern: 'example.com'
    }]);

    assert.equal(editable.textContent, '');
    assert.deepEqual(editable.dispatchedEvents, ['input', 'change']);
  });

  it('pauses a directly matched media element once per page URL', () => {
    const video = createElement({ tagName: 'VIDEO', paused: false });
    const secondVideo = createElement({ tagName: 'VIDEO', paused: false });
    const window = loadDom([video, secondVideo]);
    const rule = {
      id: 'rule_pause_media',
      action: 'pauseMedia',
      enabled: true,
      urlPattern: 'example.com'
    };

    window.DAD.ElementBlocking.dom.applyElementRules([rule]);
    window.DAD.ElementBlocking.dom.applyElementRules([rule]);

    assert.equal(video.pauseCount, 1);
    assert.equal(secondVideo.pauseCount, 0);
    assert.equal(video.getAttribute('data-dad-element-auto-paused-media'), 'rule_pause_media');

    window.location.href = 'https://example.com/next-page';
    video.paused = false;
    window.DAD.ElementBlocking.dom.applyElementRules([rule]);

    assert.equal(video.pauseCount, 2);
    assert.equal(secondVideo.pauseCount, 0);
  });

  it('pauses media inside the first matching container', () => {
    const firstVideo = createElement({ tagName: 'VIDEO', paused: false });
    const firstAudio = createElement({ tagName: 'AUDIO', paused: false });
    const secondVideo = createElement({ tagName: 'VIDEO', paused: false });
    const firstContainer = createElement({ tagName: 'DIV', mediaChildren: [firstVideo, firstAudio] });
    const secondContainer = createElement({ tagName: 'DIV', mediaChildren: [secondVideo] });
    const window = loadDom([firstContainer, secondContainer]);

    window.DAD.ElementBlocking.dom.applyElementRules([{
      id: 'rule_pause_container',
      action: 'pauseMedia',
      enabled: true,
      urlPattern: 'example.com'
    }]);

    assert.equal(firstVideo.pauseCount, 1);
    assert.equal(firstAudio.pauseCount, 1);
    assert.equal(secondVideo.pauseCount, 0);
  });
});
