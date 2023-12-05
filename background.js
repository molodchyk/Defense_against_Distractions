chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.sync.set({ blockedKeywords: ["porn"] });
});
chrome.action.onClicked.addListener(function(tab) {
  chrome.tabs.create({'url': chrome.runtime.getURL('options.html')});
});
