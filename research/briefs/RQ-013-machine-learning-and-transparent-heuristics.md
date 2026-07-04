# Research Question Brief

## Question ID

`RQ-013`

## Working Title

Machine learning and transparent heuristics.

## Exact Question

Would machine learning add product value over transparent local heuristics for DaD keyword suggestions, score estimation, intent-risk classification, UI-cleanup suggestions, or personalization, and what evidence would justify adding it despite privacy, inspectability, calibration, and maintenance costs?

## Why DaD Needs This

Original product notes mention machine learning on blocked keywords, text, and text recognition. The current extension already has deterministic local mechanisms: keyword scoring, Page Signals keyword ideas, selected-text capture, intent coherence scoring, structural page signals, UI cleanup rules, and local feedback.

The risk is not simply "ML could be private or not private." The real product question is whether ML would discover useful distinctions that DaD's transparent rules miss, or whether it would mostly add opaque authority, harder debugging, unclear ground truth, and a worse store/privacy posture. The research answer should make that tradeoff concrete enough to guide implementation.

## Affected Features

- Page Signals keyword ideas and selected-text quick-add.
- Keyword score estimation for user-selected words or phrases.
- Intent coherence scoring, drift prompts, and graph explanations.
- Structural keywords such as `has:feed`, `has:recommendations`, `has:comments`, `has:media`, `has:shorts`, and `has:audible`.
- UI cleanup recommendations for hiding images, controls, feeds, recommendation areas, comments, or selected page regions.
- Future "perform action on trigger" rules where a keyword can trigger ordered actions before or instead of page blocking.
- Local feedback loops for false positives, bypasses, continues, isolates, returns, and later configuration changes.
- Public/store copy that might be tempted to mention AI or machine learning.

## Scope

Included:

- Local-only supervised classification, ranking, clustering, embeddings, small models, and active-learning style personalization.
- Transparent deterministic baselines: user-authored rules, token counts, co-occurrence counts, host-scoped statistics, structural signals, score tables, and editable presets.
- Candidate ML tasks: keyword suggestion, keyword score estimation, drift-risk prediction, high-risk context ranking, UI cleanup suggestion, action-sequence suggestion, and per-user calibration.
- Human-in-the-loop systems where the model proposes but the user inspects, edits, accepts, or rejects.
- Evidence about label noise, sparse feedback, calibration, base rates, false positives, explanations, trust, controllability, and model drift in personal informatics or digital wellbeing tools.
- On-device privacy-preserving learning only if the literature shows meaningful value over simpler baselines.

Excluded:

- Remote raw page text, screenshots, audio, video, captions, typed input, message content, or browsing-history uploads.
- Cloud classification APIs, remote embedding APIs, remote personalization, or server-side profile building.
- Clinical inference, diagnosis, emotion detection, mental-state detection, lie detection, addiction-risk scoring, or user trait prediction.
- Computer-vision text recognition unless a separate privacy review proves why ordinary DOM text and user selection are insufficient.
- Opaque auto-blocking based on model output without a user-authored rule, explicit plan, or transparent explanation.
- Community-scale recommender systems, moderation, or shared blocklist ranking; those need separate product and abuse research.

## Evidence Needed

- HCI and digital wellbeing studies comparing automated suggestions, adaptive interventions, rule-based tools, and user-authored self-control configurations.
- Personal informatics research on whether automatic inference improves self-management or creates mistrust, avoidance, overfitting, or explanation burden.
- Studies on human-in-the-loop machine learning, interactive machine teaching, end-user rule editing, and model correction in consumer tools.
- Evidence on small-data personalization: how many labels are needed before a per-user model beats a transparent baseline, and how unstable labels are when intention changes by context.
- Work on explainable AI and algorithm aversion/algorithm appreciation where the user's goal is self-regulation rather than productivity scoring.
- Calibration and base-rate literature relevant to rare events, false positives, false negatives, and confidence displays.
- Privacy-preserving/on-device ML literature that distinguishes "data never leaves the device" from "the model still creates sensitive derived representations."
- Empirical comparisons of embeddings, keyword/rule baselines, and simple lexical features for topic or intent-adjacent classification.
- Evidence on unintended automation effects: learned helplessness, perceived surveillance, user gaming of metrics, and brittle behavior when page layouts or personal goals shift.

## Novelty Target

The useful answer should not say "ML is powerful," "privacy matters," or "explainability is important." It should identify where ML changes a DaD design decision and where it does not.

Examples of valuable findings:

- a transparent lexical baseline may match or beat small personalized models when labels are sparse, inconsistent, or user goals change by hour, plan, or context;
- model confidence may be least reliable exactly where DaD most needs humility: mixed-use pages, ambiguous research, email/social overlap, or a user who is deliberately exploring;
- false negatives are harder to observe than false positives because the user may simply drift without reporting that the system missed it;
- embeddings may improve semantic keyword suggestions but can store non-obvious semantic fingerprints that are harder to inspect or delete than plain tokens;
- user-correctable rules may produce more trust than higher-accuracy opaque models in self-regulation tools because correction itself is part of agency;
- ML may be more defensible for suggestion/ranking than enforcement because the user can review a proposal before it affects browsing;
- per-user adaptation may overfit to temporary crises unless the system separates stable preferences, plan-specific rules, and short-lived state.

## Novelty Proof Obligations

- Compare at least seven candidate tasks: keyword suggestion, keyword score estimation, drift-risk prediction, context-risk ranking, UI cleanup suggestion, ordered action suggestion, and per-user calibration.
- For each candidate task, name the minimum data, label source, label frequency, baseline heuristic, plausible ML method, expected failure mode, and privacy cost.
- Identify the evidence threshold that would justify moving from transparent rules to local ML for each task, not just a general yes/no recommendation.
- Separate suggestion from enforcement: specify which tasks may only recommend, which may modify scores, and which should never block without explicit user-authored configuration.
- Evaluate whether embeddings are materially better than token/co-occurrence heuristics for DaD's use cases, and whether their opacity creates deletion, audit, or consent problems.
- Treat false positives and false negatives separately, including what DaD can measure locally and what remains unobservable without invasive data.
- Define explainability requirements in product terms: what the user must be able to see, edit, disable, export, delete, or override.
- Identify at least four boundary cases where ML would likely misread intention: research rabbit holes, translation/dictionary work, email triage, learning videos, professional monitoring, and deliberate decompression.
- State whether public copy should avoid AI/ML claims even if a small local model is later added.

## Product Decisions This Could Change

- Whether DaD should keep a no-ML default for v1.x.
- Whether keyword suggestions should remain deterministic token/co-occurrence heuristics or later support an optional local semantic layer.
- Whether selected-text quick-add should estimate scores by transparent rules only.
- Whether intent coherence should remain an explainable score assembled from visible factors rather than a classifier.
- Whether feedback should tune local thresholds, collect training labels, or only inform diagnostics.
- Whether action-on-trigger rules should use model suggestions or remain manually configured ordered actions.
- Whether any future ML feature must be opt-in, local-only, suggestion-only, and deletable.
- Whether the Chrome Web Store listing and public copy should deliberately avoid "AI" positioning.

## Privacy Risks

ML can create privacy risk even without a server because model inputs, embeddings, labels, and derived features can reveal sensitive browsing patterns. DaD should avoid:

- raw page text beyond bounded ephemeral analysis;
- full URLs, query strings, page titles, message content, typed input, comments, captions, transcripts, screenshots, audio, video, images, selectors, or account identifiers;
- remote embeddings, remote classifiers, remote prompt calls, or third-party model telemetry;
- persistent semantic vectors whose contents cannot be inspected by the user;
- cross-site profiles that infer sensitive interests, sexuality, health, politics, religion, finances, relationships, or mental state;
- training labels that imply shame, weakness, addiction, or pathology;
- model artifacts that cannot be exported, reset, or deleted separately from ordinary settings.

Acceptable local data, if research later justifies it, should be narrow and inspectable:

- user-authored keywords and scores;
- host-scoped aggregate counts;
- structural signal buckets;
- selected text only when the user explicitly turns it into a rule;
- feedback enums such as false positive, useful, continue, isolate, return, or block;
- model/settings metadata that can be reset without preserving hidden profiles.

## Autonomy Risks

The main autonomy risk is opaque persuasion: the extension could sound more certain than its evidence, and the user could start deferring to a model that does not understand their actual goal.

The research should guard against:

- presenting model scores as knowledge of true intention;
- using model output to silently tighten or relax a plan;
- making the system harder to debug than a visible rule table;
- causing users to fight an invisible classifier instead of editing a concrete rule;
- rewarding the model for easier-to-measure outcomes rather than the user's actual recovery;
- making temporary vulnerability into a durable personal profile;
- turning self-defense into surveillance of the self;
- adding an "AI" feature because it is fashionable rather than because it beats the transparent baseline.

DaD should treat any ML output as a fallible proposal unless future evidence and local validation prove a stronger role is warranted.

## Possible Outcomes

If evidence is strong:

- Define one narrow optional local ML feature with a measurable advantage over deterministic baselines.
- Keep it suggestion-only at first, with clear explanations, editable outputs, opt-in storage, reset/delete controls, and no remote processing.
- Add local validation metrics comparing accepted suggestions, rejected suggestions, later false positives, and later rule edits against the heuristic baseline.

If evidence is mixed:

- Keep v1.x deterministic and transparent.
- Use research to improve heuristics, score explanations, and feedback collection instead of adding ML.
- Revisit only after DaD has enough local validation data to define stable labels without collecting sensitive content.

If evidence is weak or negative:

- Document a no-ML principle for core enforcement.
- Keep keyword ideas, score estimates, and intent coherence rule-based and inspectable.
- Avoid AI/ML claims in public copy and store listings.
- Require a new research question before adding any model-based feature.
