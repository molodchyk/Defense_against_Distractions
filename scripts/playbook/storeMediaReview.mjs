// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const hashRowPattern = /^\|\s*`([^`]+\.png)`\s*\|\s*`([a-f0-9]{64})`\s*\|/gim;

function parseReviewedHashes(markdown) {
  return new Map([...markdown.matchAll(hashRowPattern)].map((match) => [match[1], match[2]]));
}

async function getFileSha256(rootDir, relativePath) {
  const content = await readFile(path.join(rootDir, relativePath));
  return createHash('sha256').update(content).digest('hex');
}

export async function verifyReviewedStoreMediaHashes(rootDir, assetPaths, storeMediaReview) {
  const reviewedHashes = parseReviewedHashes(storeMediaReview);
  const failures = [];

  for (const assetPath of assetPaths) {
    const reviewedHash = reviewedHashes.get(assetPath);
    if (!reviewedHash) {
      failures.push(`Store media review must include a SHA-256 hash for ${assetPath}.`);
      continue;
    }

    const actualHash = await getFileSha256(rootDir, assetPath);
    if (actualHash !== reviewedHash) {
      failures.push(`Store media review hash is stale for ${assetPath}. Expected ${reviewedHash}, got ${actualHash}.`);
    }
  }

  for (const assetPath of reviewedHashes.keys()) {
    if (!assetPaths.includes(assetPath)) {
      failures.push(`Store media review includes a hash for an unknown store asset: ${assetPath}.`);
    }
  }

  return failures;
}

export function getStoreMediaReviewCoverageFailures(assetPaths, storeMediaReview) {
  const failures = [];
  const requiredPatterns = [
    /# Store Media Review/,
    /Reviewed Asset Hashes/,
    /SHA-256/,
    /Chrome Web Store/i,
    /screenshots/i,
    /promo images/i,
    /personal accounts/i,
    /private conversations/i,
    /real rules/i,
    /real domains/i,
    /user-specific configuration/i,
    /example\.test/i,
    /## Store Copy Consistency Map/,
    /precise page blocking/i,
    /allowed websites/i,
    /locked schedules/i,
    /Pomodoro/i,
    /intent coherence/i,
    /UI cleanup/i,
    /browser-controlled incognito\/file URL access/i,
    /local processing/i,
    /GPL\/open-source/i,
    /Continue, Isolate, Return, and Show graph/,
    /trigger, score, and context diagnostics/i,
    /element selection, rule action, strategy, target, and save\/cancel controls/i
  ];

  for (const pattern of requiredPatterns) {
    if (!pattern.test(storeMediaReview)) failures.push(`Store media review is missing coverage evidence for: ${pattern}`);
  }
  for (const assetPath of assetPaths) {
    if (!storeMediaReview.includes(`\`${assetPath}\``)) failures.push(`Store media review must cover ${assetPath}.`);
    if (!storeMediaReview.includes(`| \`${assetPath}\` |`)) failures.push(`Store media consistency map must cover ${assetPath}.`);
  }

  return failures;
}
