# UI Element Blocking

UI element blocking is a cosmetic cleanup feature. It hides page controls or regions that you do not want to see, such as repeated action buttons, sidebars, suggestions, or other distracting interface pieces.

It is separate from keyword blocking and locked schedules. It is not meant to be an enforceable block. It is meant to make websites quieter.

## How To Use It

1. Open the website that contains the UI element.
2. Click the Defense Against Distractions toolbar icon.
3. Choose the initial matching controls.
4. Click `Pick UI Element`.
5. Hover the page element and click it to preview the rule. DaD temporarily hides every element the rule would hide.
6. Use the on-page picker panel to tune the rule while the preview is active.
7. Click `Save rule` to save and close the picker, or hold `Shift` and click `Save rule and continue` to save and keep picking.
8. Review, enable, disable, or adjust saved rules in the options page under `Blocked UI`.

Press `Esc` while picking to cancel. Canceling or choosing again restores the temporary preview.

New rules apply to the current host by default, such as `chatgpt.com`, instead of one exact page path. This keeps repeated UI cleanup working when a site changes from one conversation, document, or item page to another.

DaD stores UI element rules as separate sync storage entries instead of one large rule list. This avoids Chrome's per-item sync storage limit as the number of UI rules grows.

UI rules keep a sync storage reserve for locked schedules. Locked schedules are mission-critical, so DaD blocks new or larger UI cleanup rules before they can consume the space reserved for schedule data. If a schedule save still hits sync quota, DaD removes non-critical UI element rules and retries the schedule save. Deleting or shrinking UI rules is still allowed when storage is tight.

## Picker Panel

The picker panel appears on the page and can be dragged by its header.

It shows the currently selected element, the preview count, and the controls that affect the candidate rule. Changing these controls updates the preview immediately.

The picker uses the pointer position, not only the browser click target. That helps with small standalone text such as footers, hints, disclaimers, or inline labels that may not behave like regular clickable elements.

`Target` controls what the rule is built from. `Clicked element` uses the exact element you selected. `Parent`, `Grandparent`, and `Great-grandparent` move the rule upward through the page structure so you can try broader UI regions when one picked control is too narrow.

`Choose again` clears the current temporary preview and lets you select a different element.

`Cancel` closes the picker and restores any temporary preview.

`Save rule` saves the current rule and closes the picker.

Hold `Shift` to change `Save rule` into `Save rule and continue`. This saves the current rule, clears the temporary preview, and keeps the picker open for the next element.

## Picker Mode

`Pick element` makes page clicks select elements for preview.

`Click page` lets clicks pass through to the website. Use it when a target only appears after interaction, such as after opening a menu, expanding a panel, or revealing nested UI.

Hover the `Mode` control and scroll to switch between `Pick element` and `Click page`. This avoids using a normal click to change modes while the picker is intercepting clicks.

## Preview Mode

`Hide matched` shows the page as it would look after saving the rule.

`Outline matched` keeps matched elements visible and draws a contour around them. Use it when hiding would make it hard to inspect what the rule is catching.

Hover the `Preview` control and scroll to switch between `Hide matched` and `Outline matched`.

Outline preview draws independent golden geometry boxes instead of relying only on the website element's own CSS outline. This makes broad containers, clipped regions, text fields, and nested UI easier to inspect.

The preview count updates when the page adds or removes matching elements.

## Match Strategy

`Same position in repeated UI` is the default. Use it for rows or cards where the same controls repeat, such as copy / like / dislike buttons under each item. It tries to hide the selected position in each repeated row without hiding neighboring buttons.

`Same text or label` uses direct visible text and label-like information as the main match. Use it for standalone labels, footer notices, menu items, and navigation entries where the score/depth controls are too blunt and the intended target is the wording itself, such as a `Sent` / `Gesendet` label or a site disclaimer.

`Similar structure` is broader. Use it when the same kind of element appears in several places but not necessarily in the same row position.

`Closest match` is the narrowest. Use it when you only want elements very close to the picked element's exact structure and position.

## Minimum Score

The minimum score decides how similar an element must be before DaD hides it.

Higher values hide fewer elements and are safer. Lower values hide more elements and can catch more variations, but may hide unrelated UI.

If a rule hides too much, increase the score. If it misses similar elements, lower the score.

## Ancestor Depth

Ancestor depth controls how much parent structure must match.

Low values mostly compare the selected element and its closest wrapper. Higher values require more surrounding page structure to match.

If a rule hides similar buttons in unrelated page areas, increase ancestor depth. If it only hides one item and misses repeated items, decrease ancestor depth.

## Label Match

`Prefer label` uses visible text, `aria-label`, `title`, and similar labels when available, but does not require them. This is usually the best default.

`Ignore label` avoids relying on labels. Use it when labels are unstable, translated, personalized, or different across repeated elements.

`Require label` only matches elements with overlapping label information. Use it when labels are stable and you need extra precision.

## Rule Details

`Name` is only for you. Rename rules to describe the intent, for example `ChatGPT response feedback buttons`.

`Enabled` controls whether the rule is active. Disable a rule when you want to keep it for later without deleting its diagnostics and tuning.

`URL pattern` controls where the rule is active. A host-only pattern like `chatgpt.com` applies across that site. A longer path pattern applies more narrowly. Use `Use domain` to reduce a long path to its host.

`Diagnostics` shows the stored fingerprint: tag, role, parent structure, position path, labels, direct text tokens, class tokens, and related details. Use this before deleting or editing a rule so you can see what the rule was created from.

## Why It Can Be Imperfect

Websites often use generated classes, changing labels, nested SVG icons, and repeated generic buttons. DaD stores a structural fingerprint instead of a single CSS selector, but no automatic fingerprint can always know your intent.

When a rule is too broad or too narrow, adjust strategy, minimum score, ancestor depth, label match, enabled state, and URL pattern in `Blocked UI`.
