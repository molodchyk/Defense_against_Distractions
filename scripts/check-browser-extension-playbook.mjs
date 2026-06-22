// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

import { access, readFile, readdir, stat } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import process from 'node:process';
import {
  allowedManifestKeys,
  canonicalReadmeSupportBlock,
  englishStoreListingLocales,
  licenseId,
  manifestPermissions,
  repositoryUrl,
  requiredRootEntries,
  storeMediaAssetPaths,
  storageKeyFamilies
} from './playbook/constants.mjs';
import { getReleaseSafetyFailures } from './playbook/releaseSafety.mjs';
import { getStoreAutomationFailures } from './playbook/storeAutomation.mjs';
import { verifyReviewedStoreMediaHashes } from './playbook/storeMediaReview.mjs';
import { getFirstNonEmptyLine, getPngDimensionFailure, hasAll } from './playbook-utils.mjs';

const rootDir = process.cwd(), failures = [];
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
assertCondition(await exists('docs/release-checklist.md'), 'Missing release checklist document.');
assertCondition(await exists('docs/store-media-review.md'), 'Missing store media review document.');
assertCondition(await exists('docs/decision-records.md'), 'Missing decision records document.');
assertCondition(await exists('docs/localization.md'), 'Missing localization workflow document.');
assertCondition(await exists('scripts/check-static-localization.mjs'), 'Missing static localization verification script.');
assertCondition(await exists('scripts/check-unpacked-extension-load.ps1'), 'Missing unpacked extension browser-load smoke script.');
for (const platformWrapper of ['action', 'alarms', 'contentBridge', 'downloads', 'i18n', 'idle', 'navigation', 'runtime', 'runtimeMessages', 'tabs', 'windows']) {
  assertCondition(await exists(`src/platform/chrome/${platformWrapper}.js`), `Missing Chrome ${platformWrapper} platform wrapper.`);
}
const [
  manifest,
  packageJson,
  changelog,
  readme,
  privacy,
  licenseText,
  reviewerNotes,
  optionsHtml,
  popupHtml,
  englishMessages,
  storePrivacyForm,
  storeAdditionalFields,
  storeCategory,
  storageOwnership,
  permissionAudit,
  releaseNotes,
  releaseChecklist,
  releaseVerifier,
  storeMediaReview,
  decisionRecords,
  codeStructure,
  localizationDoc,
  actionWrapper,
  alarmsWrapper,
  downloadsWrapper,
  i18nWrapper,
  idleWrapper,
  navigationWrapper,
  runtimeWrapper,
  runtimeMessagesWrapper,
  tabsWrapper,
  windowsWrapper,
  appBackgroundModule,
  contentBlockingBackgroundModule,
  blockedTabMuteModule,
  backgroundDefaultsModule,
  intentInitializerModule,
  intentChromeApiModule,
  pomodoroChromeStorageModule,
  pomodoroInitializerModule,
  pomodoroNotificationsModule,
  releaseNoticeModule,
  scheduleMonitorModule,
  intentMessagesModule,
  passwordManagerModule,
  popupIndexModule,
  popupChromeModule,
  popupDiagnosticsExportModule,
  elementPickerLauncherModule,
  blockedPageChromeApiModule,
  blockedPageLocalizationModule,
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
  readText('src/popup.html'),
  readJson('_locales/en/messages.json'),
  readText('docs/chrome-web-store-privacy-form.md'),
  readText('docs/chrome-web-store-additional-fields.md'),
  readText('docs/chrome-web-store-category.md'),
  readText('docs/storage-ownership.md'),
  readText('docs/permission-audit.md'),
  readText('docs/release-notes.md'),
  readText('docs/release-checklist.md'),
  readText('scripts/verify-release.ps1'),
  readText('docs/store-media-review.md'),
  readText('docs/decision-records.md'),
  readText('docs/code-structure.md'),
  readText('docs/localization.md'),
  readText('src/platform/chrome/action.js'),
  readText('src/platform/chrome/alarms.js'),
  readText('src/platform/chrome/downloads.js'),
  readText('src/platform/chrome/i18n.js'),
  readText('src/platform/chrome/idle.js'),
  readText('src/platform/chrome/navigation.js'),
  readText('src/platform/chrome/runtime.js'),
  readText('src/platform/chrome/runtimeMessages.js'),
  readText('src/platform/chrome/tabs.js'),
  readText('src/platform/chrome/windows.js'),
  readText('src/app/background/index.js'),
  readText('src/features/content-blocking/background/runtime.js'),
  readText('src/features/content-blocking/background/tabMute.js'),
  readText('src/js/background/defaults.js'),
  readText('src/js/background/intent/initializer.js'),
  readText('src/js/background/intent/chromeApi.js'),
  readText('src/js/background/pomodoro/chromeStorage.js'),
  readText('src/js/background/pomodoro/initializer.js'),
  readText('src/js/background/pomodoro/notifications.js'),
  readText('src/js/background/releaseNotice.js'),
  readText('src/js/background/scheduleMonitor.js'),
  readText('src/js/background/intent/messages.js'),
  readText('src/js/options/password/manager.js'),
  readText('src/app/popup/index.js'),
  readText('src/js/popup/chrome.js'),
  readText('src/js/popup/diagnosticsExport.js'),
  readText('src/js/popup/elementPickerLauncher.js'),
  readText('src/features/content-blocking/blocked-page/chromeApi.js'),
  readText('src/features/content-blocking/blocked-page/localization.js'),
  readText('src/js/options/storageTransfer.js'),
  readText('src/js/options/usageStats.js'),
  readText('src/js/options/intentDiagnostics.js'),
  readText('src/js/options/plans/pomodoroEditor.js')
]);
assertCondition(packageJson.version === manifest.version, 'package.json version must match manifest.json version.');
assertCondition(packageJson.license === licenseId, `package.json license must be ${licenseId}.`);
assertCondition(packageJson.homepage === repositoryUrl, 'package.json homepage must match the repository URL.');
assertCondition(packageJson.repository?.type === 'git' && packageJson.repository?.url === `${repositoryUrl}.git`, 'package.json repository metadata must point to the project Git repository.');
assertCondition(packageJson.bugs?.url === `${repositoryUrl}/issues`, 'package.json bugs URL must point to repository issues.');
const manifestPermissionSet = new Set(manifest.permissions || []);
assertCondition(manifest.permissions?.length === manifestPermissions.length && manifestPermissions.every(permission => manifestPermissionSet.has(permission)), 'manifest.json permissions must exactly match the audited required permission set.');
assertCondition(manifest.content_scripts?.length === 1 && manifest.content_scripts[0].matches?.length === 1 && manifest.content_scripts[0].matches[0] === '<all_urls>' && manifest.web_accessible_resources?.length === 1 && manifest.web_accessible_resources[0].matches?.length === 1 && manifest.web_accessible_resources[0].matches[0] === '<all_urls>', 'manifest.json host access must stay on the audited content-script and web-accessible-resource <all_urls> surfaces.');
for (const key of Object.keys(manifest)) assertCondition(allowedManifestKeys.has(key), `manifest.json contains an unaudited top-level key: ${key}`);
assertCondition(!('chrome_settings_overrides' in manifest), 'manifest.json must not change browser search, homepage, or startup settings.');
assertCondition(!('optional_permissions' in manifest) && !('host_permissions' in manifest) && !('optional_host_permissions' in manifest), 'manifest.json must keep host access and permissions inside the audited required surfaces.');
assertCondition(!('externally_connectable' in manifest) && !('oauth2' in manifest), 'manifest.json must not expose external messaging or OAuth surfaces without an audit.');
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
assertCondition(packageJson.description === englishDescription, 'package.json description must match the English manifest summary.');
assertCondition(englishDescription.length > 0 && englishDescription.length <= 132 && !/\n/.test(englishDescription) && /^[A-Z].+\.$/.test(englishDescription) && !/[!?]/.test(englishDescription), 'English manifest description must be a single direct sentence that fits Chrome Web Store summary length.');
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
    /required isolated target-browser smoke check/i,
    /not part of the automated package or release gates/i,
    /cannot close active user windows or unsaved work/i,
    /npm run verify:release/i,
    /PRIVACY\.md/,
    /GPL-3\.0-only/,
    /Reset extension data/i,
    /plans/i,
    /Pomodoro/i,
    /intent coherence/i,
    /UI cleanup/i,
    /extension-owned overlay/i,
    /remote network requests/i,
    /assets\/icons/,
    /store\/store-listing/,
    /docs\/permission-audit\.md/,
    /docs\/localization\.md/,
    /docs\/store-media-review\.md/,
    /docs\/release-notes\.md/,
    /docs\/decision-records\.md/,
    /docs\/code-structure\.md/,
    /docs\/extension-modularization-playbook\.md/,
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
assertCondition(privacySectionIndex !== -1 && licenseSectionIndex > privacySectionIndex && sourceLineIndex > licenseSectionIndex && supportSectionIndex > sourceLineIndex, 'README Support block must appear after the Privacy and License/source sections.');
assertCondition(readme.includes(canonicalReadmeSupportBlock), 'README Support block must match the canonical donation wording and links.');
assertCondition(hasAll(popupHtml, [/Protection status/, /Current page/, /role="tablist"/, /data-popup-pane="actions"/, /data-popup-pane="diagnostics"/, /focusStateCalmButton/, /startPomodoroButton/, /intentRecoveryTitle/, /pickElementButton/, /role="status"/]) && !/welcome|get started|learn more|hero|tagline/i.test(popupHtml), 'Popup first screen must stay an operational status/control surface, not a marketing page.');
assertCondition(hasAll(optionsHtml, [/id="optionsSidebarNav"/, /id="plansPanel"/, /id="planNameInput"/, /id="addPlanButton"/, /id="elementRulesPanel"/, /id="intentDiagnosticsPanel"/, /id="usageStatsPanel"/, /id="settingsPanel"/]) && optionsHtml.indexOf('id="plansPanel"') < optionsHtml.indexOf('id="elementRulesPanel"') && !/welcome|get started|hero|tagline/i.test(optionsHtml), 'Options page must expose plan creation first and stay a settings surface, not a landing page.');
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
const privacyPermissionBullets = [...privacy.matchAll(/^- `([^`]+)`: /gm)].map(match => match[1]);
assertCondition(privacyPermissionBullets.length === manifestPermissions.length && manifestPermissions.every(permission => privacyPermissionBullets.includes(permission)), 'PRIVACY.md permission bullets must exactly match manifest permissions.');
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
    /`webRequest`/,
    /chrome_settings_overrides/,
    /externally_connectable/
  ]),
  'Permission audit must explain host access, removal triggers, and deliberately unrequested broad permissions.'
);
assertCondition(/src\/platform\/chrome\/downloads\.js/.test(permissionAudit), 'Permission audit must point downloads permission API evidence at the platform wrapper.');
assertCondition(/src\/platform\/chrome\/alarms\.js/.test(permissionAudit), 'Permission audit must point alarms permission API evidence at the platform wrapper.');
assertCondition(/src\/platform\/chrome\/navigation\.js/.test(permissionAudit), 'Permission audit must point webNavigation permission API evidence at the platform wrapper.');
assertCondition(/chrome\.action\.onClicked/.test(actionWrapper) && /chrome\.action\.setBadgeText/.test(actionWrapper), 'Chrome action platform wrapper must own toolbar action click listener registration and badge text updates.');
assertCondition(/chrome\.alarms\.create/.test(alarmsWrapper) && /chrome\.alarms\.clear/.test(alarmsWrapper) && /chrome\.alarms\.onAlarm/.test(alarmsWrapper) && /runtime\.lastError/.test(alarmsWrapper), 'Chrome alarms platform wrapper must own chrome.alarms create/clear/listener and runtime.lastError handling.');
assertCondition([pomodoroChromeStorageModule, pomodoroInitializerModule, scheduleMonitorModule].every(text => /platform\/chrome\/alarms\.js/.test(text) && !/chrome\.alarms\./.test(text)), 'Background Pomodoro and schedule monitor modules must use the alarms platform wrapper instead of raw chrome.alarms callbacks.');
assertCondition(/chrome\.idle/.test(idleWrapper) && /setDetectionInterval/.test(idleWrapper) && /onStateChanged/.test(idleWrapper) && /queryState/.test(idleWrapper), 'Chrome idle platform wrapper must own idle detection interval, listener, and initial state query.');
assertCondition(/platform\/chrome\/idle\.js/.test(pomodoroInitializerModule) && !/chrome\.idle/.test(pomodoroInitializerModule), 'Background Pomodoro initializer must use the idle platform wrapper instead of raw chrome.idle calls.');
assertCondition(/chrome\.webNavigation\.onCommitted/.test(navigationWrapper) && /chrome\.webNavigation\.onHistoryStateUpdated/.test(navigationWrapper), 'Chrome navigation platform wrapper must own webNavigation committed and history-state listener registration.');
assertCondition(/chrome\.downloads\.download/.test(downloadsWrapper) && /runtime\.lastError/.test(downloadsWrapper), 'Chrome downloads platform wrapper must own chrome.downloads.download and runtime.lastError handling.');
assertCondition(/chrome\.i18n\?\.getMessage/.test(i18nWrapper) && /chrome\.i18n\?\.getUILanguage/.test(i18nWrapper), 'Chrome i18n platform wrapper must own localized message and UI language access.');
assertCondition(/platform\/chrome\/downloads\.js/.test(storageTransferModule) && !/chrome\.downloads\.download/.test(storageTransferModule), 'Options storage transfer must use the downloads platform wrapper instead of raw chrome.downloads.download.');
assertCondition(/chrome\.runtime\.onInstalled/.test(runtimeWrapper) && /chrome\.runtime\.onStartup/.test(runtimeWrapper) && /chrome\.runtime\.onMessage/.test(runtimeWrapper) && /chrome\.runtime\.getManifest/.test(runtimeWrapper) && /runtime.*getURL/.test(runtimeWrapper) && /chrome\.runtime\.openOptionsPage/.test(runtimeWrapper), 'Chrome runtime platform wrapper must own lifecycle listeners, message listeners, manifest, extension URL, and options-page helpers.');
assertCondition([appBackgroundModule, backgroundDefaultsModule, pomodoroInitializerModule, releaseNoticeModule, scheduleMonitorModule, intentMessagesModule, popupIndexModule, popupChromeModule, popupDiagnosticsExportModule].every(text => /platform\/chrome\/runtime\.js/.test(text) && !/chrome\.runtime\.(?:onInstalled|onStartup|onMessage|getManifest|getURL|openOptionsPage)/.test(text)), 'Migrated background and popup modules must use the runtime platform wrapper instead of raw chrome.runtime lifecycle/helpers.');
assertCondition(/chrome\.runtime\.sendMessage/.test(runtimeMessagesWrapper) && /runtime\.lastError/.test(runtimeMessagesWrapper), 'Chrome runtime-message platform wrapper must own chrome.runtime.sendMessage and runtime.lastError handling.');
assertCondition(/chrome\.tabs\.query/.test(tabsWrapper) && /chrome\.tabs\.get/.test(tabsWrapper) && /chrome\.tabs\.create/.test(tabsWrapper) && /chrome\.tabs\.sendMessage/.test(tabsWrapper) && /chrome\.tabs\.update/.test(tabsWrapper) && /chrome\.tabs\.remove/.test(tabsWrapper) && /chrome\.tabs\.move/.test(tabsWrapper) && /chrome\.tabs\.discard/.test(tabsWrapper) && /chrome\.tabs\.onActivated/.test(tabsWrapper) && /chrome\.tabs\.onCreated/.test(tabsWrapper) && /chrome\.tabs\.onRemoved/.test(tabsWrapper) && /chrome\.tabs\.onUpdated/.test(tabsWrapper) && /runtime\.lastError/.test(tabsWrapper), 'Chrome tabs platform wrapper must own tab query/get/create/message/update/remove/move/discard plus lifecycle listener registration.');
assertCondition([popupChromeModule, elementPickerLauncherModule].every(text => /platform\/chrome\/tabs\.js/.test(text) && !/chrome\.tabs\./.test(text) && !/chrome\.runtime\.lastError/.test(text)), 'Popup tab helpers must use the tabs platform wrapper instead of raw chrome.tabs callbacks.');
assertCondition(/platform\/chrome\/tabs\.js/.test(pomodoroNotificationsModule) && !/chrome\.tabs\./.test(pomodoroNotificationsModule) && !/chrome\.runtime\.lastError/.test(pomodoroNotificationsModule), 'Background Pomodoro notifications must use the tabs platform wrapper instead of raw chrome.tabs callbacks.');
assertCondition(/chrome\.windows\.onFocusChanged/.test(windowsWrapper) && /chrome\.windows\.create/.test(windowsWrapper) && /WINDOW_ID_NONE/.test(windowsWrapper), 'Chrome windows platform wrapper must own focus-change listener registration, window creation, and no-focused-window id access.');
assertCondition([appBackgroundModule, intentInitializerModule, pomodoroInitializerModule].every(text => /platform\/chrome\/(?:action|navigation|tabs|windows)\.js/.test(text) && !/chrome\.(?:action\.onClicked|tabs\.on(?:Activated|Created|Removed|Updated)|webNavigation|windows\.(?:onFocusChanged|WINDOW_ID_NONE))/.test(text)), 'Migrated background event modules must use platform wrappers instead of raw action/tab/navigation/window listener registration.');
assertCondition(/platform\/chrome\/action\.js/.test(contentBlockingBackgroundModule) && /platform\/chrome\/tabs\.js/.test(contentBlockingBackgroundModule) && !/chromeApi|chrome\.(?:action|tabs|runtime)|runtime\.lastError/.test(contentBlockingBackgroundModule), 'Content-blocking background runtime must use platform wrappers instead of raw chrome action/tabs/runtime callbacks.');
assertCondition(/platform\/chrome\/tabs\.js/.test(blockedTabMuteModule) && !/chromeApi|chrome\.tabs|runtime\.lastError/.test(blockedTabMuteModule), 'Blocked tab mute controller must use the tabs platform wrapper instead of raw chrome tab callbacks.');
assertCondition(/platform\/chrome\/tabs\.js/.test(intentChromeApiModule) && /platform\/chrome\/windows\.js/.test(intentChromeApiModule) && /platform\/chrome\/runtime\.js/.test(intentChromeApiModule) && !/chrome\.(?:tabs|windows|runtime)|runtime\.lastError/.test(intentChromeApiModule), 'Background intent Chrome adapter must use platform wrappers instead of raw chrome tabs/windows/runtime callbacks.');
assertCondition(/platform\/chrome\/storage\.js/.test(blockedPageChromeApiModule) && /platform\/chrome\/runtimeMessages\.js/.test(blockedPageChromeApiModule) && /platform\/chrome\/runtime\.js/.test(blockedPageChromeApiModule) && !/chrome\.(?:storage|runtime)|runtime\.lastError/.test(blockedPageChromeApiModule), 'Blocked-page Chrome facade must use platform wrappers instead of raw chrome storage/runtime callbacks.');
assertCondition(/platform\/chrome\/i18n\.js/.test(blockedPageLocalizationModule) && /platform\/chrome\/runtime\.js/.test(blockedPageLocalizationModule) && !/chrome\.(?:i18n|runtime)/.test(blockedPageLocalizationModule), 'Blocked-page localization must use platform wrappers instead of raw chrome i18n/runtime helpers.');
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
failures.push(...getStoreAutomationFailures({ storePrivacyForm, storeAdditionalFields, storeCategory, manifestPermissions }));
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
    /Reviewed Asset Hashes/,
    /SHA-256/,
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
failures.push(...await verifyReviewedStoreMediaHashes(rootDir, storeMediaAssetPaths, storeMediaReview));

assertCondition(/Host access through content scripts \(`<all_urls>`\)/i.test(privacy), 'PRIVACY.md must explain exact <all_urls> host/content-script access.');
assertCondition(/chrome\.storage\.sync/.test(privacy), 'PRIVACY.md must mention sync storage.');
assertCondition(/chrome\.storage\.local/.test(privacy), 'PRIVACY.md must mention local storage.');
assertCondition(/does not use `chrome\.storage\.session` or `chrome\.storage\.managed`/i.test(privacy), 'PRIVACY.md must state session and managed storage are not used.');
assertCondition(/does not sell user data/i.test(privacy), 'PRIVACY.md must state user data is not sold.');
assertCondition(/does not transfer user data to third parties/i.test(privacy), 'PRIVACY.md must state user data is not transferred to third parties.');
assertCondition(/does not make remote network requests from the runtime extension package/i.test(privacy), 'PRIVACY.md must state whether the runtime extension package makes remote network requests.');
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
    /Store Media Review/i,
    /cannot close active browser windows or unsaved work/i
  ]),
  'Release notes document must cover the current version, changelog source, release gate, source archive, media, network posture, and isolated browser-load safety.'
);
assertCondition(/Run `npm run verify:browser-load` only in an isolated browser environment[\s\S]+Load the extension zip or unpacked project in an isolated Chromium-based browser\/profile/i.test(releaseChecklist), 'Release checklist must isolate browser-load and manual browser QA from active user sessions.');
assertCondition(/localized store listings preserve the current plan, allowed-website, Pomodoro, intent-coherence, and browser-limitation wording/i.test(releaseChecklist), 'Release checklist must require localized store listings to stay aligned with the current product model.');
assertCondition(hasAll(releaseVerifier, [/check-manifest-references\.mjs/, /check-relative-imports\.mjs/, /check-browser-extension-playbook\.mjs/, /check-locale-coverage\.mjs/, /check-static-localization\.mjs/, /check-package-output\.mjs/, /"assets\/", "docs\/", "store\/", "test\/", "_locales\/", "scripts\/", "src\/"/]), 'Release verifier must run manifest, import, playbook, locale, static-localization, package-output, and source-archive prefix gates.');
failures.push(...await getReleaseSafetyFailures(rootDir, packageJson));

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

assertCondition(
  hasAll(codeStructure, [
    /## Test Structure/,
    /test\/features\//,
    /test\/platform\/chrome\//,
    /test\/scripts\//,
    /scripts\/playbook\//,
    /Extension Modularization Playbook/,
    /repository validation and release scripts/i,
    /isolated browser environment/i
  ]),
  'Code structure document must map feature, platform, and repository-script test ownership.'
);
assertCondition(hasAll(localizationDoc, [/Chrome Web Store Visible Languages/, /en_AU/, /Persian \(`fa`\)/, /Arabic \(`ar`\), Persian \(`fa`\), Hebrew \(`he`\), and Urdu \(`ur`\) are right-to-left locales/, /without changing the host page direction/, /store\/store-listing\/<locale>\.txt/, /npm run verify:locales/]), 'Localization document must cover visible store languages, RTL locales, store-listing coverage, and locale verification.');

for (const storageKeyFamily of storageKeyFamilies) {
  assertCondition(
    storageOwnership.includes(`\`${storageKeyFamily}\``),
    `Storage ownership document must cover ${storageKeyFamily}.`
  );
}

const resetMessages = [englishMessages.resetExtensionButton?.message, englishMessages.resetExtensionHint?.message, englishMessages.resetExtensionConfirm?.message, englishMessages.resetExtensionLockedError?.message].join('\n');
assertCondition(
  /id="resetExtensionButton"/.test(optionsHtml)
    && /id="resetExtensionHint"/.test(optionsHtml)
    && /id="resetExtensionStatus"[^>]*aria-live="polite"/.test(optionsHtml)
    && /confirm\(getMessage\('resetExtensionConfirm'\)\)/.test(storageTransferModule)
    && hasAll(resetMessages, [/Reset extension data/i, /Reset all/i, /Export first/i, /cannot be undone/i, /active protected schedule/i]),
  'Options UI must expose an explicit localized reset path with confirmation, backup warning, irreversible warning, and protected-schedule lockout.'
);

assertCondition(
  hasAll(reviewerNotes, [
    /file:\/\/.+Allow access to file URLs/is,
    /incognito.+explicitly allow/is,
    /browser-controlled behavior/i,
    /Manifest V3 service workers can sleep and restart/i,
    /cannot guarantee behavior that Chrome itself withholds/i,
    /runtime package excludes docs, the repository research workspace, tests, scripts, screenshots, promo images, store listing text, and source-only icon files/i
  ]),
  'Reviewer notes must cover file URLs, incognito, browser-controlled behavior, MV3 restart behavior, and package contents.'
);

const locales = await getLocaleDirectories();
const localeSet = new Set(locales);
const storeListingEntries = await getDirectoryEntries('store/store-listing');
const storeListingTextLocales = storeListingEntries
  .filter((entry) => entry.isFile && entry.name.endsWith('.txt'))
  .map((entry) => entry.name.slice(0, -'.txt'.length))
  .sort((left, right) => left.localeCompare(right));
const unexpectedStoreListingEntries = storeListingEntries
  .filter((entry) => !entry.isFile || !entry.name.endsWith('.txt'))
  .map((entry) => entry.name);

assertCondition(unexpectedStoreListingEntries.length === 0, `Store listing folder must contain only direct .txt locale files: ${unexpectedStoreListingEntries.join(', ')}.`);
assertCondition(storeListingTextLocales.length === locales.length, 'Store listing locale count must exactly match _locales.');
for (const listingLocale of storeListingTextLocales) {
  assertCondition(localeSet.has(listingLocale), `Store listing file has no matching _locales directory: ${listingLocale}.txt`);
}
for (const locale of locales) {
  const listingPath = `store/store-listing/${locale}.txt`;
  assertCondition(await exists(listingPath), `Missing store listing for locale: ${locale}`);

  if (!(await exists(listingPath))) {
    continue;
  }

  const listing = await readText(listingPath);
  const listingLines = listing.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
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
    !/^(name|summary|description|detailed description|category|homepage url|support url|official url|mature content|privacy fields)\s*:/im.test(listing),
    `${listingPath} must not contain Chrome Web Store dashboard field labels.`
  );
  assertCondition(
    !/^(defen[sc]e against distractions)\b/i.test(firstLine),
    `${listingPath} must not start with the extension name.`
  );
  assertCondition(listing.includes(repositoryUrl), `${listingPath} must include the GitHub URL.`);
  assertCondition(/GPL-3\.0/.test(listing), `${listingPath} must include GPL-3.0 license disclosure.`);
  assertCondition(listingLines.at(-2) === 'GPL-3.0 license:' && listingLines.at(-1) === repositoryUrl, `${listingPath} must end with the canonical license and GitHub footer.`);
  assertCondition(!/buymeacoffee|patreon/i.test(listing), `${listingPath} must not include donation links.`);
  assertCondition(
    listingVersionMentions.length === 0,
    `${listingPath} mentions stale or unsynchronized version numbers: ${listingVersionMentions.join(', ')}.`
  );
  assertCondition(/Pomodoro/i.test(listing) && /intent coherence/i.test(listing) && /incognito/i.test(listing) && /file URL/i.test(listing) && /DaD/i.test(listing), `${listingPath} must keep localized listing copy aligned with Pomodoro, intent coherence, and browser-controlled access limitations.`);
  assertCondition(!/\b(guarantee[sd]?|perfect|scientifically proven|clinically proven|cure[sd]?|ADHD|medical|therapy|therapeutic|mental health|knows your true intent|true intention|attention residue|permanent attention damage|objectively useless)\b/i.test(listing), `${listingPath} must avoid inflated, medical, or mind-reading claims.`);

  if (englishStoreListingLocales.has(locale)) {
    assertCondition(!listing.includes(englishDescription), `${listingPath} must not paste the short Chrome Web Store summary into the direct detailed-description body.`);
    assertCondition(
      /plans/i.test(listing) && /allowed websites/i.test(listing) && /intent coherence/i.test(listing) && /You can use it to protect/i.test(listing) && /Main features:/i.test(listing) && /Browser notes:/i.test(listing) && /What is new in version/i.test(listing) && /incognito/i.test(listing) && /file URL/i.test(listing) && /open source/i.test(listing),
      `${listingPath} must describe examples, features, current plan-based UI model, browser-controlled limitations, current-version notes, and open-source footer.`
    );
    assertCondition(
      !/create groups of websites|website and keyword groups|whitelists/i.test(listing),
      `${listingPath} must not use retired group or whitelist wording.`
    );
  }
}

if (failures.length === 0) {
  const platformBoundaryCheck = spawnSync(process.execPath, ['scripts/check-platform-boundaries.mjs'], { cwd: rootDir, encoding: 'utf8' });
  if (platformBoundaryCheck.status !== 0) {
    failures.push(`Platform boundary verification failed:\n${platformBoundaryCheck.stdout}${platformBoundaryCheck.stderr}`.trim());
  }
}
if (failures.length === 0) {
  const staticLocalizationCheck = spawnSync(process.execPath, ['scripts/check-static-localization.mjs'], { cwd: rootDir, encoding: 'utf8' });
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
