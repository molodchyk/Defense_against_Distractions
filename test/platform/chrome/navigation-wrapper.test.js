// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';
import {
  addCommittedNavigationListener,
  addHistoryStateUpdatedNavigationListener
} from '../../../src/platform/chrome/navigation.js';

function createEvent() {
  let listener = null;
  let removedListener = null;

  return {
    event: {
      addListener(callback) {
        listener = callback;
      },
      removeListener(callback) {
        removedListener = callback;
      }
    },
    get listener() {
      return listener;
    },
    get removedListener() {
      return removedListener;
    }
  };
}

describe('Chrome navigation platform wrapper', () => {
  const originalChrome = globalThis.chrome;

  afterEach(() => {
    globalThis.chrome = originalChrome;
  });

  it('adds and removes webNavigation listeners', () => {
    const committed = createEvent();
    const historyState = createEvent();

    globalThis.chrome = {
      webNavigation: {
        onCommitted: committed.event,
        onHistoryStateUpdated: historyState.event
      }
    };

    const onCommitted = () => {};
    const onHistoryStateUpdated = () => {};

    addCommittedNavigationListener(onCommitted)();
    addHistoryStateUpdatedNavigationListener(onHistoryStateUpdated)();

    assert.equal(committed.listener, onCommitted);
    assert.equal(committed.removedListener, onCommitted);
    assert.equal(historyState.listener, onHistoryStateUpdated);
    assert.equal(historyState.removedListener, onHistoryStateUpdated);
  });

  it('returns no-op unsubscribers when webNavigation events are unavailable', () => {
    globalThis.chrome = {};

    assert.doesNotThrow(() => addCommittedNavigationListener(() => {})());
    assert.doesNotThrow(() => addHistoryStateUpdatedNavigationListener(() => {})());
  });
});
