// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk


import {
  INTENT_TRANSITION_QUALIFIERS,
  INTENT_TRANSITION_TYPES,
  MAX_RATE_PER_MINUTE,
  MIN_RATE_WINDOW_MS,
  STOP_WORDS,
  TOKEN_LIMIT
} from './constants.js';

export function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

export function clampNumber(value, fallback, min, max) {
  const number = Number(value);
  if (!Number.isFinite(number)) {
    return fallback;
  }

  return Math.min(Math.max(Math.round(number), min), max);
}

export function getTimestamp(options = {}) {
  return Number(options.now?.() || Date.now());
}

export function parseTimestamp(value) {
  const timestamp = Date.parse(value || '');
  return Number.isFinite(timestamp) ? timestamp : null;
}

export function normalizeString(value) {
  return String(value || '').trim();
}

export function normalizeStringArray(value) {
  return Array.isArray(value)
    ? value.map(item => normalizeString(item)).filter(Boolean)
    : [];
}

export function getHostnameFromUrl(url) {
  try {
    return new URL(url).hostname.replace(/^www\./i, '').toLowerCase();
  } catch {
    return '';
  }
}

export function normalizeComparableUrl(url) {
  const normalizedUrl = normalizeString(url);
  if (!normalizedUrl) {
    return '';
  }

  try {
    const parsedUrl = new URL(normalizedUrl);
    parsedUrl.hash = '';
    return parsedUrl.toString();
  } catch {
    return normalizedUrl.split('#')[0];
  }
}

export function tokenize(value) {
  return normalizeString(value)
    .toLowerCase()
    .replace(/https?:\/\//g, ' ')
    .split(/[^\p{L}\p{N}_]+/u)
    .map(token => token.replace(/^[_-]+|[_-]+$/g, ''))
    .filter(token => token.length >= 2 && !STOP_WORDS.has(token))
    .slice(0, TOKEN_LIMIT);
}

export function uniqueTokens(tokens) {
  return Array.from(new Set(tokens));
}

export function normalizeDurationMs(value, fallback = 0) {
  const normalizedValue = Number(value);
  return Number.isFinite(normalizedValue) ? Math.max(0, normalizedValue) : fallback;
}

export function normalizeEventCount(value) {
  return Math.max(0, Number(value || 0));
}

export function normalizeTransitionType(value) {
  const normalizedValue = normalizeString(value);
  return INTENT_TRANSITION_TYPES.has(normalizedValue) ? normalizedValue : null;
}

export function normalizeTransitionQualifiers(value = []) {
  return Array.isArray(value)
    ? Array.from(new Set(value.map(normalizeString).filter(qualifier => INTENT_TRANSITION_QUALIFIERS.has(qualifier))))
    : [];
}

export function calculateRatePerMinute(count, activePageMs, pageAgeMs) {
  const eventCount = normalizeEventCount(count);
  if (eventCount <= 0) {
    return 0;
  }

  const measuredMs = activePageMs > 0 ? activePageMs : pageAgeMs;
  const minutes = Math.max(measuredMs, MIN_RATE_WINDOW_MS) / (60 * 1000);
  return Math.min(MAX_RATE_PER_MINUTE, Number((eventCount / minutes).toFixed(3)));
}

export function normalizeRatePerMinute(value, count, activePageMs, pageAgeMs) {
  const normalizedValue = Number(value);
  if (Number.isFinite(normalizedValue)) {
    return Math.min(MAX_RATE_PER_MINUTE, Math.max(0, Number(normalizedValue.toFixed(3))));
  }

  return calculateRatePerMinute(count, activePageMs, pageAgeMs);
}

export function normalizeTabId(tabId) {
  const normalizedTabId = Number(tabId);
  return Number.isFinite(normalizedTabId) ? normalizedTabId : null;
}