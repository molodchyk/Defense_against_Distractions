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
        console.error("Error injecting script: ", chrome.runtime.lastError.message);
        return;
      }
      // Wait a bit before sending the message
      setTimeout(() => {
        chrome.tabs.sendMessage(details.tabId, {action: "performSiteCheck"}, function(response) {
          if (chrome.runtime.lastError) {
            console.error("Error sending message: ", chrome.runtime.lastError.message);
          } else {
            console.log(response ? response.status : "No response from content script");
          }
        });
      }, 500); // Adjust this timeout as needed
    });
  }
});
