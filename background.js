chrome.action.onClicked.addListener(function(tab) {
  chrome.tabs.create({'url': chrome.runtime.getURL('options.html')});
});

function tabUpdatedCheck() {
  // Call performSiteCheck to re-run the content checks
  performSiteCheck();
}

chrome.webNavigation.onHistoryStateUpdated.addListener(function(details) {
  chrome.tabs.get(details.tabId, function(tab) {
    if (chrome.runtime.lastError) {
      // Handle error, tab might have been closed
      return;
    }

    if (tab.active) { // Check if the tab is active
      chrome.scripting.executeScript({
        target: { tabId: details.tabId },
        files: ['content.js'] // Make sure to include the content script again if needed
      }, () => {
        if (chrome.runtime.lastError) {
          // Handle error, injection might have failed
        }
      });
    }
  });
});