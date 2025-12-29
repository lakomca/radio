# Local Server Alternatives to ngrok

Since ngrok has bandwidth limits and you want to keep your server running locally, here are **free unlimited alternatives**.

## 🎯 Two Best Options

Both options keep your server running on your local machine - no cloud deployment needed!

---

## Option 1: Cloudflare Tunnel ⭐ RECOMMENDED

**Best for:** Production, unlimited bandwidth, HTTPS, no port forwarding

### Why Cloudflare Tunnel?

- ✅ **Free** - No bandwidth limits
- ✅ **HTTPS included** - No SSL setup needed
- ✅ **No port forwarding** - Works behind any firewall/NAT
- ✅ **Permanent URL** - Stays the same (unlike ngrok)
- ✅ **More secure** - Better than ngrok
- ✅ **Local server** - Keeps your server running on your machine

### Quick Setup (10 minutes)

```powershell
# 1. Run automated setup script
.\setup-cloudflare-tunnel.ps1

# 2. Start your backend (as usual)
npm start

# 3. Start tunnel (in new terminal)
.\start-cloudflare-tunnel.ps1

# 4. Deploy frontend
firebase deploy --only hosting
```

**Full Guide:** See `REPLACE_NGROK_GUIDE.md` for detailed step-by-step instructions.

### Requirements

- Cloudflare account (free)
- Domain managed by Cloudflare (free subdomain works)
- Or use temporary URL (changes each time)

---

## Option 2: Port Forwarding + DuckDNS

**Best for:** Free permanent solution, local server, simple setup

### Why Port Forwarding + DuckDNS?

- ✅ **Free** - No bandwidth limits
- ✅ **Permanent URL** - Stays the same
- ✅ **Local server** - Keeps your server running on your machine
- ✅ **Simple** - Just forward one port

### Limitations

- ❌ **HTTP only** (no HTTPS by default)
- Requires router access
- Requires port forwarding setup

### Quick Setup (15 minutes)

**Step 1: Set Up Port Forwarding**

1. Access router admin (usually `192.168.1.1`)
2. Find Port Forwarding settings
3. Forward external port `3000` → internal IP `192.168.1.182:3000`
4. Save settings

**See:** `PORT_FORWARDING_GUIDE.md` for detailed router instructions.

**Step 2: Set Up DuckDNS**

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

**Step 3: Update config.js**

```javascript
window.BACKEND_URL = window.BACKEND_URL || 'http://yourname.duckdns.org:3000';
```

**Step 4: Deploy**

```powershell
firebase deploy --only hosting
```

### Adding HTTPS to DuckDNS

If you need HTTPS with DuckDNS:

**Option A: Use Cloudflare Proxy (Free)**
1. Point DuckDNS to Cloudflare nameservers
2. Enable Cloudflare proxy (orange cloud)
3. Cloudflare provides free HTTPS

**Option B: Use Cloudflare Tunnel Instead**
- Easier setup
- HTTPS included
- No port forwarding needed

---

## Comparison

| Feature | Cloudflare Tunnel | Port Forwarding + DuckDNS |
|---------|-------------------|--------------------------|
| **Cost** | Free | Free |
| **Bandwidth** | Unlimited | Unlimited |
| **HTTPS** | ✅ Yes | ❌ No* |
| **Port Forwarding** | ❌ Not needed | ✅ Required |
| **Router Access** | ❌ Not needed | ✅ Required |
| **Setup Time** | 10 min | 15 min |
| **Permanent URL** | ✅ Yes | ✅ Yes |
| **Local Server** | ✅ Yes | ✅ Yes |

*Can add HTTPS with Cloudflare proxy

---

## Recommendation

**For immediate replacement of ngrok:**
→ **Cloudflare Tunnel**

**Why:**
- Same ease as ngrok
- No bandwidth limits
- HTTPS included
- Permanent URL
- No port forwarding needed
- Keeps server local

**If you can't use Cloudflare:**
→ **Port Forwarding + DuckDNS**

**Why:**
- Free and unlimited
- Permanent URL
- Keeps server local
- Simple setup

---

## Migration Checklist

### From ngrok to Cloudflare Tunnel:

- [ ] Run: `.\setup-cloudflare-tunnel.ps1`
- [ ] Follow setup prompts
- [ ] Create DNS CNAME record in Cloudflare
- [ ] Update `config.js` (auto-updated by script)
- [ ] Stop ngrok
- [ ] Start backend: `npm start`
- [ ] Start tunnel: `.\start-cloudflare-tunnel.ps1`
- [ ] Deploy frontend: `firebase deploy --only hosting`
- [ ] Test: Visit Firebase URL and test streaming

### From ngrok to Port Forwarding + DuckDNS:

- [ ] Set up port forwarding in router
- [ ] Sign up at DuckDNS
- [ ] Create domain: `yourname.duckdns.org`
- [ ] Create `update-duckdns.ps1` script
- [ ] Update `config.js` with DuckDNS domain
- [ ] Stop ngrok
- [ ] Start backend: `npm start`
- [ ] Deploy frontend: `firebase deploy --only hosting`
- [ ] Test: Visit Firebase URL and test streaming

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
- Some ISPs block incoming connections (use Cloudflare Tunnel instead)

**"DuckDNS not updating"**
- Check token is correct
- Run updater script manually
- Set up Task Scheduler to run every 5 minutes

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

## Need More Help?

- **Cloudflare Tunnel:** `REPLACE_NGROK_GUIDE.md`
- **Port Forwarding:** `PORT_FORWARDING_GUIDE.md`
- **General Setup:** `SETUP_INTERNET_ACCESS.md`

Both options keep your server running locally - perfect for keeping full control!


