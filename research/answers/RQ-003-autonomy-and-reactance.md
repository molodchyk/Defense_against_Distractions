# Research Synthesis

## Question

`RQ-003`: How can DaD enforce precommitted protection without creating reactance, bypass pressure, abandonment, or a system the user experiences as hostile?

## Short Answer

DaD should not treat "autonomy" as softness. The stronger answer from the literature is that effective self-protection needs **legitimate constraint**: a restriction that is strong enough to change behavior, but still experienced as executing the user's earlier self-authored rule rather than as a mysterious external authority.

The non-obvious part is that weaker is not always better. Smartphone lockout studies found that even tiny friction discouraged use, and heavier friction discouraged much more. GoalKeeper found restrictive mechanisms were more effective than warnings. But the same evidence also shows the failure mode: rigid restriction creates frustration and pressure when context changes and the system cannot represent why the user now needs something different.

So the product problem is not "avoid enforcement." It is:

- make the lock strong enough to matter;
- make its source, scope, and end visible enough to preserve legitimacy;
- keep choices real but bounded so the user can recover, defer, branch, or inspect without immediately dissolving the commitment;
- treat bypass and repeated softening as diagnostics of a misfit, not as moral failure.

## Non-Obvious Findings

| Finding | Source | Why It Is Non-Obvious | DaD Consequence |
| --- | --- | --- | --- |
| A pause-only lockout discouraged 13.1% of app launches; a 30-digit task discouraged 47.5%. | Kim et al. 2019, LocknType | Very small access costs can change behavior measurably; friction does not need to be dramatic to matter. | DaD should tune friction as a dose, not jump from warning to total block. |
| Restrictive mechanisms outperformed warnings in a four-week field study, but increased frustration and pressure because real usage contexts varied. | Kim et al. 2019, GoalKeeper | "Strong is hostile" is too simple. Strong works, but fails when context-legibility is poor. | Locked schedules can be strict, but they need review windows, queued changes, and emergency escape semantics. |
| Rotating web interventions reduced time on site but increased uninstall attrition; a just-in-time explanation about rotation cut attrition roughly in half. | Kovacs et al. 2018 | More effective intervention can reduce retention if the system violates the user's mental model. | DaD should explain unexpected escalation or changed intervention mode at the moment it happens. |
| HabitLab users gradually weakened interventions while repeatedly asking to be asked again next visit, rather than saving the easy setting. | Kovacs et al. 2021 | The "future self will re-strengthen it" pattern is measurable, not just a metaphor. | During locks, relaxation should often queue or expire rather than become permanent immediately. |
| In digital health messaging, provision of choice improved evaluation; autonomy-supportive language did not significantly affect outcomes. | Smit et al. 2019 | Nice wording did less than actual choice. | DaD cannot solve reactance with copy alone; it must offer meaningful bounded actions. |
| High freedom-threatening language increased anger, negative cognitions, and reactance; gain/loss framing did not reliably matter. | Li & Shi 2026 | The dangerous copy feature is not "negative framing" in general but perceived freedom threat. | DaD copy should focus on rule execution and available actions, not persuasion or scolding. |
| Reactance is best modeled as intertwined anger and counterarguing, not just dislike. | Dillard & Shen 2005; Rains 2013 | Users may become motivated to restore the restricted freedom, including through bypass or source rejection. | DaD should instrument bypass pressure and source rejection signals locally. |
| Choice can deplete or help depending on whether it feels autonomous or controlled; controlled choice is more costly. | Moller et al. 2006; Muraven et al. 2008 | "More choice" can be an additional cognitive load if it feels forced. | Enforcement prompts should offer a few decisive actions, not a large menu. |
| The average choice-overload effect across 50 experiments was near zero, with large heterogeneity. | Scheibehenne et al. 2010 | The simple rule "fewer choices are always better" is false. Choice overload depends on context, preference clarity, and decision structure. | DaD should use small action sets because intervention moments are high-pressure, not because choice is universally bad. |
| Facebook self-control interventions produced cross-device shifts: 86% in the goal-reminder condition and 57% in the no-feed condition reported changed smartphone-vs-laptop use. | Lyngs et al. 2020 | Users may route around a local intervention while still using it constructively. | DaD should treat bypass as ambiguous: sometimes evasion, sometimes deliberate context separation. |

## Mechanisms

### 1. Legitimacy, Not Niceness

Reactance starts when a restriction is experienced as a threat to a freedom the person believes they have. This is not the same as dislike. It can become a motivational state that drives freedom restoration, source derogation, or indirect substitution.

For DaD, the dangerous condition is not "a page was blocked." It is "a page was blocked and the user cannot reconstruct why this restriction is a valid execution of their own plan." A lock can be strict and still legitimate if the user sees:

- the active rule or schedule;
- when it was chosen or last edited;
- what action is currently forbidden;
- what actions remain available;
- when ordinary relaxation becomes available;
- how a real mistake is handled.

### 2. Friction Dose

LocknType suggests access friction can be dose-shaped. A pause-only action changed behavior; heavier typing changed more. This supports an intervention ladder with measurable severity instead of only two states: passive warning or hard block.

DaD implication: "Continue with reason," cooldown, delayed Continue, queued relaxation, and hard quarantine are different doses. They should be selected by policy strength and evidence strength, not by vague annoyance.

### 3. Context Collision

GoalKeeper is the central warning for DaD. Restriction worked better than warning, but frustration came from diversity of contexts and needs. The product failure is not restriction itself; it is restriction that cannot understand legitimate exceptions.

DaD implication: locked schedules can forbid relaxation now, but should support:

- queued relaxation after the lock;
- emergency escape distinct from normal relaxation;
- a visible reason why the locked schedule overrides the attempted change;
- later review of repeated emergency or queued-change events.

### 4. Real Bounded Choice

Smit et al. found that actual choice affected intervention evaluation, while autonomy-supportive language did not. This means DaD should not rely on "friendly wording" as the autonomy layer. The autonomy layer is the action set.

Bounded choice during enforcement means the user can still do something consequential without weakening the active commitment:

- Return to the protected target;
- Isolate into a new chain when policy allows;
- Show graph;
- queue a relaxation;
- add a stricter rule;
- wait until a visible unlock time;
- use a configured emergency path.

### 5. Temporary Weakening Is A Behavior Pattern

HabitLab users weakening interventions over time while asking to be asked again later maps directly onto DaD's locked-schedule philosophy. The user may sincerely want a weaker setting now and sincerely want the system not to treat that as the new baseline.

DaD implication: during a locked schedule, a relaxation attempt should usually become a **future-dated proposal**, not an immediate permanent settings change. Conversely, stricter changes can apply immediately because they align with the active commitment.

### 6. Explanation Prevents Attrition When The System Changes

The HabitLab rotation study is especially relevant because rotating interventions increased effectiveness but also uninstall attrition. The mitigation was not simply a weaker intervention; it was a just-in-time explanation that improved the user's mental model.

DaD implication: when DaD escalates from warning to prompt, prompt to quarantine, or normal prompt to locked policy, it should show the reason at the point of escalation. Hidden escalation is a trust cost.

### 7. Bypass Is Ambiguous Evidence

The Facebook intervention study showed cross-device shifts. Some participants used a phone to access features blocked or disrupted on the laptop, but sometimes described this as making use more deliberate. That means bypass is not always "the user defeated the tool."

DaD implication: local bypass-like behavior should be interpreted by pattern:

- immediate repeated escape into the same feed after a lock is a protection failure;
- phone/laptop separation may be intentional context partitioning;
- repeated emergency escape is a mismatch signal;
- repeated queued relaxation is a setup-review signal;
- repeated uninstall/disable patterns are a legitimacy failure.

## Empirical Details

| Source | Sample / Scope | Measured Result | Product Reversal |
| --- | --- | --- | --- |
| Kim et al. 2019, LocknType | 40 participants, three-week in-situ smartphone study | pause-only discouraged 13.1% of app use; 30-digit input discouraged 47.5% | Use friction dose, not only binary blocking. |
| Kim et al. 2019, GoalKeeper | 36 participants, four-week field experiment | restrictive mechanisms more effective than warnings; also more frustration and pressure | Strong locks need context and review, not weaker default policy. |
| Kovacs et al. 2018 | three in-the-wild HabitLab experiments | rotating interventions reduced time on site but increased uninstall attrition; explanation reduced attrition roughly by half | Effectiveness and retention can move in opposite directions. |
| Kovacs et al. 2021 | logs from 8,000+ HabitLab users | users weakened intervention challenge over time but often requested being asked again next visit | Make relaxation temporary or queued under lock. |
| Lyngs et al. 2020 | Facebook browser intervention study | goal reminders reduced daily visits from median 29.4 to 10.6 during intervention; cross-device shifts reported by 86% goal-reminder and 57% no-feed participants | Bypass-like routing can coexist with successful self-control. |
| Smit et al. 2019 | 525 Dutch adults in a Web-based 2x2 experiment | choice improved overall evaluation (b=.12, P=.003); language had no significant effects | Bounded choices matter more than autonomy-flavored copy. |
| Li & Shi 2026 | meta-analyses of 28 articles, 33 studies, 146 effect sizes | high freedom-threatening language increased anger (r=.21), negative cognitions (r=.17), and reactance (r=.20); gain/loss framing near zero | Avoid controlling language; do not over-optimize generic positive/negative framing. |
| Rains 2013 | meta-analysis, K=20, N=4,942 | intertwined anger plus counterarguing model best fit reactance | Track bypass/rejection pressure, not only satisfaction. |
| Moller et al. 2006 | three experiments | controlled choice depleted; autonomous choice did not show the same depletion pattern | Too many forced decisions inside a prompt can become part of the burden. |
| Muraven et al. 2008 | three experiments | autonomy support during self-control improved later self-control performance; effects not explained by stress, anxiety, unpleasantness, or lower motivation | The same restriction can cost less when self-endorsed. |
| Scheibehenne et al. 2010 | 63 conditions from 50 experiments, N=5,036 | mean choice-overload effect virtually zero with high variance | Use bounded choice because of prompt context, not a universal anti-choice doctrine. |

## Evidence Map

| Evidence | Grade | Relevance | Caveat |
| --- | --- | --- | --- |
| Smartphone lockout and GoalKeeper field studies show friction and restriction can reduce use more than warnings. | moderate | Supports strong DaD locks and dose-shaped friction. | App-launch studies are adjacent to browser-extension protection, not identical. |
| HabitLab studies show effective interventions can increase attrition, while explanation and ask-later patterns change acceptance. | moderate | Supports just-in-time legitimacy explanations, queued relaxation, and expiring weakening. | HabitLab users and intervention ecology differ from DaD. |
| Reactance meta-analyses support freedom threat, anger, and counterarguing as a coherent mechanism. | strong | Supports treating bypass pressure and source rejection as local diagnostics. | General persuasion/health evidence must be translated carefully to software locks. |
| Autonomy and choice studies show real choice can help, while controlled choice can add self-control cost. | moderate | Supports bounded meaningful actions over friendly copy alone. | Lab and health-message results do not directly set DaD prompt thresholds. |
| Choice-overload meta-analysis shows the simple "fewer options always helps" rule is false. | strong | Supports small action sets because of intervention context, not as universal doctrine. | Does not identify the exact optimal DaD action count. |
| Facebook self-control intervention evidence shows bypass-like cross-device shifts can coexist with successful self-control. | moderate | Supports classifying bypass patterns as ambiguous diagnostics instead of moral failure. | Cross-device behavior may not be observable or desirable for DaD to monitor. |

## Assumptions Updated

- Old assumption: Reactance mainly means the UI should sound less harsh.
- Updated: Reactance is a freedom-restoration system. The important product signals are bypass pressure, source rejection, repeated emergency escape, and settings weakening.

- Old assumption: Strong intervention risks hostility, so softer is safer.
- Updated: Restrictive mechanisms can outperform warnings. The safety issue is whether the restriction remains context-legible and reviewable.

- Old assumption: Autonomy support mostly lives in wording.
- Updated: Real bounded choices matter more than autonomy-supportive phrasing in at least one digital experiment.

- Old assumption: If the user weakens a tool, that is their stable preference.
- Updated: Users may weaken now while wanting to be asked to re-strengthen soon. This supports queued and expiring relaxation.

- Old assumption: Bypass is always defeat.
- Updated: Bypass-like routing can be context partitioning. DaD should classify patterns before escalating.

- Old assumption: More options preserve autonomy.
- Updated: Forced or poorly structured choice can increase self-control cost; intervention moments need a small set of high-leverage choices.

## DaD Design Implications

1. Define a legitimacy contract for every strong intervention:

   - `source`: plan, locked schedule, Pomodoro strict break, explicit block rule, hard quarantine policy;
   - `scope`: current page, domain, tab chain, plan, schedule window;
   - `strength`: warning, friction, prompt, temporary block, hard block;
   - `end`: cooldown, Pomodoro phase end, schedule unlock, manual review time;
   - `safe actions`: return, graph, queue change, emergency escape, stricter edit;
   - `review`: where this rule can be changed after the lock.

2. During a locked schedule:

   - permit changes that make protection stricter;
   - reject or queue changes that make protection weaker;
   - allow Pomodoro enablement if it adds strict work/rest structure rather than loosening protection;
   - expose the lock end or review time;
   - separate emergency escape from normal relaxation.

3. Replace dead ends with bounded action sets:

   - For drift prompt: `Return`, `Isolate`, `Show graph`, and policy-gated `Continue`.
   - For hard quarantine: `Return`, `Show graph`, `Emergency escape` if configured, and `Wait`.
   - For locked settings: `Queue for after lock`, `Make stricter now`, `Inspect active lock`.

4. Treat explanation as part of enforcement:

   - show why the intervention escalated;
   - show why the user cannot relax it now;
   - show why the same action is allowed after the lock;
   - show when an unexpected intervention mode changed.

5. Track bypass pressure locally without moral labels:

   - repeated Continue followed by deeper drift;
   - repeated emergency escape;
   - repeated queued relaxation;
   - immediate return to blocked domain after escape;
   - extension disable/re-enable if detectable;
   - repeated isolate into same feed-like domain.

## Scoring Implications

Signals that increase intervention strength:

- active locked schedule or strict Pomodoro phase;
- explicit high-risk rule triggered;
- repeated drift descendants after Continue;
- repeated emergency escape in the same schedule window;
- repeated queued relaxation of the same rule;
- intervention mode previously explained but repeatedly rejected;
- low recoverability from RQ-002 plus locked context.

Signals that should lower immediate escalation or trigger review instead:

- first-time emergency escape;
- repeated queued relaxation across multiple days;
- repeated Isolate into the same work-relevant host;
- bypass-like cross-device pattern that might be intentional context separation;
- high false-positive feedback;
- prompt shown during active input or high-cost task moment.

Avoid:

- treating every bypass as failure;
- treating every Continue as proof the system was wrong;
- making relaxation permanent during locked context by default;
- escalating only because the user sounds annoyed;
- hiding stronger future behavior behind generic labels.

## Intervention Implications

| Intervention | Evidence Fit | Good Use | Failure Mode | Requirement |
| --- | --- | --- | --- | --- |
| Warning | weak evidence or first encounter | preserve flow | ignored over time | low burden, no false precision |
| Continue with reason | medium drift, not locked hard | pause automaticity | becomes rote bypass | short, local, outcome-tracked |
| Delay / cooldown | repeated drift or strict phase | friction dose | feels arbitrary | visible timer and source |
| Return | drift recovery | restores trajectory | wrong target breaks trust | show target |
| Isolate | legitimate branch | preserves autonomy without weakening plan | domain trust bypass | local branch only |
| Show graph | mental model repair | explains chain and target | surveillance feel | compact host-level graph |
| Queue relaxation | locked schedule relaxation attempt | preserves future self-binding | queue clutter | visible pending state |
| Make stricter now | locked schedule | aligns with active commitment | accidental over-tightening | confirm scope |
| Emergency escape | real mistake/safety case | preserves trust | becomes ordinary bypass | separate, logged locally, reviewed |
| Hard quarantine | precommitted high-risk state | strong protection | context collision | source, scope, end, recovery action |

## Privacy Implications

The useful measurement is not raw content. It is local evidence of legitimacy and fit.

Safe local metrics:

- intervention type;
- active rule/schedule id;
- lock source and end time;
- action selected;
- queued relaxation count;
- emergency escape count;
- repeated same-domain isolation;
- whether Continue was followed by deeper drift;
- whether Show graph preceded Return;
- false-positive feedback category.

Avoid by default:

- raw reason text retained long term;
- raw page text;
- raw typed input;
- hidden "willpower" or "honesty" labels;
- cross-device inference unless explicitly designed and consented;
- cloud upload of intervention history.

## Local Validation Metrics

- `strictChangeAllowedDuringLock`: stricter edits accepted while weaker edits are queued/rejected.
- `queuedRelaxationAppliedAfterLock`: queued changes are offered after schedule unlock.
- `emergencyEscapeRepeatRate`: repeated escape rate per schedule and per rule.
- `continueThenDriftDeeper`: Continue followed by deeper same-chain drift.
- `isolateRepeatSameHost`: repeated isolate into the same host/category.
- `interventionModeExplained`: whether escalation included source/scope/end.
- `hardBlockReturnRate`: hard intervention followed by Return versus escape/disable.
- `lockFrustrationProxy`: repeated settings open, queued relaxation, emergency escape, and disable attempts within a lock window.
- `falsePositiveAfterStrictMode`: feedback after stricter policies.
- `postLockReviewAccepted`: whether users accept, discard, or modify queued relaxations.

## Implementation Handoff

Affected areas:

- `docs/protection-model.md`
- `docs/dad_intent_coherence_system.md`
- locked schedule settings guard
- Pomodoro enablement during locks
- blocked page / hard quarantine actions
- intent drift prompt actions
- local diagnostics
- future onboarding for lock semantics

Minimum next product changes:

- Model locked edit attempts as `stricter`, `same`, or `weaker`.
- Allow stricter locked edits immediately.
- Queue or reject weaker locked edits with visible lock source and unlock time.
- Treat Pomodoro enablement as stricter when it adds work/rest enforcement.
- Give hard quarantine at least one recovery action and one explanation action.
- Add local counters for repeated Continue, Isolate, queued relaxation, and emergency escape.

Tests needed:

- locked schedule allows stricter setting changes;
- locked schedule blocks or queues weaker setting changes;
- enabling Pomodoro is permitted when it increases strictness;
- hard quarantine shows source, scope, and recovery;
- Continue is unavailable only when policy explicitly removes it;
- queued relaxation does not apply until unlock;
- emergency escape is separate from ordinary Continue;
- local diagnostics do not store raw browsing content.

## Revisit Triggers

- Users repeatedly weaken locks and keep those weaker settings after unlock.
- Emergency escape becomes a common path rather than a rare exception.
- Users repeatedly queue the same relaxation, suggesting the lock is overbroad.
- Hard quarantine causes extension disable/uninstall.
- Users repeatedly isolate the same sites, suggesting legitimate recurring branches.
- Prompt burden rises while Return rates do not improve.

## Open Questions

- Should queued relaxation be automatic after unlock or require confirmation?
- Should emergency escape have a cooldown, note, or later review screen?
- Should DaD expose "strictness changed now" versus "strictness queued" as a general settings pattern?
- Should lock legitimacy be surfaced in the popup status card?
- Should repeated bypass pressure open a plan review rather than escalating enforcement?

## Current Answer Status

Answered under the revised quality bar. The product-changing conclusion is that DaD should enforce strong self-authored constraints, but every strong intervention needs a visible legitimacy contract, bounded real choices, and local diagnostics for bypass pressure and context mismatch.
