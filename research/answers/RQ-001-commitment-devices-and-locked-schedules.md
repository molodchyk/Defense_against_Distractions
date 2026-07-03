# Research Synthesis

## Question

`RQ-001`: When do locked schedules, precommitment, and stricter-only configuration edits help self-control, and when do they backfire?

## Short Answer

The deeper literature does not support the simple rule "commitment devices are good." It supports a narrower and more useful rule: commitment can work when it is correctly calibrated to the user's future failure mode, but commitment demand is noisy, socially distorted, and often badly targeted. A user choosing a lock is evidence that they want help, not proof that the lock is well-designed.

The strongest design implication for DaD is that locked schedules need calibration infrastructure. The product should preserve the current stricter-only rule during active locks, but it should treat lock setup, lock duration, emergency escape, post-lock review, and repeated failure as first-class design problems. A hard lock should not be a moral statement or a maximal-force default; it should be a calibrated contract between a calmer planning state and a future vulnerable state.

The most important non-obvious finding is that softer structures can sometimes outperform harder commitment. Appointments, nonbinding agreements, and planned check-ins can beat reminders and can avoid the welfare losses of hard penalties. For DaD, that points toward a ladder: appointment-like schedule anchors, reminders/reviews, queued relaxation, and soft locks before irreversible hard lockouts.

## Non-Obvious Findings

| Finding | Source | Why It Is Non-Obvious | DaD Consequence |
| --- | --- | --- | --- |
| Commitment take-up can be high while being badly targeted. In a gym experiment, about half of people who took a contract for more gym attendance also took a contradictory contract for fewer visits. | Carrera et al. 2022 | Demand for commitment is usually interpreted as self-knowledge. This shows demand can reflect noise, misunderstanding, or context effects. | Do not treat "user enabled a strong lock" as proof the lock is right. Add calibration and post-lock review. |
| Commitment contracts can increase average behavior while lowering estimated consumer surplus. | Carrera et al. 2022 | A behavior change can be real and still welfare-negative if the cost of failed commitments is high. | DaD should not optimize only for fewer bypasses or more blocks. Track regret, emergency escapes, and post-lock relaxation. |
| A majority of adopters can fail their own commitment. In John's installment-savings experiment, 55 percent of clients defaulted and paid their self-chosen penalty. | John 2014/2020 | Harm did not come from external coercion; it came from self-chosen contracts that were too weak or miscalibrated. | Repeated failed locks should trigger recalibration, not automatic escalation. |
| Soft appointment-like commitment can outperform hard financial commitment. HIV-testing appointments more than doubled testing rates, while hard commitments had smaller effects and many users lost investments. | Derksen et al. 2025 | Stronger penalty was not the better device. The "appointment" worked through planning, memory, and social commitment without failure penalties. | Build "review appointment", "return at time", and queued-change review as real alternatives to hard blocking. |
| Public observability can raise commitment demand. In Exley and Naecker's experiment, demand rose from 41 percent in private to 65 percent in public. | Exley & Naecker 2017 | Commitment demand may be identity signaling, not only self-control sophistication. | Keep DaD lock strictness private by default. Be cautious with public configs, leaderboards, upvotes, or visible strictness badges. |
| Soft commitments can outperform pure reminders. In the student field experiment, a nonbinding agreement changed exam behavior while reminders alone did not. | Himmler et al. 2019 | The mechanism is not just salience. Self-endorsed commitment changes behavior differently than a reminder ping. | A DaD prompt should not only remind; it should create or reactivate a concrete commitment. |
| Self-imposed deadlines help but are often suboptimal. Evenly spaced external deadlines outperformed self-chosen deadlines in Ariely and Wertenbroch's experiments. | Ariely & Wertenbroch 2002 | People know they need structure but still choose weak or poorly timed structure. | DaD should offer schedule templates, previews, and warnings instead of making users design all timing from scratch. |
| People overestimate future behavior in contract settings. Gym members paid more than 17 dollars per visit on flat monthly contracts despite a 10-dollar visit pass and forgone savings around 600 dollars. | DellaVigna & Malmendier 2006 | Future-use optimism persists even when money is at stake. | DaD should not assume users can predict future restraint accurately. Add "your past lock outcome" feedback before editing schedules. |
| Commitment contracts can have low take-up but lasting ITT effects. CARES smoking commitment had 11 percent take-up and a 3 percentage point six-month ITT quit effect, with persistence at 12 months. | Gine, Karlan, & Zinman 2010 | Average impact is limited by adoption. A powerful device for adopters can look modest at population level. | DaD should be configurable and optional; strong lock features may be crucial for a subset, not universal defaults. |
| Incentives alone can fade; commitment layered after incentive can preserve some long-run behavior. | Royer et al. 2015 | Short-term motivation is not the same as durable behavior change. | DaD should not treat a one-time strict session as habit formation. It needs repeated structure and review. |

## Mechanisms

### 1. Commitment Miscalibration

Users can know they need constraint but misjudge the required strength, timing, or cost. Too weak a lock creates repeated failure and demoralization; too hard a lock creates resentment and emergency bypass pressure. The correct design problem is not "hard or soft." It is matching the lock to the failure mode.

DaD implication: store local lock outcomes. A locked schedule should develop a history: completed without relaxation attempt, relaxation blocked, emergency escape used, queued change applied, manually softened afterward, or made stricter afterward.

### 2. Demand Is Not Diagnosis

Choosing a commitment device does not reliably reveal sophisticated self-control knowledge. It can reflect optimism, confusion, signaling, experimenter demand, or identity. In DaD terms, "user wants a stricter lock" might mean "I know I need it," but it might also mean "I am anxious right now and overcorrecting."

DaD implication: allow stricter edits during active locks, but distinguish immediate protection from durable default changes. A stricter edit made during a vulnerable state could be applied now and flagged for later review before becoming the new default.

### 3. Soft Structure Can Carry Commitment Without Punishment

Appointments and nonbinding agreements work partly by making a future action concrete, scheduled, and socially/psychologically salient. They reduce memory and planning load without imposing a failure penalty.

DaD implication: add appointment-like recovery infrastructure: "review this after lock", "return at break", "restart this plan tomorrow", "queued change review", or "scheduled plan check". This may be more useful than adding more force.

### 4. Public Commitment Distorts Private Need

If others can see the commitment, the choice becomes partly reputational. For DaD, a public config marketplace or upvote system could push people toward impressive-looking strictness rather than personally calibrated protection.

DaD implication: community sharing should be ruleset-based, not strictness-status signaling. Avoid social ranking of "hardcore" configurations.

### 5. Flexibility Has Option Value

The commitment literature repeatedly shows a commitment/flexibility tradeoff. Flexibility is not merely weakness; it protects against uncertainty. But too much flexibility lets the vulnerable future self undo the plan.

DaD implication: use delayed relaxation and queued changes. The user can express a relaxation need during a lock, but the change waits for a calmer review window unless there is an emergency escape.

## Empirical Details

| Source | Sample / Context | Measure | Result | Caveat |
| --- | --- | --- | --- | --- |
| Ashraf, Karlan, & Yin 2006 | 1,777 bank clients in the Philippines; 710 offered SEED commitment account | Take-up and savings balance | 202 of 710 accepted; 28.4 percent take-up. Treatment balances increased by 81 percentage points after 12 months. | Savings product, not attention software. |
| Gine, Karlan, & Zinman 2010 | Smokers in the Philippines offered CARES | Take-up and urine-test quit outcome | 11 percent take-up; offered group 3 percentage points more likely to pass six-month test; effect persisted at 12 months. | Low take-up limits average effect. |
| John 2014/2020 | Low-income savers offered installment commitment account | Default rate and savings | 55 percent defaulted and paid self-chosen penalty despite large average bank-savings effect. | Financial stakes and low-income context. |
| Carrera et al. 2022 | 1,248 gym members | Commitment take-up and welfare model | About half of people taking "more attendance" contracts also took "less attendance" contracts; little association with measured time inconsistency; contracts lowered estimated consumer surplus. | Gym attendance and structural model assumptions. |
| Exley & Naecker 2017 | Field experiment with public/private commitment choice | Demand for commitment | Private: 41 percent demanded some commitment; public: 65 percent. Average commitment rose from 5.17 dollars to 8.87 dollars. | Social context matters. |
| DellaVigna & Malmendier 2006 | 7,752 health-club members over three years | Contract choice vs attendance | Monthly flat-fee users attended 4.3 times/month, paid more than 17 dollars per visit, and forgone savings averaged about 600 dollars. | Not a voluntary self-control contract, but reveals future-use misprediction. |
| Derksen et al. 2025 | High-risk men in Malawi offered HIV-testing appointments and/or hard commitments | HIV testing | Appointments more than doubled testing rates; hard commitments increased testing by about 8 percentage points in one working-paper version; most hard-commitment takers lost investments. | Health-care setting, not browsing. |
| Himmler et al. 2019 | University students | Exam sign-up, participation, passing | Soft commitment improved exam progression; pure reminders did not; procrastinators benefited most. | Education setting. |
| Royer et al. 2015 | Fortune 500 workplace gym experiment | Gym attendance after incentives | Incentives alone had modest long-run effects; incentives plus commitment showed stronger persistence. | Exercise habit formation, not digital focus. |

## Evidence Map

| Evidence | Grade | Relevance | Caveat |
| --- | --- | --- | --- |
| Field RCTs in savings and smoking show voluntary commitment can change behavior. | strong | Supports DaD locks as a legitimate mechanism. | Domains are not browsing; take-up often low. |
| Gym and savings studies show commitment demand is noisy and often miscalibrated. | strong | Directly affects lock setup and review design. | Welfare estimates depend on model and domain. |
| Soft commitment and appointments show non-punitive commitment can work. | moderate to strong | Supports delayed review, scheduled return, and soft locks. | Need DaD-specific validation. |
| Public observability changes demand. | moderate | Matters for shared configs and community features. | Social context may differ from DaD. |
| Deadline studies suggest users choose useful but suboptimal structure. | moderate | Supports schedule templates and previews. | Classic result has newer replication uncertainty. |

## Assumptions Updated

- Old assumption: If a user chooses strong lock settings, the product can trust that choice as calibrated.
- Updated: Choice of commitment is noisy; DaD must record outcomes and support later calibration.

- Old assumption: Harder commitment is a stronger version of the same thing.
- Updated: Hard and soft commitments can work through different mechanisms. Soft scheduled structure may outperform hard penalties in some contexts.

- Old assumption: Community-shared configs are mostly a distribution problem.
- Updated: Social visibility can distort commitment demand. Shared configs may create performative strictness.

- Old assumption: Blocked relaxation attempts are simply evidence that the lock is needed.
- Updated: They may also signal a badly calibrated lock, an emergency use case, or real-life uncertainty.

## What Remains Uncertain

- Whether DaD users want hard commitment, soft commitment, or a hybrid.
- Which DaD lock durations create protection versus resentment.
- Whether relaxation attempts predict later gratitude or later softening.
- Whether emergency escape should be global, per plan, delayed, or review-gated.
- Whether stricter edits made during a locked period should persist automatically after the lock.

## DaD Design Implications

1. Keep stricter-only edits during active locks, but do not treat them as permanent calibration by default.

2. Add a lock outcome model:

   - no conflict;
   - blocked relaxation attempt;
   - queued relaxation;
   - emergency escape;
   - post-lock softened;
   - post-lock strengthened;
   - repeated failure.

3. Add post-lock review:

   - "This lock blocked 2 relaxation attempts."
   - "Keep this schedule?"
   - "Make it softer?"
   - "Make it stricter?"
   - "Add an emergency path?"

4. Add a pending-change queue for relaxation:

   During a lock, the user can request a relaxation, but DaD applies it only after the locked period or a cooldown review unless it is an emergency path.

5. Add lock templates:

   - study block;
   - work block;
   - short vulnerable window;
   - strict break;
   - soft lock with review;
   - hard lock.

6. Add private calibration, not public strictness signaling:

   Config sharing should not rank people by strictness or show "hardcore" status. A public marketplace should emphasize purpose, context, and fit.

## Scoring Implications

Core signal:

- Active locked schedule.
- Edit would weaken active protection.
- Edit would strengthen active protection.
- Repeated failed lock outcomes for the same plan.

Modifier:

- Lock was created or tightened during a high-risk state.
- User repeatedly queues relaxation for the same rule.
- Emergency escape used recently.
- User softens the same lock immediately after it ends.

Diagnostic-only:

- Lock duration.
- Number of blocked relaxation attempts.
- Number of queued changes.
- Number of post-lock reviews skipped.
- Whether the lock was copied from a shared config.

Avoid:

- Interpreting commitment demand as proof of self-knowledge.
- Treating stricter user choices as automatically welfare-improving.
- Socially visible strictness scores.
- Automatic permanent escalation after a hot-state stricter edit.

## Intervention Implications

| Intervention | When To Use | Mechanism | Risk |
| --- | --- | --- | --- |
| Hard lock | Clear precommitment, high-risk window, explicit plan | Removes future relaxation option | Miscalibration, emergency friction |
| Soft lock | Ambiguous need, first-time schedule, uncertain user fit | Creates commitment without hard penalty | May be too weak |
| Queued relaxation | Active lock, non-emergency relaxation request | Preserves option value without hot-state undo | User may feel ignored if not visible |
| Post-lock review | After conflict or repeated lock use | Calibration and learning | Prompt fatigue |
| Appointment-like review | Before/after vulnerable windows | Planning and memory support | Too weak for severe loops |
| Emergency escape | Real mistake or safety need | Preserves welfare under uncertainty | Can become bypass |
| Shared config import | Cold state only, with preview | Transfers structure | Performative or mismatched strictness |

## Privacy Implications

Safe local data:

- lock start/end;
- plan id;
- edit category: stricter, neutral, relaxation;
- blocked relaxation count;
- queued relaxation count;
- emergency escape count;
- post-lock review choice;
- shared-config origin flag, if imported.

Risky data:

- raw free-text reasons for bypass;
- public lock outcomes;
- social strictness ranking;
- cross-device behavioral profile without explicit consent.

Data to avoid by default:

- raw browsing content connected to lock failure;
- hidden psychological labels;
- "willpower score";
- public display of failed locks.

## Local Validation Metrics

- `lockedRelaxationAttempts`: counts whether locks are actually contested.
- `queuedRelaxationApplied`: shows whether delayed relaxation reflects real need.
- `postLockSoftenedWithin24h`: flags possible over-strict lock calibration.
- `postLockStrengthenedWithin24h`: flags possible under-strict lock calibration.
- `emergencyEscapeUsed`: detects welfare-critical lock failure.
- `samePlanRepeatedConflict`: indicates the schedule needs redesign.
- `sharedConfigLockConflict`: tests whether imported configs fit poorly.
- `hotStateStricterEditReverted`: detects anxiety-driven overcommitment.

Privacy boundary: store counts and categories locally; do not store raw reasons or page content.

## Implementation Handoff

Affected files or docs:

- `docs/protection-model.md`
- `docs/plans-architecture.md`
- `docs/pomodoro-implementation.md`
- `docs/dad_intent_coherence_system.md`
- protected-plan strictness comparator
- options plan editing UI
- schedule UI
- local usage/diagnostic state

Minimum viable change:

- Add docs/spec language for lock calibration and post-lock review.
- Add a local lock-outcome data shape.
- Add queued relaxation as a future feature.
- Distinguish "apply stricter now" from "make stricter default after lock" in future UI.
- Add shared-config warning: imported locks need review before protected use.

Tests needed when implemented:

- Stricter edit during lock can apply for the active lock.
- Optional future behavior can mark that stricter edit for post-lock confirmation.
- Relaxation edit during lock can be queued without applying immediately.
- Queued relaxation is visible and applies only after lock/cooldown.
- Emergency escape increments local count without storing raw reason.
- Shared config import cannot silently activate a hard locked schedule.

Rollout risk:

- If DaD adds too much review UI, it becomes annoying.
- If DaD does not add review UI, miscalibrated locks will look like "the user failing" instead of "the contract failing."
- If community configs later reward strictness socially, they may distort user choices.

## Revisit Triggers

- Local data shows many locks are softened immediately after ending.
- Emergency escape use clusters around specific schedules or plan types.
- Users repeatedly create stricter locks during vulnerable states and revert them later.
- Shared/imported configs have higher conflict than self-authored configs.
- A future research pass finds digital self-control lockouts have different failure patterns than financial commitment contracts.

## Open Questions

- Should DaD offer "soft lock" and "hard lock" as explicit schedule modes?
- Should a hot-state stricter edit expire after the active lock unless confirmed later?
- Should emergency escape require a cooldown, a note, or neither?
- Should imported configs default to unlocked until reviewed?
- What is the right threshold for asking post-lock calibration questions?

## Current Answer Status

Revisit required. This answer has useful structure and evidence cards, but user review flagged it as not novel enough to treat as finished product guidance. Use it as a repair starting point, not as a completed synthesis, until a follow-up pass finds stronger non-obvious mechanisms, empirical details, and product-changing implications.
