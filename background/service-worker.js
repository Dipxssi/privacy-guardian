console.log("Privacy Guardian service worker running");

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "LOG") {
    console.log("Log from content script:", message.payload);
  }

});

