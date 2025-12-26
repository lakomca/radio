# How to Access Backend from Firebase Hosting

## Quick Setup (2 Options)

### Option 1: Local Network Only (Quick Setup)

**Works for**: Users on the same Wi-Fi network as your backend server

1. **Update config.js** (already done - your IP is configured):
   ```javascript
   window.BACKEND_URL = 'http://192.168.1.182:3000';
   ```

2. **Start your backend server**:
   ```powershell
   npm start
   ```

3. **Deploy frontend to Firebase**:
   ```powershell
   firebase deploy --only hosting
   ```

4. **Access**: Users on your Wi-Fi can access Firebase site and it will connect to your backend

**Limitation**: Only works for users on the same network. Users elsewhere won't be able to connect.

---

### Option 2: Internet Access (Recommended for Production)

**Works for**: Users worldwide

You need to make your backend accessible from the internet. Choose one:

#### A. Using ngrok (Quick Testing - Free)

1. **Install ngrok**: https://ngrok.com/download

2. **Start your backend**:
   ```powershell
   npm start
   ```

3. **In a new terminal, start ngrok**:
   ```powershell
   ngrok http 3000
   ```

4. **Copy the HTTPS URL** (e.g., `https://abc123.ngrok.io`)

5. **Update config.js**:
   ```javascript
   window.BACKEND_URL = 'https://abc123.ngrok.io';
   ```

6. **Deploy to Firebase**:
   ```powershell
   firebase deploy --only hosting
   ```

**Note**: ngrok URLs change each time you restart. Use for testing only.

#### B. Using Port Forwarding + Dynamic DNS (Permanent Solution)

1. **Set up port forwarding** on your router:
   - Forward external port 3000 → your machine's IP (192.168.1.182):3000
   - Check your router admin panel (usually 192.168.1.1 or 192.168.0.1)

2. **Get your public IP**:
   ```powershell
   curl ifconfig.me
   ```

3. **Set up Dynamic DNS** (if your IP changes):
   - Sign up at DuckDNS: https://www.duckdns.org (free)
   - Install DuckDNS updater on your machine
   - Get domain like: `yourname.duckdns.org`

4. **Update config.js**:
   ```javascript
   // If using public IP directly:
   window.BACKEND_URL = 'http://YOUR_PUBLIC_IP:3000';
   
   // Or if using dynamic DNS:
   window.BACKEND_URL = 'http://yourname.duckdns.org:3000';
   ```

5. **Deploy to Firebase**:
   ```powershell
   firebase deploy --only hosting
   ```

#### C. Using Cloudflare Tunnel (Best for Production)

1. **Install Cloudflare Tunnel**: https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/installation/

2. **Create tunnel**:
   ```powershell
   cloudflared tunnel create radio-backend
   ```

3. **Run tunnel**:
   ```powershell
   cloudflared tunnel run radio-backend
   ```

4. **Get your tunnel URL** and update `config.js`

5. **Deploy to Firebase**

---

## Step-by-Step: Quick Setup (Local Network)

### 1. Make sure backend is running:
```powershell
npm start
```

### 2. Verify backend is accessible:
```powershell
curl http://localhost:3000/health
```

Should return: `{"status":"ok",...}`

### 3. Check firewall is configured:
```powershell
Get-NetFirewallRule -DisplayName "Radio Stream Server"
```

If not configured, run as Admin:
```powershell
.\setup-backend-server.ps1
```

### 4. Update config.js (if needed):
Edit `public/config.js` and set:
```javascript
window.BACKEND_URL = 'http://192.168.1.182:3000';
```

### 5. Deploy to Firebase:
```powershell
firebase login
firebase deploy --only hosting
```

### 6. Test:
- Visit your Firebase URL (shown after deployment)
- Open browser console (F12)
- Look for: "Backend URL configured: http://192.168.1.182:3000"
- Test streaming/search functionality

---

## Current Configuration

✅ **Your Backend IP**: `192.168.1.182`  
✅ **Backend Port**: `3000`  
✅ **Config File**: `public/config.js` (already updated)

---

## Troubleshooting

### Firebase site can't connect to backend

1. **Check backend is running**:
   ```powershell
   curl http://localhost:3000/health
   ```

2. **Check browser console** (F12):
   - Look for CORS errors
   - Check "Backend URL configured" message
   - Verify the URL is correct

3. **Check backend logs**:
   - Your backend console should show incoming requests
   - If no requests appear, the frontend isn't reaching the backend

4. **Verify config.js**:
   - Open `public/config.js`
   - Make sure `BACKEND_URL` is set correctly
   - Redeploy: `firebase deploy --only hosting`

### CORS Errors

The backend is already configured to allow Firebase domains. If you see CORS errors:
1. Restart backend server
2. Check `server.js` CORS configuration
3. Verify Firebase domain is in allowed origins

### Backend Not Accessible from Internet

If using Option 1 (local network):
- This is expected! Only works on same Wi-Fi
- Use Option 2 for internet access

If using Option 2:
- Check port forwarding is configured correctly
- Verify firewall allows port 3000
- Test with: `curl http://YOUR_PUBLIC_IP:3000/health` from outside your network

---

## Quick Commands Reference

```powershell
# Start backend
npm start

# Deploy frontend
firebase deploy --only hosting

# Check backend health
curl http://localhost:3000/health

# Find your IP
ipconfig

# Find public IP
curl ifconfig.me
```

---

## Next Steps

1. ✅ Backend IP configured: `192.168.1.182:3000`
2. ⏭️ Start backend: `npm start`
3. ⏭️ Deploy frontend: `firebase deploy --only hosting`
4. ⏭️ Test: Visit Firebase URL and test functionality

For internet access, see Option 2 above!

