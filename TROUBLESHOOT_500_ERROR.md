# Troubleshooting 500 Error

## The Problem

You're getting HTTP 500 errors when trying to load genre stations.

## What This Means

- ✅ CORS is working (requests are reaching backend)
- ✅ ngrok is working (tunnel is active)
- ✅ Backend is receiving requests
- ❌ Backend is failing to process the request (500 error)

## Common Causes

### 1. Radio Browser API Timeout/Error

The backend tries to fetch from Radio Browser API but it fails.

**Check backend logs** - you should see:
```
Error proxying Radio Browser API search: [error message]
```

**Solutions:**
- Radio Browser API might be down or slow
- Network issue from your backend to Radio Browser API
- Try again later (API might be rate limiting)

### 2. Network Issue

Your backend can't reach the Radio Browser API.

**Test:**
```powershell
# From your backend machine
Invoke-WebRequest -Uri "https://de1.api.radio-browser.info/json/stations/search?tag=electronic&limit=10" -UseBasicParsing
```

**Solutions:**
- Check internet connection
- Check firewall isn't blocking outbound HTTPS
- Try different Radio Browser API server

### 3. Radio Browser API Rate Limiting

The API might be rate limiting your requests.

**Solutions:**
- Wait a few minutes and try again
- Reduce request frequency
- Use IPRD repository instead (already configured)

## How to Debug

### Step 1: Check Backend Logs

Look at your backend terminal window. You should see error messages like:
```
Error proxying Radio Browser API search: [details]
Error stack: [stack trace]
```

### Step 2: Test Radio Browser API Directly

```powershell
# Test if Radio Browser API is accessible
Invoke-WebRequest -Uri "https://de1.api.radio-browser.info/json/stations/search?tag=electronic&limit=10" -UseBasicParsing
```

### Step 3: Check Backend Response

```powershell
# Test your backend endpoint
Invoke-WebRequest -Uri "https://governessy-pathologically-leta.ngrok-free.dev/api/radio/search?tag=electronic&limit=10" -UseBasicParsing -Headers @{"ngrok-skip-browser-warning"="true"}
```

Check the response body for error details.

## Quick Fixes

### Fix 1: Restart Backend

Sometimes a restart helps:
```powershell
# Stop backend (Ctrl+C)
npm start
```

### Fix 2: Check Radio Browser API Status

Visit: https://api.radio-browser.info/
Check if the API is operational.

### Fix 3: Use Alternative API Server

If `de1.api.radio-browser.info` is down, try:
- `nl1.api.radio-browser.info`
- `at1.api.radio-browser.info`

Update `server.js` line 1277:
```javascript
const RADIO_BROWSER_API = 'https://nl1.api.radio-browser.info/json';
```

### Fix 4: Increase Timeout

If API is slow, increase timeout in `server.js`:
```javascript
const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 seconds instead of 30
```

## Current Status

- ✅ CORS fixed
- ✅ ngrok working
- ✅ Backend receiving requests
- ⚠️ Backend failing to fetch from Radio Browser API

## Next Steps

1. **Check backend logs** - Look for error messages
2. **Test Radio Browser API** - See if it's accessible
3. **Try different API server** - If current one is down
4. **Restart backend** - Sometimes helps

## Expected Backend Log Output

When working correctly, you should see:
```
Proxying Radio Browser API request: https://de1.api.radio-browser.info/json/stations/search?tag=electronic&limit=100&order=clickcount&reverse=true
```

When failing, you'll see:
```
Error proxying Radio Browser API search: [error]
Error stack: [stack trace]
```

Check your backend terminal for these messages!

