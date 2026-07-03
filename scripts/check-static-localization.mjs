// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { getDataI18nAttributeFailures } from './static-localization/htmlAttributes.mjs';

const rootDir = process.cwd();
const htmlFiles = [
  'src/options.html',
  'src/instructions.html',
  'src/popup.html',
  'src/blocked.html'
];
const runtimeValuePattern = /^(?:--|0|0s|0:00|0 ?\/ ?160|0\/280|0% active \/ 0% visits)$/;
const checkedAttributes = ['aria-label', 'title', 'placeholder'];
const fallbackMessageMaps = [
  ['src/js/popup/i18n.js', 'POPUP_MESSAGES'],
  ['src/js/content/intent/messages.js', 'INTENT_MESSAGES'],
  ['src/js/options/storageTransfer.js', 'FALLBACK_MESSAGES'],
  ['src/js/options/password/manager.js', 'PASSWORD_MESSAGES'],
  ['src/js/options/billing.js', 'BILLING_MESSAGES'],
  ['src/js/options/localization.js', 'FALLBACK_MESSAGES'],
  ['src/js/options/settings/blockedPageSettings.js', 'FALLBACK_MESSAGES'],
  ['src/js/options/plans/messages.js', 'PLAN_MESSAGES'],
  ['src/js/options/element-rules/constants.js', 'ELEMENT_RULE_MESSAGES'],
  ['src/js/content/ui-blocking/pickerPanel.js', 'PICKER_MESSAGES']
];

const failures = [];

async function readText(relativePath) {
  return readFile(path.join(rootDir, relativePath), 'utf8');
}

async function getJsFiles(relativeDir) {
  const absoluteDir = path.join(rootDir, relativeDir);
  const entries = await readdir(absoluteDir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const relativePath = `${relativeDir}/${entry.name}`;
    if (entry.isDirectory()) {
      files.push(...await getJsFiles(relativePath));
    } else if (entry.isFile() && entry.name.endsWith('.js')) {
      files.push(relativePath);
    }
  }

  return files;
}

function stripHtmlComments(html) {
  return html
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<script\b[\s\S]*?<\/script>/gi, '')
    .replace(/<style\b[\s\S]*?<\/style>/gi, '');
}

function decodeBasicEntities(text) {
  return text
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function normalizeText(text) {
  return decodeBasicEntities(text).replace(/\s+/g, ' ').trim();
}

function getAttribute(attributes, name) {
  const match = attributes.match(new RegExp(`\\b${name}=([\"'])(.*?)\\1`, 'i'));
  return match ? match[2] : '';
}

function hasAttribute(attributes, name) {
  return new RegExp(`\\b${name}(?:\\s*=|\\s|>|$)`, 'i').test(attributes);
}

function findConstBlock(source, name) {
  const marker = `const ${name} =`;
  const markerIndex = source.indexOf(marker);
  if (markerIndex === -1) {
    return '';
  }

  const firstBrace = source.indexOf('{', markerIndex);
  const firstBracket = source.indexOf('[', markerIndex);
  const start = [firstBrace, firstBracket]
    .filter(index => index !== -1)
    .sort((left, right) => left - right)[0];
  if (start === undefined) {
    return '';
  }

  const open = source[start];
  const close = open === '{' ? '}' : ']';
  let depth = 0;
  let quote = '';
  let escaped = false;

  for (let index = start; index < source.length; index += 1) {
    const char = source[index];
    if (quote) {
      if (escaped) {
        escaped = false;
      } else if (char === '\\') {
        escaped = true;
      } else if (char === quote) {
        quote = '';
      }
      continue;
    }

    if (char === '"' || char === "'") {
      quote = char;
      continue;
    }

    if (char === open) {
      depth += 1;
    } else if (char === close) {
      depth -= 1;
      if (depth === 0) {
        return source.slice(start, index + 1);
      }
    }
  }

  return '';
}

function getObjectKeys(source, constName) {
  const block = findConstBlock(source, constName);
  const keys = new Set();
  for (const match of block.matchAll(/^\s*(?:['"]([^'"]+)['"]|([A-Za-z_$][\w$]*))\s*:/gm)) {
    keys.add(match[1] || match[2]);
  }
  return keys;
}

function getNestedObjectKeys(source, constName) {
  const block = findConstBlock(source, constName);
  const keys = new Set();
  for (const match of block.matchAll(/^\s*(?:['"]([^'"]+)['"]|([A-Za-z_$][\w$]*))\s*:\s*{/gm)) {
    keys.add(match[1] || match[2]);
  }
  return keys;
}

function getStringArrayValues(source, constName) {
  const block = findConstBlock(source, constName);
  return new Set([...block.matchAll(/["']([^"']+)["']/g)].map(match => match[1]));
}

function getMessageKeysFromObjectValues(source, constName) {
  const block = findConstBlock(source, constName);
  return new Set([...block.matchAll(/:\s*['"]([^'"]+)['"]/g)].map(match => match[1]));
}

function getMessageKeysFromNestedAttributes(source, constName) {
  const block = findConstBlock(source, constName);
  return new Set([...block.matchAll(/['"](?:aria-label|title|placeholder)['"]\s*:\s*['"]([^'"]+)['"]/g)].map(match => match[1]));
}

function getLocalizedSurfaceConfig(optionsLocalization, instructionsEntry) {
  const optionsTextIds = getObjectKeys(optionsLocalization, 'LOCALIZED_TEXT');
  const optionsPlaceholderIds = getObjectKeys(optionsLocalization, 'LOCALIZED_PLACEHOLDERS');
  const optionsAttributeIds = getNestedObjectKeys(optionsLocalization, 'LOCALIZED_ATTRIBUTES');
  const instructionTextIds = getStringArrayValues(instructionsEntry, 'LOCALIZED_CONTENT_IDS');

  return {
    localizedTextIdsByFile: new Map([
      ['src/options.html', optionsTextIds],
      ['src/instructions.html', instructionTextIds],
      ['src/popup.html', new Set()],
      ['src/blocked.html', new Set(['pomodoroBlockPhase'])]
    ]),
    localizedAttributeIdsByFile: new Map([
      ['src/options.html', new Set([...optionsPlaceholderIds, ...optionsAttributeIds])],
      ['src/instructions.html', new Set()],
      ['src/popup.html', new Set()],
      ['src/blocked.html', new Set()]
    ]),
    referencedMessageKeys: new Set([
      ...getMessageKeysFromObjectValues(optionsLocalization, 'LOCALIZED_TEXT'),
      ...getMessageKeysFromObjectValues(optionsLocalization, 'LOCALIZED_PLACEHOLDERS'),
      ...getMessageKeysFromNestedAttributes(optionsLocalization, 'LOCALIZED_ATTRIBUTES'),
      ...instructionTextIds
    ])
  };
}

function assertMessageKeysExist(messageKeys, englishMessages, sourceLabel) {
  for (const messageKey of messageKeys) {
    if (!Object.hasOwn(englishMessages, messageKey)) {
      failures.push(`_locales/en/messages.json is missing ${sourceLabel} localization key: ${messageKey}`);
    }
  }
}

function assertPlaceholderMessages(englishMessages, messageKeys) {
  for (const messageKey of messageKeys) {
    if (!/\$1/.test(englishMessages[messageKey]?.message || '')) {
      failures.push(`_locales/en/messages.json localization key must contain $1: ${messageKey}`);
    }
  }
}

function isLocalizedText({ file, attributes, id, config }) {
  if (hasAttribute(attributes, 'data-i18n')) {
    return true;
  }

  return Boolean(id && config.localizedTextIdsByFile.get(file)?.has(id));
}

function isLocalizedAttribute({ file, attributes, attributeName, id, config }) {
  if (hasAttribute(attributes, `data-i18n-${attributeName}`)) {
    return true;
  }

  return Boolean(id && config.localizedAttributeIdsByFile.get(file)?.has(id));
}

function scanDataI18nAttributes(file, tagName, attributes, englishMessages) {
  failures.push(...getDataI18nAttributeFailures({ file, tagName, attributes, englishMessages }));
}

function scanHtmlFile(file, html, config, englishMessages) {
  const cleanedHtml = stripHtmlComments(html);
  const textPattern = /<([a-z][\w:-]*)([^>]*)>([^<]*[A-Za-z][^<]*)</gi;
  const tagPattern = /<([a-z][\w:-]*)([^>]*)>/gi;

  for (const match of cleanedHtml.matchAll(textPattern)) {
    const [, tagName, attributes, rawText] = match;
    const text = normalizeText(rawText);
    if (!text || runtimeValuePattern.test(text)) {
      continue;
    }

    const id = getAttribute(attributes, 'id');
    if (!isLocalizedText({ file, attributes, id, config })) {
      failures.push(`${file}: <${tagName}${id ? ` id="${id}"` : ''}> static text is not localized: ${text}`);
    }
  }

  for (const match of cleanedHtml.matchAll(tagPattern)) {
    const [, tagName, attributes] = match;
    const id = getAttribute(attributes, 'id');
    scanDataI18nAttributes(file, tagName, attributes, englishMessages);
    for (const attributeName of checkedAttributes) {
      const value = normalizeText(getAttribute(attributes, attributeName));
      if (!value || !/[A-Za-z]/.test(value) || /^__MSG_[A-Za-z0-9_]+__$/.test(value)) {
        continue;
      }

      if (!isLocalizedAttribute({ file, attributes, attributeName, id, config })) {
        failures.push(`${file}: <${tagName}${id ? ` id="${id}"` : ''}> ${attributeName} is not localized: ${value}`);
      }
    }
  }
}

async function scanOptionsSourceFiles() {
  const optionsSourceFiles = await getJsFiles('src/js/options');

  for (const file of optionsSourceFiles) {
    const source = await readText(file);
    if (/chrome\.i18n\.getMessage/.test(source)) {
      failures.push(`${file}: use getUiMessage instead of raw chrome.i18n.getMessage so selected UI language is respected.`);
    }
  }
}

async function scanFallbackMessageMaps(englishMessages) {
  for (const [file, mapName] of fallbackMessageMaps) {
    const source = await readText(file);
    const messageKeys = getObjectKeys(source, mapName);

    if (messageKeys.size === 0) {
      failures.push(`${file}: ${mapName} fallback message map was not found.`);
      continue;
    }

    assertMessageKeysExist(messageKeys, englishMessages, `${file} ${mapName}`);
  }
}

async function scanElementRuleSourceFiles(englishMessages) {
  const [
    elementRuleConstants,
    elementRules,
    elementRuleItem,
    elementRuleStorage,
    pickerPanel,
    pickerController
  ] = await Promise.all([
    readText('src/js/options/element-rules/constants.js'),
    readText('src/js/options/elementRules.js'),
    readText('src/js/options/element-rules/ruleItem.js'),
    readText('src/js/options/element-rules/storage.js'),
    readText('src/js/content/ui-blocking/pickerPanel.js'),
    readText('src/js/content/ui-blocking/controller.js')
  ]);
  const elementRuleMessageKeys = getObjectKeys(elementRuleConstants, 'ELEMENT_RULE_MESSAGES');
  const pickerMessageKeys = getObjectKeys(pickerPanel, 'PICKER_MESSAGES');
  const requiredElementRuleRenderKeys = [
    'elementRuleStorageReserveLabel',
    'elementRuleStorageCountPlural',
    'elementRulePlanAssignmentLabel',
    'elementRuleGlobalPlanAssignment',
    'elementRuleDiagnosticsHeading',
    'elementRuleMetaRuleId',
    'elementRuleDefaultName',
    'elementRuleScoreSummary',
    'elementRuleUseDomainButton'
  ];
  const requiredPickerErrorKeys = [
    'elementPickerSaveErrorMessage',
    'elementPickerStorageUnavailableError',
    'elementPickerProtectedReserveError',
    'elementPickerLegacyRemoveError'
  ];
  const placeholderKeys = [
    'elementRuleDepthSummary',
    'elementRuleDisabledPlanName',
    'elementRulePlanScope',
    'elementRuleScoreSummary',
    'elementRuleStorageCountPlural',
    'elementRuleStorageCountSingular',
    'elementRuleStorageReserveLabel',
    'elementRuleStorageReserveLow',
    'elementRuleStorageRuleBytes',
    'elementRuleStorageSyncUsage'
  ];
  const combinedElementRuleRenderSource = `${elementRules}\n${elementRuleItem}\n${elementRuleStorage}`;

  assertMessageKeysExist(elementRuleMessageKeys, englishMessages, 'element-rule');
  assertMessageKeysExist(pickerMessageKeys, englishMessages, 'element-picker');
  assertPlaceholderMessages(englishMessages, placeholderKeys);

  for (const messageKey of requiredElementRuleRenderKeys) {
    if (!combinedElementRuleRenderSource.includes(messageKey)) {
      failures.push(`Element-rule options UI must render through localized message key: ${messageKey}`);
    }
  }

  for (const messageKey of requiredPickerErrorKeys) {
    if (!pickerPanel.includes(messageKey) && !pickerController.includes(messageKey)) {
      failures.push(`Element picker must expose localized save-error key: ${messageKey}`);
    }
  }

  if (/['"`](?:Locked schedule reserve|Plan assignment|Global rule\. Create a plan|Diagnostics|Rule ID|Use domain)['"`]/.test(combinedElementRuleRenderSource)) {
    failures.push('Element-rule options UI must not render hardcoded English labels for storage, plan assignment, diagnostics, or actions.');
  }

  if (/pickerPanel\.setMessage\(error\?\.message/.test(pickerController) || /alert\(error\?\.message/.test(elementRuleItem)) {
    failures.push('Element-rule picker and options alerts must render localized error keys instead of raw Error.message text.');
  }
}

const [
  optionsLocalization,
  instructionsEntry,
  englishMessagesText,
  ...htmlTexts
] = await Promise.all([
  readText('src/js/options/localization.js'),
  readText('src/app/instructions/index.js'),
  readText('_locales/en/messages.json'),
  ...htmlFiles.map(file => readText(file))
]);

const englishMessages = JSON.parse(englishMessagesText);
const config = getLocalizedSurfaceConfig(optionsLocalization, instructionsEntry);

for (const messageKey of config.referencedMessageKeys) {
  if (!Object.hasOwn(englishMessages, messageKey)) {
    failures.push(`_locales/en/messages.json is missing static localization key: ${messageKey}`);
  }
}

htmlFiles.forEach((file, index) => scanHtmlFile(file, htmlTexts[index], config, englishMessages));
await scanOptionsSourceFiles();
await scanFallbackMessageMaps(englishMessages);
await scanElementRuleSourceFiles(englishMessages);

if (failures.length === 0) {
  console.log(`Static localization check passed: ${htmlFiles.length} extension HTML surfaces scanned.`);
  process.exit(0);
}

console.error('Static localization check failed.');
console.error('');
failures.forEach(failure => console.error(`- ${failure}`));
process.exit(1);
