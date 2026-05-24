// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

(function(global) {
  global.DAD = global.DAD || {};

  global.DAD.parseKeyword = function(keywordStr) {
    let keyword = '';
    let operation = '+';
    let value = 1000;

    if (!keywordStr) {
      return { keyword, operation, value };
    }

    const parts = keywordStr.split(/(?<!\\),/);
    keyword = parts[0].trim().replace(/\\,/g, ',');

    if (parts.length > 1) {
      const secondPart = parts[1].trim();
      if (Number.isNaN(Number(secondPart))) {
        operation = secondPart === '+' || secondPart === '*' ? secondPart : '+';
      } else {
        value = Number.parseFloat(secondPart);
      }
    }

    if (parts.length > 2 && !Number.isNaN(Number(parts[2].trim()))) {
      value = Number.parseFloat(parts[2].trim());
    }

    return { keyword, operation, value };
  };

  global.DAD.createKeywordRegex = function(keyword) {
    const escapedKeyword = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(escapedKeyword, 'gi');
  };
})(window);
