console.log('Privacy Guardian background service worker loaded');

// Listen for messages from popup or content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'piiDetected') {
    // Could increment detection count, store stats, etc.
    chrome.storage.local.get(['detectionCount'], (result) => {
      let count = result.detectionCount || 0;
      count++;
      chrome.storage.local.set({ detectionCount: count });
      console.log(`PII detected count is now ${count}`);
    });
  }
  if (message.action === 'itemBlocked') {
    chrome.storage.local.get(['blockedCount'], (result) => {
      let count = result.blockedCount || 0;
      count++;
      chrome.storage.local.set({ blockedCount: count });
      console.log(`Items blocked count is now ${count}`);
    });
  }
});
