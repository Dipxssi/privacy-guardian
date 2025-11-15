## Privacy Guardian

Privacy Guardian is a browser extension backed by a FastAPI server focused on real-time privacy protection and website risk scoring. It detects potentially sensitive personally identifiable information (PII) you enter in form fields and assesses website risk using Google Safe Browsing, SSL certificate verification, and URL heuristics.

## Features

- 🛡️ **Real-time PII Detection**: Warns users when they enter emails, phone numbers, credit card numbers, names, or SSNs
- 🔍 **Website Risk Assessment**: Uses Google Safe Browsing API to assess website safety
- ⚠️ **Non-blocking Warnings**: Alerts users but doesn't prevent them from entering information
- 📊 **Risk Score Display**: Shows risk scores and reasons in the extension popup

## Setup Instructions

### 1. Install Dependencies

Make sure you have Python 3.8+ installed. Then activate your virtual environment and install dependencies:

```bash
# Activate virtual environment (Windows)
venv\Scripts\activate

# Install dependencies (if not already installed)
pip install fastapi uvicorn requests pydantic transformers torch
```

### 2. Start the Backend API Server

The extension requires the backend API to be running. Start it with:

```bash
python website_risk_api.py
```

This will start the server on `http://localhost:9000`

**Note**: Make sure to add your Google Safe Browsing API key in `website_risk_api.py` (line 11) if you haven't already.

### 3. (Optional) Start the AI PII Detection Server

For enhanced PII detection using AI models, you can also start:

```bash
python pii_inference.py
```

This will start the server on `http://localhost:8000`. The extension will work without this, but will only use regex-based detection.

### 4. Load the Extension in Chrome/Edge

1. Open Chrome or Edge browser
2. Go to `chrome://extensions/` (or `edge://extensions/`)
3. Enable "Developer mode" (toggle in top right)
4. Click "Load unpacked"
5. Select the `privacy-guardian` folder (the folder containing `manifest.json`)
6. The extension should now be loaded and active!

### 5. Using the Extension

- Click the extension icon to see the risk assessment for the current website
- The extension will automatically monitor form inputs and warn you if you enter PII
- Toggle protection on/off using the button in the popup
- View detection statistics in the popup

## Troubleshooting

**Extension won't load:**
- Make sure all file paths in `manifest.json` are correct
- Check the browser console for errors (F12)
- Verify the manifest.json is valid JSON

**Risk assessment not working:**
- Make sure `website_risk_api.py` is running on port 9000
- Check that the API server is accessible (try `http://localhost:9000/docs` in your browser)
- Verify your Google Safe Browsing API key is valid

**PII detection not working:**
- The extension uses regex-based detection by default
- For AI-enhanced detection, make sure `pii_inference.py` is running on port 8000
- Check the browser console (F12) for any errors