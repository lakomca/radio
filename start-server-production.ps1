# Production Server Startup Script
# This script starts the radio server in production mode

Write-Host "`n🚀 Starting Radio Backend Server..." -ForegroundColor Cyan
Write-Host "=====================================`n" -ForegroundColor Cyan

# Set production environment
$env:NODE_ENV = "production"
$env:PORT = "3000"

# Get IP address
$ipAddress = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -notlike "127.*" -and $_.IPAddress -notlike "169.254.*" } | Select-Object -First 1).IPAddress

Write-Host "Environment: Production" -ForegroundColor Green
Write-Host "Port: 3000" -ForegroundColor Green
if ($ipAddress) {
    Write-Host "Network IP: $ipAddress" -ForegroundColor Green
    Write-Host "`n📱 Access URLs:" -ForegroundColor Cyan
    Write-Host "   Local:    http://localhost:3000" -ForegroundColor White
    Write-Host "   Network:  http://$ipAddress:3000" -ForegroundColor White
}
Write-Host "`nPress Ctrl+C to stop the server`n" -ForegroundColor Yellow

# Start the server
npm start

