/**
 * contentBlocker.js
 * This module is responsible for scanning web page content and blocking it if certain keywords are detected.
 * It works in conjunction with keywordManager.js to manage the list of blocked keywords.
 */

let isPageBlocked = false; // Flag to indicate if the page has been blocked

function blockPage(keyword, contextText) {
  if (!isPageBlocked) {
    var blockDiv = document.createElement("div");
    blockDiv.style.position = 'fixed';
    blockDiv.style.top = '0';
    blockDiv.style.left = '0';
    blockDiv.style.width = '100vw';
    blockDiv.style.height = '100vh';
    blockDiv.style.backgroundColor = '#ffffff'; // Soft white background
    blockDiv.style.color = '#333333'; // Dark grey text for readability
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
    blockDiv.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.1)'; // Subtle box shadow for depth

    var contentDiv = document.createElement("div");
    contentDiv.style.maxWidth = '600px'; // Max width for content area
    contentDiv.style.margin = '0 auto';
    contentDiv.style.padding = '30px';
    contentDiv.style.backgroundColor = '#f8f8f8'; // Light grey background for content area
    contentDiv.style.borderRadius = '8px'; // Rounded corners

    contentDiv.innerHTML = `
      <h2 style="color: #d32f2f;">Content Blocked</h2>
      <p>This page contains restricted content and has been blocked for your protection.</p>
      <p><strong>Keyword Detected:</strong> ${keyword}</p>
      <p><strong>Context:</strong> "${contextText}"</p>
      <button id="goBackButton" style="padding: 10px 20px; background-color: #4CAF50; color: white; border: none; border-radius: 5px; cursor: pointer; margin-top: 20px;">Go Back</button>
    `;

    blockDiv.appendChild(contentDiv);
    document.body.appendChild(blockDiv);

    // Add functionality to go back and refresh
    document.getElementById('goBackButton').addEventListener('click', function() {
      window.history.back();
    });

    // Listen to the popstate event to refresh the page
    window.addEventListener('popstate', function() {
      window.location.reload();
    });

    isPageBlocked = true;
  }
}

function extractContext(text, keyword, maxWords = 15) {
  const words = text.split(/\s+/);
  const keywordIndex = words.findIndex(w => w.toLowerCase().includes(keyword.toLowerCase()));
  
  if (keywordIndex >= 0) {
    const start = Math.max(keywordIndex - Math.floor(maxWords / 2), 0);
    const end = Math.min(start + maxWords, words.length);
    return words.slice(start, end).join(' ');
  }
  return text; // Fallback if keyword is not found
}


// Function to scan text nodes for blocked keywords
function scanTextNodes(element, blockedKeywords) {
  if (isPageBlocked) return;

  if (element.nodeType === Node.TEXT_NODE) {
      const text = element.textContent.trim();
      if (text) {
          blockedKeywords.forEach(keyword => {
              if (text.toLowerCase().includes(keyword.toLowerCase())) {
                  const contextText = extractContext(text, keyword);
                  blockPage(keyword, contextText);
              }
          });
      }
  } else if (element.nodeType === Node.ELEMENT_NODE) {
      Array.from(element.childNodes).forEach(child => scanTextNodes(child, blockedKeywords));
  }
}

// Function to start scanning the body of the page for blocked keywords
function scanForKeywords(blockedKeywords) {
  const rootElement = document.querySelector('body');
  scanTextNodes(rootElement, blockedKeywords);
}

// Function to observe mutations (changes) in the DOM and scan new nodes
function observeMutations(blockedKeywords) {
  const observer = new MutationObserver(mutations => {
      if (isPageBlocked) {
          observer.disconnect();
          return;
      }

      mutations.forEach(mutation => {
          mutation.addedNodes.forEach(node => scanTextNodes(node, blockedKeywords));
      });
  });

  observer.observe(document.body, { childList: true, subtree: true });
}

// Check storage for blocked keywords and whitelisted sites, and initiate scanning
chrome.storage.sync.get(["blockedKeywords", "whitelistedSites"], ({ blockedKeywords, whitelistedSites }) => {
  const currentSite = window.location.hostname.toLowerCase();

  if (whitelistedSites && whitelistedSites.includes(currentSite)) {
      console.log("This site is whitelisted. Skipping keyword scan.");
  } else {
      scanForKeywords(blockedKeywords);
      observeMutations(blockedKeywords);
  }
});