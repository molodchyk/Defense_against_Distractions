# Research Synthesis

## Question

`RQ-001`: When do locked schedules, precommitment, and stricter-only configuration edits help self-control, and when do they backfire?

## Short Answer

The evidence supports DaD's locked-schedule model as a legitimate commitment-device pattern: a user can choose structure in advance so that later, more vulnerable states cannot easily relax protection. This is strongest when the lock is voluntary, scoped, transparent, time-bounded, and connected to the user's own earlier plan.

The evidence also warns against treating "stronger lock" as automatically better. Commitment devices can be badly calibrated. Users may choose contracts that are too weak to work, too harsh to tolerate, too broad for real life, or based on inaccurate predictions of their future state. DaD should therefore keep the stricter-only rule during active locked schedules, but surround it with preview, explanation, emergency semantics, post-lock review, and local validation.

The correct philosophy is not "the extension knows better than the user." It is: "the active lock executes a user-chosen earlier commitment; during the locked window DaD allows protection-increasing edits and delays protection-weakening edits."

## Evidence Summary

| Evidence | Grade | Relevance | Caveat |
| --- | --- | --- | --- |
| Bryan, Karlan, & Nelson (2010) review commitment-device theory and evidence. | strong / moderate for DaD | Supports commitment devices and hard/soft distinction. | Not specific to browser extensions. |
| Ariely & Wertenbroch (2002) show people self-impose costly deadlines and benefit, but do not set them optimally. | moderate | Supports user-created locked schedules and need for setup guardrails. | Academic deadlines, not digital distraction. |
| Ashraf, Karlan, & Yin (2006) show field evidence for voluntary commitment savings. | moderate | Supports "calm self binds future self" structure. | Savings is not attention. |
| John (2015) shows commitment can fail when users choose ill-suited contracts. | moderate | Main warning against overly harsh or poorly calibrated locks. | Financial product context. |
| Duckworth, Gendler, & Gross (2016) frame self-control as situation selection/modification, not just inhibition. | strong / moderate for DaD | Supports preemptive browser environment design. | Conceptual review. |
| Lyngs et al. (2019) review digital self-control tools and mechanisms. | moderate | Places DaD in known DSCT design space. | Maps tools more than it validates each feature. |
| Roffarello & De Russis (2023) systematic review/meta-analysis warns evidence and evaluation gaps remain. | strong / moderate for DaD | Supports humility and local validation. | Broad DSCT evidence, not locked schedules only. |
| Reynolds-Tylus (2019) summarizes reactance to perceived freedom threats. | moderate | Explains why locks need careful wording and autonomy support. | Health communication context. |
| Ryan & Deci (2000) support autonomy as central to motivation. | moderate | Guides distinction between self-binding and coercion. | Broad theory, not lock-specific. |
| Bol et al. (2019) suggest providing choice can improve digital communication for high-autonomy users. | weak / moderate | Supports safe choices during lock. | Health communication, not enforcement. |

## What The Evidence Supports

- Voluntary precommitment is a real self-control strategy.
- Time-bounded locked schedules are defensible when configured before the vulnerable state.
- Allowing stricter edits during an active lock is coherent: it preserves or increases the earlier protective intent.
- Blocking relaxation during the locked window is coherent if the relaxation would undermine the precommitted plan.
- Situation modification is a better frame than "willpower failure": DaD changes the environment before the impulse peaks.
- Hard commitments need safeguards because people can mispredict their future behavior.
- Autonomy is preserved less by "allow everything now" and more by pre-choice, clarity, scope, meaningful safe options, and later review.

## What Remains Uncertain

- How long DaD locks should be by default.
- Which emergency escape design best balances safety and autonomy.
- Whether DaD users prefer hard lock, delayed relaxation, password friction, or accountability friction.
- Whether blocked relaxation attempts predict later satisfaction or resentment.
- Whether enabling Pomodoro during a lock is always experienced as stricter or sometimes as an unwanted added burden.
- Whether some users need a "soft locked" mode before hard locked schedules.

## DaD Design Implications

1. Keep the core protected-edit policy:

   - allow stricter changes during active locked schedules;
   - reject or delay changes that relax protection;
   - treat enabling or tightening Pomodoro as allowed when it increases protection;
   - treat pausing, disabling, shortening required rest, weakening intent interventions, adding allowed sites, removing blocked sites, or lowering keyword scores as relaxation.

2. Make the policy explicit in the UI:

   - "Locked schedule active."
   - "You can add protection now."
   - "Relaxing protection waits until this locked period ends."
   - "Ends at [time]."

3. Add post-lock review as future work:

   - "This lock blocked 3 relaxation attempts."
   - "Keep, adjust, or remove this locked schedule?"
   - "Did this feel protective or too rigid?"

4. Prefer delay over permanent denial where possible:

   - queue a relaxation change for after the schedule;
   - require a calm review outside locked time;
   - show pending changes clearly.

5. Keep emergency semantics separate:

   Emergency escape should not be disguised as ordinary relaxation. It should be explicit, logged locally, and designed for real mistakes or safety needs, not casual bypass.

## Scoring Implications

Core signal:

- Active locked schedule.
- Edit type weakens an active protected plan.
- Edit type strengthens an active protected plan.

Modifier:

- Repeated relaxation attempts during the same lock.
- Recent blocked-page attempts.
- Active Pomodoro work phase.
- Intent coherence in `intervene` or `locked` range.

Diagnostic-only:

- Number of times relaxation was blocked.
- Time until lock ends.
- Whether the user later adjusted the schedule.
- Whether emergency escape was used.

Avoid:

- "User is lying."
- "User cannot be trusted."
- Clinical or moral labels.
- Secret scoring of personality or mental health.

## Intervention Implications

| Intervention | Appropriate Severity | Risk | Guidance |
| --- | --- | --- | --- |
| Allow stricter edit | active lock | Low, unless scope expansion is unclear. | Explain that protection was increased. |
| Block relaxation | active hard lock | Reactance if surprising. | Show lock end time and reason. |
| Delay relaxation | active lock, non-emergency | Lower than hard denial. | Let user queue change for post-lock review. |
| Ask for reason | ambiguous relaxation or soft lock | Can become performative. | Use sparingly; do not shame. |
| Emergency escape | real mistake, safety, access need | Can become bypass path. | Make explicit and locally visible. |
| Post-lock review | after lock ends | Low. | Use to improve calibration. |

## Privacy Implications

Safe local data:

- active schedule id;
- lock start/end;
- edit category: stricter, neutral, relaxation;
- blocked relaxation count;
- queued relaxation count;
- emergency escape count;
- local post-lock rating.

Risky data:

- raw reasons for override;
- full URLs involved in bypass attempts;
- raw page text or typed notes;
- cross-device behavioral profiles.

Data to avoid by default:

- private text explaining why the user wanted to bypass;
- clinical-state guesses;
- inferred honesty or deception labels.

If DaD stores reason prompts, they should be local, bounded, user-visible, and optional.

## Autonomy And Reactance Implications

DaD should preserve trust by making the lock feel like execution of the user's own earlier plan.

Good locked-state language:

- "This locked schedule is active."
- "Relaxing this plan is unavailable until 18:00."
- "You can still add protection."
- "This change would weaken the active plan."
- "Queue this change for review after the lock."

Bad locked-state language:

- "You are not allowed."
- "You cannot be trusted."
- "You are trying to bypass protection."
- "DaD detected that you are lying."
- "For your own good."

The user should remain competent inside the UI. They should understand:

- what rule is active;
- who created it;
- when it ends;
- what can be changed now;
- what can be changed later;
- how to handle real mistakes.

## Safe Claims

- DaD supports user-chosen precommitment.
- DaD can make protection harder to relax during a scheduled protected period.
- DaD allows protection-increasing changes during locked schedules.
- DaD is research-informed by commitment-device, self-control, and digital wellbeing literature.
- DaD changes the browsing environment so the user does not rely only on in-the-moment willpower.

## Forbidden Overclaims

- "DaD scientifically proves you will focus."
- "Locked schedules fix addiction."
- "Users are irrational during locks."
- "DaD detects lies."
- "Stronger locks are always better."
- "The optimal lock can be inferred automatically from browsing behavior."
- "Any user who wants to relax protection is in a low-lucidity state."

## Implementation Handoff

Affected files or docs:

- `docs/protection-model.md`
- `docs/pomodoro-implementation.md`
- `docs/dad_intent_coherence_system.md`
- options-page locked edit UI
- plan strictness comparator tests

Minimum viable future change:

- Add a clear locked-edit explanation component wherever a relaxation edit is rejected.
- Add "queue for after lock" for at least one low-risk relaxation class, such as lowering Pomodoro strictness or disabling a UI cleanup rule.
- Add local diagnostic counters for blocked relaxation attempts and queued changes.

Tests needed:

- stricter edits remain allowed during active locked schedule;
- relaxation edits are rejected or queued;
- queued relaxation is not applied until lock ends;
- enabling Pomodoro during lock is allowed only when strictness increases;
- disabling or weakening Pomodoro during lock is blocked or queued;
- UI copy does not use hostile labels.

Rollout risk:

- If DaD only blocks relaxation without explaining why, users may experience reactance.
- If DaD makes emergency escape too easy, locked schedules become theater.
- If DaD makes emergency escape impossible, a mistaken lock can become hostile.

## Open Questions

- Should DaD support a user-configured emergency escape?
- Should queued relaxation require a cooldown after the lock ends?
- Should first-time locked schedule setup require a preview screen?
- Should DaD distinguish "soft lock" and "hard lock" plans?
- Should post-lock review become part of the release path or remain future work?

## Current Answer Status

Initial answer complete. Marked as research-informed, not final empirical validation. Revisit after DaD has local post-lock outcome data.
