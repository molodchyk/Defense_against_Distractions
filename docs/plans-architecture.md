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

Today, the data model is still mostly global:

- Website groups and keyword rules are global group records.
- Locked schedules are global schedule records.
- Whitelisted websites are global.
- UI element blocking rules are global and independent from plans.
- Password protection and theme settings are global settings.

This works for the current product, but it will become hard to reason about once schedules, allowed websites, UI cleanup, Pomodoro behavior, and different intervention levels need to vary by context.

## Target Model

A plan should be able to own or reference:

- Website groups.
- Keyword groups.
- Allowed websites.
- UI blocked elements.
- Schedules.
- Pomodoro settings.
- Intervention mode.
- Configuration lock rules.
- Diagnostics preferences.

Some settings should remain global:

- Extension UI language.
- Theme mode.
- Password or account-level protection.
- Import/export.
- General instructions.
- Global defaults used when creating a new plan.

## UI Direction

The options page should eventually have a left sidebar with major sections:

- Plans.
- Blocked UI.
- Settings.
- Import and export.
- Help.

Plans should be compact by default. A compact plan row should show:

- Plan name.
- Enabled or disabled state.
- Locked or editable state.
- Active schedule summary.
- Counts for websites, keywords, allowed websites, and UI rules.

Expanding a plan should expose the details. Schedule editing should move into plans instead of remaining a separate global area. Workdays and all-days shortcuts should live in the plan schedule editor.

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
4. Allow plans to reference existing groups and schedules.
5. Move schedule UI into plans.
6. Add allowed websites and UI blocked elements as plan-attachable records.
7. Migrate storage only after the UI and helpers can show both old and new records clearly.

This avoids a brittle one-shot migration and keeps current blocking behavior stable while the product model becomes clearer.

## Open Questions

- Should a website group belong to exactly one plan, or be reusable across plans?
- Should a UI blocked element assigned to a disabled plan become inactive immediately?
- Should allowed websites be global overrides, plan-specific exceptions, or both?
- How should conflicts resolve when one active plan allows something and another blocks it?
- Which plan state should be stored in `chrome.storage.sync`, and which diagnostics should stay local?
