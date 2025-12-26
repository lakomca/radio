# Backend Server Startup Guide

This guide shows you how to set up your machine as a backend server for the radio website.

## Quick Setup

### 1. Run the Setup Script (as Administrator)

```powershell
# Right-click PowerShell → Run as Administrator
.\setup-backend-server.ps1
```

This will:
- ✅ Configure Windows Firewall
- ✅ Get your IP address
- ✅ Create production configuration

### 2. Start the Server

```powershell
npm start
```

Or use the production script:
```powershell
.\start-server-production.ps1
```

## Access Your Server

- **Local**: http://localhost:3000
- **Network**: http://YOUR_IP:3000 (find IP with `ipconfig`)

## Running as a Windows Service (Auto-Start)

To make the server start automatically when Windows boots:

### Option 1: Using Task Scheduler (Recommended)

1. Open Task Scheduler (`taskschd.msc`)
2. Click "Create Basic Task"
3. Name: "Radio Stream Server"
4. Trigger: "When the computer starts"
5. Action: "Start a program"
6. Program: `C:\Program Files\nodejs\node.exe`
7. Arguments: `C:\Users\msi\Downloads\radio\server.js`
8. Start in: `C:\Users\msi\Downloads\radio`
9. Check "Run with highest privileges"
10. Finish

### Option 2: Using NSSM (Node Service Manager)

1. Download NSSM: https://nssm.cc/download
2. Extract and run: `nssm install RadioStreamServer`
3. Configure:
   - Path: `C:\Program Files\nodejs\node.exe`
   - Startup directory: `C:\Users\msi\Downloads\radio`
   - Arguments: `server.js`
   - Service name: `RadioStreamServer`
4. Set environment variables:
   - `NODE_ENV=production`
   - `PORT=3000`
5. Start service: `nssm start RadioStreamServer`

### Option 3: Using PM2 (Node.js Process Manager)

```powershell
# Install PM2 globally
npm install -g pm2

# Start your app
pm2 start server.js --name radio-server

# Save PM2 configuration
pm2 save

# Setup PM2 to start on Windows boot
pm2 startup
# Follow the instructions it provides
```

## Manual Firewall Configuration

If the setup script doesn't work, manually configure Windows Firewall:

1. Open Windows Defender Firewall
2. Click "Advanced settings"
3. Click "Inbound Rules" → "New Rule"
4. Rule Type: Port
5. Protocol: TCP
6. Port: 3000
7. Action: Allow the connection
8. Profile: All (Domain, Private, Public)
9. Name: "Radio Stream Server"

Or run this PowerShell command (as Administrator):
```powershell
New-NetFirewallRule -DisplayName "Radio Stream Server" -Direction Inbound -LocalPort 3000 -Protocol TCP -Action Allow -Profile Domain,Private,Public
```

## Finding Your IP Address

```powershell
ipconfig
```

Look for "IPv4 Address" under your active network adapter (usually starts with 192.168.x.x)

## Production Environment Variables

Create a `.env` file in the project root:

```env
NODE_ENV=production
PORT=3000
SESSION_SECRET=your-random-secret-here-change-this
REMEMBER_ME=false
```

## Troubleshooting

### Port Already in Use
```powershell
# Find what's using port 3000
netstat -ano | findstr :3000

# Kill the process (replace PID with actual process ID)
taskkill /PID <PID> /F

# Or use the built-in script
npm run kill-port
```

### Can't Access from Other Devices

1. **Check Firewall**: Make sure Windows Firewall allows port 3000
2. **Check IP**: Make sure you're using the correct IP address
3. **Check Network**: Both devices must be on the same Wi-Fi network
4. **Check Server**: Make sure the server is running (`npm start`)

### Server Crashes

Check logs for errors. If using PM2:
```powershell
pm2 logs radio-server
```

## Security Notes

⚠️ **Important for Production:**

1. Change `SESSION_SECRET` in `.env` to a random string
2. Consider using HTTPS (requires reverse proxy like nginx)
3. Keep Node.js and dependencies updated
4. Use a strong firewall configuration
5. Consider using a reverse proxy (nginx/Caddy) for better security

## Network Access

- **Local Network**: Accessible from devices on the same Wi-Fi
- **Internet Access**: Requires port forwarding on your router (not recommended for security)

For internet access, consider deploying to Railway, Render, or another cloud platform instead.

