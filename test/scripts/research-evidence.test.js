// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { describe, it } from 'node:test';

import { getEvidenceCardFailures, hasAllowedEvidenceGrade, hasSourceLocator } from '../../scripts/research/evidence.mjs';
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
  it('accepts singular and plural source locators', () => {
    assert.equal(hasSourceLocator('Citation: A.\n\nLink: https://example.test/paper'), true);
    assert.equal(hasSourceLocator('Citation: A.\n\nDOI: 10.1000/example'), true);
    assert.equal(hasSourceLocator('Citation: A.\n\nLinks:\n\n- https://example.test/a\n- https://example.test/b'), true);
    assert.equal(hasSourceLocator('Citation: A.\n\nDOIs:\n\n- https://doi.org/10.1000/a\n- https://doi.org/10.1000/b'), true);
    assert.equal(hasSourceLocator('Citation: A.\n\nLink:\n\nDOI:'), false);
  });

  it('accepts controlled evidence grade labels with optional explanation', () => {
    assert.equal(hasAllowedEvidenceGrade('strong for mechanism evidence; moderate for DaD thresholds.'), true);
    assert.equal(hasAllowedEvidenceGrade('moderate to strong.'), true);
    assert.equal(hasAllowedEvidenceGrade('- weak for causal claims.'), true);
    assert.equal(hasAllowedEvidenceGrade('pretty convincing but not exact.'), false);
  });

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

  it('rejects evidence cards with too little empirical detail', async () => {
    const evidenceCards = await readCurrentEvidenceCards();
    const questionRows = await readCurrentQuestionRows();
    const weakenedCard = {
      ...evidenceCards[0],
      text: evidenceCards[0].text.replace(
        /\n## Empirical Detail[\s\S]*?(?=\n## Non-Obvious Mechanism)/,
        '\n## Empirical Detail\n\n- Generic result summary.\n'
      )
    };

    assert.deepEqual(getEvidenceCardFailures({
      evidenceCards: [weakenedCard],
      questionRows
    }), [`Evidence card ${evidenceCards[0].file} needs at least 3 empirical-detail bullets; found 1.`]);
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

  it('rejects evidence cards without a source locator', async () => {
    const evidenceCards = await readCurrentEvidenceCards();
    const questionRows = await readCurrentQuestionRows();
    const untraceableCard = {
      ...evidenceCards[0],
      text: evidenceCards[0].text
        .replace(/^Link:.*$/m, 'Link:')
        .replace(/^DOI:.*$/m, 'DOI:')
    };

    assert.deepEqual(getEvidenceCardFailures({
      evidenceCards: [untraceableCard],
      questionRows
    }), [`Evidence card ${evidenceCards[0].file} must include at least one non-empty Link, Links, DOI, or DOIs source locator.`]);
  });

  it('rejects evidence cards with uncontrolled evidence grade labels', async () => {
    const evidenceCards = await readCurrentEvidenceCards();
    const questionRows = await readCurrentQuestionRows();
    const vagueGradeCard = {
      ...evidenceCards[0],
      text: evidenceCards[0].text.replace(
        /\n## Evidence Grade[\s\S]*?(?=\n## Relevance To DaD)/,
        '\n## Evidence Grade\n\npretty convincing but not exact.\n'
      )
    };

    assert.deepEqual(getEvidenceCardFailures({
      evidenceCards: [vagueGradeCard],
      questionRows
    }), [`Evidence card ${evidenceCards[0].file} must start Evidence Grade with one of: strong, moderate, weak, speculative.`]);
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
