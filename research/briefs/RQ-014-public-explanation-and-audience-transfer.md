# Research Question Brief

## Question ID

`RQ-014`

## Working Title

Public explanation and audience transfer.

## Exact Question

How should DaD be explained publicly when it began as a personal nervous-system exoskeleton, may later reach users with different needs, and depends on scientific concepts that can easily be flattened, overgeneralized, moralized, or mistaken for clinical authority?

## Why DaD Needs This

DaD is not a single blocking tactic. It is a defense system combining schedules, locks, Pomodoro, intent coherence, UI cleanup, page blocking, diagnostics, and local validation. That makes public explanation unusually risky: a short video, store listing, or social post can make the system sound more universal, more clinical, more certain, or more adversarial than the product actually is.

The useful research question is not "avoid wild claims." That is obvious. The useful question is how audiences interpret first-person tool narratives, creator self-disclosure, scientific language, strictness, autonomy, and public screenshots when a private coping infrastructure becomes downloadable software.

## Affected Features

- Chrome Web Store listing, screenshots, promotional images, and release notes.
- README, About, instruction guide, privacy/store justification documents, and public website copy.
- YouTube/video explanation structure, examples, terminology, and caveat placement.
- Onboarding and first-run framing for users who are not the original creator.
- Presets, default plans, and whether examples are labeled as personal examples or recommended defaults.
- Intent coherence terms such as drift, coherence, return, isolate, focus state, vulnerable state, and graph.
- Research pipeline outputs that may later be quoted publicly.
- Support expectations if a public explanation causes a sudden user spike.

## Scope

Included:

- Science communication, risk communication, uncertainty communication, and public understanding of behavioral science.
- First-person self-experimentation narratives and how audiences infer generalizability from them.
- Creator/audience trust, parasocial interpretation, testimonial effects, and perceived authority in software demos.
- Health-adjacent and self-regulation technology communication without medical positioning.
- Digital wellbeing framing: empowerment, defense, self-control, vulnerability, compulsion, habits, attention, and autonomy.
- Adoption at small scale versus sudden public scale: expectation management, support load, safety disclaimers, and fit for heterogeneous users.
- How examples, screenshots, scores, graphs, and labels change perceived certainty.
- Communication around local-first privacy, data minimization, and no-cloud design.

Excluded:

- Writing final public copy, scripts, thumbnails, or store text; this question should produce constraints and structure first.
- Generic lists of forbidden claims unless a specific claim is tempting, commonly misunderstood, or tied to a product feature.
- Clinical guidance, therapy advice, diagnosis, treatment claims, or medical-device positioning.
- Growth strategy, SEO, influencer marketing, pricing, or community moderation.
- Research on which defaults generalize to other users; that belongs to `RQ-015`.
- Research on whether individual interventions work; those belong to the feature-specific research questions.

## Evidence Needed

- Science communication studies on uncertainty, caveat placement, mechanism explanations, and audience comprehension.
- Risk communication research on how people interpret uncertainty, disclaimers, warnings, frequencies, examples, and confidence.
- HCI and digital wellbeing work on user trust, perceived agency, paternalism, coercion, self-control tools, and technology abandonment.
- Research on testimonials, self-disclosure, lived-experience narratives, and how audiences infer "this worked for me" versus "this should work for you."
- Studies of parasocial trust, creator credibility, and software adoption from video or social-media explanation.
- Behavioral science communication examples where mechanism language, neuroscience language, or statistics change perceived authority.
- Stigma and shame research relevant to public framing of distraction, compulsion, relapse, executive dysfunction, and self-control.
- Literature on expectation management in personal informatics, quantified-self tools, and digital health-adjacent products.
- Evidence about sudden user-scale effects for configurable tools: defaults, support burden, misconfiguration, misfit, and abandonment.

## Novelty Target

The useful answer should not say "be honest," "do not overclaim," or "say it may not work for everyone." It should identify non-obvious communication mechanics that change DaD's public explanation and product surface.

Examples of valuable findings:

- caveats placed after a vivid personal success story may be ignored or reinterpreted as legal boilerplate, while caveats embedded in the example may change perceived generalizability;
- a first-person "this is my nervous-system exoskeleton" narrative can increase trust and specificity but can also make users copy personal defaults without checking fit;
- mechanistic neuroscience language may increase perceived scientific authority even when it does not improve comprehension or behavioral calibration;
- scores, graphs, and screenshots can make bounded heuristics feel like objective measurement unless the uncertainty is visible at the point of interpretation;
- "defense" framing may reduce shame for some users but can create adversarial expectations if it sounds like the system fights the user rather than the user's precommitted threat model;
- public examples can become de facto defaults because users import the narrative, not just the settings;
- explanation aimed at vulnerable users may need a different structure than explanation aimed at reviewers, developers, or casual productivity users.

## Novelty Proof Obligations

- Distinguish at least five audience groups: the original creator, similar self-regulation users, casual productivity users, technically skeptical users, clinically vulnerable users, and reviewers/store moderators.
- Compare at least five explanation formats: store listing, README, onboarding, long video, short social clip, screenshot caption, and in-product diagnostic text.
- Identify how each format changes perceived authority, generalizability, privacy expectation, and support expectation.
- Specify where caveats belong structurally: before examples, inside examples, after examples, beside scores/graphs, or in linked docs.
- Test the phrase "nervous-system exoskeleton" as a framing hypothesis: what it clarifies, what it risks, and when a plainer product description is safer.
- Separate claims about product behavior, scientific mechanisms, personal experience, intended users, and evidence status.
- Define a public explanation template that preserves nuance without turning the message into defensive disclaimers.
- Identify which research findings are safe to quote publicly and which should remain internal design guidance.
- Name local validation or feedback signals that would show the public explanation is causing misfit, overtrust, shame, or support overload.

## Product Decisions This Could Change

- Whether the store listing leads with "defense system," "browser protection," "self-control infrastructure," or another frame.
- Whether public materials use "nervous-system exoskeleton" prominently, as a personal-origin phrase, or only in long-form explanation.
- Whether screenshots of scores, graphs, prompts, and blocked pages need visible uncertainty/context labels.
- Whether onboarding asks users to configure their own threat model before showing strong preset examples.
- Whether research answers get public summaries separate from internal implementation notes.
- Whether default plans and screenshots should avoid looking like universal recommendations.
- Whether release notes and docs need a "personal-origin, configurable-by-design" section.
- Whether a public launch should include support boundaries, issue templates, or a "not for everyone" fit checklist.

## Privacy Risks

Public explanation can accidentally expose more privacy risk than the extension itself. The research should consider:

- screenshots revealing personal hosts, keywords, plans, notes, usage stats, or drift graphs;
- video demos that show real browsing context or personal vulnerability;
- public examples that encourage users to share sensitive blocklists, diagnoses, compulsions, or private struggles;
- research summaries that make local diagnostics sound like hidden surveillance;
- support requests where users paste raw page text, URLs, screenshots, or personal context;
- community discussion that turns private self-regulation settings into public identity markers.

DaD's public explanation should reinforce local-first boundaries and should steer users toward redacted examples, exported rulesets without personal data, and bounded issue reports.

## Autonomy Risks

The public narrative can change how users relate to the extension. The research should guard against:

- users treating the creator's defaults as authority rather than one configuration;
- shame if a user's needs differ from the demo;
- overtrust in scores, graphs, or "scientific" language;
- adversarial framing where the user feels policed by a tool they installed;
- social pressure to install a strict tool because the public story is compelling;
- vulnerable users using the extension as a substitute for support they actually need;
- reviewers misunderstanding strong local locks as hostile rather than precommitted;
- the creator feeling forced to defend every edge case publicly before the product is ready for that scale.

DaD should be explained as configurable defense chosen by the user, not as an external judge of attention or character.

## Possible Outcomes

If evidence is strong:

- Define a public explanation architecture for store copy, README, onboarding, and long-form video.
- Create a checklist for screenshots, examples, score displays, graph captions, and personal-origin statements.
- Add support-boundary and privacy-redaction guidance before any larger public launch.
- Split internal research language from public-facing language when the mechanism is useful for design but too easy to misread.

If evidence is mixed:

- Keep public explanation conservative and concrete: what the extension does locally, how users configure it, and what problems it is designed around.
- Use personal-origin framing carefully, but avoid making it the only explanation users receive.
- Prefer examples that show configuration choices over claims about universal outcomes.

If evidence is weak or negative:

- Avoid public claims that rely on behavioral-science interpretation.
- Keep the Chrome Web Store listing focused on observable extension behavior.
- Treat YouTube or social explanation as a controlled disclosure project rather than casual marketing.
- Revisit after RQ-015 clarifies what generalizes beyond the original user's needs.
