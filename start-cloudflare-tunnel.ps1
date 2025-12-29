# Start Cloudflare Tunnel
# Run this script after starting your backend server (npm start)

Write-Host "🔷 Starting Cloudflare Tunnel...`n" -ForegroundColor Cyan

# Check if backend is running
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3000/health" -UseBasicParsing -TimeoutSec 2 -ErrorAction Stop
    Write-Host "✅ Backend is running on port 3000" -ForegroundColor Green
} catch {
    Write-Host "⚠️ Backend not running on port 3000!" -ForegroundColor Yellow
    Write-Host "   Start your backend first: npm start" -ForegroundColor Yellow
    Write-Host "`nPress any key to continue anyway..." -ForegroundColor Gray
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
}

# Check if cloudflared is installed
$cloudflared = Get-Command cloudflared -ErrorAction SilentlyContinue
if (-not $cloudflared) {
    Write-Host "❌ cloudflared not found!" -ForegroundColor Red
    Write-Host "   Run: .\setup-cloudflare-tunnel.ps1 first" -ForegroundColor Yellow
    exit 1
}

# Check for tunnel name
$configDir = "$env:USERPROFILE\.cloudflared"
$configFile = "$configDir\config.yml"

if (-not (Test-Path $configFile)) {
    Write-Host "❌ Config file not found: $configFile" -ForegroundColor Red
    Write-Host "   Run: .\setup-cloudflare-tunnel.ps1 first" -ForegroundColor Yellow
    exit 1
}

# Extract tunnel name from config
$configContent = Get-Content $configFile -Raw
$tunnelIdMatch = $configContent | Select-String -Pattern 'tunnel:\s+(\S+)'
if ($tunnelIdMatch) {
    $tunnelId = $tunnelIdMatch.Matches[0].Groups[1].Value
    
    # Try to get tunnel name from cloudflared
    $tunnelList = cloudflared tunnel list 2>&1
    $tunnelNameMatch = $tunnelList | Select-String -Pattern "$tunnelId\s+(\S+)"
    
    if ($tunnelNameMatch) {
        $tunnelName = $tunnelNameMatch.Matches[0].Groups[1].Value
    } else {
        # Fallback: use tunnel ID
        $tunnelName = $tunnelId
    }
} else {
    Write-Host "⚠️ Could not extract tunnel ID from config" -ForegroundColor Yellow
    $tunnelName = Read-Host "Enter tunnel name"
}

Write-Host "Starting tunnel: $tunnelName`n" -ForegroundColor Yellow

# Start tunnel
cloudflared tunnel run $tunnelName


