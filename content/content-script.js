let isActive = true;

// Sync protection state from storage
chrome.storage.local.get(['isActive'], (result) => {
  isActive = result.isActive !== false;
  if (isActive) {
    // Check risk when page loads
    checkRiskForCurrentPage();
    // Also check again after a short delay to ensure API is ready
    setTimeout(() => {
      if (lastRiskData === null) {
        console.log("Retrying risk check after delay...");
        checkRiskForCurrentPage();
      }
    }, 2000);
  }
});

// Listen for toggle messages from popup
chrome.runtime.onMessage.addListener((message) => {
  if (message.action === 'toggleProtection') {
    isActive = message.isActive;
    if (isActive) checkRiskForCurrentPage();
    else {
      clearInlineRiskIndicators();
      clearPIIWarnings();
    }
  }
});

// PII warning container managing
function clearPIIWarnings() {
  document.querySelectorAll('.privacy-guardian-warning').forEach(el => el.remove());
}

function showWarning(element, message) {
  clearPIIWarnings();

  const warning = document.createElement('div');
  warning.className = 'privacy-guardian-warning';
  warning.style.cssText = `
    position: absolute;
    background: #dc2626;
    color: white;
    display: flex; 
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    border-radius: 6px;
    font-size: 13px;
    z-index: 10000;
    box-shadow: 0 4px 12px rgba(0,0,0,0.22);
    font-family: -apple-system, sans-serif;
    pointer-events: none;
  `;
  warning.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m0-10.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.75c0 5.592 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.57-.598-3.75h-.152c-3.196 0-6.1-1.25-8.25-3.286Zm0 13.036h.008v.008H12v-.008Z"/></svg> <span>${message}</span>`;

  const rect = element.getBoundingClientRect();
  warning.style.top = (rect.bottom + window.scrollY + 6) + 'px';
  warning.style.left = (rect.left + window.scrollX) + 'px';
  document.body.appendChild(warning);

  // Auto remove after 3s to avoid clutter
  setTimeout(() => warning.remove(), 3000);
}

// --- Inline Website Risk Display ---

let lastRiskData = null;

async function checkRiskForCurrentPage() {
  if (!isActive) return;

  const url = window.location.href;

  try {
    // Send message to background script to make API call
    chrome.runtime.sendMessage(
      { action: 'checkWebsiteRisk', url: url },
      (response) => {
        if (chrome.runtime.lastError) {
          console.error("Error communicating with background script:", chrome.runtime.lastError);
          clearInlineRiskIndicators();
          return;
        }
        
        if (response && response.success) {
          lastRiskData = response.data;
          displayInlineRisk(lastRiskData);
        } else {
          console.error("Failed to fetch risk info:", response?.error || "Unknown error");
          clearInlineRiskIndicators();
        }
      }
    );
  } catch (e) {
    console.error("Failed to check risk:", e);
    clearInlineRiskIndicators();
  }
}

function displayInlineRisk(riskData) {
  clearInlineRiskIndicators();

  const inputs = getAllInputsDeep();
  inputs.forEach(input => {
    const indicator = document.createElement('span');
    indicator.className = 'risk-indicator';
    indicator.style.color = riskData.risk_score > 70 ? 'red' :
                            riskData.risk_score > 40 ? 'orange' : 'green';
    indicator.style.marginLeft = '8px';
    indicator.style.fontWeight = 'bold';
    indicator.title = riskData.risk_reasons && riskData.risk_reasons.length ? riskData.risk_reasons.join('; ') : '';
    indicator.textContent = `Risk: ${riskData.risk_score}`;

    input.parentNode.insertBefore(indicator, input.nextSibling);
  });
}

function clearInlineRiskIndicators() {
  document.querySelectorAll('.risk-indicator').forEach(el => el.remove());
}

// Include your PII detection, input monitoring parts unchanged from before...

// Recursively get all inputs including shadow DOM
function getAllInputsDeep(root = document) {
  let inputs = Array.from(root.querySelectorAll('input, textarea'));
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT, null, false);
  while (walker.nextNode()) {
    const el = walker.currentNode;
    if (el.shadowRoot) {
      inputs = inputs.concat(getAllInputsDeep(el.shadowRoot));
    }
  }
  return inputs;
}

// Attach monitoring to unmonitored inputs
function attachPIIMonitor(element) {
  if (element._privacyGuardianMonitored) return;
  element._privacyGuardianMonitored = true;
  element.addEventListener('input', (e) => {
    if (!isActive) return;
    checkForPII(e.target.value, e.target);
  });
}

// Scan all inputs and attach monitor
function scanAndAttachAllInputs() {
  getAllInputsDeep().forEach(attachPIIMonitor);
}

const inputObserver = new MutationObserver(() => {
  scanAndAttachAllInputs();
});
inputObserver.observe(document.body, { childList: true, subtree: true });

scanAndAttachAllInputs();

// PII Detection Function
async function checkForPII(text, element) {
  if (!text || text.length < 3) return;

  const detectedTypes = [];
  let warningMessage = '';

  // Email pattern
  const emailPattern = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
  if (emailPattern.test(text)) {
    detectedTypes.push('email');
    warningMessage = '⚠️ Warning: Email detected. Consider not sharing your email on this site.';
  }

  // Phone number patterns (various formats)
  const phonePatterns = [
    /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g,  // US format: 123-456-7890
    /\b\(\d{3}\)\s?\d{3}[-.]?\d{4}\b/g, // (123) 456-7890
    /\b\d{10}\b/g,  // 10 digits
    /\+\d{1,3}[-.\s]?\d{1,4}[-.\s]?\d{1,4}[-.\s]?\d{1,9}\b/g // International
  ];
  if (phonePatterns.some(pattern => pattern.test(text))) {
    detectedTypes.push('phone');
    if (!warningMessage) {
      warningMessage = '⚠️ Warning: Phone number detected. Be cautious sharing your phone number.';
    }
  }

  // Credit card patterns (basic detection)
  const cardPatterns = [
    /\b\d{4}[-.\s]?\d{4}[-.\s]?\d{4}[-.\s]?\d{4}\b/g, // 16 digits
    /\b\d{4}[-.\s]?\d{6}[-.\s]?\d{5}\b/g // Amex format
  ];
  if (cardPatterns.some(pattern => pattern.test(text.replace(/\s/g, '')))) {
    detectedTypes.push('card');
    if (!warningMessage) {
      warningMessage = '⚠️ Warning: Credit card number detected. DO NOT enter card details on untrusted sites!';
    }
  }

  // SSN pattern (US)
  const ssnPattern = /\b\d{3}-?\d{2}-?\d{4}\b/g;
  if (ssnPattern.test(text)) {
    detectedTypes.push('ssn');
    if (!warningMessage) {
      warningMessage = '⚠️ Warning: SSN detected. Never share your SSN on untrusted websites!';
    }
  }

  // Name detection (simple heuristic - 2+ capitalized words)
  const namePattern = /\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)+\b/g;
  if (namePattern.test(text) && text.split(/\s+/).filter(w => /^[A-Z][a-z]+$/.test(w)).length >= 2) {
    detectedTypes.push('name');
    if (!warningMessage) {
      warningMessage = '⚠️ Warning: Name detected. Consider using a pseudonym on untrusted sites.';
    }
  }

  if (detectedTypes.length > 0) {
    // Check risk score - only show warnings if risk score is 50 or higher
    const currentRiskScore = lastRiskData?.risk_score;
    
    // Always show warnings for critical PII (credit cards, SSN) regardless of risk score
    const isCriticalPII = detectedTypes.includes('card') || detectedTypes.includes('ssn');
    
    // Check if risk data has been loaded (even if score is 0, it means we checked)
    const riskDataLoaded = lastRiskData !== null && lastRiskData !== undefined;
    
    // Show warning if:
    // 1. It's critical PII (card/SSN) - always warn, OR
    // 2. Risk score is >= 50, OR
    // 3. Risk data hasn't loaded yet (to be safe - show warning by default)
    if (isCriticalPII || !riskDataLoaded || currentRiskScore >= 50) {
      // Show warning to user
      showWarning(element, warningMessage);
      
      // Notify background script
      chrome.runtime.sendMessage({ action: 'piiDetected', types: detectedTypes });
      
      // If risk data not loaded, try to load it now
      if (!riskDataLoaded) {
        console.log("Risk data not loaded yet, fetching now...");
        checkRiskForCurrentPage();
      }
    } else {
      // Risk score is low (< 50) and data is loaded, don't show warning
      console.log(`PII detected but risk score (${currentRiskScore}) is low, warning suppressed`);
    }
    
    // Also try to use AI detection if available (optional enhancement)
    // Note: AI detection moved to background script to avoid permission prompts
    chrome.runtime.sendMessage(
      { action: 'detectPII', text: text.substring(0, 500) },
      (response) => {
        if (response && response.success && response.entities && response.entities.length > 0) {
          console.log('AI detected PII:', response.entities);
        }
      }
    );
  }
}

console.log('Privacy Guardian content script loaded');

