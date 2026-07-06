// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

export const repositoryUrl = 'https://github.com/molodchyk/Defense_against_Distractions';
export const canonicalReadmeSupportBlock = '## Support\n\nIf this extension saves you time and you want to support its development:\n\n[![Buy Me a Coffee](https://img.shields.io/badge/Buy%20Me%20a%20Coffee-support-FFDD00?logo=buymeacoffee&logoColor=000)](https://buymeacoffee.com/molodchyk)\n[![Patreon](https://img.shields.io/badge/Patreon-support-F96854?logo=patreon&logoColor=fff)](https://www.patreon.com/OMolodchyk)';
export const chromeWebStoreFieldLimit = 1000;
export const licenseId = 'GPL-3.0-only';
export const manifestPermissions = ['storage', 'alarms', 'downloads', 'activeTab', 'idle', 'contextMenus', 'webNavigation'];
export const englishStoreListingLocales = new Set(['en', 'en_AU', 'en_GB', 'en_US']);
export const allowedManifestKeys = new Set(['manifest_version', 'name', 'description', 'version', 'default_locale', 'permissions', 'action', 'options_page', 'background', 'content_scripts', 'web_accessible_resources', 'icons']);
export const privacyDataUsageKeys = ['data_usage.personally_identifiable_information', 'data_usage.health_information', 'data_usage.financial_payment_information', 'data_usage.authentication_information', 'data_usage.personal_communications', 'data_usage.location', 'data_usage.web_history', 'data_usage.user_activity', 'data_usage.website_content'];
export const privacyCertificationKeys = ['certification.no_sell_or_transfer', 'certification.no_unrelated_use', 'certification.no_creditworthiness'];
export const storeCategories = [
  'Communication',
  'Developer Tools',
  'Education',
  'Tools',
  'Workflow and planning',
  'Art & Design',
  'Entertainment',
  'Games',
  'Household',
  'Just for fun',
  'News & Weather',
  'Shopping',
  'Social Networking',
  'Travel',
  'Wellbeing',
  'Accessibility',
  'Functionality and UI',
  'Privacy & Security'
];
export const requiredRootEntries = [
  'README.md',
  'LICENSE',
  'PRIVACY.md',
  'manifest.json',
  'package.json',
  'src',
  'assets',
  'docs',
  'store',
  'scripts',
  'test',
  '_locales'
];
export const storeMediaAssetPaths = [
  'store/screenshots/01-popup-protection-status.png',
  'store/screenshots/02-plan-pomodoro-controls.png',
  'store/screenshots/03-intent-drift-recovery.png',
  'store/screenshots/04-blocked-page.png',
  'store/screenshots/05-ui-element-picker.png',
  'store/promo/small-promo-440x280.png',
  'store/promo/marquee-promo-1400x560.png'
];
export const storageKeyFamilies = [
  'plans',
  'planCounter',
  'planMigrationState',
  'websiteGroups',
  'group_<id>',
  'schedules',
  'whitelistedSites',
  'elementBlockRuleIds',
  'elementBlockRule.<id>',
  'elementBlockRules',
  'uiThemeMode',
  'uiLanguage',
  'blockedPageSettings',
  'password',
  'billingIntegration',
  'billingIdentity',
  'billingEntitlement',
  'releaseBackupNoticeEligible.<version>',
  'releaseBackupNoticeSeen.<version>',
  'intentTrajectoryState',
  'usageStats',
  'pomodoroRuntimeState',
  'pomodoroActivityState',
  'pomodoroHistoryState',
  'pomodoroAutoStartSuppressedUntil',
  'pomodoroAutoStartSuppressedPlanId',
  'pomodoroMiniPanelUiState',
  'focusStateSignal',
  'popupActivePane',
  'pendingSelectedTextQuickAdd',
  'key',
  'attempts',
  'lastAttempt',
  'debugLogging'
];
