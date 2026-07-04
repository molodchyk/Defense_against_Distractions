// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { describe, it } from 'node:test';

import { storeMediaAssetPaths } from '../../../scripts/playbook/constants.mjs';
import {
  getStoreMediaReviewCoverageFailures,
  verifyReviewedStoreMediaHashes
} from '../../../scripts/playbook/storeMediaReview.mjs';

async function readStoreMediaReview() {
  return readFile('docs/store-media-review.md', 'utf8');
}

describe('store media review checks', () => {
  it('accepts the current reviewed Chrome Web Store media', async () => {
    const storeMediaReview = await readStoreMediaReview();

    assert.deepEqual(getStoreMediaReviewCoverageFailures(storeMediaAssetPaths, storeMediaReview), []);
    assert.deepEqual(await verifyReviewedStoreMediaHashes(process.cwd(), storeMediaAssetPaths, storeMediaReview), []);
  });

  it('rejects stale reviewed hashes for changed media files', async () => {
    const storeMediaReview = await readStoreMediaReview();
    const staleReview = storeMediaReview.replace(
      /(\| `store\/promo\/small-promo-440x280\.png` \| `)[a-f0-9]{64}(` \|)/,
      `$1${'0'.repeat(64)}$2`
    );

    const failures = await verifyReviewedStoreMediaHashes(process.cwd(), storeMediaAssetPaths, staleReview);

    assert.equal(failures.length, 1);
    assert.match(failures[0], /Store media review hash is stale for store\/promo\/small-promo-440x280\.png\./);
  });

  it('rejects missing reviewed hash rows for required media files', async () => {
    const storeMediaReview = await readStoreMediaReview();
    const missingReview = storeMediaReview.replace(
      /^\| `store\/promo\/marquee-promo-1400x560\.png` \| `[a-f0-9]{64}` \|\r?\n/m,
      ''
    );

    assert.deepEqual(await verifyReviewedStoreMediaHashes(process.cwd(), storeMediaAssetPaths, missingReview), [
      'Store media review must include a SHA-256 hash for store/promo/marquee-promo-1400x560.png.'
    ]);
  });

  it('rejects reviewed hash rows for unknown media files', async () => {
    const storeMediaReview = await readStoreMediaReview();
    const reviewWithUnknownAsset = `${storeMediaReview}\n| \`store/promo/obsolete.png\` | \`${'1'.repeat(64)}\` |\n`;

    assert.deepEqual(await verifyReviewedStoreMediaHashes(process.cwd(), storeMediaAssetPaths, reviewWithUnknownAsset), [
      'Store media review includes a hash for an unknown store asset: store/promo/obsolete.png.'
    ]);
  });
});
