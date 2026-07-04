# Research Question Brief

## Question ID

`RQ-009`

## Working Title

Implementation intentions and reason prompts.

## Exact Question

Can short reason prompts, if-then recovery choices, and explicit Continue justifications restore intentional browsing after drift, or do they mainly become performative friction, rationalization, bypass training, or interruption burden?

## Why DaD Needs This

DaD already asks for a reason before some Continue actions in intent-coherence prompts, and the popup can require a reason before current-page intent recovery actions. Return, Isolate, Continue, and graph inspection create a small decision point at the moment a chain looks detached from its origin.

That decision point is not free. It may help users rebind behavior to a goal, but it may also train shallow justification, encourage fast bypass habits, add shame-coded friction, or interrupt legitimate exploratory work. The research output should decide when reason prompts are worth using, what kind of prompt should exist, how often they should appear, and what DaD should measure locally to know whether the prompt is helping or becoming noise.

## Affected Features

- Intent-drift prompt Continue reason field.
- Popup session-coherence recovery card and Continue gating.
- Return, Isolate, Continue, and Show graph action ordering.
- Intent intervention thresholds that decide warning, prompt, or locked action.
- Local intent history and diagnostic summaries.
- Protected-schedule strictness for intent settings.
- Future onboarding or settings copy that explains why a reason may be required.
- Future implementation-intention presets, such as "If I land on X, return to Y."
- Release/store wording around intent prompts as self-authored recovery, not mind reading.

## Scope

Included:

- Implementation intentions, if-then planning, action planning, coping planning, and goal shielding.
- Just-in-time prompts at moments of task switching, temptation, lapse, or recovery.
- Reason-giving, self-explanation, commitment reminders, and reflective friction in digital self-control tools.
- Evidence on rationalization, reactance, bypass habituation, prompt fatigue, and interruption costs.
- Differences between typed free-text reasons, selectable recovery choices, prewritten if-then plans, and silent friction.
- Timing effects: before entering a risky page, at first drift detection, after repeated drift, or during return.
- Local-only validation of whether prompts lead to return, isolate, continued coherent activity, repeated bypass, or prompt disablement.

Excluded:

- Whether intent coherence itself is valid; that belongs to `RQ-002`.
- General intervention severity ordering; that belongs to `RQ-004`.
- Signal validity for detecting passive drift; that belongs to `RQ-005`.
- Mental-state claim limits such as "DaD knows true intent"; that belongs to `RQ-011`.
- Public explanation strategy; that belongs to `RQ-014`.
- Clinical treatment protocols, therapy advice, or diagnosing compulsive behavior.

## Evidence Needed

- Meta-analyses and systematic reviews on implementation intentions, action planning, coping planning, and habit change.
- Primary studies where if-then plans, commitment reminders, or self-explanation prompts affect behavior at a temptation or task-switching moment.
- HCI and digital wellbeing studies comparing blocking, reflective prompts, delay/friction, commitment reminders, and choice prompts.
- Studies measuring adherence decay, prompt fatigue, habituation, reactance, rationalization, or workaround behavior.
- Evidence on whether free-text reasons perform differently from predefined options, checkboxes, delays, or plan reminders.
- Evidence on interruption timing and task resumption cost when prompts appear during legitimate work.
- Studies or theory separating prospective precommitment from retrospective justification after a lapse has already started.

## Novelty Target

The useful answer should not merely say "asking why can make people reflect." It should identify when a reason prompt changes behavior versus when it becomes a bypass ritual.

Examples of valuable findings:

- implementation intentions are strongest when specific cue-response pairs are formed before the risky cue, not improvised after the user is already in a hot state;
- free-text reasons may increase deliberation cost but can also produce rationalization if the product treats any text as proof of intent;
- repeated identical prompts can lose force through habituation and may need escalation, cooldowns, or replacement with preselected plans;
- if-then plans may work differently for initiating a desired action than for stopping an already-started loop;
- prompts may help most when they offer an immediately executable recovery action, not when they ask for abstract self-analysis;
- requiring a reason during legitimate search or exploration can increase interruption cost and reduce trust even if the drift score was technically low;
- local outcomes after Continue may be more informative than the text itself, so DaD should avoid storing reason content as behavioral truth.

## Novelty Proof Obligations

- Identify at least four mechanisms with product consequences, such as cue-response automation, goal shielding, hot/cold state mismatch, rationalization, prompt habituation, reactance, or task-resumption cost.
- Compare at least three prompt forms: free-text reason, predefined recovery choice, precommitted if-then plan, timed delay, or silent warning.
- Distinguish prospective planning from in-the-moment justification and state which one DaD should rely on for which feature.
- Report evidence on repetition effects, prompt fatigue, adherence decay, bypass training, or disablement where available.
- Define when Continue should require a reason, when it should allow choice without text, when it should only warn, and when it should be unavailable under user-authored locked policy.
- Define local validation metrics that do not store raw reason text, raw URLs, page titles, page text, typed input, screenshots, or inferred emotional states.

## Product Decisions This Could Change

- Whether the Continue reason field should remain free text, become optional, become selectable, or pair with an if-then preset.
- Whether repeated Continue on the same chain should escalate, cool down, shorten, or stop asking.
- Whether DaD should store only reason presence, length bucket, and outcome rather than the reason text.
- Whether graph inspection should be offered before or after Continue when coherence is very low.
- Whether "Return" and "Isolate" should be framed as executable plan choices rather than moral alternatives to Continue.
- Whether intent settings should include user-authored recovery plans for recurring sites or contexts.
- Whether protected schedules should allow Continue only when a precommitted exception exists.

## Privacy Risks

Reason prompts can tempt the product to collect intimate self-explanations. DaD should avoid:

- storing raw reason text by default;
- treating reason text as proof of true intent;
- sentiment analysis or psychological classification of reasons;
- remote analysis of prompt content;
- storing page titles, raw URLs, page text, selected text, or typed input alongside the reason;
- screenshots or DOM capture of the page that triggered the prompt;
- cross-device or account-level profiling of lapses;
- exporting prompt content without an explicit user action.

Acceptable local signals should stay narrow:

- prompt shown timestamp bucket;
- prompt type;
- intervention level;
- action chosen;
- whether a reason was present;
- bounded reason length bucket;
- same-chain return, isolate, continue, or tab cleanup outcome;
- repeated prompt count;
- setting disablement or relaxation after prompt burden;
- local export only when the user asks.

## Autonomy Risks

Reason prompts can become hostile if they make the user perform obedience rather than recover agency. The research should guard against:

- demanding introspection when the better action is a simple return;
- making any typed reason unlock everything;
- shaming short, messy, or absent reasons;
- using prompts so often that users learn to type filler automatically;
- blocking legitimate exploration because it does not resemble the original search;
- implying DaD can judge whether a reason is honest;
- hiding the recovery options behind a text field;
- making locked-policy Continue feel like an argument with the product rather than a rule the user authored earlier.

DaD should treat reasons as a local recovery scaffold and calibration signal, not as evidence of moral failure or true intent.

## Possible Outcomes

If evidence is strong:

- Define a prompt policy that separates precommitted if-then plans, in-the-moment recovery choices, and free-text justifications.
- Add local metrics for prompt burden, repeated Continue, post-Continue drift, Return success, Isolate success, and later setting relaxation.
- Update intent prompt UI and specs so reason prompts are used only where they beat cheaper recovery actions.

If evidence is mixed:

- Keep reason prompts configurable and limited to higher-risk prompt-style interventions.
- Prefer immediate recovery actions and graph context over long text entry.
- Store only bounded metadata and rely on local outcome patterns for calibration.

If evidence is weak or negative:

- Downgrade free-text reasons to optional notes or remove them from default prompts.
- Prefer Return, Isolate, Show graph, or prewritten if-then plans over in-the-moment justification.
- Avoid public claims that reason prompts restore intent; describe them only as optional friction.
