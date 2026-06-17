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

function hasAll(text, patterns) {
  return patterns.every(pattern => pattern.test(text));
}

for (const entry of requiredRootEntries) {
  assertCondition(await exists(entry), `Missing required playbook entry: ${entry}`);
}

assertCondition(await exists('store/store-listing'), 'Missing store listing source folder.');
assertCondition(await exists('assets/icons'), 'Missing packaged icon asset folder.');
assertCondition(await exists('store/promo'), 'Missing Chrome Web Store promotional image folder.');
assertCondition(await exists('store/screenshots'), 'Missing Chrome Web Store screenshot folder.');
assertCondition(!(await exists('LICENSE.txt')), 'Use standard LICENSE filename, not LICENSE.txt.');

const [manifest, packageJson, readme, privacy, licenseText] = await Promise.all([
  readJson('manifest.json'),
  readJson('package.json'),
  readText('README.md'),
  readText('PRIVACY.md'),
  readText('LICENSE')
]);

assertCondition(packageJson.version === manifest.version, 'package.json version must match manifest.json version.');
assertCondition(packageJson.license === licenseId, `package.json license must be ${licenseId}.`);
assertCondition(
  licenseText.includes('GNU GENERAL PUBLIC LICENSE') && licenseText.includes('Version 3'),
  'LICENSE must contain GPLv3 text.'
);

assertCondition(
  hasAll(readme, [
    /Defense Against Distractions/i,
    /Load unpacked/i,
    /npm run verify:release/i,
    /PRIVACY\.md/,
    /GPL-3\.0-only/,
    /assets\/icons/,
    /store\/store-listing/,
    new RegExp(repositoryUrl.replaceAll('/', '\\/')),
    /Buy Me a Coffee/i,
    /Patreon/i
  ]),
  'README must cover product goal, load-unpacked steps, checks, privacy, support, license, and source URL.'
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

const locales = await getLocaleDirectories();
for (const locale of locales) {
  const listingPath = `store/store-listing/${locale}.txt`;
  assertCondition(await exists(listingPath), `Missing store listing for locale: ${locale}`);

  if (!(await exists(listingPath))) {
    continue;
  }

  const listing = await readText(listingPath);
  assertCondition(!/[#*\[\]]/.test(listing), `${listingPath} must remain plain text, not Markdown.`);
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
