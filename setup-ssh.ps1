# PowerShell script to set up SSH server on Windows
# Run as Administrator

Write-Host "Setting up SSH Server for Remote Development..." -ForegroundColor Green
Write-Host ""

# Check if running as administrator
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
    Write-Host "⚠️  This script needs Administrator privileges!" -ForegroundColor Yellow
    Write-Host "Right-click PowerShell and select 'Run as Administrator', then run this script again." -ForegroundColor Yellow
    exit 1
}

try {
    # Check if OpenSSH Server is already installed
    $sshCapability = Get-WindowsCapability -Online | Where-Object Name -like 'OpenSSH.Server*'
    
    if ($sshCapability.State -ne 'Installed') {
        Write-Host "Installing OpenSSH Server..." -ForegroundColor Cyan
        Add-WindowsCapability -Online -Name OpenSSH.Server~~~~0.0.1.0
        Write-Host "✅ OpenSSH Server installed" -ForegroundColor Green
    } else {
        Write-Host "✅ OpenSSH Server already installed" -ForegroundColor Green
    }

    # Start SSH service
    Write-Host "`nStarting SSH service..." -ForegroundColor Cyan
    Start-Service sshd
    Set-Service -Name sshd -StartupType 'Automatic'
    Write-Host "✅ SSH service started and set to auto-start" -ForegroundColor Green

    # Configure firewall
    Write-Host "`nConfiguring firewall..." -ForegroundColor Cyan
    $firewallRule = Get-NetFirewallRule -Name sshd -ErrorAction SilentlyContinue
    if (-not $firewallRule) {
        New-NetFirewallRule -Name sshd -DisplayName 'OpenSSH Server (sshd)' -Enabled True -Direction Inbound -Protocol TCP -Action Allow -LocalPort 22 | Out-Null
        Write-Host "✅ Firewall rule created" -ForegroundColor Green
    } else {
        Write-Host "✅ Firewall rule already exists" -ForegroundColor Green
    }

    # Get network information
    Write-Host "`n" + "="*50 -ForegroundColor Cyan
    Write-Host "SSH Server Setup Complete!" -ForegroundColor Green
    Write-Host "="*50 -ForegroundColor Cyan
    
    Write-Host "`nYour connection details:" -ForegroundColor Yellow
    $username = $env:USERNAME
    $networkInterfaces = Get-NetIPAddress -AddressFamily IPv4 | Where-Object {$_.IPAddress -notlike "127.*" -and $_.IPAddress -notlike "169.254.*"}
    
    Write-Host "`nUsername: $username" -ForegroundColor White
    Write-Host "`nIP Addresses:" -ForegroundColor White
    foreach ($interface in $networkInterfaces) {
        Write-Host "  - $($interface.IPAddress)" -ForegroundColor Cyan
    }
    
    Write-Host "`nTo connect from another device:" -ForegroundColor Yellow
    Write-Host "  ssh $username@IP_ADDRESS" -ForegroundColor White
    Write-Host "`nExample:" -ForegroundColor Yellow
    if ($networkInterfaces) {
        $firstIP = $networkInterfaces[0].IPAddress
        Write-Host "  ssh $username@$firstIP" -ForegroundColor White
    }
    
    Write-Host "`nIn Cursor:" -ForegroundColor Yellow
    Write-Host "  1. Press F1 or Ctrl+Shift+P" -ForegroundColor White
    Write-Host "  2. Type: Remote-SSH: Connect to Host" -ForegroundColor White
    Write-Host "  3. Enter: $username@IP_ADDRESS" -ForegroundColor White
    Write-Host "  4. Enter your Windows password" -ForegroundColor White
    Write-Host "  5. Open folder: C:\Users\$username\Documents\radio" -ForegroundColor White
    
    Write-Host "`n" + "="*50 -ForegroundColor Cyan

} catch {
    Write-Host "`n❌ Error: $_" -ForegroundColor Red
    Write-Host "`nManual setup:" -ForegroundColor Yellow
    Write-Host "1. Open Settings → Apps → Optional Features" -ForegroundColor White
    Write-Host "2. Add 'OpenSSH Server'" -ForegroundColor White
    Write-Host "3. Start service: Start-Service sshd" -ForegroundColor White
    Write-Host "4. Allow through firewall: New-NetFirewallRule -Name sshd -DisplayName 'OpenSSH Server' -Enabled True -Direction Inbound -Protocol TCP -Action Allow -LocalPort 22" -ForegroundColor White
}

