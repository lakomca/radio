# DuckDNS IP Updater Script
# Update this script with your DuckDNS domain and token

# ===== CONFIGURATION =====
$domain = "criticmobile"  # Your DuckDNS domain (without .duckdns.org)
$token = "904bfe67-095f-4062-aeba-60124d74b1da"    # Your DuckDNS token from https://www.duckdns.org

# ===== SCRIPT =====
# Remove .duckdns.org if user included it
$domain = $domain -replace '\.duckdns\.org$', ''

if ($domain -eq "yourdomain" -or $token -eq "your-token") {
    Write-Host "ERROR: Please configure your DuckDNS domain and token in this script" -ForegroundColor Red
    Write-Host ""
    Write-Host "Edit update-duckdns.ps1 and set:" -ForegroundColor Yellow
    Write-Host "  `$domain = 'yourdomain'" -ForegroundColor White
    Write-Host "  `$token = 'your-token'" -ForegroundColor White
    Write-Host ""
    Write-Host "Get your token from: https://www.duckdns.org" -ForegroundColor Cyan
    exit 1
}

# Get current public IP (try multiple services as fallback)
$publicIP = $null
$ipServices = @(
    "https://api.ipify.org",
    "https://icanhazip.com",
    "https://ifconfig.me/ip",
    "https://checkip.amazonaws.com"
)

foreach ($service in $ipServices) {
    try {
        Write-Host "Trying to get IP from $service..." -ForegroundColor Gray
        $publicIP = (Invoke-WebRequest -Uri $service -UseBasicParsing -TimeoutSec 10).Content.Trim()
        if ($publicIP -match '^\d+\.\d+\.\d+\.\d+$') {
            Write-Host "Current public IP: $publicIP" -ForegroundColor Green
            break
        }
    } catch {
        Write-Host "Failed to get IP from $service" -ForegroundColor Yellow
        continue
    }
}

if (-not $publicIP) {
    Write-Host "ERROR: Could not get public IP from any service" -ForegroundColor Red
    Write-Host "Please check your internet connection and try again" -ForegroundColor Yellow
    exit 1
}

# Update DuckDNS
$updateUrl = "https://www.duckdns.org/update?domains=$domain&token=$token&ip=$publicIP"
Write-Host "Updating DuckDNS: $domain.duckdns.org -> $publicIP" -ForegroundColor Cyan
Write-Host "URL: $updateUrl" -ForegroundColor Gray

try {
    $response = Invoke-WebRequest -Uri $updateUrl -UseBasicParsing -TimeoutSec 10
    # Handle both string and byte array responses
    if ($response.Content -is [string]) {
        $responseContent = $response.Content.Trim()
    } else {
        $responseContent = [System.Text.Encoding]::UTF8.GetString($response.Content).Trim()
    }
    
    Write-Host "DuckDNS response: $responseContent" -ForegroundColor Gray
    
    if ($responseContent -eq "OK") {
        Write-Host "SUCCESS: DuckDNS updated successfully!" -ForegroundColor Green
        Write-Host "Domain: $domain.duckdns.org -> $publicIP" -ForegroundColor Green
    } else {
        Write-Host "ERROR: DuckDNS update failed" -ForegroundColor Red
        Write-Host "Response: $responseContent" -ForegroundColor Red
        
        # Common error messages
        if ($responseContent -match "KO") {
            Write-Host "Possible issues:" -ForegroundColor Yellow
            Write-Host "  - Invalid token" -ForegroundColor White
            Write-Host "  - Domain doesn't exist or isn't yours" -ForegroundColor White
            Write-Host "  - Check your token at https://www.duckdns.org" -ForegroundColor White
        }
        exit 1
    }
} catch {
    Write-Host "ERROR: Failed to update DuckDNS" -ForegroundColor Red
    Write-Host "Error details: $_" -ForegroundColor Red
    Write-Host "Check your internet connection and try again" -ForegroundColor Yellow
    exit 1
}

