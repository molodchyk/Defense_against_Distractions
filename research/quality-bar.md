# DaD Research Quality Bar

DaD research is not a place to restate common sense, obvious UX hygiene, or generic safety disclaimers. The point is to extract knowledge that changes how the extension is designed.

If a finding makes the reader think "we already knew that," it should usually be removed or moved to a short background note.

## Primary Standard

A research answer must contain non-obvious information from scientific literature.

Prefer:

- mechanisms that explain how behavior unfolds;
- empirical base rates, frequencies, effect sizes, or measured differences;
- counterintuitive findings;
- failure modes that are not obvious from product intuition;
- distinctions that change implementation;
- evidence that contradicts DaD's current assumptions;
- design implications that would not be guessed from common sense.

Avoid:

- generic "do not shame users" guidance;
- obvious "do not overclaim" lists;
- generic "privacy matters" statements;
- UX copy examples unless research specifically changes wording;
- long lists of things nobody intended to say;
- moralizing about the internet;
- treating one source as permission to make a broad product claim.

## Novelty Gate

Before a synthesis can be marked `answered`, it must include at least five items that pass this test:

> Would this change a design decision, scoring weight, intervention threshold, data collection decision, or product hypothesis in a way we would not have confidently chosen without the literature?

Each item should identify:

- the finding;
- the source;
- the mechanism or measured result;
- why it is non-obvious;
- what it changes in DaD.

## Detail Gate

Evidence cards should capture details, not just conclusions.

Look for:

- sample size;
- population;
- task or intervention design;
- outcome measures;
- effect sizes or direction of effects;
- time horizon;
- boundary conditions;
- failed hypotheses;
- contradictory evidence;
- confounds and causality limits.

Every evidence card must remain traceable to the source, with at least one non-empty link or DOI locator. If the source cannot be located again, it is not strong enough to guide implementation.

If a paper does not provide enough actionable detail, the card should say so.

## Mechanism Gate

A research answer should explain mechanisms in working language. Examples:

- how an unfinished goal remains activated after switching;
- how friction changes impulse timing;
- how reactance differs between chosen restriction and external control;
- how media recommender exposure changes transition probability;
- how fatigue or depletion changes override reliability;
- how visual externalization changes memory load.

The mechanism should be specific enough to influence code, UI, or scoring.

## Product Translation Gate

Every useful research point should become one of:

- a scoring implication;
- an intervention threshold implication;
- a UI state or copy implication;
- a privacy or data-minimization implication;
- a local validation metric;
- a reason not to build something yet;
- a research question that must be split out.

If it cannot affect the product, do not foreground it.

## Status Policy

Use `answered` only when the synthesis passes the novelty, detail, mechanism, product translation, and `npm run verify:research` gates.

Use `implemented` only for a previously answered synthesis that still passes `npm run verify:research` after product/spec changes are made from it.

Use `revisit` when an answer has useful structure but is too shallow, too obvious, too claim-focused, or missing empirical detail.

Use `briefed`, `searching`, `evidence-cards`, and `synthesizing` for active work in progress.

## Role Of Claim Boundaries

Claim boundaries are still useful for store listings and public communication, but they are secondary. They should not dominate scientific research notes.

Only include claim boundaries when:

- a paper is commonly misused;
- a public claim is likely to be made soon;
- a finding sounds stronger than it is;
- DaD release copy depends on it.

Otherwise, prioritize mechanisms, numbers, and design consequences.
