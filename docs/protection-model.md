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
- Amount of images, video, audio, GIFs, emoji, and other media.
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

Pomodoro behavior should follow the plan-owned implementation direction in [DaD Pomodoro Implementation Spec](pomodoro-implementation.md). The timer is a work/rest rhythm inside active plans, not a bypass timer for blocked pages.

## Data Policy

The default direction should be local-first.

Local data can support:

- Usage stats.
- Diagnostics.
- Trigger explanations.
- Personal risk scoring.
- Product feedback chosen by the user.

Product telemetry should be explicit, transparent, and opt-out or opt-in depending on the final business model. If telemetry exists, users need to know what is collected, why, and how to disable it.

Sensitive content such as detected page text needs special care. The product should prefer derived stats and local processing unless there is a deliberate research reason and clear user consent.

The first local usage-stats slice follows that rule. It stores bounded hostname-level aggregates in `chrome.storage.local` under `usageStats`: samples, visits, active time, dwell time, maximum observed open-tab/window counts, and maximum observed counts for text size, media elements, interaction elements, and page structure. It does not store raw page text, full URLs, page titles, topic tokens, tab URLs, tab titles, or tab identities. Retention is bounded and the options page exposes a Usage panel with clear and user-triggered local JSON export controls.

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
2. Local signal collection: page media counts, link counts, time, tab count, and interaction summaries.
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
- Images, videos, audio elements, GIFs, and iframes.
- Links, buttons, inputs, and forms.
- Total element count and feed-like regions.
- Page age, active visible page time, scroll/click/input/key counts, recommendation/feed click counts, bounded interaction rates, and maximum scroll depth. Raw input is not stored.

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
- passive scroll/click pressure
- interaction velocity
- recommendation/feed click dependence
- dwell time and active visible page time
- active input and constructive dwell signals
- a deterministic coherence score and risk state
- the first visit that crosses into drift/intervention territory
- a tab-aware soft intervention decision for the current content script
- a recovery target, usually the last visit before the first drift point
- bounded local intervention feedback actions, such as acknowledge, continue, isolate, or return
- a feedback summary with return/isolate/continue/dismiss rates and a conservative calibration diagnostic
- plan-level local auto-calibration that can adjust the effective intervention threshold after enough feedback without lowering the configured locked threshold

This gives later features a common source for diagnostics, risk scoring, usage stats, and research-informed tuning. Intent coherence is now plan-aware:

- active enabled plans contribute intent settings unless the current URL is allowed by that plan
- multiple active plans combine conservatively so stricter thresholds and stronger actions win
- each plan can disable intent coherence, warn only, desaturate the page with grayscale, show a return prompt, use a modal drift-chain block, or quarantine locked/drift-descendant block-action pages
- active Pomodoro work phases can make intent intervention stricter, while break phases can make it more lenient
- each plan can bound local intent-diagnostics retention from 1 to 30 days; when multiple plans apply, the strictest retention wins

The current intervention remains conservative: when the active tab reaches `intervene` or `locked`, DaD can show a plan-configured prompt or modal with recovery actions. The grayscale action is a reversible middle layer: it desaturates the current drift page while keeping recovery controls available.

- continue or acknowledge the current drift event when the active action allows it
- return to the last coherent page in the chain
- isolate the current page as a new intent session and detach the current tab from inherited opener drift lineage

The modal `block` action blocks the current drift-chain interaction surface, not the keyword blocker’s full-page violation state. For active plan policies that use `block`, DaD now flags locked sessions and drift-descendant tabs as hard current-page chain quarantines. The content script shows a non-continue overlay with Return and explicit Isolate recovery actions. Return stays available immediately; Isolate waits for a short cooldown anchored to the first locked/descendant detection, not to repeated DOM or page-signal reports. This is chain-scoped and current-page scoped: it does not ban the whole hostname, and it does not yet suspend or close every descendant tab automatically.

The second implementation slice is local trigger diagnostics for page blocking. DaD records recent keyword score contributions in page-local state and shows the latest trigger on the blocked overlay. This does not send data anywhere and does not change the blocking threshold.

The Pomodoro implementation adds a local activity slice. Top-frame page events and browser focus events update bounded local state under `pomodoroActivityState`. This is used to show active/away status, approximate local active time today, and trigger Pomodoro auto-start for active plans. It does not send data anywhere and does not yet drive intent enforcement.

The popup now exposes a compact current-page signal snapshot from the top-frame content script:

- images
- videos
- audio elements
- GIFs
- emoji
- links

This implements the first visible version of the "show video count image audio emoji on popup" idea without adding new storage or telemetry.

Intent diagnostics now expose opener-lineage information in both the popup and options page:

- number of tabs in the active chain
- child-tab branches
- drift-descendant count
- whether the current page is a drift descendant
- latest top-frame navigation transition
- redirect transition load
- per-visit tab and opener-tab markers

The options diagnostics panel also shows the contributing plan policy for current and recent visits, shows the active retention window, shows intervention feedback counts and rates, reports the effective auto-calibration adjustment, reports whether the current intervention is a chain quarantine and whether its cooldown is active, can clear local trajectory state, and can export a user-triggered local JSON diagnostics snapshot. This export is for debugging and self-analysis; it does not upload data.

This keeps the descendant model inspectable while DaD’s hard chain behavior remains current-page scoped rather than tab-suspension scoped.
