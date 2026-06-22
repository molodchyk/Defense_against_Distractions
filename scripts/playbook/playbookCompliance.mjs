// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

import { hasAll } from '../playbook-utils.mjs';

export function getPlaybookComplianceFailures({ playbookCompliance }) {
  if (hasAll(playbookCompliance, [
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
    /isolated Chromium-based browser\/profile/i
  ])) {
    return [];
  }

  return ['Browser extension playbook compliance document must map playbook areas to evidence and preserve the isolated browser-load gap.'];
}
