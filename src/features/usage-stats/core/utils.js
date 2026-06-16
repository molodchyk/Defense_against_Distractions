// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

import {
  DEFAULT_USAGE_STATS_RETENTION_DAYS
} from './constants.js';

export function getNow(options = {}) {
  return typeof options.now === 'function' ? Number(options.now()) : Date.now();
}

export function toTimestamp(value) {
  const timestamp = Date.parse(value || '');
  return Number.isFinite(timestamp) ? timestamp : null;
}

export function toIsoString(value) {
  return Number.isFinite(value) ? new Date(value).toISOString() : null;
}

export function getDayKey(now = Date.now()) {
  return new Date(now).toISOString().slice(0, 10);
}

export function sanitizeCount(value) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, Math.round(number)) : 0;
}

export function sanitizeMs(value) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, Math.round(number)) : 0;
}

export function sanitizeRetentionDays(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) {
    return DEFAULT_USAGE_STATS_RETENTION_DAYS;
  }

  return Math.min(Math.max(Math.round(number), 1), 90);
}

export function normalizeHostname(value) {
  const rawValue = String(value || '').trim().toLowerCase();
  if (!rawValue) {
    return '';
  }

  try {
    const url = rawValue.includes('://') ? rawValue : `https://${rawValue}`;
    return new URL(url).hostname.replace(/^www\./i, '');
  } catch (error) {
    return rawValue
      .replace(/^https?:\/\//i, '')
      .replace(/^www\./i, '')
      .split(/[/?#]/)[0]
      .trim();
  }
}

export function getSignalHostname(signal = {}) {
  return normalizeHostname(signal.hostname || signal.url);
}
