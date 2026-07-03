// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

import { access, readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { getResearchBriefFailures } from './research/briefs.mjs';
import { getEvidenceCardFailures } from './research/evidence.mjs';
import {
  countBullets,
  countTableDataRows,
  extractSection,
  getResearchRegistryFailures,
  parseAnswerLinks,
  parseQuestionRows
} from './research/registry.mjs';

const rootDir = process.cwd();
const failures = [];
const questionsPath = 'research/questions.md';
const qualityCheckedStatuses = new Set(['answered', 'implemented']);
const revisitStatuses = new Set(['revisit']);
const requiredAnsweredSections = [
  'Question',
  'Short Answer',
  'Non-Obvious Findings',
  'Mechanisms',
  'Empirical Details',
  'Evidence Map',
  'Assumptions Updated',
  'DaD Design Implications',
  'Scoring Implications',
  'Intervention Implications',
  'Privacy Implications',
  'Local Validation Metrics',
  'Implementation Handoff',
  'Revisit Triggers',
  'Current Answer Status'
];

function assertCondition(condition, message) {
  if (!condition) failures.push(message);
}

async function readText(relativePath) {
  return readFile(path.join(rootDir, relativePath), 'utf8');
}

async function exists(relativePath) {
  try {
    await access(path.join(rootDir, relativePath));
    return true;
  } catch {
    return false;
  }
}

async function readEvidenceCards() {
  const evidenceDir = path.join(rootDir, 'research', 'evidence');
  if (!(await exists(path.join('research', 'evidence')))) return [];

  const entries = await readdir(evidenceDir, { withFileTypes: true });
  const cards = [];
  for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
    if (!entry.isFile() || !entry.name.endsWith('.md')) continue;
    if (entry.name === 'README.md') continue;
    const relativePath = path.join('research', 'evidence', entry.name);
    cards.push({
      file: relativePath.replaceAll('\\', '/'),
      text: await readText(relativePath)
    });
  }

  return cards;
}

async function readResearchBriefs() {
  const briefDir = path.join(rootDir, 'research', 'briefs');
  if (!(await exists(path.join('research', 'briefs')))) return [];

  const entries = await readdir(briefDir, { withFileTypes: true });
  const briefs = [];
  for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
    if (!entry.isFile() || !entry.name.endsWith('.md')) continue;
    if (entry.name === 'README.md') continue;
    const relativePath = path.join('research', 'briefs', entry.name);
    briefs.push({
      file: relativePath.replaceAll('\\', '/'),
      text: await readText(relativePath)
    });
  }

  return briefs;
}

async function verifyAnsweredQuestion(id, answerPath) {
  assertCondition(await exists(path.join('research', answerPath)), `${id} is marked answered but missing ${answerPath}`);
  if (!(await exists(path.join('research', answerPath)))) return;

  const text = await readText(path.join('research', answerPath));
  assertCondition(text.includes(`\`${id}\``), `${answerPath} does not name ${id} in the question body.`);

  for (const section of requiredAnsweredSections) {
    assertCondition(extractSection(text, section) !== null, `${answerPath} is missing required section: ${section}`);
  }

  const nonObviousCount = countTableDataRows(extractSection(text, 'Non-Obvious Findings'));
  const empiricalCount = countTableDataRows(extractSection(text, 'Empirical Details'));
  const evidenceMapCount = countTableDataRows(extractSection(text, 'Evidence Map'));
  const handoffBulletCount = countBullets(extractSection(text, 'Implementation Handoff'));
  const statusSection = extractSection(text, 'Current Answer Status') || '';

  assertCondition(
    nonObviousCount >= 5,
    `${answerPath} needs at least 5 non-obvious finding rows; found ${nonObviousCount}.`
  );
  assertCondition(
    empiricalCount >= 5,
    `${answerPath} needs at least 5 empirical-detail rows; found ${empiricalCount}.`
  );
  assertCondition(
    evidenceMapCount >= 3,
    `${answerPath} needs at least 3 evidence-map rows; found ${evidenceMapCount}.`
  );
  assertCondition(
    handoffBulletCount >= 5,
    `${answerPath} needs an implementation handoff with at least 5 concrete bullets; found ${handoffBulletCount}.`
  );
  assertCondition(
    /Answered under the revised quality bar\./.test(statusSection),
    `${answerPath} current status must explicitly say it is answered under the revised quality bar.`
  );
}

async function verifyRevisitQuestion(id, answerPath) {
  assertCondition(await exists(path.join('research', answerPath)), `${id} is marked revisit but missing ${answerPath}`);
  if (!(await exists(path.join('research', answerPath)))) return;

  const text = await readText(path.join('research', answerPath));
  assertCondition(text.includes(`\`${id}\``), `${answerPath} does not name ${id} in the question body.`);
  assertCondition(extractSection(text, 'Question') !== null, `${answerPath} is missing required section: Question`);
  const statusSection = extractSection(text, 'Current Answer Status') || '';
  assertCondition(
    /Revisit required\./.test(statusSection),
    `${answerPath} current status must explicitly say "Revisit required."`
  );
}

const questionsText = await readText(questionsPath);
failures.push(...getResearchRegistryFailures(questionsText));
const questionRows = parseQuestionRows(questionsText);
const answerLinks = parseAnswerLinks(questionsText);
const linkedQuestionIds = new Set();
let answeredCount = 0;
let revisitCount = 0;

for (const [id, row] of questionRows.entries()) {
  if (qualityCheckedStatuses.has(row.status)) {
    answeredCount += 1;
    linkedQuestionIds.add(id);
    assertCondition(answerLinks.has(id), `${id} has status ${row.status} in the registry but has no answer link.`);
    if (answerLinks.has(id)) {
      await verifyAnsweredQuestion(id, answerLinks.get(id));
    }
  } else if (revisitStatuses.has(row.status)) {
    revisitCount += 1;
    linkedQuestionIds.add(id);
    assertCondition(answerLinks.has(id), `${id} has status ${row.status} in the registry but has no revisit answer link.`);
    if (answerLinks.has(id)) {
      await verifyRevisitQuestion(id, answerLinks.get(id));
    }
  } else {
    assertCondition(!answerLinks.has(id), `${id} has status ${row.status} but links to an answered synthesis.`);
  }
}

failures.push(...getEvidenceCardFailures({
  evidenceCards: await readEvidenceCards(),
  linkedQuestionIds,
  questionRows
}));
failures.push(...getResearchBriefFailures({
  briefs: await readResearchBriefs(),
  questionRows
}));
assertCondition(answeredCount > 0, 'Research registry has no answered or implemented questions to verify.');

if (failures.length) {
  console.error('Research quality check failed:');
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

const revisitSuffix = revisitCount > 0 ? `; ${revisitCount} revisit syntheses tracked` : '';
console.log(`Research quality check passed: ${answeredCount} answered or implemented syntheses verified${revisitSuffix}.`);
