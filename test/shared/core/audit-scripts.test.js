// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, it } from 'node:test';

function runNodeScript(scriptPath) {
  const result = spawnSync(process.execPath, [scriptPath], {
    cwd: process.cwd(),
    encoding: 'utf8'
  });

  assert.equal(result.status, 0, result.stderr || result.stdout);
  return `${result.stdout}${result.stderr}`;
}

function runNodeScriptInCwd(scriptPath, cwd) {
  const result = spawnSync(process.execPath, [path.join(process.cwd(), scriptPath)], {
    cwd,
    encoding: 'utf8'
  });

  assert.equal(result.status, 0, result.stderr || result.stdout);
  return `${result.stdout}${result.stderr}`;
}

async function writeText(root, relativePath, text) {
  const absolutePath = path.join(root, relativePath);
  await mkdir(path.dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, text);
}

function buildResearchAnswer(id) {
  return `# Research Synthesis

## Question

\`${id}\`: fixture question.

## Short Answer

Fixture answer.

## Non-Obvious Findings

| Finding | Source | Why It Is Non-Obvious | DaD Consequence |
| --- | --- | --- | --- |
| Finding 1 | Source | Reason | Change |
| Finding 2 | Source | Reason | Change |
| Finding 3 | Source | Reason | Change |
| Finding 4 | Source | Reason | Change |
| Finding 5 | Source | Reason | Change |

## Mechanisms

Mechanism.

## Empirical Details

| Source | Sample / Context | Measure | Result | Caveat |
| --- | --- | --- | --- | --- |
| Source 1 | Detail | Detail | Detail | Caveat |
| Source 2 | Detail | Detail | Detail | Caveat |
| Source 3 | Detail | Detail | Detail | Caveat |
| Source 4 | Detail | Detail | Detail | Caveat |
| Source 5 | Detail | Detail | Detail | Caveat |

## Evidence Map

| Evidence | Grade | Relevance | Caveat |
| --- | --- | --- | --- |
| Evidence 1 | strong | Relevance | Caveat |
| Evidence 2 | moderate | Relevance | Caveat |
| Evidence 3 | weak | Relevance | Caveat |

## Assumptions Updated

- Updated.

## DaD Design Implications

- Implication.

## Scoring Implications

- Scoring.

## Intervention Implications

- Intervention.

## Privacy Implications

- Privacy.

## Local Validation Metrics

- Metric.

## Implementation Handoff

- Affected files.
- Minimum viable change.
- Tests needed.
- Rollout risk.
- Data to inspect.

## Revisit Triggers

- Trigger.

## Current Answer Status

Answered under the revised quality bar.
`;
}

describe('audit scripts', () => {
  it('reports file-size audit scope and budget coverage', () => {
    const output = runNodeScript('scripts/audit-file-sizes.mjs');

    assert.match(output, /File-size audit/);
    assert.match(output, /Scope: \.js, \.mjs, \.css, \.html files outside \.git, dist, node_modules\./);
    assert.match(output, /Coverage: \d+ budgeted \/ \d+ matching files; \d+ matching files are outside configured budgets; \d+ ignored directories\./);
    assert.match(output, /0 matching files are outside configured budgets/);
  });

  it('reports folder-density audit scope and budget coverage', () => {
    const output = runNodeScript('scripts/audit-folder-density.mjs');

    assert.match(output, /Folder-density audit/);
    assert.match(output, /Scope: folders containing \.css, \.html, \.js, \.mjs files outside \.git, dist, node_modules\./);
    assert.match(output, /Coverage: \d+ budgeted \/ \d+ matching folders; \d+ matching folders are outside configured budgets; \d+ ignored directories\./);
    assert.match(output, /0 matching folders are outside configured budgets/);
  });

  it('verifies locale message key coverage', () => {
    const output = runNodeScript('scripts/check-locale-coverage.mjs');

    assert.match(output, /Locale coverage check passed:/);
    assert.match(output, /\d+ locales match \d+ en message keys\./);
  });

  it('verifies static extension surface localization coverage', () => {
    const output = runNodeScript('scripts/check-static-localization.mjs');

    assert.match(output, /Static localization check passed:/);
    assert.match(output, /\d+ extension HTML surfaces scanned\./);
  });

  it('verifies browser extension playbook metadata', () => {
    const output = runNodeScript('scripts/check-browser-extension-playbook.mjs');

    assert.match(output, /Browser extension playbook check passed:/);
    assert.match(output, /\d+ localized store listings verified\./);
  });

  it('verifies platform boundary ownership', () => {
    const output = runNodeScript('scripts/check-platform-boundaries.mjs');

    assert.match(output, /Platform boundary check passed\./);
  });

  it('verifies research answers against the revised quality bar', () => {
    const output = runNodeScript('scripts/check-research-quality.mjs');

    assert.match(output, /Research quality check passed: \d+ answered or implemented syntheses verified\./);
  });

  it('allows implemented research questions to keep validated answer links', async () => {
    const projectRoot = await mkdtemp(path.join(tmpdir(), 'dad-research-quality-'));

    try {
      await writeText(projectRoot, 'research/questions.md', `# DaD Research Question Registry

## Questions

| ID | Status | Priority | Area | Research Question | Why DaD Needs It | Expected Output |
| --- | --- | --- | --- | --- | --- | --- |
| RQ-001 | implemented | high | Fixture | Question? | Reason. | Output. |
| RQ-002 | backlog | medium | Fixture | Question? | Reason. | Output. |

## Answer Linking

| ID | Answer |
| --- | --- |
| RQ-001 | [Fixture answer](answers/RQ-001-fixture.md) - answered under the revised quality bar |
| RQ-002 | Not started |
`);
      await writeText(projectRoot, 'research/answers/RQ-001-fixture.md', buildResearchAnswer('RQ-001'));

      const output = runNodeScriptInCwd('scripts/check-research-quality.mjs', projectRoot);

      assert.match(output, /Research quality check passed: 1 answered or implemented syntheses verified\./);
    } finally {
      await rm(projectRoot, { force: true, recursive: true });
    }
  });
});
