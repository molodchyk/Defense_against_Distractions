# Research Synthesis

## Question

`RQ-002`: Does evidence around attention residue, task switching, interruptions, web foraging, media multitasking, and cognitive offloading support DaD's Continue, Isolate, Return, Return chain, and Show graph recovery actions?

## Short Answer

The strongest evidence does not support a vague "intent drift detector." It supports a sharper model: web work becomes dangerous when a user's original task becomes hard to reconstruct and resume. DaD's intent system should therefore estimate **trajectory recoverability**, not just semantic similarity.

Return has the strongest support because interruption and resumption research treats recovery as a memory and cueing problem. After alert-driven task suspension, one field study found people spent nearly 10 minutes on alert-triggered switches, then another 10 to 15 minutes before returning to focused work; 27 percent of suspensions took more than two hours to resume. The practical design lesson is severe: the cost is not only the click away from the task, but the delayed failure to come back.

Isolate is necessary because low similarity is not always drift. Information seeking often works by orienteering: people take local, situated steps through information sources even when they know what they are looking for. In one observational study, expert users used keyword search in only 39 percent of directed searches, relying instead on contextual navigation. DaD should treat some divergence as legitimate branching, not failure.

Show graph is not just explanatory decoration. Graphical and task-centric history tools show that external representations can materially improve return and re-finding. PadPrints users completed return-to-prior-page tasks in 61.2 percent of the time required by users of the same browser without it. But the graph must be action-paired: raw browser history is famously underused despite high revisitation.

The most important correction is media multitasking. Media/feed pressure is plausible as a modifier, but the evidence is too mixed and effect sizes too small to make it a primary signal. A 2021 meta-analysis found small associations in some cognitive-control categories, no associations for interference management or task management, and no causal conclusion. Media pressure should only matter when it converges with trajectory evidence.

## Non-Obvious Findings

| Finding | Source | Why It Is Non-Obvious | DaD Consequence |
| --- | --- | --- | --- |
| The expensive part of interruption is often the delayed return, not the interrupting task itself. Alert-driven suspensions averaged nearly 10 minutes of switching plus 10-15 more minutes before focused resumption; 27 percent exceeded two hours. | Iqbal & Horvitz 2007 | A small diversion can become a long chain without feeling like one at the moment. | DaD should detect and recover chains of diversion, not only individual bad pages. |
| Users often stabilize work before switching away. The field study observed state-stabilizing actions before responding to alerts. | Iqbal & Horvitz 2007 | People naturally create resumption cues before they leave. Drift is worse when the switch happens without this closure step. | Add "park current chain" or automatic local checkpoint metadata before/after prompt-level drift. |
| Interruption timing changes cost. Predicted low-workload breakpoints caused less resumption lag and annoyance than worse interruption moments. | Adamczyk & Bailey 2004; Iqbal & Bailey 2006/2008 | The same prompt can be helpful or harmful depending on when it lands. | DaD prompts should prefer navigation/load/boundary moments and avoid mid-action interruption when possible. |
| People may work faster under interruption, with no measured quality drop, but with more stress, frustration, time pressure, and effort. | Mark, Gudith, & Klocke 2008 | Productivity-looking metrics can hide strain. | DaD should not judge success only by "user returned quickly" or "task completed"; track prompt burden and repeated intervention load. |
| Visual visibility of suspended work predicted faster resumption. | Iqbal & Horvitz 2007 | The old task needs to remain cognitively findable. Hiding or closing it can worsen recovery. | Return chain should default to return/move/suspend, not destructive close. Recovery targets should stay visible. |
| Tabs are often reminders and fear-of-loss objects, not just clutter. Users keep them open because out of sight can feel gone. | Chang et al. 2021 | Tab overload is partly a broken memory system. Closing tabs can feel like erasing intentions. | Drift-tab cleanup must preserve task memory: move, suspend, group, or label before close. |
| Browser history is barely used despite massive revisitation. Older studies reported history-list access near 0.1-0.2 percent while revisits made up large shares of browsing. | Hightower et al. 1998; Morris et al. 2008 | "The data exists somewhere" is not the same as recoverability. | Show graph must be surfaced inside the recovery moment and paired with Return/Isolate actions. |
| Graphical history can materially improve revisitation. PadPrints users completed return-to-prior-page tasks in 61.2 percent of the baseline time. | Hightower et al. 1998 | A graph can be more than an explanation; it can be a navigation instrument. | Show graph should be compact, current-chain focused, and clickable/actionable. |
| Directed search often uses orienteering, not direct search. Expert users used keyword search in only 39 percent of directed searches. | Teevan et al. 2004 | Low semantic overlap can be an efficient way to approach a target through context. | Isolate/Mark coherent should be first-class; low similarity alone should not trigger hard intervention. |
| Search tasks are often multi-session and query/page context matters. SearchBar organized query history, browsing history, notes, and ratings because ordinary UIs treat task-level search as transient. | Morris et al. 2008 | The browser sees events; users experience investigations. | DaD chains should be task objects with origin, query, branch, and recovery metadata, not just page lists. |
| Media multitasking evidence is weaker than the popular narrative. Associations are small, heterogeneous, and not causal; task-management and interference-management links can be null. | Parry & le Roux 2021 | "Media-heavy" is not a reliable diagnosis of cognitive failure. | Media/feed should be a modifier only when combined with drift depth, origin decay, and passive interaction signals. |

## Mechanisms

### 1. Recoverability, Not Similarity Alone

Semantic similarity is only a proxy. A browsing chain is in trouble when the user loses the ability to cheaply answer: "What was I doing, where was the last useful place, and how do I resume?" This is why last coherent, first drift, and origin are product-critical fields.

DaD implication: score not only how different the current page is, but how expensive recovery has become: drift depth, time since last coherent page, number of descendant tabs, whether a visible return target exists, whether the chain moved through feed/recommender surfaces, and whether the user has already ignored earlier recovery opportunities.

### 2. Chain Of Diversion

The Iqbal and Horvitz field study explicitly describes costly chains after alert-based suspension. A user may not "choose distraction" once; they may follow several peripheral applications/pages before returning, if they return at all.

DaD implication: Return chain is conceptually stronger than single-page Return when several known descendant tabs share the same drift root. But destructive cleanup should remain explicit because tabs can be memory artifacts.

### 3. Cue Visibility And Goal Memory

Memory-for-goals and interruption research both point toward retrieval cues. The suspended goal must be made salient at the moment of recovery. A small hidden graph or vague prompt will not carry the mechanism.

DaD implication: the recovery target should be large enough to read before choosing Return. Show origin, last coherent, first drift, current page, and affected drift-tab count with host-level labels by default.

### 4. Boundary-Sensitive Intervention

DaD prompts are themselves interruptions. The same modal can be useful after a navigation boundary and costly in the middle of reading, writing, comparing, or deciding.

DaD implication: intent interventions should prefer browser boundaries: new page load, tab open, same-chain descendant creation, idle-after-load, media autoplay start, or feed scroll threshold. Where possible, avoid injecting hard choices during active input or high-engagement reading.

### 5. Orienteering And Legitimate Branching

Search is often local and contextual. People may not know the exact target name; they navigate through remembered sources, landmarks, partial cues, and trusted paths. A page can look semantically distant while still being part of a legitimate information path.

DaD implication: Isolate should mean "this is a new intentional branch," not "ignore the system." It creates a new local baseline without trusting the whole domain or relaxing locked settings.

### 6. Tabs As Prospective Memory

Open tabs often stand in for unresolved intentions. Closing them can remove the very cue needed to resume. This matters for DaD because a browsing defense that only closes tabs may accidentally destroy the user's task memory.

DaD implication: default cleanup actions should preserve memory first: return, move to a separate window, suspend, group, or mark. Close should stay visibly destructive and opt-in except for explicitly configured hard policies.

## Empirical Details

| Source | Sample / Context | Measure | Result | Product Reversal |
| --- | --- | --- | --- | --- |
| Iqbal & Horvitz 2007 | 27 users, two-week workplace logging | alert-driven suspension and resumption | nearly 10 minutes switching; 10-15 more minutes to focused resumption; 27 percent >2 hours | Drift is a chain problem, not a page problem. |
| Adamczyk & Bailey 2004 | lab tasks interrupted at different moments | performance, affect, workload | predicted best interruption moments produced less annoyance, frustration, time pressure, effort, and task disruption | DaD prompt timing is part of correctness. |
| Iqbal & Bailey 2006/2008 | modeled breakpoint-based interruption timing | resumption lag, annoyance, reaction time | task-structure boundaries predicted interruption cost; breakpoint scheduling reduced frustration and reaction time | Intervene at boundaries when possible. |
| Mark et al. 2008 | interrupted office-task experiment | completion time, quality, stress | interrupted work was faster with similar measured quality, but higher stress/frustration/effort | Fast recovery is not the same as good recovery. |
| Leroy 2009 | two experiments on task switching | attention residue and subsequent performance | unfinished prior tasks impaired next-task attention; finishing alone was not enough without time pressure | Closure and transition conditions matter, not only task completion. |
| Leroy & Glomb 2018 | four studies of interruption/resumption pressure | attention residue and interrupting-task performance | anticipated resumption pressure worsened interrupting-task performance; ready-to-resume plan mitigated effects | Continue/Isolate should support planning, not just dismissal. |
| Hightower et al. 1998 | two PadPrints usability studies | page revisitation time/pages/satisfaction | return-to-prior-page tasks took 61.2 percent of baseline time with graphical history | A graph can be a recovery tool, not just an explanation. |
| Morris et al. 2008 | survey plus SearchBar user study | task reacquisition and re-finding | multi-session investigations common; ordinary history poorly supports task-level recovery | DaD should model chains as tasks/investigations. |
| Teevan et al. 2004 | 15 expert users, 1512 semi-structured interviews | search strategy | keyword search used in only 39 percent of directed searches | Low similarity may be valid orienteering. |
| Chang et al. 2021 | surveys/interviews on browser tab usage | tab retention reasons and costs | tabs used as reminders; users feared losing items out of sight; about 25 percent reported crashes in one study aspect | Do not equate open tabs with useless clutter. |
| Parry & le Roux 2021 | meta-analysis of media multitasking and cognitive control | cognitive-control associations | small associations for some outcomes; no causal conclusion; no associations for interference/task management | Media/feed should be modifier-only. |

## Assumptions Updated

- Old assumption: low current-origin similarity is the main drift signal.
- Updated: low similarity is only dangerous when recoverability is also declining.

- Old assumption: Return is a helpful navigation shortcut.
- Updated: Return is the strongest evidence-backed intervention because resumption failures can last minutes to hours and visual cues predict recovery.

- Old assumption: Show graph is mostly transparency/debugging.
- Updated: graphical history can directly improve revisitation; graph should be actionable.

- Old assumption: many drift tabs are clutter.
- Updated: tabs may be external memory. Cleanup must preserve task reminders before destroying them.

- Old assumption: media-heavy pages are a strong risk signal.
- Updated: media pressure is a weak-to-moderate modifier unless combined with chain evidence.

- Old assumption: Isolate is an autonomy valve.
- Updated: Isolate is also scientifically necessary because web search often branches through legitimate orienteering.

## DaD Design Implications

1. Reframe intent coherence as trajectory recoverability:

   - Can the user recover the origin?
   - Can the user see the last coherent target?
   - Can the user identify the first drift?
   - How many same-root descendants now exist?
   - How long since the last coherent page?

2. Keep Return and Return chain as primary actions:

   - Return single current tab.
   - Return chain for current tab plus known same-root drift descendants.
   - Show exact target and tab count before action.

3. Add or specify a "park/checkpoint" concept:

   Before or after a major drift prompt, DaD should preserve the old chain's resumption cue. This can be automatic metadata, not user-visible note-taking by default.

4. Make Show graph actionable:

   - clickable Return target;
   - clickable Isolate current branch;
   - visible first drift;
   - collapsed descendant count;
   - host-level labels by default;
   - no raw text by default.

5. Treat Isolate as branch declaration:

   It should start a new chain from the current page. It should not globally trust the host, lower thresholds, or mark all similar future pages safe.

6. Make prompt timing part of policy:

   Prefer prompts at page-load, new-tab, idle-after-load, feed-scroll threshold, or media-start boundaries. Defer warning-only prompts during active text input where feasible.

7. Preserve tab memory during cleanup:

   Return/move/suspend should be default actions. Close should remain destructive and visually separated.

## Scoring Implications

Core signal candidates:

- Low similarity to both origin and last coherent page.
- Deep descendant chain from first drift.
- Long time since last coherent target with no return.
- Multiple same-root drift descendants.
- Transition through known feed/recommender/media surface after prior drift.
- Repeated prompt dismissal followed by further drift descendants.
- Active locked/protected work context.

Recovery-cost signals:

- Return target unknown or stale.
- Last coherent page no longer open.
- Many branches between origin and current page.
- Current page reached after several peripheral transitions.
- User has not viewed graph or target after repeated prompts.

Boundary/timing signals:

- New page load.
- New tab opened from drift page.
- Idle-after-load.
- Feed/recommender threshold crossed.
- Media playback starts on low-coherence page.
- Active text input or form editing, which should reduce prompt aggressiveness unless hard policy applies.

Modifier-only:

- Media/feed pressure.
- Rapid tab switching.
- Open-tab count.
- Search-query divergence.
- Long passive active time.
- Graph complexity.

Avoid:

- Hard intervention from media signal alone.
- Hard intervention from low similarity alone.
- Treating open tabs as evidence of failure.
- Closing tabs as default cleanup.
- Interpreting Continue as proof the system was wrong.
- Interpreting Isolate as global domain trust.

## Intervention Implications

| Intervention | Evidence Fit | Best Use | Failure Mode | Design Requirement |
| --- | --- | --- | --- | --- |
| Return | strongest | recover from drift before chain deepens | wrong target destroys trust | show target and keep one-click |
| Return chain | strong, by chain-of-diversion evidence | multiple same-root drift descendants | destructive if it moves too much | show count and make scope visible |
| Isolate | strong as branch/orienteering support | legitimate new task branch | bypass if it relaxes protection | new local baseline only |
| Continue with reason | moderate | user asserts current page still belongs | performative dismissal | bounded local reason, not long journaling |
| Show graph | moderate to strong for revisitation/offloading | inspect chain and recover orientation | overwhelming or surveillance-like | compact, host-level, action-paired |
| Move/suspend drift tabs | strong from tab-memory evidence | preserve memory while reducing pressure | hidden tabs become forgotten | visible group/window/suspension affordance |
| Close drift tabs | weak unless explicit policy | user-confirmed cleanup or strict plan | destroys memory artifacts | destructive styling and explicit scope |
| Hard quarantine | indirect; strongest under lock | precommitted protected work | too blunt if based on weak signal | require converging evidence or locked policy |

## Privacy Implications

Safe local data:

- chain id;
- origin host/label;
- last coherent host/label;
- first drift host/label;
- current host/label;
- bounded similarity scores;
- transition type;
- descendant count;
- return target availability;
- local action outcome: Return, Return chain, Isolate, Continue, Show graph;
- prompt timing category;
- media/feed/recommender count categories.

Risky data:

- raw page text;
- raw query strings;
- raw form input;
- raw clicked text;
- raw reason text retained indefinitely;
- cross-device graph histories;
- graph export that includes full URLs or private titles by default.

Default privacy rule:

Store enough bounded structure to recover trajectory, not enough content to reconstruct browsing history.

## Local Validation Metrics

- `returnLatencyAfterPrompt`: time from prompt to Return/Return chain.
- `returnTargetRecovered`: whether next page matches last coherent/origin.
- `driftDepthAtPrompt`: number of transitions from first drift to prompt.
- `descendantTabCountAtPrompt`: scope before Return chain.
- `showGraphBeforeRecovery`: whether graph helps recovery.
- `isolateThenRepeatDrift`: whether Isolate becomes bypass-like.
- `continueThenDriftDeeper`: whether Continue predicts later drift.
- `promptAtBoundary`: whether prompt was shown at load/new-tab/idle/media/feed boundary.
- `promptDuringActiveInput`: burden/risk diagnostic.
- `cleanupActionChosen`: return, move, suspend, close.
- `closedTabsReopenedSoon`: possible evidence that closing destroyed useful memory.

## Implementation Handoff

Affected files or docs:

- `docs/dad_intent_coherence_system.md`
- `docs/protection-model.md`
- popup Session coherence card
- on-page intent prompt
- intent graph UI
- drift descendant cleanup actions
- local diagnostics export

Minimum viable future changes:

- Add "recoverability" language to the intent docs.
- Add prompt timing categories to local diagnostic state.
- Make graph nodes action-paired where feasible.
- Treat Return target visibility as a testable requirement.
- Preserve current Move/Suspend/Return chain defaults as memory-preserving cleanup actions.
- Add local metrics for Continue/Isolate outcomes without raw content.

Tests needed when implemented:

- Return target is visible before Return.
- Return chain shows descendant count before action.
- Isolate creates a new local chain without trusting a domain.
- Show graph can operate with host-level labels only.
- Media/feed pressure alone cannot trigger hard quarantine.
- Active text input suppresses non-hard prompt timing where feasible.
- Close drift tabs remains visually destructive and scoped.

Rollout risk:

- If DaD prompts at bad moments, it becomes part of the interruption problem.
- If DaD treats tabs as disposable clutter, it can erase the user's memory system.
- If DaD overweights media signals, it will create false positives.
- If DaD hides graph too deeply, the offloading mechanism will not matter.
- If Return targets are wrong, users will stop trusting intent coherence quickly.

## Revisit Triggers

- Local data shows users often Continue and then drift deeper.
- Users frequently Show graph before Return, suggesting graph should be promoted.
- Closed drift tabs are reopened soon after cleanup.
- Prompt timing correlates with immediate dismissal or emergency escape.
- Users isolate the same domains repeatedly, suggesting a legitimate recurring task or a bypass pattern.

## Open Questions

- Should DaD add a visible "Park this chain" action, or keep checkpointing automatic?
- Should Return choose last coherent, origin, or task hub depending on chain shape?
- How should graph density scale when many descendant tabs exist?
- Should Isolate be delayed only during hard quarantine, or also after repeated failed Continue?
- Which local metric best predicts "this prompt helped" without asking for subjective ratings?

## Current Answer Status

Answered under the revised quality bar. The product-changing conclusion is that intent coherence should optimize trajectory recoverability, with Return and graph as recovery infrastructure, Isolate as legitimate branching, and media pressure as a modifier rather than a primary signal.
