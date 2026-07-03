// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

export function parseMarkdownTableCells(line) {
  const trimmed = line.trim();
  if (!trimmed.startsWith('|') || !trimmed.endsWith('|')) return null;

  return trimmed
    .slice(1, -1)
    .split('|')
    .map((cell) => cell.trim());
}

export function extractSection(text, heading) {
  const pattern = new RegExp(`^## ${heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`, 'm');
  const match = pattern.exec(text);
  if (!match) return null;

  const start = match.index + match[0].length;
  const rest = text.slice(start);
  const nextHeading = /\n## [^\n]+\n/.exec(rest);
  return (nextHeading ? rest.slice(0, nextHeading.index) : rest).trim();
}

export function countTableDataRows(section) {
  if (!section) return 0;

  const rows = section
    .split(/\r?\n/)
    .map(parseMarkdownTableCells)
    .filter(Boolean)
    .filter((cells) => cells.length >= 4);
  const separatorIndex = rows.findIndex((cells) => cells.every((cell) => /^:?-{3,}:?$/.test(cell)));

  if (separatorIndex === -1) return 0;
  return rows.slice(separatorIndex + 1).length;
}

export function countBullets(section) {
  if (!section) return 0;
  return section.split(/\r?\n/).filter((line) => /^\s*-\s+\S/.test(line)).length;
}

export function parseQuestionRows(questionsText) {
  const rows = new Map();
  const questionsSection = extractSection(questionsText, 'Questions') || '';

  for (const line of questionsSection.split(/\r?\n/)) {
    const cells = parseMarkdownTableCells(line);
    if (!cells || !/^RQ-\d{3}$/.test(cells[0]) || cells.length < 7) continue;

    rows.set(cells[0], {
      area: cells[3],
      expectedOutput: cells[6],
      status: cells[1]
    });
  }

  return rows;
}

export function parseAnswerRows(questionsText) {
  const rows = new Map();
  const answerSection = extractSection(questionsText, 'Answer Linking') || '';

  for (const line of answerSection.split(/\r?\n/)) {
    const cells = parseMarkdownTableCells(line);
    if (!cells || !/^RQ-\d{3}$/.test(cells[0]) || cells.length !== 2) continue;
    rows.set(cells[0], cells[1]);
  }

  return rows;
}

export function parseAnswerLinks(questionsText) {
  const links = new Map();

  for (const [id, answerCell] of parseAnswerRows(questionsText)) {
    const linkMatch = /\]\((answers\/[^)]+\.md)\)/.exec(answerCell);
    if (linkMatch) {
      links.set(id, linkMatch[1]);
    }
  }

  return links;
}

export function parseRecommendedSequenceIds(questionsText) {
  const section = extractSection(questionsText, 'Recommended First Sequence') || '';
  return [...section.matchAll(/`(RQ-\d{3})`/g)].map((match) => match[1]);
}

export function getResearchRegistryFailures(questionsText) {
  const failures = [];
  const questionRows = parseQuestionRows(questionsText);
  const answerRows = parseAnswerRows(questionsText);
  const recommendedIds = parseRecommendedSequenceIds(questionsText);
  const questionIds = [...questionRows.keys()];
  const answerIds = [...answerRows.keys()];

  if (questionIds.length === 0) {
    failures.push('Research registry must contain at least one question row.');
  }
  if (recommendedIds.length === 0) {
    failures.push('Research registry must list a recommended first sequence.');
  }

  for (const id of recommendedIds) {
    if (!questionRows.has(id)) {
      failures.push(`Research recommended first sequence references unknown question: ${id}.`);
    }
  }
  for (const id of questionIds) {
    if (!answerRows.has(id)) {
      failures.push(`Research Answer Linking table is missing ${id}.`);
    }
  }
  for (const id of answerIds) {
    if (!questionRows.has(id)) {
      failures.push(`Research Answer Linking table references unknown question: ${id}.`);
    }
  }

  if (
    questionIds.length === answerIds.length
    && !questionIds.every((id, index) => answerIds[index] === id)
  ) {
    failures.push('Research Answer Linking table must list the same question IDs as Questions, in the same order.');
  }

  return failures;
}
