// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

import { hasAll } from '../../playbook-utils.mjs';

export function getReleaseDocumentationFailures({
  releaseNotes,
  releaseChecklist,
  releaseVerifier,
  manifestVersion
}) {
  const failures = [];

  if (!hasAll(releaseNotes, [
    /# Release Notes/,
    /CHANGELOG\.md/,
    new RegExp(`\\b${manifestVersion.replaceAll('.', '\\.')}\\b`),
    /unit tests/i,
    /npm run verify:release/,
    /source archive/i,
    /remote network access/i,
    /screenshots/i,
    /promo/i,
    /Store Media Review/i,
    /cannot close active browser windows or unsaved work/i
  ])) {
    failures.push('Release notes document must cover the current version, changelog source, release gate, source archive, media, network posture, and isolated browser-load safety.');
  }

  if (!/Run `npm run verify:browser-load` only in an isolated browser environment[\s\S]+Load the extension zip or unpacked project in an isolated Chromium-based browser\/profile/i.test(releaseChecklist)) {
    failures.push('Release checklist must isolate browser-load and manual browser QA from active user sessions.');
  }

  if (!/localized store listings preserve the current plan, allowed-website, Pomodoro, intent-coherence, local-processing privacy-boundary, and browser-limitation wording/i.test(releaseChecklist)) {
    failures.push('Release checklist must require localized store listings to stay aligned with the current product model and privacy boundary.');
  }

  if (!/blank states are intentional for empty plans, empty UI cleanup rules, empty usage stats, and empty intent diagnostics/i.test(releaseChecklist)) {
    failures.push('Release checklist must require intentional blank-state review.');
  }

  if (!hasAll(releaseChecklist, [
    /docs\/storepilot-automation\.md/,
    /docs\/chrome-web-store-privacy-form\.md/,
    /\[privacy\]/,
    /docs\/chrome-web-store-additional-fields\.md/,
    /\[additional_fields\]/,
    /docs\/chrome-web-store-category\.md/,
    /selected Chrome Web Store category/i
  ])) {
    failures.push('Release checklist must point StorePilot dashboard work at the canonical automation index and import documents.');
  }

  if (!hasAll(releaseVerifier, [
    /node --test\s+"test\/\*\*\/\*\.test\.js"/,
    /check-manifest-references\.mjs/,
    /check-relative-imports\.mjs/,
    /check-browser-extension-playbook\.mjs/,
    /audit-file-sizes\.mjs/,
    /audit-folder-density\.mjs/,
    /check-locale-coverage\.mjs/,
    /check-static-localization\.mjs/,
    /check-package-output\.mjs/,
    /content-script-load-order\.md/,
    /browser-extension-playbook-compliance\.md/,
    /release-verification-record\.md/,
    /manifestAudit\.mjs/,
    /"assets\/", "docs\/", "store\/", "test\/", "_locales\/", "scripts\/", "src\/"/
  ])) {
    failures.push('Release verifier must run unit tests, manifest, import, playbook, file-size, folder-density, locale, static-localization, package-output, and source-archive prefix gates.');
  }

  return failures;
}
