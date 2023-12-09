if (typeof window.pageScore === 'undefined') {
  window.pageScore = 0;
}
if (typeof window.parsedKeywords === 'undefined') {
  window.parsedKeywords = [];
}

// Global variable for overlay  
if (typeof window.overlay === 'undefined') {
  window.overlay = null;
}

function blockPage(keyword = "Unknown", contextText = "N/A") {
  if (window.pageBlocked) return; // Return if page is already blocked

  // Store the original display styles of all children
  window.originalStyles = Array.from(document.body.children).map(child => child.style.display);

  // Store the original overflow style
  window.originalOverflow = document.documentElement.style.overflow;

  document.documentElement.style.overflow = 'hidden';  // Hide scrollbars
  Array.from(document.body.children).forEach(child => child.style.display = 'none'); // Hide all other elements

  var overlay = document.createElement("div");
  overlay.style.position = 'fixed';
  overlay.style.top = '0';
  overlay.style.left = '0';
  overlay.style.width = '100vw';
  overlay.style.height = '100vh';
  overlay.style.backgroundColor = '#ffffff'; // Soft white background
  overlay.style.color = '#333333'; // Dark grey text for readability
  overlay.style.zIndex = '1000';
  overlay.style.display = 'flex';
  overlay.style.flexDirection = 'column';
  overlay.style.justifyContent = 'center';
  overlay.style.alignItems = 'center';
  overlay.style.textAlign = 'center';
  overlay.style.padding = '20px';
  overlay.style.boxSizing = 'border-box';
  overlay.style.fontSize = '20px';
  overlay.style.fontFamily = 'Arial, sans-serif';
  overlay.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.1)'; // Subtle box shadow for depth
  overlay.style.zIndex = '2147483647'; // Use the maximum possible value
  overlay.innerHTML = `
    <h2 style="color: #d32f2f;">Content Blocked</h2>
    <p>This page contains restricted content and has been blocked for your protection.</p>
    <p><strong>Keyword Detected:</strong> ${keyword}</p>
    <p><strong>Context:</strong> "${contextText}"</p>
    <button id="goBackButton" style="padding: 10px 20px; background-color: #4CAF50; color: white; border: none; border-radius: 5px; cursor: pointer; margin-top: 20px;">Go Back</button>
    <button id="timerButton" style="padding: 10px 20px; background-color: #4CAF50; color: white; border: none; border-radius: 5px; cursor: pointer; margin-top: 20px;">Activate Timer</button>
  `;
  
  window.overlay = overlay; // Store overlay globally
  document.body.appendChild(overlay);

  // Pause any playing media
  function pauseMedia() {
    document.querySelectorAll('video, audio').forEach(media => {
      if (!media.paused) {
        media.pause();
      }
    });
  }
  setInterval(pauseMedia, 1000);

    // Timer activation logic
    document.getElementById('timerButton').addEventListener('click', function() {

      // Retrieve timer settings from chrome storage
      chrome.storage.sync.get("websiteGroups", ({ websiteGroups }) => {
        const currentUrl = window.location.href;
        const normalizedUrl = normalizeURL(currentUrl);
  
        // Find the current group based on URL
        const currentGroup = websiteGroups.find(group =>
          group.websites.some(website => normalizedUrl.includes(normalizeURL(website)))
        );
  
        if (currentGroup && currentGroup.timer) {
          
          // Calculate timers left for the day
          let timersLeft = currentGroup.timer.count - currentGroup.timer.usedToday;
          console.log(`Timer settings for the group: Count - ${currentGroup.timer.count}, Duration - ${currentGroup.timer.duration}, Timers Left Today - ${timersLeft}`);

          // Check if the daily limit is not exceeded
          if (timersLeft > 0) {
          console.log('page available');
            // Hide the overlay while timer is active
            window.overlay.style.display = 'none';
            window.pageBlocked = false;

            // Restore original styles to the page elements
            Array.from(document.body.children).forEach((child, index) => {
              child.style.display = window.originalStyles[index];
            });
            // Restore original styles to the page elements and enable scrolling
            document.documentElement.style.overflow = window.originalOverflow;
            Array.from(document.body.children).forEach((child, index) => {
              child.style.display = window.originalStyles[index];
            });

            // Increment the usedToday counter
            currentGroup.timer.usedToday++;
            chrome.storage.sync.set({ websiteGroups });
  
            // Pause scanning
            window.isTimerActive = true;

            // Inside the timer activation logic in blockPage function
            let timerDuration = currentGroup.timer.duration;
            let timerInterval = setInterval(() => {
              updateBadgeScore(timerDuration);
              timerDuration--;

              if (timerDuration < 0) {
                clearInterval(timerInterval);
                window.isTimerActive = false;
                updateBadgeScore(); // Revert back to displaying the pageScore
              }
            }, 1000);
  
            // Set a timeout to resume scanning after timer duration
            setTimeout(() => {
              window.overlay.style.display = 'flex'; // Show the overlay again
              window.isTimerActive = false;

               // Re-enable the timer button
              timerButton.textContent = "Activate Timer";
              timerButton.disabled = false;
            }, currentGroup.timer.duration * 1000); // Convert seconds to milliseconds
  
            // Provide feedback to the user
            timerButton.textContent = `Timer activated for ${currentGroup.timer.duration} seconds`;
            timerButton.disabled = true;
          } else {
            timerButton.textContent = "Daily limit reached";
            timerButton.disabled = true;
          }
        }
      });
    });

  overlay.appendChild(overlay);
  document.body.appendChild(overlay);

  document.getElementById('goBackButton').addEventListener('click', function(event) {
      event.stopPropagation();
      window.history.back();
  });

  // Listen to the popstate event to refresh the page
  window.addEventListener('popstate', function() {
      window.location.reload();
  });
  window.pageBlocked = true; // Set the flag to indicate the page is blocked
}

if (typeof window.pageBlocked === 'undefined') {
  window.pageBlocked = false;
}

function extractContext(text, keyword, maxWords = 15, maxLength = 100) {
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
  return ''; // Return empty string if keyword is not found
}

function scanTextNodes(element, calculateScore) {
  if (window.pageBlocked || window.isTimerActive) return;

  // Function to scan and process text within a single node
  const scanAndProcessText = (text) => {
    window.parsedKeywords.forEach(({ keyword, operation, value }) => {
      // Use a regular expression to find all occurrences of the keyword
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

  // Recursive function to scan all text nodes
  const recursiveScan = (node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent.trim();
      if (text) {
        scanAndProcessText(text);
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
  // Normalize currentSite by removing 'www.'
  const normalizedCurrentSite = currentSite.replace(/^www\./, '').toLowerCase();

  for (let group of websiteGroups) {
    // Normalize each website in the group for comparison
    const normalizedGroupWebsites = group.websites.map(site => site.replace(/^www\./, '').toLowerCase());
    if (normalizedGroupWebsites.some(site => normalizedCurrentSite.includes(site))) {
      if (callback) callback(group);  // Pass the matching group to the callback
      return group.keywords;
    }
  }
  return []; // Return an empty array if no matching group is found
}

// Add the normalizeURL function here because functions are not shared across files
function normalizeURL(site) {
  return site.replace(/^(?:https?:\/\/)?(?:www\.)?/, '').toLowerCase();
}

function performSiteCheck(){
  chrome.storage.sync.get(["whitelistedSites", "websiteGroups"], ({ whitelistedSites, websiteGroups }) => {
    const fullUrl = window.location.href;
    const normalizedUrl = normalizeURL(fullUrl);

    // Log the whitelisted sites more cleanly
    console.log("Whitelisted Sites Array:", whitelistedSites.join(', '));
    console.log("Current URL:", normalizedUrl);

    // Check if the current normalized URL contains any of the whitelisted URLs
    const isWhitelisted = whitelistedSites.some(whitelistedUrl => normalizedUrl.includes(whitelistedUrl));

    // Log the entire websiteGroups array for debugging
    console.log("Website Groups:", JSON.stringify(websiteGroups, null, 2));

    if (isWhitelisted) {
      console.log("This site or part of it is whitelisted. Skipping keyword scan.");
      return;
    }

    let matchingGroup = null;
    const keywords = getGroupKeywords(websiteGroups, normalizedUrl, (group) => { matchingGroup = group; });

    const keywordNames = keywords.map(kw => {
    const parts = kw.split(/(?<!\\),/); // Split by unescaped commas
    return parts[0].trim().replace(/\\,/g, ','); // Replace escaped commas with actual commas
  });

    // Log the keywords that were found for the current site
    console.log("Keywords for current site:", keywordNames.join(', '));

    if (keywords.length > 0) {
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
}
performSiteCheck();

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "performSiteCheck") {
    performSiteCheck();
    sendResponse({status: "Site check performed"});
  }
});

function parseKeyword(keywordStr) {
  // Check if keywordStr is valid
  let keyword = '';
  let operation = '+';
  let value = 1000;
  if (!keywordStr) { return {keyword, operation, value}; }

  // Split by comma, but only if the comma is not preceded by a backslash (escaped comma)
  const parts = keywordStr.split(/(?<!\\),/);

  keyword = parts[0].trim().replace(/\\,/g, ',');

  // Check if the second part is a number
  if (parts.length > 1) {
    const secondPart = parts[1].trim();
    if (isNaN(secondPart)) {
      // If second part is not a number, check if it's a valid operation
      operation = (secondPart === '+' || secondPart === '*') ? secondPart : '+';
    } else {
      // If second part is a number, assign it to value
      value = parseFloat(secondPart);
    }
  }

  // Assign the third part as value if it exists
  if (parts.length > 2 && !isNaN(parts[2].trim())) {
    value = parseFloat(parts[2].trim());
  }

  return { keyword, operation, value };
}

function calculateScore(operation, value, keyword, contextText) {
  if (operation === '*') {
      window.pageScore = window.pageScore === 0 ? value : window.pageScore * value;
  } else if (operation === '+') {
      window.pageScore += value;
  }
  updateBadgeScore();
  console.log(`Current window.pageScore: ${window.pageScore} (Keyword: "${keyword}", Context: "${contextText}")`);
  if (window.pageScore >= 1000 && !window.pageBlocked) {
      blockPage(keyword, contextText);
  }
}

function scanForKeywords(keywords) {
  const rootElement = document.querySelector('body');
  window.parsedKeywords = keywords.map(parseKeyword);
  scanTextNodes(rootElement, calculateScore);
}

function observeMutations(keywords) {
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
  let badgeText = timerRemaining !== null ? timerRemaining.toString() : window.pageScore.toString();
  chrome.runtime.sendMessage({ action: 'updateBadge', score: badgeText });
}