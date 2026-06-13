// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import vm from 'node:vm';

const NAVIGATION_GUARDS_PATH = 'src/js/content/content-blocking/navigationGuards.js';

function loadNavigationGuards({ pageBlocked = true } = {}) {
  const listeners = new Map();
  const calls = {
    renderBlockedPage: 0,
    keepPageMediaSuspended: 0
  };
  const window = {
    DAD: {
      ContentBlocking: {
        constants: {
          BLOCK_EVENT_OPTIONS: { capture: true, passive: false }
        },
        media: {
          keepPageMediaSuspended: () => {
            calls.keepPageMediaSuspended += 1;
          }
        },
        overlay: {
          renderBlockedPage: () => {
            calls.renderBlockedPage += 1;
          }
        }
      }
    },
    addEventListener: (eventName, handler, options) => {
      listeners.set(eventName, { handler, options });
    },
    blockedPageNavigationGuardsInstalled: false,
    onbeforeunload: () => 'leave',
    pageBlocked
  };
  window.window = window;
  vm.createContext(window);
  vm.runInContext(readFileSync(NAVIGATION_GUARDS_PATH, 'utf8'), window);

  return {
    calls,
    listeners,
    window,
    guards: window.DAD.ContentBlocking.navigationGuards
  };
}

function createBeforeUnloadEvent() {
  const event = {
    preventDefaultCalled: false,
    returnValue: 'site warning',
    stopImmediatePropagationCalled: false,
    preventDefault() {
      this.preventDefaultCalled = true;
    },
    stopImmediatePropagation() {
      this.stopImmediatePropagationCalled = true;
    }
  };
  return event;
}

describe('blocked-page navigation guards', () => {
  it('suppresses blocked-page beforeunload prompts without creating a prompt itself', () => {
    const { guards, window } = loadNavigationGuards({ pageBlocked: true });
    const event = createBeforeUnloadEvent();

    const result = guards.suppressBeforeUnloadPrompt(event);

    assert.equal(result, undefined);
    assert.equal(window.onbeforeunload, null);
    assert.equal(event.stopImmediatePropagationCalled, true);
    assert.equal(event.preventDefaultCalled, false);
    assert.equal('returnValue' in event, false);
  });

  it('does nothing to beforeunload while the page is not blocked', () => {
    const { guards, window } = loadNavigationGuards({ pageBlocked: false });
    const originalHandler = window.onbeforeunload;
    const event = createBeforeUnloadEvent();

    guards.suppressBeforeUnloadPrompt(event);

    assert.equal(window.onbeforeunload, originalHandler);
    assert.equal(event.stopImmediatePropagationCalled, false);
    assert.equal(event.returnValue, 'site warning');
  });

  it('installs capture-phase guards and immediately reasserts an active block', () => {
    const { calls, guards, listeners, window } = loadNavigationGuards({ pageBlocked: true });

    guards.installBlockedPageNavigationGuards();

    assert.equal(window.blockedPageNavigationGuardsInstalled, true);
    assert.deepEqual([...listeners.keys()], [
      'beforeunload',
      'focus',
      'hashchange',
      'pageshow',
      'popstate',
      'visibilitychange'
    ]);
    assert.equal(listeners.get('beforeunload').options.capture, true);
    assert.equal(calls.renderBlockedPage, 0);

    listeners.get('pageshow').handler();
    assert.equal(calls.renderBlockedPage, 1);
    assert.equal(calls.keepPageMediaSuspended, 1);
  });

  it('does not reassert overlays when the block has cleared', () => {
    const { calls, guards } = loadNavigationGuards({ pageBlocked: false });

    guards.reassertBlockedPage();

    assert.equal(calls.renderBlockedPage, 0);
    assert.equal(calls.keepPageMediaSuspended, 0);
  });
});
