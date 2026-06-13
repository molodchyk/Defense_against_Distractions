// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

export const SETTINGS_EXPORT_SCHEMA = 'dad.settings.v1';
export const RULESET_EXPORT_SCHEMA = 'dad.ruleset.v1';

const EXACT_CONFIGURATION_KEYS = new Set([
  'plans',
  'planCounter',
  'planMigrationState',
  'schedules',
  'whitelistedSites',
  'websiteGroups',
  'elementBlockRules',
  'elementBlockRuleIds',
  'blockedPageSettings',
  'uiThemeMode',
  'uiLanguage'
]);

const CONFIGURATION_KEY_PREFIXES = [
  'group_',
  'elementBlockRule.'
];

const EXACT_RULESET_KEYS = new Set([
  'plans',
  'planCounter',
  'planMigrationState',
  'schedules',
  'whitelistedSites',
  'websiteGroups',
  'elementBlockRules',
  'elementBlockRuleIds'
]);

const RULESET_KEY_PREFIXES = [
  'group_',
  'elementBlockRule.'
];

const EXCLUDED_CONFIGURATION_KEYS = new Set([
  'password',
  'billingIdentity',
  'billingEntitlement',
  'billingIntegration'
]);

export function isSyncConfigurationKey(key) {
  if (typeof key !== 'string' || EXCLUDED_CONFIGURATION_KEYS.has(key)) {
    return false;
  }

  return EXACT_CONFIGURATION_KEYS.has(key)
    || CONFIGURATION_KEY_PREFIXES.some(prefix => key.startsWith(prefix));
}

export function isShareableRulesetKey(key) {
  if (typeof key !== 'string' || EXCLUDED_CONFIGURATION_KEYS.has(key)) {
    return false;
  }

  return EXACT_RULESET_KEYS.has(key)
    || RULESET_KEY_PREFIXES.some(prefix => key.startsWith(prefix));
}

export function getSyncConfigurationKeys(items = {}) {
  return Object.keys(isPlainObject(items) ? items : {})
    .filter(isSyncConfigurationKey)
    .sort();
}

export function getShareableRulesetKeys(items = {}) {
  return Object.keys(isPlainObject(items) ? items : {})
    .filter(isShareableRulesetKey)
    .sort();
}

export function getSyncConfigurationItems(items = {}) {
  return getSyncConfigurationKeys(items).reduce((result, key) => {
    result[key] = items[key];
    return result;
  }, {});
}

export function getShareableRulesetItems(items = {}) {
  return getShareableRulesetKeys(items).reduce((result, key) => {
    result[key] = items[key];
    return result;
  }, {});
}

export function buildSettingsExportPayload(items = {}, options = {}) {
  const exportedAt = options.exportedAt || new Date().toISOString();

  return {
    schema: SETTINGS_EXPORT_SCHEMA,
    version: 1,
    exportedAt,
    sync: getSyncConfigurationItems(items)
  };
}

export function buildRulesetExportPayload(items = {}, options = {}) {
  const exportedAt = options.exportedAt || new Date().toISOString();

  return {
    schema: RULESET_EXPORT_SCHEMA,
    version: 1,
    exportedAt,
    sync: getShareableRulesetItems(items)
  };
}

export function parseSettingsImportPayload(text) {
  const parsed = JSON.parse(String(text || ''));
  const { source, importKind } = getImportSource(parsed);
  const items = importKind === 'ruleset'
    ? getShareableRulesetItems(source)
    : getSyncConfigurationItems(source);
  const importedKeys = Object.keys(items);

  if (importedKeys.length === 0) {
    throw new Error('No supported DaD configuration keys found.');
  }

  return {
    items,
    importKind,
    importedKeys,
    ignoredKeys: Object.keys(source)
      .filter(key => importKind === 'ruleset'
        ? !isShareableRulesetKey(key)
        : !isSyncConfigurationKey(key))
      .sort()
  };
}

export function getImportReplacementKeys(items = {}, importKind = 'settings') {
  return importKind === 'ruleset'
    ? getShareableRulesetKeys(items)
    : getSyncConfigurationKeys(items);
}

function getImportSource(payload) {
  if (!isPlainObject(payload)) {
    throw new Error('Settings import must be a JSON object.');
  }

  if (payload.schema === SETTINGS_EXPORT_SCHEMA) {
    if (!isPlainObject(payload.sync)) {
      throw new Error('Settings export is missing sync configuration.');
    }

    return {
      importKind: 'settings',
      source: payload.sync
    };
  }

  if (payload.schema === RULESET_EXPORT_SCHEMA) {
    if (!isPlainObject(payload.sync)) {
      throw new Error('Ruleset export is missing sync configuration.');
    }

    return {
      importKind: 'ruleset',
      source: payload.sync
    };
  }

  return {
    importKind: 'settings',
    source: payload
  };
}

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
