let isActive = true;

// Sync protection state from storage
chrome.storage.local.get(['isActive'], (result) => {
  isActive = result.isActive !== false;
  if (isActive) checkRiskForCurrentPage();
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
    const response = await fetch("http://localhost:9000/check_website_risk", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ url }),
    });

    lastRiskData = await response.json();
    displayInlineRisk(lastRiskData);
  } catch (e) {
    console.error("Failed to fetch risk info", e);
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

// Your PII detection function unchanged...

console.log('Privacy Guardian content script loaded');
