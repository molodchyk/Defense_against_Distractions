// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

import { hasAll } from '../playbook-utils.mjs';

const instructionGuideKeys = [
  'introText1',
  'introText2',
  'introText3',
  'introText4',
  'createGroupTitle',
  'createGroupText1',
  'createGroupText2',
  'websitesTitle',
  'websitesText',
  'keywordsText1',
  'timerCountTitle',
  'timerCountText',
  'timerDurationTitle',
  'timerDurationText',
  'lockedSchedulesNote',
  'lockedSchedulesText1',
  'lockedSchedulesText2',
  'lockedSchedulesText3',
  'lockedSchedulesText4',
  'lockedScheduleRestriction1',
  'lockedScheduleRestriction2',
  'lockedScheduleRestriction3',
  'lockedScheduleRestriction4',
  'lockedScheduleRestriction5',
  'lockedScheduleRestriction6',
  'lockedScheduleRestriction7',
  'lockedScheduleRestriction8',
  'lockedScheduleRestriction9',
  'lockedScheduleRestriction10',
  'whitelistWebsitesTitle',
  'whitelistWebsitesText',
  'passwordManagementText'
];

const retiredPrimaryGuidePattern = /Add Group|Create a Group|group panel|Whitelist Websites|whitelisted websites|websites in groups|for this group|Timer Count|Timer Duration \(seconds\)|Activate Timer/i;

export function getInstructionGuideFailures({ about, instructionsHtml, englishMessages }) {
  const failures = [];
  const instructionGuideCopy = [
    instructionsHtml,
    ...instructionGuideKeys.map(key => englishMessages[key]?.message || '')
  ].join('\n');

  if (!hasAll(instructionGuideCopy, [
    /Create a Plan/,
    /Entries and Websites/,
    /Allowed Websites/,
    /Pomodoro Timing/,
    /intent coherence/i,
    /UI cleanup/i,
    /checks configured pages locally/i,
    /made stricter but not more relaxed/i
  ])) {
    failures.push('Instruction guide must describe the current plan-based protection model, local processing boundary, allowed websites, Pomodoro, intent coherence, UI cleanup, and protected-schedule strictness.');
  }

  if (retiredPrimaryGuidePattern.test(instructionGuideCopy)) {
    failures.push('Instruction guide must not use retired group, whitelist, or old timer wording as primary user guidance.');
  }

  if (!hasAll(about, [
    /plan-based protection/i,
    /website entries/i,
    /allowed websites/i,
    /Pomodoro/i,
    /intent-coherence settings/i,
    /UI cleanup rules/i,
    /local-first/i,
    /without a remote server/i,
    /browser defense layer/i
  ])) {
    failures.push('ABOUT.md must describe the current plan-based, local-first product model including allowed websites, Pomodoro, intent coherence, UI cleanup, and no remote server for core blocking.');
  }

  if (retiredPrimaryGuidePattern.test(about)) {
    failures.push('ABOUT.md must not use retired group, whitelist, or old timer wording as primary product guidance.');
  }

  return failures;
}
