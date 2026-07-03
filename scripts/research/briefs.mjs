// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

import { extractSection } from './registry.mjs';

export const requiredResearchBriefSections = [
  'Question ID',
  'Working Title',
  'Exact Question',
  'Why DaD Needs This',
  'Affected Features',
  'Scope',
  'Evidence Needed',
  'Novelty Target',
  'Product Decisions This Could Change',
  'Privacy Risks',
  'Autonomy Risks',
  'Possible Outcomes'
];

export const statusesRequiringResearchBrief = new Set([
  'briefed',
  'searching',
  'evidence-cards',
  'synthesizing',
  'answered',
  'implemented',
  'revisit'
]);

export function getBriefQuestionId(file) {
  const fileName = file.replaceAll('\\', '/').split('/').pop() || '';
  const match = /^(RQ-\d{3})-.+\.md$/.exec(fileName);
  return match?.[1] || null;
}

export function getResearchBriefFailures({
  briefs,
  questionRows,
  statusesRequiringBrief = statusesRequiringResearchBrief
}) {
  const failures = [];
  const briefCountsByQuestion = new Map();

  for (const brief of briefs) {
    const questionId = getBriefQuestionId(brief.file);
    if (!questionId) {
      failures.push(`Research brief filename must start with an RQ id: ${brief.file}.`);
      continue;
    }
    if (!questionRows.has(questionId)) {
      failures.push(`Research brief ${brief.file} references unknown question ${questionId}.`);
    }
    briefCountsByQuestion.set(questionId, (briefCountsByQuestion.get(questionId) || 0) + 1);

    if (!/^\s*# Research Question Brief\s*(?:\r?\n|$)/.test(brief.text)) {
      failures.push(`Research brief ${brief.file} must start with "# Research Question Brief".`);
    }
    for (const section of requiredResearchBriefSections) {
      const body = extractSection(brief.text, section);
      if (body === null) {
        failures.push(`Research brief ${brief.file} is missing required section: ${section}.`);
      } else if (body.trim().length === 0) {
        failures.push(`Research brief ${brief.file} has an empty required section: ${section}.`);
      }
    }

    const questionIdSection = extractSection(brief.text, 'Question ID') || '';
    if (!new RegExp(`\\\`${questionId}\\\``).test(questionIdSection)) {
      failures.push(`Research brief ${brief.file} must name ${questionId} in its Question ID section.`);
    }
  }

  for (const [questionId, count] of briefCountsByQuestion) {
    if (count > 1) {
      failures.push(`Research question ${questionId} has multiple briefs; keep one canonical brief.`);
    }
  }

  for (const [questionId, row] of questionRows.entries()) {
    if (!statusesRequiringBrief.has(row.status)) continue;
    if (!briefCountsByQuestion.has(questionId)) {
      failures.push(`Research question ${questionId} has status ${row.status} but no research brief.`);
    }
  }

  return failures;
}
