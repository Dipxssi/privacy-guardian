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
  
  // Handle risk check requests from content script or popup
  if (message.action === 'checkWebsiteRisk') {
    checkWebsiteRisk(message.url)
      .then(data => sendResponse({ success: true, data }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true; // Indicates we will send a response asynchronously
  }
  
  // Handle PII detection requests (for AI detection)
  if (message.action === 'detectPII') {
    detectPII(message.text)
      .then(data => sendResponse({ success: true, entities: data.entities || [] }))
      .catch(error => {
        // Silently fail - regex detection will still work
        sendResponse({ success: false, entities: [] });
      });
    return true;
  }
});

// API Configuration - Supports both cloud and local
// Set your cloud API URL here, or leave empty to use localhost
const CLOUD_API_URL = "https://privacy-guardian-api.onrender.com";
const LOCAL_API_URL = "http://localhost:9000";

// Function to get API URL (cloud first, then local fallback)
async function getApiUrl() {
  // Check if user has configured a custom API URL
  const result = await chrome.storage.sync.get(['apiUrl']);
  if (result.apiUrl) {
    return result.apiUrl;
  }
  
  // Use cloud URL if configured, otherwise localhost
  return CLOUD_API_URL || LOCAL_API_URL;
}

// Function to check website risk via API
async function checkWebsiteRisk(url) {
  const apiUrl = await getApiUrl();
  const endpoint = `${apiUrl}/check_website_risk`;
  
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ url }),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    // If cloud API fails and we're using cloud, try localhost as fallback
    if (apiUrl !== LOCAL_API_URL && apiUrl.includes('http')) {
      console.log("Cloud API failed, trying localhost fallback...");
      try {
        const localResponse = await fetch(`${LOCAL_API_URL}/check_website_risk`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ url }),
        });
        
        if (localResponse.ok) {
          return await localResponse.json();
        }
      } catch (localError) {
        console.log("Localhost fallback also failed");
      }
    }
    
    console.error("Failed to fetch risk info:", error);
    throw error;
  }
}

// Function to detect PII using AI (optional)
async function detectPII(text) {
  try {
    const response = await fetch("http://localhost:8000/detect_pii", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });

    if (!response.ok) {
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    // Silently fail - this is optional, regex detection will still work
    console.log('AI PII detection service not available');
    return { entities: [] };
  }
}
