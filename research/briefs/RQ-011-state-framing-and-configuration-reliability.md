# Research Question Brief

## Question ID

`RQ-011`

## Working Title

State framing and configuration reliability.

## Exact Question

How should DaD model and describe moments when a user may want protection from their own short-term override impulse, without claiming lie detection, diagnosis, mind reading, or permanent incapacity?

## Why DaD Needs This

The original wording asks whether DaD can detect when the user is "lying" or "truthful," "destructive" or "constructive," and when configuration changes should be trusted. The already-implemented safer slice is a user-owned Focus state with Calm, Strained, and Vulnerable options that can make intent intervention stricter without relaxing plan settings or uploading telemetry.

The product still needs a research-backed conceptual model for this territory. DaD must support strong protection during low-agency or high-risk moments, but it should not turn temporary self-control conflict into moral judgment, clinical inference, or adversarial language. The research output should decide how to frame fluctuating override reliability, which state signals can only be user-declared, which configuration changes should be delayed or reviewed, and what language belongs in UI, docs, and public explanation.

## Affected Features

- Popup Focus state: Calm, Strained, and Vulnerable.
- Intent threshold adjustments from user-declared state.
- Protected-schedule stricter-only edits.
- Future delayed relaxation or post-lock configuration review.
- Continue, Return, Isolate, and hard-lock recovery language.
- Local diagnostics and feedback calibration involving bypass, relaxation, or repeated Continue.
- Options copy for intent settings, protected schedules, and diagnostics retention.
- Store/public language around protection during vulnerable or low-lucidity states.
- Future onboarding explaining that DaD executes user-authored rules, not a mental-state verdict.

## Scope

Included:

- Self-control conflict, preference reversal, hot-cold empathy gaps, present bias, temporal discounting, and dual-self or multiple-self models.
- Metacognition, confidence, intention-behavior gaps, and when people mispredict future behavior.
- Mental fatigue, stress, sleepiness, affective state, craving, urgency, and other states that may change override reliability without implying diagnosis.
- User-declared state versus inferred state, including when self-report is useful, unreliable, burdensome, or stigmatizing.
- Configuration safety: immediate strictness, delayed relaxation, review windows, emergency escape, and post-event recalibration.
- Language effects: shame, stigma, reactance, self-compassion, autonomy support, and legitimacy of self-authored constraint.
- Evidence on how people interpret digital wellbeing labels, warnings, scores, and self-control tools.

Excluded:

- Scoring-signal validity for passive drift; that belongs to `RQ-005`.
- Prompt mechanics and reason fields; that belongs to `RQ-009`.
- Local validation metric design; that belongs to `RQ-010`.
- Public explanation strategy as a whole; that belongs to `RQ-014`.
- Clinical diagnosis, treatment protocols, or claims about ADHD, addiction, depression, anxiety, mania, dissociation, or other conditions.
- Automatic lie detection, emotion recognition, biometric sensing, webcam/microphone inference, or cross-device monitoring.

## Evidence Needed

- Behavioral economics and psychology evidence on present bias, dynamic inconsistency, hot-cold empathy gaps, preference reversal, commitment, and self-control.
- Research on metacognition and intention-behavior gaps: when people accurately versus inaccurately predict future behavior or current control.
- Studies of craving, fatigue, stress, sleep loss, affect, or urgency that change self-regulation or decision quality without requiring clinical framing.
- HCI and digital wellbeing studies on user-declared state, self-tracking labels, mood/energy check-ins, and how users react to tool-generated labels.
- Literature on autonomy-supportive language, reactance, stigma, shame, self-compassion, and self-efficacy in behavior-change systems.
- Commitment-device research that distinguishes protective precommitment from punitive self-control failure.
- Usable privacy and ethics work on sensitive mental-state inference, especially why certain signals should remain user-declared or unavailable.

## Novelty Target

The useful answer should not merely say "do not diagnose users" or "avoid shame." It should identify how fluctuating override reliability actually behaves, what users can and cannot predict about their own future actions, and how a product can support self-authored constraint without becoming adversarial.

Examples of valuable findings:

- people may endorse restrictions in a cool state and reject them in a hot state without either state being a "lie";
- prediction errors may be asymmetric: users can underestimate temptation, overestimate future self-control, or misjudge how burdensome a lock will feel later;
- self-declared vulnerability may improve fit only when it is cheap, temporary, and not treated as a trait label;
- labels such as "vulnerable" may help some users externalize state but may reduce self-efficacy or feel stigmatizing for others;
- delaying relaxation can preserve precommitment, but forced delay can backfire when the original plan was miscalibrated;
- "trust current changes" may depend more on change direction, timing, reversibility, and prior calibration history than on inferred sincerity;
- tool-generated mental-state scores may feel precise while adding little valid evidence beyond user-authored settings and recent behavior.

## Novelty Proof Obligations

- Identify at least four mechanisms with product consequences, such as present bias, hot-cold empathy gaps, craving/urgency, metacognitive misprediction, self-efficacy, stigma, reactance, or preference instability.
- Distinguish temporary state, enduring trait, configured preference, and observed behavior; state which of these DaD may store, infer, or only let the user declare.
- Compare at least three configuration policies: immediate strictness, immediate relaxation, delayed relaxation, queued review, emergency escape, or post-event recalibration.
- Report evidence on how labels, scores, or state prompts affect autonomy, shame, self-efficacy, adherence, or abandonment where available.
- Define when "Vulnerable" or equivalent language should remain user-facing, be renamed, be optional, or be replaced by less identity-laden phrasing.
- Define local validation signals for configuration reliability without storing raw URLs, page titles, page text, typed input, reason text, screenshots, biometrics, or inferred clinical state.

## Product Decisions This Could Change

- Whether Focus state should keep Calm, Strained, and Vulnerable labels or use different user-authored wording.
- Whether Focus state should remain entirely user-declared or ever allow inferred suggestions.
- Whether relaxation during protected schedules should be blocked, delayed, queued, or reviewed depending on timing and prior local outcomes.
- Whether stricter changes made during a vulnerable state should become permanent immediately or require later confirmation.
- Whether intent diagnostics should show "state" as an adjustment, a self-declared setting, or a hidden calibration detail.
- Whether public/store copy should use "low-lucidity," "vulnerable," "high-risk," "override reliability," or more concrete language.
- Whether DaD should add a local post-event review flow after repeated blocked relaxations, bypasses, or strictness reversals.

## Privacy Risks

This research area can easily pressure the product toward sensitive inference. DaD should avoid:

- lie detection;
- clinical or personality labels;
- emotion recognition;
- sentiment analysis of typed reasons;
- raw reason text stored by default;
- raw page text, page titles, full URLs, or typed input;
- screenshots, screen recordings, webcam, microphone, biometric, or eye-tracking signals;
- OS-level app/window monitoring;
- phone or cross-device activity;
- remote mental-state analytics;
- third-party reporting about user reliability or self-control.

Acceptable local signals should stay narrow:

- user-selected Focus state;
- expiration timestamp bucket;
- current intervention threshold adjustment;
- stricter-change event enum;
- blocked relaxation enum;
- queued relaxation enum;
- emergency escape enum;
- post-lock review outcome enum;
- local feedback choice;
- retention-limited export only when the user asks.

## Autonomy Risks

State framing can become hostile if the product treats the current user as an enemy rather than as the same person in a different context. The research should guard against:

- calling the user deceptive, weak, irrational, or unsafe;
- treating temporary vulnerability as identity;
- making a score feel like a verdict;
- blocking legitimate urgent relaxation when the original plan was wrong;
- letting past bypasses permanently reduce trust;
- framing configuration review as punishment;
- making the user argue with the extension to prove sincerity;
- hiding the fact that the user authored the rule earlier.

DaD should frame strong protection as an execution of an earlier, inspectable plan under known conditions of fluctuating self-control.

## Possible Outcomes

If evidence is strong:

- Define a state-framing model that separates user-authored preference, temporary state, behavior signals, and configuration policy.
- Add guidance for delayed relaxation, post-lock review, and stricter-change confirmation.
- Update UI/docs language for Focus state, protected schedules, diagnostics, and public explanation.
- Define privacy-preserving local counters for configuration reliability and miscalibration.

If evidence is mixed:

- Keep Focus state temporary, user-declared, and configurable.
- Avoid inferred mental-state suggestions.
- Use delayed review only for high-risk or explicitly locked policy changes.
- Treat repeated override pressure as a calibration signal, not proof of user unreliability.

If evidence is weak or negative:

- Avoid building mental-state scoring.
- Keep language concrete: "this plan is locked," "this change would relax protection," "review after the lock ends."
- Remove or soften identity-laden state labels if they are more likely to create shame than useful protection.
