# DaD Intent Coherence System: A Local, Content-Agnostic Defense Layer for Objective Amnesia

## 1. Core Idea

Defense against Distractions should not merely become another website blocker, task manager, Pomodoro timer, or checklist system.

The proposed direction is different:

**DaD should become a local browser-level system that detects when a browsing session loses coherence with its originating intention, even when no single website or piece of content is explicitly forbidden.**

The key idea is not to ask, “Is this website bad?”  
The key idea is to ask:

> Has the user’s behavior stopped being governed by a stable objective?

This reframes distraction as **objective amnesia** or **loss of control hierarchy**, not simply as exposure to bad content.

A normal blocker works like this:

```text
User visits site
→ site matches blocked rule
→ block page
```

The proposed DaD system works more like this:

```text
User begins a browsing trajectory
→ DaD records the chain of actions and transitions
→ DaD estimates whether the current activity is still coherent with the originating behavioral chain
→ if coherence collapses, DaD intervenes proportionally
```

This is not primarily a semantic AI problem. It does not require ChatGPT, cloud inference, or large language models. It can be implemented locally by observing browser structure, navigation patterns, tab ancestry, timing, media exposure, and behavioral dynamics.

The central product concept:

> DaD should act as a browser-level immune/navigation system that detects loss of intent coherence and intervenes when the user’s browsing process becomes fragmented, passive, recommender-driven, or detached from its original trajectory.

The system does not need to know the user’s philosophical life goal.  
It only needs to detect when a session stops behaving like a coherent chain.

---

## 2. What Problem This Solves

Most distraction tools assume that the user knows what should be blocked in advance.

This is insufficient because many destructive browsing sessions do not begin with a deliberate choice to waste time.

They begin with something like:

```text
I need to quickly check one thing.
```

Then:

```text
search → result → side result → YouTube → recommendation → comments → another video → Reddit → search → tabs → drift
```

The user did not consciously choose the final state. The user slid into it through a sequence of locally plausible transitions.

The usual blocker tries to stop known bad destinations. But the deeper problem is not destination. It is **trajectory decay**.

There are at least three different failure modes:

### 2.1 Explicit Forbidden Access

The user knows a site is bad for them.

Example:

```text
Open porn site → block immediately.
```

Traditional blockers can handle this.

### 2.2 Environmental Capture

The user enters an environment whose selection mechanisms begin choosing for them.

Example:

```text
Open YouTube for a tutorial → recommended videos take over.
```

Feed removers partly address this, but only website by website.

### 2.3 Objective Amnesia / Intent Decay

The user’s original purpose gradually loses governing power.

Example:

```text
Anki → Google term → Wikipedia → YouTube explanation → recommended video → unrelated video → comments
```

The problem is not that YouTube exists. The problem is that the browsing chain has detached from the original purpose.

The proposed system targets this third failure mode.

---

## 3. What This Is Not

This is not a task app.

It should not become:

- a checklist manager
- a daily goal planning website
- a Notion clone
- a habit tracker
- another Pomodoro app
- a motivational reminder system
- a chatbot that lectures the user
- an AI assistant that constantly asks for goals

DaD’s strength is that it lives inside the browser and can observe the actual structure of browsing behavior.

The goal is not to make the user manually manage more tasks.

The goal is to make the browser aware of when the user’s activity becomes structurally incoherent.

---

## 4. Foundational Concept: Browsing as a Trajectory

A browser session should be treated as a graph, not as isolated page visits.

Every page has context:

- What page came before it?
- Was it opened by clicking a link?
- Was it opened from a recommendation?
- Was it typed manually?
- Was it opened from search?
- Was it opened in a new tab?
- Was it a child of another tab?
- How long did the user stay?
- Did the user actively type/search/edit?
- Did they passively scroll/watch?
- Did they return to the origin?
- Did the session branch into many tabs?
- Did the current page still resemble the previous or originating pages?

The important object is not a URL.

The important object is a **behavioral chain**.

Example of a coherent chain:

```text
Anki card on PDE5
→ Google search: PDE5 inhibitor mechanism
→ Wikipedia: Sildenafil
→ PubMed abstract on PDE5 inhibition
→ medical article on pulmonary hypertension
```

Example of a decaying chain:

```text
Anki card on PDE5
→ Google search: PDE5 inhibitor mechanism
→ YouTube video: PDE5 explained
→ recommendation: weird medical facts
→ recommendation: celebrity health story
→ comments
→ unrelated video
```

The second chain may have no explicitly forbidden website. But it has lost origin coherence.

---

## 5. The Central Metric: Intent Coherence

The proposed system computes an internal score:

```text
intent_coherence_score
```

This score estimates how much the current browsing state is still governed by the original or recent coherent trajectory.

It is not a moral score.  
It is not a productivity score.  
It is not a universal “good/bad website” score.

It is a session-relative measure:

> Given how this session began, does the current activity still make sense as a continuation?

### 5.1 High Coherence

A session has high coherence when:

- the domains are related
- the page topics remain similar
- transitions are explainable
- the user performs deliberate actions
- the session has low fragmentation
- the user returns to origin pages
- tab branching is controlled
- search terms remain connected
- passive media does not dominate
- recommender-originated clicks remain low

### 5.2 Low Coherence

A session has low coherence when:

- domains change rapidly
- topics drift without clear connection
- the user opens many tabs
- the user rapidly switches tabs
- the user scrolls passively for long periods
- recommender-originated clicks dominate
- the user stops typing/searching/creating
- the session becomes loop-like
- the user never returns to the origin
- current pages cannot be explained by earlier pages

### 5.3 Coherence Is Relative

YouTube is not automatically incoherent.

Example:

```text
User searches "how to replace laptop RAM"
→ opens YouTube tutorial
→ watches 8 minutes
```

This can be coherent.

But:

```text
User starts in German writing task
→ opens YouTube
→ watches unrelated recommended clips
```

That is incoherent relative to the origin.

The system should not classify websites globally. It should classify transitions within a session.

---

## 6. Local Signals: No LLM Required

The system can start with purely local, deterministic signals.

### 6.1 Navigation Signals

Record:

- URL
- domain
- page title
- referrer URL
- transition type if available
- whether opened by link click
- whether opened by typed URL
- whether opened by search
- whether opened by bookmark
- whether opened as child tab
- whether it came from a known recommendation/feed area

Useful Chrome APIs:

- `chrome.tabs`
- `chrome.webNavigation`
- `chrome.history`
- `chrome.storage`
- content scripts for DOM-derived signals

### 6.2 Tab Ancestry

Every tab should have a parent, if detectable.

Example:

```text
Tab A: Anki
  └── Tab B: Google search
        └── Tab C: Wikipedia
              └── Tab D: YouTube video
                    └── Tab E: recommended video
```

This ancestry matters more than the URL alone.

A YouTube tab that descends from a focused research chain is different from a YouTube tab opened after idle drift.

### 6.3 Timing Signals

Record:

- dwell time per page
- active tab duration
- idle periods
- rapid tab switching
- time since session origin
- time since last deliberate action
- time since last search/input/edit
- time spent on passive media
- time spent in scroll-heavy states

### 6.4 Interaction Signals

Record locally:

- scroll distance
- scroll velocity
- scroll reversals
- clicks
- typing events
- form input
- search input
- video play/pause
- audio/video presence
- whether user is editing text
- whether user is only consuming

Do not store raw typed content by default. For privacy, use counts and event types unless the user explicitly enables deeper local analysis.

### 6.5 Page Structure Signals

Detect:

- video elements
- audio elements
- number of images
- number of iframes
- number of links
- infinite feed-like structures
- comment sections
- recommendation sidebars
- autoplaying media
- shorts/reels-like layouts
- high-density clickable cards
- emoji/GIF-heavy pages if useful

This can be done with DOM inspection.

### 6.6 Search/Topic Signals Without AI

The system can extract simple tokens from:

- page title
- URL path
- headings
- meta description
- search query
- visible anchor text around clicked link
- selected text if click came after text selection

Then compute rough similarity using:

- token overlap
- keyword continuity
- domain category continuity
- search query continuity
- URL path similarity
- title similarity
- Jaccard similarity
- TF-IDF-like local weighting

No LLM is needed.

---

## 7. Derived Metrics

The raw signals should feed into derived metrics.

### 7.1 Navigation Entropy

Measures how chaotic the session is.

Inputs:

- domain changes per minute
- category changes
- tab switches per minute
- new tabs per minute
- unique domains per session
- back/forward usage
- repeated search cycles

High entropy suggests loss of stable objective.

### 7.2 Branching Factor

Measures how explosively the session grows.

Example:

```text
1 page → 3 tabs → 8 tabs → 14 tabs
```

High branching is not always bad, but it is a strong drift signal when combined with low return rate and low topic continuity.

### 7.3 Recommender Dependence

Measures how much the session is now driven by externally selected next steps.

Signals:

- clicks inside recommendation areas
- clicks on YouTube sidebar/home/feed
- clicks on Reddit feed items
- clicks on Facebook/Instagram feeds
- autoplay progression
- infinite scroll continuation
- “next video” chains
- trend/explore page navigation

The system should maintain site-specific selectors for known recommendation zones.

This is not the same as blocking all feeds. The system can merely raise risk when the session becomes recommendation-driven.

### 7.4 Agency Ratio

Measures active selection versus passive consumption.

Active signals:

- typing
- searching
- editing
- deliberate URL entry
- form filling
- reading a static article with stable dwell time
- returning to origin

Passive signals:

- continuous scrolling
- autoplay video
- recommendation clicks
- short dwell loops
- feed traversal
- low typing
- high media consumption

A declining agency ratio suggests the user is no longer steering.

### 7.5 Origin Continuity

Measures similarity between current page and session origin.

Origin can be:

- first meaningful page after idle
- first user-declared context, if available
- page where a research chain began
- page active before a burst of new tabs

Origin continuity decays naturally over time, but sudden collapse is significant.

### 7.6 Local Continuity

Measures similarity between current page and immediately previous pages.

This catches abrupt jumps.

Example:

```text
German grammar article → Discord meme channel
```

Abrupt low local continuity.

### 7.7 Loopiness

Detects repetitive destructive patterns:

```text
search → scroll → search → scroll
video → video → video
reddit → discord → reddit → discord
tab A → tab B → tab A → tab B
```

Loopiness indicates behavior is being governed by short-cycle reinforcement rather than a stable objective.

### 7.8 Return Rate

Measures whether the user returns to origin or anchor pages.

Focused research often has a hub:

```text
task page ↔ source page ↔ search page ↔ notes
```

Destructive browsing often has no return.

The user moves forward indefinitely.

### 7.9 Passive Media Load

Measures how much the environment is dominated by:

- video
- audio
- shorts
- reels
- GIFs
- image grids
- autoplay
- comments

This should not independently trigger blocks, but it should amplify drift risk.

---

## 8. Proposed Scoring Model

Start with a simple deterministic scoring model.

Maintain for each session:

```ts
type IntentSession = {
  id: string
  originPageId: string
  activePageId: string
  createdAt: number
  lastActiveAt: number
  pages: PageVisit[]
  tabGraph: TabGraph
  coherenceScore: number
  driftScore: number
  riskState: "clear" | "watch" | "drift" | "intervene" | "locked"
}
```

Each page visit:

```ts
type PageVisit = {
  id: string
  tabId: number
  parentPageId?: string
  url: string
  domain: string
  title: string
  startedAt: number
  endedAt?: number
  transitionType: TransitionType
  extractedTokens: string[]
  structureSignals: PageStructureSignals
  interactionSignals: InteractionSignals
  localSimilarity: number
  originSimilarity: number
}
```

Page structure:

```ts
type PageStructureSignals = {
  linkCount: number
  imageCount: number
  videoCount: number
  audioCount: number
  iframeCount: number
  hasInfiniteFeed: boolean
  hasRecommendationArea: boolean
  hasCommentSection: boolean
  hasAutoplay: boolean
  mediaDensity: number
  audibleMediaCount: number
}
```

Interaction:

```ts
type InteractionSignals = {
  clicks: number
  keystrokes: number
  scrollDistance: number
  scrollVelocityAvg: number
  tabSwitchesFrom: number
  tabSwitchesTo: number
  activeInputTimeMs: number
  videoWatchTimeMs: number
  idleTimeMs: number
}
```

### 8.1 Example Drift Formula

Initial version:

```text
drift_score =
  + navigation_entropy * 20
  + branching_factor * 15
  + recommender_dependence * 25
  + loopiness * 20
  + passive_media_load * 15
  + rapid_switching * 15
  - origin_continuity * 25
  - local_continuity * 15
  - agency_ratio * 20
  - return_rate * 15
```

Normalize to 0–100.

Then:

```text
intent_coherence_score = 100 - drift_score
```

Suggested states:

```text
80–100: clear
60–79: watch
40–59: drift
20–39: intervene
0–19: locked / strong intervention
```

These thresholds should be configurable and later personalized.

### 8.2 Important Principle

The score should not be a single black box.

DaD should show the breakdown:

```text
This page was flagged because:
- session drifted far from origin
- 7 rapid tab switches in 2 minutes
- 4 recommendation-originated clicks
- no return to original tab for 18 minutes
- passive media load increased
```

This is critical because the user needs to trust the system.

---

## 9. Intervention Model

DaD should not only block.

It should have proportional interventions.

### 9.1 State: Clear

No action.

### 9.2 State: Watch

Silent observation.

Optional subtle indicator:

```text
Session coherence: stable
```

### 9.3 State: Drift

Low-friction warning.

Example:

```text
This session appears to be drifting from its origin.
Return to previous coherent page, continue, or isolate this tab?
```

Options:

- Continue
- Return
- Isolate tab
- Show why

### 9.4 State: Intervene

Moderate intervention.

Possible actions:

- grayscale page
- hide recommendation areas
- hide comments
- pause autoplay
- freeze opening new tabs from current page
- require short reason to continue
- offer return to last coherent page
- move drift descendants to separate window
- collapse feed areas

### 9.5 State: Locked / Strong Intervention

Strong intervention when the system detects sustained collapse.

Possible actions:

- block current drift chain
- close or suspend drift descendants
- redirect to origin page
- require cooldown timer
- prevent new tabs from drift page
- require password if locked protection is enabled

This should apply to the chain, not necessarily the whole website.

Example:

```text
Block all descendants of this incoherent YouTube recommendation chain.
```

Not:

```text
Block all of YouTube forever.
```

---

## 10. The New Concept: Drift Descendants

This is one of the most important implementation ideas.

A tab or page can be marked as a **drift descendant** if it descends from an originally coherent chain but later loses coherence.

Example:

```text
Anki
→ Google
→ YouTube explanation
→ YouTube recommendation
→ unrelated video
```

DaD does not need to block all YouTube. It can say:

```text
The first YouTube video was still coherent.
The second recommendation is the first drift point.
Everything opened after that is a drift descendant.
```

This allows precise interventions:

- close only drift descendants
- grayscale only drift descendants
- prevent only drift descendants from opening more tabs
- preserve useful research pages
- return the user to the last coherent page

This is much more surgical than website blocking.

---

## 11. Session Origin Detection

The system needs to decide where a session begins.

Possible origin heuristics:

### 11.1 Idle Reset

If the browser has been idle for N minutes, the next meaningful page becomes a new session origin.

Example threshold:

```text
10–20 minutes idle
```

### 11.2 Domain/Task Anchor

If the user spends meaningful time on a page with active input or reading, it can become an anchor.

Examples:

- Anki
- Google Docs
- ChatGPT writing
- coding docs
- learning platform
- article being read

### 11.3 Explicit Optional Origin

DaD may optionally allow the user to mark:

```text
This is what I am doing now.
```

But this should not become mandatory task management.

### 11.4 Search-Origin Heuristic

A typed search query can create an origin.

Example:

```text
search: "how does PDE5 inhibition work"
```

This gives DaD a strong local intent vector without asking for a goal.

### 11.5 Window-Based Origin

A new browser window can begin a new session.

Useful if users separate work and drift windows.

---

## 12. Intent Without User-Written Goals

The system can infer intent from behavior.

This avoids turning DaD into a checklist.

Sources of implicit intent:

- search queries
- page titles
- URL paths
- repeated domain cluster
- active editing page
- selected text
- clicked link text
- parent page context
- tab ancestry
- user returning repeatedly to a hub page

This is enough to create an approximate intent vector.

Example:

```text
Origin tokens:
["pde5", "inhibitor", "sildenafil", "mechanism", "pulmonary", "hypertension"]
```

Current page tokens:

```text
["celebrity", "interview", "drama", "reaction"]
```

Low continuity.

No LLM required.

---

## 13. Optional Goal Recall Feature

The user’s idea of hidden objectives can still exist, but it should be secondary.

Possible design:

At the beginning of a protected session, DaD asks:

```text
What are you trying to accomplish in this browser session?
```

The user writes:

```text
Study German writing task and avoid YouTube rabbit holes.
```

DaD stores this locally and hides it.

Later, after drift signals accumulate, DaD asks:

```text
What were you trying to do?
```

But the answer should not be used naively as “passed/failed.”

The important signal is:

- Did the user remember?
- Did the remembered goal match the current behavior?
- Did behavior change after recall?
- Did coherence recover?
- Did they override and continue drifting?

Thus the real metric is not recall accuracy.

It is **goal influence**:

> After the reminder, does the original objective regain control?

If the user remembers the goal but continues drifting, the problem was not memory. It was authority failure.

DaD should then escalate differently.

The first implemented slice records a bounded local outcome on the next observed page visit after intervention feedback. It stores only the observed risk state, coherence score, score delta, tab/session/visit identifiers, and whether the user returned to the recorded recovery hostname; it does not store the follow-up page URL, title, text, or topic tokens. Options diagnostics summarize these outcomes as recovery rate, return-host rate, and average score delta so the product can distinguish reminders that actually restore control from prompts that the user simply dismisses or continues past. If enough observed outcomes keep failing and local auto-calibration is enabled, DaD now makes the effective policy stricter by intervening earlier and escalating one action step, capped at prompt-level actions so a user-configured prompt is not silently turned into hard blocking.

---

## 14. Privacy Principles

This system can become invasive if designed carelessly.

Default privacy principles:

1. Local-first.
2. No raw page text stored long-term by default.
3. No raw typed input stored by default.
4. Store derived metrics instead of content.
5. Let users inspect all stored data.
6. Let users delete session history.
7. Never upload browsing data unless the user explicitly enables sync or research mode.
8. Separate local functionality from optional cloud features.
9. For Chrome Web Store trust, explain clearly what is stored and why.

Recommended default storage:

- domain
- URL optionally truncated
- title optionally stored
- extracted keywords with local retention limits
- counts and metrics
- tab ancestry
- timestamps
- intervention events

Avoid default storage of:

- full page text
- passwords
- form contents
- private messages
- raw keystrokes
- sensitive page screenshots
- hidden input fields

---

## 15. MVP Implementation Plan

### Stage 1: Passive Trajectory Logger

Goal:

Build the data foundation.

Implement:

- page visit logging
- active tab tracking
- session detection
- tab ancestry
- dwell time
- domain changes
- tab switches
- URL/title capture
- idle reset
- basic local storage

No interventions yet.

Deliverable:

A local timeline view:

```text
12:00 Anki
12:03 Google: PDE5 inhibitor
12:05 Wikipedia: Sildenafil
12:09 YouTube: PDE5 explained
12:14 YouTube: unrelated recommended video
```

This alone will reveal patterns.

### Stage 2: Structural Page Signals

Add content scripts to detect:

- video count
- audio count
- image count
- link count
- feed-like structures
- recommendation areas on major sites
- comment sections
- media density

Deliverable:

Popup shows:

```text
Current page:
- videos: 1
- recommendations: yes
- comments: yes
- media density: high
```

### Stage 3: Basic Coherence Score

Implement deterministic scoring:

- domain entropy
- tab switching
- branching factor
- origin continuity via token overlap
- local continuity via token overlap
- passive media load
- recommendation dependence
- agency ratio
- search refinement loop load
- deliberate-action staleness load

Deliverable:

Popup shows:

```text
Intent coherence: 63 / 100
Risk state: Watch
Main causes:
- medium domain drift
- low recommender exposure
- high origin similarity
```

### Stage 4: Drift Detection

Define drift states.

Implement:

```text
clear → watch → drift → intervene
```

Detect first drift point in a chain.

Mark pages as:

- coherent
- uncertain
- drift point
- drift descendant

Deliverable:

Session graph view with labels.

### Stage 5: Low-Friction Interventions

Implement:

- warning banner
- return to last coherent page
- isolate tab
- show why
- continue button

No hard blocking yet.

Deliverable:

DaD intervenes only after drift threshold.

### Stage 6: Element-Level Interventions

Implement:

- hide recommendations
- hide comments
- grayscale page
- pause videos
- block new child tabs from drift page
- collapse feed containers

Deliverable:

DaD modifies the environment instead of only blocking.

### Stage 7: Chain-Level Blocking

Implement:

- block drift descendants
- suspend drift tabs
- close drift chain
- redirect to origin
- cooldown timer

Deliverable:

DaD can surgically cut incoherent chains without banning whole domains.

### Stage 8: Personal Calibration

Add local learning:

- which warnings user accepts
- which overrides lead to later regret
- which domains are often coherent
- which domains often become drift descendants
- which signals predict long sessions

Do not use ML initially. Start with adaptive weights.

Deliverable:

DaD becomes more accurate per user.

### Stage 9: Optional Research/Export Mode

Allow user to export anonymized session metrics.

Useful for:

- self-analysis
- product improvement
- future research
- debugging false positives

---

## 16. Example Process in Operation

### Scenario: Useful YouTube

```text
Origin: Google search "how to fix washing machine pump"
→ YouTube tutorial
→ user watches 6 minutes
→ returns to search results
→ opens forum thread
```

Signals:

- high origin continuity
- low branching
- low recommender dependence
- high dwell coherence
- return to search hub

Action:

```text
No intervention.
```

### Scenario: YouTube Drift

```text
Origin: Anki
→ Google "PDE5 mechanism"
→ YouTube "PDE5 explained"
→ recommended video "weird medical facts"
→ recommended video "doctor reacts"
→ comments
→ another recommendation
```

Signals:

- first YouTube video coherent
- recommendation dependence increases
- origin continuity drops
- passive media load increases
- no return to origin
- session duration expands

Action:

```text
Drift warning:
"This chain has detached from its origin. Return to PDE5 search, isolate this tab, or continue?"
```

If ignored:

```text
Hide recommendations, grayscale page, or block drift descendants.
```

### Scenario: Research Rabbit Hole but Coherent

```text
Origin: Byzantine logistics
→ Silk Road
→ Mongol Empire
→ Chinese metallurgy
→ gunpowder
→ early rockets
```

Signals:

- topic drift exists
- but local continuity remains high
- user reads long pages
- low recommender dependence
- low tab chaos
- low passive media
- coherent semantic bridge between steps

Action:

```text
No block, maybe watch state.
```

This distinction is crucial: DaD should not punish curiosity.

### Scenario: Fragmentation

```text
Google Docs
→ Discord
→ Reddit
→ YouTube
→ Amazon
→ ChatGPT
→ Reddit
→ Discord
```

Signals:

- high domain entropy
- rapid switching
- low origin continuity
- low return rate
- loopiness
- no stable hub

Action:

```text
Intervention:
"Browsing has become fragmented. Return to last work tab or start a separate session."
```

---

## 17. Why This Is Different From Existing Blockers

Existing blockers generally operate on:

```text
domain
URL
time limit
schedule
keyword
app
```

This system operates on:

```text
trajectory
ancestry
coherence
drift
agency
fragmentation
selection dependence
```

The difference is fundamental.

Traditional blocker:

```text
YouTube is blocked.
```

DaD Intent Coherence:

```text
This YouTube page is allowed because it is coherent with the session.
This later YouTube page is restricted because it is a drift descendant of a recommendation chain.
```

Traditional blocker:

```text
Reddit allowed until 20 minutes.
```

DaD Intent Coherence:

```text
This Reddit page is allowed if it came from a focused search and remains coherent.
This Reddit chain is restricted if it becomes feed-driven and fragmented.
```

Traditional blocker:

```text
User must plan tasks.
```

DaD Intent Coherence:

```text
User behavior itself reveals whether an objective is still governing the session.
```

---

## 18. Hard Problems

### 18.1 False Positives

Coherent exploration can look like drift.

Mitigation:

- use multiple signals, not one
- allow user to mark session as coherent
- learn from overrides
- avoid immediate hard blocks
- use soft interventions first

### 18.2 False Negatives

A destructive session can remain within one domain.

Example:

```text
YouTube video → YouTube video → YouTube video
```

Mitigation:

- track recommender dependence
- track passive media load
- track origin decay
- track video chains
- track comments and feed interactions

Initial implementation note: intent coherence now tracks recent origin decay as a bounded session metric. It accumulates only when recent visits remain low-overlap with a clear origin and passive/recommender/loop/stale-control pressure is also present, so ordinary connected reading is not treated as destructive decay.

Initial implementation note: intent coherence now tracks repeated passive media chains as a bounded session metric. A media-chain load rises only when recent video/audio/playback visits form a run and another drift context is present, such as origin decay, recommender clicks, low agency, stale-control, navigation-loop, or unanchored-session pressure.

### 18.3 Privacy

Deep browsing analysis can become sensitive.

Mitigation:

- local-first
- metric-based storage
- inspectable logs
- short retention
- no cloud by default

### 18.4 User Override

The user may override while in the bad state.

Mitigation:

- locked protection modes
- cooldowns
- delayed changes
- password controls
- distinguish calm configuration from hot-state override

Initial implementation note: locked schedules now distinguish stricter plan edits from hot-state relaxation. Entry blocked-site/keyword additions, UI cleanup assignments, Pomodoro tightening, and intent tightening can be saved during a locked schedule; disabling, removals, allowed-site additions, lower keyword scores, and softer Pomodoro/intent settings are rejected by a shared protected-plan comparator.

### 18.5 Ambiguous Intent

Sometimes the user has no clear objective.

Mitigation:

- classify as “unanchored session”
- reduce confidence
- intervene based on fragmentation/passivity, not goal mismatch

Initial implementation note: intent coherence now calculates a bounded origin-anchor confidence from local metadata/text-token summaries and input counts. Weak anchors reduce the origin-mismatch penalty, while a separate unanchored-session load rises only when the weak-anchor chain is passive or fragmented.

Initial implementation note: intent coherence now treats direct navigation transitions as bounded intent evidence. Typed, bookmark, keyword/search, form-submit, and address-bar transitions strengthen the origin anchor and can provide a small latest-page recovery signal only when the page is not already under strong passive media, recommender, feed/comment, stale-control, loop, origin-decay, or unanchored pressure.

---

## 19. Product Language

Avoid making the product sound like a task manager.

Possible terms:

- Session Coherence
- Drift Detection
- Intent Drift
- Browsing Trajectory
- Last Coherent Page
- Drift Descendants
- Recommendation Dependence
- Fragmentation
- Agency Ratio
- Coherence Recovery
- Isolate Chain
- Return to Origin

Possible popup wording:

```text
This session is drifting.
The current page is no longer strongly connected to where this chain began.
```

```text
This tab is a drift descendant.
It came from a recommendation chain that has lost connection to the original session.
```

```text
Return to last coherent page?
```

```text
Hide recommendations for this chain?
```

```text
Move drift tabs to a separate window?
```

---

## 20. Minimal Technical Architecture

### 20.1 Background Service Worker

Responsibilities:

- listen to navigation events
- manage sessions
- manage tab graph
- compute scores
- store metrics
- trigger interventions

### 20.2 Content Scripts

Responsibilities:

- inspect DOM structure
- detect media/feed/recommendation/comment elements
- track scroll/click/input behavior
- send summarized metrics to background

### 20.3 Popup UI

Shows:

- current session
- coherence score
- risk state
- score breakdown
- page structure signals
- active interventions
- buttons: return, isolate, continue, show graph

### 20.4 Options UI

Configure:

- thresholds
- intervention levels
- privacy/storage
- site-specific selectors
- locked protection
- data retention
- debug mode

### 20.5 Blocked/Intervention Page

Shows:

- what happened
- why intervention occurred
- last coherent page
- available actions
- cooldown if necessary

---

## 21. Implementation Detail: Recommendation Zone Detection

Initial version can use manual selectors for major sites.

Example YouTube:

- home feed
- sidebar recommendations
- end-screen recommendations
- Shorts grid
- comments

Example Reddit:

- home feed
- popular feed
- subreddit feed
- comment chains
- related posts

Example Facebook/Instagram/X:

- feed containers
- suggested posts
- reels
- explore sections

The goal is not perfect classification. The goal is to detect when the user is increasingly following external selection machinery.

Initial implementation note: the page-signal activity layer now has a dedicated recommender-zone helper with generic selectors plus first-pass site-specific selectors for YouTube, Reddit, X/Twitter, Instagram, and Facebook recommendation, feed, comment, timeline, reels, shorts, and related-content areas. It also has a conservative generic repeated-card/grid heuristic that treats clicks inside thumbnail/card clusters as feed clicks while ignoring repeated plain navigation links. It records only bounded click counts and rates, not clicked text beyond the existing bounded link-token summary. The activity layer also summarizes dynamic DOM growth and separately counts content appended shortly after scrolling, so infinite-scroll continuation can become a small diagnostic drift pressure without storing added node text, selectors, or scroll positions. The activity summary now preserves the aggregate recommender click count while also classifying local clicks as recommendation, feed, or comment interactions; the scorer exposes feed/comment interaction load as a separate bounded drift pressure. The collector also counts bounded recommendation-region, comment-section, and short-form media region totals as passive structure pressure, while diagnostics and usage stats expose only counts and maxima.

### Generic Detection Heuristics

Even without site-specific selectors:

- repeated similarly structured cards
- high link density
- infinite scroll behavior
- many thumbnails
- repeated media blocks
- dynamically appended content while scrolling

---

## 22. Implementation Detail: Token Similarity Without AI

For each page:

1. Extract title.
2. Extract URL path tokens.
3. Extract H1/H2 headings.
4. Extract meta description.
5. Extract visible anchor text clicked, if possible.
6. Remove stop words.
7. Stem or normalize lightly.
8. Store top N tokens.

Then compute:

```text
similarity = |intersection(tokensA, tokensB)| / |union(tokensA, tokensB)|
```

Or weighted version:

- title tokens weight 3
- search query tokens weight 4
- heading tokens weight 2
- URL tokens weight 1

This is primitive but useful.

Do not overbuild semantics in the MVP.

---

## 23. Debug View

A strong debug view is essential.

For current page:

```text
Session ID: 2026-06-05-001
Origin: Anki / PDE5 card
Current: YouTube / Doctor reacts to weird medical facts

Coherence: 38
State: Drift

Signals:
+ recommender dependence: high (+22)
+ passive media load: high (+14)
+ origin similarity: low (+18)
+ local similarity: medium (-5)
+ tab switching: low (0)
+ branch depth: 4 (+8)
+ return rate: zero (+12)

First drift point:
YouTube recommendation opened at 12:41
```

This lets the developer and user understand whether DaD is behaving intelligently.

---

## 24. Long-Term Vision

If this works, DaD becomes more than a blocker.

It becomes a system for preserving intentional continuity in hostile digital environments.

Its job is not to remove every tempting object.

Its job is to prevent the browser from becoming a place where local selection mechanisms override the user’s larger control structure.

Long-term capabilities:

- detect when a session becomes ungoverned
- detect when recommender systems take control
- preserve last coherent state
- help user recover trajectory
- intervene at the chain level
- learn personal drift signatures
- distinguish coherent exploration from destructive fragmentation
- give the user a map of how they got lost

The strongest metaphor is not a wall.

It is a navigation instrument plus immune system:

- it watches for foreign selection pressure
- it remembers dangerous trajectories
- it marks drift descendants
- it quarantines incoherent chains
- it preserves the organism’s higher-order direction

---

## 25. First Concrete Build Target

The first version should not attempt everything.

Build this:

### MVP: Drift Graph + Coherence Score

Features:

1. Track session origin.
2. Track page visits.
3. Track tab ancestry.
4. Extract simple tokens.
5. Compute origin/local similarity.
6. Compute entropy/branching/passivity/recommender signals.
7. Show current coherence score in popup.
8. Show session timeline.
9. Mark first drift point.
10. Add one intervention: return to last coherent page.

If that feels real in daily use, then continue.

If it does not, the idea needs revision before adding complexity.

The core test is simple:

> Can DaD point to a moment in the browsing chain and correctly say, “This is where you started to get lost”?

If yes, the concept is valuable.

If no, no amount of plans, schedules, sync, machine learning, or UI polish will save it.

---

## 26. Summary

The proposed vision is:

```text
DaD should detect and interrupt objective amnesia by modeling browsing as a trajectory and measuring intent coherence.
```

It should not rely primarily on user-written goals.

It should not require ChatGPT.

It should not classify websites as universally good or bad.

It should observe:

- where the session began
- how pages are connected
- whether transitions remain coherent
- whether selection machinery is taking over
- whether agency is decaying
- whether the chain has become fragmented
- where the first drift point occurred

Then it should intervene proportionally:

- warn
- explain
- return
- isolate
- hide
- grayscale
- pause
- block drift descendants

The most important implementation concept is:

```text
tab/page ancestry + drift descendants
```

The most important product concept is:

```text
preserve intentional continuity without turning DaD into a task manager
```

The most important MVP question is:

```text
Can DaD identify the moment a browsing session loses coherence?
```

---

## 27. Current Implementation Status

The first diagnostic layer and the first low-friction intervention are now implemented as a local foundation.

Implemented:

- top-frame page signal reporting from `src/js/content/page-signals/` and the thin `src/js/content/pageSignals.js` controller on navigation, throttled DOM changes, summarized scroll/click/input/editable-focus activity, and bounded interaction velocity
- tested page-signal shape in `src/features/page-signals/core/collectorModel.js`, exported through the compatibility barrel at `src/js/shared/pageSignals.js`
- tested trajectory/session model in `src/js/shared/intentCoherence.js`
- local background recording in `src/js/background/intentCoherence.js`
- bounded storage under `chrome.storage.local` key `intentTrajectoryState`
- idle-reset session creation
- weighted URL/title/search-query/heading/meta-description/clicked-link/selected-text token extraction without storing raw headings, descriptions, clicked text, or selected text
- bounded visible-text topic token extraction without storing raw text
- origin and local metadata/text similarity
- media/feed/link/passive-region pressure
- visible audio/video playback time, currently audible media counts, opt-in audible structural keywords, bounded passive recommendation/comment/short-form region counts, and bounded media play/pause/end/source-change counts without storing media URLs, source strings, selectors, comments, or recommendation text
- passive scroll/click pressure
- scroll/click/key/input velocity beyond summarized counts
- bounded active editable-field focus duration as an active-input and deliberate-action signal without storing raw typed input, field values, labels, selectors, or focused element identity
- agency ratio and low-agency load from bounded active input duration plus input, key, scroll, click, recommender-click, and media-play counts
- aggregate open-tab/window pressure as a weak fragmentation signal
- bounded recent active-tab switching, switch velocity, and short A/B tab-loop pressure without storing tab URLs or titles
- bounded same-page repeat, reload, and back/forward loop pressure from existing visit and transition summaries
- bounded scroll distance in viewport units plus scroll-direction reversals as local passive-loop signals, folded into passive scroll/click pressure without storing scroll positions
- bounded dynamic-content growth and scroll-linked append counts for infinite-scroll pressure, without storing added node text, selectors, or positions
- bounded repeated-search-cycle pressure from search-query token continuity without storing raw query strings
- bounded session-age, deliberate-action gap, and visits-since-search/input/edit pressure without storing raw typed input
- bounded origin-anchor confidence and unanchored-session load, so ambiguous sessions are judged by passive or fragmented behavior rather than treated as strong goal mismatches
- bounded direct-navigation evidence from typed, bookmark, keyword/search, form-submit, and address-bar transitions in origin anchoring, scoring, and diagnostics
- bounded recent origin-decay pressure for strong-origin chains that stay low-overlap while passive, recommender-driven, loop-like, or stale-control
- recommendation/feed click attribution from generic page zones
- first-pass site-specific recommendation/feed/comment zone click attribution for major social/video surfaces, with separate bounded recommendation, feed, and comment interaction counters plus feed/comment load and passive-region counts in scoring and diagnostics
- conservative generic repeated-card/grid click attribution that counts thumbnail/card clusters as feed interaction without counting plain navigation lists
- repeated passive media-chain pressure for video/audio sequences with contextual drift pressure
- bounded long-session pressure from total dwell/active time only when passive or drift-context pressure is already present, so long deliberate reading/input is not penalized by duration alone
- active input duration and constructive dwell recovery signals
- deterministic coherence score, score reasons, and risk state
- first drift visit marker
- bounded `chrome.tabs` opener lineage in `intentTrajectoryState`
- parent visit/session links for child tabs when the opener chain is known
- top-frame `chrome.webNavigation` transition type and qualifier ancestry
- redirect-heavy navigation chain pressure in scoring and diagnostics
- drift-descendant flags for tabs opened from already drifted chains
- tab branching, open-tab pressure, recent tab-switch pressure, navigation-loop pressure, and drift-descendant pressure in the coherence score
- return-to-origin/hub rate and low-return load for fragmented chains
- popup diagnostics panel with current score, state, compact score-signal breakdown, reasons, origin/current/drift, effective policy status, lineage summary, recent visits, refresh, and clear
- popup Session coherence card with current score, state, recovery targets, active intervention status, effective policy status, drift-tab scope, a compact bounded session path with first-drift/current markers, accountable Continue for prompt-style interventions, and chain recovery actions
- tab-aware intervention decisions for content scripts
- a dismissible on-page drift prompt for `intervene` and `locked` sessions that shows origin, last coherent recovery target, first drift point when known, current page, score, reasons, and available recovery actions
- return to the last coherent page
- isolate the current page as a new intent session and detach the current tab from inherited opener drift lineage
- plan-owned intent settings with enable/disable, intervention action, thresholds, and Pomodoro influence
- Options-page intent diagnostics with policy source, active score, reasons, lineage summary, score signals, plan-owned retention, local JSON export, and recent trajectory
- a bounded Options-page intent chain graph with coherent, uncertain, drift-point, and drift-descendant labels, plus Show graph buttons on intent prompts and the popup Session coherence card that open that graph from active recovery surfaces
- Options-page usage diagnostics with bounded hostname-level aggregates, blocked/allowed outcome counters, derived blocked outcome shares, aggregate page word counts, clear control, and local JSON export, plus a read-only popup Today usage summary for the current day
- proportional content-script actions: warn-only, grayscale page, return prompt, modal drift-chain block, and hard current-page chain quarantine for locked or drift-descendant block actions
- reversible element-level reduction that hides bounded recommendation, feed, related-content, shorts/reels, and comment containers while the reduce-noise intent action is active
- reversible new-tab freezing for active non-warning drift interventions, covering target-blank, modifier-click, middle-click, and matching Enter gestures on links
- block-style intent interventions pause and mute page media while the intervention surface is active, then restore media state when the intent intervention clears and no keyword block owns the page
- a stable chain-quarantine cooldown timer anchored to first locked/descendant detection, so repeated page-signal reports do not reset the cooldown
- conservative chain cleanup from the drift-block prompt and popup: explicitly return the current tab and other drift tabs together, return only other drift tabs, move them to a separate window, suspend them, or close other open tabs in the same known root chain that are explicitly marked as drift descendants, while keeping the current tab available for Return or Isolate recovery
- automatic hard-chain return after the chain-quarantine cooldown: if the user has not chosen a recovery action, DaD can return the current tab and known same-root drift descendants to the last coherent page together
- opt-in automatic current-tab closure after the chain-quarantine cooldown for plans that explicitly enable the stricter hard-quarantine behavior
- dwell time and active visible page duration as local scoring and diagnostic signals
- bounded local intervention feedback recording for acknowledge, continue, isolate, mark-coherent, and return choices
- return-prompt and popup prompt-style Continue choices now require a short user-entered reason, stored as bounded local feedback rather than page content
- feedback-derived calibration diagnostics, including return rate, isolate rate, coherent-mark rate, continue rate, continue-reason count, dismiss rate, average intervention score, post-intervention outcome recovery rate, Continue-specific recovery/drift-after-Continue rates, return-host outcome rate, average outcome score delta, average Continue score delta, and a conservative recommendation
- bounded coherent-host and drift-descendant host summaries in Options diagnostics, capped to normalized hostname counts without paths, queries, titles, page text, or topic tokens
- plan-level local auto-calibration that can conservatively adjust the effective intervention threshold and, after repeated failed outcomes, escalate the effective action one step up to prompt level while leaving the configured locked threshold unchanged
- popup Focus state as a bounded local user-state signal: Calm has no effect, while Strained and Vulnerable expire automatically and raise effective intent thresholds after feedback calibration

The current layer should still be treated as conservative. It is designed to test whether the scoring model can identify useful drift moments and offer recovery. The grayscale action is an intermediate reversible intervention between warning and prompting, and the reduce-noise action is a bounded element-level intervention that hides recommendation/feed/comment containers without treating the whole page as forbidden. Active non-warning interventions also pause link gestures that would open new tabs from the drift page, while leaving same-tab navigation and prompt controls alone. Continue from a return-style prompt or from the popup during a prompt-style intervention now requires a short local reason, which creates a small accountability step without sending data anywhere. The prompt and popup Session coherence card also include Show graph, which opens the local Intent diagnostics chain graph for the current trajectory. The prompt Trust this shift path and the popup Mark coherent action let the user explicitly mark the current page as the new coherent local baseline by reusing the clean isolate/new-session path; this records local feedback without trusting a domain globally or relaxing locked settings. Auto-calibration adjusts only effective policy after enough local evidence; repeated failed outcomes can raise the effective intervention threshold and move warning/grayscale/reduce-noise one step stricter, but it does not silently lower locked protection or auto-upgrade prompt-level plans to hard blocking. Popup Focus state is explicitly user-owned and only makes effective intent thresholds stricter while active. The `block` action is not a keyword-style full-page violation. When the active plan uses `block`, DaD now marks locked sessions and drift-descendant tabs as hard current-page chain quarantines: the page is covered by a non-continue overlay, page media is paused while the intervention is active, and Return chain, Return, explicit Isolate recovery, and same-chain return/move/suspend/close cleanup actions are available. Return chain stays immediately available as an explicit action. If the hard chain quarantine cooldown finishes without a recovery choice, DaD can automatically return the current tab and known same-root drift descendants to the last coherent page. A stricter plan setting can instead close the current quarantined tab after the cooldown. Return stays available immediately, while isolation is delayed by the same short cooldown.
