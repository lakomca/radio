# Fix Mixed Content Error (HTTPS → HTTP)

## The Problem

You're getting "Failed to fetch" errors because:
- **Firebase Hosting** serves your site over **HTTPS**
- **Your backend** (`criticmobile.duckdns.org:3000`) uses **HTTP**
- **Browsers block HTTP requests from HTTPS pages** (Mixed Content Policy)

## Solutions

### Option 1: Use ngrok (Quickest - Provides HTTPS)

ngrok automatically provides HTTPS for your backend:

```powershell
# 1. Download ngrok from https://ngrok.com/download
# 2. Extract to C:\ngrok\
# 3. Sign up and get authtoken from https://dashboard.ngrok.com
# 4. Configure:
cd C:\ngrok
.\ngrok.exe config add-authtoken YOUR_AUTHTOKEN

# 5. Start backend:
npm start

# 6. In new terminal, start ngrok:
cd C:\ngrok
.\ngrok.exe http 3000

# 7. Copy the HTTPS URL (e.g., https://abc123.ngrok.io)
# 8. Update public/config.js:
#    window.BACKEND_URL = 'https://abc123.ngrok.io';
# 9. Redeploy: firebase deploy --only hosting
```

### Option 2: Cloudflare Tunnel (Best - Free HTTPS)

Cloudflare Tunnel provides free HTTPS:

```powershell
# 1. Install Cloudflare Tunnel
#    Download: https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/installation/

# 2. Login:
cloudflared tunnel login

# 3. Create tunnel:
cloudflared tunnel create radio-backend

# 4. Create config file: C:\Users\msi\.cloudflared\config.yml
#    tunnel: <tunnel-id>
#    credentials-file: C:\Users\msi\.cloudflared\<tunnel-id>.json
#    ingress:
#      - hostname: radio-backend.criticmobile.duckdns.org
#        service: http://localhost:3000
#      - service: http_status:404

# 5. Run tunnel:
cloudflared tunnel run radio-backend

# 6. Update config.js:
#    window.BACKEND_URL = 'https://radio-backend.criticmobile.duckdns.org';

# 7. Deploy: firebase deploy --only hosting
```

### Option 3: SSL Certificate for DuckDNS (Advanced)

Set up SSL certificate for your DuckDNS domain:

1. Use Let's Encrypt with Certbot
2. Or use Cloudflare's free SSL (if using Cloudflare DNS)
3. Configure your backend to use HTTPS

### Option 4: Test Locally First

For development/testing, test locally where both use HTTP:

```powershell
# 1. Start backend:
npm start

# 2. Open browser:
#    http://localhost:3000

# 3. This works because both frontend and backend use HTTP
```

## Quick Fix: Use ngrok Now

The fastest solution right now:

```powershell
# Use the helper script:
.\start-ngrok.ps1

# Or manually:
# Terminal 1:
npm start

# Terminal 2:
cd C:\ngrok
.\ngrok.exe http 3000

# Copy HTTPS URL, update config.js, redeploy
```

## Verify Fix

After updating to HTTPS backend:

1. **Check browser console** - no mixed content warnings
2. **Test genre stations** - should load successfully
3. **Check network tab** - requests should go to HTTPS URL

## Current Configuration

- **Backend URL**: `http://criticmobile.duckdns.org:3000` (HTTP - causes mixed content)
- **Firebase Hosting**: HTTPS (blocks HTTP requests)
- **Solution**: Change backend URL to HTTPS

## Recommended: ngrok for Now

For immediate fix, use ngrok:
1. Provides HTTPS automatically
2. No port forwarding needed
3. Works immediately
4. Free tier available

Then later, set up Cloudflare Tunnel for permanent HTTPS solution.

