// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

export function download(options) {
  return new Promise((resolve, reject) => {
    chrome.downloads.download(options, downloadId => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
        return;
      }

      resolve(downloadId);
    });
  });
}
