// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

(function(global) {
  global.DAD = global.DAD || {};
  const triggeredActions = global.DAD.TriggeredActions = global.DAD.TriggeredActions || {};

  function getCurrentHost() {
    return normalizeHost(global.location?.hostname || global.location?.href || '');
  }

  function getTimestampBucket(timestamp = new Date()) {
    const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
    if (!Number.isFinite(date.getTime())) return '';
    date.setUTCMinutes(0, 0, 0);
    return date.toISOString();
  }

  function hostMatches(pattern, host) {
    const normalizedPattern = normalizeHost(pattern);
    const normalizedHost = normalizeHost(host);
    return !normalizedPattern || normalizedHost === normalizedPattern || normalizedHost.endsWith(`.${normalizedPattern}`);
  }

  function getComparableKeys(value) {
    const normalized = normalizeText(value, '').toLowerCase();
    if (!normalized) return [];
    return Array.from(new Set([
      normalized,
      normalized.replace(/[^a-z0-9]+/gi, '_').replace(/^_+|_+$/g, ''),
      normalized.replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '')
    ].filter(Boolean)));
  }

  function normalizeStringList(value = []) {
    return Array.isArray(value)
      ? [...new Set(value.map(item => normalizeText(item, '')).filter(Boolean))]
      : [];
  }

  function normalizeText(value, fallback = '') {
    const normalized = String(value ?? '').replace(/\s+/g, ' ').trim();
    return normalized || fallback;
  }

  function normalizeId(value, fallback) {
    const normalized = String(value || '')
      .trim()
      .replace(/[^a-z0-9_-]+/gi, '_')
      .replace(/^_+|_+$/g, '');
    return normalized || fallback;
  }

  function createStableId(value, fallback) {
    return normalizeId(String(value || '').toLowerCase(), fallback);
  }

  function normalizeHost(value = '') {
    const rawValue = String(value || '').trim().toLowerCase();
    if (!rawValue) return '';
    try {
      const parsed = rawValue.includes('://') ? new URL(rawValue) : new URL(`https://${rawValue}`);
      return stripWww(parsed.hostname);
    } catch (error) {
      return stripWww(rawValue.split(/[/?#]/)[0]);
    }
  }

  function stripWww(value) {
    return String(value || '').replace(/^www\./, '');
  }

  function normalizeInteger(value, fallback, min, max) {
    const number = Number.parseInt(value, 10);
    const normalized = Number.isFinite(number) ? number : fallback;
    return Math.min(Math.max(normalized, min), max);
  }

  triggeredActions.utils = {
    createStableId,
    getComparableKeys,
    getCurrentHost,
    getTimestampBucket,
    hostMatches,
    normalizeId,
    normalizeHost,
    normalizeInteger,
    normalizeStringList,
    normalizeText
  };
})(window);
