# Plans Architecture

Plans should become the main user-facing unit of protection in DaD.

The current extension has several useful pieces already: website groups, keyword rules, locked schedules, whitelisted websites, UI element blocking rules, password protection, and UI settings. As the product grows, these pieces need clearer ownership so the options page does not become a collection of unrelated controls.

## Goal

A plan should answer one question:

What protection should be active in this context?

Examples:

- Studying.
- Work.
- Sleep preparation.
- Exam period.
- Emergency hard lock.

## Current State

The options page now treats plans as the main protection surface:

- Website and keyword entries are edited inside plans.
- Plans can still read legacy referenced groups during migration, but the user-facing group editor is retired.
- Plans own allowed websites.
- Plans own their schedules.
- UI element blocking rules remain a global feature, but can be attached to plans.
- Plans own intent-coherence settings.
- Password protection, theme settings, language, import/export, billing, and instructions remain global settings shown in the Settings panel.

The legacy standalone groups, locked-schedules, and whitelist sections are retired from the options page. Existing pre-1.5 `websiteGroups` storage is converted into `group_*` records first, then existing `group_*`, `schedules`, and `whitelistedSites` storage entries are migrated into plans when the options page initializes. Those legacy keys are then cleared so they do not continue acting as hidden global rules. Existing plan records are also normalized on options startup so stale schedule placeholders without selected days are removed from persisted storage, not only hidden from rendering.

## Target Model

A plan should be able to own or reference:

- Website groups.
- Keyword groups.
- Allowed websites.
- UI blocked elements.
- Schedules.
- Pomodoro settings, as defined in [DaD Pomodoro Implementation Spec](pomodoro-implementation.md).
- Intervention mode.
- Configuration lock rules.
- Diagnostics preferences.

Some settings should remain global:

- Extension UI language.
- Theme mode.
- Password or account-level protection.
- Dormant billing/supporter access controls.
- Import/export.
- General instructions.
- Global defaults used when creating a new plan.

## UI Direction

The options page now separates the main surfaces into dedicated sections with a persistent section navigation:

- Plans.
- Blocked UI.
- Intent diagnostics.
- Settings.

The Settings panel owns global controls: UI mode, instruction guide, password management, import/export, and dormant billing/supporter controls. The navigation is a left sidebar on wider screens and collapses into a horizontal section nav on smaller screens.

Plans should be compact by default. A compact plan row should show:

- Plan name.
- Enabled or disabled state.
- Locked or editable state.
- Active/time-block schedule summary.
- Counts for websites, keywords, allowed websites, and UI rules.

Compact plan rows navigate into plan-owned pages instead of expanding inline. `Schedule` opens the weekly schedule editor for that plan. `Entries` opens the plan name, website/keyword entries, allowed websites, and UI-rule assignment controls. Workdays, weekend, all-days, and clear-days shortcuts live in the plan schedule editor.

Destructive plan actions should be explicit and inspectable: plan rows use icon-based delete controls on the left, and deleting a plan, entry, allowed website, or schedule time block uses an in-page confirmation dialog instead of a native browser prompt.

## Schedule Editor Direction

The plan schedule editor uses a weekly grid. Plan schedules are time blocks controlled by the plan; they do not have their own enabled/disabled state in the UI. If the plan is disabled, its time blocks are inert. If the plan is enabled, every complete saved time block can make the plan active.

The schedule data shape stays simple:

- `days`: the columns where the block appears.
- `startTime` and `endTime`: the vertical range in each selected day column.
- `weekInterval`: recurrence interval in weeks. `1` means every week.
- `anchorDate`: the local date used to decide which week starts an every-N-weeks recurrence.
- `isActive`: retained only for legacy compatibility; plan saves normalize it to `true`.

This grid is reused inside each plan schedule page. Existing standalone stored schedules are migrated into the default or first plan and then removed from the legacy `schedules` key.

Schedule grid interaction rules:

- The graph is the primary editor surface and is wide by default.
- The graph can be expanded into a full-page editor when the normal plan page is too cramped.
- A current day/time marker appears in today's column so the user can see where they are in the week.
- Clicking `Add time block` enters create mode but does not persist anything by itself.
- Dragging on empty grid space drafts a new time block for that plan, selects it, and lets the user inspect it before saving it.
- A plain click on empty grid space does not create an empty schedule.
- Dragging inside a day column while a schedule is selected adjusts that schedule's time range. A click below the current block keeps the original start as the anchor and extends the end; a click above the current block keeps the original end as the anchor and extends the start.
- Saved schedule blocks can still be moved or resized directly from their visible block.
- Schedule recurrence supports every N weeks as the first recurrence layer. More expressive recurrence can be added later if needed.
- During an active protected schedule, the schedule graph is read-only: saved blocks remain visible, but add, drag, resize, inspector edits, save, and delete are disabled.
- Pomodoro pause and reset are also refused by the background runtime during an active protected schedule. UI controls mirror that state, but the background guard is the actual enforcement layer.

## Blocked UI Rules

UI blocked elements should remain usable as a separate feature. They do not always need enforcement strength.

However, each blocked UI rule should eventually support:

- Enabled or disabled state.
- Global use with no plan.
- Assignment to one or more plans.
- Transfer into or out of plans.
- Diagnostics showing where it last matched and how many elements it affected.

This keeps casual UI cleanup separate from forced protection while still allowing a plan to include UI cleanup when that helps.

## Storage Priority

Forced schedules and locked plan state must have the highest storage priority.

If storage pressure appears, DaD should preserve mission-critical protection first:

- Locked schedules.
- Locked plan metadata.
- Website and keyword rules required by locked plans.
- Password or protection-lock state.

Lower-priority data can be compacted, disabled, or moved later:

- UI element diagnostics.
- Historical usage stats.
- Non-plan UI cleanup rules.
- Store/debug metadata.

## Migration Direction

The safest path is incremental:

1. Document the plan shape without changing behavior.
2. Add shared helpers that classify existing records by future ownership.
3. Add plan UI shell without moving current records.
4. Allow plans to reference existing groups.
5. Move schedule UI into plans.
6. Move standalone schedules and whitelist entries into plans.
7. Move website and keyword group editing into plans.

This avoids a brittle one-shot migration and keeps current blocking behavior stable while the product model becomes clearer.

## Implemented First Slice

Plans are now stored in `chrome.storage.sync` under the `plans` key. Each plan has:

- `id`
- `name`
- `enabled`
- `groupIds`
- `groups`
- `allowedSites`
- `uiRuleIds`
- `schedules`
- `intent`

If existing users have website groups but no plans, the options page creates a default enabled plan and copies those groups into plan-owned entries. This keeps website and keyword blocking behavior stable while introducing plans as the new control surface.

Content blocking is plan-aware:

- Without plans, DaD keeps using legacy matching groups.
- With plans, DaD scans keywords from plan-owned groups and any remaining referenced legacy groups in active enabled plans.
- A plan with no schedules is active whenever it is enabled.
- A plan with schedules is active only when one of its saved time blocks is currently in effect.
- A plan's allowed websites skip that plan's groups for the matching URL.

UI element blocking is also plan-aware:

- UI rules with no plan assignment remain global.
- UI rules assigned to one or more plans apply only while at least one assigned plan is active.
- The Blocked UI section shows whether each rule is global or plan-scoped, and can assign or unassign rules from plans directly.
- Deleting a UI rule removes its plan assignments so stale plan references do not remain behind.

Intent coherence is plan-aware:

- Active enabled plans contribute intent settings unless the current URL is allowed by that plan.
- Multiple active plans combine conservatively: stronger action and stricter thresholds win.
- A plan can disable intent coherence, show warning only, grayscale a page, show a return prompt, use a modal drift-chain block, or trigger a hard current-page chain quarantine when a block-action session is locked or the current tab is a drift descendant.
- A plan can keep fixed intent thresholds or enable local auto-calibration from bounded intervention feedback. Auto-calibration adjusts the effective intervention threshold only; it does not lower the configured locked threshold.
- Pomodoro work phases can make intent intervention stricter, and Pomodoro break phases can make it more lenient.
- Options exposes local intent diagnostics so score reasons and recent trajectory can be inspected before tuning.

Active enabled plan schedules are treated as protected schedules for configuration locking. Legacy global groups, schedules, and whitelists are only migration inputs after the options page has loaded successfully.

## Open Questions

- Should a UI blocked element assigned to a disabled plan become inactive immediately?
- Should allowed websites be global overrides, plan-specific exceptions, or both?
- How should conflicts resolve when one active plan allows something and another blocks it?
- Which plan state should be stored in `chrome.storage.sync`, and which diagnostics should stay local?
