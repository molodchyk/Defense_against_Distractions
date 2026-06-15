# Research Synthesis

## Question

`RQ-002`: Does evidence around attention residue, task switching, and media multitasking support Return, Isolate, and graph-based drift recovery?

## Short Answer

The evidence supports DaD's intent-coherence model as a plausible, research-informed design direction: browsing can be treated as a goal-linked trajectory, and abrupt shifts, unfinished prior goals, rapid switching, interruptions, and passive media pressure can plausibly make recovery harder. Return is the most directly supported recovery action because attention-residue and interruption research show that concrete resumption cues and ready-to-resume planning can help people disengage and return to a prior task.

Isolate is also defensible, but the evidence is more indirect. It should be framed as declaring a legitimate new branch, not as an excuse or bypass. If the current page is intentional, isolating it creates a new local baseline so the old origin stops contaminating the new task and the new task stops pretending to belong to the old chain.

Show graph is supported as cognitive offloading and external representation, not as proven therapy. It makes an invisible browsing trajectory visible so the user can inspect origin, first drift, last coherent page, and current page. Continue with a reason is a lightweight intentionality check; it is plausible, but the deeper prompt-wording evidence belongs to `RQ-009`.

## Evidence Summary

| Evidence | Grade | Relevance | Caveat |
| --- | --- | --- | --- |
| Leroy (2009) attention residue experiments. | moderate / strong | Supports unfinished prior tasks contaminating later tasks. | Work-task lab context, not browser chains. |
| Leroy & Glomb (2018) ready-to-resume intervention. | strong / moderate for DaD | Supports concrete return planning and resumption cues. | DaD prompt itself is not directly tested. |
| Leroy, Schmidt, & Madjar (2020) review of interruptions and task transitions. | strong / moderate for DaD | Supports goal-system framing for transitions. | Organizational context. |
| Altmann & Trafton (2002) memory-for-goals model. | moderate | Supports concrete cues for goal resumption. | Cognitive model, not direct product evidence. |
| Monsell (2003) task-switching review. | strong / moderate for DaD | Supports switching costs and residual task-set activation. | Simple lab tasks do not equal web browsing. |
| Mark, Gudith, & Klocke (2008) interruption study. | moderate | Warns that interruptions can increase stress and effort. | DaD interventions can also interrupt. |
| Ophir, Nass, & Wagner (2009) media multitasking study. | moderate for association, weak for causality | Supports media multitasking as possible drift pressure. | Correlational; not diagnostic. |
| Uncapher & Wagner (2018) media multitasking review. | moderate | Provides cautious interpretation of media-multitasking evidence. | Causality and mechanisms unresolved. |
| Risko & Gilbert (2016) cognitive offloading review. | strong / moderate for graph | Supports externalizing cognitive state with tools. | Not specific to browsing graphs. |
| Zhang & Norman (1994) external representation framework. | moderate | Supports graph as external representation. | Indirect for digital wellbeing. |
| Biedermann, Schneider, & Drachsler (2021) digital self-control systematic review. | moderate | Connects blocking, visual feedback, and media multitasking interventions. | Does not validate DaD's exact graph. |

## What The Evidence Supports

- Intent coherence should be framed as trajectory and goal-system modeling, not as "bad site" detection.
- Return should remain a primary recovery action because concrete resumption targets are evidence-aligned.
- Last coherent page and first drift point are meaningful concepts: they act as resumption and diagnosis cues.
- Isolate is justified when the user intentionally changes task; it should create a new baseline rather than globally trusting a site.
- Show graph is justified as cognitive offloading: it makes the chain inspectable.
- Media, tab switching, navigation loops, and passive recommender pressure are plausible modifiers, especially when combined.
- Prompting can help only if proportional; over-prompting can itself become an interruption cost.

## What Remains Uncertain

- Whether DaD's current coherence score accurately detects meaningful drift.
- Whether users understand Isolate as "new intentional branch" rather than "continue anyway."
- Whether Show graph changes behavior or mostly helps debugging.
- How much reason-to-continue text is useful before it becomes performative.
- Whether Return should always go to last coherent page or sometimes to origin/hub.
- How to distinguish productive exploratory research from objective amnesia.

## DaD Design Implications

1. Keep the four-action model:

   - `Continue`: user asserts current page is intentional enough to continue.
   - `Isolate`: user declares this page should become a new local chain/baseline.
   - `Return`: user returns to the last coherent target.
   - `Show graph`: user externalizes and inspects the trajectory.

2. Improve action wording over time:

   - Continue: "Continue with this page."
   - Isolate: "Start a new chain here."
   - Return: "Return to last coherent page."
   - Show graph: "Inspect chain."

3. Keep Return immediately available:

   Return has the strongest research fit because it gives a concrete resumption cue and route.

4. Keep Isolate distinct from Continue:

   Continue says "this page belongs enough to the current trajectory."

   Isolate says "this page is intentional, but it is a different trajectory."

5. Treat graph as diagnostic and metacognitive:

   The graph should explain, not punish. It should show enough structure to support recovery without becoming raw history surveillance.

6. Keep proportional intervention:

   Since prompts are interruptions, weak evidence should produce low-friction diagnostics, not modal blocks.

## Scoring Implications

Core signal candidates:

- Current page similarity to session origin.
- Current page similarity to last coherent page.
- First drift point after a coherent origin.
- Tab opener lineage and drift-descendant status.
- Abrupt transition from high-origin to low-origin page.
- Recommender/feed click after prior drift pressure.
- Repeated return to drift descendants during locked or protected work.

Modifier candidates:

- Rapid tab switching.
- A/B tab loops.
- Same-page reload/revisit loops.
- Long passive active time after origin decay.
- Visible media playback in a low-coherence chain.
- Open-tab/window pressure.
- Search-query divergence.
- Low-agency interaction ratio.

Diagnostic-only candidates:

- Media multitasking classification.
- Graph complexity.
- Raw count of chain nodes.
- Open-tab count by itself.
- Time on page by itself.

Avoid:

- Claims that DaD measures attention residue directly.
- Claims that media multitasking proves cognitive impairment.
- Treating all exploration as drift.
- Using raw page text or raw typed input to reconstruct intent.
- Hard blocking from a single weak signal.

## Intervention Implications

| Intervention | Evidence Fit | Appropriate Severity | Risk | Guidance |
| --- | --- | --- | --- | --- |
| Return | strongest | drift / intervene / locked | Wrong target if last coherent is misidentified. | Keep visible target and let user inspect graph. |
| Isolate | moderate, indirect | ambiguous drift, legitimate branch | Can become bypass if too cheap during hard lock. | Frame as new chain, not global trust. Cooldown if locked. |
| Continue with reason | moderate, indirect | prompt-level drift | Can become performative. | Keep short and local; do not shame. |
| Show graph | moderate, indirect | all prompt levels | Can overwhelm. | Keep compact, use redaction, pair with actions. |
| Grayscale/reduce-noise | plausible | watch/drift | False positives on legitimate pages. | Reversible, page-local. |
| Hard quarantine | weakest direct support; strongest when combined with precommitment | locked or drift-descendant block policy | Hostile if used too broadly. | Reserve for locked/protected policy with Return available. |

## Privacy Implications

Safe local data:

- local chain ids;
- origin host/page label;
- last coherent host/page label;
- first drift host/page label;
- transition type;
- bounded similarity scores;
- derived token summaries;
- aggregate tab switching counts;
- aggregate media/feed/recommender counts;
- local user feedback such as isolate/return/continue outcome.

Risky data:

- full URLs by default;
- raw page titles;
- raw page text;
- raw clicked text;
- raw selected text;
- typed reason text retained indefinitely;
- cross-device browsing trajectory.

Data to avoid by default:

- psychological state labels;
- clinical inference;
- long-term personality or cognitive ability profiles;
- cloud-uploaded trajectory graphs.

## Autonomy And Reactance Implications

Intent coherence should stay humble. The system estimates drift; it does not know the user's mind.

Good UI framing:

- "This browsing chain appears to have drifted."
- "Last coherent: [target]."
- "Current: [target]."
- "Return, start a new chain, continue, or inspect."

Bad UI framing:

- "You are distracted."
- "You failed."
- "This is objectively useless."
- "DaD knows your real intent."

Continue and Isolate preserve autonomy. Return preserves protection. Show graph preserves explainability.

## Safe Claims

- DaD models browsing as a local trajectory rather than judging only the current site.
- Research on attention residue and task transitions supports the idea that unfinished shifts can make it harder to stay coherent.
- DaD offers recovery actions such as returning to the last coherent page or starting a new local chain.
- DaD uses local signals such as tab lineage, transition type, similarity, switching, and passive media pressure to estimate drift.
- DaD's graph makes the browsing chain visible for local inspection.

## Forbidden Overclaims

- "DaD measures attention residue."
- "DaD knows your true intention."
- "Media multitasking causes permanent attention damage."
- "Every low-similarity page is distraction."
- "The graph proves the page is bad."
- "Isolate makes a site safe."
- "Continue means the system was wrong."
- "Intent coherence is a clinical mental-state detector."

## Implementation Handoff

Affected files or docs:

- `docs/dad_intent_coherence_system.md`
- `docs/protection-model.md`
- intent prompt copy
- intent graph UI
- intent intervention tests
- local diagnostics export text

Minimum viable future changes:

- Rename or explain Isolate as "Start new chain here" where space allows.
- Ensure Return target is always visibly identified before action.
- Add graph copy that frames it as local trajectory inspection, not proof.
- Track local outcomes of Continue, Isolate, Return, and Show graph without raw content.
- Add a short post-action diagnostic: "Returned to last coherent page" or "Started new chain here."

Tests needed:

- Return target is shown when known.
- Isolate creates a new chain/baseline without globally trusting a domain.
- Continue reason remains local and bounded.
- Show graph does not require raw page text.
- Prompt copy avoids certainty and shame language.
- Weak single signals do not trigger hard quarantine.

Rollout risk:

- If Return points to a poor target, users will stop trusting intent coherence.
- If Isolate feels like a bypass, it weakens locked protection.
- If Continue feels moralized, it becomes shame friction.
- If Show graph exposes too much detail, it becomes privacy-sensitive.
- If prompts fire too often, DaD becomes another interruption source.

## Open Questions

- Should Isolate be renamed in the UI?
- Should Show graph be available from every intervention, including warning-only?
- Should Return choose origin, hub, or last coherent based on chain shape?
- Should Continue ask for a reason only at `intervene` and above?
- Should graph views use host labels only by default?
- How should local feedback tune false-positive drift prompts?

## Current Answer Status

Initial answer complete. Strongest support: Return and ready-to-resume style recovery. Moderate support: graph as cognitive offloading. Indirect support: Isolate as new trajectory declaration. Media multitasking remains a modifier, not a hard proof.
