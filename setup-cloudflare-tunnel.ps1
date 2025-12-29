# Cloudflare Tunnel Setup Script
# This script helps you set up Cloudflare Tunnel to replace ngrok

Write-Host "`n🔷 Cloudflare Tunnel Setup`n" -ForegroundColor Cyan

# Check if cloudflared is installed
Write-Host "Checking for cloudflared..." -ForegroundColor Yellow
$cloudflaredPath = Get-Command cloudflared -ErrorAction SilentlyContinue

if (-not $cloudflaredPath) {
    Write-Host "❌ cloudflared not found!" -ForegroundColor Red
    Write-Host "`nInstalling cloudflared..." -ForegroundColor Yellow
    
    # Try winget first
    try {
        winget install --id Cloudflare.cloudflared --accept-package-agreements --accept-source-agreements
        Write-Host "✅ Installed via winget" -ForegroundColor Green
    } catch {
        Write-Host "⚠️ winget failed, please install manually:" -ForegroundColor Yellow
        Write-Host "   1. Download: https://github.com/cloudflare/cloudflared/releases/latest" -ForegroundColor White
        Write-Host "   2. Extract cloudflared.exe to a folder in PATH" -ForegroundColor White
        Write-Host "   3. Or place in this directory" -ForegroundColor White
        Write-Host "`nPress any key after installing..." -ForegroundColor Yellow
        $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
    }
}

# Verify installation
$cloudflaredPath = Get-Command cloudflared -ErrorAction SilentlyContinue
if (-not $cloudflaredPath) {
    Write-Host "❌ cloudflared still not found. Please install manually and run this script again." -ForegroundColor Red
    exit 1
}

Write-Host "✅ cloudflared found: $($cloudflaredPath.Source)" -ForegroundColor Green
Write-Host "   Version: $(cloudflared --version)" -ForegroundColor Gray

# Check if already logged in
Write-Host "`nChecking Cloudflare login status..." -ForegroundColor Yellow
$configDir = "$env:USERPROFILE\.cloudflared"
$certFile = Get-ChildItem "$configDir\*.pem" -ErrorAction SilentlyContinue

if ($certFile) {
    Write-Host "✅ Already logged in to Cloudflare" -ForegroundColor Green
    $skipLogin = Read-Host "Skip login? (y/n)"
    if ($skipLogin -ne 'y') {
        Write-Host "`nLogging in to Cloudflare..." -ForegroundColor Yellow
        Write-Host "   This will open your browser..." -ForegroundColor Gray
        cloudflared tunnel login
    }
} else {
    Write-Host "`nLogging in to Cloudflare..." -ForegroundColor Yellow
    Write-Host "   This will open your browser. Select your domain." -ForegroundColor Gray
    cloudflared tunnel login
}

# Check if tunnel exists
Write-Host "`nChecking for existing tunnels..." -ForegroundColor Yellow
$tunnels = cloudflared tunnel list 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host $tunnels
    $useExisting = Read-Host "`nUse existing tunnel? (y/n)"
    
    if ($useExisting -eq 'y') {
        $tunnelName = Read-Host "Enter tunnel name"
    } else {
        $tunnelName = Read-Host "Enter new tunnel name (e.g., radio-backend)"
        Write-Host "`nCreating tunnel: $tunnelName..." -ForegroundColor Yellow
        $createOutput = cloudflared tunnel create $tunnelName 2>&1
        Write-Host $createOutput
        
        # Extract tunnel ID from output
        $tunnelIdMatch = $createOutput | Select-String -Pattern 'Created tunnel\s+(\S+)'
        if ($tunnelIdMatch) {
            $tunnelId = $tunnelIdMatch.Matches[0].Groups[1].Value
            Write-Host "✅ Tunnel ID: $tunnelId" -ForegroundColor Green
        }
    }
} else {
    $tunnelName = Read-Host "Enter tunnel name (e.g., radio-backend)"
    Write-Host "`nCreating tunnel: $tunnelName..." -ForegroundColor Yellow
    $createOutput = cloudflared tunnel create $tunnelName 2>&1
    Write-Host $createOutput
}

# Get tunnel ID
Write-Host "`nGetting tunnel information..." -ForegroundColor Yellow
$tunnelInfo = cloudflared tunnel info $tunnelName 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Could not get tunnel info. Please check tunnel name." -ForegroundColor Red
    exit 1
}

# Extract tunnel ID
$tunnelIdMatch = $tunnelInfo | Select-String -Pattern 'ID:\s+(\S+)'
if (-not $tunnelIdMatch) {
    Write-Host "⚠️ Could not extract tunnel ID. Please check manually:" -ForegroundColor Yellow
    Write-Host $tunnelInfo
    $tunnelId = Read-Host "Enter tunnel ID manually"
} else {
    $tunnelId = $tunnelIdMatch.Matches[0].Groups[1].Value
    Write-Host "✅ Tunnel ID: $tunnelId" -ForegroundColor Green
}

# Get domain
Write-Host "`nDomain Configuration:" -ForegroundColor Yellow
$domain = Read-Host "Enter your Cloudflare domain (e.g., yourdomain.com)"
$subdomain = Read-Host "Enter subdomain (e.g., radio-backend) or press Enter for 'radio-backend'"
if ([string]::IsNullOrWhiteSpace($subdomain)) {
    $subdomain = "radio-backend"
}

$hostname = "$subdomain.$domain"
Write-Host "   Hostname: $hostname" -ForegroundColor Gray

# Create config directory
Write-Host "`nCreating config directory..." -ForegroundColor Yellow
if (-not (Test-Path $configDir)) {
    New-Item -ItemType Directory -Force -Path $configDir | Out-Null
    Write-Host "✅ Created: $configDir" -ForegroundColor Green
}

# Create config file
$configFile = "$configDir\config.yml"
Write-Host "`nCreating config file..." -ForegroundColor Yellow

$configContent = @"
tunnel: $tunnelId
credentials-file: $configDir\$tunnelId.json

ingress:
  - hostname: $hostname
    service: http://localhost:3000
  - service: http_status:404
"@

Set-Content -Path $configFile -Value $configContent
Write-Host "✅ Config file created: $configFile" -ForegroundColor Green

# Validate config
Write-Host "`nValidating config..." -ForegroundColor Yellow
cloudflared tunnel validate
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Config is valid" -ForegroundColor Green
} else {
    Write-Host "⚠️ Config validation failed. Please check manually." -ForegroundColor Yellow
}

# DNS setup instructions
Write-Host "`n📋 DNS Setup Required:" -ForegroundColor Cyan
Write-Host "   1. Go to: https://dash.cloudflare.com" -ForegroundColor White
Write-Host "   2. Select domain: $domain" -ForegroundColor White
Write-Host "   3. Go to DNS → Records" -ForegroundColor White
Write-Host "   4. Add CNAME record:" -ForegroundColor White
Write-Host "      - Name: $subdomain" -ForegroundColor Gray
Write-Host "      - Target: $tunnelId.cfargotunnel.com" -ForegroundColor Gray
Write-Host "      - Proxy: Enabled (orange cloud) ✅" -ForegroundColor Gray
Write-Host "   5. Click Save" -ForegroundColor White

Write-Host "`nPress any key after DNS is configured..." -ForegroundColor Yellow
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

# Update config.js
Write-Host "`nUpdating config.js..." -ForegroundColor Yellow
$configJsPath = Join-Path $PSScriptRoot "public\config.js"

if (Test-Path $configJsPath) {
    $configJs = Get-Content $configJsPath -Raw
    
    # Replace ngrok URL with Cloudflare Tunnel URL
    $newBackendUrl = "https://$hostname"
    $configJs = $configJs -replace "https://[^\s']+\.ngrok[^\s']+", $newBackendUrl
    $configJs = $configJs -replace "window\.BACKEND_URL = window\.BACKEND_URL \|\| '[^']+'", "window.BACKEND_URL = window.BACKEND_URL || '$newBackendUrl'"
    
    Set-Content -Path $configJsPath -Value $configJs
    Write-Host "✅ Updated config.js with: $newBackendUrl" -ForegroundColor Green
} else {
    Write-Host "⚠️ config.js not found at: $configJsPath" -ForegroundColor Yellow
    Write-Host "   Please update manually:" -ForegroundColor Yellow
    Write-Host "   window.BACKEND_URL = 'https://$hostname'" -ForegroundColor White
}

# Create start script
Write-Host "`nCreating start script..." -ForegroundColor Yellow
$startScript = @"
# Start Cloudflare Tunnel
# Run this after starting your backend server (npm start)

Write-Host "Starting Cloudflare Tunnel..." -ForegroundColor Cyan
cloudflared tunnel run $tunnelName
"@

$startScriptPath = Join-Path $PSScriptRoot "start-cloudflare-tunnel.ps1"
Set-Content -Path $startScriptPath -Value $startScript
Write-Host "✅ Created: start-cloudflare-tunnel.ps1" -ForegroundColor Green

# Summary
Write-Host "`n✅ Setup Complete!" -ForegroundColor Green
Write-Host "`nNext Steps:" -ForegroundColor Cyan
Write-Host "   1. Make sure DNS CNAME record is created (see above)" -ForegroundColor White
Write-Host "   2. Start your backend: npm start" -ForegroundColor White
Write-Host "   3. Start tunnel: .\start-cloudflare-tunnel.ps1" -ForegroundColor White
Write-Host "   4. Wait 1-2 minutes for DNS propagation" -ForegroundColor White
Write-Host "   5. Test: https://$hostname/health" -ForegroundColor White
Write-Host "   6. Deploy frontend: firebase deploy --only hosting" -ForegroundColor White
Write-Host "`nYour backend URL: https://$hostname" -ForegroundColor Green

Write-Host "`nPress any key to exit..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")


