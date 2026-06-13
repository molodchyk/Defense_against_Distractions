// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  RULESET_EXPORT_SCHEMA,
  SETTINGS_EXPORT_SCHEMA,
  buildRulesetExportPayload,
  buildSettingsExportPayload,
  getImportReplacementKeys,
  getShareableRulesetKeys,
  getSyncConfigurationKeys,
  isShareableRulesetKey,
  isSyncConfigurationKey,
  parseSettingsImportPayload
} from '../../../src/js/options/storage-transfer/model.js';

describe('storage transfer helpers', () => {
  it('exports only supported sync configuration keys', () => {
    const payload = buildSettingsExportPayload({
      plans: [{ id: 'plan_1' }],
      uiThemeMode: 'dark',
      uiLanguage: 'en',
      blockedPageSettings: { customMessage: 'Return to work.' },
      'group_focus': { id: 'group_focus' },
      'elementBlockRule.hide_feed': { id: 'hide_feed' },
      elementBlockRuleIds: ['hide_feed'],
      usageStats: { domains: {} },
      intentTrajectoryState: { sessions: [] },
      password: 'encrypted-password',
      billingIdentity: { token: 'secret' },
      billingEntitlement: { plan: 'lifetime' },
      'releaseBackupNoticeSeen.1.5.0': true
    }, {
      exportedAt: '2026-06-12T10:00:00.000Z'
    });

    assert.equal(payload.schema, SETTINGS_EXPORT_SCHEMA);
    assert.equal(payload.version, 1);
    assert.equal(payload.exportedAt, '2026-06-12T10:00:00.000Z');
    assert.deepEqual(payload.sync, {
      blockedPageSettings: { customMessage: 'Return to work.' },
      'elementBlockRule.hide_feed': { id: 'hide_feed' },
      elementBlockRuleIds: ['hide_feed'],
      'group_focus': { id: 'group_focus' },
      plans: [{ id: 'plan_1' }],
      uiLanguage: 'en',
      uiThemeMode: 'dark'
    });
  });

  it('exports only shareable ruleset keys', () => {
    const payload = buildRulesetExportPayload({
      plans: [{ id: 'plan_1' }],
      planCounter: 3,
      planMigrationState: { version: 2 },
      schedules: [{ name: 'Legacy Focus' }],
      whitelistedSites: ['docs.example'],
      websiteGroups: [{ id: 'legacy' }],
      uiThemeMode: 'dark',
      uiLanguage: 'en',
      blockedPageSettings: { customMessage: 'Private local note.' },
      'group_focus': { id: 'group_focus' },
      'elementBlockRule.hide_feed': { id: 'hide_feed' },
      elementBlockRuleIds: ['hide_feed'],
      usageStats: { domains: {} },
      intentTrajectoryState: { sessions: [] },
      password: 'encrypted-password',
      billingIdentity: { token: 'secret' }
    }, {
      exportedAt: '2026-06-12T10:00:00.000Z'
    });

    assert.equal(payload.schema, RULESET_EXPORT_SCHEMA);
    assert.equal(payload.version, 1);
    assert.equal(payload.exportedAt, '2026-06-12T10:00:00.000Z');
    assert.deepEqual(payload.sync, {
      'elementBlockRule.hide_feed': { id: 'hide_feed' },
      elementBlockRuleIds: ['hide_feed'],
      'group_focus': { id: 'group_focus' },
      planCounter: 3,
      planMigrationState: { version: 2 },
      plans: [{ id: 'plan_1' }],
      schedules: [{ name: 'Legacy Focus' }],
      websiteGroups: [{ id: 'legacy' }],
      whitelistedSites: ['docs.example']
    });
  });

  it('accepts current schema imports and reports ignored keys', () => {
    const result = parseSettingsImportPayload(JSON.stringify({
      schema: SETTINGS_EXPORT_SCHEMA,
      version: 1,
      sync: {
        plans: [{ id: 'plan_1' }],
        whitelistedSites: ['example.com'],
        usageStats: { domains: {} },
        password: 'encrypted-password'
      }
    }));

    assert.deepEqual(result.items, {
      plans: [{ id: 'plan_1' }],
      whitelistedSites: ['example.com']
    });
    assert.equal(result.importKind, 'settings');
    assert.deepEqual(result.importedKeys, ['plans', 'whitelistedSites']);
    assert.deepEqual(result.ignoredKeys, ['password', 'usageStats']);
  });

  it('accepts shareable ruleset exports and reports ignored local keys', () => {
    const result = parseSettingsImportPayload(JSON.stringify({
      schema: RULESET_EXPORT_SCHEMA,
      version: 1,
      sync: {
        plans: [{ id: 'plan_1' }],
        'group_focus': { id: 'group_focus' },
        uiThemeMode: 'dark',
        blockedPageSettings: { customMessage: 'Private local note.' },
        usageStats: { domains: {} },
        password: 'encrypted-password'
      }
    }));

    assert.deepEqual(result.items, {
      'group_focus': { id: 'group_focus' },
      plans: [{ id: 'plan_1' }]
    });
    assert.equal(result.importKind, 'ruleset');
    assert.deepEqual(result.importedKeys, ['group_focus', 'plans']);
    assert.deepEqual(result.ignoredKeys, [
      'blockedPageSettings',
      'password',
      'uiThemeMode',
      'usageStats'
    ]);
  });

  it('accepts legacy raw sync-storage exports', () => {
    const result = parseSettingsImportPayload(JSON.stringify({
      schedules: [{ name: 'Focus' }],
      websiteGroups: [{ id: 'legacy' }],
      'group_legacy': { id: 'group_legacy' },
      unsupported: true
    }));

    assert.deepEqual(result.items, {
      'group_legacy': { id: 'group_legacy' },
      schedules: [{ name: 'Focus' }],
      websiteGroups: [{ id: 'legacy' }]
    });
    assert.equal(result.importKind, 'settings');
    assert.deepEqual(result.ignoredKeys, ['unsupported']);
  });

  it('identifies replaceable configuration keys in current storage', () => {
    assert.deepEqual(getSyncConfigurationKeys({
      plans: [],
      elementBlockRules: [],
      'elementBlockRule.hide_feed': {},
      password: 'leave-local-lock-alone',
      billingIntegration: { enabled: true },
      releaseBackupNoticeEligible: true
    }), [
      'elementBlockRule.hide_feed',
      'elementBlockRules',
      'plans'
    ]);

    assert.equal(isSyncConfigurationKey('blockedPageSettings'), true);
    assert.equal(isSyncConfigurationKey('pomodoroRuntimeState'), false);
    assert.equal(isSyncConfigurationKey('billingEntitlement'), false);

    assert.deepEqual(getShareableRulesetKeys({
      plans: [],
      elementBlockRules: [],
      'elementBlockRule.hide_feed': {},
      uiLanguage: 'en',
      blockedPageSettings: { customMessage: 'Private local note.' },
      password: 'leave-local-lock-alone',
      billingIntegration: { enabled: true }
    }), [
      'elementBlockRule.hide_feed',
      'elementBlockRules',
      'plans'
    ]);

    assert.deepEqual(getImportReplacementKeys({
      plans: [],
      blockedPageSettings: { customMessage: 'Private local note.' },
      uiLanguage: 'en',
      elementBlockRules: [],
      'elementBlockRule.hide_feed': {}
    }), [
      'blockedPageSettings',
      'elementBlockRule.hide_feed',
      'elementBlockRules',
      'plans',
      'uiLanguage'
    ]);

    assert.deepEqual(getImportReplacementKeys({
      plans: [],
      blockedPageSettings: { customMessage: 'Private local note.' },
      uiLanguage: 'en',
      elementBlockRules: [],
      'elementBlockRule.hide_feed': {}
    }, 'ruleset'), [
      'elementBlockRule.hide_feed',
      'elementBlockRules',
      'plans'
    ]);

    assert.equal(isShareableRulesetKey('plans'), true);
    assert.equal(isShareableRulesetKey('uiLanguage'), false);
    assert.equal(isShareableRulesetKey('blockedPageSettings'), false);
  });

  it('rejects imports without supported configuration', () => {
    assert.throws(
      () => parseSettingsImportPayload(JSON.stringify(['plans'])),
      /JSON object/
    );
    assert.throws(
      () => parseSettingsImportPayload(JSON.stringify({ password: 'encrypted-password' })),
      /No supported/
    );
    assert.throws(
      () => parseSettingsImportPayload(JSON.stringify({ schema: SETTINGS_EXPORT_SCHEMA, sync: [] })),
      /missing sync/
    );
    assert.throws(
      () => parseSettingsImportPayload(JSON.stringify({ schema: RULESET_EXPORT_SCHEMA, sync: [] })),
      /Ruleset export/
    );
  });
});
