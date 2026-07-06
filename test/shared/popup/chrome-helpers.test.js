// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  getOptionsPagePath,
  getPlanActionsPanelId
} from '../../../src/js/popup/chrome.js';

describe('popup Chrome helpers', () => {
  it('builds extension options paths with optional panel hashes', () => {
    assert.equal(getOptionsPagePath(), 'src/options.html');
    assert.equal(getOptionsPagePath('intentDiagnosticsPanel'), 'src/options.html#intentDiagnosticsPanel');
    assert.equal(getOptionsPagePath('#settingsPanel'), 'src/options.html#settingsPanel');
    assert.equal(
      getOptionsPagePath(getPlanActionsPanelId('default plan')),
      'src/options.html#plansPanel?planId=default+plan&view=actions'
    );
    assert.equal(
      getOptionsPagePath(getPlanActionsPanelId('default plan', { triggerFilter: 'Rama Aurora' })),
      'src/options.html#plansPanel?planId=default+plan&view=actions&triggerType=keywordBlock&triggerFilter=Rama+Aurora'
    );
  });
});
