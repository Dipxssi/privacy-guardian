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
  
  // Provide privacy signals (AI/bot policy + cookie advice)
  if (message.action === 'getPrivacySignals') {
    const proceed = async () => {
      try {
        let pageUrl = message.url;
        if (!pageUrl && message.tabId) {
          const tab = await chrome.tabs.get(message.tabId);
          pageUrl = tab?.url || '';
        }
        if (!pageUrl) throw new Error('No page URL available');
        const data = await getPrivacySignals(pageUrl);
        sendResponse({ success: true, data });
      } catch (error) {
        console.warn('[Privacy Guardian] getPrivacySignals error:', error?.message || error);
        sendResponse({ success: false, error: error?.message || String(error) });
      }
    };
    proceed();
    return true;
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

// --- Privacy Signals: robots.txt policy + cookie advice ---

async function getPrivacySignals(pageUrl) {
  const url = new URL(pageUrl);
  const origin = `${url.protocol}//${url.host}`;

  const [robots, cookies] = await Promise.all([
    analyzeRobotsTxt(origin),
    summarizeCookies(pageUrl)
  ]);

  const advice = buildCookieAdvice(cookies);

  console.log('[Privacy Guardian] Privacy signals for', pageUrl, {
    cookiesTotal: cookies?.total,
    cookiesByType: cookies?.byType,
    robotsNote: robots?.note
  });

  return {
    robotsPolicy: robots,
    cookieSummary: cookies,
    cookieAdvice: advice
  };
}

async function analyzeRobotsTxt(origin) {
  try {
    const res = await fetch(`${origin}/robots.txt`, { method: 'GET' });
    if (!res.ok) throw new Error(`robots.txt status ${res.status}`);
    const text = await res.text();

    const aiAgents = ['GPTBot', 'ChatGPT-User', 'CCBot', 'Claude-Web', 'PerplexityBot', 'Google-Extended'];
    const lines = text.split(/\r?\n/);

    const policies = {};
    let currentAgent = null;

    for (const line of lines) {
      const t = line.trim();
      if (!t || t.startsWith('#')) continue;
      const [kRaw, vRaw] = t.split(':', 2);
      if (!kRaw || !vRaw) continue;
      const key = kRaw.trim().toLowerCase();
      const val = vRaw.trim();

      if (key === 'user-agent') {
        currentAgent = val;
        if (!policies[currentAgent]) policies[currentAgent] = { disallow: [], allow: [] };
      } else if (key === 'disallow' && currentAgent) {
        policies[currentAgent].disallow.push(val);
      } else if (key === 'allow' && currentAgent) {
        policies[currentAgent].allow.push(val);
      }
    }

    const aiFindings = aiAgents.map(a => {
      const p = policies[a] || policies['*'] || { disallow: [], allow: [] };
      const isDisallowedAll = p.disallow.includes('/') || (p.disallow.length > 0 && !p.allow.length);
      return { agent: a, disallowed: isDisallowedAll, policy: p };
    });

    const blockedAgents = aiFindings.filter(f => f.disallowed).map(f => f.agent);
    const allowedAgents = aiFindings.filter(f => !f.disallowed).map(f => f.agent);

    return {
      origin,
      hasRobots: true,
      blockedAgents,
      allowedAgents,
      note: blockedAgents.length
        ? 'Site signals it does not want AI crawlers to train on its pages.'
        : 'Site does not block common AI crawlers in robots.txt (public pages may be scraped).'
    };
  } catch (e) {
    return {
      origin,
      hasRobots: false,
      blockedAgents: [],
      allowedAgents: [],
      note: 'robots.txt unavailable; cannot infer AI crawler policy.'
    };
  }
}

async function summarizeCookies(pageUrl) {
  return new Promise((resolve) => {
    // Using URL filter ensures Chrome returns cookies that apply to this exact page,
    // regardless of leading dots or subdomain scoping.
    chrome.cookies.getAll({ url: pageUrl }, (cookies) => {
      const summarize = (c) => {
        const name = c.name.toLowerCase();
        if (/(session|sid|csrftoken|xsrf|auth|secure)/.test(name)) return 'essential';
        if (/^_ga|^_gid|analytics|amplitude|segment|mixpanel|heap/.test(name)) return 'analytics';
        if (/_fbp|_fbc|fr|_uet|_clck|_clsk|gclid|fbclid|ad|doubleclick|_gcl/.test(name)) return 'advertising';
        if (/pref|locale|theme|consent|cookieconsent/.test(name)) return 'preferences';
        return 'unknown';
      };

      const buckets = { essential: [], analytics: [], advertising: [], preferences: [], unknown: [] };
      (cookies || []).forEach(c => buckets[summarize(c)].push(c.name));

      resolve({
        total: (cookies || []).length,
        byType: {
          essential: buckets.essential.length,
          analytics: buckets.analytics.length,
          advertising: buckets.advertising.length,
          preferences: buckets.preferences.length,
          unknown: buckets.unknown.length
        },
        examples: {
          essential: buckets.essential.slice(0, 5),
          analytics: buckets.analytics.slice(0, 5),
          advertising: buckets.advertising.slice(0, 5),
          preferences: buckets.preferences.slice(0, 5),
          unknown: buckets.unknown.slice(0, 5)
        }
      });
    });
  });
}

function buildCookieAdvice(summary) {
  if (!summary) {
    return {
      decision: 'Undetermined',
      explanation: 'Could not inspect cookies for this site.',
      layman: cookieLaymanText('undetermined')
    };
  }

  const nonEssentialCount = (summary.byType.analytics || 0) + (summary.byType.advertising || 0);
  if (nonEssentialCount === 0) {
    return {
      decision: 'Safe to accept essentials',
      explanation: 'Only essential or preference cookies detected.',
      layman: cookieLaymanText('essentials')
    };
  }

  return {
    decision: 'Reject non‑essential',
    explanation: 'Analytics/advertising cookies detected; accept only essential if prompted.',
    layman: cookieLaymanText('reject')
  };
}

function cookieLaymanText(mode) {
  const whatAreCookies =
    'Cookies are small files a site stores in your browser to keep you logged in, remember preferences, or measure visits.';
  const security =
    'Security risks: tracking across sites, profiling for ads, and exposure if a site is compromised. Essential cookies are usually needed for sign‑in and carts.';

  if (mode === 'essentials') {
    return `${whatAreCookies} Recommendation: Accept only essential cookies. ${security}`;
  }
  if (mode === 'reject') {
    return `${whatAreCookies} Recommendation: Reject non‑essential cookies (accept only required). ${security}`;
  }
  return `${whatAreCookies} If unsure, choose “Reject non‑essential” or “Only necessary.” ${security}`;
}

// Function to check website risk via API
async function checkWebsiteRisk(url) {
  const apiUrl = await getApiUrl();
  const endpoint = `${apiUrl}/check_website_risk`;
  
  console.log(`[Privacy Guardian] Checking risk for: ${url}`);
  console.log(`[Privacy Guardian] Using API: ${apiUrl}`);
  
  try {
    // Add timeout for cloud API (Render free tier can be slow)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
    
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ url }),
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);

    console.log(`[Privacy Guardian] API response status: ${response.status}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Privacy Guardian] API error ${response.status}: ${errorText}`);
      throw new Error(`API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log(`[Privacy Guardian] Risk score: ${data.risk_score}`);
    return data;
  } catch (error) {
    console.error(`[Privacy Guardian] Fetch error:`, error);
    
    // If cloud API fails and we're using cloud, try localhost as fallback
    if (apiUrl !== LOCAL_API_URL && apiUrl.includes('http')) {
      console.log("[Privacy Guardian] Cloud API failed, trying localhost fallback...");
      try {
        const localResponse = await fetch(`${LOCAL_API_URL}/check_website_risk`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ url }),
        });
        
        if (localResponse.ok) {
          const localData = await localResponse.json();
          console.log("[Privacy Guardian] Localhost fallback succeeded");
          return localData;
        }
      } catch (localError) {
        console.error("[Privacy Guardian] Localhost fallback also failed:", localError);
      }
    }
    
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
