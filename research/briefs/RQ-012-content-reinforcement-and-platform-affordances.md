# Research Question Brief

## Question ID

`RQ-012`

## Working Title

Content reinforcement and platform affordances.

## Exact Question

What does scientific literature actually support about reward, reinforcement, dopamine, autoplay, infinite scroll, short-form media, social feedback, and algorithmic recommendations, and how should DaD translate that evidence into local scoring and UI cleanup without pop-neuroscience or moralized content labels?

## Why DaD Needs This

DaD already detects and scores bounded local signals for recommendation regions, feeds, comments, short-form surfaces, visible media playback, autoplay-like media progression, dynamic content growth after scrolling, feed/comment clicks, and passive media pressure. It can also hide feed, recommendation, related-content, shorts/reels, and comment containers during reduce-noise actions.

These features are close to the original product concern about "dopaminergic lock-in," but casual dopamine language is too imprecise to guide implementation. The product needs a mechanism-level map that says which platform affordances plausibly increase continuation pressure, which are merely correlated with long sessions, which signals should remain modifier-only, and which public claims should be avoided.

## Affected Features

- Intent coherence media/feed/recommendation/comment scoring.
- Passive media, media-chain, dynamic-content, low-agency, and long-session loads.
- Structural keywords such as `has:recommendations`, `has:comments`, `has:shorts`, `has:media`, and `has:audible`.
- Reduce-noise action that hides recommendation, feed, related-content, shorts/reels, and comment containers.
- UI element cleanup actions for hiding images, pausing media, disabling controls, and hiding selected page regions.
- Popup Page Signals and intent diagnostics copy.
- Options diagnostics labels for recommendation/feed clicks, feed/comment load, and media pressure.
- Store/public copy that may be tempted to mention dopamine, addiction, or addictive design.
- Future context-specific presets for short video, feeds, comments, social validation, adult content, shopping, news, and search loops.

## Scope

Included:

- Reinforcement learning concepts, reward prediction, variable or intermittent reinforcement, habit formation, cue reactivity, craving, attentional capture, and continuation pressure.
- Platform affordances: autoplay, infinite scroll, algorithmic recommendation, short-form video queues, social feedback counts, comments/replies, notifications, streaks, related-content rails, ranking, and endless pagination.
- Differences between media presence, media progression, recommender-driven navigation, feed traversal, comment/social validation loops, and ordinary deliberate media use.
- Evidence on session length, return frequency, regret, craving/urge, failed reduction, attention capture, habit loops, and problem-use measures.
- Boundary conditions for learning, research, communication, entertainment by intention, accessibility, and professional media workflows.
- Scientific limits of dopamine explanations and when neuroscience evidence is too far from browser-product design.

Excluded:

- Which browsing contexts are high-risk overall; that belongs to `RQ-006`.
- General local scoring-signal validity; that belongs to `RQ-005`.
- Whether UI cleanup works as an intervention; that belongs to `RQ-007`.
- General intervention ordering; that belongs to `RQ-004`.
- Mental-state or diagnostic framing; that belongs to `RQ-011`.
- Clinical diagnosis or treatment of addiction, ADHD, depression, anxiety, compulsive sexual behavior, gambling disorder, or gaming disorder.
- Remote recommender analysis, content classification, image/video understanding, or cloud ML.

## Evidence Needed

- Reviews and meta-analyses on problematic internet use, problematic smartphone/social media use, online video/short-form video use, gaming/gambling-adjacent mechanics where relevant, and online pornography use where relevant.
- Neuroscience and psychology sources that distinguish dopamine, reward prediction error, salience, reinforcement learning, habit, craving, and pleasure without collapsing them into one explanation.
- HCI, recommender-system, and digital wellbeing studies on autoplay, infinite scroll, feed ranking, related-content rails, notifications, social feedback, and short-form queues.
- Primary studies with objective logs, experience sampling, experiments, or field interventions that measure continuation, return, regret, craving, or failed stopping.
- Evidence comparing design affordances rather than only app categories: for example autoplay versus manual play, infinite scroll versus pagination, recommendations versus chronological lists, comments visible versus hidden.
- Research on individual differences and context dependence: when the same affordance supports learning, work, social connection, or deliberate leisure.
- Evidence on intervention points: disabling autoplay, hiding recommendations, stopping infinite scroll, hiding counts/comments, adding friction, or showing session boundaries.

## Novelty Target

The useful answer should not say "dopamine makes apps addictive" or "algorithmic feeds are bad." It should identify measured mechanisms and product-relevant boundaries.

Examples of valuable findings:

- dopamine may be more relevant to prediction, salience, and learning than to simple pleasure, so DaD copy should avoid using it as a synonym for "tempting";
- variable reward may explain some checking loops better than continuous passive video consumption, which may depend more on autoplay, low effort, and recommender continuity;
- infinite scroll may increase continuation by removing stopping cues, but the effect can differ from ranked recommendation or social feedback loops;
- visible likes, replies, or notifications may create return/checking pressure that is not captured by media count or dwell time;
- short-form queues may combine rapid novelty, low task switching cost, and recommender continuity, so "video present" is too weak as a signal;
- comments can create conflict, social validation, or completion loops, which may need different treatment than recommendation rails;
- hiding recommendations may reduce one entry point while users route through search, subscriptions, history, or another device.

## Novelty Proof Obligations

- Separate at least five mechanisms, such as reward prediction, attentional salience, cue-triggered habit, social validation, novelty seeking, stopping-cue removal, effort reduction, or algorithmic personalization.
- Compare at least six affordances: autoplay, infinite scroll, recommendation rails, short-form queues, comments/replies, social counts/notifications, ranking, streaks, or endless pagination.
- For each recommended DaD signal, classify it as core, modifier-only, diagnostic-only, user-configured only, or avoid, and state what evidence would move it between classes.
- Identify at least four boundary cases where the same affordance is deliberate or useful, such as tutorials, music, language learning, professional monitoring, research, accessibility, or social support.
- State which findings justify local structure signals and which would require invasive data DaD should not collect.
- Define local validation metrics for reinforcement-related features without storing raw page text, full URLs, page titles, typed input, selectors, screenshots, media URLs, captions, comments, or social graph data.
- Specify what public copy may say about reward/reinforcement and what it must not say about dopamine, addiction, or mental health.

## Product Decisions This Could Change

- Whether recommendation/feed/comment/media loads should remain modifier-only or become stronger under specific co-signals.
- Whether `has:shorts`, `has:recommendations`, `has:comments`, or `has:audible` should have different suggested scores or warnings.
- Whether reduce-noise should split feed, recommendation, comment, short-form, and media controls into separate actions.
- Whether autoplay/media progression should be treated differently from ordinary media presence.
- Whether social-feedback surfaces need their own diagnostics separate from feed or comment counters.
- Whether DaD should add stopping-cue restoration, such as session boundaries or "end of intentional task" prompts, before blocking.
- Whether public/store copy should avoid dopamine entirely or use only careful mechanism language.

## Privacy Risks

Reinforcement research can tempt the product toward content inspection and remote classification. DaD should avoid:

- raw page text;
- comments, replies, captions, transcripts, or message content;
- full URLs, query strings, or page titles;
- media URLs, source strings, thumbnails, audio, video, or image analysis;
- screenshots or screen recordings;
- social graph, follower, like, or account identity extraction;
- remote category databases;
- cloud recommender analysis;
- clinical or addiction-risk scoring.

Acceptable local signals should stay structural and bounded:

- user-configured host or keyword rules;
- page-surface counts;
- media play/pause/progression counts;
- visible playback duration buckets;
- feed/comment/recommendation click counts;
- dynamic-content growth buckets;
- structural keyword match outcomes;
- action outcome enums;
- local feedback and retention-limited export only when the user asks.

## Autonomy Risks

Mechanism language can become moralizing if the product treats normal pleasure, curiosity, or leisure as pathology. The research should guard against:

- implying dopamine is bad;
- calling users addicted based on page structure;
- treating entertainment as failure;
- treating every recommendation as manipulation;
- blocking mixed-use media or social spaces without user configuration or strong co-signals;
- making diagnostics sound like a scientific verdict;
- using neuroscience language to make weak heuristics seem authoritative;
- flattening personal differences in susceptibility, intention, culture, work, or accessibility needs.

DaD should frame reinforcement-related signals as possible continuation pressure under a chosen plan, not as proof that a page or user is unhealthy.

## Possible Outcomes

If evidence is strong:

- Define a mechanism-to-signal map for reinforcement-related affordances.
- Update scoring docs so feed, recommendation, comment, short-form, autoplay, and media progression have clear roles and limits.
- Add local validation metrics for continuation after exposure, reduce-noise outcomes, autoplay/media progression, and post-intervention routing.
- Update public copy to use careful mechanism language instead of broad dopamine claims.

If evidence is mixed:

- Keep reinforcement-related signals conservative, local, and co-signal dependent.
- Prefer diagnostics and reversible UI cleanup before stronger blocking on mixed-use pages.
- Keep structural keywords user-configured or plan-specific rather than global defaults.

If evidence is weak or negative:

- Avoid adding dopamine/reward claims to UI or store copy.
- Downgrade questionable signals to diagnostic-only until local validation supports them.
- Treat platform-affordance features as personal configuration tools rather than evidence-backed universal risk detectors.
