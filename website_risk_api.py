from fastapi import FastAPI
from pydantic import BaseModel
import requests
import ssl, socket
import re
from urllib.parse import urlparse

app = FastAPI()

# --- Insert your real API key here ---
SAFE_BROWSING_API_KEY = "AIzaSyB1nTH11_R0hbruH4jyMz8zTwJwtdpvJqM"
SAFE_BROWSING_ENDPOINT = "https://safebrowsing.googleapis.com/v4/threatMatches:find"

class URLInput(BaseModel):
    url: str

def check_url_safe_browsing(url: str) -> bool:
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
        resp = requests.post(SAFE_BROWSING_ENDPOINT, json=body, params=params)
        if resp.status_code == 200:
            data = resp.json()
            return "matches" not in data or not data["matches"]
        else:
            return True
    except Exception:
        return True

def check_ssl_certificate(url: str) -> bool:
    try:
        hostname = urlparse(url).hostname
        if not hostname:
            return False
        context = ssl.create_default_context()
        with socket.create_connection((hostname, 443), timeout=3) as sock:
            with context.wrap_socket(sock, server_hostname=hostname) as ssock:
                cert = ssock.getpeercert()
                return True
    except Exception:
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

@app.post("/check_website_risk")
async def check_website_risk(data: URLInput):
    url = data.url
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

    return {
        "url": url,
        "risk_score": risk_score,
        "safe_browsing_safe": is_safe,
        "ssl_valid": has_ssl,
        "risk_reasons": reasons
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=9000)
