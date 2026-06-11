# DaD Pomodoro Implementation Spec

This document defines the first Pomodoro implementation direction for Defense against Distractions.

The goal is not to make DaD a generic productivity timer. The goal is to add plan-owned work/rest rhythm so DaD can protect focus periods, show clear recovery timing on blocked pages, and eventually combine schedules, intent coherence, and local usage signals.

## Product Role

Pomodoro belongs inside plans.

A plan can answer:

- What websites and keywords are protected?
- When is this plan active?
- What UI cleanup applies?
- What work/rest rhythm should run while this plan is active?

Pomodoro should not be a global floating timer by default. A global default can exist for convenience, but the running timer state should be attached to a plan or to a current active plan context.

## User-Facing Behavior

Users should be able to configure per plan:

- Work duration in minutes.
- Short break duration in minutes.
- Long break duration in minutes.
- How many work sessions happen before a long break.
- Whether Pomodoro is enabled for the plan.
- Whether breaks are strict or advisory.
- Whether work time starts automatically when the plan becomes active.
- Whether break end returns to the previous blocked page automatically when safe.

Default values:

- Work: `25` minutes.
- Short break: `5` minutes.
- Long break: `15` minutes.
- Long break every: `4` completed work sessions.
- Strict breaks: `false`.
- Auto-start on active plan: `false`.

## States

Each plan Pomodoro runtime has one current state:

```text
idle
work
shortBreak
longBreak
paused
completed
```

State meanings:

- `idle`: Pomodoro is configured but not currently running.
- `work`: protection is active and break is not available yet.
- `shortBreak`: short rest is available or enforced.
- `longBreak`: longer rest is available or enforced after enough work sessions.
- `paused`: timer is manually paused if the plan allows pausing.
- `completed`: required rest is satisfied. The current cycle is finished, and the next work session starts when activity returns or the user starts it manually.

## Storage Model

Plan configuration lives in `chrome.storage.sync` because it is user configuration:

```ts
type PlanPomodoroSettings = {
  enabled: boolean
  workMinutes: number
  shortBreakMinutes: number
  longBreakMinutes: number
  sessionsBeforeLongBreak: number
  strictBreaks: boolean
  autoStart: boolean
}
```

Runtime state lives in `chrome.storage.local` because it is device/session state:

```ts
type PomodoroRuntimeState = {
  activePlanId: string | null
  phase: "idle" | "work" | "shortBreak" | "longBreak" | "paused" | "completed"
  phaseStartedAt: string | null
  phaseEndsAt: string | null
  completedWorkSessions: number
  lastCompletedAt: string | null
  pausedAt: string | null
  pausedPhase: "work" | "shortBreak" | "longBreak" | null
  pausedRemainingMs: number | null
  pauseReason: "manual" | "systemIdle" | "systemLocked" | null
  restCreditMs: number
  restCreditStartedAt: string | null
  restCreditReason: "systemIdle" | "systemLocked" | null
  previousUrl: string | null
}
```

Local activity state also lives in `chrome.storage.local`:

```ts
type PomodoroActivityState = {
  dayKey: string
  activeMsToday: number
  lastActivityAt: string | null
  lastReason: string | null
  lastUrl: string | null
  lastTitle: string | null
  systemState: "active" | "idle" | "locked" | null
  systemStateUpdatedAt: string | null
  updatedAt: string
}
```

Why this split matters:

- Sync storage should preserve configuration across devices.
- Local storage should avoid sync quota pressure and avoid syncing transient timer state.
- Forced schedules and plan configuration remain higher priority than timer history.

## Background Runtime

The background service worker owns timer truth.

Responsibilities:

- Start, stop, pause, resume, and reset plan Pomodoro state.
- Use `chrome.alarms` for phase-end checks.
- Recompute state when the service worker wakes.
- Store runtime state in `chrome.storage.local`.
- Expose runtime status to popup, options page, and blocked page.
- Track local browser activity from top-frame interaction pings and focus events.
- Track Chrome's system idle state so Windows lock or system idle can credit away time against the next required break.

Alarm name format:

```text
pomodoro:<planId>
```

Alarm handling:

- If current phase is `work`, transition to `shortBreak` or `longBreak`.
- If current phase is a break, transition to `completed` so the next work block starts only when activity returns or the user starts it manually.
- If plan was disabled or deleted, clear runtime state for that plan.
- If a locked schedule is active, do not allow timer state to weaken required protection.

## Options UI

Pomodoro settings should appear inside the plan page, likely as a separate plan subpage:

```text
Plan row -> Pomodoro
```

The compact plan row should eventually show:

- Pomodoro enabled/disabled.
- Current phase if running.
- Remaining time if running.

The plan Pomodoro page contains:

- Enable toggle.
- Numeric inputs for work, short break, long break, long-break interval.
- Strict break toggle.
- Auto-start toggle.
- Current runtime status.
- Start, pause/resume, stop/reset controls.
- Current activity status and local active time today.
- Runtime timeline: work start, next break, required rest, rest already credited, remaining rest, completed work sessions, and the next work trigger.
- If a protected schedule is active, runtime controls that weaken enforcement, such as pause and reset, must be disabled or rejected with a clear reason.

Do not place Pomodoro controls in legacy global schedules.

## Popup UI

The popup should show compact runtime state:

- Current plan.
- Current phase.
- Remaining time.
- Start/pause/resume/reset controls.
- Timing details that explain how idle/locked time affects rest:
  - work start and next break while work is running
  - required rest and rest already credited
  - rest still needed
  - rest satisfied / next work starts when activity returns
- Auto-start suppression after manual reset, so the user can see when DaD is intentionally not restarting a timer from tab focus, popup close, page-visible events, or immediate activity.
- A protected-schedule control notice when pause/reset are locked because the current plan protection is active.

It should not require opening the full options page for normal use.

## Blocked Page UI

The blocked page should support Pomodoro-aware messaging.

During work phase:

```text
Work period active.
Break available in 12:34.
```

During break phase:

```text
Break active.
Return to previous page when the timer ends.
```

If `previousUrl` is available and safe:

- Show a return button.
- After break ends, optionally return to previous page if configured.

The old removed timer behavior should not be restored as a bypass timer. Pomodoro is not "give me a few seconds on a blocked page." It is a planned work/rest cycle.

## Interaction With Plans

Pomodoro only matters for active enabled plans.

Rules:

- Disabled plan: no Pomodoro runtime should enforce anything.
- Active plan without Pomodoro: no Pomodoro behavior.
- Active plan with Pomodoro work phase: normal plan protection applies.
- Active plan with advisory break: user can access break-allowed sites if configured.
- Active plan with strict break: DaD can block work-only contexts or show rest page depending on future plan policy.

Future plan model may add:

```ts
type PomodoroBreakPolicy = {
  allowedSites: string[]
  blockedSites: string[]
  interventionMode: "none" | "restPage" | "blockWork" | "grayscale"
}
```

Do not implement this in the first slice unless needed.

## Interaction With Schedules

Schedules define when plans are active.

Pomodoro defines rhythm inside an active plan.

Important cases:

- If a schedule becomes active and `autoStart` is enabled, start work phase.
- If a schedule ends, stop or suspend the plan's Pomodoro runtime.
- If a forced/locked schedule is active, Pomodoro configuration controls must not reduce plan protection.
- If a protected schedule is active, popup pause/reset controls must be disabled with a visible explanation. Backend commands must still reject those actions because popup state is not a security boundary.
- Pomodoro reset is a runtime control. It may stop Pomodoro-only strict-break blocking, but DaD must immediately re-run normal page checks so schedule and keyword blocking still apply.
- If a user tries to shorten work duration during locked protection, treat it as weakening protection and block or delay the change.

## Interaction With Intent Coherence

Intent coherence can later influence Pomodoro, but should not be required for the first version.

Possible future behavior:

- Low coherence during work phase can increase intervention strength.
- Coherent browsing during work phase continues without interruption.
- Repeated drift during work phase can suggest starting a break or returning to origin.
- Break phase can reduce scoring strictness for allowed break contexts.

First Pomodoro slice should not depend on intent coherence.

## Minimum Implementation Slice

Build this first:

1. Add shared Pomodoro model helpers and tests.
2. Add plan-owned Pomodoro settings shape.
3. Add background runtime state with `chrome.alarms`.
4. Add popup status and start/pause/reset controls.
5. Add plan Pomodoro settings UI.
6. Add blocked-page timer display.

The first implementation now includes strict break enforcement as an initial behavior:

- Work phase keeps normal plan protection active.
- Advisory breaks only show timer state.
- Strict breaks show the block overlay during short and long break phases.
- When the strict break phase ends, DaD removes the Pomodoro break overlay and re-runs the normal page check. If the page is still keyword-blocked, regular blocking applies again.
- Strict-break media blocking must be reversible. DaD may pause/mute page media, disable embedded frames, and mute the tab while the break overlay is active, but it must restore the previous tab mute state and media/frame attributes when the break is paused, ends, or the overlay is otherwise removed.
- Block diagnostics should expose enough local state to debug strict-break failures: overlay state, Pomodoro break state, media suspension counts, and extension-owned tab mute tracking.
- Manual reset must clear strict-break overlays immediately, including during an active plan schedule. Reset suppresses activity-driven auto-start globally until the user explicitly starts or resumes Pomodoro. This prevents popup close, tab focus, window focus, visibility, page-visible events, or page interaction from immediately creating a new work session after the user intentionally stopped the timer. The suppression is local runtime state and must survive service-worker restarts.
- Reset does not bypass normal page protection. After a Pomodoro-only overlay is cleared, DaD re-runs the page check; if the page is still keyword-blocked, regular blocking remains.

Auto-start is activity-driven. Passive status polling does not start a timer; a timer starts when an active plan has Pomodoro auto-start enabled and DaD observes top-frame page activity or browser focus activity.

System idle/locked behavior:

- DaD uses `chrome.idle` to detect `active`, `idle`, and `locked` system states.
- During a `work` phase, `idle` or `locked` does not move the work-session anchor and does not manually pause the timer. The work phase remains referenced to its original `phaseStartedAt`.
- Idle or locked time during a `work` phase is accumulated as `restCreditMs` from the moment the system goes away until the user returns.
- If the user stays away past the anchored work end, DaD keeps crediting rest but does not start a new work block while the user is still away.
- When the user returns, the next short or long break is reduced by the accumulated rest credit.
- If rest credit is equal to or longer than the required break, the cycle is ready to reset. The next work session starts when the user returns with activity, and its `phaseStartedAt` is the return time. DaD must not keep accumulating a "rest still needed" value past the configured rest requirement, and it must not start counting a new work block while the user is still away.
- Manual pause still behaves like a real pause: it preserves remaining time and does not count as automatic rest credit.
- Short and long breaks are not auto-paused by system idle/locked state; time away from the computer continues to count as rest.

Example with 25 minutes work and 5 minutes rest:

- If the user works 20 minutes, goes away for 2 minutes, returns, and reaches the 25-minute work anchor, only 3 minutes of required rest remain.
- If the user works 10 minutes and goes away for 10 minutes inside the same cycle, the 5-minute rest requirement has already been satisfied. When the user returns, DaD completes that cycle and starts a new work session from the return timestamp.
- If the user works 24 minutes, goes away for 3 minutes, and returns after the work anchor, only 2 minutes of required rest remain, counted from the return timestamp.
- If the user returns before the required rest is satisfied, the original work anchor stays fixed and only the remaining rest is required after work ends.

Pomodoro local history:

- DaD stores bounded local-only Pomodoro history under `pomodoroHistoryState`.
- History is per UTC day and resets when the day changes.
- Today totals include started work sessions, completed work sessions, completed breaks, work time, break time, rest credited while idle/locked, skipped breaks, manual starts, auto starts, continuation starts, and resets.
- A small recent-event list is kept only for diagnostics. It is not synced and is not exported as user configuration.
- The popup and optional page panel use this history to show whether idle/locked rest credit was actually counted.

Optional page mini-panel:

- The browser action popup cannot reliably remain open through Windows lock, browser focus loss, or extension reload.
- The popup can open an on-page Pomodoro mini-panel in the active tab.
- The mini-panel shows the current phase, remaining time, plan, rest credit, rest still needed, and today history.
- The mini-panel is local UI only. It can be dragged, resized, minimized, or closed and does not change the timer by itself.
- The mini-panel remembers its last size, position, and minimized state in `chrome.storage.local` under `pomodoroMiniPanelUiState`. This is local interface state, not sync configuration and not export/import data.
- Resizing should be deliberate and bounded: the panel must stay inside the viewport, keep a useful minimum size, switch to a compact one-column detail layout at narrow widths, and scroll its body when height is constrained.

## Required Tests

Shared model tests:

- Normalize invalid Pomodoro settings.
- Calculate phase end time.
- Transition work -> short break.
- Transition work -> long break after configured cycle count.
- Transition break -> completed, then activity -> next work.
- Reject protection-weakening changes during locked protection.
- Record local activity and classify active/away state.
- Credit idle/locked time during a work phase against the next break, including away time past the work anchor until return.
- Start a fresh work session from the return timestamp when idle/locked rest credit already satisfied the break.
- Record bounded local Pomodoro history totals for completed work, completed breaks, credited rest, skipped breaks, and resets.
- Keep manual pause separate from idle/locked rest credit.

Background tests are harder because of Chrome APIs. Keep most logic in shared helpers so it can be unit-tested without Chrome.

Manual QA:

- Start Pomodoro from popup.
- Refresh page and confirm remaining time persists.
- Reload extension and confirm runtime state resumes correctly.
- Confirm plan disable clears or suspends timer.
- Confirm schedule end clears or suspends timer.
- Confirm blocked page shows remaining time.
- During a strict break, pause and then reset Pomodoro from the popup. Confirm the strict-break overlay disappears and does not restart a work session from immediate page or popup activity. Repeat while a plan schedule is active.
- Lock Windows during a work phase, wait, unlock, and confirm the work anchor stayed fixed while the next break was shortened by the locked time.
- Lock Windows long enough to satisfy the full break, unlock, and confirm the popup starts a new work session from the unlock/return activity time with no growing "rest still needed" value.
- Open the popup mini-panel on a page and confirm it updates through ordinary page use after the popup closes.
- Resize the popup mini-panel smaller and larger. Confirm the content stays readable, switches to compact layout at narrow widths, scrolls internally at short heights, and remains within the viewport.
- Close and reopen the mini-panel. Confirm the last size, position, and minimized state are restored on the same browser profile.
- Confirm export/import includes plan Pomodoro settings but not runtime state.

## Privacy and Storage

Pomodoro configuration is normal user settings.

Runtime state stores:

- active plan id
- phase
- timestamps
- completed work-session count
- optional previous URL for return behavior

Runtime state should remain local. It should not be synced by default.

Pomodoro history is local-only runtime/diagnostic state. It records bounded daily aggregates and recent events; it should not compete with sync quota or forced schedule storage.

Pomodoro mini-panel UI state is also local-only. It stores only size, position, minimized state, and an update timestamp so the on-page timer remains usable after popup closure or page-level reopening.

## Open Questions

- Should breaks allow all browsing, plan allowed sites only, or explicitly configured break sites?
- Should Pomodoro continue if Chrome is closed?
- Should very long away periods start a new work cycle only on explicit activity, or should they require an explicit Start press?
- Should plan schedules auto-start Pomodoro or merely allow it?
- Should strict breaks block work pages, distraction pages, or everything except rest-approved pages?
- Should Pomodoro runtime be per plan only, or can one global Pomodoro run the currently active plan?
