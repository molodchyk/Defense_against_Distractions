chrome.action.onClicked.addListener(function(tab) {
  chrome.tabs.create({'url': chrome.runtime.getURL('options.html')});
});

chrome.webNavigation.onHistoryStateUpdated.addListener(function(details) {
  if (!details.url.startsWith("chrome://")) {
    chrome.tabs.get(details.tabId, function(tab) {
      if (chrome.runtime.lastError) {
        console.error("Error retrieving tab: ", chrome.runtime.lastError.message);
        return;
      }

      if (tab.status === "complete") {
        // Inject the content script
        chrome.scripting.executeScript({
          target: { tabId: details.tabId },
          files: ['content.js']
        }, () => {
          if (chrome.runtime.lastError) {
            console.error("Error injecting script: ", chrome.runtime.lastError.message);
            return;
          }

          // Send a message to the content script after a delay
          setTimeout(() => {
            chrome.tabs.sendMessage(details.tabId, {action: "performSiteCheck"}, function(response) {
              if (chrome.runtime.lastError) {
                console.error("Error sending message: ", chrome.runtime.lastError.message);
              } else {
                console.log(response ? response.status : "No response from content script");
              }
            });
          }, 1000); // Adjust this timeout as needed
        });
      } else {
        console.log("Tab is not complete, waiting to inject script");
      }
    });
  }
});


chrome.runtime.onMessage.addListener((message, sender) => {
  if (message.action === 'updateBadge') {
    const scoreText = message.score.toString();
    chrome.action.setBadgeText({ text: scoreText, tabId: sender.tab.id });
  }
});

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === "install") {
    // This code runs only on the first install
    const defaultWhitelistedSites = ['example.com']; // Replace with your default site
    chrome.storage.sync.set({ whitelistedSites: defaultWhitelistedSites }, () => {
      console.log('Default whitelisted sites added on first install');
    });
  }
});