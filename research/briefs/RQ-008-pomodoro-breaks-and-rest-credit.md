# Research Question Brief

## Question ID

`RQ-008`

## Working Title

Pomodoro, breaks, and rest credit.

## Exact Question

What evidence supports Pomodoro-like work/rest cycles, strict breaks, microbreaks, and counting idle or locked system time as rest, and how should DaD translate that evidence into timer policy without becoming a generic productivity timer or hostile break enforcer?

## Why DaD Needs This

DaD already has plan-owned Pomodoro settings, work and break phases, strict breaks, activity-driven auto-start, local active-time history, idle/locked rest credit, blocked-page and popup timer surfaces, and protected-schedule strictness rules that allow starting or tightening Pomodoro while blocking relaxation. These behaviors make specific assumptions about fatigue, attention recovery, interruption timing, rest quality, and user agency.

The research output should decide which timer behaviors deserve to stay as defaults, which should be configurable, which need stronger local validation, and which should remain explicitly experimental.

## Affected Features

- Plan-owned Pomodoro configuration.
- Work, short-break, long-break, paused, completed, and rest-satisfied states.
- Strict-break overlay and media/tab suspension behavior.
- Activity-driven auto-start when a protected plan is active.
- Idle and system-locked rest credit.
- Popup Pomodoro controls and status copy.
- Options-page Pomodoro editor and protected-schedule lock behavior.
- Blocked-page Pomodoro timer display.
- Local Pomodoro history and diagnostics.
- Intent coherence interaction with work and break phases.
- Release/store explanation of Pomodoro as plan-owned defense, not a bypass timer.

## Scope

Included:

- Pomodoro-like fixed work/rest cycles.
- Microbreaks, short breaks, long breaks, and recovery from continuous computer work.
- Fatigue, vigilance, attention, task performance, strain, mood, and perceived restoration outcomes.
- Break timing, break activity type, break length, and break autonomy.
- Strict versus advisory breaks.
- Idle, away, and locked-system time as possible rest credit.
- Timer auto-start, manual pause/reset, and schedule-owned timing.
- Evidence from occupational health, ergonomics, attention, human factors, HCI, and digital self-control research.

Excluded:

- General digital self-control intervention ranking; that belongs to `RQ-004`.
- Commitment-device lock design outside timer behavior; that belongs to `RQ-001`.
- Intent-drift recovery actions; that belongs to `RQ-002`.
- User-facing prompt wording; that belongs to `RQ-009`.
- Clinical sleep, burnout, ADHD treatment, or medical fatigue advice.
- Optimizing productivity or output for employers.

## Evidence Needed

- Reviews or meta-analyses on work breaks, microbreaks, recovery, sedentary computer work, vigilance decrement, mental fatigue, and ergonomics.
- Primary studies comparing break duration, break frequency, active versus passive breaks, voluntary versus forced breaks, and timing effects.
- HCI or field studies of Pomodoro, focus timers, digital wellbeing timers, break reminders, and lockout tools.
- Evidence on whether break benefits depend on task type, workload, fatigue level, stress, autonomy, or break activity.
- Evidence on harms or failure modes: interrupted flow, annoyance, noncompliance, timer abandonment, rebound work, workaround behavior, or stress from forced breaks.
- Evidence on whether idle/away computer time resembles restorative break time, and where it does not.

## Novelty Target

The useful answer should not merely say "breaks are good" or "Pomodoro is popular." It should identify measured conditions where breaks help, where they do not help, and where enforcing them can backfire.

Examples of valuable findings:

- very short microbreaks improve strain or vigilance but not necessarily deep cognitive recovery;
- break benefits depend more on detachment or activity type than on clock duration alone;
- forced breaks can protect against overwork but harm autonomy or flow when poorly timed;
- idle/locked computer time may count as rest only if it plausibly means disengagement from the task, not phone use or another work device;
- timers can improve self-regulation through temporal boundaries even if the exact 25/5 cycle is not uniquely supported;
- break timing should align with task boundaries when possible rather than interrupting high-value flow;
- strict breaks may be legitimate under precommitment but should expose local outcome metrics, not claim universal productivity benefits.

## Novelty Proof Obligations

- Identify measured outcomes for at least four break-related mechanisms, such as vigilance, fatigue, physical strain, mood, task resumption, self-regulation, or overuse prevention.
- Compare fixed Pomodoro cycles with at least two alternatives, such as self-paced breaks, microbreak reminders, workload-aware breaks, task-boundary breaks, or usage-limit lockouts.
- Distinguish advisory breaks from enforced breaks and report autonomy, compliance, abandonment, or workaround evidence where available.
- Evaluate whether idle/locked system time can count as rest, including at least two boundary cases where it should not be trusted as restorative.
- State what evidence would change DaD defaults for work duration, short breaks, long breaks, strict-break defaults, auto-start, or idle rest credit.
- Define local validation metrics DaD can inspect without storing raw URLs, page titles, page text, typed input, screenshots, app/window titles, or cross-device activity.

## Product Decisions This Could Change

- Whether the default 25/5/15/4 cycle should remain only a familiar starting preset or be changed.
- Whether strict breaks should default off, remain user-controlled, or require stronger explanation before enabling.
- Whether idle/locked rest credit should stay automatic, become configurable, or require a cap.
- Whether breaks should complete automatically after enough away time or require explicit return activity.
- Whether activity-driven auto-start should stay opt-in per plan.
- Whether Pomodoro should make intent intervention stricter during work and looser during rest.
- Whether blocked-page copy should say "rest satisfied by credit" versus ordinary break language.
- Which Pomodoro history metrics should be visible for local calibration.

## Privacy Risks

Timer research can create pressure to infer what the user is doing away from Chrome. DaD should avoid:

- app/window titles;
- keyboard or mouse logging beyond bounded extension activity counters;
- screenshots;
- webcam, microphone, or biometric signals;
- OS process monitoring;
- phone or cross-device activity;
- raw URLs, page titles, page text, or typed content;
- productivity scoring for employers or third parties.

Acceptable local signals should stay narrow:

- timer phase;
- coarse timestamps;
- active/idle/locked Chrome idle state;
- user-triggered start/pause/resume/reset;
- bounded work/break duration totals;
- rest-credit totals;
- skipped-break counts;
- overlay shown/cleared outcomes;
- local export only when the user asks.

## Autonomy Risks

Strict breaks can become hostile if the product treats rest as obedience rather than recovery. The research should guard against:

- forcing breaks at bad task moments without explanation;
- making reset/pause feel punitive during protected schedules;
- claiming that DaD knows whether the user actually rested;
- optimizing for timer completion instead of useful recovery;
- shaming users for skipping or ending breaks;
- silently restarting work after the user intentionally reset;
- making strict breaks impossible to inspect, disable later, or calibrate.

DaD should frame Pomodoro as a user-authored rhythm inside a protected plan, not as a universal productivity law.

## Possible Outcomes

If evidence is strong:

- Define evidence-backed timer-policy guidance for work duration, break duration, strictness, and rest-credit behavior.
- Add local validation metrics for fatigue proxy, strict-break burden, skipped breaks, resets, and rest-credit usefulness.
- Update Pomodoro docs and UI copy to reflect supported mechanisms and caveats.

If evidence is mixed:

- Keep defaults conservative and configurable.
- Keep strict breaks opt-in and explainable.
- Treat idle/locked rest credit as a local heuristic requiring user review and caps.
- Prefer task-boundary or user-return activity triggers where possible.

If evidence is weak or negative:

- Present Pomodoro as a personal rhythm tool rather than evidence-backed productivity optimization.
- Avoid making strict breaks a default.
- Keep timer diagnostics local and avoid strong claims in store/public copy.
