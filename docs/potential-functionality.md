# Defense against Distractions: Potential Functionality

This document collects product and implementation ideas for future versions of Defense against Distractions (DaD). Items are grouped by theme, but this is not yet a prioritized roadmap.

See [DaD Protection Model](protection-model.md) for the product model that connects signals, risk scoring, interventions, plans, and locked protection.

## Original Wording (not to be edited)

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
- DaD select (right select) word, add with popup, estimate score, able to disable buttons + block images

Research pipeline infrastructure now lives in [`../research`](../research/README.md). Use it to turn broad research needs into bounded questions, evidence cards, synthesis notes, and implementation handoffs.


- the line that goes at the current day and time at this graph for easy understanding where we are right now in the graph is also needed
schedule should not be enabled or disabled. The plan itself has enabled disabled option. Every schedule should show up on that graph, but if you define start and end times yourself, it won't show up. The option to choose to run it every second week or any whatever week. That schedule graph should be expandable by default, working with a window 1/6 of the size is viscerally painful. Why if you click somewhere two times they disappear and appear again? It is all very painful to use all around. Add time block is like horizontally taking all the space, and is red? Ugly. Add plan is red, refresh export json clear are red too, Configuration at the bottom also has this crazy horizontal fill in line that is ugly.

and the project structure? One folder has like 17 files, each having 500 lines of code? Making it maintainable and modularizable, no?

Doing git push, at least sometimes? Saving critical information and knowledge you get along the way, at least sometimes? Making it easy for me to understand what is exactly being implemented by saving that information as we move as well, in docs?

time away (idle time) should go into rest (pause time). Meaning that if you were ... Look, we start the timer from a time that the work session begins, right? For example user has 25 minutes work 5 minutes rest. That means a 30 minutes block. But if in that block the user takes a 10 minute work then 10 minute rest, that 10 minute rest is already more than 5 minute rest. Meaning, all that rest already happened. If in the same 25 minute work 5 minute rest the user takes 2 minute pause after 20 minute rest, and comes at 25 minutes, he only needs to do 3 minutes rest, you get the formula? And after the mandatory rest, the cycle resets. So it is important to take the work start time as reference point.

if 5 minute rest is already satisfied, the session will start anew once the user comes back, right? Also, popup timer could make it all crystal clear. When it started how much pause already happened, when next pause and so on. So that I don't have to guess right now if it is even correctly implemented or do like secret tests by turning computer off and looking up if it got it all correctly

now what generalizable feature I want: right now we can detect a keyword and then block a page right. But sometimes a keyword just stays. And what we might want, instead of blocking the page, is getting rid of the source or anything else. So if we were able to detect a specific keyword and then click UI button, for example trash can icon, and maybe then also blocking the page just to make sure, that would make it much better.

So because it should be general, it is basically a feature to be able to choose a keyword, set one or several different actions, either press something or whatever, or block the whole page. Be able to also choose the order of actions. Be able to choose the element to be clicked, element to be filled in, or any other action. Now the note I wrote today on morning:


Make a block perform an action (or several) on trigger. For example, detect text in GMail, press delete email button, go to bin and press delete again? And what if it's us who make the email, how do we differentiate against those two scenarios? Be able to do several types - press (perform action) and block page too.

So what I meant by that, let's say we block name surname. But we set the block to remove the received message in one case - and remove the email that we started typing in in another - we should be able to do an action that corresponds with the elements available. So that it recognizes when the email is received, and when to remove the email that we type.

## Blocking Capabilities

- Make blocking resilient against leave-page, unsaved-changes, and similar browser or site warnings that can interrupt navigation away from a blocked page.
- Ensure DaD continues enforcing the block after a warning is accepted, cancelled, repeated, or triggered by an in-progress edit.
- Treat warning resilience as a general blocking-engine requirement, not as website-specific logic.
- Detect and block video elements.
- Detect and block audio elements.
- Add automatic script actions, such as automatically clicking, hiding, or dismissing something on a page.

Clarified future design: [Triggered action chains](triggered-actions.md) generalize keyword blocking and UI cleanup. A block trigger should be able to run one or more bounded ordered actions, such as click once, clear field, pause media, hide element, or block page, with scenario guards that distinguish received content from content the user is composing. This should reuse the existing picker and bounded action model rather than introducing arbitrary JavaScript automation.

Initial implementation note: triggered action chains now have a pure tested core model under `src/features/triggered-actions/core/`, a first content-runtime executor, and a compact Options authoring path. The model defines bounded current-page chain shape, scenario guards, ordered step normalization, explicit fallback behavior, ambiguous-scenario refusal, bounded local outcome events without raw trigger text or URLs, and conservative protected-schedule strictness classification. Plan records now normalize and preserve plan-owned triggered-action chains, locked schedules reject edits that remove, disable, weaken, raise trigger thresholds for active chains, narrow an existing trigger source or trigger id set, or add/enable action-only chains that could suppress normal blocking, and active plan-owned chains can run existing picker-created UI rule targets when a keyword or structural score reaches the block threshold. The plan `Actions` tab can create a simple chain from existing UI cleanup rules with a target-present scenario, one or two ordered bounded actions, an optional absent-target guard for disambiguating page states, optional trigger source and keyword/structural-token filter, optional editable-field trigger-location guard, fallback blocking, and optional block-after-action. The editor can also add one bounded alternative scenario for the same trigger, with its own target rule, action, optional absent-target guard, and optional trigger-location guard, so received-content versus editable-field cases are now authorable from Options without opening arbitrary scripting. Popup Block Diagnostics and the blocked-page overlay now show the latest bounded action outcomes as action/result pairs so the user can see whether cleanup ran, failed, or used fallback blocking without exposing page text, selectors, or full URLs. The content runtime now also has a non-mutating current-page preview message for a chain: it uses the same target matcher and scenario-selection logic as execution, reports bounded status/target/step/would-block diagnostics, and does not click, clear, hide, disable, pause, block, or return page text. The popup Inspect pane exposes this as a current-tab preview for active saved chains, so the user can check whether targets and selected steps line up before relying on the chain. This covers the first live authorable slice of "make a block perform an action or several on trigger", the first specific slice of "choose a keyword, set actions", and the first visible two-state scenario slice; richer app-state guards, broader multi-scenario editing, and Gmail-style authored examples are still follow-up phases.

Initial implementation note: blocked pages now install general navigation guards while the block overlay is active. The guard clears page-owned `onbeforeunload` handlers, suppresses later `beforeunload` prompt handlers without calling `preventDefault`, and immediately reasserts the block overlay and media suspension on focus, visibility, pageshow, popstate, and hashchange. This is the first general slice of leave-page / unsaved-change warning resilience and is not tied to any single website.

Initial implementation note: UI element rules now support bounded `Click once`, `Clear field`, and `Pause media` actions alongside the existing hide action. These actions reuse the existing picker, fingerprint matcher, URL scoping, plan assignment, and sync storage model; when active, `Click once` clicks the first matching enabled element once per page URL, `Clear field` clears the first matching editable text field once per page URL, and `Pause media` pauses playing audio/video on the first matched media element or container once per page URL, then stops so mutation observers cannot create a loop. This covers safe slices of "automatic script feature / automatically click on something", "fill or clear a field", and "stop audio / video from playing" without adding arbitrary JavaScript, stored fill text, broad form filling, stored media content, or repeated automation.

Initial implementation note: page blocking now supports explicit structural keywords such as `has:video`, `has:audio`, `has:audible`, `has:links>=25`, `has:images>=10`, `has:media`, `has:recommendations`, `has:comments`, and `has:shorts`. These are opt-in keyword rules that add the configured score when the current page structure matches, then appear in normal block diagnostics as structural triggers. `has:audible` only counts media elements that are currently playing and not muted or zero-volume. Recommendation, comment, and short-form rules let a plan treat high-lock-in page surfaces as immediate score contributors without turning them into hidden global host blocks. DaD does not automatically treat every media-heavy or feed-like page as blocked.

Initial implementation note: structural keywords now include opt-in time-on-page conditions such as `has:pageSeconds>=120` and `has:activeSeconds>=30`. These use the existing bounded page activity counters to add the configured keyword score after elapsed page time or visible active time crosses the threshold, and they re-check static pages with a small monitor only when a time condition is configured. This covers the first explicit slice of "time in seconds as an additor / multiplier of the score" without adding hidden global time penalties or persistent per-page text storage.

## Block Feedback and Visibility

- Show what triggered a block, including the matched keyword, page section, score contribution, or rule.
- Show video count, image count, audio count, and emoji count in the DaD popup.
- Track URLs, time spent, and words on pages that were subsequently blocked.
- Track URLs, time spent, and words on pages that were not blocked.
- Add a usage stats feature for DaD.

Initial implementation note: the popup now shows current-tab image, video, audio, currently audible media, GIF, emoji, link, and passive recommendation/comment/short-form region counts from the local page-signal collector. It also shows current open-tab and browser-window counts using an aggregate runtime query. This covers the first visible slice of "show video count image audio emoji on popup DaD", "detect video elements with DaD aud Audio", and "amount of tabs open" without storing raw URLs, media URLs, media titles, page selectors, tab titles, or tab identities.

Initial implementation note: intent coherence now uses the same aggregate open-tab/window pressure as a bounded local fragmentation signal. The scorer applies only a small penalty after open-tab pressure is already high, and diagnostics expose aggregate counts and pressure load without storing tab URLs, tab titles, or tab identities.

Initial implementation note: intent coherence now records a bounded recent active-tab history using only ephemeral tab IDs and activation timestamps. The scorer turns that into recent switch count, switch velocity, and short A/B tab-loop pressure so rapid tab hopping can make the chain stricter without storing tab URLs, tab titles, or page content.

Initial implementation note: intent coherence now detects same-page loopiness from existing visit and top-frame transition summaries. Repeated reloads, immediate same-page revisits, and repeated browser back/forward transitions raise a navigation-loop load that can make the chain stricter and appear in popup/options diagnostics.

Initial implementation note: DaD now keeps bounded local hostname-level usage aggregates under `usageStats` and exposes them in an options-page Usage panel plus a compact popup Today usage card in the Inspect pane. The first slice tracks visits, active time, dwell time, maximum observed open-tab/window counts, and maximum observed media/UI/page-structure counts. A follow-up slice classifies local aggregates by blocked versus allowed observations; if a page context is first observed as allowed and later becomes blocked, its already-recorded visit time and page word count move into the blocked bucket so stats can distinguish pages that were subsequently blocked from pages that stayed allowed. Usage summaries now derive blocked outcome shares for visits, active time, and page words from those existing aggregates, and the popup/options/export surfaces include a compact blocked-share readout so the user can see what portion of local activity ended up blocked without storing new browsing records. It intentionally stores word counts only, not the words themselves, raw page text, full URLs, page titles, topic tokens, tab URLs, tab titles, or tab identities. Users can clear the local stats or export a local JSON snapshot from Options, while the popup stays read-only and shows only compact local aggregates.

Initial implementation note: DaD now records bounded local post-intervention outcomes for intent feedback. After a feedback action, the next observed same-tab or same-session page visit can annotate that feedback with only the observed risk state, coherence score, score delta, and whether it returned to the recorded recovery hostname. Options diagnostics summarize recovery rate, return-host rate, average score delta, and Continue-specific observed/recovered/drift-after-Continue rates with average Continue score delta, so DaD can start answering what works and what does not without storing follow-up URLs, titles, page text, or topic tokens. When observed outcomes repeatedly fail and local auto-calibration is enabled, DaD also makes the effective policy stricter by intervening earlier and moving warning/grayscale/reduce-noise one action step closer to prompt, capped before automatic hard blocking.

Initial implementation note: the popup Session coherence card now shows a compact effective policy row beside origin/current/last-coherent/drift details. This makes local calibration visible where the recovery actions live, including threshold changes, one-step action escalation, and the number of observed outcomes behind the adjustment.

Follow-up implementation note: the popup Session coherence card now separates active intervention status from durable policy. The Intervention row shows whether the current page has no active intervention, a prompt/grayscale/reduce-noise/block action, or a hard chain quarantine with auto-return/auto-close cooldown state; the Policy row remains focused on the configured effective threshold and calibration.

Follow-up implementation note: the popup Session coherence card now includes a compact bounded session path. It keeps origin, first drift when present, recent steps, and the current page visible next to recovery actions, marking origin/current/first-drift/drift-descendant states without exposing full URLs, selectors, page text, or tab identities.

Follow-up implementation note: the popup Session coherence card now includes accountable Continue for active prompt-style intent interventions. Continue is disabled until the user enters a short bounded reason, then the popup asks the content script to dismiss the current prompt-style intervention through the same local feedback path used by the on-page prompt. Hard chain quarantine remains non-continue and still offers Return, Return chain, delayed Isolate, and drift-tab cleanup instead.

Initial implementation note: keyword block diagnostics now expose a normalized 0-100 score in the popup and blocked-page overlay while preserving the legacy 1000-point raw score in popup diagnostics for compatibility. The popup Block Diagnostics card also shows a bounded recent contributor trail from the page-local trigger history, listing the latest score contributions and how many earlier contributors are omitted, without adding persistent browsing storage. The plan keyword editor accepts explicit 100-point authoring syntax such as `50/100` or `50%`, compiling it to the existing legacy score internally so old stored rules keep their behavior. This is the first non-breaking slice of "DaD reduce max score to 100?"; the global blocking threshold is still the legacy 1000-point threshold until a deliberate migration is designed.

Initial implementation note: intent coherence now builds a weighted local metadata vector from URL/host path tokens, title tokens, search-query tokens, H1/H2 heading tokens, meta-description tokens, clicked-link tokens, and selected-text tokens captured after a click. The scorer uses weighted similarity when both visits have the richer vector, while preserving the existing flat token arrays for compatibility. This covers the local "search/topic signals without AI" slice without storing raw headings, descriptions, clicked text, selected text, or page text.

Initial implementation note: intent coherence now derives a search-refinement loop load from bounded search-query token sets already stored for local similarity. Repeated returns to search with disconnected query tokens can make a chain stricter and appear in popup/options diagnostics, while connected search refinements stay low-pressure. This covers the "repeated search cycles" and "search query continuity" slice without storing raw query strings.

Initial implementation note: intent coherence now calculates bounded origin-anchor confidence from local search/title/heading/description/clicked-link/selected-text/text-token and input-count summaries. Weakly anchored sessions reduce confidence in origin-mismatch scoring; they only become an explicit unanchored-session pressure when the chain is also passive or fragmented, matching the ambiguous-intent design without asking the user to write a goal.

Initial implementation note: intent coherence now records direct-navigation evidence from typed, bookmark, keyword/search, form-submit, and address-bar transitions. Direct navigation strengthens the origin anchor and can add a small latest-page recovery signal only when passive media, recommender, feed/comment, loop, stale-control, origin-decay, and unanchored pressures are low, so manual navigation is inspectable without becoming a bypass.

Initial implementation note: intent coherence now tracks sustained origin decay across recent visits, not only the current page's origin overlap. The origin-decay load rises when a strong-origin chain stays low-overlap with its origin and is also passive, recommender-driven, loop-like, or stale-control, while connected low-passive reading stays low-pressure.

## Configuration and Sharing

- Create a website for sharing DaD configurations and voting on them, likely on `molodchyk.com`.
- Add upvotes for shared DaD configurations.
- Support importable/shared community rulesets.
- Sync DaD settings and configuration across all user devices.
- Investigate machine learning based on blocked keywords.
- Consider whether DaD should save learned or suggested keywords.
- Consider migrating the maximum keyword block score threshold from the legacy 1000-point scale to a 100-point scale.

Initial implementation note: locked schedules now use a shared protected-plan strictness check instead of a blanket edit freeze. During a locked schedule, DaD can save stricter entry, UI cleanup, Pomodoro, and intent changes, while rejecting plan disablement, allowed-site additions, rule removals, active UI cleanup rule disable/delete actions, weakened keywords, relaxed Pomodoro, and relaxed intent settings. This covers the first concrete slice of "calm configuration vs hot-state override" without claiming to detect whether the user is lying.

Initial implementation note: Settings export now writes a versioned DaD configuration JSON payload instead of a raw sync-storage dump, and Settings import accepts both that payload and legacy raw sync exports. Import replaces only recognized user-configuration keys such as plans, legacy groups/schedules/whitelist entries, UI element rules, blocked-page settings, theme, and UI language. It ignores diagnostics, runtime state, release-notice stamps, billing identity/entitlement, and encrypted password data, and it is disabled during active protected schedules so importing cannot become a hot-state relaxation path. This is the first local slice toward importable/shared configurations without adding a community sharing service yet.

Initial implementation note: Settings can also export a local `dad.ruleset.v1` ruleset JSON for sharing only protection rules: plans, legacy groups/schedules/allowed sites, and UI cleanup rules. Ruleset import replaces that rule subset while preserving local UI preferences, the blocked-page note, passwords, billing state, runtime state, usage stats, and diagnostics. This makes configurations shareable as files without adding the future community website, uploads, moderation, or upvotes yet.

Initial implementation note: the popup Page Signals card now derives non-persistent keyword ideas from the current page's bounded top-text, heading, description, selected-text, and clicked-link tokens. The user can copy those ideas as keyword-editor lines such as `token, 25/100`; DaD does not automatically save them, add them to a plan, upload them, or store them in usage stats. This is a local, deterministic first slice of "save/suggest keywords" without claiming machine learning or server-backed community rules.

Initial implementation note: [DaD Select quick add](selected-text-quick-add.md) turns user-selected page text into a popup-based keyword creation flow with an editable score estimate and optional bounded action presets such as hide images or disable controls. The popup path reads the active selection through page signals, and the right-click path uses the audited `contextMenus` permission to hand an explicit selected-text candidate to the popup without saving a rule until the user confirms it.

## User Interface

- Create a tabbed interface for DaD.
- Let users choose the interface language, with an option to follow the system language.
- Customize the blocked page.
- Add a "send feedback" button.
- Continue modularizing DaD internals.

Initial implementation note: the popup now uses a semantic two-pane tablist for Control and Inspect. The tabs expose `role="tablist"`, `role="tab"`, `aria-selected`, `aria-controls`, and matching tabpanels, and the popup shell supports Arrow, Home, and End keyboard navigation. This covers the first direct popup slice of "DaD make tabbed interface" while keeping the always-visible Protection status card outside the pane switcher.

Initial implementation note: UI language now includes direction handling for right-to-left locales. Arabic, Persian, Hebrew, and Urdu set `dir="rtl"` on extension pages, while injected extension-owned surfaces such as the block overlay, intent prompt, UI picker, and Pomodoro mini panel get their own `lang` and `dir` attributes without changing the host page direction.

Follow-up implementation note: the popup now remembers the last selected Control/Inspect pane in local extension storage and restores it on the next popup open. This keeps inspection workflows from resetting to Control every time while preserving Control as the safe fallback for invalid stored values.

Initial implementation note: the popup Session coherence card now groups recovery actions by scope: primary Return/Return chain actions first, current-page decisions second, and drift-tab cleanup last. This keeps the destructive Close drift tabs action visually separated while preserving existing button IDs, keyboard-accessible groups, and event behavior.

Initial implementation note: the popup Intent Diagnostics panel now includes a compact score-signal breakdown for origin/local similarity, passive pressure, agency, and navigation pressure before the reason list. This covers a direct slice of the intent-system "score breakdown" requirement without exposing page text, selectors, full URLs, or tab identities in the popup.

Initial implementation note: grayscale is now available as a reversible intent-coherence intervention action in plan intent settings. It desaturates the current drift page while keeping recovery controls available, and clears when the intervention is dismissed, isolated, returned, or no longer active.

Initial implementation note: intent coherence now also has a reversible "hide feeds and comments" action in plan intent settings. While active, it hides bounded recommendation, feed, related-content, shorts/reels, and comment containers using local DOM selectors, then restores them when the intervention clears. This covers the first element-level slice of "remove some UI element" and the intent-system "hide recommendation areas / hide comments / collapse feed areas" direction.

Initial implementation note: DaD now includes a narrow built-in cosmetic cleanup for ChatGPT message action controls. On `chatgpt.com` and `chat.openai.com`, it hides known repeated message action buttons such as copy, good/bad response, share, more actions, and report controls when they are scoped to a message container. This covers the first direct slice of "DaD block ChatGPT upvote, downvote, share, copy, report buttons under each message" without treating ChatGPT itself as blocked and without storing page text.

Initial implementation note: intent intervention buttons now record bounded local feedback actions (`acknowledge`, `continue`, `isolate`, `markCoherent`, `return`) in the intent diagnostics state. This creates the local calibration data needed to evaluate what interventions work.

Initial implementation note: DaD now has explicit local coherent-mark feedback. The popup Session coherence card includes a `Mark coherent` action, and the existing prompt `Trust this shift` path records the same bounded feedback action. Both use the existing isolate/new-session machinery to make the current page the clean local baseline without adding an allowlist, trusting a domain globally, or relaxing locked plan settings.

Initial implementation note: return-style intent prompts now require a short reason before Continue is enabled. The reason is normalized, length-capped, stored locally with the feedback entry, and summarized as a continue-reason count in diagnostics. Continue choices are also summarized separately when later bounded outcomes are observed, so diagnostics can distinguish recovered Continues from drift-after-Continue patterns. This is the first accountable-continue slice for later truthful/destructive-use diagnostics.

Follow-up implementation note: the popup Session coherence card now uses the same accountable Continue rule for prompt-style active interventions: a compact reason field appears only when Continue is allowed, and hard chain quarantine cannot be continued from the popup.

Initial implementation note: intent prompts and the popup Session coherence card now include a Show graph action that opens the Options-page Intent diagnostics panel. That panel now renders a bounded local intent chain graph from existing trajectory visits and tab-lineage metadata, covering the first direct slice of the intent-system "show graph" prompt action without adding a second graph surface.

Follow-up implementation note: on-page intent prompts now show the concrete Last coherent recovery target and, when known, the First drift point between the Origin and Current rows. This makes the Return action explain where it will go and identifies where the chain first detached before the user clicks a recovery action, without exposing paths, queries, raw page text, or stored browsing history beyond the existing bounded visit label.

Initial implementation note: the local intent chain graph now labels visits as coherent, uncertain, drift point, or drift descendant. This makes the "where did I start getting lost?" diagnostic explicit in the graph data model and Options rendering instead of relying only on a first-drift hostname field.

Follow-up implementation note: Options Intent diagnostics now summarize which hosts most often appear as coherent visits or drift descendants in the current bounded trajectory. Both summaries count normalized hostnames only, cap the list, and strip paths, queries, titles, page text, and topic tokens. This covers the first inspectable slice of "which domains are often coherent" and "which domains often become drift descendants" without turning diagnostics into browsing history.

Initial implementation note: intent coherence now tracks return-to-origin and return-to-hub behavior as bounded session metrics. Low-return load only contributes to the score after a chain has enough visits and is already fragmented by domain changes or branching, so it amplifies trajectory drift without punishing ordinary linear reading.

Initial implementation note: active non-warning intent interventions now pause link gestures that would open new tabs from the drift page, including target-blank links, modifier-clicks, middle-clicks, and matching Enter gestures. This covers the first reversible slice of "freeze opening new tabs from current page" / "block new child tabs from drift page" without closing tabs automatically.

Initial implementation note: the prompt and popup can now move other same-chain drift-descendant tabs into a separate browser window. This covers the first explicit containment slice of "move drift descendants to separate window" while preserving tab lineage and avoiding automatic redirects or current-tab closure.

Initial implementation note: intent diagnostics now summarize feedback into return/isolate/continue/dismiss rates, continue-reason count, an average intervention score, and a conservative calibration diagnostic. Plan intent settings can now enable local auto-calibration, which adjusts the effective intervention threshold after enough feedback while keeping the configured locked threshold fixed.

Initial implementation note: intent coherence now exposes hard chain-quarantine decision metadata for active plan policies that use `block`. Locked sessions and drift-descendant tabs get a non-continue current-page overlay with Return and explicit Isolate recovery actions. Isolate is delayed by a stable cooldown that does not reset on repeated page-signal reports. The overlay can now return, suspend, or close other open same-chain drift-descendant tabs; after the hard-quarantine cooldown, DaD can automatically return the current tab and known same-root drift descendants to the last coherent page. Plans can also opt into a stricter hard-quarantine mode that automatically closes the current quarantined tab after the cooldown instead of returning it.

Initial implementation note: the popup Session coherence card and hard-chain prompt now include an explicit Return chain action. It returns the current tab and other known same-chain drift-descendant tabs to the last coherent page together, using the existing bounded lineage model and requiring a user click for immediate recovery. The popup card also shows the count of known same-chain drift descendant tabs so Return/Move/Suspend/Close drift-tab actions have visible scope before the user clicks them, and it visually marks Close drift tabs as the destructive cleanup action. Hard chain quarantine can perform the same current-tab-plus-known-descendants return automatically after its cooldown, or automatically close the current quarantined tab when a plan explicitly enables that stricter setting. This improves chain-level recovery while keeping destructive automatic closure opt-in.

Follow-up implementation note: the hard-chain on-page prompt now receives count-only same-chain tab scope from the background intervention response and shows a `Drift tabs` row before cooldown and cleanup actions. The row says how many other known drift-descendant tabs are affected by Return/Move/Suspend/Close drift-tab actions and clarifies that Return chain also affects the current tab, without exposing tab IDs, URLs, titles, paths, queries, selectors, or page text.

Initial implementation note: block-style intent interventions now pause and mute page media while the intervention overlay is active, then restore media state after the intent intervention clears unless the keyword blocker owns the page block. This covers the first intent-coherence slice of "stop audio / video from playing" without treating every media page as forbidden.

Initial implementation note: the popup header now has an explicit Feedback action that opens the DaD GitHub issue tracker, alongside a clearer Options action. This covers the first direct slice of "create send feedback DaD button" without collecting or uploading diagnostics automatically.

Initial implementation note: the popup Inspect pane now has a `Copy + Feedback` action. It refreshes and copies the local diagnostics snapshot to the clipboard, then opens the feedback issue tracker only after the copy succeeds. This keeps diagnostic sharing user-controlled: DaD prepares the data locally, but the user still chooses what to paste or submit.

Initial implementation note: Settings now includes a bounded custom blocked-page note. The note is stored in Chrome sync storage, rendered with `textContent`, and shown on both the extension blocked page and the in-page blocking overlay. This covers the first direct slice of "customize blocked page DaD" without introducing custom HTML, remote assets, or relaxed blocking behavior.

Initial implementation note: the plan schedule graph now renders a current-time marker on the current day column with a visible `Now HH:MM` label. The marker position is calculated by the shared schedule-grid model and covered by tests, so the board can show where the user is in the week without adding more schedule-editor state.

Initial implementation note: plan Schedule pages now open the weekly graph in the wide full-page editor by default. Closing the wide graph keeps it compact only for that plan during the current Options session, and `Open wide graph` restores the large editor. This addresses the original schedule-graph usability issue without adding another persisted schedule setting or reintroducing standalone schedules.

Initial implementation note: shared schedule summaries now default to plan-style time-block wording instead of enabled/disabled schedule wording. Plan-owned schedules are controlled by the plan's enabled state; individual saved time blocks do not have their own enable/disable control in the UI. Legacy enabled/disabled summary wording remains available only as an explicit helper option for old diagnostics.

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

Initial implementation note: intent coherence now derives a bounded long-session load from total session dwell/active time only when existing passive or drift-context pressure is present. Long focused reading or active input does not become suspicious merely because it is long, while a long passive feed/media/search-loop chain can surface in scoring and diagnostics as persistent drift pressure.

Initial implementation note: intent coherence now derives session age, deliberate-action gap, visits since the last search/input/edit signal, and a deliberate-staleness load from existing bounded visit metadata. The staleness load only rises when the post-deliberate chain is mostly passive, so long connected reading is not penalized for lacking typing.

Initial implementation note: intent coherence now also records bounded scroll distance, scroll/click/key/input velocity, and scroll-direction reversals as local rate and movement signals. Repeated up/down scanning and long scroll travel can strengthen passive interaction pressure without storing scroll positions. These rates help distinguish slow reading from rapid interaction loops without storing raw input.

Initial implementation note: page-signal activity now records bounded active editable-field focus duration alongside key/input counts. Intent coherence uses this as an active-input and deliberate-agency signal, but stores only duration and counts, not typed values, field labels, selectors, focused element identity, or raw input.

Initial implementation note: page-signal activity now records bounded dynamic-content growth counts and separately counts DOM append batches that happen shortly after scrolling. Intent scoring exposes this as a small dynamic-content load so infinite-scroll continuation can contribute to drift diagnostics without storing added node text, selectors, raw page content, or scroll positions.

Initial implementation note: intent coherence now calculates an agency ratio from bounded local event counts and active input duration. Key/input activity and active editable-field focus count as deliberate action, while scroll/click/recommender-click/media-play pressure counts as passive selection pressure; low-agency load only applies after enough interaction volume exists, so quiet pages are not punished for having no typing.

Initial implementation note: intent coherence now records aggregate recommendation/feed click counts and rates. This supports the "algorithms / feeds / recommender-driven drift" direction without storing clicked text or raw selectors.

Initial implementation note: page-signal activity now separates generic and site-specific recommendation-zone detection into `src/js/content/page-signals/recommenderZones.js`. The first site-specific slice recognizes common YouTube, Reddit, X/Twitter, Instagram, and Facebook feed/recommendation/comment/reels areas as recommendation-driven click context while preserving bounded counts only. A follow-up slice classifies those local clicks as recommendation, feed, or comment interactions, keeps the aggregate recommender count for compatibility, and exposes a feed/comment interaction load in intent diagnostics and scoring. A later generic heuristic now also counts clicks inside repeated thumbnail/card grids as feed interaction while avoiding repeated plain navigation lists.

Initial implementation note: intent coherence now records bounded visible media playback activity: visible audio/video playback time plus play/pause/end counts, transient media source-change counts, and rates. The scorer uses sustained playback and repeated media progression as passive media pressure, and diagnostics can show playback duration and progression counts without storing media URLs, source strings, captions, titles, or raw content. This covers the first direct slice of "video play/pause", "time spent on passive media", "autoplay progression", and "amount of media presented and changed through" in the intent model.

Initial implementation note: intent coherence now detects repeated passive media chains across recent visits. The media-chain load requires a run of media visits plus contextual drift pressure such as origin decay, recommender clicks, low agency, stale-control, navigation-loop, or unanchored-session pressure, so a single coherent tutorial video is not treated as a chain by itself.

Initial implementation note: page-signal collection now counts bounded recommendation, comment, and short-form media regions separately from generic feed count. Intent scoring treats those counts as passive structure pressure only within a bounded load, diagnostics show the compact passive-region counts, and usage stats keep only maxima. This covers a concrete slice of "comment sections", "recommendation areas", and "shorts/reels" without storing selectors, raw DOM, comments, recommendations, or page text.

Initial implementation note: Pomodoro status now exposes the timing explanation the popup depends on: work start, next break, required rest, when system away/locked rest credit started, rest already credited, and rest still needed. The popup and in-page mini timer both use the shared status fields so the user can see why a break is shortened or skipped after being away.

Follow-up implementation note: Pomodoro status now explicitly marks when away/locked rest credit has already satisfied the required break while the runtime is still in a work phase. The popup, Options plan Pomodoro runtime panel, and in-page mini panel show that state as Rest satisfied instead of ordinary work time, with the existing return-behavior row explaining that new work starts on activity.

Initial implementation note: the popup now includes a local Focus state control with Calm, Strained, and Vulnerable states, and the top Protection status card summarizes the active Focus state beside page, timer, and intent protection. Strained and Vulnerable expire automatically and only raise intent intervention thresholds; they do not relax plan settings or upload telemetry. This covers the first direct slice of "mental state score" as a user-owned strictness signal instead of an inferred judgment.
