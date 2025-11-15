# Quick Start - Cloud Deployment (No Local Server!)

## 🚀 Deploy to Render (5 minutes, FREE)

### Step 1: Prepare Your Code
1. Make sure all files are committed to Git
2. Push to GitHub (if not already)

### Step 2: Deploy to Render
1. Go to https://render.com
2. Sign up (free with GitHub)
3. Click "New +" → "Web Service"
4. Connect your GitHub repo
5. Configure:
   - **Name**: `privacy-guardian-api`
   - **Environment**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn website_risk_api:app --host 0.0.0.0 --port $PORT`
6. Add Environment Variable:
   - Key: `SAFE_BROWSING_API_KEY`
   - Value: Your Google Safe Browsing API key
7. Click "Create Web Service"
8. Wait 2-3 minutes for deployment
9. Copy your URL (e.g., `https://privacy-guardian-api.onrender.com`)

### Step 3: Update Extension
1. Open `background/background.js`
2. Find line with `const CLOUD_API_URL = "";`
3. Replace with: `const CLOUD_API_URL = "https://your-api-url.onrender.com";`
4. Save and reload extension

### Step 4: Test!
1. Load extension in browser
2. Visit any website
3. Click extension icon - should show risk score!
4. No local server needed! 🎉

---

## Alternative: Railway (Always On)

1. Go to https://railway.app
2. Sign up with GitHub
3. "New Project" → "Deploy from GitHub"
4. Select your repo
5. Add environment variable: `SAFE_BROWSING_API_KEY`
6. Railway auto-deploys!
7. Get URL from dashboard
8. Update extension with Railway URL

---

## That's It!

Your extension now works without users needing to run anything locally!

**Benefits:**
- ✅ Zero setup for users
- ✅ Always available
- ✅ Free hosting (Render/Railway)
- ✅ Auto-deploys on git push

**Note:** Render free tier spins down after 15 min inactivity (first request may be slow). Railway stays always on.

