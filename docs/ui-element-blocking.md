# UI Element Blocking

UI element blocking is a cosmetic cleanup feature. It hides page controls or regions that you do not want to see, such as repeated action buttons, sidebars, suggestions, or other distracting interface pieces.

It is separate from keyword blocking and locked schedules. It is not meant to be an enforceable block. It is meant to make websites quieter.

## How To Use It

1. Open the website that contains the UI element.
2. Click the Defense Against Distractions toolbar icon.
3. Choose the matching controls.
4. Click `Pick UI Element`.
5. Hover the page element and click it.
6. Review or adjust the saved rule in the options page under `Blocked UI`.

Press `Esc` while picking to cancel.

## Match Strategy

`Same position in repeated UI` is the default. Use it for rows or cards where the same controls repeat, such as copy / like / dislike buttons under each item. It tries to hide the selected position in each repeated row without hiding neighboring buttons.

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

## Why It Can Be Imperfect

Websites often use generated classes, changing labels, nested SVG icons, and repeated generic buttons. DaD stores a structural fingerprint instead of a single CSS selector, but no automatic fingerprint can always know your intent.

When a rule is too broad or too narrow, adjust strategy, minimum score, ancestor depth, and label match in `Blocked UI`.
