# Accessing Your Radio Website from Another Device

There are two ways to access your radio website from another device:

## Option 1: Local Network Access (Development)

Access your local server from other devices on the same Wi-Fi network.

### Step 1: Find Your Computer's IP Address

**Windows:**
```powershell
ipconfig
```
Look for "IPv4 Address" under your active network adapter (usually starts with 192.168.x.x or 10.x.x.x)

**Example output:**
```
Wireless LAN adapter Wi-Fi:
   IPv4 Address. . . . . . . . . . . . : 192.168.1.100
```

### Step 2: Update server.js to Allow External Connections

Your server.js already serves on all interfaces (0.0.0.0), but let's verify:

```javascript
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Radio server running on http://0.0.0.0:${PORT}`);
});
```

Or simply:
```javascript
app.listen(PORT, () => {
    console.log(`Radio server running on http://localhost:${PORT}`);
    console.log(`Access from other devices: http://YOUR_IP:${PORT}`);
});
```

### Step 3: Allow Firewall Access

**Windows Firewall:**
1. Open Windows Defender Firewall
2. Click "Allow an app or feature through Windows Defender Firewall"
3. Click "Change Settings" → "Allow another app"
4. Browse to Node.js executable (usually `C:\Program Files\nodejs\node.exe`)
5. Check both "Private" and "Public"
6. Click OK

**Or via PowerShell (Run as Administrator):**
```powershell
New-NetFirewallRule -DisplayName "Node.js Server" -Direction Inbound -LocalPort 3000 -Protocol TCP -Action Allow
```

### Step 4: Start Your Server

```powershell
npm start
```

### Step 5: Access from Another Device

On your other device (phone, tablet, another computer):
1. Make sure it's on the **same Wi-Fi network**
2. Open a browser
3. Go to: `http://YOUR_IP:3000`
   - Example: `http://192.168.1.100:3000`

## Option 2: Deployed Access (Production)

If you've deployed to Railway (or another platform), access it from anywhere:

### Railway Deployment

1. After deploying to Railway, you get a URL like:
   - `https://your-app.up.railway.app`

2. Access from any device:
   - Open browser on any device (phone, tablet, computer)
   - Go to: `https://your-app.up.railway.app`
   - Works from anywhere in the world!

### Share Your URL

You can share your Railway URL with anyone:
- Friends
- Family
- Other devices
- Works on any network, anywhere!

## Troubleshooting Local Network Access

### Can't Connect?

1. **Check IP Address:**
   ```powershell
   ipconfig
   ```
   Make sure you're using the correct IP

2. **Check Firewall:**
   - Make sure Windows Firewall allows Node.js
   - Try temporarily disabling firewall to test

3. **Check Network:**
   - Both devices must be on the same Wi-Fi network
   - Some public Wi-Fi blocks device-to-device communication

4. **Check Server:**
   - Make sure server is running
   - Check server logs for errors

5. **Try Different Port:**
   - If port 3000 is blocked, change PORT in server.js
   - Update firewall rule for new port

### Test Connection

On your computer, test if server is accessible:
```powershell
# Test from command line
curl http://localhost:3000/health
```

From another device, test:
- Open browser: `http://YOUR_IP:3000/health`
- Should return: `{"status":"ok"}`

## Quick Reference

**Local Network:**
- Your IP: `192.168.x.x` (find with `ipconfig`)
- URL: `http://192.168.x.x:3000`
- Only works on same Wi-Fi

**Deployed (Railway):**
- URL: `https://your-app.up.railway.app`
- Works from anywhere
- Share with anyone

## Recommendation

For development/testing: Use **Option 1** (Local Network)
For production/sharing: Use **Option 2** (Railway Deployment)

