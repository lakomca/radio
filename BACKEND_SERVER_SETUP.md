# Backend Server Setup - Quick Reference

Your machine is now configured as a backend server for the radio website!

## 🚀 Quick Start

### Step 1: Configure Firewall (Run as Administrator)

```powershell
# Right-click PowerShell → Run as Administrator
.\setup-backend-server.ps1
```

Or manually:
```powershell
New-NetFirewallRule -DisplayName "Radio Stream Server" -Direction Inbound -LocalPort 3000 -Protocol TCP -Action Allow -Profile Domain,Private,Public
```

### Step 2: Start the Server

```powershell
npm start
```

Or use the production script:
```powershell
.\start-server-production.ps1
```

## 📍 Your Server Information

- **Local URL**: http://localhost:3000
- **Network IP**: 192.168.1.182 (your current IP)
- **Network URL**: http://192.168.1.182:3000

## 🌐 Access from Other Devices

1. Make sure the device is on the **same Wi-Fi network**
2. Open a browser on the device
3. Go to: `http://192.168.1.182:3000`

## 🔧 Configuration Files Created

- ✅ `setup-backend-server.ps1` - Firewall and network setup script
- ✅ `start-server-production.ps1` - Production startup script
- ✅ `STARTUP_GUIDE.md` - Detailed guide for auto-start setup
- ✅ `.env` - Environment variables (create manually if needed)

## 📝 Environment Variables

Create a `.env` file in the project root:

```env
NODE_ENV=production
PORT=3000
SESSION_SECRET=your-random-secret-here-change-this
REMEMBER_ME=false
```

## 🔄 Auto-Start on Boot

See `STARTUP_GUIDE.md` for detailed instructions on:
- Task Scheduler setup
- NSSM (Windows Service)
- PM2 (Process Manager)

## 🛠️ Troubleshooting

### Port Already in Use
```powershell
npm run kill-port
```

### Can't Access from Network
1. Check firewall: Run `setup-backend-server.ps1` as admin
2. Check IP: Run `ipconfig` to verify your IP address
3. Check server: Make sure `npm start` is running

### Find Your IP Address
```powershell
ipconfig
```
Look for "IPv4 Address" (usually 192.168.x.x)

## 📊 Server Status

Check if server is running:
```powershell
curl http://localhost:3000/health
```

Should return: `{"status":"ok","timestamp":"..."}`

## 🔒 Security Notes

⚠️ For production use:
- Change `SESSION_SECRET` in `.env` to a random string
- Consider using HTTPS (requires reverse proxy)
- Keep dependencies updated
- Use strong firewall rules

## 📚 More Information

- See `STARTUP_GUIDE.md` for auto-start options
- See `ACCESS_FROM_OTHER_DEVICE.md` for network access details
- See `DEPLOY_RAILWAY.md` if you want cloud deployment instead

