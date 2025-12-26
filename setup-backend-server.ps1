# Setup Script for Radio Backend Server
# Run this script to configure your machine as a backend server

Write-Host ""
Write-Host "Setting up Radio Backend Server..." -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

# Check if running as administrator
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
    Write-Host "WARNING: This script needs Administrator privileges!" -ForegroundColor Yellow
    Write-Host "Right-click PowerShell and select 'Run as Administrator', then run this script again." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Or run this command manually:" -ForegroundColor Yellow
    Write-Host "  New-NetFirewallRule -DisplayName 'Radio Stream Server' -Direction Inbound -LocalPort 3000 -Protocol TCP -Action Allow -Profile Domain,Private,Public" -ForegroundColor White
    Write-Host ""
    exit 1
}

# Step 1: Configure Firewall
Write-Host "Step 1: Configuring Windows Firewall..." -ForegroundColor Green
try {
    # Remove existing rule if it exists
    $existingRule = Get-NetFirewallRule -DisplayName "Radio Stream Server" -ErrorAction SilentlyContinue
    if ($existingRule) {
        Remove-NetFirewallRule -DisplayName "Radio Stream Server"
        Write-Host "  Removed existing rule..." -ForegroundColor Yellow
    }

    # Create new firewall rule
    New-NetFirewallRule -DisplayName "Radio Stream Server" `
        -Direction Inbound `
        -LocalPort 3000 `
        -Protocol TCP `
        -Action Allow `
        -Profile Domain,Private,Public | Out-Null

    Write-Host "  Firewall rule created successfully!" -ForegroundColor Green
} catch {
    Write-Host "  ERROR: Error creating firewall rule: $_" -ForegroundColor Red
    exit 1
}

# Step 2: Get IP Address
Write-Host ""
Write-Host "Step 2: Getting network information..." -ForegroundColor Green
$ipAddress = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -notlike "127.*" -and $_.IPAddress -notlike "169.254.*" } | Select-Object -First 1).IPAddress

if ($ipAddress) {
    Write-Host "  Your server IP address: $ipAddress" -ForegroundColor Green
    Write-Host "  Access URL: http://$ipAddress:3000" -ForegroundColor Cyan
} else {
    Write-Host "  WARNING: Could not determine IP address. Run 'ipconfig' to find it." -ForegroundColor Yellow
}

# Step 3: Create production environment file
Write-Host ""
Write-Host "Step 3: Creating production configuration..." -ForegroundColor Green
if (-not (Test-Path ".env")) {
    $envContent = @"
# Production Environment Variables
NODE_ENV=production
PORT=3000
SESSION_SECRET=change-this-to-a-random-secret-in-production
REMEMBER_ME=false
"@
    $envContent | Out-File -FilePath ".env" -Encoding UTF8
    Write-Host "  Created .env file" -ForegroundColor Green
} else {
    Write-Host "  .env file already exists" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Setup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Start the server: npm start" -ForegroundColor White
Write-Host "2. Access from this machine: http://localhost:3000" -ForegroundColor White
if ($ipAddress) {
    Write-Host "3. Access from other devices: http://$ipAddress:3000" -ForegroundColor White
}
Write-Host ""
Write-Host "To run the server automatically on startup, see: STARTUP_GUIDE.md" -ForegroundColor Yellow
Write-Host ""
