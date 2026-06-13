# Localization

This document records the current Chrome Web Store locale knowledge for DaD.

## Practical Rule

Chrome locale folder names must use Chrome-style locale codes. Region variants use underscores, not hyphens.

Correct:

- `pt_BR`
- `pt_PT`
- `zh_CN`
- `zh_TW`

Incorrect:

- `pt-BR`
- `pt-PT`
- `zh-CN`
- `zh-TW`

Do not use the old public Chrome extension i18n locale list as the only source of truth for Chrome Web Store language support. The Store can expose more languages than that list suggests. Persian (`fa`) and Urdu (`ur`) should be kept; Persian is supported.

UI direction is part of localization. Arabic (`ar`), Persian (`fa`), Hebrew (`he`), and Urdu (`ur`) are right-to-left locales. DaD applies `dir="rtl"` and a matching `lang` attribute on extension pages, mirrors fixed-inline controls such as the plan schedule board and compact Pomodoro metadata, and mirrors fixed injected panels such as the intent prompt and UI picker. Injected extension-owned surfaces such as the block overlay, intent prompt, UI picker, and Pomodoro mini panel get their own direction without changing the host page direction.

## Chrome Web Store Visible Languages

The Chrome Web Store has been observed showing a 64-language hover list on another extension listing. That list is:

- `de` - Deutsch
- `en` - English
- `en_GB` - English (United Kingdom)
- `en_US` - English (United States)
- `fil` - Filipino
- `id` - Indonesia
- `sw` - Kiswahili
- `ms` - Melayu
- `nl` - Nederlands
- `vi` - Tieng Viet
- `tr` - Turkce
- `az` - Azerbaijani
- `ca` - Catala
- `da` - Dansk
- `et` - Eesti
- `es` - Espanol
- `es_419` - Espanol (Latinoamerica)
- `eu` - Euskara
- `fr` - Francais
- `hr` - Hrvatski
- `it` - Italiano
- `lv` - Latviesu
- `lt` - Lietuviu
- `hu` - Magyar
- `no` - Norsk
- `uz` - Uzbek
- `pl` - Polski
- `pt_BR` - Portugues (Brasil)
- `pt_PT` - Portugues (Portugal)
- `ro` - Romana
- `sq` - Shqip
- `sk` - Slovencina
- `sl` - Slovenscina
- `fi` - Suomi
- `sv` - Svenska
- `cs` - Cestina
- `el` - Greek
- `bg` - Bulgarian
- `mk` - Macedonian
- `ru` - Russian
- `sr` - Serbian
- `uk` - Ukrainian
- `hy` - Armenian
- `he` - Hebrew
- `ur` - Urdu
- `ar` - Arabic
- `ne` - Nepali
- `mr` - Marathi
- `hi` - Hindi
- `bn` - Bengali
- `pa` - Punjabi
- `gu` - Gujarati
- `ta` - Tamil
- `te` - Telugu
- `kn` - Kannada
- `ml` - Malayalam
- `si` - Sinhala
- `th` - Thai
- `ka` - Georgian
- `am` - Amharic
- `zh_CN` - Chinese (China)
- `zh_TW` - Chinese (Taiwan)
- `ja` - Japanese
- `ko` - Korean

## CWS-Visible Locale Coverage

DaD currently has locale folders and matching store listing files for every locale in the observed 64-language Chrome Web Store hover list.

All locale `messages.json` files must contain the same message keys and placeholder names as `_locales/en/messages.json`. Existing translated strings should be preserved, but newly added UI keys may be copied from English as explicit fallback text until a translation pass updates them. Run `node scripts/sync-locale-messages.mjs` after adding English keys, then run `npm run verify:locales`.

## Extra Prepared Locales

DaD also has prepared translations that were not seen in the 64-language Chrome Web Store hover list:

- `af` - Afrikaans
- `is` - Icelandic

Keep these unless there is a concrete reason to remove them. They should not block release as long as package verification passes.

## Release Check

Before release:

- Confirm every `_locales/<locale>/messages.json` has a matching `src/store-assets/store-listing/<locale>.txt`.
- Confirm no locale folder uses hyphens.
- Confirm regional locales use underscores.
- Confirm `npm run verify:locales` passes after any UI string change.
- Confirm Arabic, Persian, Hebrew, and Urdu render extension UI surfaces with right-to-left direction.
- Run `npm run verify:release`.
