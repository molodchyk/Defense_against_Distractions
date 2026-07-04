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

function runNodeScriptFailureInCwd(scriptPath, cwd) {
  const result = spawnSync(process.execPath, [path.join(process.cwd(), scriptPath)], {
    cwd,
    encoding: 'utf8'
  });

  assert.notEqual(result.status, 0, 'Expected script to fail.');
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
| Recovery lag can continue for 10-15 minutes after a short alert-driven switch. | Iqbal & Horvitz 2007 | The visible interruption is shorter than the measured recovery cost. | Add a local recovery metric that separates immediate return from delayed chain recovery. |
| A small access pause discouraged 13.1% of launches, while a harder task discouraged 47.5%. | Kim et al. 2019 | Friction behaves like a dose, not a binary warning-versus-block switch. | Treat friction level as a tunable intervention threshold instead of a single block mode. |
| Graphical history reduced return-task time to 61.2% of baseline. | Hightower et al. 1998 | A graph is not only explanation; it can be an active navigation aid. | Keep Show graph compact, chain-scoped, and paired with Return actions. |
| Public commitment raised demand from 41% to 65% in an experiment. | Exley & Naecker 2017 | More demand can reflect identity signaling rather than better self-knowledge. | Keep lock strictness private by default and avoid visible strictness badges. |
| Reactance combines anger and counterarguing, not only dislike. | Dillard & Shen 2005; Rains 2013 | A user may become motivated to reject or bypass the source of control. | Track local bypass pressure and repeated intervention rejection as calibration signals. |

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

- Old assumption: Fixture old assumption one.
- Updated: Fixture updated assumption one.

- Old assumption: Fixture old assumption two.
- Updated: Fixture updated assumption two.

- Old assumption: Fixture old assumption three.
- Updated: Fixture updated assumption three.

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

function buildRevisitResearchAnswer(id) {
  return `# Research Synthesis

## Question

\`${id}\`: fixture question.

## Current Answer Status

Revisit required. This answer is useful as a draft, but it is not finished product guidance.
`;
}

function buildResearchBrief(id) {
  return `# Research Question Brief

## Question ID

\`${id}\`

## Working Title

Fixture title.

## Exact Question

Fixture question?

## Why DaD Needs This

Fixture product decision.

## Affected Features

- Fixture feature.

## Scope

Included:

- Fixture scope.

Excluded:

- Fixture exclusion.

## Evidence Needed

- Fixture evidence.

## Novelty Target

Fixture novelty target.

## Novelty Proof Obligations

- Fixture measured result.
- Fixture non-obvious mechanism.
- Fixture product decision change.

## Product Decisions This Could Change

- Fixture decision.

## Privacy Risks

Fixture privacy risk.

## Autonomy Risks

Fixture autonomy risk.

## Possible Outcomes

If evidence is strong:

- Fixture direction.

If evidence is weak:

- Fixture fallback.

If evidence is negative:

- Fixture downgrade.
`;
}

function buildEvidenceCard(id, suffix = 'fixture') {
  return `# Evidence Card

## Source

Citation: Fixture source for ${id} ${suffix}.

Link: https://example.test/research/${id.toLowerCase()}-${suffix}

DOI: 10.1000/${id.toLowerCase()}-${suffix}

## Source Type

- primary study

## Research Context

Fixture context.

## Main Finding

Fixture finding.

## Empirical Detail

- Fixture sample or context.
- Fixture measure or intervention.
- Fixture result direction.

## Non-Obvious Mechanism

Fixture mechanism.

## Limitations

Fixture limitation.

## Evidence Grade

moderate

## Relevance To DaD

Fixture relevance.

## Design Consequence

Fixture consequence.

## What Changes

Fixture design assumption changes.

## Notes

Fixture note.
`;
}

describe('research quality script', () => {
  it('verifies research answers against the revised quality bar', () => {
    const output = runNodeScript('scripts/check-research-quality.mjs');

    assert.match(output, /Research quality check passed: \d+ answered or implemented syntheses verified(?:; \d+ revisit syntheses tracked)?\./);
  });

  it('allows implemented research questions to keep validated answer links', async () => {
    const projectRoot = await mkdtemp(path.join(tmpdir(), 'dad-research-quality-'));

    try {
      await writeText(projectRoot, 'research/questions.md', `# DaD Research Question Registry

## Recommended First Sequence

1. \`RQ-001\`: fixture implemented question.

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
      await writeText(projectRoot, 'research/briefs/RQ-001-fixture.md', buildResearchBrief('RQ-001'));
      for (const suffix of ['a', 'b', 'c']) {
        await writeText(projectRoot, `research/evidence/RQ-001-${suffix}.md`, buildEvidenceCard('RQ-001', suffix));
      }

      const output = runNodeScriptInCwd('scripts/check-research-quality.mjs', projectRoot);

      assert.match(output, /Research quality check passed: 1 answered or implemented syntheses verified\./);
    } finally {
      await rm(projectRoot, { force: true, recursive: true });
    }
  });

  it('rejects answered research syntheses without explicit assumption updates', async () => {
    const projectRoot = await mkdtemp(path.join(tmpdir(), 'dad-research-assumptions-'));

    try {
      await writeText(projectRoot, 'research/questions.md', `# DaD Research Question Registry

## Recommended First Sequence

1. \`RQ-001\`: fixture answered question.

## Questions

| ID | Status | Priority | Area | Research Question | Why DaD Needs It | Expected Output |
| --- | --- | --- | --- | --- | --- | --- |
| RQ-001 | answered | high | Fixture | Question? | Reason. | Output. |

## Answer Linking

| ID | Answer |
| --- | --- |
| RQ-001 | [Fixture answer](answers/RQ-001-fixture.md) - answered under the revised quality bar |
`);
      const weakAnswer = buildResearchAnswer('RQ-001').replace(
        `- Old assumption: Fixture old assumption one.
- Updated: Fixture updated assumption one.

- Old assumption: Fixture old assumption two.
- Updated: Fixture updated assumption two.

- Old assumption: Fixture old assumption three.
- Updated: Fixture updated assumption three.`,
        '- Updated.'
      );
      await writeText(projectRoot, 'research/answers/RQ-001-fixture.md', weakAnswer);
      await writeText(projectRoot, 'research/briefs/RQ-001-fixture.md', buildResearchBrief('RQ-001'));
      for (const suffix of ['a', 'b', 'c']) {
        await writeText(projectRoot, `research/evidence/RQ-001-${suffix}.md`, buildEvidenceCard('RQ-001', suffix));
      }

      const output = runNodeScriptFailureInCwd('scripts/check-research-quality.mjs', projectRoot);

      assert.match(output, /needs at least 3 explicit old-assumption\/updated pairs; found 0\./);
    } finally {
      await rm(projectRoot, { force: true, recursive: true });
    }
  });

  it('rejects answered research syntheses with placeholder non-obvious findings', async () => {
    const projectRoot = await mkdtemp(path.join(tmpdir(), 'dad-research-generic-findings-'));

    try {
      await writeText(projectRoot, 'research/questions.md', `# DaD Research Question Registry

## Recommended First Sequence

1. \`RQ-001\`: fixture answered question.

## Questions

| ID | Status | Priority | Area | Research Question | Why DaD Needs It | Expected Output |
| --- | --- | --- | --- | --- | --- | --- |
| RQ-001 | answered | high | Fixture | Question? | Reason. | Output. |

## Answer Linking

| ID | Answer |
| --- | --- |
| RQ-001 | [Fixture answer](answers/RQ-001-fixture.md) - answered under the revised quality bar |
`);
      const weakFindings = `## Non-Obvious Findings

| Finding | Source | Why It Is Non-Obvious | DaD Consequence |
| --- | --- | --- | --- |
| Finding 1 | Source | Reason | Change |
| Finding 2 | Source | Reason | Change |
| Finding 3 | Source | Reason | Change |
| Finding 4 | Source | Reason | Change |
| Finding 5 | Source | Reason | Change |
`;
      const weakAnswer = buildResearchAnswer('RQ-001').replace(
        /\n## Non-Obvious Findings[\s\S]*?(?=\n## Mechanisms)/,
        `\n${weakFindings}`
      );
      await writeText(projectRoot, 'research/answers/RQ-001-fixture.md', weakAnswer);
      await writeText(projectRoot, 'research/briefs/RQ-001-fixture.md', buildResearchBrief('RQ-001'));
      for (const suffix of ['a', 'b', 'c']) {
        await writeText(projectRoot, `research/evidence/RQ-001-${suffix}.md`, buildEvidenceCard('RQ-001', suffix));
      }

      const output = runNodeScriptFailureInCwd('scripts/check-research-quality.mjs', projectRoot);

      assert.match(output, /non-obvious finding row 1 uses placeholder or generic content\./);
      assert.match(output, /non-obvious finding row 1 needs a specific source, not placeholder text\./);
    } finally {
      await rm(projectRoot, { force: true, recursive: true });
    }
  });

  it('allows revisit research questions to keep explicit draft answer links', async () => {
    const projectRoot = await mkdtemp(path.join(tmpdir(), 'dad-research-revisit-'));

    try {
      await writeText(projectRoot, 'research/questions.md', `# DaD Research Question Registry

## Recommended First Sequence

1. \`RQ-001\`: fixture revisit question.
2. \`RQ-002\`: fixture answered question.

## Questions

| ID | Status | Priority | Area | Research Question | Why DaD Needs It | Expected Output |
| --- | --- | --- | --- | --- | --- | --- |
| RQ-001 | revisit | high | Fixture | Question? | Reason. | Output. |
| RQ-002 | answered | high | Fixture | Question? | Reason. | Output. |
| RQ-003 | backlog | medium | Fixture | Question? | Reason. | Output. |

## Answer Linking

| ID | Answer |
| --- | --- |
| RQ-001 | [Fixture revisit](answers/RQ-001-revisit.md) - revisit required |
| RQ-002 | [Fixture answer](answers/RQ-002-fixture.md) - answered under the revised quality bar |
| RQ-003 | Not started |
`);
      await writeText(projectRoot, 'research/answers/RQ-001-revisit.md', buildRevisitResearchAnswer('RQ-001'));
      await writeText(projectRoot, 'research/answers/RQ-002-fixture.md', buildResearchAnswer('RQ-002'));
      for (const id of ['RQ-001', 'RQ-002']) {
        await writeText(projectRoot, `research/briefs/${id}-fixture.md`, buildResearchBrief(id));
        for (const suffix of ['a', 'b', 'c']) {
          await writeText(projectRoot, `research/evidence/${id}-${suffix}.md`, buildEvidenceCard(id, suffix));
        }
      }

      const output = runNodeScriptInCwd('scripts/check-research-quality.mjs', projectRoot);

      assert.match(output, /Research quality check passed: 1 answered or implemented syntheses verified; 1 revisit syntheses tracked\./);
    } finally {
      await rm(projectRoot, { force: true, recursive: true });
    }
  });
});
