// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

import { access, readFile, readdir, stat } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import process from 'node:process';
import { getFirstNonEmptyLine, getPngDimensionFailure, hasAll, parseKeyedBlock } from './playbook-utils.mjs';

const rootDir = process.cwd();
const repositoryUrl = 'https://github.com/molodchyk/Defense_against_Distractions';
const licenseId = 'GPL-3.0-only';
const manifestPermissions = [
  'storage',
  'alarms',
  'downloads',
  'activeTab',
  'idle',
  'webNavigation'
];
const privacyDataUsageKeys = [
  'data_usage.personally_identifiable_information',
  'data_usage.health_information',
  'data_usage.financial_payment_information',
  'data_usage.authentication_information',
  'data_usage.personal_communications',
  'data_usage.location',
  'data_usage.web_history',
  'data_usage.user_activity',
  'data_usage.website_content'
];
const privacyCertificationKeys = [
  'certification.no_sell_or_transfer',
  'certification.no_unrelated_use',
  'certification.no_creditworthiness'
];
const storeCategories = [
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
const requiredRootEntries = [
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
const storeMediaAssetPaths = [
  'store/screenshots/01-popup-protection-status.png',
  'store/screenshots/02-plan-pomodoro-controls.png',
  'store/screenshots/03-intent-drift-recovery.png',
  'store/screenshots/04-blocked-page.png',
  'store/screenshots/05-ui-element-picker.png',
  'store/promo/small-promo-440x280.png',
  'store/promo/marquee-promo-1400x560.png'
];

const failures = [];

async function exists(relativePath) {
  try {
    await access(path.join(rootDir, relativePath));
    return true;
  } catch {
    return false;
  }
}

function assertCondition(condition, message) {
  if (!condition) {
    failures.push(message);
  }
}

async function readText(relativePath) {
  return readFile(path.join(rootDir, relativePath), 'utf8');
}

async function readJson(relativePath) {
  return JSON.parse(await readText(relativePath));
}

async function getLocaleDirectories() {
  const localeRoot = path.join(rootDir, '_locales');
  const entries = await readdir(localeRoot);
  const locales = [];

  for (const entry of entries) {
    if ((await stat(path.join(localeRoot, entry))).isDirectory()) {
      locales.push(entry);
    }
  }

  return locales.sort((left, right) => left.localeCompare(right));
}

async function getDirectoryEntries(relativePath) {
  const absolutePath = path.join(rootDir, relativePath);
  const entries = await readdir(absolutePath, { withFileTypes: true });

  return entries.map((entry) => ({
    isDirectory: entry.isDirectory(),
    isFile: entry.isFile(),
    name: entry.name
  }));
}

async function assertPngDimensions(relativePath, expectedWidth, expectedHeight) {
  const failure = await getPngDimensionFailure(rootDir, relativePath, expectedWidth, expectedHeight);
  if (failure) failures.push(failure);
}

for (const entry of requiredRootEntries) {
  assertCondition(await exists(entry), `Missing required playbook entry: ${entry}`);
}

assertCondition(await exists('store/store-listing'), 'Missing store listing source folder.');
assertCondition(await exists('assets/icons'), 'Missing packaged icon asset folder.');
assertCondition(await exists('store/promo'), 'Missing Chrome Web Store promotional image folder.');
assertCondition(await exists('store/screenshots'), 'Missing Chrome Web Store screenshot folder.');
assertCondition(!(await exists('LICENSE.txt')), 'Use standard LICENSE filename, not LICENSE.txt.');

assertCondition(await exists('docs/reviewer-notes.md'), 'Missing reviewer notes document.');
assertCondition(await exists('docs/chrome-web-store-privacy-form.md'), 'Missing StorePilot privacy form document.');
assertCondition(await exists('docs/chrome-web-store-additional-fields.md'), 'Missing StorePilot additional-fields document.');
assertCondition(await exists('docs/chrome-web-store-category.md'), 'Missing StorePilot category document.');
assertCondition(await exists('docs/storage-ownership.md'), 'Missing storage ownership document.');
assertCondition(await exists('docs/permission-audit.md'), 'Missing permission audit document.');
assertCondition(await exists('docs/release-notes.md'), 'Missing release notes document.');
assertCondition(await exists('docs/store-media-review.md'), 'Missing store media review document.');
assertCondition(await exists('docs/decision-records.md'), 'Missing decision records document.');
assertCondition(await exists('scripts/check-static-localization.mjs'), 'Missing static localization verification script.');
assertCondition(await exists('scripts/check-unpacked-extension-load.ps1'), 'Missing unpacked extension browser-load smoke script.');
assertCondition(await exists('src/platform/chrome/alarms.js'), 'Missing Chrome alarms platform wrapper.');
assertCondition(await exists('src/platform/chrome/downloads.js'), 'Missing Chrome downloads platform wrapper.');
assertCondition(await exists('src/platform/chrome/idle.js'), 'Missing Chrome idle platform wrapper.');
assertCondition(await exists('src/platform/chrome/runtimeMessages.js'), 'Missing Chrome runtime-message platform wrapper.');
assertCondition(await exists('src/platform/chrome/tabs.js'), 'Missing Chrome tabs platform wrapper.');

const [
  manifest,
  packageJson,
  changelog,
  readme,
  privacy,
  licenseText,
  reviewerNotes,
  optionsHtml,
  englishMessages,
  storePrivacyForm,
  storeAdditionalFields,
  storeCategory,
  storageOwnership,
  permissionAudit,
  releaseNotes,
  storeMediaReview,
  decisionRecords,
  alarmsWrapper,
  downloadsWrapper,
  idleWrapper,
  runtimeMessagesWrapper,
  tabsWrapper,
  pomodoroChromeStorageModule,
  pomodoroInitializerModule,
  scheduleMonitorModule,
  passwordManagerModule,
  popupChromeModule,
  elementPickerLauncherModule,
  storageTransferModule,
  usageStatsModule,
  intentDiagnosticsModule,
  planPomodoroEditorModule
] = await Promise.all([
  readJson('manifest.json'),
  readJson('package.json'),
  readText('CHANGELOG.md'),
  readText('README.md'),
  readText('PRIVACY.md'),
  readText('LICENSE'),
  readText('docs/reviewer-notes.md'),
  readText('src/options.html'),
  readJson('_locales/en/messages.json'),
  readText('docs/chrome-web-store-privacy-form.md'),
  readText('docs/chrome-web-store-additional-fields.md'),
  readText('docs/chrome-web-store-category.md'),
  readText('docs/storage-ownership.md'),
  readText('docs/permission-audit.md'),
  readText('docs/release-notes.md'),
  readText('docs/store-media-review.md'),
  readText('docs/decision-records.md'),
  readText('src/platform/chrome/alarms.js'),
  readText('src/platform/chrome/downloads.js'),
  readText('src/platform/chrome/idle.js'),
  readText('src/platform/chrome/runtimeMessages.js'),
  readText('src/platform/chrome/tabs.js'),
  readText('src/js/background/pomodoro/chromeStorage.js'),
  readText('src/js/background/pomodoro/initializer.js'),
  readText('src/js/background/scheduleMonitor.js'),
  readText('src/js/options/password/manager.js'),
  readText('src/js/popup/chrome.js'),
  readText('src/js/popup/elementPickerLauncher.js'),
  readText('src/js/options/storageTransfer.js'),
  readText('src/js/options/usageStats.js'),
  readText('src/js/options/intentDiagnostics.js'),
  readText('src/js/options/plans/pomodoroEditor.js')
]);

assertCondition(packageJson.version === manifest.version, 'package.json version must match manifest.json version.');
assertCondition(packageJson.license === licenseId, `package.json license must be ${licenseId}.`);
assertCondition(
  new RegExp(`Version\\s+${manifest.version.replaceAll('.', '\\.')}:`).test(changelog),
  `CHANGELOG.md must include an entry for the current manifest version ${manifest.version}.`
);
assertCondition(
  licenseText.includes('GNU GENERAL PUBLIC LICENSE') && licenseText.includes('Version 3'),
  'LICENSE must contain GPLv3 text.'
);

const englishDescription = englishMessages.description?.message || '';
assertCondition(manifest.description === '__MSG_description__', 'Manifest description must use the localized description message.');
assertCondition(
  englishDescription.length > 0 && englishDescription.length <= 132,
  'English manifest description must be present and fit Chrome Web Store summary length.'
);
assertCondition(
  /plans/i.test(englishDescription)
    && /block pages/i.test(englishDescription)
    && /Pomodoro/i.test(englishDescription)
    && /intent coherence/i.test(englishDescription)
    && /UI cleanup/i.test(englishDescription),
  'English manifest description must summarize the current plan-based protection model.'
);
assertCondition(
  !/block websites|websites based on the text|whole websites/i.test(englishDescription),
  'English manifest description must not use retired website-only wording.'
);

if (await exists('dist')) {
  const distEntries = await getDirectoryEntries('dist');
  const distDirectories = distEntries.filter((entry) => entry.isDirectory);
  const expectedZipNames = [
    `Defense_against_Distractions-v${manifest.version}-extension.zip`,
    `Defense_against_Distractions-v${manifest.version}-source.zip`
  ];
  const actualZipNames = distEntries
    .filter((entry) => entry.isFile && entry.name.endsWith('.zip'))
    .map((entry) => entry.name);

  assertCondition(distDirectories.length === 0, `dist must not contain staging directories: ${distDirectories.map((entry) => entry.name).join(', ')}`);

  for (const zipName of actualZipNames) {
    assertCondition(expectedZipNames.includes(zipName), `dist contains a stale or unexpected package zip: ${zipName}`);
  }

  if (actualZipNames.length > 0) {
    for (const zipName of expectedZipNames) {
      assertCondition(actualZipNames.includes(zipName), `dist is missing expected current package zip: ${zipName}`);
    }
  }
}

assertCondition(
  hasAll(readme, [
    /Defense Against Distractions/i,
    /Load unpacked/i,
    /npm run verify:browser-load/i,
    /npm run verify:release/i,
    /PRIVACY\.md/,
    /GPL-3\.0-only/,
    /Reset extension data/i,
    /plans/i,
    /Pomodoro/i,
    /intent coherence/i,
    /UI cleanup/i,
    /extension-owned overlay/i,
    /assets\/icons/,
    /store\/store-listing/,
    /docs\/permission-audit\.md/,
    /docs\/store-media-review\.md/,
    /docs\/release-notes\.md/,
    /docs\/decision-records\.md/,
    new RegExp(repositoryUrl.replaceAll('/', '\\/')),
    /Buy Me a Coffee/i,
    /Patreon/i
  ]),
  'README must cover product goal, load-unpacked steps, checks, privacy, support, license, and source URL.'
);
assertCondition(
  !/redirects?\s+(it|matching pages|pages|the page)\s+to\s+a\s+block(?:ed)?\s+page|redirect-first|navigation-first/i.test(readme),
  'README must describe current overlay-first blocking instead of retired redirect-first behavior.'
);

const privacySectionIndex = readme.search(/^## Privacy$/m);
const licenseSectionIndex = readme.search(/^## License$/m);
const sourceLineIndex = readme.indexOf(`Source: ${repositoryUrl}`);
const supportSectionIndex = readme.search(/^## Support$/m);
assertCondition(
  privacySectionIndex !== -1
    && licenseSectionIndex > privacySectionIndex
    && sourceLineIndex > licenseSectionIndex
    && supportSectionIndex > sourceLineIndex,
  'README Support block must appear after the Privacy and License/source sections.'
);

for (const permission of manifestPermissions) {
  assertCondition(
    manifest.permissions.includes(permission),
    `Manifest is missing expected permission: ${permission}`
  );
  assertCondition(
    new RegExp(`\`${permission}\``).test(privacy),
    `PRIVACY.md must explain manifest permission: ${permission}`
  );
}

assertCondition(
  hasAll(permissionAudit, [
    /# Permission Audit/,
    /minimal and explainable/i,
    /Host Access Through Content Scripts/,
    /Permissions Deliberately Not Requested/,
    /Removal trigger/i,
    /content_scripts\.matches/,
    /<all_urls>/,
    /not requested/i,
    /`tabs`/,
    /`scripting`/,
    /`webRequest`/
  ]),
  'Permission audit must explain host access, removal triggers, and deliberately unrequested broad permissions.'
);
assertCondition(
  /src\/platform\/chrome\/downloads\.js/.test(permissionAudit),
  'Permission audit must point downloads permission API evidence at the platform wrapper.'
);
assertCondition(
  /src\/platform\/chrome\/alarms\.js/.test(permissionAudit),
  'Permission audit must point alarms permission API evidence at the platform wrapper.'
);

assertCondition(/chrome\.alarms\.create/.test(alarmsWrapper) && /chrome\.alarms\.clear/.test(alarmsWrapper) && /chrome\.alarms\.onAlarm/.test(alarmsWrapper) && /runtime\.lastError/.test(alarmsWrapper), 'Chrome alarms platform wrapper must own chrome.alarms create/clear/listener and runtime.lastError handling.');
assertCondition([pomodoroChromeStorageModule, pomodoroInitializerModule, scheduleMonitorModule].every(text => /platform\/chrome\/alarms\.js/.test(text) && !/chrome\.alarms\./.test(text)), 'Background Pomodoro and schedule monitor modules must use the alarms platform wrapper instead of raw chrome.alarms callbacks.');
assertCondition(/chrome\.idle/.test(idleWrapper) && /setDetectionInterval/.test(idleWrapper) && /onStateChanged/.test(idleWrapper) && /queryState/.test(idleWrapper), 'Chrome idle platform wrapper must own idle detection interval, listener, and initial state query.');
assertCondition(/platform\/chrome\/idle\.js/.test(pomodoroInitializerModule) && !/chrome\.idle/.test(pomodoroInitializerModule), 'Background Pomodoro initializer must use the idle platform wrapper instead of raw chrome.idle calls.');
assertCondition(
  /chrome\.downloads\.download/.test(downloadsWrapper)
    && /runtime\.lastError/.test(downloadsWrapper),
  'Chrome downloads platform wrapper must own chrome.downloads.download and runtime.lastError handling.'
);
assertCondition(
  /platform\/chrome\/downloads\.js/.test(storageTransferModule)
    && !/chrome\.downloads\.download/.test(storageTransferModule),
  'Options storage transfer must use the downloads platform wrapper instead of raw chrome.downloads.download.'
);
assertCondition(/chrome\.runtime\.sendMessage/.test(runtimeMessagesWrapper) && /runtime\.lastError/.test(runtimeMessagesWrapper), 'Chrome runtime-message platform wrapper must own chrome.runtime.sendMessage and runtime.lastError handling.');
assertCondition(/chrome\.tabs\.query/.test(tabsWrapper) && /chrome\.tabs\.create/.test(tabsWrapper) && /chrome\.tabs\.sendMessage/.test(tabsWrapper) && /chrome\.tabs\.update/.test(tabsWrapper) && /runtime\.lastError/.test(tabsWrapper), 'Chrome tabs platform wrapper must own popup tab query/create/message/update and runtime.lastError handling.');
assertCondition([popupChromeModule, elementPickerLauncherModule].every(text => /platform\/chrome\/tabs\.js/.test(text) && !/chrome\.tabs\./.test(text) && !/chrome\.runtime\.lastError/.test(text)), 'Popup tab helpers must use the tabs platform wrapper instead of raw chrome.tabs callbacks.');
assertCondition(
  [usageStatsModule, intentDiagnosticsModule, planPomodoroEditorModule].every(text =>
    /platform\/chrome\/runtimeMessages\.js/.test(text) && !/chrome\.runtime\.sendMessage/.test(text)
  ),
  'Options usage, intent diagnostics, and plan Pomodoro modules must use the runtime-message platform wrapper.'
);
const passwordManagerUsesStorageWrapper = /platform\/chrome\/storage\.js/.test(passwordManagerModule)
  && !/chrome\.storage\.(?:sync|local)\.(?:get|set|remove|clear|getBytesInUse)/.test(passwordManagerModule)
  && !/chrome\.runtime\.lastError/.test(passwordManagerModule);
assertCondition(passwordManagerUsesStorageWrapper, 'Options password manager must use the Chrome storage platform wrapper instead of raw chrome.storage callbacks.');
assertCondition(/platform\/chrome\/storage\.js/.test(scheduleMonitorModule) && !/chrome\.storage\.sync\.(?:get|set|remove|clear|getBytesInUse)/.test(scheduleMonitorModule), 'Background schedule monitor must use the Chrome storage platform wrapper instead of raw chrome.storage callbacks.');

for (const permission of manifest.permissions) {
  const escapedPermission = permission.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  assertCondition(new RegExp(`###\\s+\`${escapedPermission}\``).test(permissionAudit), `Permission audit must include a section for manifest permission: ${permission}.`);
  assertCondition(new RegExp(`permission\\.${escapedPermission}`).test(storePrivacyForm), `StorePilot privacy form must include permission.${permission}.`);
  assertCondition(new RegExp(`\`${escapedPermission}\``).test(privacy), `PRIVACY.md must include manifest permission: ${permission}.`);
}

assertCondition(
  packageJson.scripts?.['verify:browser-load']?.includes('scripts/check-unpacked-extension-load.ps1'),
  'package.json must expose npm run verify:browser-load for the unpacked browser-load smoke check.'
);
assertCondition(
  packageJson.scripts?.['verify:static-localization'] === 'node scripts/check-static-localization.mjs',
  'package.json must expose npm run verify:static-localization for extension HTML localization checks.'
);

const storePrivacyFields = parseKeyedBlock(storePrivacyForm, 'privacy');
for (const field of ['single_purpose', 'host_permission', 'remote_code', 'privacy_policy_url']) {
  assertCondition(storePrivacyFields.has(field), `StorePilot privacy form is missing ${field}.`);
}

for (const permission of manifestPermissions) {
  assertCondition(
    storePrivacyFields.has(`permission.${permission}`),
    `StorePilot privacy form is missing permission.${permission}.`
  );
}

for (const field of privacyDataUsageKeys) {
  assertCondition(storePrivacyFields.get(field) === 'no', `StorePilot privacy form must set ${field}: no.`);
}

for (const field of privacyCertificationKeys) {
  assertCondition(storePrivacyFields.get(field) === 'yes', `StorePilot privacy form must set ${field}: yes.`);
}

assertCondition(storePrivacyFields.get('remote_code') === 'no', 'StorePilot privacy form must set remote_code: no.');
assertCondition(!storePrivacyFields.has('remote_code_justification'), 'StorePilot privacy form should omit remote_code_justification when remote_code is no.');
assertCondition(
  storePrivacyFields.get('privacy_policy_url') === 'https://github.com/molodchyk/Defense_against_Distractions/blob/main/PRIVACY.md',
  'StorePilot privacy form must point to the repository privacy policy.'
);

const additionalFields = parseKeyedBlock(storeAdditionalFields, 'additional_fields');
assertCondition(additionalFields.get('official_url') === 'none', 'StorePilot additional fields must set official_url: none.');
assertCondition(additionalFields.get('homepage_url') === repositoryUrl, 'StorePilot additional fields must set homepage_url to the repository URL.');
assertCondition(additionalFields.get('support_url') === `${repositoryUrl}/issues`, 'StorePilot additional fields must set support_url to repository issues.');
assertCondition(additionalFields.get('mature_content') === 'no', 'StorePilot additional fields must set mature_content: no.');

const categoryMatch = storeCategory.match(/^Selected category:\s*(.+)$/m);
assertCondition(Boolean(categoryMatch), 'StorePilot category document must include a Selected category line.');
assertCondition(
  categoryMatch ? storeCategories.includes(categoryMatch[1].trim()) : false,
  'StorePilot category document must use a visible Chrome Web Store category label.'
);

for (const iconPath of Object.values(manifest.icons || {})) {
  assertCondition(
    typeof iconPath === 'string' && iconPath.startsWith('assets/icons/'),
    `Manifest icon path should live under assets/icons/: ${iconPath}`
  );
}

for (const iconPath of Object.values(manifest.action?.default_icon || {})) {
  assertCondition(
    typeof iconPath === 'string' && iconPath.startsWith('assets/icons/'),
    `Action icon path should live under assets/icons/: ${iconPath}`
  );
}

const expectedIconDimensions = new Map([
  ['assets/icons/extension-icon-16.png', 16],
  ['assets/icons/extension-icon-32.png', 32],
  ['assets/icons/extension-icon-48.png', 48],
  ['assets/icons/extension-icon-64.png', 64],
  ['assets/icons/extension-icon-128.png', 128]
]);

for (const [iconPath, expectedSize] of expectedIconDimensions) {
  await assertPngDimensions(iconPath, expectedSize, expectedSize);
}

const screenshotEntries = await getDirectoryEntries('store/screenshots');
const screenshotPngs = screenshotEntries
  .filter((entry) => entry.isFile && entry.name.endsWith('.png'))
  .map((entry) => `store/screenshots/${entry.name}`)
  .sort((left, right) => left.localeCompare(right));

assertCondition(screenshotPngs.length === 5, 'Store screenshots folder must contain exactly 5 PNG screenshots.');
for (const screenshotPath of screenshotPngs) {
  await assertPngDimensions(screenshotPath, 1280, 800);
}

await assertPngDimensions('store/promo/small-promo-440x280.png', 440, 280);
await assertPngDimensions('store/promo/marquee-promo-1400x560.png', 1400, 560);

for (const assetPath of storeMediaAssetPaths) {
  assertCondition(
    storeMediaReview.includes(`\`${assetPath}\``),
    `Store media review must cover ${assetPath}.`
  );
}

assertCondition(
  hasAll(storeMediaReview, [
    /# Store Media Review/,
    /Chrome Web Store/i,
    /screenshots/i,
    /promo images/i,
    /personal accounts/i,
    /private conversations/i,
    /real rules/i,
    /real domains/i,
    /user-specific configuration/i,
    /example\.test/i
  ]),
  'Store media review must document screenshot and promo privacy boundaries.'
);

assertCondition(/Host access through content scripts/i.test(privacy), 'PRIVACY.md must explain host/content-script access.');
assertCondition(/chrome\.storage\.sync/.test(privacy), 'PRIVACY.md must mention sync storage.');
assertCondition(/chrome\.storage\.local/.test(privacy), 'PRIVACY.md must mention local storage.');
assertCondition(/does not sell user data/i.test(privacy), 'PRIVACY.md must state user data is not sold.');
assertCondition(/does not transfer user data to third parties/i.test(privacy), 'PRIVACY.md must state user data is not transferred to third parties.');
assertCondition(/does not require a remote server/i.test(privacy), 'PRIVACY.md must state core behavior does not require a remote server.');
assertCondition(/does not use remote JavaScript or WebAssembly/i.test(privacy), 'PRIVACY.md must state remote executable code is not used.');
assertCondition(/does not use analytics, ads, tracking pixels, or telemetry/i.test(privacy), 'PRIVACY.md must state analytics, ads, tracking pixels, and telemetry are not used.');
assertCondition(/reset all extension storage/i.test(privacy), 'PRIVACY.md must explain the reset-storage path.');

assertCondition(
  hasAll(storageOwnership, [
    /# Storage Ownership/,
    /storage area/i,
    /owner feature/i,
    /data shape\/version/i,
    /migration path/i,
    /retention or pruning/i,
    /quota risk/i,
    /user configuration/i,
    /runtime state/i,
    /diagnostics/i,
    /cache data/i,
    /chrome\.storage\.sync/,
    /chrome\.storage\.local/
  ]),
  'Storage ownership document must cover the modularization playbook storage fields.'
);

assertCondition(
  hasAll(releaseNotes, [
    /# Release Notes/,
    /CHANGELOG\.md/,
    new RegExp(`\\b${manifest.version.replaceAll('.', '\\.')}\\b`),
    /npm run verify:release/,
    /source archive/i,
    /remote network access/i,
    /screenshots/i,
    /promo/i,
    /Store Media Review/i
  ]),
  'Release notes document must cover the current version, changelog source, release gate, source archive, media, and network posture.'
);

assertCondition(
  hasAll(decisionRecords, [
    /# Decision Records/,
    /DR-001/,
    /Local-First/i,
    /Plan-First/i,
    /Feature-First/i,
    /StorePilot/i,
    /Bounded Intent/i,
    /UI Element Actions/i
  ]),
  'Decision records document must index the durable local-first, plan-first, feature-first, StorePilot, intent, and UI action decisions.'
);

const storageKeyFamilies = [
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
  'key',
  'attempts',
  'lastAttempt',
  'debugLogging'
];
const englishStoreListingLocales = new Set(['en', 'en_AU', 'en_GB', 'en_US']);

for (const storageKeyFamily of storageKeyFamilies) {
  assertCondition(
    storageOwnership.includes(`\`${storageKeyFamily}\``),
    `Storage ownership document must cover ${storageKeyFamily}.`
  );
}

assertCondition(
  /id="resetExtensionButton"/.test(optionsHtml)
    && /id="resetExtensionHint"/.test(optionsHtml)
    && englishMessages.resetExtensionButton?.message
    && englishMessages.resetExtensionConfirm?.message
    && englishMessages.resetExtensionLockedError?.message,
  'Options UI must expose a localized reset extension data control.'
);

assertCondition(
  hasAll(reviewerNotes, [
    /file:\/\/.+Allow access to file URLs/is,
    /incognito.+explicitly allow/is,
    /browser-controlled behavior/i,
    /Manifest V3 service workers can sleep and restart/i,
    /runtime package excludes docs, tests, scripts, screenshots, promo images, store listing text, and source-only icon files/i
  ]),
  'Reviewer notes must cover file URLs, incognito, browser-controlled behavior, MV3 restart behavior, and package contents.'
);

const locales = await getLocaleDirectories();
for (const locale of locales) {
  const listingPath = `store/store-listing/${locale}.txt`;
  assertCondition(await exists(listingPath), `Missing store listing for locale: ${locale}`);

  if (!(await exists(listingPath))) {
    continue;
  }

  const listing = await readText(listingPath);
  const firstLine = getFirstNonEmptyLine(listing);
  const listingVersionMentions = [...listing.matchAll(/\b\d+\.\d+(?:\.\d+)?\b/g)]
    .map((match) => match[0])
    .filter((version) => version !== manifest.version && version !== '3.0');

  assertCondition(!/[#*\[\]]/.test(listing), `${listingPath} must remain plain text, not Markdown.`);
  assertCondition(firstLine.length > 0, `${listingPath} must not be empty.`);
  assertCondition(!/^#/.test(firstLine), `${listingPath} must not start with a Markdown heading.`);
  assertCondition(
    !/^(name|summary|description|detailed description)\s*:/i.test(firstLine),
    `${listingPath} must not start with a Chrome Web Store field label.`
  );
  assertCondition(
    !/^(defen[sc]e against distractions)\b/i.test(firstLine),
    `${listingPath} must not start with the extension name.`
  );
  assertCondition(listing.includes(repositoryUrl), `${listingPath} must include the GitHub URL.`);
  assertCondition(/GPL-3\.0/.test(listing), `${listingPath} must include GPL-3.0 license disclosure.`);
  assertCondition(!/buymeacoffee|patreon/i.test(listing), `${listingPath} must not include donation links.`);
  assertCondition(
    listingVersionMentions.length === 0,
    `${listingPath} mentions stale or unsynchronized version numbers: ${listingVersionMentions.join(', ')}.`
  );

  if (englishStoreListingLocales.has(locale)) {
    assertCondition(
      /plans/i.test(listing) && /allowed websites/i.test(listing) && /intent coherence/i.test(listing),
      `${listingPath} must describe the current plan-based UI model.`
    );
    assertCondition(
      !/create groups of websites|website and keyword groups|whitelists/i.test(listing),
      `${listingPath} must not use retired group or whitelist wording.`
    );
  }
}

if (failures.length === 0) {
  const staticLocalizationCheck = spawnSync(process.execPath, ['scripts/check-static-localization.mjs'], {
    cwd: rootDir,
    encoding: 'utf8'
  });
  if (staticLocalizationCheck.status !== 0) {
    failures.push(`Static localization verification failed:\n${staticLocalizationCheck.stdout}${staticLocalizationCheck.stderr}`.trim());
  }
}

if (failures.length === 0) {
  console.log(`Browser extension playbook check passed: ${locales.length} localized store listings verified.`);
  process.exit(0);
}

console.error('Browser extension playbook check failed.');
console.error('');
failures.forEach(failure => console.error(`- ${failure}`));
process.exit(1);
