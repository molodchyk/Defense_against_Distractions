// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  LEGACY_KEYWORD_BLOCK_SCORE_THRESHOLD,
  NORMALIZED_KEYWORD_BLOCK_SCORE_THRESHOLD,
  normalizeKeywordScore,
  normalizeKeywordScoreDelta,
  parseStructuralKeywordCondition,
  parseKeywordForEditing,
  parseKeywordForScanning,
  splitKeywordEntry
} from '../../../src/js/shared/keywords.js';

describe('keyword parsing', () => {
  it('splits keyword entries on unescaped commas', () => {
    assert.deepEqual(splitKeywordEntry('news, *, 10'), ['news', '*', '10']);
  });

  it('keeps escaped commas inside keywords', () => {
    assert.deepEqual(splitKeywordEntry('hello\\, world, 25'), ['hello, world', '25']);
  });

  it('parses simple scan keywords with blocking defaults', () => {
    assert.deepEqual(parseKeywordForScanning('video games'), {
      keyword: 'video games',
      operation: '+',
      value: 1000
    });
  });

  it('parses weighted scan keywords', () => {
    assert.deepEqual(parseKeywordForScanning('news, 50'), {
      keyword: 'news',
      operation: '+',
      value: 50
    });
  });

  it('parses explicit normalized 100-point keyword scores', () => {
    assert.deepEqual(parseKeywordForScanning('news, 50/100'), {
      keyword: 'news',
      operation: '+',
      value: 500
    });
    assert.deepEqual(parseKeywordForScanning('news, +, 25%'), {
      keyword: 'news',
      operation: '+',
      value: 250
    });
    assert.deepEqual(parseKeywordForEditing('news, +, 50/100'), ['news', '+', 500]);
  });

  it('parses explicit scan operations', () => {
    assert.deepEqual(parseKeywordForScanning('shorts, *, 5'), {
      keyword: 'shorts',
      operation: '*',
      value: 5
    });
  });

  it('parses editing form into keyword, sign, and value', () => {
    assert.deepEqual(parseKeywordForEditing('news, +, 100'), ['news', '+', 100]);
  });

  it('parses explicit structural keyword conditions', () => {
    assert.deepEqual(parseStructuralKeywordCondition('has:video'), {
      metric: 'video',
      operator: '>=',
      count: 1
    });
    assert.deepEqual(parseStructuralKeywordCondition('has:links>=25'), {
      metric: 'link',
      operator: '>=',
      count: 25
    });
    assert.deepEqual(parseStructuralKeywordCondition('has:audio=0'), {
      metric: 'audio',
      operator: '=',
      count: 0
    });
    assert.deepEqual(parseStructuralKeywordCondition('has:audibleMedia>=1'), {
      metric: 'audibleMedia',
      operator: '>=',
      count: 1
    });
    assert.deepEqual(parseStructuralKeywordCondition('has:audible'), {
      metric: 'audibleMedia',
      operator: '>=',
      count: 1
    });
    assert.deepEqual(parseStructuralKeywordCondition('has:activeSeconds>=30'), {
      metric: 'activeSeconds',
      operator: '>=',
      count: 30
    });
    assert.deepEqual(parseStructuralKeywordCondition('has:pageSeconds>120'), {
      metric: 'pageSeconds',
      operator: '>',
      count: 120
    });
    assert.deepEqual(parseStructuralKeywordCondition('has:recommendations>=2'), {
      metric: 'recommendationRegion',
      operator: '>=',
      count: 2
    });
    assert.deepEqual(parseStructuralKeywordCondition('has:comments'), {
      metric: 'commentSection',
      operator: '>=',
      count: 1
    });
    assert.deepEqual(parseStructuralKeywordCondition('has:shorts'), {
      metric: 'shortFormMedia',
      operator: '>=',
      count: 1
    });
    assert.equal(parseStructuralKeywordCondition('video'), null);
    assert.equal(parseStructuralKeywordCondition('has:unknown'), null);
  });

  it('normalizes legacy keyword scores into a 100-point diagnostics scale', () => {
    assert.equal(LEGACY_KEYWORD_BLOCK_SCORE_THRESHOLD, 1000);
    assert.equal(NORMALIZED_KEYWORD_BLOCK_SCORE_THRESHOLD, 100);
    assert.equal(normalizeKeywordScore(0), 0);
    assert.equal(normalizeKeywordScore(500), 50);
    assert.equal(normalizeKeywordScore(1000), 100);
    assert.equal(normalizeKeywordScore(2000), 100);
    assert.equal(normalizeKeywordScore(50, 100), 50);
    assert.equal(normalizeKeywordScoreDelta(250), 25);
    assert.equal(normalizeKeywordScoreDelta(-250), -25);
    assert.equal(normalizeKeywordScoreDelta(2000), 100);
  });
});
