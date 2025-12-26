# Test Backend Server Access
# This script tests if your backend is accessible locally and via DuckDNS

Write-Host ""
Write-Host "Testing Backend Server Access" -ForegroundColor Cyan
Write-Host "=============================" -ForegroundColor Cyan
Write-Host ""

# Test 1: Check if backend is running locally
Write-Host "1. Testing local backend (localhost:3000)..." -ForegroundColor Yellow
try {
    $localResponse = Invoke-WebRequest -Uri "http://localhost:3000/health" -UseBasicParsing -TimeoutSec 5
    Write-Host "   ✅ Backend is running locally!" -ForegroundColor Green
    Write-Host "   Response: $($localResponse.Content)" -ForegroundColor Gray
} catch {
    Write-Host "   ❌ Backend is NOT running locally" -ForegroundColor Red
    Write-Host "   Start backend with: npm start" -ForegroundColor Yellow
    Write-Host ""
    exit 1
}

Write-Host ""

# Test 2: Check public IP
Write-Host "2. Checking public IP..." -ForegroundColor Yellow
try {
    $publicIP = (Invoke-WebRequest -Uri "https://checkip.amazonaws.com" -UseBasicParsing -TimeoutSec 10).Content.Trim()
    Write-Host "   Public IP: $publicIP" -ForegroundColor Green
} catch {
    Write-Host "   ⚠️  Could not get public IP" -ForegroundColor Yellow
    $publicIP = "unknown"
}

Write-Host ""

# Test 3: Test DuckDNS domain
Write-Host "3. Testing DuckDNS domain (criticmobile.duckdns.org:3000)..." -ForegroundColor Yellow
Write-Host "   This requires:" -ForegroundColor Gray
Write-Host "   - Backend server running" -ForegroundColor Gray
Write-Host "   - Port forwarding configured in router" -ForegroundColor Gray
Write-Host "   - Firewall allows port 3000" -ForegroundColor Gray
Write-Host ""

try {
    $duckdnsResponse = Invoke-WebRequest -Uri "http://criticmobile.duckdns.org:3000/health" -UseBasicParsing -TimeoutSec 10
    Write-Host "   ✅ DuckDNS domain is accessible!" -ForegroundColor Green
    Write-Host "   Response: $($duckdnsResponse.Content)" -ForegroundColor Gray
    Write-Host ""
    Write-Host "   🎉 Your backend is accessible from the internet!" -ForegroundColor Green
} catch {
    Write-Host "   ❌ DuckDNS domain is NOT accessible" -ForegroundColor Red
    Write-Host ""
    Write-Host "   Troubleshooting:" -ForegroundColor Yellow
    Write-Host "   1. Make sure backend is running: npm start" -ForegroundColor White
    Write-Host "   2. Check port forwarding in router:" -ForegroundColor White
    Write-Host "      Forward external port 3000 -> 192.168.1.182:3000" -ForegroundColor Gray
    Write-Host "   3. Check Windows Firewall:" -ForegroundColor White
    Write-Host "      Get-NetFirewallRule -DisplayName 'Radio Stream Server'" -ForegroundColor Gray
    Write-Host "   4. Test from outside your network (use phone mobile data)" -ForegroundColor White
    Write-Host ""
    Write-Host "   Note: Some ISPs block incoming connections. You may need to:" -ForegroundColor Yellow
    Write-Host "   - Use a different port (e.g., 8080)" -ForegroundColor White
    Write-Host "   - Contact your ISP" -ForegroundColor White
    Write-Host "   - Use ngrok or Cloudflare Tunnel instead" -ForegroundColor White
}

Write-Host ""

