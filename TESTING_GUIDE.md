# Privacy Guardian Extension - Testing Guide

## Step-by-Step Testing Instructions

### Step 1: Start the Backend API Server

1. Open a terminal/command prompt
2. Navigate to your project folder:
   ```bash
   cd C:\Users\dipsh\OneDrive\Documents\projects\privacy-guardian
   ```
3. Activate your virtual environment:
   ```bash
   venv\Scripts\activate
   ```
4. Start the website risk API server:
   ```bash
   python website_risk_api.py
   ```
5. You should see:
   ```
   INFO: Starting Website Risk API server on http://0.0.0.0:9000
   INFO: API documentation available at http://localhost:9000/docs
   INFO: Started server process
   INFO: Waiting for application startup.
   INFO: Application startup complete.
   INFO: Uvicorn running on http://0.0.0.0:9000
   ```
6. **Keep this terminal window open** - the server needs to keep running!

### Step 2: Verify the API is Working

1. Open a new browser tab
2. Go to: `http://localhost:9000/health`
3. You should see: `{"status":"healthy","api_key_configured":true}`
4. (Optional) Go to: `http://localhost:9000/docs` to see the API documentation

✅ **If you see the health check response, the API is working!**

### Step 3: (Optional) Start the AI PII Detection Server

1. Open a **new** terminal/command prompt window
2. Navigate to the project folder and activate venv:
   ```bash
   cd C:\Users\dipsh\OneDrive\Documents\projects\privacy-guardian
   venv\Scripts\activate
   ```
3. Start the PII inference server:
   ```bash
   python pii_inference.py
   ```
4. **Keep this terminal open too** - it will load the AI model (may take a minute)

**Note:** The extension will work without this server, but it will only use regex-based PII detection.

### Step 4: Load the Extension in Your Browser

#### For Chrome:
1. Open Google Chrome
2. Go to `chrome://extensions/`
3. Toggle **"Developer mode"** ON (top right corner)
4. Click **"Load unpacked"** button
5. Navigate to and select your project folder:
   `C:\Users\dipsh\OneDrive\Documents\projects\privacy-guardian`
6. The extension should appear in your extensions list

#### For Edge:
1. Open Microsoft Edge
2. Go to `edge://extensions/`
3. Toggle **"Developer mode"** ON (bottom left)
4. Click **"Load unpacked"** button
5. Select your project folder
6. The extension should appear

✅ **Check for errors:**
- If there are errors, click on the extension card to see details
- Common issues: missing files, invalid manifest.json

### Step 5: Test the Extension Popup

1. Click the **Privacy Guardian extension icon** in your browser toolbar
2. You should see the popup with:
   - Extension name "Privacy Guardian"
   - Status indicator (green dot = active)
   - Detection statistics (should show 0 initially)
   - Risk assessment section
   - Toggle button

✅ **If the popup opens, the extension is loaded correctly!**

### Step 6: Test Website Risk Assessment

1. Navigate to any website (e.g., `https://example.com` or `https://google.com`)
2. Click the extension icon again
3. The popup should show:
   - **Risk Score**: A number (0-100)
   - **Risk Reasons**: List of reasons (if any)
   - Color coding: Green (safe), Orange (medium), Red (high risk)

**Test with different sites:**
- `https://example.com` - Should be safe (low risk)
- `https://google.com` - Should be safe (low risk)
- Try a suspicious-looking URL if you have one

✅ **If you see risk scores, the risk assessment is working!**

### Step 7: Test PII Detection (Email)

1. Go to any website with a form (e.g., `https://example.com`)
2. Find an input field (or create a simple test page)
3. Type an email address: `test@example.com`
4. You should see a **red warning banner** appear below the input field saying:
   - "⚠️ Warning: Email detected. Consider not sharing your email on this site."

✅ **If you see the warning, email detection is working!**

### Step 8: Test PII Detection (Phone Number)

1. In the same or different input field
2. Type a phone number: `123-456-7890` or `(123) 456-7890`
3. You should see a warning: "⚠️ Warning: Phone number detected..."

✅ **If you see the warning, phone detection is working!**

### Step 9: Test PII Detection (Credit Card)

1. In an input field
2. Type: `1234 5678 9012 3456` (fake card number)
3. You should see: "⚠️ Warning: Credit card number detected. DO NOT enter card details on untrusted sites!"

✅ **If you see the warning, credit card detection is working!**

### Step 10: Test PII Detection (Name)

1. In an input field
2. Type: `John Smith` (two capitalized words)
3. You should see: "⚠️ Warning: Name detected. Consider using a pseudonym..."

✅ **If you see the warning, name detection is working!**

### Step 11: Test Toggle Protection

1. Click the extension icon
2. Click **"Disable Protection"** button
3. The status should change to "Protection Disabled" (gray dot)
4. Try typing an email in a form - **no warning should appear**
5. Click **"Enable Protection"** again
6. Try typing an email - **warning should appear again**

✅ **If the toggle works, the on/off feature is working!**

### Step 12: Check Detection Statistics

1. After detecting some PII (emails, phone numbers, etc.)
2. Click the extension icon
3. Check the **"Detections Today"** counter
4. It should increment each time PII is detected

✅ **If the counter increases, statistics tracking is working!**

### Step 13: Test on Different Websites

Try the extension on:
- **Google.com** - Should show low risk
- **Amazon.com** - Should show low risk, try entering info in search
- **Any login page** - Try entering email/phone to see warnings
- **Any form page** - Test various PII inputs

### Step 14: Check Browser Console for Errors

1. Press **F12** to open Developer Tools
2. Go to the **Console** tab
3. Look for any red error messages
4. Common errors to check:
   - CORS errors (should be fixed now)
   - Network errors (API not reachable)
   - Extension errors

✅ **If no red errors appear, everything is working correctly!**

## Troubleshooting

### Extension won't load:
- Check that `manifest.json` is valid
- Verify all file paths exist (background/background.js, popup/popup.html, etc.)
- Check the browser console for specific errors

### Risk assessment shows "Loading..." or doesn't update:
- Make sure `website_risk_api.py` is running
- Check `http://localhost:9000/health` in browser
- Check browser console for network errors
- Verify the API key in `website_risk_api.py` is valid

### PII warnings don't appear:
- Make sure protection is enabled (green dot in popup)
- Check browser console for errors
- Try typing in different input fields
- Verify the content script is loaded (check console for "Privacy Guardian content script loaded")

### API server won't start:
- Make sure port 9000 is not in use: `netstat -ano | findstr :9000`
- Check if you have the required packages: `pip list | findstr fastapi`
- Check the terminal for error messages

## Success Checklist

- [ ] API server starts without errors
- [ ] Health check endpoint works (`http://localhost:9000/health`)
- [ ] Extension loads in browser without errors
- [ ] Extension popup opens and shows status
- [ ] Risk assessment displays for websites
- [ ] Email detection shows warning
- [ ] Phone number detection shows warning
- [ ] Credit card detection shows warning
- [ ] Name detection shows warning
- [ ] Toggle protection on/off works
- [ ] Detection counter increments
- [ ] No errors in browser console

## Next Steps

Once everything is working:
- Test on real websites you use
- Try the AI PII detection (start `pii_inference.py`)
- Customize the warning messages if needed
- Add more PII detection patterns if needed

