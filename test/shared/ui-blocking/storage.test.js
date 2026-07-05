// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import vm from 'node:vm';

const CONSTANTS_PATH = 'src/js/content/ui-blocking/constants.js';
const STORAGE_PATH = 'src/js/content/ui-blocking/storage.js';

function clone(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

function pickStorageItems(store, keys) {
  if (keys === null) {
    return clone(store);
  }

  if (Array.isArray(keys)) {
    return keys.reduce((result, key) => {
      if (Object.prototype.hasOwnProperty.call(store, key)) {
        result[key] = clone(store[key]);
      }
      return result;
    }, {});
  }

  if (typeof keys === 'string') {
    return Object.prototype.hasOwnProperty.call(store, keys)
      ? { [keys]: clone(store[keys]) }
      : {};
  }

  return Object.entries(keys || {}).reduce((result, [key, fallback]) => {
    result[key] = Object.prototype.hasOwnProperty.call(store, key)
      ? clone(store[key])
      : clone(fallback);
    return result;
  }, {});
}

function loadStorageApi(initialStore = {}) {
  const store = clone(initialStore);
  const sandbox = {
    console,
    window: {
      DAD: {
        safeSyncStorageGet(keys, callback) {
          callback(pickStorageItems(store, keys));
        },
        safeSyncStorageSet(items, callback) {
          Object.assign(store, clone(items));
          callback?.(true);
        },
        safeSyncStorageRemove(keys, callback) {
          const normalizedKeys = Array.isArray(keys) ? keys : [keys];
          normalizedKeys.forEach(key => {
            delete store[key];
          });
          callback?.(true);
        },
        safeSyncStorageGetBytesInUse(_keys, callback) {
          callback(0);
        },
        ChromePlatform: {
          getSyncQuotaBytes(fallback) {
            return fallback;
          }
        }
      }
    }
  };
  sandbox.window.window = sandbox.window;
  vm.createContext(sandbox);
  vm.runInContext(readFileSync(CONSTANTS_PATH, 'utf8'), sandbox);
  vm.runInContext(readFileSync(STORAGE_PATH, 'utf8'), sandbox);

  return {
    api: sandbox.window.DAD.ElementBlocking.storage,
    store
  };
}

describe('UI element rule storage', () => {
  it('saves a picked rule and assigns it to one raw plan without dropping plan-owned fields', async () => {
    const { api, store } = loadStorageApi({
      plans: [{
        id: 'default',
        name: 'Default plan',
        uiRuleIds: ['existing_rule'],
        pomodoro: { enabled: true, workMinutes: 25 },
        intent: { enabled: true, action: 'prompt' },
        triggeredActionChains: [{ id: 'chain_1', enabled: true }]
      }]
    });

    await api.saveElementRuleWithPlanAssignment({
      id: 'rule_1',
      enabled: true,
      action: 'hideImages',
      fingerprint: { tag: 'div' }
    }, 'default');

    assert.deepEqual(store.elementBlockRuleIds, ['rule_1']);
    assert.deepEqual(store['elementBlockRule.rule_1'], {
      id: 'rule_1',
      enabled: true,
      action: 'hideImages',
      fingerprint: { tag: 'div' }
    });
    assert.deepEqual(store.plans, [{
      id: 'default',
      name: 'Default plan',
      uiRuleIds: ['existing_rule', 'rule_1'],
      pomodoro: { enabled: true, workMinutes: 25 },
      intent: { enabled: true, action: 'prompt' },
      triggeredActionChains: [{ id: 'chain_1', enabled: true }]
    }]);
  });

  it('rejects plan assignment before saving when the selected plan no longer exists', async () => {
    const { api, store } = loadStorageApi({
      plans: [{ id: 'other', uiRuleIds: [] }]
    });

    await assert.rejects(
      api.saveElementRuleWithPlanAssignment({ id: 'rule_1' }, 'missing'),
      /storage is unavailable/
    );

    assert.equal(store.elementBlockRuleIds, undefined);
    assert.equal(store['elementBlockRule.rule_1'], undefined);
    assert.deepEqual(store.plans, [{ id: 'other', uiRuleIds: [] }]);
  });
});
