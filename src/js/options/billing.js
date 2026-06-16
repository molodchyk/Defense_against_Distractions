// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

import { getSync } from '../../platform/chrome/storage.js';
import {
  BILLING_CONFIG_STORAGE_KEY,
  BILLING_ENTITLEMENT_STORAGE_KEY,
  DEFAULT_BILLING_ENTITLEMENT,
  getEntitlementLabel,
  isEntitlementActive,
  normalizeBillingConfig,
  normalizeBillingEntitlement
} from '../shared/billing.js';

const BILLING_MESSAGES = {
  billingHeading: 'Supporter Access',
  billingDisabledNotice: 'Billing integration is disabled in this build.',
  billingStatusPrefix: 'Current access',
  billingProviderPrefix: 'Provider',
  billingNoProvider: 'not configured',
  billingNoPaywallNotice: 'Feature gating is not active yet. This section is a dormant payment foundation.',
  supporterMonthlyButton: 'Monthly support',
  lifetimeSupportButton: 'Lifetime support',
  manageBillingButton: 'Manage billing'
};

export function initializeBillingPanel() {
  renderBillingPanel().catch(error => {
    console.error('Failed to initialize billing panel:', error);
  });

  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== 'sync') return;

    if (changes[BILLING_CONFIG_STORAGE_KEY] || changes[BILLING_ENTITLEMENT_STORAGE_KEY]) {
      renderBillingPanel().catch(error => {
        console.error('Failed to sync billing panel:', error);
      });
    }
  });
}

async function renderBillingPanel() {
  const panel = document.getElementById('billingPanel');
  if (!panel) return;

  const items = await getSync({
    [BILLING_CONFIG_STORAGE_KEY]: {},
    [BILLING_ENTITLEMENT_STORAGE_KEY]: DEFAULT_BILLING_ENTITLEMENT
  });
  const config = normalizeBillingConfig(items[BILLING_CONFIG_STORAGE_KEY]);
  const entitlement = normalizeBillingEntitlement(items[BILLING_ENTITLEMENT_STORAGE_KEY]);

  if (!config.enabled) {
    panel.hidden = true;
    return;
  }

  panel.hidden = false;
  panel.dataset.entitlementActive = String(isEntitlementActive(entitlement));

  setText('billingHeading', getMessage('billingHeading'));
  setText('billingStatusText', `${getMessage('billingStatusPrefix')}: ${getEntitlementLabel(entitlement)}`);
  setText('billingProviderText', `${getMessage('billingProviderPrefix')}: ${config.provider || getMessage('billingNoProvider')}`);
  setText('billingNoticeText', getMessage('billingNoPaywallNotice'));

  bindBillingButton('supporterMonthlyButton', config.checkoutUrls.supporterMonthly, getMessage('supporterMonthlyButton'));
  bindBillingButton('lifetimeSupportButton', config.checkoutUrls.lifetime, getMessage('lifetimeSupportButton'));
  bindBillingButton('manageBillingButton', config.portalUrl, getMessage('manageBillingButton'));
}

function bindBillingButton(id, url, label) {
  const button = document.getElementById(id);
  if (!button) return;

  button.textContent = label;
  button.disabled = !isSafeExternalUrl(url);
  button.onclick = () => {
    if (isSafeExternalUrl(url)) {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };
}

function setText(id, text) {
  const element = document.getElementById(id);
  if (element) {
    element.textContent = text;
  }
}

function getMessage(key) {
  return chrome.i18n.getMessage(key) || BILLING_MESSAGES[key] || key;
}

function isSafeExternalUrl(url) {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:';
  } catch {
    return false;
  }
}
