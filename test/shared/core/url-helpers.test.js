// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  normalizeUrl,
  stripUrlPrefix
} from '../../../src/js/shared/url.js';

describe('URL helpers', () => {
  it('strips http and www prefixes', () => {
    assert.equal(stripUrlPrefix('https://www.example.com/path'), 'example.com/path');
    assert.equal(stripUrlPrefix('http://example.com'), 'example.com');
  });

  it('normalizes URLs by stripping prefixes and lowercasing', () => {
    assert.equal(normalizeUrl('HTTPS://WWW.Example.COM/News'), 'example.com/news');
  });
});
