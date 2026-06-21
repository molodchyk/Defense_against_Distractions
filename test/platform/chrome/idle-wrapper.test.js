// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';
import {
  addIdleStateChangeListener,
  hasIdleApi,
  queryIdleState,
  setIdleDetectionInterval
} from '../../../src/platform/chrome/idle.js';

describe('Chrome idle platform wrapper', () => {
  const originalChrome = globalThis.chrome;

  afterEach(() => {
    globalThis.chrome = originalChrome;
  });

  it('reports whether the idle API is available', () => {
    globalThis.chrome = {};
    assert.equal(hasIdleApi(), false);

    globalThis.chrome = { idle: {} };
    assert.equal(hasIdleApi(), true);
  });

  it('sets the idle detection interval', () => {
    let requestedSeconds = null;

    globalThis.chrome = {
      idle: {
        setDetectionInterval(seconds) {
          requestedSeconds = seconds;
        }
      }
    };

    setIdleDetectionInterval(15);

    assert.equal(requestedSeconds, 15);
  });

  it('adds idle state listeners and returns an unsubscribe function', () => {
    let listener = null;
    let removedListener = null;

    globalThis.chrome = {
      idle: {
        onStateChanged: {
          addListener(callback) {
            listener = callback;
          },
          removeListener(callback) {
            removedListener = callback;
          }
        }
      }
    };

    const unsubscribe = addIdleStateChangeListener(() => {});
    unsubscribe();

    assert.equal(typeof listener, 'function');
    assert.equal(removedListener, listener);
  });

  it('queries the current idle state', () => {
    let requestedSeconds = null;
    let observedState = null;

    globalThis.chrome = {
      idle: {
        queryState(seconds, callback) {
          requestedSeconds = seconds;
          callback('locked');
        }
      }
    };

    queryIdleState(15, state => {
      observedState = state;
    });

    assert.equal(requestedSeconds, 15);
    assert.equal(observedState, 'locked');
  });
});
