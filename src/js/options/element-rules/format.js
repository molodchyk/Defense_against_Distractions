// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

export function formatBytes(bytes) {
  if (bytes >= 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${bytes} B`;
}

export function formatList(value) {
  if (Array.isArray(value)) {
    return value.length > 0 ? value.join(' / ') : 'none';
  }

  if (value === undefined || value === null || value === '') {
    return 'none';
  }

  return String(value);
}

export function formatDate(value) {
  if (!value) return 'unknown';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}
