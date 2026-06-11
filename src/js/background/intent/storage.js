// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

import {
  INTENT_TRAJECTORY_STORAGE_KEY,
  createIntentTrajectoryState
} from '../../shared/intentCoherence.js';
import {
  USAGE_STATS_STORAGE_KEY,
  createUsageStatsState
} from '../../shared/usageStats.js';
import {
  getLocal,
  setLocal
} from './chromeApi.js';

export async function readIntentState() {
  const items = await getLocal(INTENT_TRAJECTORY_STORAGE_KEY);
  return items[INTENT_TRAJECTORY_STORAGE_KEY] || createIntentTrajectoryState();
}

export async function saveIntentState(state) {
  await setLocal({ [INTENT_TRAJECTORY_STORAGE_KEY]: state });
  return state;
}

export async function updateIntentState(updater) {
  const currentState = await readIntentState();
  return saveIntentState(updater(currentState));
}

export async function readUsageStatsState() {
  const items = await getLocal(USAGE_STATS_STORAGE_KEY);
  return items[USAGE_STATS_STORAGE_KEY] || createUsageStatsState();
}

export async function saveUsageStatsState(state) {
  await setLocal({ [USAGE_STATS_STORAGE_KEY]: state });
  return state;
}

export async function updateUsageStats(updater) {
  const currentState = await readUsageStatsState();
  return saveUsageStatsState(updater(currentState));
}
