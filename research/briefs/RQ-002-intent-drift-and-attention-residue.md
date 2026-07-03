# Research Question Brief

## Question ID

`RQ-002`

## Working Title

Intent drift, attention residue, and recovery actions.

## Exact Question

Does evidence around attention residue, task switching, interruptions, media multitasking, and cognitive offloading support DaD's Return, Isolate, Continue, and Show graph recovery actions?

## Why DaD Needs This

Intent coherence is one of DaD's core differentiators. The extension does not only block known bad sites; it models browsing as a trajectory and intervenes when a chain appears to detach from its origin. When drift is detected, the user can continue with a reason, isolate the current page into a new local chain, return to the last coherent page, or inspect the chain graph.

Research should clarify which parts of this model are evidence-backed, which are plausible design hypotheses, and which claims DaD must avoid.

## Affected Features

- Intent drift prompt.
- Continue action.
- Isolate action.
- Return action.
- Show graph action.
- Last coherent page detection.
- First drift point detection.
- Tab lineage and drift-descendant handling.
- Intent coherence scoring signals.
- Popup and options intent diagnostics.

## Scope

Included:

- Attention residue.
- Task switching and task-set reconfiguration.
- Task interruptions and resumption.
- Ready-to-resume plans.
- Media multitasking and cognitive-control evidence.
- Cognitive offloading and external representations.
- Digital self-control interventions where they involve blocking, feedback, or visualizations.

Excluded:

- Clinical diagnosis of ADHD, addiction, depression, or anxiety.
- Claims about permanent brain damage from multitasking.
- General moral claims about the internet.
- Deep research on prompt wording; that belongs mostly to `RQ-009`.
- Deep autonomy/reactance research; that belongs mostly to `RQ-003`.

## Evidence Needed

- Primary studies on attention residue and ready-to-resume planning.
- Reviews of interruptions, task transitions, and task switching.
- Media multitasking primary and review evidence, with causality caveats.
- Cognitive offloading or external-representation literature for the graph view.
- Digital self-control intervention reviews for visual feedback and blocking patterns.

## Novelty Target

This pass should surface mechanisms and numbers that change the intent system, not generic warnings about distraction. Useful findings include measured resumption delays, interruption-lag effects, when external reminders reduce versus increase cognitive load, whether graph-like representations improve recovery, which media-multitasking findings are causal versus correlational, and boundary cases where low topical similarity is legitimate exploration.

## Novelty Proof Obligations

- Identify measured resumption, interruption-lag, or revisit-recovery effects that justify a specific Return, Continue, Isolate, or Show graph behavior.
- Separate causal mechanisms from correlations for media multitasking and passive browsing so scoring weights do not inherit popular myths.
- Find boundary conditions where low similarity is legitimate work, such as orienteering, exploratory search, external memory use, or delayed task resumption.

## Product Decisions This Could Change

- Whether Return should be a primary action.
- Whether Isolate should be framed as a legitimate recovery or a bypass.
- Whether Continue should require a reason.
- Whether Show graph should be treated as diagnostic-only or as an intervention.
- Which signals should be core scoring inputs versus weak modifiers.
- What claims DaD can make about intent coherence.

## Privacy Risks

Intent coherence wants trajectory data. DaD should keep the current local-first direction:

- bounded local transition state;
- origin and last coherent host/page labels;
- derived similarity scores;
- bounded token summaries;
- aggregate tab and activity signals.

DaD should avoid storing raw typed input, raw page text, full browsing history, full URLs by default, raw titles, raw selectors, or personal text samples.

## Autonomy Risks

Intent coherence can become hostile if it treats exploratory research as failure, if it blocks without a recovery path, or if it frames the user's choice as irrational. The research should preserve the distinction between drift and legitimate branching.

Continue and Isolate are important autonomy valves. Return is a protective action. Show graph is an explanatory action. The system should avoid pretending that a score is clinical truth.

## Possible Outcomes

If evidence is strong:

- Keep Return and Isolate as core recovery actions.
- Treat graph view as a useful metacognitive/externalization surface.
- Keep media/task-switching signals as bounded local scoring contributors.

If evidence is weak:

- Keep the interventions conservative and user-visible.
- Treat the graph as diagnostic rather than decisive.
- Require local validation before raising enforcement.

If evidence is negative:

- Reduce automatic intervention.
- Keep intent coherence as diagnostics and optional prompt only.
- Avoid using task-switch/media signals as hard-block triggers.
