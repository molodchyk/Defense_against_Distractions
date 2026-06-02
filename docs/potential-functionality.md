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
