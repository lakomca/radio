# Deploying to Raspberry Pi

This guide will help you move your radio project from Railway to a Raspberry Pi.

## Prerequisites

- Raspberry Pi with Raspberry Pi OS (or any Linux distribution)
- SSH access to your Raspberry Pi
- Internet connection

## Step 1: Install Node.js

Raspberry Pi OS usually comes with Node.js, but you may need to install or update it:

```bash
# Update system packages
sudo apt update
sudo apt upgrade -y

# Install Node.js (v18 or higher recommended)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Verify installation
node --version
npm --version
```

**Alternative:** If the above doesn't work, try:
```bash
sudo apt install nodejs npm
```

## Step 2: Install FFmpeg

```bash
# Install FFmpeg
sudo apt install -y ffmpeg

# Verify installation
ffmpeg -version
```

## Step 3: Install yt-dlp

```bash
# Download yt-dlp
sudo curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp

# Make it executable
sudo chmod a+rx /usr/local/bin/yt-dlp

# Verify installation
yt-dlp --version
```

**Alternative:** Using pip (if Python is installed):
```bash
sudo pip3 install yt-dlp
```

## Step 4: Clone Your Project

```bash
# Navigate to a suitable directory
cd ~
# or
cd /var/www

# Clone your repository
git clone https://github.com/lakomca/radio.git
cd radio

# Install Node.js dependencies
npm install --production
```

## Step 5: Configure the Application

Your app uses `PORT` environment variable. You can either:

**Option A: Use default port 3000**
```bash
# Just run it
npm start
```

**Option B: Set a custom port**
```bash
PORT=3000 npm start
```

**Option C: Create a .env file** (if you add dotenv package):
```bash
echo "PORT=3000" > .env
npm start
```

## Step 6: Make it Run on Startup (Optional)

### Using systemd (Recommended)

Create a service file:
```bash
sudo nano /etc/systemd/system/radio.service
```

Add this content:
```ini
[Unit]
Description=Radio Stream Server
After=network.target

[Service]
Type=simple
User=pi
WorkingDirectory=/home/pi/radio
Environment="PORT=3000"
ExecStart=/usr/bin/node server.js
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

**Update paths** if your project is in a different location!

Then enable and start:
```bash
# Reload systemd
sudo systemctl daemon-reload

# Enable service to start on boot
sudo systemctl enable radio.service

# Start the service
sudo systemctl start radio.service

# Check status
sudo systemctl status radio.service

# View logs
sudo journalctl -u radio.service -f
```

### Using PM2 (Alternative)

```bash
# Install PM2 globally
sudo npm install -g pm2

# Start your app
pm2 start server.js --name radio

# Make it start on boot
pm2 startup
pm2 save

# Check status
pm2 status
pm2 logs radio
```

## Step 7: Configure Firewall (If needed)

If you want to access your radio from other devices on your network:

```bash
# Allow port 3000 (or your chosen port)
sudo ufw allow 3000/tcp

# Enable firewall (if not already enabled)
sudo ufw enable
```

## Step 8: Access Your Application

- **Locally on Pi**: `http://localhost:3000`
- **From network**: `http://raspberry-pi-ip:3000`
  - Find IP: `hostname -I` or `ip addr`

## Verification Checklist

Run these commands to verify everything is installed:

```bash
# Check Node.js
node --version

# Check npm
npm --version

# Check FFmpeg
ffmpeg -version

# Check yt-dlp
yt-dlp --version

# Test your app's setup checker
npm run check
```

## Troubleshooting

### Port already in use
```bash
# Find what's using port 3000
sudo lsof -i :3000
# or
sudo netstat -tulpn | grep 3000

# Kill the process if needed
sudo kill -9 <PID>
```

### Permission denied errors
```bash
# Make sure your user has permission
sudo chown -R $USER:$USER ~/radio
```

### Can't access from network
- Check firewall settings
- Make sure Raspberry Pi and client are on same network
- Try accessing via IP instead of hostname

### Service won't start
```bash
# Check logs
sudo journalctl -u radio.service -n 50

# Make sure paths in service file are correct
sudo systemctl cat radio.service
```

## Performance Tips

1. **Use a newer Raspberry Pi** (Pi 4 or Pi 5 recommended for better performance)
2. **Add swap space** if running low on RAM:
   ```bash
   sudo dphys-swapfile swapoff
   sudo nano /etc/dphys-swapfile
   # Change CONF_SWAPSIZE=100 to CONF_SWAPSIZE=1024
   sudo dphys-swapfile setup
   sudo dphys-swapfile swapon
   ```
3. **Use an SSD** instead of SD card for better I/O performance
4. **Monitor resources**: `htop` or `top`

## Next Steps

1. Set up port forwarding on your router if you want external access
2. Consider using a reverse proxy (nginx) if you want HTTPS
3. Set up automatic updates for security

## Summary

To move from Railway to Raspberry Pi, you need:
- ✅ Node.js installed
- ✅ FFmpeg installed
- ✅ yt-dlp installed
- ✅ Project cloned from GitHub
- ✅ npm dependencies installed (`npm install`)
- ✅ Server running (`npm start` or systemd service)
- ✅ Firewall configured (if accessing from network)

Your app will work the same way - just running on your Raspberry Pi instead of Railway!



