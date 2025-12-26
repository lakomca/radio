# Port Forwarding Setup Guide

Your backend is running locally but not accessible from the internet. You need to set up port forwarding in your router.

## Quick Steps

### Step 1: Find Your Router IP

```powershell
ipconfig
```

Look for "Default Gateway" (usually `192.168.1.1` or `192.168.0.1`)

### Step 2: Access Router Admin

1. Open browser: `http://192.168.1.1` (or your gateway IP)
2. Login (check router label for username/password)
3. Common defaults:
   - Username: `admin`, Password: `admin`
   - Username: `admin`, Password: `password`
   - Username: `admin`, Password: (blank)

### Step 3: Find Port Forwarding Settings

Look for these menu items (varies by router brand):
- **Netgear**: Advanced → Port Forwarding / Port Triggering
- **Linksys**: Applications & Gaming → Port Range Forwarding
- **TP-Link**: Advanced → NAT Forwarding → Virtual Servers
- **ASUS**: WAN → Virtual Server / Port Forwarding
- **D-Link**: Advanced → Port Forwarding
- **Belkin**: Virtual Servers
- **Generic**: Advanced → Port Forwarding / NAT

### Step 4: Add Port Forwarding Rule

Create a new rule with these settings:

| Setting | Value |
|---------|-------|
| **Service Name** | Radio Backend |
| **External Port** | `3000` |
| **Internal IP** | `192.168.1.182` |
| **Internal Port** | `3000` |
| **Protocol** | TCP (or Both) |
| **Enable** | Yes |

**Important**: 
- External Port = Port from internet
- Internal IP = Your backend server IP (`192.168.1.182`)
- Internal Port = Port your backend uses (`3000`)

### Step 5: Save and Test

1. **Save** the settings
2. **Wait 30 seconds** for router to apply changes
3. **Test** from outside your network:
   ```powershell
   # Use your phone's mobile data (not Wi-Fi) or ask a friend
   # Visit: http://criticmobile.duckdns.org:3000/health
   ```

Or run the test script:
```powershell
.\test-backend-access.ps1
```

## Router-Specific Instructions

### Netgear Routers

1. Go to: **Advanced** → **Port Forwarding / Port Triggering**
2. Click **Add Custom Service**
3. Fill in:
   - Service Name: `Radio Backend`
   - External Starting Port: `3000`
   - External Ending Port: `3000`
   - Internal IP Address: `192.168.1.182`
   - Internal Port: `3000`
   - Protocol: `TCP`
4. Click **Apply**

### Linksys Routers

1. Go to: **Applications & Gaming** → **Port Range Forwarding**
2. Click **Add a new Port Range Forwarding**
3. Fill in:
   - Application Name: `Radio Backend`
   - External Port: `3000` to `3000`
   - Internal Port: `3000` to `3000`
   - Protocol: `TCP`
   - Device IP: `192.168.1.182`
4. Click **Save**

### TP-Link Routers

1. Go to: **Advanced** → **NAT Forwarding** → **Virtual Servers**
2. Click **Add**
3. Fill in:
   - Service Name: `Radio Backend`
   - External Port: `3000`
   - Internal Port: `3000`
   - Internal IP: `192.168.1.182`
   - Protocol: `TCP`
4. Click **Save**

### ASUS Routers

1. Go to: **WAN** → **Virtual Server / Port Forwarding**
2. Click **Add Profile**
3. Fill in:
   - Service Name: `Radio Backend`
   - External Port: `3000`
   - Internal Port: `3000`
   - Internal IP: `192.168.1.182`
   - Protocol: `TCP`
4. Click **Apply**

## Troubleshooting

### Still Not Working?

1. **Check Windows Firewall**:
   ```powershell
   Get-NetFirewallRule -DisplayName "Radio Stream Server"
   ```
   If not found, run: `.\setup-backend-server.ps1` (as Admin)

2. **Check Backend is Running**:
   ```powershell
   curl http://localhost:3000/health
   ```

3. **Try Different Port**:
   - Some ISPs block port 3000
   - Try port `8080` or `443`
   - Update port forwarding rule
   - Update backend PORT environment variable
   - Update config.js

4. **Check Router Firewall**:
   - Some routers have built-in firewall
   - Disable temporarily to test
   - Re-enable after confirming it works

5. **ISP Blocks Incoming Connections**:
   - Some ISPs (especially mobile/cellular) block incoming connections
   - Solution: Use ngrok or Cloudflare Tunnel instead

6. **Test from Outside Network**:
   - Use phone mobile data (not Wi-Fi)
   - Visit: `http://criticmobile.duckdns.org:3000/health`
   - Should return: `{"status":"ok",...}`

## Alternative: Use ngrok (No Port Forwarding Needed)

If port forwarding doesn't work, use ngrok instead:

```powershell
# Install ngrok from https://ngrok.com/download
# Then:
cd C:\ngrok
.\ngrok.exe http 3000

# Copy the HTTPS URL and update config.js
```

See `SETUP_INTERNET_ACCESS.md` for ngrok setup.

## Verify Setup

After setting up port forwarding:

1. **Wait 30 seconds** for router to apply changes
2. **Run test script**:
   ```powershell
   .\test-backend-access.ps1
   ```
3. **Test from phone** (mobile data, not Wi-Fi):
   - Visit: `http://criticmobile.duckdns.org:3000/health`
   - Should work!

## Next Steps

Once port forwarding works:

1. ✅ Backend accessible via DuckDNS
2. ✅ Update config.js (already done)
3. ✅ Deploy to Firebase: `firebase deploy --only hosting`
4. ✅ Test your Firebase site!

---

**Need help?** Check your router's manual or support website for port forwarding instructions specific to your model.

