# Quick Start: Firebase Hosting + Backend Server

## 🚀 Quick Setup (5 minutes)

### 1. Configure Backend URL

Run the setup script:
```powershell
.\setup-firebase-backend.ps1
```

This will:
- ✅ Detect your backend server IP
- ✅ Update `public/config.js` with the correct backend URL
- ✅ Verify Firebase CLI setup

### 2. Start Backend Server

```powershell
npm start
```

Make sure firewall is configured (run `.\setup-backend-server.ps1` as Admin if needed).

### 3. Deploy Frontend to Firebase

```powershell
firebase deploy --only hosting
```

### 4. Access Your Site

Visit your Firebase URL (shown after deployment):
- `https://your-project-id.web.app`

## 📋 Prerequisites Checklist

- [ ] Firebase CLI installed: `npm install -g firebase-tools`
- [ ] Firebase project created: `firebase login` → `firebase init`
- [ ] Backend server running: `npm start`
- [ ] Firewall configured: `.\setup-backend-server.ps1` (as Admin)
- [ ] Backend URL configured: `.\setup-firebase-backend.ps1`

## 🔧 Configuration Files

- `public/config.js` - Backend URL (auto-configured by setup script)
- `firebase.json` - Firebase Hosting config (already set up)
- `server.js` - Backend server with CORS (already configured)

## 🌐 Network Access

**Local Network Only** (default):
- Users on same Wi-Fi can access backend
- Backend URL: `http://YOUR_IP:3000`

**Internet Access** (optional):
- Requires port forwarding + dynamic DNS
- See `FIREBASE_BACKEND_SETUP.md` for details

## 🐛 Troubleshooting

### Backend Not Accessible
1. Check backend is running: `curl http://localhost:3000/health`
2. Check firewall: `Get-NetFirewallRule -DisplayName "Radio Stream Server"`
3. Check IP: `ipconfig`

### CORS Errors
1. Verify backend URL in `public/config.js`
2. Check backend CORS config in `server.js`
3. Restart backend server

### Frontend Can't Connect
1. Open browser console (F12)
2. Check for "Backend URL configured" message
3. Verify backend URL matches your server IP
4. Redeploy: `firebase deploy --only hosting`

## 📚 Full Documentation

- **Complete Setup**: `FIREBASE_BACKEND_SETUP.md`
- **Backend Server**: `BACKEND_SERVER_SETUP.md`
- **Firebase Setup**: `FIREBASE_SETUP.md`

## ✅ Verify Setup

1. **Backend running**: `http://localhost:3000/health` returns `{"status":"ok"}`
2. **Frontend deployed**: Visit Firebase URL
3. **Connection works**: Test streaming/search on deployed site
4. **Backend logs**: Check backend console for incoming requests

---

**Need help?** Check the full guides or see troubleshooting sections in the documentation files.

