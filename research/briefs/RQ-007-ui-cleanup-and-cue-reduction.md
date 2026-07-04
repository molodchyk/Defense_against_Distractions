# Research Question Brief

## Question ID

`RQ-007`

## Working Title

UI cleanup and cue reduction.

## Exact Question

When does hiding, disabling, pausing, or visually reducing page UI elements measurably reduce compulsive loops or support self-control, and when does it fail, create workarounds, break legitimate work, or increase user burden?

## Why DaD Needs This

DaD already supports user-created UI element rules that can hide matched elements, click once, clear one field, pause media, hide images inside a scope, or disable interactive controls inside a scope. Intent coherence can also reduce noisy recommendation/feed/comment regions as a reversible intervention. DaD Select has a future path for turning selected text into scoped cleanup presets such as hide images or disable controls.

These features need evidence discipline. UI cleanup can be a humane middle layer between doing nothing and blocking a whole page, but it can also become brittle cosmetic overreach, accidental censorship of useful controls, or a pseudo-automation system that hides problems instead of helping recovery. The research should decide where cue reduction belongs in the intervention ladder and what safety boundaries it needs.

## Affected Features

- Options-page `Blocked UI` element rules.
- UI picker target, strategy, score, ancestor-depth, label-match, and preview modes.
- Built-in ChatGPT message-action cleanup.
- Intent coherence `reduce-noise` action.
- Structural keyword and context-risk rules that may later propose cleanup before blocking.
- DaD Select cleanup presets for `hideImages` and `disableControls`.
- Triggered action chains that may include hide, pause, clear, click, disable, or block steps.
- Locked-schedule strictness for enabling, disabling, deleting, or widening UI rules.
- Store/public explanation of UI cleanup as quieting, not content safety.

## Scope

Included:

- Hiding or reducing feeds, recommendations, related content, comments, reaction/social feedback controls, autoplay/next controls, images, media surfaces, and repetitive action buttons.
- Disabling controls temporarily, pausing media, clearing fields, and one-time dismiss/click actions where they are part of user-configured cleanup.
- Research on cue exposure, environmental restructuring, choice architecture, habit disruption, digital self-control tools, interface friction, recommender/feed design, and HCI interventions that remove or alter page affordances.
- Evidence on adherence, workarounds, breakage, habituation, substitution, user burden, accessibility, and false positives.
- Differences between whole-page cleanup, container-scoped cleanup, element-level cleanup, and built-in site-specific cleanup.

Excluded:

- Which browsing contexts are high-risk; that belongs to `RQ-006`.
- Full intervention ordering and severity across all self-control tools; that belongs to `RQ-004`.
- General signal validity for detecting drift; that belongs to `RQ-005`.
- Prompt wording and reason prompts; that belongs to `RQ-009`.
- Mechanism-level dopamine or reinforcement claims; that belongs to `RQ-012`.
- Arbitrary scripting or multi-page automation; triggered actions need their own safety model.

## Evidence Needed

- Systematic reviews or meta-analyses on environmental restructuring, stimulus control, cue exposure/reduction, habit disruption, nudging, and digital self-control interventions.
- HCI studies of tools that remove feeds, recommendations, notifications, social feedback counts, comments, autoplay, or other affordances.
- Field studies or log-based studies comparing blocking, hiding, interface friction, self-monitoring, and feed/recommendation removal.
- Studies reporting bypass, disablement, abandonment, habituation, substitution, perceived autonomy, usability cost, task success, or long-term persistence.
- Evidence on accessibility and mixed-use failure modes when controls or media are hidden or disabled.
- Evidence distinguishing temporary reversible cleanup from permanent or destructive automation.

## Novelty Target

The useful output should not say merely "remove distractions." It should identify where UI cleanup has a distinctive effect compared with blocking, prompts, or timers; what kinds of affordances matter; and what can go wrong.

Examples of valuable findings:

- removing visible cues reduces checking only when the removed affordance is close to the habit trigger, not when the user can easily navigate around it;
- hiding recommendations helps short sessions but loses effect after habituation or when the platform exposes alternate entry points;
- comments/reactions create different loops than recommendations and may need different cleanup actions;
- image hiding can reduce salience in some contexts but harm comprehension, accessibility, or legitimate inspection;
- disabling controls can preserve the page while preventing one risky action, but it may increase frustration if the user cannot understand what changed;
- one-time dismiss/click actions are helpful for stable nuisance prompts but dangerous for destructive or ambiguous targets;
- cue removal works best when paired with visible policy memory and an easy way to inspect or undo the rule later.

## Novelty Proof Obligations

- Identify at least four UI-affordance families with measured or well-supported effects, such as recommendations, comments/social feedback, autoplay/media controls, images/visual salience, notifications/modals, or repeated action controls.
- Compare cleanup against at least two other intervention families, such as full blocking, friction/delay, prompt/reason, self-monitoring, or timers.
- Report failure modes: workaround behavior, habituation, substitution, page breakage, accessibility harm, task interference, or abandonment.
- Distinguish whole-page, container-scoped, and element-scoped cleanup, and state when DaD should require an explicit picker scope instead of inferring a broad page action.
- Define which cleanup actions may be default-safe, user-configured only, diagnostic-only, or avoided until stronger safety design exists.
- Define local validation metrics for cleanup rules without storing raw page text, full URLs, page titles, selectors beyond user-created fingerprints, screenshots, image/audio/video content, typed input, or hidden element text.

## Product Decisions This Could Change

- Whether `reduce-noise` should stay a reversible middle intervention or be split into separate feed, recommendation, comment, and media cleanup actions.
- Whether built-in cleanup should remain extremely narrow or expand to other stable surfaces.
- Whether `hideImages` and `disableControls` should be exposed in DaD Select only after picker-backed scope is available.
- Whether whole-page cleanup presets should exist at all.
- Whether the UI picker should warn when a rule touches high-impact controls, many elements, editable fields, or accessibility-relevant regions.
- Whether cleanup-rule diagnostics should include local burden/outcome summaries such as disable count, re-enable count, matched count, or page-breakage feedback.
- Whether triggered action chains should treat hide/disable/pause as safer than click/clear, or whether some hide/disable actions still require stronger confirmation.

## Privacy Risks

UI cleanup can tempt the product to store too much page structure. DaD should avoid:

- raw page text;
- hidden element text;
- full CSS selectors;
- full DOM snapshots;
- screenshots;
- image, audio, or video content;
- media URLs, captions, titles, or source strings;
- typed field values;
- private message text;
- remote page classification;
- analytics on which controls the user hides.

Acceptable local data should stay bounded and user-owned:

- user-created structural fingerprints;
- action type;
- host or user-entered URL pattern;
- enabled/disabled state;
- capped match counts;
- outcome enums;
- timestamp buckets;
- explicit user feedback;
- local export only when the user asks.

## Autonomy Risks

UI cleanup can feel less coercive than blocking, but it can become hostile if it silently changes a page in ways the user cannot understand. The research should guard against:

- invisible manipulation that looks like a site bug;
- hiding controls needed for work, safety, accessibility, or account management;
- disabling without a visible path to inspect or reverse the rule;
- treating cosmetic quieting as proof that a page is safe;
- expanding from user-picked targets into broad inferred censorship;
- using built-in cleanup that reflects the developer's personal preferences rather than user configuration;
- turning one-time click actions into destructive automation.

DaD should frame cleanup as user-authored page quieting, not objective content classification.

## Possible Outcomes

If evidence is strong:

- Define a cleanup action ladder with safe defaults, picker-required actions, confirmation-required actions, and avoid-until-designed actions.
- Add guidance for when UI cleanup should precede blocking and when blocking should remain separate.
- Add local validation metrics for cleanup burden, persistence, and false positives.
- Update UI cleanup docs and tests to reflect the evidence-backed boundaries.

If evidence is mixed:

- Keep cleanup actions user-configured and scoped.
- Avoid expanding built-in cleanup beyond narrow, stable, low-risk controls.
- Prefer outline preview, explicit scope, and reversible actions over automatic cleanup.

If evidence is weak or negative:

- Treat UI cleanup mainly as a personal customization tool, not an evidence-backed self-control intervention.
- Do not add broader built-in cleanup presets.
- Keep public copy limited to "quiet selected page elements" rather than claims about reducing compulsive use.
