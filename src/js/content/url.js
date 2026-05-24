// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

(function(global) {
  global.DAD = global.DAD || {};

  global.DAD.normalizeUrl = function(value) {
    return value.replace(/^(?:https?:\/\/)?(?:www\.)?/, '').toLowerCase();
  };
})(window);
