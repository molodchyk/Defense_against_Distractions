# Research Question Brief

## Question ID

`RQ-004`

## Working Title

Digital self-control intervention ladder.

## Exact Question

Which digital self-control interventions work best for different failure modes: blocking, friction, timers, usage stats, prompts, rewards, environmental modification, or combinations of these?

## Why DaD Needs This

DaD already combines multiple intervention types: keyword blocking, protected schedules, Pomodoro timing, strict breaks, intent prompts, Return/Isolate actions, graph inspection, UI cleanup, local usage stats, and bounded diagnostics. Without an evidence-informed ladder, new features can drift into "more defense is always better" or "softer intervention is always more humane." The product needs a disciplined map of which intervention types are effective, when they backfire, and what user-state or context should move DaD up or down the ladder.

## Affected Features

- Keyword and structural page blocking.
- Locked schedules and protected plan editing.
- Pomodoro strict breaks.
- Intent coherence prompt levels.
- Return, Isolate, Continue, Show graph, and hard chain quarantine.
- UI cleanup, feed/comment hiding, and control disabling.
- Local usage stats and diagnostics.
- Future triggered action chains.
- Store and public explanation of the product model.

## Scope

Included:

- Browser and mobile digital self-control tools.
- Website/app blockers.
- Friction, delays, lockouts, and challenges.
- Usage feedback, self-monitoring dashboards, and local diagnostics.
- Timers, breaks, and session-bound interventions.
- Environmental modification such as hiding feeds or removing cues.
- Prompting, reflection, implementation intentions, and recovery actions.
- Evidence on adherence, substitution, abandonment, bypass, and habituation.

Excluded:

- Clinical treatment for addiction or impulse-control disorders.
- Workplace, school, parental, or coercive third-party monitoring.
- Full Pomodoro and break physiology, which belongs to `RQ-008`.
- Full prompt wording and reason-prompt design, which belongs to `RQ-009`.
- Reinforcement and platform-design mechanisms such as variable reward or dopamine framing, which belong to `RQ-012`.
- Machine-learning personalization, which belongs to `RQ-013`.

## Evidence Needed

- Systematic reviews or meta-analyses of digital self-control and digital wellbeing interventions.
- Randomized, longitudinal, or field studies of app/website blockers, friction tools, commitment tools, and usage feedback.
- HCI studies of browser-extension or mobile self-control tools, including abandonment and workaround behavior.
- Studies comparing active blocking with self-monitoring, prompts, timers, and environmental/cue modification.
- Literature on intervention adherence, habituation, rebound, substitution to other platforms, and user heterogeneity.
- Evidence that distinguishes objective behavior change from self-reported satisfaction or intention.

## Novelty Target

This pass should discover comparative and conditional findings that DaD could not safely infer from common sense. Useful findings include measured differences between blocking and friction, evidence that feedback dashboards help or fail depending on timing, signs that prompts habituate, data on substitution after blockers, conditions where cue removal works better than full blocking, and cases where combining interventions beats adding stricter force.

The answer should not merely say "use the least restrictive intervention" or "give users choice." It should produce a concrete intervention ladder with triggers, escalation conditions, failure modes, and local validation metrics.

## Novelty Proof Obligations

- Identify measured outcomes for at least three intervention families, such as blocking, friction, usage feedback, timers/breaks, prompts, environmental modification, rewards, or mixed interventions.
- Distinguish short-term behavior change from persistence, abandonment, bypass, substitution, rebound, or habituation.
- Identify at least two boundary conditions where a commonly attractive intervention performs poorly or backfires.
- Translate evidence into an intervention ladder that says when DaD should warn, reduce noise, prompt, block, quarantine, or show diagnostics.
- Define at least three local validation metrics DaD can inspect without storing raw page text, full URLs, private input, or personal content.

## Product Decisions This Could Change

- Whether blocking remains the default page-level response or becomes one rung among several.
- Which signals justify moving from warning/reduce-noise to prompt/block.
- Whether local usage stats should be shown before, during, or after a session.
- Whether UI cleanup should be offered before blocking on mixed-use pages.
- Whether Pomodoro strict breaks should block, quiet, or redirect depending on state.
- How hard-chain quarantine should be positioned relative to ordinary intent prompts.
- Whether repeated bypass or repeated Continue should trigger stronger friction, diagnostics, or a configuration review.

## Privacy Risks

Comparative effectiveness research may tempt the product toward more measurement. DaD should avoid collecting:

- raw page text;
- full URLs;
- page titles;
- typed input;
- private messages;
- screenshots;
- raw selectors;
- cross-device behavioral profiles;
- remote analytics.

Acceptable local validation candidates should stay bounded:

- intervention type;
- outcome enum;
- coarse hostname;
- timestamp bucket;
- active plan id;
- bounded score bucket;
- return/isolate/continue counts;
- local usage aggregates;
- whether the user cleared or exported diagnostics.

## Autonomy Risks

An intervention ladder can become hostile if it treats every bypass as proof of failure or escalates automatically without a visible contract. Research should guard against:

- punitive escalation;
- hiding alternatives;
- moralizing "you failed" language;
- overusing prompts until they become noise;
- making diagnostics feel like surveillance;
- making hard blocks impossible to understand;
- turning the product into a coercive monitoring tool;
- optimizing for time blocked rather than useful recovery.

## Possible Outcomes

If evidence is strong:

- Define a ranked intervention ladder with evidence-backed escalation rules.
- Map specific DaD states to recommended intervention families.
- Add local validation metrics for intervention fit and burden.
- Reclassify some current actions as default, modifier, diagnostic-only, or avoid.

If evidence is mixed:

- Keep the intervention ladder configurable and conservative.
- Prefer reversible or user-confirmed interventions when context is ambiguous.
- Treat blocking and quarantine as policy choices requiring strong local evidence or explicit precommitment.

If evidence is weak or negative:

- Avoid claiming one intervention family is generally best.
- Keep public copy grounded in user-controlled defense rather than proven behavior change.
- Prioritize local diagnostics and explicit user review before escalating intervention strength.
