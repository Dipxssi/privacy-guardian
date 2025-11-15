# Deployment Guide - Cloud API Setup

This guide will help you deploy the Privacy Guardian API to the cloud so users don't need to run a local server.

## Option 1: Render (Recommended - Free & Easy)

### Steps:

1. **Create a Render Account**
   - Go to https://render.com
   - Sign up with GitHub (recommended)

2. **Create New Web Service**
   - Click "New +" → "Web Service"
   - Connect your GitHub repository
   - Or use "Public Git repository" and paste your repo URL

3. **Configure Service**
   - **Name**: `privacy-guardian-api` (or any name)
   - **Environment**: Python 3
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn website_risk_api:app --host 0.0.0.0 --port $PORT`
   - **Plan**: Free (or paid if you need more resources)

4. **Add Environment Variables**
   - Go to "Environment" tab
   - Add: `SAFE_BROWSING_API_KEY` = `your-api-key-here`
   - Add: `PORT` = `10000` (Render auto-assigns, but you can set default)

5. **Deploy**
   - Click "Create Web Service"
   - Wait for deployment (2-3 minutes)
   - Copy your service URL (e.g., `https://privacy-guardian-api.onrender.com`)

6. **Update Extension**
   - Update `background/background.js` with your Render URL
   - Or use the configurable API URL feature (see below)

### Render Free Tier Limits:
- ✅ Free forever
- ⚠️ Spins down after 15 minutes of inactivity (first request may be slow)
- ✅ 750 hours/month free
- ✅ Auto-deploys on git push

---

## Option 2: Railway (Free Tier Available)

### Steps:

1. **Create Railway Account**
   - Go to https://railway.app
   - Sign up with GitHub

2. **Create New Project**
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Choose your repository

3. **Configure**
   - Railway auto-detects Python
   - Add environment variable: `SAFE_BROWSING_API_KEY`
   - Railway auto-assigns PORT

4. **Deploy**
   - Railway automatically deploys
   - Get your URL from the service dashboard

### Railway Free Tier:
- ✅ $5 free credit/month
- ✅ No spin-down (always on)
- ✅ Fast deployments

---

## Option 3: Fly.io (Free Tier)

### Steps:

1. **Install Fly CLI**
   ```bash
   # Windows (PowerShell)
   iwr https://fly.io/install.ps1 -useb | iex
   ```

2. **Login**
   ```bash
   fly auth login
   ```

3. **Create App**
   ```bash
   fly launch
   ```
   - Follow prompts
   - Don't deploy yet

4. **Set Secrets**
   ```bash
   fly secrets set SAFE_BROWSING_API_KEY=your-api-key-here
   ```

5. **Deploy**
   ```bash
   fly deploy
   ```

6. **Get URL**
   ```bash
   fly info
   ```

### Fly.io Free Tier:
- ✅ 3 shared VMs free
- ✅ 160GB outbound data/month
- ✅ Always on

---

## Option 4: Heroku (Paid, but reliable)

### Steps:

1. **Install Heroku CLI**
   - Download from https://devcenter.heroku.com/articles/heroku-cli

2. **Login**
   ```bash
   heroku login
   ```

3. **Create App**
   ```bash
   heroku create privacy-guardian-api
   ```

4. **Set Config Vars**
   ```bash
   heroku config:set SAFE_BROWSING_API_KEY=your-api-key-here
   ```

5. **Deploy**
   ```bash
   git push heroku main
   ```

### Heroku:
- ⚠️ No free tier anymore (paid only)
- ✅ Very reliable
- ✅ Easy to use

---

## Updating the Extension to Use Cloud API

### Method 1: Hardcode Cloud URL (Simple)

Edit `background/background.js`:
```javascript
// Change this line:
const response = await fetch("http://localhost:9000/check_website_risk", {

// To your cloud URL:
const response = await fetch("https://your-api-url.onrender.com/check_website_risk", {
```

### Method 2: Configurable API URL (Recommended)

See `background/background.js` - it now supports both local and cloud!

The extension will:
1. Try cloud API first (if configured)
2. Fall back to localhost if cloud fails
3. Show error message if both fail

---

## Environment Variables

Make sure to set these in your cloud platform:

- `SAFE_BROWSING_API_KEY` - Your Google Safe Browsing API key
- `PORT` - Port number (usually auto-set by platform)

---

## Testing Your Deployed API

1. **Health Check**
   ```
   https://your-api-url.onrender.com/health
   ```
   Should return: `{"status":"healthy","api_key_configured":true}`

2. **Test Risk Check**
   ```bash
   curl -X POST "https://your-api-url.onrender.com/check_website_risk" \
     -H "Content-Type: application/json" \
     -d '{"url": "https://example.com"}'
   ```

3. **API Documentation**
   ```
   https://your-api-url.onrender.com/docs
   ```

---

## Updating website_risk_api.py for Cloud

The API is already cloud-ready! Just make sure:

1. ✅ Uses `$PORT` environment variable (Render, Railway)
2. ✅ CORS is enabled (for browser extensions)
3. ✅ Environment variable for API key

If you need to update the API key source:

```python
import os

# Get API key from environment variable (cloud) or use hardcoded (local)
SAFE_BROWSING_API_KEY = os.getenv("SAFE_BROWSING_API_KEY", "your-default-key-here")
```

---

## Cost Comparison

| Platform | Free Tier | Paid Plans | Best For |
|----------|-----------|------------|----------|
| **Render** | ✅ Yes | $7/month | Easy setup, auto-deploy |
| **Railway** | ✅ $5 credit | $5+/month | Fast, always on |
| **Fly.io** | ✅ 3 VMs | $1.94+/month | Global edge network |
| **Heroku** | ❌ No | $7+/month | Enterprise reliability |

**Recommendation**: Start with **Render** (easiest) or **Railway** (always on).

---

## Next Steps After Deployment

1. ✅ Test your cloud API
2. ✅ Update extension with cloud URL
3. ✅ Test extension with cloud API
4. ✅ Update README with cloud instructions
5. ✅ Remove local server requirement from docs

---

## Troubleshooting

### API returns 503/Timeout
- **Render**: Service may be spinning up (first request after inactivity)
- **Solution**: Wait 30 seconds and try again

### CORS Errors
- Make sure CORS middleware is enabled in `website_risk_api.py`
- Check that your extension's origin is allowed

### API Key Not Working
- Verify environment variable is set correctly
- Check API key is valid in Google Cloud Console
- Check API logs in your cloud platform dashboard

