// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createBlockedTabMuteController } from '../../../src/features/content-blocking/background/tabMute.js';

function createFakeTabDependencies({ initialMuted = false } = {}) {
  const tabs = new Map([
    [7, { id: 7, mutedInfo: { muted: initialMuted } }]
  ]);
  const updates = [];

  const tabDependencies = {
    async getTab(tabId) {
      return tabs.get(tabId) || null;
    },
    async updateTab(tabId, changes) {
      updates.push({ tabId, changes });
      const tab = tabs.get(tabId);

      if (tab && Object.prototype.hasOwnProperty.call(changes, 'muted')) {
        tab.mutedInfo = { muted: changes.muted };
      }
    }
  };

  return { tabDependencies, tabs, updates };
}

function createController(tabDependencies) {
  let tick = 0;

  return createBlockedTabMuteController(tabDependencies, {
    now: () => new Date(Date.UTC(2026, 0, 1, 0, 0, tick++))
  });
}

describe('blocked tab mute controller', () => {
  it('mutes a blocked tab and tracks the original unmuted state', async () => {
    const { tabDependencies, updates } = createFakeTabDependencies();
    const controller = createController(tabDependencies);

    await controller.muteBlockedTab(7);

    assert.deepEqual(updates, [
      { tabId: 7, changes: { muted: true } }
    ]);
    assert.deepEqual(controller.getBlockedTabMuteDebugState(7), {
      tracked: true,
      tabId: 7,
      originalMuted: false,
      mutedAt: '2026-01-01T00:00:00.000Z',
      restoredAt: null,
      lastAction: 'muted'
    });
  });

  it('restores the pre-existing mute state when the block clears', async () => {
    const { tabDependencies, updates } = createFakeTabDependencies({ initialMuted: true });
    const controller = createController(tabDependencies);

    await controller.muteBlockedTab(7);
    await controller.restoreBlockedTabMuteState(7);

    assert.deepEqual(updates, [
      { tabId: 7, changes: { muted: true } },
      { tabId: 7, changes: { muted: true } }
    ]);
    assert.deepEqual(controller.getBlockedTabMuteDebugState(7), {
      tracked: false,
      tabId: 7,
      originalMuted: true,
      mutedAt: '2026-01-01T00:00:00.000Z',
      restoredAt: '2026-01-01T00:00:01.000Z',
      restoredMutedState: true,
      lastAction: 'restored'
    });
  });

  it('records skipped restores without changing tab mute state', async () => {
    const { tabDependencies, updates } = createFakeTabDependencies();
    const controller = createController(tabDependencies);

    await controller.restoreBlockedTabMuteState(7);

    assert.deepEqual(updates, []);
    assert.deepEqual(controller.getBlockedTabMuteDebugState(7), {
      tracked: false,
      tabId: 7,
      originalMuted: null,
      restoredAt: '2026-01-01T00:00:00.000Z',
      lastAction: 'restoreSkipped'
    });
  });

  it('forgets tab mute state when a tab closes', async () => {
    const { tabDependencies } = createFakeTabDependencies();
    const controller = createController(tabDependencies);

    await controller.muteBlockedTab(7);
    controller.forgetBlockedTabMuteState(7);

    assert.deepEqual(controller.getBlockedTabMuteDebugState(7), {
      tracked: false,
      tabId: 7,
      originalMuted: null
    });
  });

  it('reports missing sender tabs without mutating state', async () => {
    const { tabDependencies, updates } = createFakeTabDependencies();
    const controller = createController(tabDependencies);

    await controller.muteBlockedTab(undefined);
    await controller.restoreBlockedTabMuteState(undefined);

    assert.deepEqual(updates, []);
    assert.deepEqual(controller.getBlockedTabMuteDebugState(undefined), {
      tracked: false,
      tabId: null,
      reason: 'No sender tab.'
    });
  });
});
