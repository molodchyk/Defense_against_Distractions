// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

import { localizeOptionsPage } from '../../js/options/localization.js';
import { initializeBillingPanel } from '../../js/options/billing.js';
import { initializeElementRulesSync, renderElementRules } from '../../js/options/elementRules.js';
import { initializeIntentDiagnosticsPanel } from '../../js/options/intentDiagnostics.js';
import { migrateLegacyWebsiteGroupsStorage } from '../../js/options/legacyMigration.js';
import { initializePasswordManager, updateButtonStates } from '../../js/options/password/manager.js';
import { initializePlans, renderPlans } from '../../js/options/plans/controller.js';
import { initializeReleaseBackupNotice } from '../../js/options/releaseNotice.js';
import { initializeStorageTransfer } from '../../js/options/storageTransfer.js';
import { initializeBlockedPageSettings } from '../../js/options/settings/blockedPageSettings.js';
import { initializeThemeModeControl } from '../../js/options/theme.js';
import { initializeUiLanguageControl } from '../../js/options/uiLanguage.js';
import { initializeUsageStatsPanel } from '../../js/options/usageStats.js';
import { getSync } from '../../platform/chrome/storage.js';
import { getUiMessage, initializeUiLanguage } from '../../js/shared/ui/uiLanguage.js';
import { isInProtectedSchedule } from '../../js/shared/plans.js';

let lastProtectedScheduleState = null;

document.addEventListener('DOMContentLoaded', () => {
  initializeOptionsPage().catch(error => {
    console.error('Failed to initialize options page:', error);
  });
});

async function initializeOptionsPage() {
  await initializeUiLanguage();
  localizeOptionsPage();
  initializeThemeModeControl();
  initializeUiLanguageControl(refreshLocalizedOptionsUi);
  await initializePasswordManager();
  await migrateLegacyWebsiteGroupsStorage();
  initializePlans();
  renderElementRules();
  initializeElementRulesSync();
  initializeIntentDiagnosticsPanel();
  initializeUsageStatsPanel();
  initializeBillingPanel();
  initializeBlockedPageSettings();
  initializeProtectionLockPolling();
  initializeStorageTransfer();
  initializeReleaseBackupNotice();
}

async function refreshLocalizedOptionsUi() {
  localizeOptionsPage();
  await Promise.all([
    renderPlans(),
    renderElementRules()
  ]);
}

function initializeProtectionLockPolling() {
  refreshProtectionLockState();
  setInterval(refreshProtectionLockState, 15000);
}

async function refreshProtectionLockState() {
  try {
    const items = await getSync(null);
    const isProtected = isInProtectedSchedule(items);
    const importButton = document.getElementById('importButton');
    if (importButton) {
      importButton.disabled = isProtected;
    }
    const resetButton = document.getElementById('resetExtensionButton');
    if (resetButton) {
      resetButton.disabled = isProtected;
      resetButton.title = isProtected
        ? getUiMessage('resetExtensionLockedError', 'Cannot reset extension data during an active protected schedule.')
        : '';
    }

    if (lastProtectedScheduleState === null) {
      lastProtectedScheduleState = isProtected;
      return;
    }

    if (lastProtectedScheduleState !== isProtected) {
      lastProtectedScheduleState = isProtected;
      updateButtonStates();
      await Promise.all([
        renderPlans(),
        renderElementRules()
      ]);
    }
  } catch (error) {
    console.error('Failed to refresh protection lock state:', error);
  }
}
