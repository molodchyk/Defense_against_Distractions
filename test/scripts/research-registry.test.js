// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { describe, it } from 'node:test';

import { getResearchRegistryFailures } from '../../scripts/research/registry.mjs';

async function readQuestions() {
  return readFile('research/questions.md', 'utf8');
}

function getAnswerLinkRows(questions) {
  const answerLinkingStart = questions.indexOf('## Answer Linking');
  assert.notEqual(answerLinkingStart, -1);

  return questions
    .slice(answerLinkingStart)
    .match(/^\| RQ-\d{3} \| .+ \|$/gm) || [];
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

  it('rejects unknown research status labels', async () => {
    const questions = await readQuestions();
    const weakenedQuestions = questions.replace('| RQ-004 | briefed | high |', '| RQ-004 | done | high |');

    assert.deepEqual(getResearchRegistryFailures(weakenedQuestions), [
      'Research question RQ-004 has unknown status: done.'
    ]);
  });

  it('rejects unknown research priority labels', async () => {
    const questions = await readQuestions();
    const weakenedQuestions = questions.replace('| RQ-015 | backlog | low |', '| RQ-015 | backlog | urgent |');

    assert.deepEqual(getResearchRegistryFailures(weakenedQuestions), [
      'Research question RQ-015 has unknown priority: urgent.'
    ]);
  });

  it('rejects duplicate question rows', async () => {
    const questions = await readQuestions();
    const row = '| RQ-004 | briefed | high | Digital self-control | Which digital self-control interventions work best: blocking, friction, timers, usage stats, prompts, rewards, or environmental modification? | DaD uses multiple intervention types and needs an evidence-informed ladder. | Intervention ladder and severity mapping. |';
    const weakenedQuestions = questions.replace(row, `${row}\n${row}`);

    assert.deepEqual(getResearchRegistryFailures(weakenedQuestions), [
      'Research Questions table contains duplicate question ID: RQ-004.'
    ]);
  });

  it('rejects duplicate answer-link rows', async () => {
    const questions = await readQuestions();
    const row = '| RQ-004 | Briefed in [Digital self-control intervention ladder](briefs/RQ-004-digital-self-control-intervention-ladder.md); no synthesis yet |';
    const weakenedQuestions = questions.replace(row, `${row}\n${row}`);

    assert.deepEqual(getResearchRegistryFailures(weakenedQuestions), [
      'Research Answer Linking table contains duplicate question ID: RQ-004.'
    ]);
  });

  it('rejects brief-stage questions without a brief link in answer linking', async () => {
    const questions = await readQuestions();
    const row = '| RQ-005 | Briefed in [Safe scoring signals for passive drift](briefs/RQ-005-safe-scoring-signals-for-passive-drift.md); no synthesis yet |';
    const weakenedQuestions = questions.replace(row, '| RQ-005 | Not started |');

    assert.deepEqual(getResearchRegistryFailures(weakenedQuestions), [
      'Research question RQ-005 has status briefed but Answer Linking does not link its brief.'
    ]);
  });

  it('rejects answered or revisit questions without a synthesis link in answer linking', async () => {
    const questions = await readQuestions();
    const row = '| RQ-002 | [Intent drift and trajectory recoverability](answers/RQ-002-intent-drift-and-attention-residue.md) - answered under the revised quality bar |';
    const weakenedQuestions = questions.replace(row, '| RQ-002 | Briefed in [Intent drift](briefs/RQ-002-intent-drift-and-attention-residue.md); no synthesis yet |');

    assert.deepEqual(getResearchRegistryFailures(weakenedQuestions), [
      'Research question RQ-002 has status answered but Answer Linking does not link its synthesis.'
    ]);
  });

  it('rejects duplicate recommended sequence entries', async () => {
    const questions = await readQuestions();
    const weakenedQuestions = questions.replace('5. `RQ-005`: safe scoring signals for passive drift.', '5. `RQ-004`: repeated digital self-control.');

    assert.deepEqual(getResearchRegistryFailures(weakenedQuestions), [
      'Research recommended first sequence contains duplicate question ID: RQ-004.'
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
    const answerLinkRows = getAnswerLinkRows(questions);
    const rowsToSwap = answerLinkRows.slice(-2);
    assert.equal(rowsToSwap.length, 2);

    const weakenedQuestions = questions
      .replace(rowsToSwap.join('\n'), [...rowsToSwap].reverse().join('\n'));
    assert.notEqual(weakenedQuestions, questions);

    assert.deepEqual(getResearchRegistryFailures(weakenedQuestions), [
      'Research Answer Linking table must list the same question IDs as Questions, in the same order.'
    ]);
  });
});
