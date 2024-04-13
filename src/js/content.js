/*
 * Defense Against Distractions Extension
 *
 * file: content.js
 *
 * This file is part of the Defense Against Distractions Extension.
 *
 * Defense Against Distractions Extension is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * Defense Against Distractions Extension is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with Defense Against Distractions Extension. If not, see <http://www.gnu.org/licenses/>.
 *
 * Author: Oleksandr Molodchyk
 * Copyright (C) 2023-2024 Oleksandr Molodchyk
 */

if (typeof window.pageScore === 'undefined') {
  window.pageScore = 0;
}
if (typeof window.parsedKeywords === 'undefined') {
  window.parsedKeywords = [];
}
if (typeof window.blockDiv === 'undefined') {
  window.blockDiv = null;
}

if (typeof window.pageBlocked === 'undefined') {
  window.pageBlocked = false;
}

function blockPage() {
  if (window.pageBlocked) return;

  console.log('Page blocking initiated. Current URL:', window.location.href);
  const extensionPageUrl = chrome.runtime.getURL('src/blocked.html');
  window.location.href = extensionPageUrl;
  window.pageBlocked = true;
  console.log('Redirecting to block page.');
}


document.addEventListener('DOMContentLoaded', function() {
  console.log('DOM fully loaded. URL:', window.location.href);
  performSiteCheck();
});


function extractContext(text, keyword, maxWords = 15, maxLength = 100) {
  if (window.pageBlocked) return;
  const words = text.split(/\s+/);
  const keywordIndex = words.findIndex(w => w.toLowerCase().includes(keyword.toLowerCase()));

  if (keywordIndex >= 0) {
    const start = Math.max(keywordIndex - Math.floor(maxWords / 2), 0);
    const end = Math.min(start + maxWords, words.length);
    let context = words.slice(start, end).join(' ');

    // Truncate if context exceeds maxLength
    if (context.length > maxLength) {
      context = context.substring(0, maxLength) + '...';
    }
    return context;
  }
  return '';
}

if (typeof window.processedNodes === 'undefined') {
  window.processedNodes = new Set();
}

function scanTextNodes(element, calculateScore) {
  if (window.pageBlocked) return;

  var val_to_be_subtracted = 0;
  const scanAndProcessText = (text, node) => {
    if (window.processedNodes.has(node)) return;


    window.parsedKeywords.forEach(keywordObj => {
      if (keywordObj) {
        const { keyword, operation, value } = keywordObj;
        const regex = new RegExp(keyword, 'gi');
        const matches = text.match(regex);

        if (matches && matches.length > 0) {
          matches.forEach(match => {
            const contextText = extractContext(text, keyword);
            calculateScore(operation, value, keyword, contextText);
            val_to_be_subtracted = val_to_be_subtracted + value;
          });
        }
      }
    });
    
    // Initial scan of the text node
    processTextNode(text, node);

  };

  const processTextNode = (text, node) => {
    // Set a delay to check for any changes in the text node
    setTimeout(() => {
      if (node.textContent.trim() !== text) {
        // Re-process the text node if the content has changed
        processTextNode(node.textContent.trim(), node);
      }
      else {
        window.processedNodes.add(node);
        window.parsedKeywords.forEach(keywordObj => {
          if (keywordObj) {
            const { keyword, operation, value } = keywordObj;
            const regex = new RegExp(keyword, 'gi');
            const matches = text.match(regex);
  
            if (matches && matches.length > 0) {
              matches.forEach(match => {
                const contextText = extractContext(text, keyword);
                if (value - val_to_be_subtracted > 0)
                {
                  calculateScore(operation, value, keyword, contextText);
                  val_to_be_subtracted = val_to_be_subtracted - value;
                }
              });
            }
          }
        });
      }
    }, 1000); // Adjust the delay as needed
  };
  

  const recursiveScan = (node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent.trim();
      if (text) {
        scanAndProcessText(text, node);
      }
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      Array.from(node.childNodes).forEach(child => {
        recursiveScan(child);
      });
    }
  };

  recursiveScan(element);
}

function getGroupKeywords(websiteGroups, currentSite) {
  if (window.pageBlocked) return;
  const normalizedCurrentSite = currentSite.replace(/^www\./, '').toLowerCase();
  let allKeywords = [];

  websiteGroups.forEach(group => {
    const normalizedGroupWebsites = group.websites.map(site => site.replace(/^www\./, '').toLowerCase());
    if (normalizedGroupWebsites.some(site => normalizedCurrentSite.includes(site))) {
      // Accumulate keywords from all matching groups
      allKeywords = allKeywords.concat(group.keywords);
    }
  });

  return allKeywords;
}

function normalizeURL(site) {
  return site.replace(/^(?:https?:\/\/)?(?:www\.)?/, '').toLowerCase();
}

function performSiteCheck() {
  if (window.pageBlocked) return;

  console.log('Starting site check. Current URL:', window.location.href);

  // Retrieve all keys from storage
  chrome.storage.sync.get(null, (items) => {
    const fullUrl = window.location.href;
    const normalizedUrl = normalizeURL(fullUrl);
    let allKeywords = [];

    // Check if current site is whitelisted
    const whitelistedSites = items.whitelistedSites || [];
    const isWhitelisted = whitelistedSites.some(whitelistedUrl => normalizedUrl.includes(whitelistedUrl));
    if (isWhitelisted) return;

    // Iterate over all groups to collect keywords
    Object.values(items).forEach(group => {
      if (group.id && group.websites) {
        const normalizedGroupWebsites = group.websites.map(site => normalizeURL(site));
        if (normalizedGroupWebsites.some(site => normalizedUrl.includes(site))) {
          allKeywords = allKeywords.concat(group.keywords);
        }
      }
    });

    if (allKeywords.length > 0) {
      window.parsedKeywords = allKeywords.map(parseKeyword); // Parse keywords for all matching groups
      const rootElement = document.querySelector('body');
      scanTextNodes(rootElement, calculateScore);
      observeMutations(allKeywords || []);
    }
  });
  console.log('Site check completed. Keywords parsed:', window.parsedKeywords.length);
}
performSiteCheck();

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "performSiteCheck") {
    performSiteCheck();
    sendResponse({status: "Site check performed"});
  }
});

function parseKeyword(keywordStr) {
  if (window.pageBlocked) return;
  let keyword = '';
  let operation = '+';
  let value = 1000;
  if (!keywordStr) { return {keyword, operation, value}; }

  const parts = keywordStr.split(/(?<!\\),/);

  keyword = parts[0].trim().replace(/\\,/g, ',');

  if (parts.length > 1) {
    const secondPart = parts[1].trim();
    if (isNaN(secondPart)) {
      operation = (secondPart === '+' || secondPart === '*') ? secondPart : '+';
    } else {
      value = parseFloat(secondPart);
    }
  }

  if (parts.length > 2 && !isNaN(parts[2].trim())) {
    value = parseFloat(parts[2].trim());
  }

  return { keyword, operation, value };
}

function calculateScore(operation, value, keyword, contextText) {
  if (window.pageBlocked) return;
  if (operation === '*') {
      window.pageScore = window.pageScore === 0 ? value : window.pageScore * value;
  } else if (operation === '+') {
      window.pageScore += value;
  }
  console.log(`Window.pageScore: ${window.pageScore}. Keyword: ${keyword}`)
  updateBadgeScore();
  if (window.pageScore >= 1000 && !window.pageBlocked) {
      blockPage(keyword);
  }
}

function scanForKeywords(keywords) {
  if (window.pageBlocked) return;
  const rootElement = document.querySelector('body');
  window.parsedKeywords = keywords.map(parseKeyword);
  scanTextNodes(rootElement, calculateScore);
}

function observeMutations(keywords) {
  // Ensure keywords is always an array
  keywords = Array.isArray(keywords) ? keywords : [];
  
  const observer = new MutationObserver(mutations => {
    mutations.forEach(mutation => {
      mutation.addedNodes.forEach(node => {
        window.parsedKeywords = keywords.map(parseKeyword);
        scanTextNodes(node, calculateScore);
      });
    });
  });

  const config = { childList: true, subtree: true };
  observer.observe(document.body, config);
}

function updateBadgeScore(timerRemaining = null) {
  let badgeText;
  if (timerRemaining !== null) {
    badgeText = Math.round(timerRemaining).toString();
  } else {
    badgeText = Math.round(window.pageScore).toString();
  }
  chrome.runtime.sendMessage({ action: 'updateBadge', score: badgeText });
}

window.onpageshow = function(event) {
  if (event.persisted) {
    // Resetting states
    window.pageBlocked = false;
    window.pageScore = 0;
    window.processedNodes.clear();  // Ensure text nodes are reprocessed
    window.parsedKeywords = [];     // Reset parsed keywords

    console.log('Popstate event: Resetting all states and re-evaluating the page.');

    // Fully reinitialize the site check to imitate a fresh page load
    document.addEventListener('DOMContentLoaded', function() {
      performSiteCheck();
    });
    
    // Manually trigger DOMContentLoaded if necessary
    var readyStateCheckInterval = setInterval(function() {
      if (document.readyState === "complete") {
        clearInterval(readyStateCheckInterval);
        performSiteCheck();
      }
    }, 10);
  }
};




