# Research Question Brief

## Question ID

`RQ-005`

## Working Title

Safe scoring signals for passive drift.

## Exact Question

Which local browser signals are empirically plausible indicators of passive drift, vulnerable use, or self-control failure, which signals should only modify other evidence, and which should be avoided because they are too noisy, invasive, or easy to misread?

## Why DaD Needs This

DaD already collects and uses many bounded local signals: page media counts, link counts, passive-surface counts, visible-text topic overlap, weighted metadata similarity, scroll/click/input rates, active editable-focus duration, visible media playback, dynamic content growth, tab switching, navigation transitions, open-tab pressure, dwell time, session age, return-to-origin behavior, focus state, and feedback outcomes. These signals currently have conservative rules and tests, but the product still needs a research-backed signal taxonomy so future scoring work does not treat every measurable browser behavior as evidence of distraction.

The research output should decide which signals can be core scoring inputs, which should only amplify an already suspicious pattern, which should stay diagnostic-only, and which should be removed or blocked from future implementation.

## Affected Features

- Intent coherence scoring and risk-state classification.
- Structural keyword triggers such as media, links, passive surfaces, and time-on-page.
- Focus state and other user-declared vulnerability signals.
- Local auto-calibration from intervention feedback.
- Popup and Options diagnostics.
- Usage stats and local validation metrics.
- DaD Select score estimation.
- Triggered actions that may later depend on context or scenario guards.
- Store and public explanations of local-only risk scoring.

## Scope

Included:

- Local browser/page/session signals that can be observed without remote services.
- Signals from navigation, tab behavior, timing, interaction rate, page structure, page media, topic overlap, and user-declared state.
- Evidence about multitasking, web/app usage patterns, self-control lapses, habit loops, flow, attention, problematic internet use, and HCI measurements of digital behavior.
- False-positive risks for legitimate research, reading, communication, accessibility use, language learning, and active work.
- Signal combinations, thresholds, temporal windows, and conditions where a signal only matters after another signal is already present.
- Local validation metrics that can test signal usefulness without storing sensitive content.

Excluded:

- Which intervention to choose once risk is known; that belongs to `RQ-004`.
- Which content categories are high-risk; that belongs to `RQ-006`.
- Whether hiding UI elements helps; that belongs to `RQ-007`.
- Full Pomodoro, fatigue, and break-timing evidence; that belongs to `RQ-008`.
- Prompt wording and reason quality; that belongs to `RQ-009`.
- General public communication of DaD science; that belongs to `RQ-014`.
- Remote analytics, cloud classification, screenshots, raw page capture, or clinical diagnosis.

## Evidence Needed

- Systematic reviews or meta-analyses on digital behavior, problematic internet use, media multitasking, attention control, and self-regulation where they report measurable predictors or behavioral markers.
- Primary studies with objective logs or trace data, not only self-report, especially browser/app usage, tab/window behavior, switching, dwell time, scroll/click patterns, video/feed use, and search loops.
- HCI and ubiquitous-computing studies that classify productive versus distracted or compulsive use from interaction traces, including accuracy, base rates, false positives, and user heterogeneity.
- Studies that distinguish passive consumption, active information seeking, communication, work, learning, and flow from surface-level behavior.
- Work on privacy-preserving behavioral sensing and data minimization for local inference.
- Evidence on whether self-declared state or momentary self-report improves prediction compared with passive behavior logs alone.

## Novelty Target

The useful output is not a list of intuitively suspicious behaviors. The research pass should find measured, assumption-breaking detail: which signals actually predict later regretted use or failed self-control, which popular signals are weak once base rates are considered, which combinations outperform single signals, and which signals reverse meaning in different contexts.

Examples of valuable findings:

- a signal that looks obvious but has poor predictive value outside one app category;
- a weak individual signal that becomes useful only when paired with timing or transition context;
- evidence that high activity can mean either deliberate work or compulsive loop depending on editable input, search continuity, or task boundary;
- evidence that dwell time is unreliable unless paired with passive media, feed growth, or low return-to-origin behavior;
- quantified false-positive patterns for reading, language learning, research, accessibility workflows, or communication;
- base-rate or personalization findings showing why a global threshold would misclassify many users.

## Novelty Proof Obligations

- Identify at least five candidate signals with measured predictive detail, including at least one timing signal, one interaction-rate signal, one page-structure/media signal, one navigation/tab signal, and one user-state or self-report signal.
- For each signal, classify it as core, modifier-only, diagnostic-only, avoid, or unknown, and state what evidence would move it between classes.
- Include at least three cases where a plausible signal changes meaning by context, such as long dwell during reading versus passive feed use, high click rate during work versus compulsive browsing, or many tabs during research versus fragmented drift.
- Report false-positive, false-negative, base-rate, or model-performance details where available, not only whether a correlation exists.
- Define local validation metrics DaD can inspect for each recommended core or modifier signal without storing raw page text, full URLs, page titles, typed input, selectors, screenshots, or media metadata.
- Translate the evidence into a scorer contract: when a signal may directly reduce coherence, when it can only amplify another pressure, when it may appear only in diagnostics, and when it should be forbidden from scoring.

## Product Decisions This Could Change

- Which existing intent coherence loads are core versus modifier-only.
- Whether open-tab pressure, tab switching, dwell time, session age, or dynamic content growth should be capped lower or require co-signals.
- Whether active editable-focus duration should remain a deliberate-agency signal or only reduce other passive loads.
- Whether visible-text topic overlap should remain a fallback similarity signal or be downgraded for some page types.
- Which structural keywords should stay user-configured only and which might later support presets.
- Which diagnostics should be visible to users as explanations versus hidden as model internals.
- Which local metrics should be added before any future scoring escalation or auto-calibration change.

## Privacy Risks

Signal research can easily create pressure to collect more sensitive data than DaD should ever need. The research answer must reject any signal that depends on:

- raw page text;
- full URLs or query strings;
- page titles as stored history;
- typed input values;
- private messages;
- screenshots or screen recordings;
- image, audio, or video content analysis;
- media URLs, captions, or source strings;
- raw selectors or full DOM snapshots;
- cross-device identity or remote behavioral profiles.

Acceptable candidate signals should stay derived, local, bounded, and explainable:

- counts;
- coarse timestamps or duration buckets;
- bounded rates;
- normalized hostnames where needed;
- score buckets;
- boolean transition qualifiers;
- capped token sets that are not raw text;
- user-saved configuration;
- user-triggered local exports.

## Autonomy Risks

A signal taxonomy can become hostile if the system treats ambiguous behavior as proof of a bad mental state. The research should guard against:

- inferring intent from a single signal;
- treating productivity style differences as risk;
- penalizing accessibility workflows or neurodivergent browsing patterns;
- escalating because a user is active, curious, slow, or exploratory;
- turning self-declared vulnerability into a permanent label;
- making hidden scores feel like surveillance;
- letting automatic calibration override explicit locked-plan contracts;
- presenting diagnostic signals as moral judgments.

The product direction should remain: signals estimate local intervention fit; they do not diagnose the user.

## Possible Outcomes

If evidence is strong:

- Create a signal taxonomy with core, modifier-only, diagnostic-only, avoid, and unknown classes.
- Update intent-scoring docs and tests to reflect which loads are justified directly and which require co-signals.
- Define local validation counters for the strongest signals.
- Add review gates before introducing any new signal class.

If evidence is mixed:

- Keep most signals modifier-only or diagnostic-only.
- Require user configuration or local feedback before making a signal stricter.
- Prefer visible explanations and manual review over automatic escalation.

If evidence is weak or negative:

- Avoid adding new scoring signals from behavioral trace data.
- Downgrade questionable current signals to diagnostics or require stronger co-signals.
- Keep public wording limited to "local signals can suggest drift patterns" rather than claiming reliable detection of distraction, vulnerability, or intent.
