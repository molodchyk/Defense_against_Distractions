// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

import { access, readFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

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

function hasAll(text, patterns) {
  return patterns.every(pattern => pattern.test(text));
}

function getFirstNonEmptyLine(text) {
  return text
    .split(/\r?\n/)
    .map(line => line.trim())
    .find(Boolean) || '';
}

function getBracketBlock(text, blockName) {
  const blockMarker = `[${blockName}]`;
  const start = text.indexOf(blockMarker);
  if (start === -1) {
    return '';
  }

  const afterMarker = text.slice(start + blockMarker.length);
  const nextHeading = afterMarker.search(/^##\s+/m);
  return nextHeading === -1 ? afterMarker : afterMarker.slice(0, nextHeading);
}

function parseKeyedBlock(text, blockName) {
  const block = getBracketBlock(text, blockName);
  const fields = new Map();
  const fieldPattern = /^([A-Za-z0-9_.-]+):[ \t]*\r?\n([\s\S]*?)(?=^[A-Za-z0-9_.-]+:[ \t]*\r?\n|\s*$)/gm;

  for (const match of block.matchAll(fieldPattern)) {
    fields.set(match[1], match[2].trim());
  }

  return fields;
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
assertCondition(await exists('scripts/check-unpacked-extension-load.ps1'), 'Missing unpacked extension browser-load smoke script.');

const [
  manifest,
  packageJson,
  readme,
  privacy,
  licenseText,
  reviewerNotes,
  optionsHtml,
  englishMessages,
  storePrivacyForm,
  storeAdditionalFields,
  storeCategory,
  storageOwnership
] = await Promise.all([
  readJson('manifest.json'),
  readJson('package.json'),
  readText('README.md'),
  readText('PRIVACY.md'),
  readText('LICENSE'),
  readText('docs/reviewer-notes.md'),
  readText('src/options.html'),
  readJson('_locales/en/messages.json'),
  readText('docs/chrome-web-store-privacy-form.md'),
  readText('docs/chrome-web-store-additional-fields.md'),
  readText('docs/chrome-web-store-category.md'),
  readText('docs/storage-ownership.md')
]);

assertCondition(packageJson.version === manifest.version, 'package.json version must match manifest.json version.');
assertCondition(packageJson.license === licenseId, `package.json license must be ${licenseId}.`);
assertCondition(
  licenseText.includes('GNU GENERAL PUBLIC LICENSE') && licenseText.includes('Version 3'),
  'LICENSE must contain GPLv3 text.'
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
    /assets\/icons/,
    /store\/store-listing/,
    new RegExp(repositoryUrl.replaceAll('/', '\\/')),
    /Buy Me a Coffee/i,
    /Patreon/i
  ]),
  'README must cover product goal, load-unpacked steps, checks, privacy, support, license, and source URL.'
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
  packageJson.scripts?.['verify:browser-load']?.includes('scripts/check-unpacked-extension-load.ps1'),
  'package.json must expose npm run verify:browser-load for the unpacked browser-load smoke check.'
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
}

if (failures.length === 0) {
  console.log(`Browser extension playbook check passed: ${locales.length} localized store listings verified.`);
  process.exit(0);
}

console.error('Browser extension playbook check failed.');
console.error('');
failures.forEach(failure => console.error(`- ${failure}`));
process.exit(1);
