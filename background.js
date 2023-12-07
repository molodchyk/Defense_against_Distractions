chrome.action.onClicked.addListener(function(tab) {
  chrome.tabs.create({'url': chrome.runtime.getURL('options.html')});
});

chrome.webNavigation.onHistoryStateUpdated.addListener(function(details) {
  if (!details.url.startsWith("chrome://")) {
    chrome.scripting.executeScript({
      target: { tabId: details.tabId },
      files: ['content.js']
    }, () => {
      if (chrome.runtime.lastError) {
        console.error(chrome.runtime.lastError.message);
        return;
      }
      chrome.tabs.sendMessage(details.tabId, {action: "performSiteCheck"});
    });
  }
});
