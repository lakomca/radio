# Firebase Hosting + Backend Server Setup Guide

This guide shows you how to deploy your frontend to Firebase Hosting while running the backend server on your own machine.

## Architecture Overview

- **Frontend**: Deployed to Firebase Hosting (accessible worldwide)
- **Backend**: Running on your machine (handles API requests, streaming, etc.)

## Prerequisites

1. **Firebase CLI** installed:
   ```powershell
   npm install -g firebase-tools
   ```

2. **Backend server** running on your machine (see `BACKEND_SERVER_SETUP.md`)

3. **Firebase project** created (see `FIREBASE_SETUP.md`)

## Step 1: Configure Backend Server

### 1.1 Set Up Firewall

Run the setup script as Administrator:
```powershell
# Right-click PowerShell → Run as Administrator
.\setup-backend-server.ps1
```

Or manually:
```powershell
New-NetFirewallRule -DisplayName "Radio Stream Server" -Direction Inbound -LocalPort 3000 -Protocol TCP -Action Allow
```

### 1.2 Start Backend Server

```powershell
npm start
```

### 1.3 Get Your Backend Server URL

Find your IP address:
```powershell
ipconfig
```

Your backend URL will be:
- **Local network**: `http://YOUR_IP:3000` (e.g., `http://192.168.1.182:3000`)
- **Internet access**: Requires port forwarding or dynamic DNS (see Step 4)

## Step 2: Configure Frontend Backend URL

### Option A: Update config.js Before Deploying (Recommended)

Edit `public/config.js` and set your backend URL:

```javascript
// For Firebase Hosting with local network backend
window.BACKEND_URL = 'http://YOUR_IP:3000';  // Replace YOUR_IP with your actual IP
```

**Important**: This only works if users are on the same network as your backend server.

### Option B: Use Environment Variable (Advanced)

You can set the backend URL via Firebase Hosting environment variables, but this requires custom build scripts.

### Option C: Internet-Accessible Backend (Best for Production)

If you want users worldwide to access your backend:
1. Set up port forwarding on your router (port 3000)
2. Use a dynamic DNS service (e.g., DuckDNS, No-IP)
3. Or use a VPN/tunneling service (e.g., ngrok, Cloudflare Tunnel)

Then update `config.js`:
```javascript
window.BACKEND_URL = 'https://your-backend-domain.com';  // or http://your-ip:3000
```

## Step 3: Deploy Frontend to Firebase

### 3.1 Login to Firebase

```powershell
firebase login
```

### 3.2 Initialize Firebase (if not already done)

```powershell
firebase init
```

Select:
- **Hosting** (use spacebar to select, Enter to confirm)
- Choose your Firebase project
- **Public directory**: `public`
- **Single-page app**: `y` (yes)
- **Automatic builds**: `n` (no, unless you want GitHub integration)

### 3.3 Update Backend URL in config.js

Before deploying, make sure `public/config.js` has the correct backend URL:

```javascript
// Example for local network backend
window.BACKEND_URL = 'http://192.168.1.182:3000';

// Example for internet-accessible backend
// window.BACKEND_URL = 'https://your-backend.example.com';
```

### 3.4 Deploy

```powershell
firebase deploy --only hosting
```

After deployment, you'll get a URL like:
- `https://your-project-id.web.app`
- `https://your-project-id.firebaseapp.com`

## Step 4: Make Backend Internet-Accessible (Optional)

If you want users worldwide to access your backend (not just local network):

### Option A: Port Forwarding + Dynamic DNS

1. **Set up port forwarding** on your router:
   - Forward external port 3000 → your machine's IP:3000
   - Check your router's admin panel for port forwarding settings

2. **Set up dynamic DNS** (if your IP changes):
   - Sign up for DuckDNS (free): https://www.duckdns.org
   - Install DuckDNS updater on your machine
   - Get a domain like: `yourname.duckdns.org`

3. **Update config.js**:
   ```javascript
   window.BACKEND_URL = 'http://yourname.duckdns.org:3000';
   ```

4. **Redeploy frontend**:
   ```powershell
   firebase deploy --only hosting
   ```

### Option B: Use ngrok (Quick Testing)

For quick testing (not recommended for production):

```powershell
# Install ngrok: https://ngrok.com/download
ngrok http 3000
```

Copy the HTTPS URL (e.g., `https://abc123.ngrok.io`) and update `config.js`:
```javascript
window.BACKEND_URL = 'https://abc123.ngrok.io';
```

**Note**: ngrok URLs change on each restart. Use for testing only.

### Option C: Cloudflare Tunnel (Recommended for Production)

1. Install Cloudflare Tunnel: https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/installation/

2. Create a tunnel:
   ```powershell
   cloudflared tunnel create radio-backend
   ```

3. Configure tunnel:
   ```yaml
   # config.yml
   tunnel: <tunnel-id>
   credentials-file: C:\Users\msi\.cloudflared\<tunnel-id>.json
   
   ingress:
     - hostname: your-backend.example.com
       service: http://localhost:3000
     - service: http_status:404
   ```

4. Run tunnel:
   ```powershell
   cloudflared tunnel run radio-backend
   ```

5. Update `config.js`:
   ```javascript
   window.BACKEND_URL = 'https://your-backend.example.com';
   ```

## Step 5: Update CORS on Backend (Already Done)

The backend server is already configured to allow requests from Firebase Hosting domains. The CORS configuration in `server.js` includes:
- `*.firebaseapp.com`
- `*.web.app`
- Local development origins

## Step 6: Test Your Setup

1. **Deploy frontend**:
   ```powershell
   firebase deploy --only hosting
   ```

2. **Visit your Firebase URL**:
   - Open: `https://your-project-id.web.app`
   - Open browser console (F12)
   - Check for "Backend URL configured" message
   - Test streaming/search functionality

3. **Check backend logs**:
   - Your backend server console should show incoming requests
   - Verify CORS headers are being sent correctly

## Troubleshooting

### CORS Errors

If you see CORS errors in the browser console:

1. **Check backend is running**:
   ```powershell
   curl http://localhost:3000/health
   ```

2. **Check backend URL in config.js**:
   - Open `public/config.js`
   - Verify `BACKEND_URL` is correct
   - Redeploy: `firebase deploy --only hosting`

3. **Check backend CORS configuration**:
   - Verify `server.js` has the updated CORS configuration
   - Restart backend server

### Backend Not Accessible

1. **Check firewall**:
   ```powershell
   Get-NetFirewallRule -DisplayName "Radio Stream Server"
   ```

2. **Check backend is listening**:
   ```powershell
   netstat -ano | findstr :3000
   ```

3. **Test backend directly**:
   ```powershell
   curl http://YOUR_IP:3000/health
   ```

### Frontend Can't Connect to Backend

1. **Check browser console** for errors
2. **Verify BACKEND_URL** in `config.js` matches your backend URL
3. **Check network tab** in browser DevTools to see failed requests
4. **Verify backend is accessible** from the network (not just localhost)

### Port Forwarding Issues

If using port forwarding:
- Verify router settings
- Check if your ISP blocks port 3000
- Try a different port (e.g., 8080)
- Update firewall rule and backend PORT environment variable

## Security Considerations

⚠️ **Important Security Notes:**

1. **Change SESSION_SECRET**: Update `.env` file with a strong random secret
2. **Use HTTPS**: For production, set up SSL certificate for your backend
3. **Rate Limiting**: Consider adding rate limiting to prevent abuse
4. **Firewall Rules**: Only allow necessary ports
5. **Keep Updated**: Regularly update Node.js and dependencies

## Quick Reference

### Backend Server
```powershell
# Start server
npm start

# Check status
curl http://localhost:3000/health

# Find IP
ipconfig
```

### Firebase Deployment
```powershell
# Deploy frontend
firebase deploy --only hosting

# View deployment
firebase hosting:channel:list

# Rollback (if needed)
firebase hosting:clone SOURCE_SITE_ID:TARGET_SITE_ID
```

### Configuration Files
- `public/config.js` - Backend URL configuration
- `firebase.json` - Firebase Hosting configuration
- `.env` - Backend environment variables
- `server.js` - Backend server with CORS configuration

## Next Steps

1. ✅ Set up backend server (this machine)
2. ✅ Configure firewall
3. ✅ Update `config.js` with backend URL
4. ✅ Deploy frontend to Firebase
5. ⚠️ (Optional) Set up internet access for backend
6. ✅ Test and verify everything works

## Support

- Firebase Hosting Docs: https://firebase.google.com/docs/hosting
- Backend Setup: See `BACKEND_SERVER_SETUP.md`
- Firebase Setup: See `FIREBASE_SETUP.md`

