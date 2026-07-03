# Research Question Brief

## Question ID

`RQ-001`

## Working Title

Commitment devices and locked schedules.

## Exact Question

When do locked schedules, precommitment, and stricter-only configuration edits help self-control, and when do they backfire?

## Why DaD Needs This

DaD already treats locked schedules as mission-critical protection. During a locked schedule, the user can make the active plan stricter, but cannot relax protection. This includes allowing changes such as enabling Pomodoro when it increases protection, while blocking changes such as disabling the plan, removing blocked sites, lowering keyword scores, weakening Pomodoro, or softening intent interventions.

Research should clarify whether this policy is scientifically defensible, where it needs escape valves, and how the UI should explain it.

## Affected Features

- Locked schedules.
- Protected plan editing.
- Pomodoro enable/start/resume behavior during locked protection.
- Delayed or blocked relaxation.
- Import/export and ruleset import during protected states.
- Public explanation of self-binding.

## Scope

Included:

- Commitment devices.
- Precommitment.
- Self-binding.
- Hard versus soft commitments.
- Deadlines and delayed gratification.
- Hot-state versus cold-state configuration.
- Autonomy-preserving escape valves.

Excluded:

- Clinical addiction treatment.
- Parental control use cases.
- Employer or school surveillance.
- Cloud accountability systems.
- Password recovery mechanics unless directly relevant to commitment-device design.

## Evidence Needed

- Systematic reviews or reviews on commitment devices.
- Behavioral economics papers on precommitment and deadlines.
- Psychology research on self-control strategy selection.
- HCI/digital wellbeing studies about lockout tools and bypass behavior.
- Reactance/autonomy research where strong restriction can backfire.

## Novelty Target

This pass should find information that changes lock policy beyond "commitment can help." Useful findings include measured commitment take-up rates, abandonment or non-use rates, penalty-size effects, deadline-miscalibration effects, who benefits from hard versus soft commitment, how people behave when escape remains possible, and cases where public strictness or overcommitment makes outcomes worse.

## Novelty Proof Obligations

- Identify measured take-up, abandonment, completion, or welfare differences for hard commitments versus soft/default commitments.
- Find at least one boundary condition where stricter commitment backfires, such as miscalibrated deadlines, penalty avoidance, overcommitment, or public strictness distortion.
- Translate the evidence into a lock-policy rule DaD would not infer from intuition alone, such as delayed relaxation, emergency escape, temporary weakening, or stricter-only edit boundaries.

## Product Decisions This Could Change

- Which edits are allowed during locked schedules.
- Whether some relaxation should be delayed rather than forbidden.
- Whether emergency escape should exist and how it should work.
- Whether the extension should distinguish planned strictness from impulsive strictness.
- How the UI explains "stricter allowed, relaxation blocked."

## Privacy Risks

The feature should not require raw browsing data. It can use local plan state, schedule state, Pomodoro state, and local intervention history.

Avoid collecting sensitive override justifications by default. If reasons are stored, they should be local, bounded, and user-visible.

## Autonomy Risks

Locked protection can become hostile if the user feels trapped, punished, or unable to recover from a mistaken configuration. Research should identify how precommitment differs from coercion.

The UX should avoid shame language. It should frame locked protection as an earlier decision made by the user's calmer self, not as proof that the current user is bad or untrustworthy.

## Possible Outcomes

If evidence is strong:

- Keep stricter-only edits as a core locked-schedule rule.
- Explain it explicitly as precommitted protection.
- Add carefully designed escape or delay semantics only where evidence suggests they preserve trust.

If evidence is weak:

- Keep the current policy conservative and user-configurable.
- Avoid strong public claims.
- Use local validation to observe whether blocked relaxation attempts correlate with later successful outcomes.

If evidence is negative:

- Reduce hard enforcement.
- Prefer delay, reflection, or confirmation flows.
- Reconsider which locked changes are forbidden versus postponed.
