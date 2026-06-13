// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import vm from 'node:vm';

const CONTENT_KEYWORDS_PATH = 'src/js/content/keywords.js';
const STRUCTURAL_TRIGGERS_PATH = 'src/js/content/content-blocking/structuralTriggers.js';

function loadStructuralTriggers({ pageBlocked = false } = {}) {
  const window = {
    DAD: {
      ContentBlocking: {},
      PageSignalsActivity: {
        getActivitySignals() {
          return {
            activePageMs: 0,
            pageAgeMs: 0
          };
        }
      }
    },
    pageBlocked,
    structuralTriggerKeys: new Set()
  };
  window.window = window;
  vm.createContext(window);
  vm.runInContext(readFileSync(CONTENT_KEYWORDS_PATH, 'utf8'), window);
  vm.runInContext(readFileSync(STRUCTURAL_TRIGGERS_PATH, 'utf8'), window);

  return {
    window,
    parseKeyword: window.DAD.parseKeyword,
    structuralTriggers: window.DAD.ContentBlocking.structuralTriggers
  };
}

function createRoot(counts = {}) {
  return {
    querySelectorAll(selector) {
      const value = counts[selector] || 0;
      return Array.isArray(value)
        ? value
        : Array.from({ length: value }, (_, index) => ({ index }));
    }
  };
}

describe('structural content-blocking triggers', () => {
  it('parses normalized 100-point keyword scores in the content parser', () => {
    const { parseKeyword } = loadStructuralTriggers();

    const normalizedVideo = parseKeyword('has:video, +, 50/100');
    assert.deepEqual({
      keyword: normalizedVideo.keyword,
      operation: normalizedVideo.operation,
      value: normalizedVideo.value
    }, {
      keyword: 'has:video',
      operation: '+',
      value: 500
    });

    const normalizedAudio = parseKeyword('has:audio, 25%');
    assert.deepEqual({
      keyword: normalizedAudio.keyword,
      operation: normalizedAudio.operation,
      value: normalizedAudio.value
    }, {
      keyword: 'has:audio',
      operation: '+',
      value: 250
    });
  });

  it('applies a matching structural keyword once per page state', () => {
    const { parseKeyword, structuralTriggers } = loadStructuralTriggers();
    const calls = [];
    const keyword = parseKeyword('has:video, +, 1000');
    const root = createRoot({ video: 1 });

    const firstCount = structuralTriggers.scanStructuralTriggers(
      [keyword],
      (...args) => calls.push(args),
      root
    );
    const secondCount = structuralTriggers.scanStructuralTriggers(
      [keyword],
      (...args) => calls.push(args),
      root
    );

    assert.equal(firstCount, 1);
    assert.equal(secondCount, 0);
    assert.equal(calls.length, 1);
    assert.deepEqual(calls[0], [
      '+',
      1000,
      'has:video',
      'Detected 1 video element on the page',
      'structural'
    ]);
  });

  it('requires configured structural counts to match before scoring', () => {
    const { parseKeyword, structuralTriggers, window } = loadStructuralTriggers();
    const calls = [];
    const keyword = parseKeyword('has:links>=3, +, 250');
    const rootBelowThreshold = createRoot({ 'a[href]': 2 });
    const rootAtThreshold = createRoot({ 'a[href]': 3 });

    assert.equal(
      structuralTriggers.scanStructuralTriggers([keyword], (...args) => calls.push(args), rootBelowThreshold),
      0
    );
    assert.equal(calls.length, 0);
    assert.equal(window.structuralTriggerKeys.size, 0);

    assert.equal(
      structuralTriggers.scanStructuralTriggers([keyword], (...args) => calls.push(args), rootAtThreshold),
      1
    );
    assert.equal(calls.length, 1);
    assert.deepEqual(calls[0], [
      '+',
      250,
      'has:links>=3',
      'Detected 3 link elements on the page',
      'structural'
    ]);
  });

  it('applies audible-media structural keywords only for playing unmuted media', () => {
    const { parseKeyword, structuralTriggers } = loadStructuralTriggers();
    const calls = [];
    const keyword = parseKeyword('has:audible, +, 75/100');
    const root = createRoot({
      'audio, video': [
        { tagName: 'VIDEO', paused: false, ended: false, muted: false, volume: 1 },
        { tagName: 'AUDIO', paused: false, ended: false, muted: true, volume: 1 },
        { tagName: 'VIDEO', paused: false, ended: false, muted: false, volume: 0 },
        { tagName: 'AUDIO', paused: true, ended: false, muted: false, volume: 1 }
      ]
    });

    assert.equal(
      structuralTriggers.scanStructuralTriggers([keyword], (...args) => calls.push(args), root),
      1
    );
    assert.deepEqual(calls[0], [
      '+',
      750,
      'has:audible',
      'Detected 1 audible media element on the page',
      'structural'
    ]);
  });

  it('supports recommendation, comment, and short-form structural keywords', () => {
    const { parseKeyword, structuralTriggers } = loadStructuralTriggers();
    const calls = [];
    const recommendationKeyword = parseKeyword('has:recommendations>=2, +, 50/100');
    const commentKeyword = parseKeyword('has:comments, +, 25/100');
    const shortsKeyword = parseKeyword('has:shorts, +, 100/100');
    const root = createRoot({
      '[aria-label*="recommend" i], [aria-label*="related" i], [class*="recommend" i], [class*="related" i], [id*="recommend" i], [id*="related" i], [data-testid*="recommend" i], [data-testid*="related" i]': 2,
      '[role="comment"], [aria-label*="comment" i], [class*="comment" i], [id*="comment" i], [data-testid*="comment" i]': 1,
      '[href*="/shorts" i], [href*="/reels" i], [href*="/reel" i], [href*="/short" i], [aria-label*="shorts" i], [aria-label*="reels" i], [class*="shorts" i], [class*="reels" i], [id*="shorts" i], [id*="reels" i], [data-testid*="shorts" i], [data-testid*="reels" i]': 3
    });

    assert.equal(
      structuralTriggers.scanStructuralTriggers(
        [recommendationKeyword, commentKeyword, shortsKeyword],
        (...args) => calls.push(args),
        root
      ),
      3
    );

    assert.deepEqual(calls, [
      [
        '+',
        500,
        'has:recommendations>=2',
        'Detected 2 recommendation regions on the page',
        'structural'
      ],
      [
        '+',
        250,
        'has:comments',
        'Detected 1 comment section on the page',
        'structural'
      ],
      [
        '+',
        1000,
        'has:shorts',
        'Detected 3 short-form media regions on the page',
        'structural'
      ]
    ]);
  });

  it('applies time-on-page structural keywords from activity signals', () => {
    const { parseKeyword, structuralTriggers, window } = loadStructuralTriggers();
    const calls = [];
    const activeKeyword = parseKeyword('has:activeSeconds>=30, +, 25/100');
    const pageKeyword = parseKeyword('has:pageSeconds>120, +, 50/100');

    window.DAD.PageSignalsActivity.getActivitySignals = () => ({
      activePageMs: 29000,
      pageAgeMs: 121000
    });

    assert.equal(
      structuralTriggers.scanStructuralTriggers([activeKeyword, pageKeyword], (...args) => calls.push(args), createRoot()),
      1
    );
    assert.deepEqual(calls[0], [
      '+',
      500,
      'has:pageSeconds>120',
      'Detected 121s page time on the page',
      'structural'
    ]);

    window.DAD.PageSignalsActivity.getActivitySignals = () => ({
      activePageMs: 30000,
      pageAgeMs: 125000
    });

    assert.equal(
      structuralTriggers.scanStructuralTriggers([activeKeyword, pageKeyword], (...args) => calls.push(args), createRoot()),
      1
    );
    assert.deepEqual(calls[1], [
      '+',
      250,
      'has:activeSeconds>=30',
      'Detected 30s active visible time on the page',
      'structural'
    ]);

    assert.equal(
      structuralTriggers.scanStructuralTriggers([activeKeyword, pageKeyword], (...args) => calls.push(args), createRoot()),
      0
    );
  });

  it('detects configured time structural keywords for polling', () => {
    const { parseKeyword, structuralTriggers } = loadStructuralTriggers();

    assert.equal(structuralTriggers.hasTimeStructuralTrigger([
      parseKeyword('has:video, +, 1000')
    ]), false);
    assert.equal(structuralTriggers.hasTimeStructuralTrigger([
      parseKeyword('has:activeSeconds>=60, +, 1000')
    ]), true);
  });

  it('does not scan structural triggers after the page is blocked', () => {
    const { parseKeyword, structuralTriggers } = loadStructuralTriggers({ pageBlocked: true });
    const calls = [];
    const keyword = parseKeyword('has:audio, +, 1000');

    assert.equal(
      structuralTriggers.scanStructuralTriggers([keyword], (...args) => calls.push(args), createRoot({ audio: 1 })),
      0
    );
    assert.equal(calls.length, 0);
  });
});
