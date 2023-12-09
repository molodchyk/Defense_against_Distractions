function blockPage(keyword, contextText) {
if (window.pageBlocked) return;
  document.documentElement.style.overflow = 'hidden';
  Array.from(document.body.children).forEach(child => child.style.display = 'none');

  var blockDiv = document.createElement("div");
  blockDiv.style.position = 'fixed';
  blockDiv.style.top = '0';
  blockDiv.style.left = '0';
  blockDiv.style.width = '100vw';
  blockDiv.style.height = '100vh';
  blockDiv.style.backgroundColor = '#ffffff';
  blockDiv.style.color = '#333333';
  blockDiv.style.zIndex = '1000';
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

  var contentDiv = document.createElement("div");
  contentDiv.style.maxWidth = '600px';
  contentDiv.style.margin = '0 auto';
  contentDiv.style.padding = '30px';
  contentDiv.style.backgroundColor = '#f8f8f8';
  contentDiv.style.borderRadius = '8px';

  contentDiv.innerHTML = `
      <h2 style="color: #d32f2f;">Content Blocked</h2>
      <p>This page contains restricted content and has been blocked for your protection.</p>
      <p><strong>Keyword Detected:</strong> ${keyword}</p>
      <p><strong>Context:</strong> "${contextText}"</p>
      <button id="goBackButton" style="padding: 10px 20px; background-color: #4CAF50; color: white; border: none; border-radius: 5px; cursor: pointer; margin-top: 20px;">Go Back</button>
  `;

  blockDiv.appendChild(contentDiv);
  document.body.appendChild(blockDiv);

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

function extractContext(text, keyword, maxWords = 15) {
  const words = text.split(/\s+/);
  const keywordIndex = words.findIndex(w => w.toLowerCase().includes(keyword.toLowerCase()));
  
  if (keywordIndex >= 0) {
    const start = Math.max(keywordIndex - Math.floor(maxWords / 2), 0);
    const end = Math.min(start + maxWords, words.length);
    return words.slice(start, end).join(' ');
  }
  return text;
}

function scanTextNodes(element, parsedKeywords, calculateScore) {
  if (window.pageBlocked) return false;
  let shouldBlock = false;
  if (element.nodeType === Node.TEXT_NODE) {
    const text = element.textContent.trim();
    if (text) {
      parsedKeywords.forEach(({ keyword, operation, value }) => {
        if (text.toLowerCase().includes(keyword.toLowerCase())) {
          console.log(`Keyword "${keyword}" detected in text.`);
          const contextText = extractContext(text, keyword);
          calculateScore(operation, value);
          blockPage(keyword, contextText);
        }
      });
    }
  } else if (element.nodeType === Node.ELEMENT_NODE) {
    Array.from(element.childNodes).forEach(child => {
      scanTextNodes(child, parsedKeywords, calculateScore);
    });
  }
  return shouldBlock;
}

function getGroupKeywords(websiteGroups, currentSite, callback) {
  const normalizedCurrentSite = currentSite.replace(/^www\./, '').toLowerCase();

  for (let group of websiteGroups) {
    const normalizedGroupWebsites = group.websites.map(site => site.replace(/^www\./, '').toLowerCase());
    if (normalizedGroupWebsites.some(site => normalizedCurrentSite.includes(site))) {
      if (callback) callback(group);
      return group.keywords;
    }
  }
  return [];
}

function normalizeURL(site) {
  return site.replace(/^(?:https?:\/\/)?(?:www\.)?/, '').toLowerCase();
}

function performSiteCheck(){
  if (window.hasPerformedSiteCheck) return;
  window.hasPerformedSiteCheck = true;
  chrome.storage.sync.get(["whitelistedSites", "websiteGroups"], ({ whitelistedSites, websiteGroups }) => {
    const fullUrl = window.location.href;
    const normalizedUrl = normalizeURL(fullUrl);

    console.log("Whitelisted Sites Array:", whitelistedSites.join(', '));
    console.log("Current URL:", normalizedUrl);

    const isWhitelisted = whitelistedSites.some(whitelistedUrl => normalizedUrl.includes(whitelistedUrl));

    console.log("Website Groups:", JSON.stringify(websiteGroups, null, 2)); //line 125

    if (isWhitelisted) {
      console.log("This site or part of it is whitelisted. Skipping keyword scan.");
      return;
    }

    let matchingGroup = null;
    const keywords = getGroupKeywords(websiteGroups, normalizedUrl, (group) => { matchingGroup = group; });

    console.log("Keywords for current site:", keywords.join(', ')); //line 135

    if (keywords && keywords.length > 0) {
      scanForKeywords(keywords);
      observeMutations(keywords);
    } else {
      if (matchingGroup) {
        console.log(`A matching group was found for this site: "${matchingGroup.groupName}" with sites: ${matchingGroup.websites.join(', ')}, but no keywords were found.`);
      } else {
        console.log("No matching group found for this site, or the group has no keywords.");
      }
    }
  });
  observePageChanges();
}

function observePageChanges(parsedKeywords) {
  let observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {//line 153
      if (mutation.addedNodes.length > 0) {
        console.log("New content detected, performing site check...");
        scanForKeywords(parsedKeywords); //line 156
      }
    });
  });

  observer.observe(document.body, { childList: true, subtree: true });
}
performSiteCheck();

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "performSiteCheck") {
    performSiteCheck();
    sendResponse({status: "Site check performed"});
  }
});

const calculateScore = (operation, value) => {
  if (operation === '*') {
    score = score === 0 ? value : score * value;
  } else if (operation === '+') {
    score += value;
  }
  console.log(`Current score: ${score}`);
  if (score >= 1000) {
    console.log("Score reached 1000. Blocking the page.");
    blockPage("Score limit", "Page blocked due to score limit of 1000 reached.");
    return true;
  }
  return false;
};

let score = 0;
function scanForKeywords(keywords) {
  const rootElement = document.querySelector('body');

  const parseKeyword = (keywordStr) => {
    const parts = keywordStr.split(/\,(?=(?:[^\"]*\"[^\"]*\")*[^\"]*$)/);
    return {
      keyword: parts[0].trim().replace(/\\,/g, ','),
      operation: parts[1].trim(),
      value: parseFloat(parts[2].trim())
    };
  };



  const parsedKeywords = keywords.map(parseKeyword);//line 202

  const blockPageIfNeeded = () => {
    if (scanTextNodes(rootElement, parsedKeywords, calculateScore)) {
      observer.disconnect();
    }
  };

  blockPageIfNeeded();
  observeMutations(parsedKeywords);
}

function observeMutations(parsedKeywords) {
  const observer = new MutationObserver(mutations => {
    mutations.forEach(mutation => {
      mutation.addedNodes.forEach(node => {
        if (scanTextNodes(node, parsedKeywords, calculateScore)) {
          observer.disconnect();
        }
      });
    });
  });

  const config = { childList: true, subtree: true };
  observer.observe(document.body, config);
}
