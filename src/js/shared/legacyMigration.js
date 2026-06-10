// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

function isPlainObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value);
}

function nextAvailableGroupId(items, counter) {
  let nextCounter = counter;
  let groupId;

  do {
    nextCounter += 1;
    groupId = `group_${nextCounter}`;
  } while (Object.prototype.hasOwnProperty.call(items, groupId));

  return { groupId, nextCounter };
}

export function createLegacyWebsiteGroupsMigration(items = {}) {
  const websiteGroups = Array.isArray(items.websiteGroups) ? items.websiteGroups : null;
  if (!websiteGroups) {
    return {
      changed: false,
      setItems: {},
      removeKeys: [],
      migratedGroups: []
    };
  }

  let counter = Number(items.groupCounter || 0);
  if (!Number.isFinite(counter) || counter < 0) {
    counter = 0;
  }

  const setItems = {};
  const migratedGroups = [];

  websiteGroups.filter(isPlainObject).forEach(group => {
    const next = nextAvailableGroupId({ ...items, ...setItems }, counter);
    counter = next.nextCounter;
    const migratedGroup = {
      ...group,
      id: next.groupId
    };
    setItems[next.groupId] = migratedGroup;
    migratedGroups.push(migratedGroup);
  });

  if (migratedGroups.length > 0) {
    setItems.groupCounter = counter;
  }

  return {
    changed: true,
    setItems,
    removeKeys: ['websiteGroups'],
    migratedGroups
  };
}
