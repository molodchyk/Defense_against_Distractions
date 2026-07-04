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
  parseMarkdownTableCells,
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

function countAssumptionUpdatePairs(text) {
  const section = text || '';
  const oldAssumptionCount = (section.match(/\bOld assumption\s*:/g) || []).length;
  const updatedAssumptionCount = (section.match(/\bUpdated\s*:/g) || []).length;

  return Math.min(oldAssumptionCount, updatedAssumptionCount);
}

function normalizeHeaderCell(cell) {
  return String(cell || '').toLowerCase().replace(/[^a-z0-9]+/g, '');
}

function parseMarkdownTable(section) {
  const rows = (section || '')
    .split(/\r?\n/)
    .map(parseMarkdownTableCells)
    .filter(Boolean);
  const separatorIndex = rows.findIndex((cells) => cells.every((cell) => /^:?-{3,}:?$/.test(cell)));
  if (separatorIndex <= 0) {
    return { headers: [], rows: [] };
  }

  return {
    headers: rows[separatorIndex - 1],
    rows: rows.slice(separatorIndex + 1)
  };
}

function findColumnIndex(headers, acceptedNames) {
  const normalizedNames = acceptedNames.map(normalizeHeaderCell);
  return headers.findIndex((header) => normalizedNames.includes(normalizeHeaderCell(header)));
}

function isPlaceholderCell(cell) {
  return /^(finding|finding\s+\d+|source|source\s+\d+|reason|change|product change|detail|caveat|fixture\s+\w+)$/i.test(String(cell || '').trim());
}

function hasMechanismOrMeasuredResult(text) {
  return /(\b\d+(?:\.\d+)?\b|%|percent|percentage|minutes?|hours?|weeks?|months?|effect|rate|lag|frequency|sample|mechanism|memory|cue|cognitive|friction|reactance|autonomy|choice|attention|resumption|interruption|workload|strain|pressure|commitment|depletion|counterarguing|orientation|externalization|offloading|timing|context|threshold|dose|future self|weakened|re-strengthen)/i.test(text);
}

function getNonObviousFindingFailures(answerPath, section) {
  const failures = [];
  const table = parseMarkdownTable(section);
  const findingIndex = findColumnIndex(table.headers, ['Finding']);
  const sourceIndex = findColumnIndex(table.headers, ['Source']);
  const whyIndex = findColumnIndex(table.headers, ['Why It Is Non-Obvious', 'Why Non-Obvious']);
  const consequenceIndex = findColumnIndex(table.headers, ['DaD Consequence', 'DaD Design Consequence', 'What Changes In DaD']);

  if ([findingIndex, sourceIndex, whyIndex, consequenceIndex].some((index) => index === -1)) {
    failures.push(
      `${answerPath} non-obvious findings table must include Finding, Source, Why It Is Non-Obvious, and DaD Consequence columns.`
    );
    return failures;
  }

  table.rows.forEach((row, index) => {
    const rowNumber = index + 1;
    const finding = row[findingIndex] || '';
    const source = row[sourceIndex] || '';
    const why = row[whyIndex] || '';
    const consequence = row[consequenceIndex] || '';
    const keyCells = [finding, source, why, consequence];

    if (keyCells.some(isPlaceholderCell)) {
      failures.push(`${answerPath} non-obvious finding row ${rowNumber} uses placeholder or generic content.`);
    }
    if (source.length < 8 || !/(\b\d{4}\b|et al\.|&|,)/i.test(source) || isPlaceholderCell(source)) {
      failures.push(`${answerPath} non-obvious finding row ${rowNumber} needs a specific source, not placeholder text.`);
    }
    if (why.length < 30 || isPlaceholderCell(why)) {
      failures.push(
        `${answerPath} non-obvious finding row ${rowNumber} needs enough non-obvious explanation to show why common sense was insufficient.`
      );
    }
    if (consequence.length < 35 || isPlaceholderCell(consequence)) {
      failures.push(
        `${answerPath} non-obvious finding row ${rowNumber} needs a concrete DaD design, scoring, threshold, metric, privacy, or implementation consequence.`
      );
    }
    if (!hasMechanismOrMeasuredResult(`${finding} ${why}`)) {
      failures.push(
        `${answerPath} non-obvious finding row ${rowNumber} needs a mechanism or measured result in the finding or non-obviousness explanation.`
      );
    }
  });

  return failures;
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
  const assumptionUpdateCount = countAssumptionUpdatePairs(extractSection(text, 'Assumptions Updated'));
  const handoffBulletCount = countBullets(extractSection(text, 'Implementation Handoff'));
  const statusSection = extractSection(text, 'Current Answer Status') || '';

  assertCondition(
    nonObviousCount >= 5,
    `${answerPath} needs at least 5 non-obvious finding rows; found ${nonObviousCount}.`
  );
  failures.push(...getNonObviousFindingFailures(answerPath, extractSection(text, 'Non-Obvious Findings')));
  assertCondition(
    empiricalCount >= 5,
    `${answerPath} needs at least 5 empirical-detail rows; found ${empiricalCount}.`
  );
  assertCondition(
    evidenceMapCount >= 3,
    `${answerPath} needs at least 3 evidence-map rows; found ${evidenceMapCount}.`
  );
  assertCondition(
    assumptionUpdateCount >= 3,
    `${answerPath} needs at least 3 explicit old-assumption/updated pairs; found ${assumptionUpdateCount}.`
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
