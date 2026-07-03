// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import vm from 'node:vm';

const CONTEXT_TOKENS_PATH = 'src/js/content/page-signals/contextTokens.js';
const SELECTION_CANDIDATE_PATH = 'src/js/content/page-signals/selectionCandidate.js';

function createElement({ tagName = 'DIV', attrs = {}, parentElement = null, disabled = false, readOnly = false } = {}) {
  return {
    nodeType: 1,
    tagName,
    parentElement,
    disabled,
    readOnly,
    isContentEditable: attrs.contenteditable === 'true',
    getAttribute(name) {
      return attrs[name] || '';
    }
  };
}

function createTextNode(parentElement) {
  return {
    nodeType: 3,
    parentElement
  };
}

function createSelection({ text, anchorNode = null, focusNode = null, isCollapsed = false }) {
  return {
    anchorNode,
    focusNode,
    isCollapsed,
    getRangeAt() {
      return { commonAncestorContainer: anchorNode };
    },
    toString() {
      return text;
    }
  };
}

function loadSelectionCandidate(selection = null) {
  const document = {
    getSelection: () => selection
  };
  const window = {
    DAD: {},
    Node: {
      ELEMENT_NODE: 1
    },
    document,
    location: {
      hostname: 'example.com'
    }
  };
  window.window = window;
  vm.createContext(window);
  vm.runInContext(readFileSync(CONTEXT_TOKENS_PATH, 'utf8'), window);
  vm.runInContext(readFileSync(SELECTION_CANDIDATE_PATH, 'utf8'), window);
  return window.DAD.PageSignalSelectionCandidate;
}

function toPlainObject(value) {
  return JSON.parse(JSON.stringify(value));
}

describe('selected-text quick-add candidate extraction', () => {
  it('creates a bounded candidate from active page selection', () => {
    const paragraph = createElement({ tagName: 'P' });
    const selection = createSelection({
      text: '  Sildenafil   dosage trial evidence  ',
      anchorNode: createTextNode(paragraph),
      focusNode: createTextNode(paragraph)
    });
    const extractor = loadSelectionCandidate(selection);

    assert.deepEqual(toPlainObject(extractor.getActiveSelectionCandidate()), {
      text: 'Sildenafil dosage trial evidence',
      normalizedText: 'sildenafil dosage trial evidence',
      tokens: ['sildenafil', 'dosage', 'trial', 'evidence'],
      host: 'example.com',
      source: 'userSelection',
      insideEditable: false,
      selectionLength: 32,
      estimatedScore100: 36,
      wouldBlockCurrentPage: false
    });
  });

  it('rejects collapsed, punctuation-only, and huge selections', () => {
    const extractor = loadSelectionCandidate();

    assert.equal(extractor.createSelectionCandidate(createSelection({ text: 'name', isCollapsed: true })), null);
    assert.equal(extractor.createSelectionCandidate(createSelection({ text: ' ... / -- ' })), null);
    assert.equal(extractor.createSelectionCandidate(createSelection({ text: 'a'.repeat(1001) })), null);
  });

  it('marks editable selections and lowers their initial score', () => {
    const textarea = createElement({ tagName: 'TEXTAREA' });
    const selection = createSelection({
      text: 'draft target phrase',
      anchorNode: createTextNode(textarea),
      focusNode: createTextNode(textarea)
    });
    const extractor = loadSelectionCandidate(selection);
    const candidate = extractor.getActiveSelectionCandidate();

    assert.equal(candidate.insideEditable, true);
    assert.equal(candidate.estimatedScore100, 18);
  });

  it('caps candidate text before it reaches popup surfaces', () => {
    const paragraph = createElement({ tagName: 'P' });
    const selectionText = `specific ${'phrase '.repeat(30)}ending`;
    const extractor = loadSelectionCandidate(createSelection({
      text: selectionText,
      anchorNode: createTextNode(paragraph),
      focusNode: createTextNode(paragraph)
    }));
    const candidate = extractor.getActiveSelectionCandidate();

    assert.equal(candidate.selectionLength, selectionText.trim().length);
    assert.equal(candidate.text.length <= 160, true);
    assert.equal(candidate.normalizedText, candidate.text.toLowerCase());
    assert.equal(candidate.tokens.length <= 12, true);
  });
});
