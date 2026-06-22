// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

(function(global) {
  global.DAD = global.DAD || {};
  const elementBlocking = global.DAD.ElementBlocking = global.DAD.ElementBlocking || {};
  const {
    ELEMENT_RULES_STORAGE_KEY,
    ELEMENT_RULE_IDS_STORAGE_KEY,
    ELEMENT_RULE_ITEM_PREFIX,
    SYNC_QUOTA_BYTES_FALLBACK,
    PROTECTED_SYNC_RESERVE_BYTES
  } = elementBlocking.constants;

  function getElementRuleStorageKey(ruleId) {
    return `${ELEMENT_RULE_ITEM_PREFIX}${ruleId}`;
  }

  function dedupeRules(rules) {
    const seenIds = new Set();
    return (rules || []).filter(rule => {
      if (!rule?.id || seenIds.has(rule.id)) return false;
      seenIds.add(rule.id);
      return true;
    });
  }

  function estimateSyncItemBytes(items) {
    return Object.entries(items).reduce((totalBytes, [key, value]) => {
      return totalBytes + key.length + String(JSON.stringify(value) || '').length;
    }, 0);
  }

  function hasElementRuleChange(changes) {
    return Boolean(
      changes[ELEMENT_RULES_STORAGE_KEY]
        || changes[ELEMENT_RULE_IDS_STORAGE_KEY]
        || Object.keys(changes).some(key => key.startsWith(ELEMENT_RULE_ITEM_PREFIX))
    );
  }

  function getSyncQuotaBytes() {
    return global.DAD.ChromePlatform?.getSyncQuotaBytes?.(SYNC_QUOTA_BYTES_FALLBACK) || SYNC_QUOTA_BYTES_FALLBACK;
  }

  function createElementPickerStorageError(messageKey, fallback) {
    const error = new Error(fallback || messageKey);
    error.messageKey = messageKey;
    return error;
  }

  function loadElementRules(callback) {
    global.DAD.safeSyncStorageGet({ [ELEMENT_RULES_STORAGE_KEY]: [], [ELEMENT_RULE_IDS_STORAGE_KEY]: [] }, result => {
      if (!result) {
        callback([]);
        return;
      }

      const legacyRules = Array.isArray(result[ELEMENT_RULES_STORAGE_KEY]) ? result[ELEMENT_RULES_STORAGE_KEY] : [];
      const ruleIds = Array.isArray(result[ELEMENT_RULE_IDS_STORAGE_KEY]) ? result[ELEMENT_RULE_IDS_STORAGE_KEY] : [];
      const ruleKeys = ruleIds.map(getElementRuleStorageKey);

      if (ruleKeys.length === 0) {
        const rules = dedupeRules(legacyRules);
        if (rules.length > 0) {
          persistElementRules(rules).catch(error => {
            console.error('Failed to migrate element blocking rules:', error);
          });
        }
        callback(rules);
        return;
      }

      global.DAD.safeSyncStorageGet(ruleKeys, ruleItems => {
        if (!ruleItems) {
          callback(dedupeRules(legacyRules));
          return;
        }

        const indexedRules = ruleIds.map(ruleId => ruleItems[getElementRuleStorageKey(ruleId)]).filter(Boolean);
        const rules = dedupeRules([...indexedRules, ...legacyRules]);

        if (legacyRules.length > 0) {
          persistElementRules(rules).catch(error => {
            console.error('Failed to migrate legacy element blocking rules:', error);
          });
        }

        callback(rules);
      });
    });
  }

  function persistElementRules(rules) {
    return new Promise((resolve, reject) => {
      const nextRules = dedupeRules(rules);
      const items = {
        [ELEMENT_RULE_IDS_STORAGE_KEY]: nextRules.map(rule => rule.id)
      };

      nextRules.forEach(rule => {
        items[getElementRuleStorageKey(rule.id)] = rule;
      });

      const replacingKeys = [ELEMENT_RULES_STORAGE_KEY, ...Object.keys(items)];
      const quotaBytes = getSyncQuotaBytes();
      const protectedLimit = quotaBytes - PROTECTED_SYNC_RESERVE_BYTES;

      global.DAD.safeSyncStorageGetBytesInUse(null, totalBytes => {
        if (totalBytes === null) {
          reject(createElementPickerStorageError(
            'elementPickerStorageUnavailableError',
            'Cannot save this UI rule because extension storage is unavailable.'
          ));
          return;
        }

        global.DAD.safeSyncStorageGetBytesInUse(replacingKeys, replacingBytes => {
          if (replacingBytes === null) {
            reject(createElementPickerStorageError(
              'elementPickerStorageUnavailableError',
              'Cannot save this UI rule because extension storage is unavailable.'
            ));
            return;
          }

          const projectedBytes = totalBytes - replacingBytes + estimateSyncItemBytes(items);

          if (projectedBytes > protectedLimit && projectedBytes > totalBytes) {
            reject(createElementPickerStorageError(
              'elementPickerProtectedReserveError',
              'Cannot save this UI rule: sync storage reserve for locked schedules would be exceeded.'
            ));
            return;
          }

          global.DAD.safeSyncStorageSet(items, didSave => {
            if (!didSave) {
              reject(createElementPickerStorageError(
                'elementPickerStorageUnavailableError',
                'Cannot save this UI rule because extension storage is unavailable.'
              ));
              return;
            }

            global.DAD.safeSyncStorageRemove(ELEMENT_RULES_STORAGE_KEY, didRemove => {
              if (!didRemove) {
                reject(createElementPickerStorageError(
                  'elementPickerLegacyRemoveError',
                  'Cannot remove legacy UI rule storage after saving.'
                ));
                return;
              }

              resolve(nextRules);
            });
          });
        });
      });
    });
  }

  function saveElementRule(rule) {
    return new Promise((resolve, reject) => {
      loadElementRules(rules => {
        const nextRules = dedupeRules([...rules, rule]);
        persistElementRules(nextRules)
          .then(() => {
            resolve(nextRules);
          })
          .catch(reject);
      });
    });
  }

  elementBlocking.storage = {
    dedupeRules,
    getElementRuleStorageKey,
    hasElementRuleChange,
    loadElementRules,
    persistElementRules,
    saveElementRule
  };
})(window);
