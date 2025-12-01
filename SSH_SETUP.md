# Setting Up SSH Access for Remote Development

This guide helps you connect to this project from another device using Cursor's SSH remote development feature.

## Option 1: Using Cursor's Remote SSH (Recommended)

### On Your Current Device (Host)

1. **Enable SSH on Windows:**

   Open PowerShell as Administrator and run:
   ```powershell
   # Install OpenSSH Server (if not already installed)
   Add-WindowsCapability -Online -Name OpenSSH.Server~~~~0.0.1.0

   # Start SSH service
   Start-Service sshd

   # Set SSH service to start automatically
   Set-Service -Name sshd -StartupType 'Automatic'

   # Allow SSH through firewall
   New-NetFirewallRule -Name sshd -DisplayName 'OpenSSH Server (sshd)' -Enabled True -Direction Inbound -Protocol TCP -Action Allow -LocalPort 22
   ```

2. **Find Your IP Address:**
   ```powershell
   ipconfig
   ```
   Note your IPv4 address (e.g., 192.168.1.100)

3. **Set Up SSH Key Authentication (Recommended):**

   Generate SSH key on your other device, then add it to authorized_keys on this device.

### On Your Other Device (Client)

1. **Install Cursor** (if not already installed)

2. **Connect via SSH:**
   - Open Cursor
   - Press `F1` or `Ctrl+Shift+P`
   - Type: "Remote-SSH: Connect to Host"
   - Enter: `username@YOUR_IP`
     - Example: `msi@192.168.1.100`
   - Enter your Windows password when prompted

3. **Open Project Folder:**
   - After connecting, click "Open Folder"
   - Navigate to: `C:\Users\msi\Documents\radio`

## Option 2: Using Git + Cloud Storage

### Sync Project via GitHub

1. **Push to GitHub:**
   ```powershell
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/YOUR_USERNAME/radio.git
   git push -u origin main
   ```

2. **On Other Device:**
   ```bash
   git clone https://github.com/YOUR_USERNAME/radio.git
   cd radio
   npm install
   ```

3. **Open in Cursor:**
   - Open Cursor on other device
   - File → Open Folder → Select the `radio` folder

## Option 3: Using VS Code Remote (Same as Cursor)

Cursor uses the same remote SSH extension as VS Code.

### Setup Steps:

1. **On Host Device (Windows):**
   - Enable OpenSSH Server (see Option 1)
   - Note your IP address

2. **On Client Device:**
   - Install "Remote - SSH" extension (if needed)
   - Connect using: `ssh username@IP_ADDRESS`
   - Open the project folder

## Option 4: Using Cloud Sync (OneDrive/Dropbox)

1. **Move project to synced folder:**
   ```powershell
   # Move to OneDrive
   Move-Item -Path "C:\Users\msi\Documents\radio" -Destination "C:\Users\msi\OneDrive\radio"
   ```

2. **On other device:**
   - Wait for OneDrive to sync
   - Open synced folder in Cursor

## Quick SSH Setup Script

Run this on your Windows machine (as Administrator):

```powershell
# Enable SSH Server
Add-WindowsCapability -Online -Name OpenSSH.Server~~~~0.0.1.0
Start-Service sshd
Set-Service -Name sshd -StartupType 'Automatic'

# Allow through firewall
New-NetFirewallRule -Name sshd -DisplayName 'OpenSSH Server (sshd)' -Enabled True -Direction Inbound -Protocol TCP -Action Allow -LocalPort 22

# Get IP address
Write-Host "`nYour IP address:" -ForegroundColor Green
ipconfig | Select-String "IPv4"

Write-Host "`nConnect from other device using:" -ForegroundColor Cyan
Write-Host "ssh $env:USERNAME@YOUR_IP" -ForegroundColor Yellow
```

## Troubleshooting

### Can't Connect via SSH?

1. **Check SSH Service:**
   ```powershell
   Get-Service sshd
   ```
   Should show "Running"

2. **Check Firewall:**
   ```powershell
   Get-NetFirewallRule -Name sshd
   ```

3. **Test Connection:**
   ```powershell
   ssh localhost
   ```

### Permission Denied?

- Make sure you're using the correct Windows username
- Try: `ssh username@IP` where username is your Windows username

### Connection Timeout?

- Both devices must be on the same network (for local)
- Or set up port forwarding if remote
- Check Windows Firewall allows port 22

## Recommended Approach

**For local network:** Use Option 1 (SSH) - fastest, most reliable
**For cloud sync:** Use Option 2 (GitHub) - works anywhere, version control bonus

