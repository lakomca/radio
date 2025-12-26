# Update from GitHub Script
# This script pulls latest changes from GitHub and updates your local backend

Write-Host ""
Write-Host "Updating from GitHub..." -ForegroundColor Cyan
Write-Host "=======================" -ForegroundColor Cyan
Write-Host ""

# Check if backend is running
$backendRunning = Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue
if ($backendRunning) {
    Write-Host "WARNING: Backend server is running on port 3000" -ForegroundColor Yellow
    Write-Host "Please stop it (Ctrl+C) before updating" -ForegroundColor Yellow
    Write-Host ""
    $continue = Read-Host "Continue anyway? (y/n)"
    if ($continue -ne 'y' -and $continue -ne 'Y') {
        Write-Host "Update cancelled. Stop backend and try again." -ForegroundColor Red
        exit 1
    }
}

# Check git status
Write-Host "Checking git status..." -ForegroundColor Green
$gitStatus = git status --short
if ($gitStatus) {
    Write-Host "You have local changes:" -ForegroundColor Yellow
    git status --short
    Write-Host ""
    Write-Host "Options:" -ForegroundColor Cyan
    Write-Host "1. Stash changes (save for later)" -ForegroundColor White
    Write-Host "2. Commit changes first" -ForegroundColor White
    Write-Host "3. Discard changes" -ForegroundColor White
    Write-Host "4. Cancel" -ForegroundColor White
    Write-Host ""
    $choice = Read-Host "Choose option (1-4)"
    
    switch ($choice) {
        "1" {
            Write-Host "Stashing changes..." -ForegroundColor Green
            git stash
            $shouldStashPop = $true
        }
        "2" {
            Write-Host "Please commit your changes first:" -ForegroundColor Yellow
            Write-Host "  git add ." -ForegroundColor White
            Write-Host "  git commit -m 'Your message'" -ForegroundColor White
            Write-Host "  git push origin main" -ForegroundColor White
            exit 0
        }
        "3" {
            Write-Host "Discarding local changes..." -ForegroundColor Yellow
            git reset --hard
        }
        "4" {
            Write-Host "Update cancelled." -ForegroundColor Red
            exit 0
        }
        default {
            Write-Host "Invalid choice. Update cancelled." -ForegroundColor Red
            exit 1
        }
    }
}

# Pull updates
Write-Host ""
Write-Host "Pulling latest changes from GitHub..." -ForegroundColor Green
git pull origin main

if ($LASTEXITCODE -ne 0) {
    Write-Host "Error pulling from GitHub" -ForegroundColor Red
    Write-Host "Check your internet connection and try again" -ForegroundColor Yellow
    if ($shouldStashPop) {
        Write-Host "Restoring stashed changes..." -ForegroundColor Yellow
        git stash pop
    }
    exit 1
}

# Reapply stashed changes if any
if ($shouldStashPop) {
    Write-Host ""
    Write-Host "Reapplying stashed changes..." -ForegroundColor Green
    git stash pop
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Warning: Could not reapply some changes. Check git status." -ForegroundColor Yellow
    }
}

# Install dependencies
Write-Host ""
Write-Host "Installing/updating dependencies..." -ForegroundColor Green
npm install

if ($LASTEXITCODE -ne 0) {
    Write-Host "Warning: npm install had issues. Check the output above." -ForegroundColor Yellow
}

# Show summary
Write-Host ""
Write-Host "Update Summary" -ForegroundColor Cyan
Write-Host "==============" -ForegroundColor Cyan
Write-Host ""

# Show recent commits
Write-Host "Recent changes:" -ForegroundColor Green
git log --oneline -5

Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Review changes: git log" -ForegroundColor White
Write-Host "2. Check config files (public/config.js, .env)" -ForegroundColor White
Write-Host "3. Restart backend: npm start" -ForegroundColor White
Write-Host "4. Test: curl http://localhost:3000/health" -ForegroundColor White
Write-Host ""

# Check for important config files
Write-Host "Important files to check:" -ForegroundColor Yellow
if (Test-Path "public\config.js") {
    Write-Host "  ✓ public/config.js exists" -ForegroundColor Green
} else {
    Write-Host "  ✗ public/config.js missing - may need to recreate" -ForegroundColor Red
}

if (Test-Path ".env") {
    Write-Host "  ✓ .env exists" -ForegroundColor Green
} else {
    Write-Host "  ⚠ .env missing - may need to recreate" -ForegroundColor Yellow
}

Write-Host ""

