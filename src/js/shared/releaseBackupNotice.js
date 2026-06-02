// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

export const RELEASE_BACKUP_NOTICE_VERSION = '1.4.1';
export const RELEASE_BACKUP_NOTICE_SEEN_KEY = `releaseBackupNoticeSeen.${RELEASE_BACKUP_NOTICE_VERSION}`;
export const RELEASE_BACKUP_NOTICE_ELIGIBLE_KEY = `releaseBackupNoticeEligible.${RELEASE_BACKUP_NOTICE_VERSION}`;

const DEFAULT_WHITELISTED_SITES = ['example.com'];

function hasNonDefaultWhitelist(items) {
  const sites = Array.isArray(items.whitelistedSites) ? items.whitelistedSites : [];
  return sites.some(site => !DEFAULT_WHITELISTED_SITES.includes(site));
}

export function hasExistingConfiguration(items) {
  return Object.entries(items).some(([key, value]) => {
    if (key.startsWith('group_')) return true;
    if (key.startsWith('elementBlockRule.')) return true;
    if (key === 'websiteGroups' && Array.isArray(value) && value.length > 0) return true;
    if (key === 'schedules' && Array.isArray(value) && value.length > 0) return true;
    if (key === 'elementBlockRules' && Array.isArray(value) && value.length > 0) return true;
    if (key === 'elementBlockRuleIds' && Array.isArray(value) && value.length > 0) return true;
    if (key === 'password' && value) return true;
    return false;
  }) || hasNonDefaultWhitelist(items);
}
