# PowerShell script to allow Node.js through Windows Firewall
# Run as Administrator

Write-Host "Opening Windows Firewall for Node.js on port 3000..." -ForegroundColor Green

# Check if running as administrator
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
    Write-Host "`n⚠️  This script needs Administrator privileges!" -ForegroundColor Yellow
    Write-Host "Right-click PowerShell and select 'Run as Administrator', then run this script again." -ForegroundColor Yellow
    exit 1
}

try {
    # Remove existing rule if it exists
    $existingRule = Get-NetFirewallRule -DisplayName "Radio Stream Server" -ErrorAction SilentlyContinue
    if ($existingRule) {
        Remove-NetFirewallRule -DisplayName "Radio Stream Server"
        Write-Host "Removed existing rule..." -ForegroundColor Yellow
    }

    # Create new firewall rule
    New-NetFirewallRule -DisplayName "Radio Stream Server" `
        -Direction Inbound `
        -LocalPort 3000 `
        -Protocol TCP `
        -Action Allow `
        -Profile Domain,Private,Public | Out-Null

    Write-Host "`n✅ Firewall rule created successfully!" -ForegroundColor Green
    Write-Host "`nYour server is now accessible from other devices on the same network." -ForegroundColor Cyan
    Write-Host "`nTo find your IP address, run: ipconfig" -ForegroundColor Cyan
    Write-Host "Then access from other devices: http://YOUR_IP:3000" -ForegroundColor Cyan
} catch {
    Write-Host "`n❌ Error creating firewall rule: $_" -ForegroundColor Red
    Write-Host "`nYou can manually allow Node.js through Windows Firewall:" -ForegroundColor Yellow
    Write-Host "1. Open Windows Defender Firewall" -ForegroundColor Yellow
    Write-Host "2. Click 'Allow an app through firewall'" -ForegroundColor Yellow
    Write-Host "3. Add Node.js and allow port 3000" -ForegroundColor Yellow
}

