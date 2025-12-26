# Quick Backend Test Script
# Tests if backend is accessible locally and via ngrok

Write-Host ""
Write-Host "Testing Backend Connection..." -ForegroundColor Cyan
Write-Host "=============================" -ForegroundColor Cyan
Write-Host ""

# Test 1: Local backend
Write-Host "1. Testing local backend (localhost:3000)..." -ForegroundColor Yellow
try {
    $localResponse = Invoke-WebRequest -Uri "http://localhost:3000/health" -UseBasicParsing -TimeoutSec 3
    Write-Host "   ✅ Backend is running locally!" -ForegroundColor Green
    Write-Host "   Status: $($localResponse.StatusCode)" -ForegroundColor Gray
    Write-Host "   Response: $($localResponse.Content)" -ForegroundColor Gray
} catch {
    Write-Host "   ❌ Backend is NOT running locally" -ForegroundColor Red
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Gray
    Write-Host ""
    Write-Host "   Start backend with: npm start" -ForegroundColor Yellow
    exit 1
}

Write-Host ""

# Test 2: ngrok tunnel
Write-Host "2. Testing ngrok tunnel..." -ForegroundColor Yellow

# Get ngrok URL from config.js
$configPath = "public\config.js"
if (Test-Path $configPath) {
    $configContent = Get-Content $configPath -Raw
    if ($configContent -match "https://[^'\""]+\.ngrok[^'\""]+") {
        $ngrokUrl = $matches[0].TrimEnd('/')
        Write-Host "   Found ngrok URL: $ngrokUrl" -ForegroundColor Gray
        
        try {
            $headers = @{
                "ngrok-skip-browser-warning" = "true"
            }
            $ngrokResponse = Invoke-WebRequest -Uri "$ngrokUrl/health" -UseBasicParsing -TimeoutSec 10 -Headers $headers
            Write-Host "   ✅ Backend is accessible via ngrok!" -ForegroundColor Green
            Write-Host "   Status: $($ngrokResponse.StatusCode)" -ForegroundColor Gray
            Write-Host "   Response: $($ngrokResponse.Content)" -ForegroundColor Gray
        } catch {
            Write-Host "   ❌ Backend is NOT accessible via ngrok" -ForegroundColor Red
            Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Gray
            Write-Host ""
            Write-Host "   Possible issues:" -ForegroundColor Yellow
            Write-Host "   1. ngrok is not running" -ForegroundColor White
            Write-Host "   2. Visit ngrok URL in browser first: $ngrokUrl" -ForegroundColor White
            Write-Host "   3. Click 'Visit Site' to accept warning (first time only)" -ForegroundColor White
            Write-Host "   4. ngrok URL may have changed - check ngrok terminal" -ForegroundColor White
        }
    } else {
        Write-Host "   ⚠️ Could not find ngrok URL in config.js" -ForegroundColor Yellow
    }
} else {
    Write-Host "   ⚠️ config.js not found" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Summary:" -ForegroundColor Cyan
Write-Host "  Local: http://localhost:3000" -ForegroundColor White
Write-Host "  ngrok: Check config.js for URL" -ForegroundColor White
Write-Host "  Firebase: https://nurayportal.web.app" -ForegroundColor White
Write-Host ""

