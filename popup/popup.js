let isActive = true;

// Load saved state
chrome.storage.local.get(['isActive', 'detectionCount', 'blockedCount'], (result) => {
  isActive = result.isActive !== false;
  updateUI();

  document.getElementById('detectionCount').textContent = result.detectionCount || 0;
  document.getElementById('blockedCount').textContent = result.blockedCount || 0;

  if (isActive) {
    checkCurrentSiteRisk();
    // Also load privacy signals on initial open
    loadPrivacySignals();
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

  // Also load privacy signals for cookie advice and AI policy
  loadPrivacySignals();
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

function loadPrivacySignals() {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (!tabs[0]) return;
    const url = tabs[0].url || '';
    if (url.startsWith('chrome://') || url.startsWith('edge://') || url.startsWith('about:')) return;

    // Set placeholders so the user always sees something
    const decision = document.getElementById('cookieDecision');
    const layman = document.getElementById('cookieLayman');
    const breakdown = document.getElementById('cookieBreakdown');
    const aiNote = document.getElementById('aiNote');
    const aiDetails = document.getElementById('aiDetails');

    if (decision) decision.textContent = 'Loading cookie advice...';
    if (layman) layman.textContent = '';
    if (breakdown) breakdown.textContent = '';
    if (aiNote) aiNote.textContent = 'Loading AI/scraper signals...';
    if (aiDetails) aiDetails.textContent = '';

    console.log('Requesting privacy signals for', url);
    let responded = false;
    const failTimer = setTimeout(() => {
      if (responded) return;
      if (decision) decision.textContent = 'Undetermined';
      if (layman) layman.textContent = 'Timed out fetching cookie info.';
      if (aiNote) aiNote.textContent = 'robots.txt check timed out.';
    }, 4000);

    chrome.runtime.sendMessage({ action: 'getPrivacySignals', url, tabId: tabs[0].id }, (response) => {
      responded = true;
      clearTimeout(failTimer);
      if (!response || !response.success) {
        if (decision) decision.textContent = 'Undetermined';
        if (layman) layman.textContent = 'Could not fetch cookie info for this site.';
        if (aiNote) aiNote.textContent = 'robots.txt unavailable; cannot infer AI crawler policy.';
        if (response && response.error) {
          console.warn('Privacy signals error:', response.error);
        }
        return;
      }
      const { robotsPolicy, cookieSummary, cookieAdvice } = response.data || {};

      console.log('Privacy signals response', { robotsPolicy, cookieSummary, cookieAdvice });

      // Cookie advice
      if (decision) decision.textContent = cookieAdvice?.decision || 'Undetermined';
      if (layman) layman.textContent = cookieAdvice?.layman || 'Could not fetch cookie info for this site.';
      if (breakdown && cookieSummary?.byType) {
        const b = cookieSummary.byType;
        breakdown.textContent = `Cookies detected: ${cookieSummary.total} (essential ${b.essential || 0}, analytics ${b.analytics || 0}, advertising ${b.advertising || 0}, preferences ${b.preferences || 0})`;
      }

      // AI/Scraper signals
      if (aiNote) aiNote.textContent = robotsPolicy?.note || 'robots.txt unavailable; cannot infer AI crawler policy.';
      if (aiDetails && robotsPolicy) {
        aiDetails.textContent = `robots.txt: blocked [${(robotsPolicy.blockedAgents || []).join(', ') || 'none'}], allowed [${(robotsPolicy.allowedAgents || []).join(', ') || 'unknown'}]`;
      }
    });
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
