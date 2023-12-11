if (typeof window.pageScore === 'undefined') {
  window.pageScore = 0;
}
if (typeof window.parsedKeywords === 'undefined') {
  window.parsedKeywords = [];
}
if (typeof window.blockDiv === 'undefined') {
  window.blockDiv = null;
}

function blockPage(keyword = "Unknown", contextText = "N/A") {
  if (window.pageBlocked || window.isTimerActive) return;

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
  blockDiv.style.backgroundColor = '#333333'; // Dark background
  blockDiv.style.color = '#ffffff'; // Light text
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
  contentDiv.style.backgroundColor = '#4c4c4c'; // Darker shade for inner div
  contentDiv.style.borderRadius = '8px';

  contentDiv.innerHTML = `
  <h2 style="color: #ff4444;">Content Blocked</h2>
  <p>This page contains restricted content and has been blocked for your protection.</p>
  <p><strong>Keyword Detected:</strong> ${keyword}</p>
  <p><strong>Context:</strong> "${contextText}"</p>
  <button id="goBackButton" style="padding: 10px 20px; background-color: #4CAF50; color: white; border: none; border-radius: 5px; cursor: pointer; margin-top: 20px;">Go Back</button>
  <button id="timerButton" style="padding: 10px 20px; background-color: #4CAF50; color: white; border: none; border-radius: 5px; cursor: pointer; margin-top: 20px;">Activate Timer</button>
  `;

  blockDiv.appendChild(contentDiv);
  document.body.appendChild(blockDiv);

  pauseNewMedia();
  const pauseInterval = setInterval(pauseNewMedia, 500);
  setTimeout(() => {
    clearInterval(pauseInterval);
  }, 5000);

  document.getElementById('timerButton').addEventListener('click', function() {
    chrome.storage.sync.get("websiteGroups", ({ websiteGroups }) => {
      const currentUrl = window.location.href;
      const normalizedUrl = normalizeURL(currentUrl);

      const currentGroup = websiteGroups.find(group =>
        group.websites.some(website => normalizedUrl.includes(normalizeURL(website)))
      );

      if (currentGroup && currentGroup.timer) {
        
        let timersLeft = currentGroup.timer.count - currentGroup.timer.usedToday;

        if (timersLeft > 0) {
          window.pageBlocked = false;
          window.pageScore = 0;

          window.blockDiv.style.display = 'none';

          Array.from(document.body.children).forEach((child, index) => {
            child.style.display = window.originalStyles[index];
          });
          document.documentElement.style.overflow = window.originalOverflow;
          Array.from(document.body.children).forEach((child, index) => {
            child.style.display = window.originalStyles[index];
          });

          currentGroup.timer.usedToday++;
          chrome.storage.sync.set({ websiteGroups });

          window.isTimerActive = true;

          let timerDuration = currentGroup.timer.duration;
          let timerInterval = setInterval(() => {
            updateBadgeScore(timerDuration);
            timerDuration--;

            if (timerDuration < 0) {
              clearInterval(timerInterval);
              window.isTimerActive = false;
              updateBadgeScore();
            }
          }, 1000);

          setTimeout(() => {
            window.blockDiv.style.display = 'flex';
            window.isTimerActive = false;

            timerButton.textContent = "Activate Timer";
            timerButton.disabled = false;
          }, currentGroup.timer.duration * 1000);

          timerButton.textContent = `Timer activated for ${currentGroup.timer.duration} seconds`;
          timerButton.disabled = true;
        } else {
          timerButton.textContent = "Daily limit reached";
          timerButton.disabled = true;
        }
      }
    });
  });


  document.getElementById('goBackButton').addEventListener('click', function(event) {
      event.stopPropagation();
      window.history.back();
  });

  window.addEventListener('popstate', function() {
      window.location.reload();
  });
  window.pageBlocked = true;
}

if (typeof window.pageBlocked === 'undefined') {
  window.pageBlocked = false;
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

  const scanAndProcessText = (text, node) => {
    if (window.processedNodes.has(node)) return;
    window.processedNodes.add(node);

    window.parsedKeywords.forEach(({ keyword, operation, value }) => {
      const regex = new RegExp(keyword, 'gi');
      const matches = text.match(regex);

      if (matches && matches.length > 0) {
        matches.forEach(match => {
          const contextText = extractContext(text, keyword);
          calculateScore(operation, value, keyword, contextText);
        });
      }
    });
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

function getGroupKeywords(websiteGroups, currentSite, callback) {
  if (window.pageBlocked || window.isTimerActive) return;
  const normalizedCurrentSite = currentSite.replace(/^www\./, '').toLowerCase();

  for (let group of websiteGroups) {
    const normalizedGroupWebsites = group.websites.map(site => site.replace(/^www\./, '').toLowerCase());
    if (normalizedGroupWebsites.some(site => normalizedCurrentSite.includes(site))) {
      if (callback) callback(group);  // Pass the matching group to the callback
      return group.keywords;
    }
  }
  return [];
}

function normalizeURL(site) {
  return site.replace(/^(?:https?:\/\/)?(?:www\.)?/, '').toLowerCase();
}

function performSiteCheck(){
  if (window.pageBlocked || window.isTimerActive) return;
  chrome.storage.sync.get(["whitelistedSites", "websiteGroups"], ({ whitelistedSites, websiteGroups }) => {
    const fullUrl = window.location.href;
    const normalizedUrl = normalizeURL(fullUrl);

    const isWhitelisted = whitelistedSites.some(whitelistedUrl => normalizedUrl.includes(whitelistedUrl));
    if (isWhitelisted) return;

    let matchingGroup = null;
    const keywords = getGroupKeywords(websiteGroups, normalizedUrl, (group) => { matchingGroup = group; });

    keywords.map(kw => {
      const parts = kw.split(/(?<!\\),/); // Split by unescaped commas
      return parts[0].trim().replace(/\\,/g, ','); // Replace escaped commas with actual commas
    });
    if (keywords.length > 0) {
      scanForKeywords(keywords);
      observeMutations(keywords);
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
  updateBadgeScore();
  if (window.pageScore >= 1000 && !window.pageBlocked) {
      blockPage(keyword, contextText);
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
  let badgeText = timerRemaining !== null ? timerRemaining.toString() - 1 : window.pageScore.toString();
  chrome.runtime.sendMessage({ action: 'updateBadge', score: badgeText });
}