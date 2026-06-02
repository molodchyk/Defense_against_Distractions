// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

(function(global) {
  global.DAD = global.DAD || {};
  const contentBlocking = global.DAD.ContentBlocking = global.DAD.ContentBlocking || {};
  const {
    calculateScore,
    observeMutations,
    scanTextNodes
  } = contentBlocking.keywords;

  function performSiteCheck() {
    if (global.pageBlocked) return;

    chrome.storage.sync.get(null, items => {
      const fullUrl = global.location.href;
      const normalizedUrl = global.DAD.normalizeUrl(fullUrl);
      let allKeywords = [];

      const whitelistedSites = items.whitelistedSites || [];
      const isWhitelisted = whitelistedSites.some(whitelistedUrl => normalizedUrl.includes(whitelistedUrl));
      if (isWhitelisted) return;

      Object.values(items).forEach(group => {
        if (group.id && group.websites) {
          const normalizedGroupWebsites = group.websites.map(site => global.DAD.normalizeUrl(site));
          const hasMatchingWebsite = normalizedGroupWebsites.some(site => normalizedUrl.includes(site));
          if (hasMatchingWebsite) {
            allKeywords = allKeywords.concat(group.keywords);
          }
        }
      });
      global.DAD.applyElementBlockRules();

      if (allKeywords.length > 0) {
        global.parsedKeywords = allKeywords.map(global.DAD.parseKeyword);
        const rootElement = document.querySelector('body');
        if (!rootElement) {
          return;
        }
        scanTextNodes(rootElement, calculateScore);
        observeMutations(allKeywords || []);
      }
    });
  }

  contentBlocking.siteCheck = {
    performSiteCheck
  };
})(window);
