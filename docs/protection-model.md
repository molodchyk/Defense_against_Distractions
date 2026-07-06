# DaD Protection Model

DaD is not only a website blocker. The long-term product direction is a user-owned protection layer that helps a lucid user defend their future vulnerable state.

The core loop is:

1. Collect local signals.
2. Estimate risk.
3. Choose an intervention.
4. Explain what happened.
5. Preserve locked protection when the user is in a high-risk state.

## Product Principle

The user configures protection while calm. DaD protects that configuration when the user is likely to be in a destructive loop.

This means forced schedules and locked plans are mission-critical state. Cosmetic cleanup, convenience features, and exploratory data should never take priority over locked schedule data or enforcement.

## Signals

Signals are local observations that can contribute to risk scoring or diagnostics.

Possible page signals:

- URL and domain.
- Matched keywords.
- Text density and detected text themes.
- Amount of links.
- Amount of images, video, audio, currently audible media, GIFs, emoji, and other media.
- Presence of feeds, recommendations, infinite scroll, comments, reactions, or other loop-forming UI.
- UI element count and repeated interaction controls.

Possible session signals:

- Time on page.
- Time in browser.
- Recent browser activity.
- Local active-time totals.
- Number of open tabs.
- Longevity of the current session.
- Recently blocked pages.
- Repeated returns to a blocked or high-risk page.
- Pomodoro work/rest state.

Possible interaction signals:

- Scroll amount.
- Scroll speed.
- Click rate.
- Typing activity.
- Media switching.
- Rapid page changes.

Possible user-state signals:

- Mental state score entered by the user.
- Risk state inferred from repeated behavior.
- Whether the current time is inside a locked schedule.
- Whether recent behavior looks constructive or destructive.

The first implemented user-state signal is popup Focus state. Calm has no effect; Strained and Vulnerable are local, expiring signals that raise intent intervention thresholds after feedback calibration. This makes protection stricter when the user asks for it without making claims about truthfulness or weakening plan policy.

## Risk Score

The risk score should eventually be more than keyword matching.

Inputs can include:

- Keyword score.
- Page media intensity.
- Link density.
- Time spent in seconds.
- Session length.
- Tab count.
- Interaction velocity.
- Prior history with the same domain or pattern.
- Schedule/plan context.

Some domains or contexts may need immediate high risk because they are designed for strong dopaminergic lock-in. This should be research-informed instead of guessed casually.

Time can act as an additive or multiplicative factor. For example, a mildly risky page may become risky after sustained use, while very high-risk contexts may trigger immediately.

Intent coherence already uses a 0-100 score. Keyword blocking still enforces legacy 1000-point stored weights for compatibility, but popup and blocked-page diagnostics now display normalized 0-100 scores; popup diagnostics keep the legacy raw score beside the normalized value for compatibility. Plan keywords can also be authored with explicit 100-point score tokens such as `50/100` or `50%`; these compile to legacy values for scanning and protected-schedule strictness checks. A future migration to a native 100-point keyword threshold must preserve existing user rules deliberately instead of silently changing stored weights.

The first implemented bridge from page-structure signals into page blocking is explicit structural keywords. Users can add plan keywords like `has:video`, `has:audio`, `has:audible`, `has:links>=25`, `has:images>=10`, `has:media`, `has:recommendations`, `has:comments`, or `has:shorts` to make local media/link/passive-surface structure contribute the configured keyword score. `has:audible` counts media that is currently playing and not muted or zero-volume. Recommendation, comment, and short-form conditions are opt-in and diagnostic-visible, so high-lock-in surfaces can be configured as immediate score contributors without silently classifying whole hostnames as forbidden. Time can also be explicit through `has:pageSeconds>=N` or `has:activeSeconds>=N`, which uses bounded page-age or visible-active counters as normal score contributors only when the user configures such a rule.

## Interventions

Blocking is one intervention, not the only intervention.

Possible interventions:

- Block the page.
- Navigate to the blocked page.
- Overlay the page.
- Hide matched UI elements.
- Stop or remove video/audio playback.
- Remove distracting page sections.
- Desaturate the page with grayscale.
- Click a dismiss/close control.
- Fill or clear a field.
- Delay access.
- Show a timer.
- Require a rest period.
- Prevent configuration changes during locked or high-risk states.

Interventions should be chosen by severity. A mild risk can justify UI cleanup or a warning. A severe risk during a forced schedule can justify hard blocking.

## Trust Windows

DaD should not claim to know whether the user is lying. The implementable concept is configuration trust.

A configuration change is more trustworthy when:

- It is outside a locked schedule.
- It happens after a cooldown.
- The recent session is not high-risk.
- The user has not repeatedly tried to bypass protection.
- The change makes protection stricter.

A configuration change is less trustworthy when:

- It happens during a locked schedule.
- It weakens protection during a high-risk session.
- It follows repeated blocked-page attempts.
- It follows rapid switching, scrolling, or other destructive-loop signals.

The goal is not moral judgment. The goal is to preserve decisions made by the calmer self.

The first implemented configuration-trust slice applies this rule to plan edits during locked schedules. DaD now allows edits that make an active plan stricter: adding blocked websites to an entry, adding valid positive keywords, increasing keyword scores, assigning more UI cleanup rules, enabling disabled UI cleanup rules, enabling or tightening Pomodoro, and enabling or tightening intent interventions. It still blocks plan disabling, blocked-site or keyword removal, keyword-score decreases, allowed-site additions, UI cleanup removals, disabling active UI cleanup rules, Pomodoro relaxation, and intent relaxation.

## Plans

Plans should become the main user-facing unit of protection.

A plan can combine:

- Website groups.
- Keyword groups.
- UI cleanup rules.
- Schedules.
- Pomodoro settings.
- Intervention levels.
- Configuration-lock rules.

Plans should be enableable and disableable, but locked plans need stricter rules. The schedule UI should support workdays, all days, and plan-specific schedules.

Pomodoro behavior should follow the plan-owned implementation direction in [DaD Pomodoro Implementation Spec](pomodoro-implementation.md). The timer is a work/rest rhythm inside active plans, not a bypass timer for blocked pages. During a locked schedule, enabling, starting, or resuming Pomodoro is allowed because it makes the plan stricter; pausing, resetting, disabling, or shortening required rest remains blocked because it relaxes protection.

## Data Policy

The default direction should be local-first.

Local data can support:

- Usage stats.
- Diagnostics.
- Trigger explanations.
- Personal risk scoring.
- Product feedback explicitly exported or shared by the user.

Product telemetry is not part of the default direction. The current extension should not add analytics, tracking, remote feedback uploads, or remote network behavior for ordinary protection work. If a future release deliberately adds remote feedback or telemetry, it must be opt-in, transparent, documented before release, and reflected in the manifest, privacy policy, StorePilot privacy answers, package verifier expectations, release notes, and store listing copy.

Sensitive content such as detected page text needs special care. The product should prefer derived stats and local processing unless there is a deliberate research reason and clear user consent.

The first local usage-stats slices follow that rule. DaD stores bounded hostname-level aggregates in `chrome.storage.local` under `usageStats`: samples, visits, active time, dwell time, page word counts, blocked/allowed outcome counters, maximum observed open-tab/window counts, and maximum observed counts for text size, media elements, interaction elements, passive recommendation/comment/short-form regions, and page structure. If a page context is first observed as allowed and later becomes blocked, its visit time and page word count move into the blocked aggregate bucket. DaD derives blocked outcome shares for visits, active time, and page words from those existing aggregates so the popup, options page, and local export can explain the blocked-versus-allowed balance without adding new browsing storage. DaD does not store raw page text, full URLs, page titles, topic tokens, selectors, tab URLs, tab titles, or tab identities. Retention is bounded and the options page exposes a Usage panel with clear and user-triggered local JSON export controls. The popup Inspect pane shows compact read-only usage aggregates, can display live open-tab/window counts as aggregate diagnostics without storing the underlying tabs, derives ephemeral current-page keyword ideas from bounded page-signal tokens, shows compact passive-region counts for the current page, and owns the full local diagnostics copy action instead of burying it in a single block-diagnostics card.

Settings export/import is also local and user-triggered. Full settings exports include only recognized configuration keys, and shareable `dad.ruleset.v1` exports include only plans, legacy groups/schedules/allowed sites, and UI cleanup rules. Ruleset import preserves local UI preferences, blocked-page notes, passwords, billing state, runtime state, usage stats, and diagnostics.

## Research Questions

Research should answer:

- Which internet usage patterns are most associated with destructive loops?
- Which page contexts are most triggering: text, audio, algorithms, video, feeds, or interaction design?
- Which interventions work best at which severity levels?
- When does time on page become a reliable risk signal?
- Which signals predict a vulnerable state without becoming invasive?
- Which configuration changes should be delayed or blocked during high-risk states?
- How can DaD explain interventions without creating more friction or shame?
- What data improves the product without violating user trust?

## Implementation Direction

Near-term implementation should prioritize:

1. Trigger diagnostics: show why DaD acted.
2. Local signal collection: page media counts, passive region counts, link counts, time, tab count, and interaction summaries.
3. A structured risk-score module.
4. An intervention engine that can choose block, hide, stop media, click, delay, or timer actions.
5. Plan-based schedules and grouped rules.
6. Research notes that connect signals and interventions to evidence.

This keeps DaD moving toward the larger vision while reducing the risk of building disconnected features.

## Implemented Diagnostic And Intervention Slice

The first implemented slice is a local page signal, trajectory, diagnostics, and proportional intervention layer. It does not send data anywhere.

The page collector summarizes top-frame pages on navigation, throttled DOM changes, and local activity events:

- Page URL and host.
- Page title.
- Text sample length, word count, and emoji count.
- Bounded visible-text topic tokens. Raw page text is not stored.
- Images, videos, audio elements, currently audible media elements, GIFs, and iframes.
- Links, buttons, inputs, and forms.
- Total element count plus feed-like, recommendation, comment, and short-form media regions.
- Page age, active visible page time, active editable-field focus duration, visible audio/video playback time, scroll/click/input/key counts, bounded scroll distance in viewport units, bounded scroll-direction reversals, bounded dynamic-content growth and scroll-linked append counts, media play/pause/end counts, transient media source-change counts, aggregate recommendation/feed click counts, separate bounded recommendation/feed/comment interaction counts, conservative repeated-card/grid feed-click attribution, bounded passive region counts, bounded interaction rates, top-frame transition types/qualifiers such as typed or address-bar navigation, and maximum scroll depth. Raw input, field values, field labels, focused element identity, media URLs, media source strings, scroll positions, selectors, added node text, and added node selectors are not stored.

The trajectory collector stores bounded local state in `chrome.storage.local` under `intentTrajectoryState`. It currently tracks:

- session origin after idle reset
- page visits
- active tab id
- bounded tab opener lineage from `chrome.tabs.onCreated`
- top-frame transition type and qualifiers from `chrome.webNavigation`
- parent visit/session links for child tabs when the opener chain is known
- drift-descendant flags for tabs opened from a drifted chain
- extracted URL/title/host tokens
- extracted visible-text topic tokens
- origin and local metadata/text similarity
- media/feed/link pressure
- visible media playback pressure
- media progression pressure from bounded end/source-change counts
- passive scroll/click pressure
- interaction velocity
- recommendation/feed click dependence and feed/comment interaction dependence
- direct typed/bookmark/search/form/address-bar transition evidence as a bounded anchor/recovery signal when high-pressure drift signals are low
- aggregate open-tab/window pressure
- dwell time and active visible page time
- bounded long-session pressure that requires passive or drift-context pressure in addition to total duration
- active input duration and constructive dwell signals
- a deterministic coherence score and risk state
- the first visit that crosses into drift/intervention territory
- a tab-aware soft intervention decision for the current content script
- a recovery target, usually the last visit before the first drift point
- a bounded local intent chain graph derived from the existing trajectory visits and tab-lineage metadata
- bounded coherent-host and drift-descendant host summaries for the current trajectory, limited to normalized hostnames and counts
- bounded local intervention feedback actions, such as acknowledge, continue, isolate, or return
- short user-entered reasons for Continue choices from return-style prompts and popup prompt-style interventions, stored locally with a strict length cap
- a feedback summary with return/isolate/continue/dismiss rates, continue-reason count, bounded post-intervention outcome recovery rates, Continue-specific recovery/drift-after-Continue rates, and a conservative calibration diagnostic
- plan-level local auto-calibration that can adjust the effective intervention threshold after enough feedback and, after repeated failed outcomes, move warning/grayscale/reduce-noise one step stricter up to prompt level without lowering the configured locked threshold

This gives later features a common source for diagnostics, risk scoring, usage stats, and research-informed tuning. Intent coherence is now plan-aware:

- active enabled plans contribute intent settings unless the current URL is allowed by that plan
- multiple active plans combine conservatively so stricter thresholds and stronger actions win
- each plan can disable intent coherence, warn only, desaturate the page with grayscale, hide bounded feed/recommendation/comment containers, show a return prompt, use a modal drift-chain block, or quarantine locked/drift-descendant block-action pages
- active Pomodoro work phases can make intent intervention stricter, while break phases can make it more lenient
- each plan can bound local intent-diagnostics retention from 1 to 30 days; when multiple plans apply, the strictest retention wins

The current intervention remains conservative: when the active tab reaches `intervene` or `locked`, DaD can show a plan-configured prompt or modal with recovery actions, a visible Last coherent recovery target, and the First drift point when known. The grayscale action is a reversible middle layer: it desaturates the current drift page while keeping recovery controls available. The reduce-noise action is also reversible: it hides bounded recommendation, feed, related-content, shorts/reels, and comment containers while keeping Return, Isolate, and Continue available. Manual UI element rules can also perform bounded page-local cleanup actions, including hiding matched elements, clicking one matched enabled element once per page URL, clearing one matched visible editable text field once per page URL, or pausing playing audio/video on one matched media element or container once per page URL.

- continue or acknowledge the current drift event when the active action allows it; Continue requires a short local reason on return-style prompts and in the popup for prompt-style interventions
- open the local Intent diagnostics graph from the prompt without collecting new browsing data
- pause link gestures that would open new tabs from an active non-warning drift intervention until the user chooses a recovery action
- return to the last coherent page in the chain
- move other same-chain drift-descendant tabs to a separate browser window from an explicit prompt or popup action, with the popup Session coherence card and hard-chain on-page prompt showing how many known same-chain drift tabs are in scope
- isolate the current page as a new intent session and detach the current tab from inherited opener drift lineage

The modal `block` action blocks the current drift-chain interaction surface, not the keyword blocker’s full-page violation state. For active plan policies that use `block`, DaD now flags locked sessions and drift-descendant tabs as hard current-page chain quarantines. The content script shows a non-continue overlay, pauses page media while the intervention is active, and offers Return chain, Return, explicit Isolate recovery, and explicit return/move/suspend/close actions for open same-chain drift-descendant tabs. The hard-chain prompt receives only count-level tab scope and shows how many other known drift tabs are affected before those cleanup actions are clicked. Return chain remains available as an immediate user-triggered recovery action that returns the current page and known same-chain drift descendants to the last coherent page together. If the hard-quarantine cooldown finishes without a recovery choice, the background can automatically perform that same current-tab-plus-known-descendants return. Plans can opt into a stricter mode that closes the current quarantined tab after the cooldown instead. Return stays available immediately; Isolate waits for a short cooldown anchored to the first locked/descendant detection, not to repeated DOM or page-signal reports. This is chain-scoped and current-page scoped: it does not ban the whole hostname, and destructive automatic current-tab closure is explicit plan policy rather than the default.

The second implementation slice is local trigger diagnostics for page blocking. DaD records recent keyword score contributions in page-local state, shows the latest trigger on the blocked overlay, and exposes a bounded recent contributor trail in popup Block Diagnostics so the user can see the latest score contributors without adding persistent browsing storage. This does not send data anywhere and does not change the blocking threshold.

Blocked pages also install general navigation guards while the overlay is active. These guards neutralize page-owned `beforeunload` prompts without creating a prompt themselves, then reassert the overlay and media suspension after focus, visibility, pageshow, popstate, and hashchange events. This keeps the blocking surface active when a site tries to interrupt leaving, reloading, or returning with an unsaved-change warning.

The Pomodoro implementation adds a local activity slice. Top-frame page events and browser focus events update bounded local state under `pomodoroActivityState`. This is used to show active/away status, approximate local active time today, and trigger Pomodoro auto-start for active plans. It does not send data anywhere and does not yet drive intent enforcement.

The popup now exposes a compact current-page signal snapshot from the top-frame content script:

- images
- videos
- audio elements
- currently audible media
- GIFs
- emoji
- links

This implements the first visible version of the "show video count image audio emoji on popup" idea without adding new storage or telemetry.

Intent diagnostics now expose opener-lineage information in both the popup and options page:

- number of tabs in the active chain
- child-tab branches
- drift-descendant count
- bounded coherent-host and drift-descendant host counts
- whether the current page is a drift descendant
- latest top-frame navigation transition
- redirect transition load
- aggregate open-tab/window pressure
- per-visit tab and opener-tab markers

The options diagnostics panel also shows the contributing plan policy for current and recent visits, shows the active retention window, renders a bounded chain graph from recent trajectory visits, summarizes coherent and drift-descendant hosts as capped hostname counts only, shows aggregate open-tab/window pressure, shows feed/comment interaction load and counts, shows intervention feedback counts and rates, shows how many Continue choices included a bounded reason, summarizes whether the next observed page after feedback recovered, separates Continue outcomes into recovered versus drift-after-Continue rates, reports the effective auto-calibration threshold and action adjustment, reports whether the current intervention is a chain quarantine and whether its cooldown is active, can clear local trajectory state, and can export a user-triggered local JSON diagnostics snapshot. This export is for debugging and self-analysis; it does not upload data. New-tab freezing is a page-local event guard and does not add storage.

This keeps the descendant model inspectable while DaD’s hard chain behavior remains current-page scoped rather than tab-suspension scoped.
