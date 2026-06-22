# About Defense Against Distractions

Defense Against Distractions is a Manifest V3 browser extension for people who want local, plan-based protection against distracting browser detours.

Most website blockers work by domain: either a site is blocked or it is not. This extension adds another layer by scanning page text for keywords and phrases that you define. That makes it useful for mixed-use sites where some pages are productive and others are distracting.

The core idea is simple:

- Create a plan for a focus context.
- Add website entries, keywords, and optional keyword scores.
- Add allowed websites for pages that should remain usable inside that plan.
- Use schedules, Pomodoro, intent-coherence settings, password protection, and UI cleanup rules when the plan needs more structure.
- Use protected schedules when you want the current rules to be harder to relax during focus time.

The project is local-first. Settings and bounded diagnostics are stored with Chrome extension storage. Page checks, Pomodoro state, intent-coherence diagnostics, and UI cleanup rules run locally in the browser without a remote server for core blocking behavior.

The goal is not to be an all-purpose productivity system. It is a browser defense layer: a way to keep useful sites available while blocking, timing, or cleaning up the parts that tend to pull the session away from the user's chosen direction.
