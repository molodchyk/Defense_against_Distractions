# Defense against Distractions: Potential Functionality

This document collects product and implementation ideas for future versions of Defense against Distractions (DaD). Items are grouped by theme, but this is not yet a prioritized roadmap.

See [DaD Protection Model](protection-model.md) for the product model that connects signals, risk scoring, interventions, plans, and locked protection.

## Original Wording

This section preserves the original phrasing of ideas before they are clarified or grouped below.

- create block UI feature in DaD
- website for sharing DaD configs and upvotes molodchyk.com
- usage stats feature DaD
- make be able to see what triggered the block in DaD
- create automatic script feature in DaD (automatically click on something)
- block elements in DaD
- detect video elements with DaD aud Audio
- customize blocked page DaD
- show video count image audio emoji on popup DaD
- dadwin pomodoro feature (Defense against distractions windows)
- create send feedback DaD button
- create a windows application for DaD
- DaD block ChatGPT upvote, downvote, share, copy, report buttons under each message
- make choose interface language in DaD (or system)
- DaD stats: URLs, time, words on pages that were subsequently blocked and on pages that were not
- machine learning on blocked key words, save keywords on DaD?
- DaD reduce max score to 100?
- modularize DaD
- DaD make tabbed interface
- sync across all devices feature
- consult research on unhealthy internet usage and mechanisms of it, potential interventions, dopaminergic lock in, failure points, signs, and context (text, audio, algorithms, video) that is most triggering of this. Context: software to defend / prevent it proactively)
- detect / predict when the user lies / most destructive and when the user is truthful /most constructive and when we can trust them to change the configuration / problematic usage detection and combating it
- the doc with research questions and questions on what research is needed and what behavior is likely / doc with research
- instead of only blocking, be able to perform different actions - remove some UI element, click or fill in something stop audio / video from playing
- time ( in seconds) as an additor / multiplyer of the score ? websites such as xnxx / nhentai should trigger most likely immediately (research what gives off their dopaminergic quality / what we could use;  persistant score change?
- collect crucial data to improve the product
- opt out - 2 € monthly plan (premium)
- 30 € - lifetime
- mental state score
- amount of tabs open
- listen to input -- scroll, scroll speed, amount of media presented and changed through, clicks and typing, longevity of sessions, machine learning on text and text recognition
- amount of links on the website to contribute to the score
- pomodoro timer in DaD: track how long is chrome open, research way to count time away, let user set work time / rest time / how often is bigger rest and amount of time for it, have the timer on the blocked page and let that page go back without headache once the timer is up
- schedule UI like in Cold Turkey. + workdays + all days checkboxes. Schedule for different plans. Plan - combine groups. Enable / disable a plan feature
- feature to collect usage data + also for feedback to know what works and what doesn't work
- local usage stats, detect and save text, amount of UI elements, amount of video / audo / GIFs
- be able to choose extension's UI language- either system or from a list of available languages
- DaD plans to have allowed websites and UI blocked elements. Ability to transfer blocked UI elements from and to plans, blocked UI section to remain without plans, but those entries should be able to be toggled active / inactive meaning - enabled / disabled, and to be transferrable to plans. Plans to be expandable with a button, and by default to be compact, showing basic info such as the name of the plan, enabled / disabled, and some other. Schedules section to transfer completely to plans and reimagined (UI-wise)
- passwords, UI toggle, Anleitung, all of this to be transferred to settings section. Likely in a left sidebar section "Settings" and the default one be like either Plans or Block be called
- DaD algorithm could save keywords it finds on websites and proactively suggest other keywords based on if those appear only on blocked websites, employ machine learning
- grayscale on websites
- establish research pipeline


- the line that goes at the current day and time at this graph for easy understanding where we are right now in the graph is also needed
schedule should not be enabled or disabled. The plan itself has enabled disabled option. Every schedule should show up on that graph, but if you define start and end times yourself, it won't show up. The option to choose to run it every second week or any whatever week. That schedule graph should be expandable by default, working with a window 1/6 of the size is viscerally painful. Why if you click somewhere two times they disappear and appear again? It is all very painful to use all around. Add time block is like horizontally taking all the space, and is red? Ugly. Add plan is red, refresh export json clear are red too, Configuration at the bottom also has this crazy horizontal fill in line that is ugly.

and the project structure? One folder has like 17 files, each having 500 lines of code? Making it maintainable and modularizable, no?

Doing git push, at least sometimes? Saving critical information and knowledge you get along the way, at least sometimes? Making it easy for me to understand what is exactly being implemented by saving that information as we move as well, in docs?

time away (idle time) should go into rest (pause time). Meaning that if you were ... Look, we start the timer from a time that the work session begins, right? For example user has 25 minutes work 5 minutes rest. That means a 30 minutes block. But if in that block the user takes a 10 minute work then 10 minute rest, that 10 minute rest is already more than 5 minute rest. Meaning, all that rest already happened. If in the same 25 minute work 5 minute rest the user takes 2 minute pause after 20 minute rest, and comes at 25 minutes, he only needs to do 3 minutes rest, you get the formula? And after the mandatory rest, the cycle resets. So it is important to take the work start time as reference point.

if 5 minute rest is already satisfied, the session will start anew once the user comes back, right? Also, popup timer could make it all crystal clear. When it started how much pause already happened, when next pause and so on. So that I don't have to guess right now if it is even correctly implemented or do like secret tests by turning computer off and looking up if it got it all correctly

## Blocking Capabilities

- Make blocking resilient against leave-page, unsaved-changes, and similar browser or site warnings that can interrupt navigation away from a blocked page.
- Ensure DaD continues enforcing the block after a warning is accepted, cancelled, repeated, or triggered by an in-progress edit.
- Treat warning resilience as a general blocking-engine requirement, not as website-specific logic.
- Detect and block video elements.
- Detect and block audio elements.
- Add automatic script actions, such as automatically clicking, hiding, or dismissing something on a page.

## Block Feedback and Visibility

- Show what triggered a block, including the matched keyword, page section, score contribution, or rule.
- Show video count, image count, audio count, and emoji count in the DaD popup.
- Track URLs, time spent, and words on pages that were subsequently blocked.
- Track URLs, time spent, and words on pages that were not blocked.
- Add a usage stats feature for DaD.

Initial implementation note: the popup now shows current-tab image, video, audio, GIF, emoji, and link counts from the local page-signal collector. This covers the first visible slice of "show video count image audio emoji on popup DaD" without storing telemetry.

Initial implementation note: DaD now keeps bounded local hostname-level usage aggregates under `usageStats` and exposes them in an options-page Usage panel. The first slice tracks visits, active time, dwell time, maximum observed open-tab/window counts, and maximum observed media/UI/page-structure counts. It intentionally does not store raw page text, full URLs, page titles, topic tokens, tab URLs, tab titles, or tab identities. Users can clear the local stats or export a local JSON snapshot for inspection.

## Configuration and Sharing

- Create a website for sharing DaD configurations and voting on them, likely on `molodchyk.com`.
- Add upvotes for shared DaD configurations.
- Support importable/shared community rulesets.
- Sync DaD settings and configuration across all user devices.
- Investigate machine learning based on blocked keywords.
- Consider whether DaD should save learned or suggested keywords.
- Consider reducing the maximum score threshold to 100.

## User Interface

- Create a tabbed interface for DaD.
- Let users choose the interface language, with an option to follow the system language.
- Customize the blocked page.
- Add a "send feedback" button.
- Continue modularizing DaD internals.

Initial implementation note: grayscale is now available as a reversible intent-coherence intervention action in plan intent settings. It desaturates the current drift page while keeping recovery controls available, and clears when the intervention is dismissed, isolated, returned, or no longer active.

Initial implementation note: intent intervention buttons now record bounded local feedback actions (`acknowledge`, `continue`, `isolate`, `return`) in the intent diagnostics state. This creates the local calibration data needed to evaluate what interventions work.

Initial implementation note: intent diagnostics now summarize that feedback into return/isolate/continue/dismiss rates, an average intervention score, and a conservative calibration diagnostic. Plan intent settings can now enable local auto-calibration, which adjusts the effective intervention threshold after enough feedback while keeping the configured locked threshold fixed.

Initial implementation note: intent coherence now exposes hard chain-quarantine decision metadata for active plan policies that use `block`. Locked sessions and drift-descendant tabs get a non-continue current-page overlay with Return and explicit Isolate recovery actions. Isolate is delayed by a stable cooldown that does not reset on repeated page-signal reports. Closing/suspending all descendant tabs remains future work.

## Ecosystem and Platforms

- Create a Windows application for DaD.
- Create DadWin, a Windows-focused Defense against Distractions app.
- Add a DadWin Pomodoro feature.

## Open Questions

- Which features should remain browser-extension only, and which should belong to a Windows app?
- Should machine learning features run locally only, or can they use a server?
- What data should usage stats store, and what should never be stored for privacy reasons?
- Should community configurations be moderated before appearing on a sharing website?
- Should the blocking score remain at 1000 for compatibility, or should the product migrate to a 100-point model?

Initial implementation note: intent coherence now records page dwell time and active visible page time as bounded local signals. Sustained active time on passive/high-pressure pages can reduce coherence, while constructive reading/input can still count as a recovery signal.

Initial implementation note: intent coherence now also records bounded scroll, click, key, and input velocity as local rate signals. These rates help distinguish slow reading from rapid interaction loops without storing raw input.

Initial implementation note: intent coherence now records aggregate recommendation/feed click counts and rates. This supports the "algorithms / feeds / recommender-driven drift" direction without storing clicked text or raw selectors.
