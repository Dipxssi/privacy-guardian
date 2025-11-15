let isActive = true;

// Load saved state
chrome.storage.local.get(['isActive', 'detectionCount', 'blockedCount'], (result) => {
  isActive = result.isActive !== false;
  updateUI();

  document.getElementById('detectionCount').textContent = result.detectionCount || 0;
  document.getElementById('blockedCount').textContent = result.blockedCount || 0;

  if (isActive) {
    checkCurrentSiteRisk();
  }
});

// Toggle protection
document.getElementById('toggleBtn').addEventListener('click', () => {
  isActive = !isActive;
  chrome.storage.local.set({ isActive });
  updateUI();

  // Notify content script
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0]) {
      chrome.tabs.sendMessage(tabs[0].id, { action: 'toggleProtection', isActive });
    }
  });

  if (isActive) {
    checkCurrentSiteRisk();
  } else {
    clearRiskDisplay();
  }
});

// Settings button
document.getElementById('settingsBtn').addEventListener('click', () => {
  alert('Settings panel coming soon! 🚀');
});

function updateUI() {
  const statusDot = document.querySelector('.status-dot');
  const statusText = document.getElementById('statusText');
  const toggleBtn = document.getElementById('toggleBtn');

  if (isActive) {
    statusDot.classList.add('active');
    statusText.textContent = 'Protection Active';
    toggleBtn.textContent = 'Disable Protection';
  } else {
    statusDot.classList.remove('active');
    statusText.textContent = 'Protection Disabled';
    toggleBtn.textContent = 'Enable Protection';
  }
}

async function checkCurrentSiteRisk() {
  chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
    if (!tabs[0]) {
      displayError("No active tab found");
      return;
    }
    
    const url = tabs[0].url;
    
    // Skip risk check for browser internal pages
    if (url.startsWith('chrome://') || url.startsWith('edge://') || url.startsWith('about:')) {
      displayError("Cannot check risk for browser pages");
      return;
    }

    // Show loading state
    const riskScoreEl = document.getElementById('riskScore');
    riskScoreEl.textContent = "Loading risk...";
    riskScoreEl.style.color = "#94a3b8";

    try {
      // Use background script to make API call
      chrome.runtime.sendMessage(
        { action: 'checkWebsiteRisk', url: url },
        (response) => {
          if (chrome.runtime.lastError) {
            console.error("Error communicating with background script:", chrome.runtime.lastError);
            displayError("Extension error: " + chrome.runtime.lastError.message);
            return;
          }
          
          if (response && response.success) {
            displayRisk(response.data);
          } else {
            const errorMsg = response?.error || "Unknown error";
            console.error("Error fetching website risk:", errorMsg);
            
            // Check if it's a timeout or connection error (Render spin-down)
            if (errorMsg.includes("aborted") || errorMsg.includes("timeout") || errorMsg.includes("Failed to fetch")) {
              displayError("API is starting up (may take 30-60s). Please wait and try again.");
            } else {
              displayError("API error: " + errorMsg);
            }
          }
        }
      );
    } catch (error) {
      console.error("Error fetching website risk:", error);
      displayError("Failed to check risk: " + error.message);
    }
  });
}

function displayRisk(data) {
  const riskScoreEl = document.getElementById('riskScore');
  const riskReasonsEl = document.getElementById('riskReasons');

  riskScoreEl.textContent = `Risk Score: ${data.risk_score}`;
  if (data.risk_reasons && data.risk_reasons.length > 0) {
    riskReasonsEl.textContent = `Reasons: ${data.risk_reasons.join(', ')}`;
  } else {
    riskReasonsEl.textContent = 'No risk detected';
  }

  // Color coding based on score
  if (data.risk_score > 70) {
    riskScoreEl.style.color = "red";
    riskReasonsEl.style.color = "red";
  } else if (data.risk_score > 40) {
    riskScoreEl.style.color = "orange";
    riskReasonsEl.style.color = "orange";
  } else {
    riskScoreEl.style.color = "green";
    riskReasonsEl.style.color = "green";
  }
}

function displayError(message) {
  const riskScoreEl = document.getElementById('riskScore');
  const riskReasonsEl = document.getElementById('riskReasons');

  riskScoreEl.textContent = "Error: " + message;
  riskScoreEl.style.color = "orange";
  riskReasonsEl.textContent = "Check console (F12) for details";
  riskReasonsEl.style.color = "#94a3b8";
}

function clearRiskDisplay() {
  const riskScoreEl = document.getElementById('riskScore');
  const riskReasonsEl = document.getElementById('riskReasons');

  riskScoreEl.textContent = '';
  riskReasonsEl.textContent = '';
}
