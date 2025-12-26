# Quick ngrok Setup (Easiest HTTPS Solution)

ngrok is the fastest way to get HTTPS for your backend without domain setup.

## Step 1: Download ngrok

1. Go to: https://ngrok.com/download
2. Download for Windows (64-bit)
3. Extract `ngrok.exe` to `C:\ngrok\`

## Step 2: Sign Up (Free)

1. Go to: https://dashboard.ngrok.com/signup
2. Sign up with email (free account)
3. Go to: https://dashboard.ngrok.com/get-started/your-authtoken
4. Copy your authtoken

## Step 3: Configure ngrok

```powershell
cd C:\ngrok
.\ngrok.exe config add-authtoken YOUR_AUTHTOKEN
```

Replace `YOUR_AUTHTOKEN` with the token from step 2.

## Step 4: Start Backend + ngrok

**Option A: Use Helper Script**

```powershell
.\start-ngrok.ps1
```

**Option B: Manual**

Terminal 1 (Backend):
```powershell
npm start
```

Terminal 2 (ngrok):
```powershell
cd C:\ngrok
.\ngrok.exe http 3000
```

You'll see output like:
```
Forwarding  https://abc123.ngrok.io -> http://localhost:3000
```

## Step 5: Copy HTTPS URL

Copy the HTTPS URL (e.g., `https://abc123.ngrok.io`)

## Step 6: Update config.js

Edit `public/config.js`:

```javascript
// Find this line (around line 25):
window.BACKEND_URL = window.BACKEND_URL || 'http://criticmobile.duckdns.org:3000';

// Replace with your ngrok URL:
window.BACKEND_URL = window.BACKEND_URL || 'https://abc123.ngrok.io';
```

## Step 7: Deploy to Firebase

```powershell
firebase deploy --only hosting
```

## Done! ✅

Your Firebase site will now connect to your backend via HTTPS.

## Important Notes

⚠️ **ngrok URLs change** each time you restart ngrok. You'll need to:
1. Get new URL
2. Update config.js
3. Redeploy to Firebase

💡 **Tip**: For permanent URL, upgrade to ngrok paid plan or use Cloudflare Tunnel.

## Keep ngrok Running

- Keep the ngrok terminal window open
- If you close it, restart and update config.js with new URL

## Test

1. Visit your Firebase URL
2. Open browser console (F12)
3. Check: "Backend URL configured: https://abc123.ngrok.io"
4. Test genre stations - should work now!

