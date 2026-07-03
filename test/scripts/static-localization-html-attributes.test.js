// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { getDataI18nAttributeFailures } from '../../scripts/static-localization/htmlAttributes.mjs';

describe('static localization HTML attribute checks', () => {
  it('accepts direct HTML i18n keys that exist in the English locale', () => {
    const failures = getDataI18nAttributeFailures({
      file: 'src/popup.html',
      tagName: 'button',
      attributes: 'id="okButton" data-i18n="popupOkButton" data-i18n-aria-label="popupOkAriaLabel"',
      englishMessages: {
        popupOkButton: { message: 'OK' },
        popupOkAriaLabel: { message: 'Confirm' }
      }
    });

    assert.deepEqual(failures, []);
  });

  it('rejects direct HTML i18n keys missing from the English locale', () => {
    const failures = getDataI18nAttributeFailures({
      file: 'src/popup.html',
      tagName: 'button',
      attributes: 'data-i18n="missingPopupButton"',
      englishMessages: {}
    });

    assert.deepEqual(failures, [
      'src/popup.html: <button> data-i18n references missing localization key: missingPopupButton'
    ]);
  });

  it('rejects empty direct HTML i18n keys', () => {
    const failures = getDataI18nAttributeFailures({
      file: 'src/options.html',
      tagName: 'section',
      attributes: 'data-i18n-aria-label="   "',
      englishMessages: {}
    });

    assert.deepEqual(failures, [
      'src/options.html: <section> data-i18n-aria-label has an empty localization key.'
    ]);
  });

  it('rejects direct HTML i18n attribute names that runtime localization does not apply', () => {
    const failures = getDataI18nAttributeFailures({
      file: 'src/popup.html',
      tagName: 'button',
      attributes: 'data-i18n-aria-lable="popupOkAriaLabel"',
      englishMessages: {
        popupOkAriaLabel: { message: 'Confirm' }
      }
    });

    assert.deepEqual(failures, [
      'src/popup.html: <button> data-i18n-aria-lable is not a supported direct HTML localization attribute.'
    ]);
  });
});
