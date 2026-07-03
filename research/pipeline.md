# DaD Research Pipeline

This pipeline turns scientific research into DaD product decisions.

## Principles

1. Research is product-facing: every investigation should end in design constraints, scoring guidance, intervention guidance, local validation plans, or a decision not to build.
2. Evidence is graded: a paper is not automatically a product decision.
3. Research must pass the novelty bar in [`quality-bar.md`](quality-bar.md). Obvious conclusions are not research output.
4. Strong features can use weak evidence only if they are conservative, transparent, configurable, and locally validated.
5. Privacy is part of the research question, not a cleanup task after implementation.
6. Claim boundaries are secondary unless release copy depends on them.

## Research Unit

One research unit is one bounded question, such as:

- "Does attention residue justify a Return action after drift?"
- "When do commitment devices help or backfire?"
- "Which page signals are reasonable predictors of passive drift?"

Each research unit produces:

- one question brief;
- evidence cards for important sources;
- one synthesis answer;
- implementation implications;
- local validation implications.

## Stage 0: Orient

Read:

- [`README.md`](README.md)
- [`quality-bar.md`](quality-bar.md)
- [`questions.md`](questions.md)
- [`context-for-chatgpt-research.md`](context-for-chatgpt-research.md)
- the product/spec document most related to the question.

Output:

- selected research question ID;
- scope statement;
- excluded questions.

## Stage 1: Define The Question

Create a file in [`briefs/`](briefs/README.md) from [`templates/question-brief.md`](templates/question-brief.md).

The brief must define:

- the exact question;
- why DaD needs the answer;
- affected features;
- possible product decisions;
- evidence needed;
- privacy and autonomy risks;
- what would change if the answer is weak or negative.

Gate:

- The question must be small enough to answer in one research pass.

## Stage 2: Search And Source Collection

Search for:

- systematic reviews;
- meta-analyses;
- primary studies;
- HCI/digital wellbeing papers;
- behavior economics and psychology papers;
- ethics/privacy literature where relevant.

Prefer source types in this order:

1. Systematic review or meta-analysis.
2. High-quality primary paper with direct relevance.
3. Established theory with credible support.
4. Adjacent-domain evidence.
5. Speculative mechanism.

Gate:

- Do not move to synthesis until at least the strongest available evidence has been identified, even if it complicates the desired product direction.
- Do not move to synthesis if the source set only supports common-sense conclusions. Keep searching for mechanisms, numbers, boundary conditions, or contradiction.

## Stage 3: Evidence Cards

Write one evidence card per important source in [`evidence/`](evidence/README.md) using [`templates/evidence-card.md`](templates/evidence-card.md).

Each card must include:

- citation and link;
- research type;
- concrete finding;
- empirical detail where available;
- non-obvious mechanism;
- limitations;
- evidence grade;
- DaD design consequence.

Gate:

- Evidence cards must separate what the paper shows from what DaD infers.
- Evidence cards should identify what this source taught us that common sense did not.

## Stage 4: Synthesis

Write an answer in [`answers/`](answers/README.md) using [`templates/synthesis.md`](templates/synthesis.md).

The synthesis should include:

- short answer;
- non-obvious findings;
- mechanisms;
- empirical details;
- counterintuitive or assumption-breaking findings;
- evidence map with detail;
- scoring implications;
- intervention implications;
- UI and data implications;
- local validation metrics;
- open questions.

Gate:

- The synthesis must contain at least five non-obvious findings that change a DaD design decision, hypothesis, score, threshold, local validation metric, or implementation priority.
- A synthesis dominated by obvious UX hygiene or claim-policing must be marked `revisit`, not `answered`.
- `npm run verify:research` must pass before a synthesis is kept as `answered`.

## Stage 5: Implementation Handoff

If the synthesis affects product behavior, create a handoff section:

- affected files or specs;
- recommended change;
- minimum viable slice;
- tests needed;
- rollout risk;
- user-facing wording;
- data to inspect after release.

This handoff can become a Codex implementation prompt later.

Gate:

- Handoff must not require raw sensitive data unless it also defines explicit consent, minimization, retention, and local alternatives.

## Stage 6: Product Documentation Update

Update the relevant docs after research changes product direction:

- `docs/protection-model.md`
- `docs/dad_intent_coherence_system.md`
- `docs/pomodoro-implementation.md`
- `docs/potential-functionality.md`
- Chrome Web Store or public communication docs if claims change.

Gate:

- Research conclusions should not remain isolated in `research/` if they affect the product.

## Stage 7: Local Validation Loop

After implementation, collect local evidence without violating privacy:

- false positives;
- bypass attempts;
- continue/isolate/return outcomes;
- blocked-vs-allowed outcome shares;
- intervention frequency;
- user feedback;
- whether stricter settings were later relaxed;
- whether a signal produced useful explanations.

Gate:

- If a signal causes repeated false positives, downgrade it from core scoring to modifier or diagnostic-only.

## Status Labels

Use these labels in [`questions.md`](questions.md):

- `backlog`: not started.
- `briefed`: question brief exists.
- `searching`: sources are being gathered.
- `evidence-cards`: evidence cards are being written.
- `synthesizing`: answer is being written.
- `answered`: synthesis complete.
- `implemented`: product/spec changes were made from the answer.
- `revisit`: answer exists but is too shallow, too obvious, too claim-focused, or needs more evidence/local validation before it can guide development.

## File Naming

Use question IDs in filenames:

- `answers/RQ-001-attention-residue.md`
- `briefs/RQ-001-attention-residue.md`
- `evidence/RQ-001-leroy-2009.md`
- `evidence/RQ-001-review-task-switching.md`

Keep filenames lowercase after the ID.
