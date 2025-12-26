# Fix ngrok Connection Issue

## The Problem

You're seeing: "Cannot connect to backend server" when accessing Firebase site.

## Common Causes

### 1. ngrok Browser Warning Page (Most Common)

ngrok free tier shows a warning page on first visit. You need to:
1. Visit `https://governessy-pathologically-leta.ngrok-free.dev` in your browser
2. Click "Visit Site" button to bypass warning
3. Then Firebase site will work

### 2. ngrok Not Running

Check if ngrok is running:
```powershell
Get-Process -Name "ngrok" -ErrorAction SilentlyContinue
```

If not running:
```powershell
cd C:\ngrok
.\ngrok.exe http 3000
```

### 3. Backend Not Running

Check if backend is running:
```powershell
curl http://localhost:3000/health
```

If not running:
```powershell
npm start
```

### 4. ngrok URL Changed

Each time you restart ngrok, you get a new URL. Check current URL:
```powershell
# Visit: http://localhost:4040 in browser
# Or check ngrok terminal window
```

Then update `public/config.js` with new URL.

## Quick Fix Steps

### Step 1: Verify Everything is Running

```powershell
# Check backend
curl http://localhost:3000/health

# Check ngrok (visit http://localhost:4040)
# Or check ngrok terminal window for URL
```

### Step 2: Bypass ngrok Warning

1. Open browser
2. Visit: `https://governessy-pathologically-leta.ngrok-free.dev`
3. Click "Visit Site" button
4. Should see backend health check response

### Step 3: Update config.js (If URL Changed)

Edit `public/config.js`:
```javascript
window.BACKEND_URL = window.BACKEND_URL || 'https://YOUR-NEW-NGROK-URL';
```

### Step 4: Redeploy Firebase

```powershell
firebase deploy --only hosting
```

## Permanent Solution: Skip ngrok Warning

Add header to bypass warning in `api-wrapper.js`:

```javascript
window.fetch = function(url, options = {}) {
    // ... existing code ...
    
    // Add ngrok skip header
    if (window.BACKEND_URL && window.BACKEND_URL.includes('ngrok')) {
        options.headers = options.headers || {};
        options.headers['ngrok-skip-browser-warning'] = 'true';
    }
    
    return originalFetch(url, options);
};
```

## Test Connection

```powershell
# Test locally
curl http://localhost:3000/health

# Test via ngrok (may need to accept warning first)
curl https://governessy-pathologically-leta.ngrok-free.dev/health
```

## Current Status

- ✅ Backend running locally
- ✅ ngrok process running  
- ⚠️ Need to bypass ngrok warning page

## Next Steps

1. Visit ngrok URL in browser to accept warning
2. Or update api-wrapper.js to skip warning automatically
3. Redeploy Firebase if config changed

