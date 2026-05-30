# About Defense Against Distractions

Defense Against Distractions is a Manifest V3 browser extension for people who want a stricter, text-aware way to stay focused online.

Most website blockers work by domain: either a site is blocked or it is not. This extension adds another layer by scanning page text for keywords and phrases that you define. That makes it useful for mixed-use sites where some pages are productive and others are distracting.

The core idea is simple:

- Choose websites where distraction checks should run.
- Add keywords or phrases that represent distracting content.
- Give keywords optional scores when you want softer or stricter matching.
- Use locked schedules when you want your own rules to be harder to relax during focus time.

The project is intentionally small and local-first. Settings are stored with Chrome extension storage, the extension has no build step, and the source is organized around the extension pages, background worker, content scanning, and shared helpers.

The goal is not to be an all-purpose productivity system. It is a focused tool for reducing the kinds of page-level distractions that domain-only blockers can miss.
