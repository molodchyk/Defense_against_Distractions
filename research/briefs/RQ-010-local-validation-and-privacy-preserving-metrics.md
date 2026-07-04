# Research Question Brief

## Question ID

`RQ-010`

## Working Title

Local validation and privacy-preserving metrics.

## Exact Question

What local-only metrics and evaluation designs can tell whether DaD interventions help, harm, or merely move behavior around, without collecting sensitive browsing content or turning the extension into surveillance?

## Why DaD Needs This

DaD already records bounded local usage stats, block outcomes, intent diagnostics, Pomodoro history, prompt outcomes, UI rule matches, and triggered-action outcome shapes. The research agenda also repeatedly depends on "local validation" because scientific evidence rarely transfers cleanly to one user's browser, one nervous system, one plan, and one set of configured sites.

Without a validation model, DaD can drift in two bad directions: adding stronger interventions because they feel defensible, or collecting richer data because evaluation feels important. The product needs an evidence-informed way to measure intervention fit, false positives, burden, bypass, recovery, and long-term usefulness while keeping the data local, bounded, explainable, and user-owned.

## Affected Features

- Usage stats and local export.
- Blocked outcome shares and block diagnostics.
- Intent coherence sessions, graph summaries, Return, Isolate, Continue, and chain cleanup outcomes.
- Prompt burden, Continue reason metadata, and recovery choice outcomes.
- Pomodoro work/break history, rest credit, skipped breaks, and resets.
- UI element cleanup match counts, re-enable events, and action outcomes.
- Triggered action chain outcome events.
- Protected-schedule stricter-only edits and later relaxation attempts.
- Feedback calibration and false-positive reporting.
- Store/public claims about local-first improvement and privacy.

## Scope

Included:

- Local-only evaluation of browser self-control interventions.
- Single-user and within-person measurement designs, such as N-of-1, single-case experimental design, interrupted time series, baseline windows, and counterbalanced configuration changes.
- Metrics for intervention benefit, burden, false positives, false negatives, bypass, substitution, habituation, and abandonment.
- Measurement reactivity: when showing stats changes behavior or creates pressure.
- Data minimization, aggregation, retention limits, differential sensitivity of event types, and user-controlled export.
- Ways to evaluate delayed outcomes, such as whether a return action leads back to a coherent chain rather than only closing the prompt.
- Limits of local evidence: what DaD can and cannot know from Chrome-only signals.

Excluded:

- Which intervention family is best; that belongs to `RQ-004`.
- Which scoring signals are valid; that belongs to `RQ-005`.
- Which browsing contexts are high-risk; that belongs to `RQ-006`.
- Full prompt design; that belongs to `RQ-009`.
- Public explanation strategy; that belongs to `RQ-014`.
- Remote analytics, account-level tracking, cohort benchmarking, or employer/third-party productivity reporting.
- Clinical outcome measurement, diagnosis, or treatment evaluation.

## Evidence Needed

- Methodological literature on N-of-1 trials, single-case experimental designs, interrupted time-series designs, and within-person behavior-change evaluation.
- HCI and digital wellbeing studies that evaluate self-control tools with logs, local metrics, diaries, experience sampling, or longitudinal field deployment.
- Research on self-monitoring, quantified-self tools, measurement reactivity, dashboard effects, and when metrics increase guilt, obsession, or disengagement.
- Privacy and usable-security work on local-first telemetry, data minimization, user-controlled export, and sensitive behavioral logs.
- Evidence on substitution, displacement, rebound, habituation, and abandonment after app/website blocking or friction tools.
- Research separating immediate action success from downstream outcome, such as "clicked Return" versus "stayed coherent for the next session."
- Studies comparing self-report, passive logs, and mixed local feedback for evaluating subjective benefit and burden.

## Novelty Target

The useful answer should not merely say "measure locally and preserve privacy." It should define which local metrics are actually interpretable, which are misleading, and what minimal design can detect harm or non-effect.

Examples of valuable findings:

- immediate compliance can be a bad success metric if users substitute to another site, another device, or a later rebound session;
- a drop in blocked visits may mean improvement, avoidance of the blocker, relaxation of rules, or that the user stopped using the protected workflow;
- self-monitoring can change behavior by itself, so usage dashboards are interventions, not passive reports;
- single-user validation needs baseline and change windows because cross-user averages may not apply to personalized defenses;
- false positives may be more visible than false negatives, so DaD needs metrics that catch silent under-blocking or repeated post-Continue drift;
- local event enums can preserve privacy but lose causal context, so evidence strength should be graded by what the metric can actually prove;
- "more blocked time" is not necessarily better and may indicate overreach, bad plans, or hostile friction.

## Novelty Proof Obligations

- Define at least six metric families with interpretation limits, including intervention exposure, immediate outcome, delayed recovery, burden, bypass/substitution, configuration relaxation, and user feedback.
- Distinguish metrics that can support causal inference from metrics that are only diagnostics or warning signs.
- Identify at least three misleading success metrics that DaD should avoid optimizing, such as raw blocked time, prompt count, Continue text length, or days without a block.
- Compare at least three evaluation designs, such as baseline windows, within-person A/B changes, single-case reversal designs, interrupted time series, user-triggered feedback, or local diary pairing.
- Define a privacy tier model for local event fields, including what can be stored routinely, what should be bucketed, what should be export-only, and what should never be stored.
- State how DaD should detect product harm without raw content, including false positives, prompt fatigue, blocked legitimate work, rule relaxation, disablement, and repeated bypass.

## Product Decisions This Could Change

- Which local diagnostics should be recorded for every intervention versus only when the user opts in.
- Whether usage stats should emphasize outcomes, burden, and trends rather than raw activity volume.
- Whether prompt and intent history should store reason text, reason length bucket, or only action/outcome enums.
- Whether Pomodoro history should surface skipped breaks, credited rest, resets, and later relaxation instead of only completed cycles.
- Whether UI cleanup and triggered actions should record matched-count and fallback outcomes before being treated as safe.
- Whether DaD should add a local "review protection fit" screen for repeated false positives, repeated bypass, or heavy prompt burden.
- Whether release/store copy should avoid claims of effectiveness until local validation patterns exist.

## Privacy Risks

Validation can become the strongest pressure toward surveillance. DaD should avoid:

- raw page text;
- full URLs or query strings;
- page titles;
- typed input;
- reason text stored by default;
- private messages;
- screenshots or screen recordings;
- full DOM snapshots or raw selectors;
- image, audio, video, caption, or media-source analysis;
- cross-device behavior;
- remote analytics or benchmark uploads;
- account identity or demographic inference;
- employer, school, family, or third-party reporting.

Acceptable local data should be narrowly scoped:

- intervention type;
- action chosen;
- result enum;
- bounded score bucket;
- coarse hostname where necessary;
- timestamp bucket;
- active plan id or local plan label id;
- duration buckets;
- match-count buckets;
- reason-present boolean or length bucket;
- user feedback enum;
- later relaxation/disablement enum;
- retention-limited local export when the user asks.

## Autonomy Risks

Metrics can quietly change the product's values. The research should guard against:

- optimizing for high block counts rather than useful recovery;
- treating bypass as disobedience instead of evidence that the plan may be misfit;
- making dashboards feel like surveillance or moral accounting;
- hiding uncertainty behind precise-looking percentages;
- pressuring the user to maximize streaks, scores, or productivity;
- interpreting no local event as success;
- making local export too revealing without clear warning;
- letting validation become a path toward remote telemetry.

DaD should treat local validation as a user-owned calibration loop, not a scoreboard.

## Possible Outcomes

If evidence is strong:

- Define a privacy-preserving validation schema for intervention exposure, outcome, burden, bypass, recovery, and configuration change.
- Add a metric interpretation guide that separates causal evidence, diagnostic hints, and non-actionable counters.
- Update feature specs so each intervention has a bounded outcome event and a retention rule.
- Add review triggers for repeated false positives, repeated bypass, heavy prompt burden, or frequent relaxation attempts.

If evidence is mixed:

- Keep local metrics conservative and descriptive.
- Prefer user-triggered feedback and export over automatic interpretation.
- Treat dashboards as interventions that need opt-out or quiet defaults.

If evidence is weak or negative:

- Avoid building more metrics until a specific product decision requires them.
- Do not claim DaD can prove effectiveness locally.
- Keep only minimum diagnostics needed for debugging, user explanation, and privacy-preserving manual review.
