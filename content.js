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
 * Copyright (C) 2023 Oleksandr Molodchyk
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

function blockPage(keyword = "Unknown") {
  if (window.pageBlocked || window.isTimerActive) return;



  console.log('page blocked now');
  chrome.runtime.sendMessage({ action: 'toggleImageBlocking', shouldBlock: true }, (response) => {
    console.log(response.status);
  });

  window.originalStyles = Array.from(document.body.children).map(child => child.style.display);

  window.originalOverflow = document.documentElement.style.overflow;

  document.documentElement.style.overflow = 'hidden';  // Hide scrollbars
  Array.from(document.body.children).forEach(child => child.style.display = 'none');

  var blockDiv = document.createElement("div");
  blockDiv.style.position = 'fixed';
  blockDiv.style.top = '0';
  blockDiv.style.left = '0';
  blockDiv.style.width = '100vw';
  blockDiv.style.height = '100vh';
  blockDiv.style.backgroundColor = '#333333';
  blockDiv.style.color = '#ffffff';
  blockDiv.style.display = 'flex';
  blockDiv.style.flexDirection = 'column';
  blockDiv.style.justifyContent = 'center';
  blockDiv.style.alignItems = 'center';
  blockDiv.style.textAlign = 'center';
  blockDiv.style.padding = '20px';
  blockDiv.style.boxSizing = 'border-box';
  blockDiv.style.fontSize = '20px';
  blockDiv.style.fontFamily = 'Arial, sans-serif';
  blockDiv.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.1)';
  blockDiv.style.zIndex = '2147483647'; 

  window.blockDiv = blockDiv;

  var contentDiv = document.createElement("div");
  contentDiv.style.maxWidth = '600px';
  contentDiv.style.margin = '0 auto';
  contentDiv.style.padding = '30px';
  contentDiv.style.backgroundColor = '#4c4c4c';
  contentDiv.style.borderRadius = '8px';

  contentDiv.innerHTML = `
    <h2 style="color: #ff4444;">${chrome.i18n.getMessage("contentBlockedTitle")}</h2>
    <p>${chrome.i18n.getMessage("contentBlockedMessage")}</p>
    <p><strong>${chrome.i18n.getMessage("keywordDetected")}:</strong> ${keyword}</p>
    <div id="countdown" style="font-size: 48px; margin-top: 20px;">4</div>
  `;

  blockDiv.appendChild(contentDiv);
  document.body.appendChild(blockDiv);

  // New code for countdown
  let countdown = 4;
  const countdownElement = document.getElementById('countdown');
  const interval = setInterval(() => {
    countdown -= 1;
    countdownElement.textContent = countdown.toString();
    if (countdown <= 0) {
      clearInterval(interval);
      // Instead of window.close(), redirect to a custom blocked message or about:blank
      window.location.href = 'about:blank'; // or 'chrome-extension://your_extension_id/blocked.html'
    }
  }, 1000);

  window.pageBlocked = true;
}




function pauseNewMedia() {
  if (window.pageBlocked || window.isTimerActive) return;
  const mediaElements = document.querySelectorAll('video, audio');
  mediaElements.forEach(media => {
    if (!media.paused && !media.dataset.wasPaused) {
      media.pause();
      media.dataset.wasPaused = 'true';
    }
  });
}

function extractContext(text, keyword, maxWords = 15, maxLength = 100) {
  if (window.pageBlocked || window.isTimerActive) return;
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
  if (window.pageBlocked || window.isTimerActive) return;

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
  if (window.pageBlocked || window.isTimerActive) return [];
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
  if (window.pageBlocked || window.isTimerActive) return;
  chrome.storage.sync.get(["whitelistedSites", "websiteGroups"], ({ whitelistedSites, websiteGroups }) => {
    const fullUrl = window.location.href;
    const normalizedUrl = normalizeURL(fullUrl);

    const isWhitelisted = whitelistedSites.some(whitelistedUrl => normalizedUrl.includes(whitelistedUrl));
    if (isWhitelisted) return;

    // Get keywords from all matching groups
    const keywords = getGroupKeywords(websiteGroups, normalizedUrl);

    if (keywords.length > 0) {
      window.parsedKeywords = keywords.map(parseKeyword); // Parse keywords for all matching groups
      const rootElement = document.querySelector('body');
      scanTextNodes(rootElement, calculateScore);
      observeMutations(keywords || []);
    }
  });
}
performSiteCheck();

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "performSiteCheck") {
    performSiteCheck();
    sendResponse({status: "Site check performed"});
  }
});

function parseKeyword(keywordStr) {
  if (window.pageBlocked || window.isTimerActive) return;
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
  if (window.pageBlocked || window.isTimerActive) return;
  if (operation === '*') {
      window.pageScore = window.pageScore === 0 ? value : window.pageScore * value;
  } else if (operation === '+') {
      window.pageScore += value;
  }
  console.log(`window.pageScore: ${window.pageScore}. Keyword: ${keyword}`)
  updateBadgeScore();
  if (window.pageScore >= 1000 && !window.pageBlocked) {
      blockPage(keyword);
  }
}

function scanForKeywords(keywords) {
  if (window.pageBlocked || window.isTimerActive) return;
  const rootElement = document.querySelector('body');
  window.parsedKeywords = keywords.map(parseKeyword);
  scanTextNodes(rootElement, calculateScore);
}

function observeMutations(keywords) {
  if (window.pageBlocked || window.isTimerActive) return;
  
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
