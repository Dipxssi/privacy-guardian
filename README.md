## Privacy Guardian

Privacy Guardian is a browser extension that provides real-time privacy protection and website risk scoring. It detects potentially sensitive personally identifiable information (PII) you enter in form fields and assesses website risk using Google Safe Browsing, SSL certificate verification, and URL heuristics.

**🌐 Cloud-Hosted**: The extension uses a cloud-hosted API, Just install and use.

## Features

- 🛡️ **Real-time PII Detection**: Warns users when they enter emails, phone numbers, credit card numbers, names, or SSNs
- 🔍 **Website Risk Assessment**: Uses Google Safe Browsing API to assess website safety
- ⚠️ **Smart Warnings**: Only shows warnings on high-risk sites (score ≥ 50) to reduce alert fatigue
- 🚨 **Critical PII Protection**: Always warns for credit cards and SSNs, regardless of risk score
- ⚡ **Non-blocking**: Alerts users but doesn't prevent them from entering information
- 📊 **Risk Score Display**: Shows risk scores and reasons in the extension popup
- ☁️ **Cloud-Powered**: No local server needed - works out of the box!

## Quick Start (For Users)

### Installation

1. **Download the Extension**
   - Clone or download this repository
   - Or download the extension files

2. **Load the Extension in Chrome/Edge**
   - Open Chrome or Edge browser
   - Go to `chrome://extensions/` (or `edge://extensions/`)
   - Enable **"Developer mode"** (toggle in top right)
   - Click **"Load unpacked"**
   - Select the `privacy-guardian` folder (the folder containing `manifest.json`)

3. **That's It!**
   - The extension is now active
   - Visit any website and click the extension icon to see risk scores
   - Start typing in forms - you'll see warnings if PII is detected on risky sites

### Using the Extension

- **View Risk Assessment**: Click the extension icon to see the current website's risk score
- **PII Warnings**: Automatically monitors form inputs and shows warnings when you type PII on high-risk sites
- **Toggle Protection**: Use the toggle button in the popup to enable/disable protection
- **View Statistics**: Check detection counts in the extension popup

## How It Works

1. **Risk Assessment**: When you visit a website, the extension checks it against:
   - Google Safe Browsing API (malware, phishing, etc.)
   - SSL certificate validity
   - URL heuristics (suspicious patterns)

2. **PII Detection**: As you type in form fields, the extension detects:
   - Email addresses
   - Phone numbers
   - Credit card numbers
   - Social Security Numbers (SSN)
   - Names

3. **Smart Warnings**: 
   - **High-risk sites (score ≥ 50)**: Shows warnings for all PII types
   - **Low-risk sites (score < 50)**: Suppresses warnings (except credit cards/SSN)
   - **Critical PII**: Always warns for credit cards and SSNs

## For Developers

### Local Development Setup

If you want to run the API locally for development:

1. **Install Dependencies**
   ```bash
   # Activate virtual environment (Windows)
   venv\Scripts\activate
   
   # Install dependencies
   pip install -r requirements.txt
   ```

2. **Start the Local API Server**
   ```bash
   python website_risk_api.py
   ```
   This starts the server on `http://localhost:9000`

3. **Update Extension for Local Use**
   - Edit `background/background.js`
   - Set `const CLOUD_API_URL = "";` to use localhost
   - Or the extension will automatically fall back to localhost if cloud fails

4. **(Optional) AI PII Detection Server**
   ```bash
   python pii_inference.py
   ```
   This starts the AI server on `http://localhost:8000` for enhanced detection

### Cloud API

The extension is configured to use the cloud-hosted API at:
- **API URL**: `https://privacy-guardian-api.onrender.com`
- **Health Check**: `https://privacy-guardian-api.onrender.com/health`
- **API Docs**: `https://privacy-guardian-api.onrender.com/docs`

The extension automatically falls back to localhost if the cloud API is unavailable (for developers).

## Troubleshooting

**Extension won't load:**
- Make sure all file paths in `manifest.json` are correct
- Check the browser console for errors (F12)
- Verify the manifest.json is valid JSON

**Risk assessment not working:**
- Check your internet connection (cloud API requires internet)
- Verify the cloud API is accessible: `https://privacy-guardian-api.onrender.com/health`
- Check the browser console (F12) for network errors
- If developing locally, make sure `website_risk_api.py` is running

**PII warnings not appearing:**
- Make sure protection is enabled (green dot in popup)
- Check that the website's risk score is ≥ 50 (warnings are suppressed on low-risk sites)
- Credit cards and SSNs always show warnings regardless of risk score
- Check the browser console (F12) for any errors

**Cloud API is slow:**
- Render's free tier spins down after 15 minutes of inactivity
- First request after inactivity may take 30-60 seconds
- Consider using Railway or Fly.io for always-on hosting

## Architecture

- **Extension**: Browser extension (Chrome/Edge)
- **Cloud API**: FastAPI server hosted on Render
- **Risk Assessment**: Google Safe Browsing API + SSL + URL heuristics
- **PII Detection**: Regex patterns + optional AI model

## License

This project is open source and available for use.

## Contributing

Contributions are welcome! Please feel free to submit issues or pull requests.