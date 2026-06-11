// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

import { isPlanActive } from '../../shared/plans.js';

export function findPlanById(plans, planId) {
  return plans.find(plan => plan.id === planId) || null;
}

export function findStartablePlan(plans, requestedPlanId = null) {
  const requestedPlan = requestedPlanId ? findPlanById(plans, requestedPlanId) : null;
  if (requestedPlan && isPlanActive(requestedPlan) && requestedPlan.pomodoro.enabled) {
    return requestedPlan;
  }

  return plans.find(plan => isPlanActive(plan) && plan.pomodoro.enabled) || null;
}

export function findAutoStartPlan(plans) {
  return plans.find(plan => (
    isPlanActive(plan)
      && plan.pomodoro.enabled
      && plan.pomodoro.autoStart
  )) || null;
}

export function findRuntimePlan(plans, runtime) {
  return runtime.activePlanId ? findPlanById(plans, runtime.activePlanId) : null;
}

export function getHistoryPlanDetails(plan) {
  return {
    planId: plan?.id || null,
    planName: plan?.name || null
  };
}
