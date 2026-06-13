// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

import { localizeOptionsPage } from './options/localization.js';
import { initializeBillingPanel } from './options/billing.js';
import { initializeElementRulesSync, renderElementRules } from './options/elementRules.js';
import { initializeIntentDiagnosticsPanel } from './options/intentDiagnostics.js';
import { migrateLegacyWebsiteGroupsStorage } from './options/legacyMigration.js';
import { initializePlans, renderPlans } from './options/plans/controller.js';
import { initializeReleaseBackupNotice } from './options/releaseNotice.js';
import { initializeStorageTransfer } from './options/storageTransfer.js';
import { initializeBlockedPageSettings } from './options/settings/blockedPageSettings.js';
import { initializeThemeModeControl } from './options/theme.js';
import { initializeUiLanguageControl } from './options/uiLanguage.js';
import { initializeUsageStatsPanel } from './options/usageStats.js';
import { getSync } from './shared/storage/chromeStorage.js';
import { initializeUiLanguage } from './shared/ui/uiLanguage.js';
import { isInProtectedSchedule } from './shared/plans.js';

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

    if (lastProtectedScheduleState === null) {
      lastProtectedScheduleState = isProtected;
      return;
    }

    if (lastProtectedScheduleState !== isProtected) {
      lastProtectedScheduleState = isProtected;
      await Promise.all([
        renderPlans(),
        renderElementRules()
      ]);
    }
  } catch (error) {
    console.error('Failed to refresh protection lock state:', error);
  }
}
