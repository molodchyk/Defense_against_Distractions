# Research Question Brief

## Question ID

`RQ-015`

## Working Title

Personalization and generalizable defaults.

## Exact Question

Which DaD behaviors are likely safe and useful as general defaults, which should be preset suggestions, which should be plan-specific configuration, and which should remain personal-only because users differ in needs, contexts, strictness tolerance, privacy expectations, and failure modes?

## Why DaD Needs This

DaD began from one user's nervous-system needs. That is an advantage for depth, but it is a risk for release: personal strictness, schedules, scores, focus-state assumptions, UI cleanup, and intent prompts can become de facto defaults for users whose work, vulnerability, culture, browser use, accessibility needs, or risk contexts are different.

The useful research question is not "users differ." That is obvious. The product needs a decision model for when to ship a default, when to provide a preset, when to ask the user, when to keep behavior hidden until configured, and when local validation should move a behavior between those categories.

## Affected Features

- Default plan creation, starter plans, and example configurations.
- Locked schedules, stricter-only edits, protected schedule rules, and emergency escape policy.
- Pomodoro defaults, strict breaks, long-break cadence, idle/away rest credit, and timer visibility.
- Intent coherence defaults, thresholds, prompt severity, Continue/Return/Isolate action availability, and graph visibility.
- Focus state controls such as Calm, Strained, and Vulnerable.
- Structural keywords and suggested scores for feeds, recommendations, comments, media, shorts, audible media, time-on-page, and repeated interactions.
- UI cleanup presets for hiding images, disabling controls, hiding recommendations, pausing media, and page-specific picker rules.
- DaD Select quick-add score estimates and action presets.
- Usage stats, diagnostics, local validation, exports/imports, and shared rulesets.
- Onboarding, About, instruction guide, store listing, and support boundaries.

## Scope

Included:

- Heterogeneous treatment effects in digital self-control, behavior-change, personal informatics, and digital wellbeing tools.
- Personalization, tailoring, adaptive interventions, recommender-free configuration aids, and user-authored rules.
- Individual differences in self-control goals, reactance, privacy sensitivity, cognitive load, accessibility needs, work style, language/culture, household context, and device sharing.
- Distinguishing defaults, presets, examples, recommendations, opt-in modules, plan-scoped settings, and advanced settings.
- Evidence on when configuration improves fit versus when too many choices cause abandonment, anxiety, or misconfiguration.
- Local validation loops that can detect misfit without collecting sensitive raw data.
- Defaults for safety-critical behavior versus defaults for reversible, low-risk interface convenience.

Excluded:

- Choosing final DaD defaults without evidence; this brief only defines what research must answer.
- Clinical diagnosis, treatment recommendations, or user segmentation by mental-health status.
- Remote personalization, cloud profiles, account-based cross-device modeling, or inferred sensitive traits.
- Public explanation strategy; that belongs to `RQ-014`.
- Whether ML should personalize behavior; that belongs to `RQ-013`.
- Whether each intervention works in general; those belong to the feature-specific research questions.

## Evidence Needed

- Systematic reviews and meta-analyses on tailored digital interventions, digital self-control tools, behavior-change techniques, and personal informatics.
- HCI studies on customization burden, default effects, configuration fatigue, abandonment, and trust in adaptive systems.
- Research on heterogeneity of treatment effects: who benefits, who backfires, who abandons, and under what contexts.
- Self-determination theory, reactance, autonomy-supportive design, and commitment-device literature where it gives product-relevant moderators.
- Studies on just-in-time adaptive interventions, ecological momentary interventions, and context-aware prompting, especially evidence about timing and burden.
- Evidence on accessibility, neurodiversity, language/culture, and work-context differences that affect strictness and UI cleanup.
- Research on shared rulesets, presets, social proof, and whether examples bias users toward inappropriate configurations.
- Personal informatics research on goal setting, self-tracking, feedback, reflection, and when data supports or harms self-regulation.
- Privacy research on personalization: what users expect to be local, inspectable, resettable, and not inferred.

## Novelty Target

The useful answer should not say "make it configurable" or "one size does not fit all." It should identify where DaD should deliberately not generalize, where a strong default is justified, and what evidence would change that classification.

Examples of valuable findings:

- the best default for a self-control tool may be the one that gets the user to express their own threat model, not the one with the highest average effect size;
- strictness can have asymmetric failure costs: too weak may fail silently, while too strong may cause abandonment, work disruption, shame, or bypass learning;
- configuration can increase ownership only when users understand the consequence of each choice at the moment they choose it;
- examples and imported rulesets can create anchoring effects, so "sample plan" settings may be copied as authority even when labeled as examples;
- reversible UI cleanup can tolerate broader defaults than irreversible lock or block behavior because the cost of misfit is lower;
- plan-specific defaults may generalize better than global defaults because intention differs by time, domain, device, and task;
- local validation can identify personal misfit through later relaxation, repeated continue actions, disabled rules, or abandoned prompts without storing raw content.

## Novelty Proof Obligations

- Classify at least twelve DaD behaviors as candidate default, preset, example-only, plan-scoped, opt-in, advanced, or personal-only.
- For each classification, state the evidence needed to move the behavior to a stricter or more general category.
- Separate low-risk reversible defaults from high-stakes enforcement defaults and define different proof standards for each.
- Identify at least eight personalization moderators, such as work role, task type, time of day, vulnerability state, privacy sensitivity, accessibility needs, household/device sharing, culture/language, and tolerance for interruption.
- Compare configuration flows: upfront setup, progressive disclosure, plan templates, sample import, recommendation after local evidence, and advanced manual editing.
- Define local validation signals that indicate misfit, including repeated overrides, rule relaxation after lock expiry, prompt abandonment, emergency escape use, disabled presets, support confusion, and blocked-work complaints.
- Specify what DaD must never infer automatically about a user, even if it would make personalization easier.
- Determine whether defaults should differ between first install, upgraded install, imported ruleset, and developer/power-user mode.
- Include a method for documenting why a default exists so future changes do not silently re-personalize the product around one user's current state.

## Product Decisions This Could Change

- Whether new installs should start with a blank plan, a guided setup, conservative starter presets, or a disabled sample plan.
- Which intent coherence thresholds should ship as defaults and which should remain plan-specific.
- Whether focus states should be surfaced in onboarding or remain an advanced strictness control.
- Whether structural keywords such as feeds, recommendations, shorts, comments, and media should have suggested scores by default.
- Whether Pomodoro should default to off, on in selected starter plans, or enabled only after user choice.
- Whether strict breaks, idle rest credit, and locked schedules require separate confirmation.
- Whether UI cleanup presets should be recommended broadly or only after the user selects a page element/context.
- Whether imported/shared rulesets should be labeled as examples, templates, or trusted presets.
- Whether local diagnostics should show "this setting may not fit you" signals when repeated misfit appears.
- Whether the release checklist needs a default-classification table before each version.

## Privacy Risks

Personalization can become privacy-invasive if DaD tries to infer user traits, diagnoses, relationships, or vulnerabilities from browsing behavior. The research should keep personalization local, explicit, and inspectable.

Avoid:

- inferring clinical conditions, addiction, sexuality, politics, religion, finances, relationships, work status, or identity from browsing patterns;
- storing raw page text, typed input, full URLs, page titles, screenshots, selectors, messages, captions, transcripts, or media content;
- remote user profiles, cloud segmentation, telemetry-based defaults, or cross-device behavioral modeling;
- hidden scores about vulnerability, discipline, reliability, or self-control;
- labels that make personal configurations sound like objective user types;
- importing rulesets that silently overwrite local privacy boundaries or protected-schedule safeguards.

Acceptable personalization should use:

- explicit user choices;
- plan-scoped settings;
- local aggregate outcomes;
- reversible presets;
- retention-limited diagnostics;
- reset/export/delete controls;
- visible explanations of what changed and why.

## Autonomy Risks

The autonomy problem is not only too much enforcement. It is also misfit disguised as help.

The research should guard against:

- making the original creator's needs the hidden normative model;
- giving new users a strict configuration they do not understand;
- creating choice overload that prevents protection from being configured at all;
- using local validation to nag instead of support reflection;
- making vulnerable users feel that they failed if a default does not fit;
- making public or shared rulesets socially authoritative;
- relaxing protection automatically because a user struggled during a vulnerable state;
- tightening protection automatically without a clear precommitment path;
- hiding the difference between examples, recommendations, and active enforcement.

DaD should help users build their own defense contract, not silently decide what kind of user they are.

## Possible Outcomes

If evidence is strong:

- Create a default-classification table for core DaD behaviors.
- Use guided setup or plan templates where evidence supports user-authored configuration over universal defaults.
- Add local misfit indicators that suggest reviewing a setting without collecting sensitive content.
- Define separate standards for reversible UI defaults, prompt defaults, and hard enforcement defaults.

If evidence is mixed:

- Keep defaults conservative and local-first.
- Favor blank or lightly guided plans over strong universal presets.
- Treat strict features as opt-in or plan-scoped until local validation supports broader use.
- Present sample configurations as examples, not recommendations.

If evidence is weak or negative:

- Avoid adding broad default strictness for heterogeneous users.
- Keep DaD primarily configurable and personal.
- Require explicit user choice for locked schedules, strict breaks, focus-state strictness, and high-severity intent interventions.
- Revisit after more local validation data exists and after RQ-014 clarifies public explanation risks.
