# PowerShell script to download and install yt-dlp

Write-Host "Downloading yt-dlp..." -ForegroundColor Green

# Create tools directory if it doesn't exist
$toolsDir = "C:\tools"
if (-not (Test-Path $toolsDir)) {
    New-Item -ItemType Directory -Path $toolsDir -Force | Out-Null
    Write-Host "Created directory: $toolsDir" -ForegroundColor Yellow
}

# Get latest release URL
$latestUrl = "https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe"
$outputPath = "$toolsDir\yt-dlp.exe"

try {
    # Fix SSL/TLS issues
    [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
    
    # Download yt-dlp.exe
    Write-Host "Downloading from: $latestUrl" -ForegroundColor Cyan
    Invoke-WebRequest -Uri $latestUrl -OutFile $outputPath -UseBasicParsing -ErrorAction Stop
    Write-Host "Downloaded to: $outputPath" -ForegroundColor Green
    
    # Check if PATH already contains C:\tools
    $currentPath = [Environment]::GetEnvironmentVariable("Path", "User")
    if ($currentPath -notlike "*$toolsDir*") {
        Write-Host "`nAdding $toolsDir to PATH..." -ForegroundColor Yellow
        [Environment]::SetEnvironmentVariable("Path", "$currentPath;$toolsDir", "User")
        Write-Host "Added to PATH!" -ForegroundColor Green
        Write-Host "`nIMPORTANT: Please close and reopen PowerShell for changes to take effect." -ForegroundColor Red
    } else {
        Write-Host "`n$toolsDir is already in PATH" -ForegroundColor Green
    }
    
    Write-Host "`nInstallation complete!" -ForegroundColor Green
    Write-Host "After restarting PowerShell, run: yt-dlp --version" -ForegroundColor Cyan
    
} catch {
    Write-Host "`nError: $_" -ForegroundColor Red
    Write-Host "`nManual installation:" -ForegroundColor Yellow
    Write-Host "1. Download from: https://github.com/yt-dlp/yt-dlp/releases/latest" -ForegroundColor White
    Write-Host "2. Save yt-dlp.exe to: $toolsDir" -ForegroundColor White
    Write-Host "3. Add $toolsDir to your PATH" -ForegroundColor White
}

