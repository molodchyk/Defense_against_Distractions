// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { describe, it } from 'node:test';

import { getResearchBriefFailures } from '../../scripts/research/briefs.mjs';
import { parseQuestionRows } from '../../scripts/research/registry.mjs';

async function readCurrentResearchBriefs() {
  const files = (await readdir('research/briefs'))
    .filter((file) => /^RQ-\d{3}-.+\.md$/.test(file))
    .sort((left, right) => left.localeCompare(right));

  return Promise.all(files.map(async (file) => ({
    file: `research/briefs/${file}`,
    text: await readFile(`research/briefs/${file}`, 'utf8')
  })));
}

async function readCurrentQuestionRows() {
  return parseQuestionRows(await readFile('research/questions.md', 'utf8'));
}

describe('research brief checks', () => {
  it('accepts the current research brief corpus', async () => {
    const briefs = await readCurrentResearchBriefs();
    const questionRows = await readCurrentQuestionRows();

    assert.deepEqual(getResearchBriefFailures({ briefs, questionRows }), []);
  });

  it('rejects research briefs that lose the novelty target', async () => {
    const briefs = await readCurrentResearchBriefs();
    const questionRows = await readCurrentQuestionRows();
    const weakenedBrief = {
      ...briefs[0],
      text: briefs[0].text.replace(/\n## Novelty Target[\s\S]*?(?=\n## Product Decisions This Could Change)/, '')
    };

    assert.deepEqual(getResearchBriefFailures({
      briefs: [weakenedBrief],
      questionRows,
      statusesRequiringBrief: new Set()
    }), [`Research brief ${briefs[0].file} is missing required section: Novelty Target.`]);
  });

  it('rejects research briefs for unknown research questions', async () => {
    const briefs = await readCurrentResearchBriefs();
    const questionRows = await readCurrentQuestionRows();
    const unknownBrief = {
      ...briefs[0],
      file: 'research/briefs/RQ-999-fixture.md'
    };

    assert.deepEqual(getResearchBriefFailures({
      briefs: [unknownBrief],
      questionRows,
      statusesRequiringBrief: new Set()
    }), [
      'Research brief research/briefs/RQ-999-fixture.md references unknown question RQ-999.',
      'Research brief research/briefs/RQ-999-fixture.md must name RQ-999 in its Question ID section.'
    ]);
  });

  it('rejects active research questions without briefs', async () => {
    const briefs = await readCurrentResearchBriefs();
    const questionRows = await readCurrentQuestionRows();
    const briefsWithoutRq002 = briefs.filter((brief) => !brief.file.includes('RQ-002-'));

    assert.deepEqual(getResearchBriefFailures({
      briefs: briefsWithoutRq002,
      questionRows
    }), ['Research question RQ-002 has status answered but no research brief.']);
  });
});
