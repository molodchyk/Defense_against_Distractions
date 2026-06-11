// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

import {
  POMODORO_AUTO_START_SUPPRESSED_PLAN_STORAGE_KEY,
  POMODORO_AUTO_START_SUPPRESSION_STORAGE_KEY,
  SUPPRESS_ALL_AUTO_START_PLANS
} from './constants.js';
import { getLocal, setLocal } from './chromeStorage.js';

let autoStartSuppressedUntil = 0;
let autoStartSuppressedPlanId = null;

export async function getAutoStartSuppression() {
  const cachedSuppressedUntil = Number(autoStartSuppressedUntil || 0);
  const result = await getLocal({
    [POMODORO_AUTO_START_SUPPRESSION_STORAGE_KEY]: 0,
    [POMODORO_AUTO_START_SUPPRESSED_PLAN_STORAGE_KEY]: null
  });
  const storedSuppressedUntil = Number(result?.[POMODORO_AUTO_START_SUPPRESSION_STORAGE_KEY] || 0);
  const storedSuppressedPlanId = typeof result?.[POMODORO_AUTO_START_SUPPRESSED_PLAN_STORAGE_KEY] === 'string'
    ? result[POMODORO_AUTO_START_SUPPRESSED_PLAN_STORAGE_KEY]
    : null;
  const suppressedUntil = Math.max(cachedSuppressedUntil, storedSuppressedUntil);
  autoStartSuppressedUntil = suppressedUntil;
  autoStartSuppressedPlanId = autoStartSuppressedPlanId || storedSuppressedPlanId;
  return {
    planId: autoStartSuppressedPlanId,
    until: suppressedUntil
  };
}

export async function isAutoStartSuppressedForActivity(planId, now = Date.now()) {
  const suppression = await getAutoStartSuppression();
  if (suppression.planId) {
    return suppression.planId === SUPPRESS_ALL_AUTO_START_PLANS
      || suppression.planId === planId;
  }

  if (suppression.until > 0 && now < suppression.until) {
    return true;
  }

  if (suppression.until > 0) {
    await clearAutoStartSuppression();
  }

  return false;
}

export async function suppressAutoStartAfterManualReset() {
  autoStartSuppressedUntil = 0;
  autoStartSuppressedPlanId = SUPPRESS_ALL_AUTO_START_PLANS;
  await setLocal({
    [POMODORO_AUTO_START_SUPPRESSION_STORAGE_KEY]: autoStartSuppressedUntil,
    [POMODORO_AUTO_START_SUPPRESSED_PLAN_STORAGE_KEY]: autoStartSuppressedPlanId
  });
}

export async function clearAutoStartSuppression() {
  autoStartSuppressedUntil = 0;
  autoStartSuppressedPlanId = null;
  await setLocal({
    [POMODORO_AUTO_START_SUPPRESSION_STORAGE_KEY]: 0,
    [POMODORO_AUTO_START_SUPPRESSED_PLAN_STORAGE_KEY]: null
  });
}
