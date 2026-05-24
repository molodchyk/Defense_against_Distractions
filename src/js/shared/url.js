// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

export function normalizeUrl(value) {
  return stripUrlPrefix(value).toLowerCase();
}

export function stripUrlPrefix(value) {
  return value.replace(/^(?:https?:\/\/)?(?:www\.)?/, '');
}
