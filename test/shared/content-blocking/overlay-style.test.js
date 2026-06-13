// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import vm from 'node:vm';

const CONSTANTS_PATH = 'src/js/content/content-blocking/constants.js';
const OVERLAY_STYLE_PATH = 'src/js/content/content-blocking/overlayStyle.js';

function createDocument() {
  const elementsById = new Map();
  const appended = [];

  return {
    appended,
    documentElement: {
      appendChild(element) {
        appended.push(element);
        if (element.id) {
          elementsById.set(element.id, element);
        }
      }
    },
    createElement(tagName) {
      return {
        tagName: String(tagName || '').toUpperCase(),
        id: '',
        textContent: '',
        hidden: false,
        style: {
          cssText: ''
        }
      };
    },
    getElementById(id) {
      return elementsById.get(id) || null;
    }
  };
}

function loadOverlayStyle() {
  const document = createDocument();
  const window = {
    document,
    DAD: {
      ContentBlocking: {}
    }
  };
  window.window = window;

  vm.createContext(window);
  vm.runInContext(readFileSync(CONSTANTS_PATH, 'utf8'), window);
  vm.runInContext(readFileSync(OVERLAY_STYLE_PATH, 'utf8'), window);

  return {
    document,
    overlayStyle: window.DAD.ContentBlocking.overlayStyle
  };
}

describe('blocked overlay style', () => {
  it('keeps blocked overlay diagnostics selectable for copying', () => {
    const { document, overlayStyle } = loadOverlayStyle();

    overlayStyle.ensureThemeStyle();

    assert.equal(document.appended.length, 1);
    const styleText = document.appended[0].textContent;
    assert.match(styleText, /#dad-block-overlay,\s*#dad-block-overlay \*/);
    assert.match(styleText, /user-select:\s*text !important/);
    assert.match(styleText, /-webkit-user-select:\s*text !important/);
  });

  it('includes RTL corrections for localized blocked-page details', () => {
    const { document, overlayStyle } = loadOverlayStyle();

    overlayStyle.ensureThemeStyle();

    const styleText = document.appended[0].textContent;
    assert.match(styleText, /#dad-block-overlay\[dir="rtl"\] \[data-dad-pomodoro\]/);
    assert.match(styleText, /text-align:\s*right/);
    assert.match(styleText, /margin-left:\s*8px/);
  });
});
