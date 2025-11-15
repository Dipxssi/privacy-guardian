from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import requests
import ssl, socket
import re
import logging
import os
from datetime import datetime
from urllib.parse import urlparse

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Log startup
logger.info("=" * 50)
logger.info("Privacy Guardian API Starting...")
logger.info("=" * 50)

app = FastAPI(title="Privacy Guardian API", version="1.0.0")

# Add CORS middleware to allow browser extension to make requests
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify exact origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Get API key from environment variable (for cloud deployment) or use default (for local)
SAFE_BROWSING_API_KEY = os.getenv("SAFE_BROWSING_API_KEY", "AIzaSyB1nTH11_R0hbruH4jyMz8zTwJwtdpvJqM")
SAFE_BROWSING_ENDPOINT = "https://safebrowsing.googleapis.com/v4/threatMatches:find"

# Log API key status (without exposing the key)
logger.info(f"API Key configured: {bool(SAFE_BROWSING_API_KEY and len(SAFE_BROWSING_API_KEY) > 10)}")

class URLInput(BaseModel):
    url: str

def check_url_safe_browsing(url: str) -> bool:
    """Check URL against Google Safe Browsing API."""
    if not SAFE_BROWSING_API_KEY or SAFE_BROWSING_API_KEY == "YOUR_API_KEY_HERE":
        logger.warning("Google Safe Browsing API key not configured")
        return True  # Default to safe if no API key
    
    body = {
        "client": {
            "clientId": "privacy-guardian-demo",
            "clientVersion": "1.0"
        },
        "threatInfo": {
            "threatTypes": [
                "MALWARE",
                "SOCIAL_ENGINEERING",
                "POTENTIALLY_HARMFUL_APPLICATION",
                "UNWANTED_SOFTWARE"
            ],
            "platformTypes": ["ANY_PLATFORM"],
            "threatEntryTypes": ["URL"],
            "threatEntries": [{"url": url}]
        }
    }
    params = {"key": SAFE_BROWSING_API_KEY}
    try:
        resp = requests.post(SAFE_BROWSING_ENDPOINT, json=body, params=params, timeout=10)
        if resp.status_code == 200:
            data = resp.json()
            is_safe = "matches" not in data or not data["matches"]
            if not is_safe:
                logger.warning(f"Unsafe URL detected: {url}")
            return is_safe
        elif resp.status_code == 400:
            logger.error(f"Invalid request to Safe Browsing API: {resp.text}")
            return True  # Default to safe on API errors
        elif resp.status_code == 403:
            logger.error("Google Safe Browsing API key is invalid or quota exceeded")
            return True  # Default to safe on auth errors
        else:
            logger.warning(f"Safe Browsing API returned status {resp.status_code}: {resp.text}")
            return True
    except requests.exceptions.Timeout:
        logger.error("Safe Browsing API request timed out")
        return True
    except requests.exceptions.RequestException as e:
        logger.error(f"Error calling Safe Browsing API: {e}")
        return True
    except Exception as e:
        logger.error(f"Unexpected error in Safe Browsing check: {e}")
        return True

def check_ssl_certificate(url: str) -> bool:
    """Check if URL has a valid SSL certificate (only for HTTPS URLs)."""
    try:
        parsed = urlparse(url)
        scheme = parsed.scheme.lower()
        hostname = parsed.hostname
        
        if not hostname:
            return False
        
        # Only check SSL for HTTPS URLs
        if scheme != "https":
            return scheme == "http"  # HTTP is valid but not secure
        
        context = ssl.create_default_context()
        with socket.create_connection((hostname, 443), timeout=5) as sock:
            with context.wrap_socket(sock, server_hostname=hostname) as ssock:
                cert = ssock.getpeercert()
                return True
    except socket.timeout:
        logger.warning(f"SSL certificate check timed out for {url}")
        return False
    except ssl.SSLError as e:
        logger.warning(f"SSL certificate error for {url}: {e}")
        return False
    except Exception as e:
        logger.warning(f"Error checking SSL certificate for {url}: {e}")
        return False

def check_url_heuristics(url: str) -> (int, list):
    risk_score = 0
    reasons = []

    # Check length
    if len(url) > 75:
        risk_score += 20
        reasons.append("Long URL length")

    # Check if URL contains IP address instead of domain
    hostname = urlparse(url).hostname
    if hostname and re.match(r'^\d{1,3}(\.\d{1,3}){3}$', hostname):
        risk_score += 30
        reasons.append("URL uses IP address instead of domain")

    # Check for multiple hyphens or dots (heuristic)
    dot_count = hostname.count('.') if hostname else 0
    hyphen_count = hostname.count('-') if hostname else 0
    if dot_count > 3:
        risk_score += 10
        reasons.append("Too many dots in domain")
    if hyphen_count > 2:
        risk_score += 10
        reasons.append("Too many hyphens in domain")

    return risk_score, reasons

@app.get("/")
@app.head("/")
async def root():
    """Root endpoint - handles both GET and HEAD requests for Render health checks."""
    try:
        return {
            "message": "Privacy Guardian API",
            "status": "running",
            "version": "1.0.0",
            "docs": "/docs",
            "health": "/health"
        }
    except Exception as e:
        logger.error(f"Root endpoint error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/health")
@app.head("/health")
async def health_check():
    """Health check endpoint to verify the API is running."""
    try:
        api_key_configured = SAFE_BROWSING_API_KEY and SAFE_BROWSING_API_KEY != "YOUR_API_KEY_HERE" and len(SAFE_BROWSING_API_KEY) > 10
        return {
            "status": "healthy",
            "api_key_configured": api_key_configured,
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        logger.error(f"Health check error: {e}")
        return {
            "status": "error",
            "error": str(e)
        }

@app.post("/check_website_risk")
async def check_website_risk(data: URLInput):
    """Check website risk using Google Safe Browsing, SSL verification, and heuristics."""
    url = data.url
    
    # Validate URL format
    if not url or not url.strip():
        raise HTTPException(status_code=400, detail="URL is required")
    
    try:
        parsed = urlparse(url)
        if not parsed.scheme or not parsed.netloc:
            raise HTTPException(status_code=400, detail="Invalid URL format")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid URL: {str(e)}")
    
    logger.info(f"Checking risk for URL: {url}")
    
    try:
        is_safe = check_url_safe_browsing(url)
        has_ssl = check_ssl_certificate(url)
        heuristic_score, heuristic_reasons = check_url_heuristics(url)

        risk_score = 20
        reasons = []

        if not is_safe:
            risk_score = 90
            reasons.append("Unsafe according to Google Safe Browsing")

        if not has_ssl:
            risk_score = max(risk_score, 70)
            reasons.append("No valid SSL certificate")

        risk_score = max(risk_score, heuristic_score)
        reasons.extend(heuristic_reasons)

        result = {
            "url": url,
            "risk_score": risk_score,
            "safe_browsing_safe": is_safe,
            "ssl_valid": has_ssl,
            "risk_reasons": reasons
        }
        
        logger.info(f"Risk assessment complete for {url}: score={risk_score}")
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error checking website risk: {e}")
        raise HTTPException(status_code=500, detail=f"Error checking website risk: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    # Get port from environment variable (for cloud) or use default 9000 (for local)
    port = int(os.getenv("PORT", 9000))
    logger.info(f"Starting Website Risk API server on http://0.0.0.0:{port}")
    logger.info(f"API documentation available at http://localhost:{port}/docs")
    uvicorn.run(app, host="0.0.0.0", port=port)
