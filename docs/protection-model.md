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

## First Implementation Slice

The first implementation slice is a local page signal collector. It does not change blocking behavior and does not send data anywhere.

The collector summarizes:

- Page URL and host.
- Text sample length, word count, and emoji count.
- Images, videos, audio elements, GIFs, and iframes.
- Links, buttons, inputs, and forms.
- Total element count and feed-like regions.

This gives later features a common source for diagnostics, risk scoring, usage stats, and research-informed tuning.
