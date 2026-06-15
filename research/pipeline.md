# DaD Research Pipeline

This pipeline turns scientific research into DaD product decisions.

## Principles

1. Research is product-facing: every investigation should end in design constraints, scoring guidance, intervention guidance, or claim limits.
2. Evidence is graded: a paper is not automatically a product decision.
3. Strong features can use weak evidence only if they are conservative, transparent, configurable, and locally validated.
4. Privacy is part of the research question, not a cleanup task after implementation.
5. DaD should defend without shaming, diagnosing, or claiming universal authority over the user.

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
- claim boundaries.

## Stage 0: Orient

Read:

- [`README.md`](README.md)
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

## Stage 3: Evidence Cards

Write one evidence card per important source in [`evidence/`](evidence/README.md) using [`templates/evidence-card.md`](templates/evidence-card.md).

Each card must include:

- citation and link;
- research type;
- finding;
- limitations;
- evidence grade;
- DaD relevance;
- implementation implications;
- claim boundaries.

Gate:

- Evidence cards must separate what the paper shows from what DaD infers.

## Stage 4: Synthesis

Write an answer in [`answers/`](answers/README.md) using [`templates/synthesis.md`](templates/synthesis.md).

The synthesis should include:

- short answer;
- evidence map;
- design implications;
- scoring implications;
- intervention implications;
- privacy implications;
- autonomy/reactance implications;
- safe claims;
- forbidden overclaims;
- open questions.

Gate:

- The synthesis must contain at least one concrete decision or one explicit "do not build this yet" recommendation.

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
- `revisit`: answer exists but needs more evidence or local validation.

## File Naming

Use question IDs in filenames:

- `answers/RQ-001-attention-residue.md`
- `briefs/RQ-001-attention-residue.md`
- `evidence/RQ-001-leroy-2009.md`
- `evidence/RQ-001-review-task-switching.md`

Keep filenames lowercase after the ID.
