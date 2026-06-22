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

export function getInstructionGuideFailures({ instructionsHtml, englishMessages }) {
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

  if (/Add Group|Create a Group|group panel|Whitelist Websites|whitelisted websites|websites in groups|for this group|Timer Count|Timer Duration \(seconds\)|Activate Timer/i.test(instructionGuideCopy)) {
    failures.push('Instruction guide must not use retired group, whitelist, or old timer wording as primary user guidance.');
  }

  return failures;
}
