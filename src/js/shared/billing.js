// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

export const BILLING_CONFIG_STORAGE_KEY = 'billingIntegration';
export const BILLING_IDENTITY_STORAGE_KEY = 'billingIdentity';
export const BILLING_ENTITLEMENT_STORAGE_KEY = 'billingEntitlement';

export const BILLING_PLANS = ['free', 'supporter_monthly', 'lifetime'];
export const BILLING_STATUSES = ['inactive', 'active', 'past_due', 'canceled'];
export const BILLING_SOURCES = ['local', 'stripe', 'paddle', 'lemonsqueezy', 'manual'];

export const DEFAULT_BILLING_CONFIG = Object.freeze({
  enabled: false,
  provider: 'none',
  checkoutUrls: Object.freeze({
    supporterMonthly: '',
    lifetime: ''
  }),
  portalUrl: '',
  entitlementApiBaseUrl: '',
  supportEmail: ''
});

export const DEFAULT_BILLING_ENTITLEMENT = Object.freeze({
  plan: 'free',
  status: 'inactive',
  source: 'local',
  expiresAt: null,
  checkedAt: null
});

export const DEFAULT_BILLING_IDENTITY = Object.freeze({
  token: '',
  email: '',
  licenseKey: '',
  createdAt: null
});

export function normalizeBillingConfig(config = {}) {
  const checkoutUrls = isObject(config.checkoutUrls) ? config.checkoutUrls : {};

  return {
    enabled: config.enabled === true,
    provider: normalizeString(config.provider || DEFAULT_BILLING_CONFIG.provider),
    checkoutUrls: {
      supporterMonthly: normalizeString(checkoutUrls.supporterMonthly),
      lifetime: normalizeString(checkoutUrls.lifetime)
    },
    portalUrl: normalizeString(config.portalUrl),
    entitlementApiBaseUrl: normalizeString(config.entitlementApiBaseUrl).replace(/\/+$/, ''),
    supportEmail: normalizeString(config.supportEmail)
  };
}

export function normalizeBillingEntitlement(entitlement = {}) {
  const plan = BILLING_PLANS.includes(entitlement.plan) ? entitlement.plan : DEFAULT_BILLING_ENTITLEMENT.plan;
  const status = BILLING_STATUSES.includes(entitlement.status)
    ? entitlement.status
    : DEFAULT_BILLING_ENTITLEMENT.status;
  const source = BILLING_SOURCES.includes(entitlement.source)
    ? entitlement.source
    : DEFAULT_BILLING_ENTITLEMENT.source;

  return {
    plan,
    status,
    source,
    expiresAt: normalizeNullableIsoDate(entitlement.expiresAt),
    checkedAt: normalizeNullableIsoDate(entitlement.checkedAt)
  };
}

export function normalizeBillingIdentity(identity = {}) {
  return {
    token: normalizeString(identity.token),
    email: normalizeString(identity.email).toLowerCase(),
    licenseKey: normalizeString(identity.licenseKey),
    createdAt: normalizeNullableIsoDate(identity.createdAt)
  };
}

export function hasBillingIdentity(identity = {}) {
  const normalized = normalizeBillingIdentity(identity);
  return Boolean(normalized.token || normalized.email || normalized.licenseKey);
}

export function isBillingEnabled(config = {}) {
  return normalizeBillingConfig(config).enabled;
}

export function isPaidPlan(plan) {
  return plan === 'supporter_monthly' || plan === 'lifetime';
}

export function isEntitlementActive(entitlement = {}, now = new Date()) {
  const normalized = normalizeBillingEntitlement(entitlement);
  if (!isPaidPlan(normalized.plan) || normalized.status !== 'active') {
    return false;
  }

  if (!normalized.expiresAt) {
    return true;
  }

  return new Date(normalized.expiresAt).getTime() > now.getTime();
}

export function getEntitlementLabel(entitlement = {}) {
  const normalized = normalizeBillingEntitlement(entitlement);

  if (normalized.plan === 'lifetime' && normalized.status === 'active') {
    return 'Lifetime supporter';
  }

  if (normalized.plan === 'supporter_monthly' && normalized.status === 'active') {
    return 'Monthly supporter';
  }

  if (normalized.status === 'past_due') {
    return 'Payment past due';
  }

  if (normalized.status === 'canceled') {
    return 'Canceled';
  }

  return 'Free';
}

export function buildEntitlementCheckUrl(config = {}, identityToken = '') {
  const normalizedConfig = normalizeBillingConfig(config);
  const token = normalizeString(identityToken);

  if (!normalizedConfig.entitlementApiBaseUrl || !token) {
    return '';
  }

  const url = new URL(`${normalizedConfig.entitlementApiBaseUrl}/entitlement`);
  url.searchParams.set('token', token);
  return url.toString();
}

function normalizeString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeNullableIsoDate(value) {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
