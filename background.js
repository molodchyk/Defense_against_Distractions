chrome.action.onClicked.addListener(function(tab) {
  chrome.tabs.create({'url': chrome.runtime.getURL('options.html')});
});

function injectAndSendMessage(tabId, attempt) {
  chrome.scripting.executeScript({
    target: { tabId: tabId },
    files: ['content.js']
  }, () => {
    if (chrome.runtime.lastError) {
      console.error("Error injecting script: ", chrome.runtime.lastError.message);
      return;
    }

    setTimeout(() => {
      chrome.tabs.sendMessage(tabId, {action: "performSiteCheck"}, function(response) {
        if (chrome.runtime.lastError) {
          console.error("Error sending message: ", chrome.runtime.lastError.message);
          if (attempt < 3) { // Retry up to 3 times
            console.log(`Retrying... Attempt ${attempt + 1}`);
            injectAndSendMessage(tabId, attempt + 1);
          }
        } else {
          console.log(response ? response.status : "No response from content script");
        }
      });
    }, 1000 * (attempt + 1));
  });
}

chrome.runtime.onMessage.addListener((message, sender) => {
  if (message.action === 'updateBadge') {
    const scoreText = message.score.toString();
    chrome.action.setBadgeText({ text: scoreText, tabId: sender.tab.id });
  }
});

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === "install") {
    // This code runs only on the first install
    const defaultWhitelistedSites = ['example.com'];
    chrome.storage.sync.set({ whitelistedSites: defaultWhitelistedSites }, () => {
      console.log('Default whitelisted sites added on first install');
    });
  }
});