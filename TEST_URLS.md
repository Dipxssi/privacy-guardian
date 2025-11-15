# Test URLs for Privacy Guardian Extension

## Google Safe Browsing Test URLs

Google provides official test URLs that are safe to use for testing Safe Browsing API:

### Malware Test URL (High Risk)
```
http://malware.testing.google.test/testing/malware/
```
**Expected Risk Score:** 90+ (Unsafe according to Google Safe Browsing)

### Phishing Test URL (High Risk)
```
http://testsafebrowsing.appspot.com/s/phishing.html
```
**Expected Risk Score:** 90+ (Unsafe according to Google Safe Browsing)

### Social Engineering Test URL (High Risk)
```
http://testsafebrowsing.appspot.com/s/malware.html
```
**Expected Risk Score:** 90+ (Unsafe according to Google Safe Browsing)

## Suspicious-Looking URLs (Medium-High Risk)

These URLs have suspicious characteristics but are actually safe:

### Long URL (Heuristic Risk)
```
http://example.com/very/long/path/with/many/subdirectories/and/parameters?param1=value1&param2=value2&param3=value3&param4=value4&param5=value5
```
**Expected Risk Score:** 20-30 (Long URL length)

### IP Address Instead of Domain (High Risk)
```
http://192.168.1.1
```
**Expected Risk Score:** 50+ (URL uses IP address instead of domain)

### Multiple Dots/Hyphens (Medium Risk)
```
http://test-site-with-many-hyphens-and-dots.example.com
```
**Expected Risk Score:** 20-30 (Too many dots/hyphens in domain)

## HTTP (No SSL) URLs (High Risk)

### HTTP Test Sites
```
http://httpforever.com
http://neverssl.com
http://example.com
```
**Expected Risk Score:** 70+ (No valid SSL certificate)

## Low Risk URLs (For Comparison)

These should have low risk scores and should NOT show PII warnings:

```
https://google.com
https://github.com
https://stackoverflow.com
https://example.com
https://wikipedia.org
```

## How to Test

### Test 1: High Risk Site with PII Warning
1. Visit: `http://testsafebrowsing.appspot.com/s/phishing.html`
2. Check extension popup - should show high risk score (90+)
3. Type an email in any input field
4. **Expected:** Warning banner should appear

### Test 2: Low Risk Site - No PII Warning
1. Visit: `https://google.com`
2. Check extension popup - should show low risk score (< 50)
3. Type an email in search box
4. **Expected:** No warning banner (suppressed due to low risk)

### Test 3: HTTP Site (No SSL)
1. Visit: `http://example.com`
2. Check extension popup - should show risk score 70+ (no SSL)
3. Type an email in any form
4. **Expected:** Warning banner should appear (risk >= 50)

### Test 4: IP Address URL
1. Visit: `http://192.168.1.1` (or any IP address)
2. Check extension popup - should show risk score 50+
3. Type PII
4. **Expected:** Warning banner should appear

### Test 5: Critical PII Always Warns
1. Visit any low-risk site (e.g., `https://google.com`)
2. Type a credit card number: `1234 5678 9012 3456`
3. **Expected:** Warning should appear even on low-risk sites (critical PII)

## Creating Custom Test Scenarios

### Option 1: Modify Risk Score in API Response
You can temporarily modify `website_risk_api.py` to return a specific risk score for testing:

```python
# In check_website_risk function, add:
if "test-high-risk" in url:
    risk_score = 90
    reasons = ["Test: High risk site"]
elif "test-low-risk" in url:
    risk_score = 20
    reasons = []
```

### Option 2: Use Local Test HTML File
Create a local HTML file with forms to test PII detection:

```html
<!DOCTYPE html>
<html>
<head>
    <title>PII Test Form</title>
</head>
<body>
    <h1>Test Form</h1>
    <form>
        <label>Email:</label>
        <input type="text" id="email" placeholder="test@example.com">
        <br><br>
        <label>Phone:</label>
        <input type="text" id="phone" placeholder="123-456-7890">
        <br><br>
        <label>Credit Card:</label>
        <input type="text" id="card" placeholder="1234 5678 9012 3456">
        <br><br>
        <label>Name:</label>
        <input type="text" id="name" placeholder="John Smith">
    </form>
</body>
</html>
```

Save as `test.html` and open with `file:///` URL.

## Notes

- **Safe Browsing Test URLs:** These are provided by Google specifically for testing and are safe to visit
- **Real Malicious Sites:** Do NOT visit actual malicious websites for testing
- **Local Testing:** You can create local test files for safer testing
- **Risk Scores:** The extension uses a combination of:
  - Google Safe Browsing API (0-90)
  - SSL certificate check (0-70)
  - URL heuristics (0-50)

## Expected Behavior Summary

| Risk Score | PII Warning Shown? |
|------------|-------------------|
| < 50       | No (except credit cards/SSN) |
| >= 50      | Yes (all PII types) |
| Credit Card/SSN | Always (regardless of score) |

