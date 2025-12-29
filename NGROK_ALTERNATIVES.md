# ngrok Alternatives - Quick Reference

Since ngrok free tier has bandwidth limits, here are **free unlimited alternatives**.

## 🚀 Quick Start (Recommended)

### Cloudflare Tunnel (Best Replacement)

**Why:** Free, unlimited bandwidth, HTTPS included, permanent URL

**Setup (5 minutes):**
```powershell
# 1. Install
winget install --id Cloudflare.cloudflared

# 2. Run setup script
.\setup-cloudflare-tunnel.ps1

# 3. Start backend
npm start

# 4. Start tunnel (in new terminal)
.\start-cloudflare-tunnel.ps1

# 5. Deploy frontend
firebase deploy --only hosting
```

**See full guide:** `REPLACE_NGROK_GUIDE.md`

---

## All Options Comparison

| Solution | Setup Time | Cost | Bandwidth | HTTPS | Permanent URL | Local Server |
|----------|------------|------|-----------|-------|----------------|--------------|
| **Cloudflare Tunnel** ⭐ | 10 min | Free | ✅ Unlimited | ✅ Yes | ✅ Yes | ✅ Yes |
| **Port Forwarding + DuckDNS** | 15 min | Free | ✅ Unlimited | ❌ No* | ✅ Yes | ✅ Yes |
| **ngrok** | 2 min | Free tier | ❌ Limited | ✅ Yes | ❌ No | ✅ Yes |

*Can add HTTPS with Cloudflare proxy

**Both options keep your server running locally - no cloud deployment needed!**

---

## Option 1: Cloudflare Tunnel ⭐ RECOMMENDED

**Best for:** Production, unlimited bandwidth, HTTPS

**Pros:**
- ✅ Free
- ✅ Unlimited bandwidth
- ✅ HTTPS included
- ✅ Permanent URL
- ✅ No port forwarding needed
- ✅ More secure than ngrok

**Cons:**
- Requires Cloudflare account (free)
- Requires domain (can use free subdomain)

**Quick Setup:**
```powershell
.\setup-cloudflare-tunnel.ps1
```

**Full Guide:** `REPLACE_NGROK_GUIDE.md`

---

## Option 2: Port Forwarding + DuckDNS

**Best for:** Free permanent solution, local server

**Pros:**
- ✅ Free
- ✅ Unlimited bandwidth
- ✅ Permanent URL
- ✅ No cloud dependency

**Cons:**
- ❌ HTTP only (no HTTPS)
- Requires router access
- Requires port forwarding setup

**Quick Setup:**
1. Set up port forwarding in router (see `PORT_FORWARDING_GUIDE.md`)
2. Sign up at DuckDNS: https://www.duckdns.org
3. Update `config.js` with DuckDNS domain
4. Deploy: `firebase deploy --only hosting`

**Note:** For HTTPS, use Cloudflare Tunnel instead.

---

## Migration from ngrok

### Step-by-Step Migration to Cloudflare Tunnel:

1. **Stop ngrok**
   ```powershell
   # Close ngrok terminal window
   ```

2. **Install Cloudflare Tunnel**
   ```powershell
   winget install --id Cloudflare.cloudflared
   ```

3. **Run setup**
   ```powershell
   .\setup-cloudflare-tunnel.ps1
   ```

4. **Start backend**
   ```powershell
   npm start
   ```

5. **Start tunnel** (in new terminal)
   ```powershell
   .\start-cloudflare-tunnel.ps1
   ```

6. **Update config.js** (auto-updated by setup script)
   ```javascript
   window.BACKEND_URL = 'https://your-subdomain.yourdomain.com';
   ```

7. **Deploy frontend**
   ```powershell
   firebase deploy --only hosting
   ```

8. **Test**
   - Visit your Firebase URL
   - Test streaming/search functionality

---

## Troubleshooting

### Cloudflare Tunnel

**"Tunnel not found"**
```powershell
cloudflared tunnel list
# Check tunnel name matches
```

**"DNS not working"**
- Verify CNAME record in Cloudflare dashboard
- Check proxy is enabled (orange cloud)
- Wait 5-10 minutes for DNS propagation

**"Connection refused"**
- Make sure backend is running: `npm start`
- Check backend is on port 3000
- Verify config.yml has correct service URL

### Port Forwarding

**"Can't access from internet"**
- Check Windows Firewall allows port 3000
- Verify router port forwarding is enabled
- Some ISPs block incoming connections (use Cloudflare Tunnel)

---

## Quick Commands

### Cloudflare Tunnel
```powershell
# Setup
.\setup-cloudflare-tunnel.ps1

# Start tunnel
.\start-cloudflare-tunnel.ps1

# List tunnels
cloudflared tunnel list

# Validate config
cloudflared tunnel validate
```

### Port Forwarding + DuckDNS
```powershell
# Update DuckDNS IP
.\update-duckdns.ps1

# Test backend
curl http://yourname.duckdns.org:3000/health
```

---

## Recommendation

**For immediate replacement:**
→ **Cloudflare Tunnel**

**Why:**
- Same ease as ngrok
- No bandwidth limits
- HTTPS included
- Permanent URL
- More secure

**Setup time:** ~10 minutes

**See:** `REPLACE_NGROK_GUIDE.md` for detailed instructions

---

## Need Help?

- **Cloudflare Tunnel:** `REPLACE_NGROK_GUIDE.md`
- **Port Forwarding:** `PORT_FORWARDING_GUIDE.md`
- **General Setup:** `SETUP_INTERNET_ACCESS.md`

**Both options keep your server running locally - perfect for keeping full control!**

