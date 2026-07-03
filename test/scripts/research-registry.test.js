// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { describe, it } from 'node:test';

import { getResearchRegistryFailures } from '../../scripts/research/registry.mjs';

async function readQuestions() {
  return readFile('research/questions.md', 'utf8');
}

describe('research registry checks', () => {
  it('accepts the current question registry shape', async () => {
    const questions = await readQuestions();

    assert.deepEqual(getResearchRegistryFailures(questions), []);
  });

  it('rejects answer-link tables that omit a question row', async () => {
    const questions = await readQuestions();
    const weakenedQuestions = questions.replace('| RQ-015 | Not started |\n', '');

    assert.deepEqual(getResearchRegistryFailures(weakenedQuestions), [
      'Research Answer Linking table is missing RQ-015.'
    ]);
  });

  it('rejects recommended sequence entries that do not exist in the registry', async () => {
    const questions = await readQuestions();
    const weakenedQuestions = questions.replace('`RQ-005`: safe scoring signals for passive drift.', '`RQ-999`: missing question.');

    assert.deepEqual(getResearchRegistryFailures(weakenedQuestions), [
      'Research recommended first sequence references unknown question: RQ-999.'
    ]);
  });

  it('rejects answer-link tables that reorder question IDs', async () => {
    const questions = await readQuestions();
    const weakenedQuestions = questions
      .replace('| RQ-014 | Not started |\n| RQ-015 | Not started |', '| RQ-015 | Not started |\n| RQ-014 | Not started |');

    assert.deepEqual(getResearchRegistryFailures(weakenedQuestions), [
      'Research Answer Linking table must list the same question IDs as Questions, in the same order.'
    ]);
  });
});
