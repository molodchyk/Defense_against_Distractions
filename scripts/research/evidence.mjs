// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

import { extractSection } from './registry.mjs';

export const requiredEvidenceCardSections = [
  'Source',
  'Source Type',
  'Research Context',
  'Main Finding',
  'Empirical Detail',
  'Non-Obvious Mechanism',
  'Limitations',
  'Evidence Grade',
  'Relevance To DaD',
  'Design Consequence',
  'What Changes',
  'Notes'
];

export function getEvidenceQuestionId(file) {
  const fileName = file.replaceAll('\\', '/').split('/').pop() || '';
  const match = /^(RQ-\d{3})-.+\.md$/.exec(fileName);
  return match?.[1] || null;
}

export function getEvidenceCardFailures({
  evidenceCards,
  linkedQuestionIds = new Set(),
  minimumCardsPerLinkedQuestion = 3,
  questionRows
}) {
  const failures = [];
  const cardCountsByQuestion = new Map();

  if (evidenceCards.length === 0) {
    failures.push('Research evidence directory must contain at least one RQ evidence card.');
  }

  for (const card of evidenceCards) {
    const questionId = getEvidenceQuestionId(card.file);
    if (!questionId) {
      failures.push(`Evidence card filename must start with an RQ id: ${card.file}.`);
      continue;
    }
    if (!questionRows.has(questionId)) {
      failures.push(`Evidence card ${card.file} references unknown question ${questionId}.`);
    }
    cardCountsByQuestion.set(questionId, (cardCountsByQuestion.get(questionId) || 0) + 1);

    if (!/^\s*# Evidence Card\s*(?:\r?\n|$)/.test(card.text)) {
      failures.push(`Evidence card ${card.file} must start with "# Evidence Card".`);
    }
    for (const section of requiredEvidenceCardSections) {
      const body = extractSection(card.text, section);
      if (body === null) {
        failures.push(`Evidence card ${card.file} is missing required section: ${section}.`);
      } else if (body.trim().length === 0) {
        failures.push(`Evidence card ${card.file} has an empty required section: ${section}.`);
      }
    }
    if (!/^Citation:\s+\S/m.test(extractSection(card.text, 'Source') || '')) {
      failures.push(`Evidence card ${card.file} must include a non-empty Citation line.`);
    }
  }

  for (const questionId of linkedQuestionIds) {
    const cardCount = cardCountsByQuestion.get(questionId) || 0;
    if (cardCount < minimumCardsPerLinkedQuestion) {
      failures.push(
        `Research question ${questionId} needs at least ${minimumCardsPerLinkedQuestion} evidence cards before it can be linked as answered, implemented, or revisit; found ${cardCount}.`
      );
    }
  }

  return failures;
}
