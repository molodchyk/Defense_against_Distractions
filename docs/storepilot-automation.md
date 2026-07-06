# StorePilot Automation

This document maps the current Chrome Web Store automation inputs to the StorePilot project reference.

Reference source: `C:\Users\molod\Documents\Personal\settings\StorePilot\docs\reference.md`.

## Direct Listing Files

StorePilot detailed-description bodies live in:

- `store/store-listing/<locale>.txt`

These files are direct Chrome Web Store Detailed description bodies. They must remain plain `.txt` files with no Markdown headings, no Chrome Web Store dashboard field labels, no title line, and no short-summary paste at the top. Each `_locales/<locale>/messages.json` directory has a matching `store/store-listing/<locale>.txt` file.

The canonical footer remains:

```text
GPL-3.0 license:
https://github.com/molodchyk/Defense_against_Distractions
```

## Privacy Form

StorePilot privacy answers live in:

- `docs/chrome-web-store-privacy-form.md`

The document owns the `[privacy]` block and canonical StorePilot keys. Current permission keys are:

- `permission.storage`
- `permission.alarms`
- `permission.downloads`
- `permission.activeTab`
- `permission.idle`
- `permission.contextMenus`
- `permission.webNavigation`

The host-access explanation is stored under `host_permission`, and the current remote-code answer is `remote_code: no`.

## Additional Fields

Chrome Web Store additional fields live in:

- `docs/chrome-web-store-additional-fields.md`

The document owns the `[additional_fields]` block for `official_url`, `homepage_url`, `support_url`, and `mature_content`.

## Category

Chrome Web Store category selection lives in:

- `docs/chrome-web-store-category.md`

The document must include one `Selected category:` line using a visible Chrome Web Store category label.

## Media

Store media source files live in:

- `assets/icons/extension-icon-128.png`
- `store/screenshots/`
- `store/promo/`

The reviewed screenshot and promotional-image hashes live in `docs/store-media-review.md`.

Store media and listing text are source artifacts. They are included in the source archive, but excluded from the runtime extension package.

## Verification

Run these after changing StorePilot automation inputs:

- `npm run verify:playbook`
- `npm run package`
- `npm run verify:package`
- `npm run verify:release`

The package and release gates verify that StorePilot docs remain in the source archive and that screenshots, promotional images, store listing text, and source-only icon files do not enter the runtime extension package.
