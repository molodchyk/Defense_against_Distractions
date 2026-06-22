// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

export const ELEMENT_RULES_STORAGE_KEY = 'elementBlockRules';
export const ELEMENT_RULE_IDS_STORAGE_KEY = 'elementBlockRuleIds';
export const ELEMENT_RULE_ITEM_PREFIX = 'elementBlockRule.';
export const SYNC_QUOTA_BYTES_FALLBACK = 102400;
export const PROTECTED_SYNC_RESERVE_BYTES = 20480;

export const STRATEGIES = [
  ['samePosition', 'elementRuleStrategySamePosition', 'Same position'],
  ['sameText', 'elementRuleStrategySameText', 'Same text or label'],
  ['similar', 'elementRuleStrategySimilar', 'Similar structure'],
  ['exact', 'elementRuleStrategyClosest', 'Closest match']
];

export const LABEL_MATCHES = [
  ['prefer', 'elementRuleLabelPrefer', 'Prefer label'],
  ['ignore', 'elementRuleLabelIgnore', 'Ignore label'],
  ['require', 'elementRuleLabelRequire', 'Require label']
];

export const ELEMENT_RULE_ACTIONS = [
  ['hide', 'elementRuleActionHideElement', 'Hide element'],
  ['click', 'elementRuleActionClickOnce', 'Click once'],
  ['clear', 'elementRuleActionClearField', 'Clear field'],
  ['pauseMedia', 'elementRuleActionPauseMedia', 'Pause media']
];

export const FINGERPRINT_FIELDS = [
  ['tag', 'elementRuleFingerprintTag', 'Tag'],
  ['role', 'elementRuleFingerprintRole', 'Role'],
  ['inputType', 'elementRuleFingerprintInputType', 'Input type'],
  ['parentTag', 'elementRuleFingerprintParentTag', 'Parent tag'],
  ['parentRole', 'elementRuleFingerprintParentRole', 'Parent role'],
  ['childCount', 'elementRuleFingerprintChildCount', 'Child count'],
  ['tagIndex', 'elementRuleFingerprintTagIndex', 'Tag index'],
  ['positionPath', 'elementRuleFingerprintPositionPath', 'Position path'],
  ['ancestorSignature', 'elementRuleFingerprintAncestors', 'Ancestors'],
  ['childSignature', 'elementRuleFingerprintChildren', 'Children'],
  ['classTokens', 'elementRuleFingerprintClassTokens', 'Class tokens'],
  ['labelTokens', 'elementRuleFingerprintLabelTokens', 'Label tokens'],
  ['directTextTokens', 'elementRuleFingerprintDirectTextTokens', 'Direct text tokens']
];

export const ELEMENT_RULE_MESSAGES = {
  elementRuleActionClearField: 'Clear field',
  elementRuleActionClearSummary: 'clear field',
  elementRuleActionClickOnce: 'Click once',
  elementRuleActionClickSummary: 'click once',
  elementRuleActionHideElement: 'Hide element',
  elementRuleActionHideSummary: 'hide',
  elementRuleActionLabel: 'Action',
  elementRuleActionPauseMedia: 'Pause media',
  elementRuleActionPauseSummary: 'pause media',
  elementRuleAncestorDepthLabel: 'Ancestor depth',
  elementRuleCurrentSiteValue: 'current site',
  elementRuleDefaultName: 'UI element',
  elementRuleDepthSummary: 'depth $1',
  elementRuleDiagnosticsHeading: 'Diagnostics',
  elementRuleDisabledPlanName: '$1 (disabled)',
  elementRuleDisabledSummary: 'disabled',
  elementRuleEnabledLabel: 'Enabled',
  elementRuleEnabledSummary: 'enabled',
  elementRuleGlobalPlanAssignment: 'Global rule. Create a plan to scope it.',
  elementRuleGlobalScope: 'global',
  elementRuleLabelIgnore: 'Ignore label',
  elementRuleLabelMatchLabel: 'Label match',
  elementRuleLabelPrefer: 'Prefer label',
  elementRuleLabelRequire: 'Require label',
  elementRuleMinimumScoreLabel: 'Minimum score',
  elementRuleNameLabel: 'Name',
  elementRulePatternValue: 'pattern',
  elementRulePlanAssignmentLabel: 'Plan assignment',
  elementRulePlanScope: 'plans: $1',
  elementRuleScoreSummary: 'score $1',
  elementRuleStorageCountPlural: '$1 UI rules',
  elementRuleStorageCountSingular: '$1 UI rule',
  elementRuleStorageReserveLabel: 'Locked schedule reserve $1',
  elementRuleStorageReserveLow: '$1 low',
  elementRuleStorageRuleBytes: 'UI rules $1',
  elementRuleStorageSyncUsage: 'Sync $1 / $2',
  elementRuleStrategyClosest: 'Closest match',
  elementRuleStrategyLabel: 'Strategy',
  elementRuleStrategySamePosition: 'Same position',
  elementRuleStrategySameText: 'Same text or label',
  elementRuleStrategySimilar: 'Similar structure',
  elementRuleUpdateFailedMessage: 'Could not update this UI rule.',
  elementRuleUrlPatternLabel: 'URL pattern',
  elementRuleUseDomainButton: 'Use domain',
  elementRuleUnknownValue: 'unknown',
  elementRuleMetaCreated: 'Created',
  elementRuleMetaPlanScope: 'Plan scope',
  elementRuleMetaRuleId: 'Rule ID',
  elementRuleMetaUrlPattern: 'URL pattern',
  elementRuleMetaUrlScope: 'URL scope',
  elementRuleFingerprintAncestors: 'Ancestors',
  elementRuleFingerprintChildCount: 'Child count',
  elementRuleFingerprintChildren: 'Children',
  elementRuleFingerprintClassTokens: 'Class tokens',
  elementRuleFingerprintDirectTextTokens: 'Direct text tokens',
  elementRuleFingerprintInputType: 'Input type',
  elementRuleFingerprintLabelTokens: 'Label tokens',
  elementRuleFingerprintParentRole: 'Parent role',
  elementRuleFingerprintParentTag: 'Parent tag',
  elementRuleFingerprintPositionPath: 'Position path',
  elementRuleFingerprintRole: 'Role',
  elementRuleFingerprintTag: 'Tag',
  elementRuleFingerprintTagIndex: 'Tag index',
  elementRuleProtectedReserveError: 'Cannot save this UI rule: sync storage reserve for locked schedules would be exceeded.',
  lockedScheduleErrorMessage: 'Cannot weaken protection during an active protected schedule.',
  noElementRulesLabel: 'No blocked UI elements'
};
