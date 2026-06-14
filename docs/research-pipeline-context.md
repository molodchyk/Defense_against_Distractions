# DaD Scientific Research Pipeline Context

This document is a handoff prompt for ChatGPT Research. It is not the final research guideline. Its purpose is to give a research agent enough context to produce a comprehensive, evidence-grounded research guideline that Codex can later use when designing and implementing Defense against Distractions.

## Prompt To Paste Into ChatGPT Research

You are preparing a comprehensive scientific research guideline for a browser extension called Defense against Distractions, abbreviated DaD.

The goal is not to produce marketing copy. The goal is to build a rigorous research foundation for product decisions, scoring models, intervention design, privacy limits, and public claims. Use peer-reviewed papers, systematic reviews, meta-analyses, primary sources, and reputable academic sources. Avoid pop-science overclaims. Clearly separate strong evidence, plausible but uncertain mechanisms, weak evidence, and open research questions.

## Product Context

Defense against Distractions is a Chrome extension that helps a user defend their attention while browsing. It began as a website and keyword blocker, but the intended direction is broader: a layered local defense system for staying coherent under browser pressure.

The product should not be understood as a single weapon or one tactic. It is a defense system. It combines blocking, schedules, Pomodoro rhythm, UI cleanup, usage diagnostics, and intent coherence into a browser-level protective layer.

The extension is built primarily from the reference point of one user's nervous system. It may later help other users, but its defaults should not be treated as universally correct. Research should help identify which mechanisms generalize, which are personal, and what must remain configurable.

The system should be strong enough to protect a user during vulnerable or low-lucidity states, but it must not become hostile, shame-based, medically overclaiming, or autonomy-destroying.

## Existing And Intended Feature Areas

DaD includes or is moving toward:

- Website and keyword blocking.
- Plan-based protection rules.
- Locked schedules where the user should be able to make protection stricter but not more relaxed during the locked period.
- Pomodoro work/rest rhythm attached to plans.
- Strict breaks and rest accounting using idle time.
- Blocked-page diagnostics explaining what triggered the block.
- Local usage statistics and diagnostics.
- UI element blocking and UI cleanup, such as hiding distracting controls, feeds, comments, recommendations, or site UI elements.
- A UI picker for selecting page elements to hide.
- Intent coherence: a local trajectory system that detects when browsing loses coherence with the originating intention.
- Proportional interventions such as warn, grayscale, hide feeds/comments, return prompt, modal intervention, hard quarantine, or block.
- Local-first storage and privacy-preserving derived signals.
- Internationalization and right-to-left interface support.

## Core Product Philosophy

DaD should not merely ask, "Is this website bad?"

A deeper question is:

> Has the user's behavior stopped being governed by a stable objective?

The intent coherence concept reframes distraction as objective amnesia, trajectory decay, or loss of control hierarchy. A browsing session can become destructive even when each individual click is locally plausible.

Example trajectory:

```text
search -> result -> side result -> video -> recommendation -> comments -> another video -> Reddit -> search -> tabs -> drift
```

The user may not consciously choose the final state. The final state emerges from a sequence of locally defensible transitions.

DaD should therefore study browsing as a trajectory, not only as a destination.

## Original Research Wording From The Product Notes

The original product notes asked to:

- consult research on unhealthy internet usage and mechanisms of it, potential interventions, dopaminergic lock in, failure points, signs, and context (text, audio, algorithms, video) that is most triggering of this. Context: software to defend / prevent it proactively.
- detect / predict when the user lies / most destructive and when the user is truthful / most constructive and when we can trust them to change the configuration / problematic usage detection and combating it.
- create the doc with research questions and questions on what research is needed and what behavior is likely / doc with research.
- instead of only blocking, be able to perform different actions: remove some UI element, click or fill in something, stop audio / video from playing.
- research time in seconds as an additive or multiplier score signal; some websites or contexts should likely trigger immediately; research what gives off their dopaminergic quality and what could be used as signals.
- collect crucial data to improve the product.
- consider mental state score.
- use amount of tabs open.
- listen to input: scroll, scroll speed, amount of media presented and changed through, clicks and typing, longevity of sessions, machine learning on text and text recognition.
- use amount of links on the website to contribute to score.
- establish research pipeline.

Please translate this rough product wording into precise research questions, evidence categories, design principles, and safe implementation constraints.

## Current Local-First Privacy Direction

Research must respect this product constraint:

The default direction should be local-first. DaD should prefer derived stats and local processing. It should not store raw typed input, raw page text, full URLs, page titles, media URLs, raw selectors, raw field labels, or personal text samples unless a future research mode has explicit user consent and a strong reason.

Current local diagnostics can include bounded aggregate or derived values such as:

- Hostname-level usage aggregates.
- Visits, dwell time, and active visible time.
- Page word counts and text length.
- Counts of images, video, audio, GIFs, links, buttons, inputs, forms, feed-like areas, recommendations, comments, and short-form media regions.
- Open tab and window counts.
- Scroll, click, key, and input counts.
- Scroll distance, scroll reversals, and interaction rates.
- Visible audio/video playback duration and play/pause/end counts.
- Aggregate recommendation/feed click counts.
- Bounded local topic tokens for similarity, not raw page text.
- Intent trajectory state, origin similarity, tab lineage, transition type, and local coherence diagnostics.

The research guideline should explicitly say which data categories are safe, risky, unnecessary, or unacceptable without explicit consent.

## Research Areas To Cover

Please research and synthesize evidence for these areas.

### 1. Digital Self-Control Tools

Study browser extensions, app blockers, timers, usage trackers, nudges, friction tools, lockout tools, and digital wellbeing interventions.

Questions:

- Which digital self-control interventions have evidence of effectiveness?
- Which interventions lose effectiveness over time?
- How do users bypass or habituate to them?
- What are common failure modes in blockers and digital wellbeing tools?
- How should a tool choose between soft friction and hard blocking?

Seed papers to investigate:

- Lyngs et al., "Self-Control in Cyberspace: Applying Dual Systems Theory to a Review of Digital Self-Control Tools."
- Biedermann, Schneider, and Drachsler, "Digital self-control interventions for distracting media multitasking: A systematic review."

### 2. Situation Modification Instead Of Willpower

DaD assumes that self-control is often environmental, not heroic resistance. It should help the user avoid high-risk contexts before impulses peak.

Questions:

- What evidence supports situation selection, situation modification, and temptation avoidance?
- Are proactive strategies more effective than inhibition after temptation is already present?
- How should this shape UI hiding, feed blocking, recommendation suppression, schedule locks, and website blocking?

Seed papers to investigate:

- Duckworth et al., "Situational Strategies for Self-Control."
- Ent, Baumeister, and Tice, "Trait self-control and the avoidance of temptation."

### 3. Commitment Devices And Locked Schedules

DaD has locked schedules. During a locked schedule, users should be able to make plans stricter but not more relaxed. Enabling Pomodoro during a lock may be allowed because it can make protection stricter.

Questions:

- What does research say about commitment devices, precommitment, self-binding, hard commitments, soft commitments, and deadlines?
- When do commitment devices help?
- When do they backfire?
- What distinguishes protective self-binding from coercive restriction?
- What kinds of escape valves, delays, or accountability mechanisms preserve autonomy?

Seed papers to investigate:

- Bryan, Karlan, and Nelson, "Commitment Devices."
- Ariely and Wertenbroch, "Procrastination, Deadlines, and Performance: Self-Control by Precommitment."

### 4. Implementation Intentions And Recovery Prompts

DaD uses prompts such as "Reason to continue" and interventions such as Continue, Isolate, Return, and Show graph.

Questions:

- What evidence supports if-then plans and implementation intentions?
- Can brief reflection prompts restore intentionality?
- When do prompts become annoying, performative, or easy to bypass?
- How should prompts be worded to avoid shame and preserve agency?

Seed paper:

- Gollwitzer and Sheeran, "Implementation Intentions and Goal Achievement: A Meta-analysis of Effects and Processes."

### 5. Attention Residue, Task Switching, And Fragmentation

DaD treats tab switching, open-tab pressure, rapid navigation loops, and drift chains as possible risk signals.

Questions:

- What is known about attention residue after task switching?
- What is known about media multitasking and cognitive control?
- What is causal, what is correlational, and what should not be overclaimed?
- How can this evidence guide features like Return, Isolate, tab pressure diagnostics, and graph views?

Seed papers:

- Leroy, "Why is it so hard to do my work? The challenge of attention residue when switching between work tasks."
- Ophir, Nass, and Wagner, "Cognitive control in media multitaskers."

### 6. Problematic Internet Use, Compulsive Loops, And Reinforcement

The original notes mention unhealthy internet usage, dopaminergic lock-in, algorithms, video, audio, text, feeds, and triggering contexts. The research guideline should treat "dopamine" carefully and scientifically, not as pop-neuroscience.

Questions:

- What mechanisms are supported for problematic internet use, problematic smartphone use, compulsive browsing, pornography use, gaming, social media, infinite scroll, recommendations, autoplay, and variable rewards?
- Which design patterns are associated with compulsive or extended use?
- Which contexts produce high risk: short video, adult content, comments, feeds, search loops, shopping, news, social validation, notifications, or algorithmic recommendations?
- What evidence exists for persistent risk state after exposure?
- What is the difference between addiction, compulsion, habit, procrastination, avoidance, dissociation, and ordinary leisure?

Output should avoid diagnosing users. Use terms like "problematic use", "high-risk loop", "compulsive pattern", or "vulnerable state" unless clinical evidence is directly relevant.

### 7. Mental State, Vulnerability, And User Truthfulness

The original wording asks whether the system can detect when the user is truthful or lying, destructive or constructive, and when configuration changes should be trusted.

Reframe this carefully. The product should not claim to read minds or detect lies. It can estimate state risk from behavior and context.

Questions:

- Which behavioral signals might correlate with reduced self-regulation, fatigue, low agency, or compulsive use?
- Which signals are too speculative or invasive?
- How should a system distinguish deliberate exploration from drift?
- How should it treat user override requests during high-risk states?
- What language should replace "lying detection" to avoid hostile design?

Potential safer language:

- Low-lucidity state.
- High-risk state.
- Configuration safety.
- Override reliability.
- Future-self protection.
- Intent consistency.

### 8. Autonomy, Reactance, And Ethical Defensive Design

Strong defenses can trigger resistance. Research must cover psychological reactance, autonomy support, shame, paternalism, coercion, and user consent.

Questions:

- When do restrictions create reactance?
- What UI patterns preserve autonomy while still allowing strong protection?
- How should "Continue" work when the user is not lucid but wants to continue?
- When is enforcement justified because the user precommitted?
- What should always remain user-accessible?
- What should be delayed rather than forbidden?
- How can DaD be strong without becoming hostile?

Seed area:

- Psychological reactance theory, including reviews and HCI applications.

### 9. Proportional Intervention Design

DaD should have a ladder of interventions rather than only block/allow.

Potential intervention levels:

- Do nothing.
- Explain diagnostics.
- Show subtle warning.
- Add friction.
- Ask for reason to continue.
- Hide recommendations, feeds, comments, or distracting UI.
- Stop media or prevent autoplay.
- Grayscale or desaturate.
- Return prompt.
- Isolate current page from the drift chain.
- Delay changes to relaxed settings.
- Hard block.
- Quarantine drift descendants.
- Auto-return after cooldown.

Questions:

- Which interventions fit which severity levels?
- What evidence supports friction, hiding cues, interruption, blocking, commitment, or reflection?
- How should the system avoid excessive interruption?
- How should it avoid making the user feel punished?

### 10. Scoring Model And Signals

DaD needs research-informed scoring without pretending the score is clinical truth.

Signals to evaluate:

- Host/domain category.
- Keyword/content match.
- Time on page.
- Active visible time.
- Idle time.
- Open tab count.
- Tab switching velocity.
- Navigation loops.
- Search query drift.
- Origin similarity.
- Local topic similarity.
- Recommendation/feed clicks.
- Scroll velocity.
- Scroll reversals.
- Media count and playback time.
- Audio/video/GIF presence.
- Comment/feed/recommendation region counts.
- Link density.
- Input/key activity.
- Editable-field focus duration.
- Low agency ratio.
- Long passive session.
- Recent blocked outcomes.

Questions:

- Which signals have evidence?
- Which are plausible but need local validation?
- Which should only be used as weak modifiers?
- Which are too noisy or ethically risky?
- How should signals combine without overfitting or becoming punitive?

### 11. Pomodoro, Breaks, Idle Time, And Recovery

DaD includes plan-owned Pomodoro. Idle time can count toward rest if the user is away during a work/rest cycle.

Questions:

- What evidence exists for Pomodoro-like work/rest cycles?
- What evidence exists for breaks, microbreaks, rest timing, fatigue recovery, and idle time?
- Should rest be strict, advisory, or context-dependent?
- How should a defensive browser tool account for time away from the browser?
- When can a timer become oppressive or counterproductive?

### 12. Public Communication And Claims

The creator may later explain the product publicly, for example on YouTube. Research should help avoid wild claims.

Questions:

- What claims can be made safely?
- What claims require caveats?
- What should not be claimed?
- How should the product describe itself without sounding medical, conspiratorial, anti-internet, or universally prescriptive?

Suggested safe framing:

> Defense against Distractions is an opinionated, local-first browser defense system for people who need stronger structure than a simple website blocker. It combines blocking, schedules, UI cleanup, timers, and local intent-coherence signals to help browsing stay aligned with a chosen plan.

## Desired Output From ChatGPT Research

Produce a comprehensive research guideline that Codex can use later. It should include:

1. Executive summary of the scientific basis for DaD.
2. Evidence map by research area.
3. Annotated bibliography with links, DOI where available, and evidence strength.
4. A claims table:
   - claim DaD may make
   - evidence supporting it
   - caveats
   - forbidden overclaim
5. A signal table:
   - signal
   - evidence or rationale
   - likely usefulness
   - false-positive risk
   - privacy risk
   - recommended weight: core / modifier / diagnostic-only / avoid
6. An intervention table:
   - intervention
   - mechanism
   - evidence
   - appropriate severity level
   - risks
   - UI wording guidance
7. A locked-schedule and commitment-device policy section.
8. An intent-coherence research section explaining trajectory decay, objective amnesia, attention residue, and proportional recovery.
9. A privacy and ethics section with local-first constraints.
10. A public-communication section for safe YouTube/store listing language.
11. Open questions and local validation plan.
12. Practical implementation recommendations for the next DaD versions.

## Evidence Standards

Use this evidence grading:

- Strong: meta-analysis, systematic review, replicated primary findings, or well-established theory with direct relevance.
- Moderate: credible primary studies or converging evidence, but limited direct browser-extension relevance.
- Weak: plausible mechanism, adjacent domain, small studies, or early HCI work.
- Speculative: useful hypothesis but insufficient evidence; should be tested locally and not used for strong claims.

For every recommendation, state the evidence grade.

## Important Limits

Do not frame DaD as a medical treatment.

Do not claim that the extension diagnoses addiction, ADHD, depression, anxiety, executive dysfunction, or any clinical condition.

Do not claim that "dopamine" explains everything. If dopamine/reward circuitry is discussed, explain the mechanism carefully and state limits.

Do not assume all users need the same strictness. DaD is built from one person's nervous-system needs first, and research should help identify what generalizes.

Do not recommend cloud processing, raw text collection, or invasive monitoring unless the recommendation includes explicit consent, retention, minimization, and a strong reason.

Do not design shame into the system. The extension should protect, clarify, and redirect, not humiliate.

## Final Research Question

The central question is:

> How can a browser extension act as a strong, local-first defense against distraction and intent drift, using scientifically plausible signals and interventions, while preserving autonomy, privacy, humility, and user trust?
