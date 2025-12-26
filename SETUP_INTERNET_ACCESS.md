# Setup Internet Access for Backend Server

This guide shows you how to make your backend server accessible from the internet so users worldwide can access it from Firebase Hosting.

## Quick Comparison

| Method | Setup Time | Cost | Best For |
|--------|-----------|------|----------|
| **ngrok** | 2 minutes | Free (with limits) | Testing, quick demos |
| **Port Forwarding + DuckDNS** | 15 minutes | Free | Permanent solution |
| **Cloudflare Tunnel** | 10 minutes | Free | Production (most secure) |

---

## Option 1: ngrok (Quickest - For Testing)

**Best for**: Quick testing, demos, temporary access

### Step 1: Download ngrok

1. Go to: https://ngrok.com/download
2. Download for Windows
3. Extract `ngrok.exe` to a folder (e.g., `C:\ngrok\`)

### Step 2: Sign up (Free)

1. Go to: https://dashboard.ngrok.com/signup
2. Sign up with email (free account)
3. Get your authtoken from the dashboard

### Step 3: Configure ngrok

```powershell
# Navigate to ngrok folder
cd C:\ngrok

# Set your authtoken (get from ngrok dashboard)
.\ngrok.exe config add-authtoken YOUR_AUTHTOKEN
```

### Step 4: Start Backend Server

In your project directory:
```powershell
npm start
```

### Step 5: Start ngrok Tunnel

Open a **new PowerShell window**:
```powershell
cd C:\ngrok
.\ngrok.exe http 3000
```

You'll see output like:
```
Forwarding  https://abc123.ngrok.io -> http://localhost:3000
```

**Copy the HTTPS URL** (e.g., `https://abc123.ngrok.io`)

### Step 6: Update config.js

Edit `public/config.js` and update the backend URL:

```javascript
// Replace this line:
window.BACKEND_URL = window.BACKEND_URL || 'http://192.168.1.182:3000';

// With your ngrok URL:
window.BACKEND_URL = window.BACKEND_URL || 'https://abc123.ngrok.io';
```

### Step 7: Deploy to Firebase

```powershell
firebase deploy --only hosting
```

### Step 8: Test

Visit your Firebase URL and test - it should work from anywhere!

### ⚠️ Important Notes for ngrok

- **URL changes**: Each time you restart ngrok, you get a new URL
- **Free tier limits**: 
  - 40 connections/minute
  - 1 tunnel at a time
- **Keep ngrok running**: You must keep the ngrok window open while backend is running

### ngrok Auto-Start Script

Create `start-ngrok.ps1`:
```powershell
# Start backend and ngrok together
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD'; npm start"
Start-Sleep -Seconds 3
cd C:\ngrok
.\ngrok.exe http 3000
```

---

## Option 2: Port Forwarding + DuckDNS (Permanent Solution)

**Best for**: Permanent, free internet access

### Part A: Set Up Port Forwarding

#### Step 1: Find Your Router IP

```powershell
ipconfig
```

Look for "Default Gateway" (usually `192.168.1.1` or `192.168.0.1`)

#### Step 2: Access Router Admin

1. Open browser and go to: `http://192.168.1.1` (or your gateway IP)
2. Login (check router label for default username/password)
3. Common defaults:
   - Username: `admin`, Password: `admin`
   - Username: `admin`, Password: `password`
   - Username: `admin`, Password: (blank)

#### Step 3: Find Port Forwarding Settings

Look for:
- "Port Forwarding"
- "Virtual Server"
- "NAT Forwarding"
- "Applications & Gaming" (Linksys)
- "Advanced" → "Port Forwarding"

#### Step 4: Add Port Forwarding Rule

Create a new rule:
- **Service Name**: Radio Backend
- **External Port**: `3000` (or any port you prefer, e.g., `8080`)
- **Internal IP**: `192.168.1.182` (your backend server IP)
- **Internal Port**: `3000`
- **Protocol**: TCP (or Both)
- **Enable**: Yes

Save the settings.

#### Step 5: Find Your Public IP

```powershell
curl ifconfig.me
```

Or visit: https://whatismyipaddress.com

**Note**: Your public IP may change if your ISP uses dynamic IPs. That's why we need DuckDNS next.

### Part B: Set Up DuckDNS (Dynamic DNS)

#### Step 1: Sign Up for DuckDNS

1. Go to: https://www.duckdns.org
2. Sign in with Google/GitHub/Twitter (free)
3. Create a domain (e.g., `myradio.duckdns.org`)

#### Step 2: Install DuckDNS Updater (Windows)

**Option A: Using DuckDNS Windows Client**

1. Download: https://www.duckdns.org/install.jsp
2. Extract and run `DuckDNS.exe`
3. Enter your domain and token
4. Click "Start" - it will update your IP automatically

**Option B: Using PowerShell Script (Recommended)**

Create `update-duckdns.ps1`:
```powershell
# Update DuckDNS IP
$domain = "yourdomain"  # Your DuckDNS domain (without .duckdns.org)
$token = "your-token"    # Your DuckDNS token

$url = "https://www.duckdns.org/update?domains=$domain&token=$token&ip="
Invoke-WebRequest -Uri $url -UseBasicParsing | Out-Null
Write-Host "DuckDNS updated: $domain.duckdns.org"
```

Run it periodically (or set up Task Scheduler to run every 5 minutes).

**Option C: Using Task Scheduler (Automatic)**

1. Open Task Scheduler
2. Create Basic Task
3. Name: "Update DuckDNS"
4. Trigger: "Daily" → Set to repeat every 5 minutes
5. Action: "Start a program"
6. Program: `powershell.exe`
7. Arguments: `-ExecutionPolicy Bypass -File "C:\Users\msi\Downloads\radio\update-duckdns.ps1"`

### Step 3: Update config.js

Edit `public/config.js`:

```javascript
// Replace with your DuckDNS domain:
window.BACKEND_URL = window.BACKEND_URL || 'http://yourdomain.duckdns.org:3000';
```

Or if you're using a different external port:
```javascript
window.BACKEND_URL = window.BACKEND_URL || 'http://yourdomain.duckdns.org:8080';
```

### Step 4: Test Port Forwarding

From outside your network (or use your phone's mobile data):
```powershell
curl http://yourdomain.duckdns.org:3000/health
```

Should return: `{"status":"ok",...}`

### Step 5: Deploy to Firebase

```powershell
firebase deploy --only hosting
```

---

## Option 3: Cloudflare Tunnel (Most Secure - Recommended)

**Best for**: Production, most secure, no port forwarding needed

### Step 1: Install Cloudflare Tunnel

Download: https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/installation/

Or use winget:
```powershell
winget install --id Cloudflare.cloudflared
```

### Step 2: Login to Cloudflare

```powershell
cloudflared tunnel login
```

This opens a browser - select your domain.

### Step 3: Create Tunnel

```powershell
cloudflared tunnel create radio-backend
```

Note the tunnel ID from the output.

### Step 4: Create Config File

Create `C:\Users\msi\.cloudflared\config.yml`:

```yaml
tunnel: <tunnel-id-from-step-3>
credentials-file: C:\Users\msi\.cloudflared\<tunnel-id>.json

ingress:
  - hostname: radio-backend.yourdomain.com
    service: http://localhost:3000
  - service: http_status:404
```

Replace:
- `<tunnel-id>` with your actual tunnel ID
- `radio-backend.yourdomain.com` with your subdomain

### Step 5: Create DNS Record

In Cloudflare dashboard:
1. Go to your domain → DNS
2. Add CNAME record:
   - Name: `radio-backend` (or your subdomain)
   - Target: `<tunnel-id>.cfargotunnel.com`
   - Proxy: Enabled (orange cloud)

### Step 6: Run Tunnel

```powershell
cloudflared tunnel run radio-backend
```

### Step 7: Update config.js

```javascript
window.BACKEND_URL = window.BACKEND_URL || 'https://radio-backend.yourdomain.com';
```

### Step 8: Deploy to Firebase

```powershell
firebase deploy --only hosting
```

### Step 9: Run Tunnel as Service (Optional)

To run tunnel automatically:
```powershell
cloudflared service install
```

---

## Testing Your Setup

### Test Backend Accessibility

1. **From your network**:
   ```powershell
   curl http://localhost:3000/health
   ```

2. **From internet** (use phone mobile data or ask friend):
   ```powershell
   curl http://your-backend-url/health
   ```

### Test Firebase Site

1. Deploy: `firebase deploy --only hosting`
2. Visit your Firebase URL
3. Open browser console (F12)
4. Check for: "Backend URL configured: [your-url]"
5. Test streaming/search functionality

---

## Troubleshooting

### Port Forwarding Not Working

1. **Check router settings**: Make sure rule is enabled
2. **Check firewall**: Windows Firewall must allow port 3000
3. **Check ISP**: Some ISPs block incoming connections
4. **Try different port**: Use 8080 or 443 instead of 3000
5. **Check public IP**: Verify it matches DuckDNS

### ngrok Connection Limits

Free tier has limits. If you hit them:
- Wait a few minutes
- Upgrade to paid plan
- Use port forwarding instead

### Cloudflare Tunnel Issues

1. **Check tunnel is running**: `cloudflared tunnel list`
2. **Check DNS**: Verify CNAME record is correct
3. **Check config**: Verify config.yml syntax
4. **Check logs**: Look for errors in tunnel output

### Backend Not Responding

1. **Check backend is running**: `curl http://localhost:3000/health`
2. **Check firewall**: Allow port 3000
3. **Check backend logs**: Look for errors
4. **Test locally first**: Make sure backend works on localhost

---

## Quick Reference

### ngrok
```powershell
# Start backend
npm start

# Start ngrok (in new terminal)
cd C:\ngrok
.\ngrok.exe http 3000

# Update config.js with ngrok URL
# Deploy: firebase deploy --only hosting
```

### Port Forwarding + DuckDNS
```powershell
# 1. Set up port forwarding in router
# 2. Set up DuckDNS updater
# 3. Update config.js with DuckDNS domain
# 4. Deploy: firebase deploy --only hosting
```

### Cloudflare Tunnel
```powershell
# 1. Install cloudflared
# 2. cloudflared tunnel login
# 3. cloudflared tunnel create radio-backend
# 4. Configure DNS and config.yml
# 5. cloudflared tunnel run radio-backend
# 6. Update config.js
# 7. Deploy: firebase deploy --only hosting
```

---

## Recommendation

- **For testing**: Use **ngrok** (fastest setup)
- **For production**: Use **Cloudflare Tunnel** (most secure, no port forwarding)
- **For simple setup**: Use **Port Forwarding + DuckDNS** (free, permanent)

Choose the method that best fits your needs!

