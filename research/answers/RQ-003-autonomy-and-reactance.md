# Research Synthesis

## Question

`RQ-003`: How can DaD enforce precommitted protection without creating reactance, shame, or hostile UX?

## Short Answer

DaD can enforce strong protection without becoming hostile if enforcement is experienced as user-owned structure rather than external domination. The research does not say "never restrict." It says restrictions are risky when they feel like unexpected, illegitimate freedom threats. DaD's strongest interventions are most defensible when they are precommitted, scoped, transparent, time-bounded, explained, and paired with safe choices.

Reactance research warns that controlling or antifreedom language can create anger, counterarguing, source rejection, and attempts to restore the restricted behavior. Self-determination and autonomy-support research adds the positive target: the user should feel that the protection is connected to their own earlier goals and that they still have competence inside the system.

The design rule is: enforce the rule, not a moral judgment. DaD should say what active plan or schedule triggered, what action would weaken protection, what the user can still do, and when review or relaxation becomes available. It should never imply that the user is bad, lying, broken, or incapable of choice.

## Evidence Summary

| Evidence | Grade | Relevance | Caveat |
| --- | --- | --- | --- |
| Rosenberg & Siegel (2018) review psychological reactance theory. | strong / moderate for DaD | Explains why perceived freedom threats can provoke resistance. | Broad theory, not DaD-specific. |
| Dillard & Shen (2005) study anger and negative cognitions in reactance. | moderate | Supports avoiding accusatory enforcement copy. | Persuasive health communication context. |
| Rains (2013) meta-analysis of reactance. | strong / moderate for DaD | Supports perceived freedom threat as central. | Mostly communication studies. |
| Reynolds-Tylus (2019) reactance review. | moderate | Guides non-shaming explanations and safe choices. | Health communication context. |
| Li & Shi (2026) meta-analysis of antifreedom messages. | strong / moderate for DaD | Supports avoiding controlling language. | Message effects, not lockout thresholds. |
| Ryan & Deci (2000) self-determination theory. | moderate | Defines autonomy-supportive structure. | Broad motivation theory. |
| Muraven, Gagne, & Rosman (2008) autonomy support and self-control. | moderate | Suggests framing affects self-control cost. | Not digital self-control. |
| Bol et al. (2019) digital autonomy-supportive messaging. | weak / moderate | Supports offering safe choices. | Digital health messaging, not enforcement. |
| Lukoff et al. (2020) digital container design. | weak / moderate | Supports bounded intentional contexts. | Mindfulness app context. |
| Lyngs et al. (2019) digital self-control tool review. | moderate | Supports intervention ladders and self-control tool categories. | Does not validate every DaD action. |
| Roffarello & De Russis (2023) DSCT review/meta-analysis. | strong / moderate for DaD | Supports humility, ethics, and local validation. | Broad field-level evidence. |

## What The Evidence Supports

- Strong enforcement is not automatically hostile if it executes a user's own prior commitment.
- Strong enforcement becomes risky when it is surprising, opaque, permanent, moralizing, or impossible to inspect.
- Antifreedom language increases reactance risk.
- Neutral rule-based copy is safer than person-judging copy.
- Autonomy support can coexist with structure when the structure is self-endorsed.
- Safe choices matter, but safe choice does not mean every forbidden action must remain immediately available.
- Proportional intervention is important because the intervention itself can become a burden.
- DaD should validate strong interventions locally rather than assume they help every user.

## What Remains Uncertain

- Which DaD users prefer hard enforcement versus delayed relaxation.
- Whether "Continue with reason" reduces drift or becomes performative friction.
- Whether hard quarantine feels protective or punitive in real use.
- What emergency escape design best balances trust and bypass resistance.
- Whether users understand locked schedules as self-binding without extra education.
- How much explanation is enough before it becomes clutter.

## DaD Design Implications

1. Strong interventions must satisfy the enforcement contract:

   - user-owned: tied to a plan, schedule, or chosen rule;
   - scoped: clear target and affected page/action;
   - transparent: reason visible;
   - time-bounded where possible: lock end or cooldown visible;
   - action-preserving: safe choices remain;
   - reviewable: the user can inspect diagnostics or later adjust;
   - non-moralizing: no shame or identity judgment.

2. Enforcement copy should describe state, not character:

   Good:

   - "Locked schedule active."
   - "This change would weaken the active plan."
   - "Relaxing protection is available after 18:00."
   - "Return to the last coherent page or start a new chain."

   Bad:

   - "You are trying to bypass protection."
   - "You cannot be trusted."
   - "DaD knows this is not intentional."
   - "Stop wasting time."

3. Safe choices should be present even during enforcement:

   - Return.
   - Inspect graph.
   - Add protection.
   - Queue relaxation for after lock.
   - Start a new chain if policy allows.
   - Emergency escape if configured.

4. Enforcement should be strongest when precommitted:

   Hard blocking is most defensible inside locked schedules, explicit block rules, strict breaks, or active hard-quarantine plan policy. Outside precommitment, prefer lower-friction interventions unless multiple strong signals converge.

5. Do not make shame a mechanism:

   Shame may create short-term friction, but it damages trust. DaD should protect, clarify, and redirect.

## Scoring Implications

Core signal candidates:

- Active locked schedule.
- Explicit block rule.
- Explicit plan intervention policy.
- User-selected strict break.
- Active hard-quarantine policy.
- Repeated failed return from a drift-descendant chain.

Modifier candidates:

- Recent blocked relaxation attempts.
- Repeated Continue after failed outcomes.
- High intent-drift score.
- Passive media or recommender pressure during protected work.
- Repeated same-chain drift descendants.

Diagnostic-only candidates:

- How often a prompt caused Continue, Return, Isolate, or graph view.
- Whether users later adjusted the lock.
- Whether emergency escape was used.
- Whether intervention frequency is increasing.

Avoid:

- "lying" score;
- "untrustworthy" state;
- shame score;
- inferred diagnosis;
- hidden punishment escalation;
- hard enforcement from a single weak signal.

## Intervention Implications

| Intervention | Appropriate Use | Reactance Risk | Guidance |
| --- | --- | --- | --- |
| Warning | weak or ambiguous signal | Low if non-moralizing. | Use uncertain language. |
| Grayscale / reduce-noise | moderate drift, reversible cleanup | Medium if unexplained. | Show that it is page-local and reversible. |
| Continue with reason | prompt-level drift | Medium; can feel accusatory. | Ask what makes the page intentional now, not why the user failed. |
| Isolate | legitimate branch | Medium; can become bypass. | Frame as new chain, not global trust. |
| Return | drift recovery | Low to medium if target is wrong. | Show target before action. |
| Show graph | explanation and offloading | Low, privacy-sensitive if too detailed. | Keep local and compact. |
| Locked-edit rejection | active lock relaxation | High if abrupt. | Show active lock and when relaxation is available. |
| Queued relaxation | active lock non-emergency | Lower than hard denial. | Make pending change visible. |
| Hard quarantine | precommitted or locked high-risk context | High. | Use only with visible reason, Return, end/cooldown, and policy explanation. |
| Emergency escape | real mistake or safety need | Bypass risk. | Separate from ordinary relaxation; log locally and review. |

## Privacy Implications

Safe local data:

- active rule or plan id;
- lock state and end time;
- intervention type;
- user action selected: Continue, Isolate, Return, Show graph;
- queued relaxation count;
- emergency escape count;
- aggregate false-positive feedback.

Risky data:

- long free-text reasons;
- hidden emotional-state inference;
- raw browsing history;
- raw page text;
- raw typed input;
- cloud-uploaded intervention history.

Data to avoid by default:

- shame labels;
- honesty labels;
- personality labels;
- mental-health guesses;
- "low-lucidity" as a hidden punitive state.

Low-lucidity can be a private design concept for protection, but the UI should usually talk about active plans, locked schedules, and protection state.

## Autonomy And Reactance Implications

DaD should preserve autonomy through structure, not by abandoning enforcement.

The user should always be able to answer:

- What is happening?
- Which rule did I configure?
- Why did DaD act now?
- What choices remain?
- When can I change this?
- How do I handle a real mistake?

This converts enforcement from a mysterious restriction into a legible boundary. A boundary can still be frustrating, but it is less likely to feel like contempt.

## Safe Claims

- DaD uses user-owned plans and schedules to support precommitted protection.
- DaD tries to explain strong interventions instead of shaming the user.
- DaD keeps safe recovery actions available during protection.
- DaD treats strong enforcement as a scoped boundary, not a judgment of the user.
- DaD is research-informed by reactance, autonomy-support, and digital self-control literature.

## Forbidden Overclaims

- "DaD knows when you are lying."
- "If you resist the extension, that proves it is working."
- "Strong blocking is always good for you."
- "DaD can infer your true intention."
- "Reactance means the user is irrational."
- "Autonomy support means every action must always remain available."
- "DaD is clinically validated to treat compulsive use."

## Implementation Handoff

Affected files or docs:

- `docs/protection-model.md`
- `docs/dad_intent_coherence_system.md`
- blocked-page UI copy
- intent prompt copy
- locked-edit refusal copy
- Pomodoro strict-break copy
- localization keys for enforcement messages
- tests around protected-plan strictness and prompt rendering

Minimum viable future changes:

- Add a shared enforcement-copy checklist in docs or code comments near prompt rendering.
- Replace any accusatory copy with rule-based copy.
- Ensure locked-edit rejections show active lock end time when known.
- Add "queue for after lock" design notes for relaxation changes.
- Ensure hard quarantine always shows reason, recovery action, and scope.
- Add tests that prompt rendering uses uncertain language such as "appears" instead of certainty language such as "is".

Tests needed:

- Locked edit refusal includes active rule context.
- Prompt copy does not use "trust", "lying", "failed", "wasting", or similar hostile terms except in research docs.
- Hard quarantine includes Return or equivalent recovery path.
- Continue is unavailable only where plan policy explicitly removes it.
- Show graph and diagnostics do not expose raw sensitive content.

Rollout risk:

- Too much enforcement without explanation creates reactance.
- Too much choice during a lock turns precommitment into theater.
- Too much explanation creates clutter and prompt fatigue.
- Emergency escape can become a bypass if it is ordinary and frictionless.
- Shame copy can damage trust even if the enforcement decision is correct.

## Open Questions

- Should DaD define soft lock and hard lock modes explicitly?
- Should emergency escape be global, per plan, or disabled by default?
- Should relaxation changes be queued automatically or only on request?
- Should the UI say "locked by your schedule" instead of just "locked"?
- Should all enforcement surfaces have a "why?" affordance?
- Should local feedback ask "protective or too rigid?" after hard interventions?

## Current Answer Status

Initial answer complete. Strong conclusion: enforce as user-owned, scoped, transparent structure; never enforce through shame or hidden authority. Revisit after implementation surfaces have been audited for wording and after local false-positive/reactance feedback exists.
