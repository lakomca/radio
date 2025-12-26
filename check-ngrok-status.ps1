# Check ngrok Status Script
# This script checks if ngrok is running and accessible

Write-Host ""
Write-Host "Checking ngrok Status..." -ForegroundColor Cyan
Write-Host "========================" -ForegroundColor Cyan
Write-Host ""

# Check if ngrok process is running
$ngrokProcess = Get-Process -Name "ngrok" -ErrorAction SilentlyContinue
if ($ngrokProcess) {
    Write-Host "✅ ngrok process is running" -ForegroundColor Green
    Write-Host "   Process ID: $($ngrokProcess.Id)" -ForegroundColor Gray
    Write-Host "   Started: $($ngrokProcess.StartTime)" -ForegroundColor Gray
} else {
    Write-Host "❌ ngrok process is NOT running" -ForegroundColor Red
    Write-Host ""
    Write-Host "To start ngrok:" -ForegroundColor Yellow
    Write-Host "  1. Open a new PowerShell window" -ForegroundColor White
    Write-Host "  2. cd C:\ngrok" -ForegroundColor White
    Write-Host "  3. .\ngrok.exe http 3000" -ForegroundColor White
    Write-Host ""
    exit 1
}

# Check ngrok API for active tunnels
Write-Host ""
Write-Host "Checking ngrok tunnels..." -ForegroundColor Cyan
try {
    $ngrokApi = Invoke-RestMethod -Uri "http://localhost:4040/api/tunnels" -UseBasicParsing -TimeoutSec 3
    if ($ngrokApi.tunnels) {
        Write-Host "✅ Active tunnels found:" -ForegroundColor Green
        foreach ($tunnel in $ngrokApi.tunnels) {
            Write-Host "   $($tunnel.public_url) -> $($tunnel.config.addr)" -ForegroundColor White
        }
        
        # Get HTTPS URL
        $httpsTunnel = $ngrokApi.tunnels | Where-Object { $_.public_url -like "https://*" } | Select-Object -First 1
        if ($httpsTunnel) {
            Write-Host ""
            Write-Host "Current ngrok HTTPS URL: $($httpsTunnel.public_url)" -ForegroundColor Cyan
            Write-Host ""
            Write-Host "Make sure this matches your config.js:" -ForegroundColor Yellow
            Write-Host "  window.BACKEND_URL = '$($httpsTunnel.public_url)'" -ForegroundColor White
        }
    } else {
        Write-Host "⚠️ No active tunnels found" -ForegroundColor Yellow
    }
} catch {
    Write-Host "⚠️ Could not check ngrok API (may be normal)" -ForegroundColor Yellow
    Write-Host "   Error: $_" -ForegroundColor Gray
}

# Test backend through ngrok
Write-Host ""
Write-Host "Testing backend accessibility..." -ForegroundColor Cyan

# Try to get URL from config.js
$configContent = Get-Content "public\config.js" -Raw -ErrorAction SilentlyContinue
if ($configContent -match "https://[^'\""]+\.ngrok[^'\""]+") {
    $ngrokUrl = $matches[0]
    Write-Host "Testing: $ngrokUrl" -ForegroundColor Gray
    
    try {
        $response = Invoke-WebRequest -Uri "$ngrokUrl/health" -UseBasicParsing -TimeoutSec 5
        Write-Host "✅ Backend is accessible via ngrok!" -ForegroundColor Green
        Write-Host "   Response: $($response.Content)" -ForegroundColor Gray
    } catch {
        Write-Host "❌ Backend is NOT accessible via ngrok" -ForegroundColor Red
        Write-Host "   Error: $_" -ForegroundColor Gray
        Write-Host ""
        Write-Host "Possible issues:" -ForegroundColor Yellow
        Write-Host "  1. Backend is not running: npm start" -ForegroundColor White
        Write-Host "  2. ngrok URL has changed - restart ngrok and update config.js" -ForegroundColor White
        Write-Host "  3. Firewall blocking ngrok" -ForegroundColor White
    }
} else {
    Write-Host "⚠️ Could not find ngrok URL in config.js" -ForegroundColor Yellow
}

Write-Host ""

