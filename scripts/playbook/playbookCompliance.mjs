// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

import { hasAll } from '../playbook-utils.mjs';

export function getPlaybookComplianceFailures({ playbookCompliance, playbookRequirements }) {
  const complianceOk = hasAll(playbookCompliance, [
    /# Browser Extension Playbook Compliance/,
    /## Verification Status/,
    /## Compliance Matrix/,
    /## Known Non-Static Requirement/,
    /Product shape/,
    /Repository shape/,
    /Architecture shape/,
    /Store listing copy/,
    /Localization/,
    /Privacy and permissions/,
    /No tracking or remote runtime behavior/,
    /Release archives/,
    /Codex protocol/,
    /npm run verify:release/,
    /npm run verify:package/,
    /npm run verify:browser-load/,
    /scripts\/check-browser-extension-playbook\.mjs/,
    /scripts\/check-package-output\.mjs/,
    /docs\/release-readiness\.md/,
    /docs\/release-checklist\.md/,
    /docs\/release-verification-record\.md/,
    /not fully browser-verified/i,
    /isolated Chromium-based browser\/profile/i,
    /browser-extension-playbook-requirements\.md/
  ]);
  const requirementsOk = hasAll(playbookRequirements, [
    /# Browser Extension Playbook Requirements/,
    /Status meanings:/,
    /## Product Shape/,
    /## Repository Shape/,
    /## Store Listing, Localization, And License/,
    /## Privacy, UI, Review, And Release/,
    /## Codex Protocol Evidence/,
    /Name describes concrete browser behavior/,
    /Summary says what changes for the user/,
    /First screen performs the core job/,
    /Permissions are minimal and explainable/,
    /Avoid analytics, remote calls, search changes, dashboards, and broad host permissions/,
    /visible reset path before uninstall/,
    /README explains product goal, load-unpacked steps, checks, privacy posture, license, and source URL/,
    /Manifest stays small and auditable/,
    /Chrome Web Store automation files follow the StorePilot project reference/,
    /Generated release output contains only current package ZIPs/,
    /Store copy is direct, concrete, free of inflated claims/,
    /Right-to-left language support is documented and checked/,
    /GPL-3\.0 appears in `LICENSE`, `package\.json`, README, and store listing footer/,
    /Privacy copy lists exact permissions/,
    /File URL, incognito, browser-controlled behavior, reviewer limitations, and package contents are documented/,
    /Release checks validate manifest paths, icons, screenshots, unit tests, package output, stale `dist\/` artifacts, privacy alignment, and store listing footer/,
    /Load the unpacked extension in the target browser before publishing/,
    /Browser-only pending/,
    /Run smallest useful checks before reporting completion/
  ]);

  if (complianceOk && requirementsOk) {
    return [];
  }

  return ['Browser extension playbook compliance documents must map playbook areas and individual requirements to evidence while preserving the isolated browser-load gap.'];
}
