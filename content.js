if (typeof window.pageScore === 'undefined') {
  window.pageScore = 0;
}
if (typeof window.parsedKeywords === 'undefined') {
  window.parsedKeywords = [];
}

// Global variable for blockDiv
if (typeof window.blockDiv === 'undefined') {
  window.blockDiv = null;
}

function blockPage(keyword = "Unknown", contextText = "N/A") {
  if (window.pageBlocked) return; // Return if page is already blocked

  console.log(`page is blocked`);

  // Store the original display styles of all children
  window.originalStyles = Array.from(document.body.children).map(child => child.style.display);

  // Store the original overflow style
  window.originalOverflow = document.documentElement.style.overflow;

  document.documentElement.style.overflow = 'hidden';  // Hide scrollbars
  Array.from(document.body.children).forEach(child => child.style.display = 'none'); // Hide all other elements

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
  blockDiv.style.zIndex = '2147483647'; // Use the maximum possible value

  window.blockDiv = blockDiv; // Store blockDiv globally

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

    // Create a timer button
    const timerButton = document.createElement("button");
    timerButton.textContent = "Activate Timer";
    timerButton.style.padding = "10px 20px";
    timerButton.style.backgroundColor = "#4CAF50";
    timerButton.style.color = "white";
    timerButton.style.border = "none";
    timerButton.style.borderRadius = "5px";
    timerButton.style.cursor = "pointer";
    timerButton.style.marginTop = "20px";
  
    // Add the timer button to the contentDiv
    contentDiv.appendChild(timerButton);
  
    // Call this function immediately and then every few seconds for a short period
    pauseNewMedia();
    console.log("media paused");
    const pauseInterval = setInterval(pauseNewMedia, 500); // Check every 0.5 seconds
    // Set a timeout to stop the interval after 5 seconds
    setTimeout(() => {
      clearInterval(pauseInterval);
    }, 5000);

    // Timer activation logic
    timerButton.addEventListener('click', function() {

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
            console.log(`page is unblocked`);
            window.pageBlocked = false;
            window.pageScore = 0;

            // Hide the blockDiv while timer is active
            window.blockDiv.style.display = 'none';

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

              if (timerDuration <= 0) {
                clearInterval(timerInterval);
                window.isTimerActive = false;
                updateBadgeScore(); // Revert back to displaying the pageScore
              }
            }, 1000);
  
            // Set a timeout to resume scanning after timer duration
            setTimeout(() => {
              window.blockDiv.style.display = 'flex'; // Show the blockDiv again
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

  blockDiv.appendChild(contentDiv);
  document.body.appendChild(blockDiv);

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

function pauseNewMedia() {
  const mediaElements = document.querySelectorAll('video, audio');
  mediaElements.forEach(media => {
    if (!media.paused && !media.dataset.wasPaused) {
      media.pause();
      media.dataset.wasPaused = 'true'; // Mark it as paused by the script
    }
  });
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

// Global set to keep track of processed nodes
if (typeof window.processedNodes === 'undefined') {
  window.processedNodes = new Set();
}

function scanTextNodes(element, calculateScore) {
  if (window.pageBlocked || window.isTimerActive) return;

  // Function to scan and process text within a single node
  const scanAndProcessText = (text, node) => {
    // Check if the node has already been processed
    if (window.processedNodes.has(node)) return;
    window.processedNodes.add(node);

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
  if (window.pageBlocked || window.isTimerActive) return;
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
  if (window.pageBlocked || window.isTimerActive) return;
  if (operation === '*') {
      window.pageScore = window.pageScore === 0 ? value : window.pageScore * value;
  } else if (operation === '+') {
      window.pageScore += value;
  }
  updateBadgeScore();
  console.log(`Current window.pageScore: ${window.pageScore} (Keyword: "${keyword}", Context: "${contextText}")`);
  if (window.pageScore >= 1000 && !window.pageBlocked) {
      blockPage(keyword, contextText); //line 201
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
  chrome.runtime.sendMessage({ action: 'updateBadge', score: badgeText});
}