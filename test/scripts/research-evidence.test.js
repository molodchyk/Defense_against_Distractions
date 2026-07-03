// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { describe, it } from 'node:test';

import { getEvidenceCardFailures } from '../../scripts/research/evidence.mjs';
import { parseQuestionRows } from '../../scripts/research/registry.mjs';

async function readCurrentEvidenceCards() {
  const files = (await readdir('research/evidence'))
    .filter((file) => /^RQ-\d{3}-.+\.md$/.test(file))
    .sort((left, right) => left.localeCompare(right));

  return Promise.all(files.map(async (file) => ({
    file: `research/evidence/${file}`,
    text: await readFile(`research/evidence/${file}`, 'utf8')
  })));
}

async function readCurrentQuestionRows() {
  return parseQuestionRows(await readFile('research/questions.md', 'utf8'));
}

describe('research evidence card checks', () => {
  it('accepts the current evidence card corpus', async () => {
    const evidenceCards = await readCurrentEvidenceCards();
    const questionRows = await readCurrentQuestionRows();

    assert.deepEqual(getEvidenceCardFailures({
      evidenceCards,
      linkedQuestionIds: new Set(['RQ-001', 'RQ-002', 'RQ-003']),
      questionRows
    }), []);
  });

  it('rejects evidence cards that lose required design-change sections', async () => {
    const evidenceCards = await readCurrentEvidenceCards();
    const questionRows = await readCurrentQuestionRows();
    const weakenedCards = evidenceCards.map((card, index) => index === 0
      ? { ...card, text: card.text.replace(/\n## What Changes[\s\S]*?(?=\n## Notes)/, '') }
      : card);

    assert.deepEqual(getEvidenceCardFailures({
      evidenceCards: weakenedCards,
      questionRows
    }), [`Evidence card ${evidenceCards[0].file} is missing required section: What Changes.`]);
  });

  it('rejects evidence cards whose title is not the first content in the file', async () => {
    const evidenceCards = await readCurrentEvidenceCards();
    const questionRows = await readCurrentQuestionRows();
    const shiftedCard = {
      ...evidenceCards[0],
      text: `Loose note before the card.\n\n${evidenceCards[0].text}`
    };

    assert.deepEqual(getEvidenceCardFailures({
      evidenceCards: [shiftedCard],
      questionRows
    }), [`Evidence card ${evidenceCards[0].file} must start with "# Evidence Card".`]);
  });

  it('rejects markdown files in the evidence directory without RQ filenames', async () => {
    const evidenceCards = await readCurrentEvidenceCards();
    const questionRows = await readCurrentQuestionRows();
    const misnamedCard = {
      ...evidenceCards[0],
      file: 'research/evidence/loose-card.md'
    };

    assert.deepEqual(getEvidenceCardFailures({
      evidenceCards: [misnamedCard],
      questionRows
    }), ['Evidence card filename must start with an RQ id: research/evidence/loose-card.md.']);
  });

  it('rejects evidence cards for unknown research questions', async () => {
    const evidenceCards = await readCurrentEvidenceCards();
    const questionRows = await readCurrentQuestionRows();
    const unknownCard = {
      ...evidenceCards[0],
      file: 'research/evidence/RQ-999-fixture.md'
    };

    assert.deepEqual(getEvidenceCardFailures({
      evidenceCards: [unknownCard],
      questionRows
    }), ['Evidence card research/evidence/RQ-999-fixture.md references unknown question RQ-999.']);
  });

  it('rejects linked research questions with too few evidence cards', async () => {
    const evidenceCards = await readCurrentEvidenceCards();
    const questionRows = await readCurrentQuestionRows();
    const oneCard = evidenceCards.filter((card) => card.file.includes('RQ-002-')).slice(0, 1);

    assert.deepEqual(getEvidenceCardFailures({
      evidenceCards: oneCard,
      linkedQuestionIds: new Set(['RQ-002']),
      questionRows
    }), ['Research question RQ-002 needs at least 3 evidence cards before it can be linked as answered, implemented, or revisit; found 1.']);
  });
});
