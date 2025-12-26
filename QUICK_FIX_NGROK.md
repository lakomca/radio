# Quick Fix: ngrok Connection Issue

## The Problem

"Cannot connect to backend server" error when accessing Firebase site.

## Root Cause

ngrok free tier shows a browser warning page that must be accepted once before API calls work.

## Quick Fix (2 Steps)

### Step 1: Accept ngrok Warning (Do This Once)

1. Open your browser
2. Visit: `https://governessy-pathologically-leta.ngrok-free.dev`
3. You'll see ngrok's warning page
4. Click the **"Visit Site"** button
5. You should see: `{"status":"ok",...}`

### Step 2: Redeploy Firebase

```powershell
firebase deploy --only hosting
```

This deploys the updated `api-wrapper.js` with the skip header.

## Verify It Works

After redeploying, visit: `https://nurayportal.web.app`

The connection should work now!

## Why This Happens

ngrok free tier requires:
1. First visit in browser to accept warning
2. Then API calls work (with skip header)

## Alternative: Use ngrok Paid Plan

Paid ngrok plans don't show warning pages. But free tier works fine after accepting once.

## Test Commands

```powershell
# Test local backend
Invoke-WebRequest -Uri "http://localhost:3000/health" -UseBasicParsing

# Test ngrok (after accepting warning)
Invoke-WebRequest -Uri "https://governessy-pathologically-leta.ngrok-free.dev/health" -UseBasicParsing -Headers @{"ngrok-skip-browser-warning"="true"}
```

## Current Status

- ✅ Backend running locally
- ✅ ngrok running
- ✅ Config.js has correct URL
- ✅ api-wrapper.js has skip header
- ⏭️ Need to accept ngrok warning once
- ⏭️ Need to redeploy Firebase

## After Fixing

Once you've:
1. Visited ngrok URL and accepted warning
2. Redeployed Firebase

Your Firebase site will connect to the backend successfully!

