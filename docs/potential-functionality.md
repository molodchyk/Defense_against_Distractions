# Defense against Distractions: Potential Functionality

This document collects product and implementation ideas for future versions of Defense against Distractions (DaD). Items are grouped by theme, but this is not yet a prioritized roadmap.

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
