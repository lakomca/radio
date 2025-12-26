# Start Backend Server with ngrok Tunnel
# This script starts both the backend server and ngrok tunnel

Write-Host ""
Write-Host "Starting Backend Server with ngrok..." -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

# Check if ngrok exists
$ngrokPath = "C:\ngrok\ngrok.exe"
if (-not (Test-Path $ngrokPath)) {
    Write-Host "ERROR: ngrok not found at $ngrokPath" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please:" -ForegroundColor Yellow
    Write-Host "1. Download ngrok from: https://ngrok.com/download" -ForegroundColor White
    Write-Host "2. Extract to C:\ngrok\" -ForegroundColor White
    Write-Host "3. Or update ngrokPath in this script" -ForegroundColor White
    Write-Host ""
    exit 1
}

# Check if backend is already running
$backendRunning = Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue
if ($backendRunning) {
    Write-Host "Backend server is already running on port 3000" -ForegroundColor Yellow
    Write-Host ""
} else {
    Write-Host "Starting backend server..." -ForegroundColor Green
    # Start backend in background
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD'; npm start"
    Write-Host "Waiting for backend to start..." -ForegroundColor Yellow
    Start-Sleep -Seconds 5
}

# Check if backend is responding
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3000/health" -UseBasicParsing -TimeoutSec 5
    Write-Host "Backend server is running!" -ForegroundColor Green
} catch {
    Write-Host "WARNING: Backend server may not be ready yet" -ForegroundColor Yellow
    Write-Host "Make sure backend is running: npm start" -ForegroundColor Yellow
    Write-Host ""
}

Write-Host ""
Write-Host "Starting ngrok tunnel..." -ForegroundColor Green
Write-Host "Copy the HTTPS URL (e.g., https://abc123.ngrok.io)" -ForegroundColor Cyan
Write-Host "Then update public/config.js with this URL" -ForegroundColor Cyan
Write-Host ""
Write-Host "Press Ctrl+C to stop ngrok" -ForegroundColor Yellow
Write-Host ""

# Start ngrok
& $ngrokPath http 3000

