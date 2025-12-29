# Replace ngrok - Complete Guide

Since ngrok has bandwidth limits on the free tier, here are better alternatives that are **free and unlimited**.

## 🎯 Recommended: Cloudflare Tunnel (Best Replacement)

**Why Cloudflare Tunnel?**
- ✅ **Free** - No bandwidth limits
- ✅ **HTTPS included** - No SSL setup needed
- ✅ **No port forwarding** - Works behind any firewall/NAT
- ✅ **Permanent URL** - Stays the same (unlike ngrok)
- ✅ **More secure** - Better than ngrok for production

---

## Option 1: Cloudflare Tunnel (Recommended)

### Step 1: Install Cloudflare Tunnel

**Windows (PowerShell as Admin):**
```powershell
# Using winget (easiest)
winget install --id Cloudflare.cloudflared

# Or download manually:
# https://github.com/cloudflare/cloudflared/releases/latest
# Download: cloudflared-windows-amd64.exe
# Rename to: cloudflared.exe
# Add to PATH or place in project folder
```

**Verify installation:**
```powershell
cloudflared --version
```

### Step 2: Login to Cloudflare

```powershell
cloudflared tunnel login
```

This will:
1. Open your browser
2. Ask you to select a domain (you need a domain managed by Cloudflare)
3. Authorize the tunnel

**Don't have a domain?** See "Quick Start Without Domain" below.

### Step 3: Create Tunnel

```powershell
cloudflared tunnel create radio-backend
```

**Note the Tunnel ID** from the output (looks like: `a1b2c3d4-e5f6-7890-abcd-ef1234567890`)

### Step 4: Create Config File

Create config file at: `C:\Users\msi\.cloudflared\config.yml`

**If directory doesn't exist:**
```powershell
New-Item -ItemType Directory -Force -Path "$env:USERPROFILE\.cloudflared"
```

**Create/edit config.yml:**
```powershell
notepad "$env:USERPROFILE\.cloudflared\config.yml"
```

**Paste this (replace values):**
```yaml
tunnel: <TUNNEL-ID-FROM-STEP-3>
credentials-file: C:\Users\msi\.cloudflared\<TUNNEL-ID>.json

ingress:
  - hostname: radio-backend.yourdomain.com
    service: http://localhost:3000
  - service: http_status:404
```

**Replace:**
- `<TUNNEL-ID>` with your actual tunnel ID
- `radio-backend.yourdomain.com` with your subdomain

### Step 5: Create DNS Record

1. Go to Cloudflare Dashboard: https://dash.cloudflare.com
2. Select your domain
3. Go to **DNS** → **Records**
4. Click **Add record**
5. Fill in:
   - **Type**: `CNAME`
   - **Name**: `radio-backend` (or your subdomain)
   - **Target**: `<TUNNEL-ID>.cfargotunnel.com`
   - **Proxy status**: Proxied (orange cloud) ✅
6. Click **Save**

### Step 6: Run Tunnel

**Start your backend first:**
```powershell
npm start
```

**Then start tunnel (in new terminal):**
```powershell
cloudflared tunnel run radio-backend
```

You should see:
```
2024-01-01T12:00:00Z INF Starting metrics server
2024-01-01T12:00:00Z INF +--------------------------------------------------------------------------------------------+
2024-01-01T12:00:00Z INF |  Your quick Tunnel has been created! Visit it at (it may take some time to be reachable):  |
2024-01-01T12:00:00Z INF |  https://radio-backend.yourdomain.com                                                    |
2024-01-01T12:00:00Z INF +--------------------------------------------------------------------------------------------+
```

### Step 7: Update config.js

Edit `public/config.js`:
```javascript
// Replace ngrok URL with Cloudflare Tunnel URL
window.BACKEND_URL = window.BACKEND_URL || 'https://radio-backend.yourdomain.com';
```

### Step 8: Deploy to Firebase

```powershell
firebase deploy --only hosting
```

### Step 9: Run Tunnel as Windows Service (Optional - Auto-start)

To run tunnel automatically on Windows startup:

```powershell
# Install as service
cloudflared service install

# Start service
Start-Service cloudflared

# Check status
Get-Service cloudflared
```

**Note**: Service mode requires editing the config file to specify which tunnel to run.

---

## Quick Start Without Domain (Cloudflare Tunnel)

If you don't have a domain, Cloudflare Tunnel can give you a temporary URL:

```powershell
# Just run this (no domain needed):
cloudflared tunnel --url http://localhost:3000
```

This gives you a URL like: `https://random-words-1234.trycloudflare.com`

**Limitations:**
- URL changes each time
- Good for testing only
- For permanent solution, get a domain

---

## Option 2: Port Forwarding + DuckDNS (Free, Permanent)

If you can access your router, this is a free permanent solution.

### Step 1: Set Up Port Forwarding

See `PORT_FORWARDING_GUIDE.md` for detailed instructions.

**Quick steps:**
1. Access router admin (usually `192.168.1.1`)
2. Find Port Forwarding settings
3. Forward external port `3000` → internal IP `192.168.1.182:3000`
4. Save settings

### Step 2: Set Up DuckDNS

1. Sign up: https://www.duckdns.org (free)
2. Create domain: `yourname.duckdns.org`
3. Get your token

**Create updater script** (`update-duckdns.ps1`):
```powershell
$domain = "yourname"  # Your DuckDNS domain name
$token = "your-token-here"

$url = "https://www.duckdns.org/update?domains=$domain&token=$token&ip="
Invoke-WebRequest -Uri $url -UseBasicParsing | Out-Null
Write-Host "✅ DuckDNS updated: $domain.duckdns.org"
```

**Run manually or set up Task Scheduler** to run every 5 minutes.

### Step 3: Update config.js

```javascript
window.BACKEND_URL = window.BACKEND_URL || 'http://yourname.duckdns.org:3000';
```

**Note**: This uses HTTP. For HTTPS, you'll need SSL certificate or use Cloudflare Tunnel.

---

---

## Comparison Table

| Solution | Cost | Bandwidth | HTTPS | Setup Time | Best For |
|----------|------|-----------|-------|------------|----------|
| **Cloudflare Tunnel** ⭐ | Free | Unlimited | ✅ Yes | 10 min | Production |
| **Port Forwarding + DuckDNS** | Free | Unlimited | ❌ No* | 15 min | Permanent local |
| **ngrok** | Free tier | ❌ Limited | ✅ Yes | 2 min | Testing only |

*Can add HTTPS with Cloudflare proxy or SSL certificate

**Note:** Both options keep your server running locally - no cloud deployment needed!

---

## Migration Checklist

### From ngrok to Cloudflare Tunnel:

- [ ] Install `cloudflared`
- [ ] Login: `cloudflared tunnel login`
- [ ] Create tunnel: `cloudflared tunnel create radio-backend`
- [ ] Create config file: `C:\Users\msi\.cloudflared\config.yml`
- [ ] Create DNS CNAME record in Cloudflare
- [ ] Update `public/config.js` with new URL
- [ ] Stop ngrok
- [ ] Start Cloudflare Tunnel: `cloudflared tunnel run radio-backend`
- [ ] Start backend: `npm start`
- [ ] Deploy frontend: `firebase deploy --only hosting`
- [ ] Test: Visit Firebase URL and test streaming

---

## Troubleshooting

### Cloudflare Tunnel Issues

**Tunnel won't start:**
```powershell
# Check config file syntax
cloudflared tunnel validate

# Check tunnel exists
cloudflared tunnel list

# Run with verbose logging
cloudflared tunnel run radio-backend --loglevel debug
```

**DNS not working:**
- Verify CNAME record is correct
- Check proxy is enabled (orange cloud)
- Wait 5-10 minutes for DNS propagation

**Connection refused:**
- Make sure backend is running: `npm start`
- Check backend is on port 3000
- Verify config.yml has correct service URL

### Port Forwarding Issues

**Can't access router:**
- Check default gateway: `ipconfig`
- Try common IPs: `192.168.1.1`, `192.168.0.1`, `10.0.0.1`
- Check router label for admin URL

**Port forwarding not working:**
- Check Windows Firewall allows port 3000
- Verify internal IP is correct
- Some ISPs block incoming connections (use Cloudflare Tunnel instead)

---

## Quick Commands Reference

### Cloudflare Tunnel
```powershell
# Install
winget install --id Cloudflare.cloudflared

# Login
cloudflared tunnel login

# Create tunnel
cloudflared tunnel create radio-backend

# List tunnels
cloudflared tunnel list

# Run tunnel
cloudflared tunnel run radio-backend

# Install as service
cloudflared service install
```

### Port Forwarding + DuckDNS
```powershell
# Update DuckDNS
.\update-duckdns.ps1

# Test backend
curl http://yourname.duckdns.org:3000/health
```

---

## Recommendation

**For immediate replacement of ngrok:**
→ Use **Cloudflare Tunnel** (Option 1)

**Why:**
- Same ease as ngrok
- No bandwidth limits
- HTTPS included
- Permanent URL
- More secure
- **Keeps your server running locally** (no cloud deployment)

**Setup time:** ~10 minutes

**Alternative if you can't use Cloudflare:**
→ Use **Port Forwarding + DuckDNS** (Option 2)
- Free and unlimited
- Permanent URL
- Requires router access
- HTTP only (can add HTTPS with Cloudflare proxy)

---

## Need Help?

- Cloudflare Tunnel Docs: https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/
- DuckDNS Docs: https://www.duckdns.org
- Railway Docs: https://docs.railway.app
- Your project docs: See `SETUP_INTERNET_ACCESS.md`

