// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import {
  applyUiLanguageAttributes,
  formatLocalizedMessage,
  getUiLanguageDirection,
  normalizeUiLanguage,
  setActiveUiLanguage
} from '../../../src/js/shared/ui/uiLanguage.js';

const EXPECTED_RTL_CODES = ['ar', 'fa', 'he', 'ur'];

describe('UI language helpers', () => {
  it('normalizes supported browser locale codes', () => {
    assert.equal(normalizeUiLanguage('system'), 'system');
    assert.equal(normalizeUiLanguage('de-DE'), 'de');
    assert.equal(normalizeUiLanguage('pt-BR'), 'pt_BR');
    assert.equal(normalizeUiLanguage('es-419'), 'es_419');
    assert.equal(normalizeUiLanguage('unknown-locale'), 'system');
  });

  it('resolves right-to-left UI direction for Arabic and other RTL locales', () => {
    assert.equal(getUiLanguageDirection('ar'), 'rtl');
    assert.equal(getUiLanguageDirection('ar-SA'), 'rtl');
    assert.equal(getUiLanguageDirection('fa'), 'rtl');
    assert.equal(getUiLanguageDirection('he'), 'rtl');
    assert.equal(getUiLanguageDirection('ur'), 'rtl');
    assert.equal(getUiLanguageDirection('en'), 'ltr');
    assert.equal(getUiLanguageDirection('de-DE'), 'ltr');
  });

  it('applies Arabic right-to-left attributes to extension page roots', async () => {
    const previousFetch = globalThis.fetch;
    globalThis.fetch = async () => ({
      ok: true,
      json: async () => ({})
    });

    try {
      await setActiveUiLanguage('ar');
      const element = createAttributeTarget();
      const attributes = applyUiLanguageAttributes(element);

      assert.deepEqual(attributes, { lang: 'ar', dir: 'rtl' });
      assert.equal(element.attributes.lang, 'ar');
      assert.equal(element.attributes.dir, 'rtl');
      assert.equal(element.dataset.uiDirection, 'rtl');
    } finally {
      await setActiveUiLanguage('en');
      globalThis.fetch = previousFetch;
    }
  });

  it('applies right-to-left attributes when system Chrome language is Arabic', async () => {
    const previousChrome = globalThis.chrome;
    globalThis.chrome = {
      i18n: {
        getUILanguage: () => 'ar-SA',
        getMessage: () => ''
      }
    };

    try {
      await setActiveUiLanguage('system');
      const element = createAttributeTarget();
      const attributes = applyUiLanguageAttributes(element);

      assert.deepEqual(attributes, { lang: 'ar', dir: 'rtl' });
      assert.equal(element.attributes.lang, 'ar');
      assert.equal(element.attributes.dir, 'rtl');
      assert.equal(element.dataset.uiDirection, 'rtl');
    } finally {
      globalThis.chrome = previousChrome;
      await setActiveUiLanguage('en');
    }
  });

  it('formats Chrome-style named and positional placeholders', () => {
    assert.equal(formatLocalizedMessage({
      message: 'Selected $LANGUAGE$ for $1',
      placeholders: {
        language: { content: '$2' }
      }
    }, ['DaD', 'Deutsch']), 'Selected Deutsch for DaD');
  });

  it('keeps right-to-left locale lists synchronized across UI surfaces and docs', () => {
    const sharedUiLanguage = readFileSync('src/js/shared/ui/uiLanguage.js', 'utf8');
    const contentUiLanguage = readFileSync('src/js/content/uiLanguage.js', 'utf8');
    const blockedPageLocalization = readFileSync('src/features/content-blocking/blocked-page/localization.js', 'utf8');
    const localizationDoc = readFileSync('docs/localization.md', 'utf8');

    assert.deepEqual(getSetValues(sharedUiLanguage, 'RTL_UI_LANGUAGE_BASE_CODES'), EXPECTED_RTL_CODES);
    assert.deepEqual(getSetValues(contentUiLanguage, 'RTL_LANGUAGE_CODES'), EXPECTED_RTL_CODES);
    assert.deepEqual(getSetValues(blockedPageLocalization, 'RTL_LANGUAGE_CODES'), EXPECTED_RTL_CODES);
    assert.match(
      localizationDoc,
      /Arabic \(`ar`\), Persian \(`fa`\), Hebrew \(`he`\), and Urdu \(`ur`\) are right-to-left locales/
    );
    assert.match(localizationDoc, /Keep the RTL locale list synchronized across shared UI helpers, classic content-script UI, blocked-page localization, and this document/);
  });
});

function createAttributeTarget() {
  return {
    attributes: {},
    dataset: {},
    setAttribute(name, value) {
      this.attributes[name] = value;
    }
  };
}

function getSetValues(source, constName) {
  const escapedName = constName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = source.match(new RegExp(`const\\s+${escapedName}\\s*=\\s*new Set\\(\\[([^\\]]+)\\]\\)`));
  assert.ok(match, `Missing ${constName}`);
  return [...match[1].matchAll(/['"]([^'"]+)['"]/g)].map(valueMatch => valueMatch[1]);
}
