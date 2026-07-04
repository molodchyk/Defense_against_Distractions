# Research Question Brief

## Question ID

`RQ-006`

## Working Title

High-risk browsing context map.

## Exact Question

Which browsing contexts are empirically associated with high-risk loops, regretted use, compulsive continuation, or self-control failure, and how should DaD distinguish context risk from ordinary mixed-use browsing?

## Why DaD Needs This

DaD already has opt-in structural keywords and intent signals for recommendations, feeds, comments, short-form surfaces, media pressure, link density, search-refinement loops, passive time, and drift descendants. Those features should not be tuned by casual stereotypes about "bad websites." The product needs a research-backed context map that says which environments tend to create continuation pressure, which features inside those environments matter, and which contexts are too mixed-use to treat as risky without user configuration or stronger co-signals.

The answer should guide structural keyword presets, intent-coherence weighting, diagnostics language, and future action-chain defaults without turning DaD into a moral classifier of websites.

## Affected Features

- Structural keywords such as `has:recommendations`, `has:comments`, `has:shorts`, `has:media`, `has:audible`, `has:links>=N`, `has:pageSeconds>=N`, and `has:activeSeconds>=N`.
- Intent coherence media, feed, search-loop, long-session, low-return, origin-decay, and drift-descendant pressure.
- Popup Page Signals and Block Diagnostics.
- Options usage stats and intent diagnostics.
- UI cleanup rules for recommendation, feed, comment, related-content, shorts/reels, and image-heavy surfaces.
- Triggered actions that may later remove, hide, pause, or disable context-specific page regions.
- Store and public explanation of DaD as user-owned defense rather than content morality.

## Scope

Included:

- Social feeds, recommendation surfaces, short video, autoplay/video queues, comments, infinite scroll, adult content, shopping, news, gambling-adjacent loops where relevant, search loops, and social validation surfaces.
- Design features such as autoplay, algorithmic recommendation, variable rewards, intermittent notifications, endless pagination, comments/replies, ranking, streaks, visible counts, and related-content rails.
- Evidence that compares contexts by measured use duration, session length, return frequency, cue reactivity, regret, craving, loss of control, or problem-use measures.
- Boundary conditions for mixed-use domains, professional workflows, research, communication, language learning, entertainment by intention, and accessibility needs.
- Differences between host/category risk and page-structure risk.

Excluded:

- General signal validity across all browser telemetry; that belongs to `RQ-005`.
- The intervention ladder after risk is detected; that belongs to `RQ-004`.
- Whether hiding or disabling specific UI regions works; that belongs to `RQ-007`.
- Mechanism-level reward, dopamine, and reinforcement claims; that belongs to `RQ-012`.
- Clinical diagnosis, treatment, or labeling users as addicted.
- Remote content classification, category databases, screenshots, or cloud ML.

## Evidence Needed

- Systematic reviews or meta-analyses on problematic internet use, problematic smartphone/social media use, online pornography use where relevant, gaming/gambling-adjacent mechanics where relevant, online shopping, news consumption, and short-form video.
- Primary studies with objective logs, experience sampling, digital trace data, or validated problem-use measures that separate context, feature, and user-state effects.
- HCI and recommender-system studies on endless feeds, autoplay, infinite scroll, comments, social feedback, notification cues, and recommendation loops.
- Studies distinguishing intentional high-duration use from regretted or compulsive continuation.
- Evidence on domain-specific versus feature-specific risk: whether the risky unit is a hostname/category, a page layout, a feed/recommendation affordance, a session pattern, or a user-configured trigger.
- Cross-cultural, age, gender, occupational, or neurodiversity findings where they change default assumptions.

## Novelty Target

This research should produce findings that are not reducible to "feeds are distracting" or "short videos are addictive." Useful findings include measured differences between contexts, mechanisms that separate benign engagement from continuation pressure, evidence that some feared categories are less predictive than specific design affordances, and conditions where the same context flips from useful to risky.

Examples of valuable findings:

- short-form video risk depends more on autoplay/recommendation continuity than on video presence alone;
- comments or social feedback become risky mainly when tied to status checking, replies, or conflict loops;
- shopping risk is driven by search/filter/recommendation loops or scarcity cues rather than product pages generally;
- news risk is driven by uncertainty, outrage, or update checking rather than reading long articles;
- adult content risk signals differ from generic media signals and should not be inferred from image/video count alone;
- search loops are risky when disconnected or repetitive but useful when query refinement is semantically connected;
- high-risk contexts vary enough by user that host-level defaults should be conservative and plan/user-configured.

## Novelty Proof Obligations

- Identify at least six context families and separate the evidence for each from the evidence for the underlying design affordances.
- Report measured outcomes where available: time spent, session length, return frequency, craving/urge, regret, failed reduction, problem-use score, escalation, or objective continuation behavior.
- Distinguish category risk from structural feature risk, and state which DaD rules should be host/category-based, structure-based, session-pattern-based, or user-configured only.
- Include at least three false-positive cases where an apparently high-risk context is commonly intentional, productive, social, educational, or accessibility-supporting.
- Identify at least two contexts where DaD should avoid automatic inference unless the user explicitly configures the rule.
- Translate findings into a cautious context map with recommended DaD treatment: core scoring, modifier-only, structural keyword preset, UI cleanup candidate, diagnostics-only, or avoid.
- Define local validation metrics for context rules without storing raw page text, full URLs, page titles, query strings, typed input, selectors, screenshots, media URLs, or content categories from a remote service.

## Product Decisions This Could Change

- Which structural keyword presets should exist, if any, and which should remain manually authored.
- Whether recommendations, comments, shorts/reels, autoplay, image-heavy pages, or link density should carry different default weights.
- Whether adult, shopping, news, social, search, or media contexts require separate user-configured plan templates rather than global defaults.
- Which passive-surface diagnostics should be shown to users as likely continuation pressure versus neutral page structure.
- Whether intent scoring should treat repeated search, feed consumption, short video, and social validation loops as distinct patterns.
- Which future triggered actions should be first-class, such as hiding recommendations, pausing autoplay, disabling comment boxes, removing related-content rails, or blocking page fallback.

## Privacy Risks

Context mapping can tempt the product toward broad content classification. DaD should avoid:

- remote URL categorization;
- adult/content-category databases;
- raw URL path or query storage;
- page title storage;
- screenshots;
- image, audio, or video classification;
- comment or message text analysis;
- account identity or social graph inference;
- storing search query strings;
- moral labels on hostnames.

Acceptable context evidence inside DaD should come from local, bounded, user-inspectable signals:

- user-configured host or keyword rules;
- structural counts and boolean page-surface indicators;
- bounded session-pattern summaries;
- normalized hostnames only where already needed for user-visible diagnostics;
- coarse score buckets;
- explicit user feedback and local exports.

## Autonomy Risks

A context map can become paternalistic if it implies that DaD knows which content is bad. The research should guard against:

- moralizing categories such as adult content, entertainment, shopping, or social media;
- treating user preference as pathology;
- blocking mixed-use contexts without user configuration;
- flattening different nervous systems into one default;
- making public claims that a category is objectively harmful for everyone;
- using shame-based explanations;
- hiding the fact that a rule is user-configured or heuristic.

DaD should frame context risk as "this context often has continuation pressure under this plan" rather than "this page is bad."

## Possible Outcomes

If evidence is strong:

- Build a context-risk map that distinguishes context family, risky affordance, measured outcome, recommended DaD signal, and privacy boundary.
- Add or adjust structural keyword presets only where evidence and false-positive handling are strong.
- Update scoring docs to distinguish feed loops, search loops, social validation loops, media chains, and shopping/news loops.
- Define local validation metrics for each high-risk context family.

If evidence is mixed:

- Keep context rules user-configured and plan-specific.
- Treat most page-structure signals as modifiers or diagnostics instead of core scoring.
- Prefer UI cleanup and visible diagnostics before blocking on mixed-use pages.

If evidence is weak or negative:

- Avoid category-level defaults.
- Keep public copy away from broad claims about website types.
- Require explicit user rules, local feedback, or stronger co-signals before any context-specific intervention escalates.
