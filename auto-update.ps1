# Auto-Update Script
# Automatically pulls from GitHub, merges changes, and updates the backend server

param(
    [switch]$RestartBackend = $true,
    [switch]$DeployFirebase = $false,
    [switch]$Force = $false
)

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Auto-Update from GitHub" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$ErrorActionPreference = "Stop"

# Function to check if backend is running
function Test-BackendRunning {
    $backendRunning = Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue
    return $null -ne $backendRunning
}

# Function to stop backend
function Stop-Backend {
    Write-Host "Stopping backend server..." -ForegroundColor Yellow
    $processes = Get-Process -Name "node" -ErrorAction SilentlyContinue | Where-Object {
        $_.MainWindowTitle -like "*server*" -or 
        (Get-NetTCPConnection -OwningProcess $_.Id -LocalPort 3000 -ErrorAction SilentlyContinue)
    }
    
    if ($processes) {
        foreach ($proc in $processes) {
            try {
                Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue
                Write-Host "  Stopped process: $($proc.Id)" -ForegroundColor Gray
            } catch {
                Write-Host "  Warning: Could not stop process $($proc.Id)" -ForegroundColor Yellow
            }
        }
        Start-Sleep -Seconds 2
    }
    
    # Verify it's stopped
    if (Test-BackendRunning) {
        Write-Host "  Warning: Backend may still be running. Please stop manually." -ForegroundColor Yellow
        return $false
    }
    return $true
}

# Function to start backend
function Start-Backend {
    Write-Host ""
    Write-Host "Starting backend server..." -ForegroundColor Green
    Write-Host "  Command: npm start" -ForegroundColor Gray
    
    # Start in new window so it doesn't block
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD'; npm start"
    
    # Wait a bit for server to start
    Start-Sleep -Seconds 3
    
    # Test if it's running
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:3000/health" -UseBasicParsing -TimeoutSec 5 -ErrorAction Stop
        Write-Host "  ✓ Backend is running!" -ForegroundColor Green
        return $true
    } catch {
        Write-Host "  ⚠ Backend may not be ready yet. Check the new window." -ForegroundColor Yellow
        return $false
    }
}

# Step 1: Check backend status
Write-Host "Step 1: Checking backend status..." -ForegroundColor Green
$backendWasRunning = Test-BackendRunning

if ($backendWasRunning) {
    if ($Force) {
        Write-Host "  Backend is running. Stopping it..." -ForegroundColor Yellow
        Stop-Backend | Out-Null
    } else {
        Write-Host "  ⚠ Backend is currently running" -ForegroundColor Yellow
        Write-Host "  It will be stopped and restarted automatically" -ForegroundColor Gray
        $continue = Read-Host "  Continue? (y/n)"
        if ($continue -ne 'y' -and $continue -ne 'Y') {
            Write-Host "Update cancelled." -ForegroundColor Red
            exit 0
        }
        Stop-Backend | Out-Null
    }
} else {
    Write-Host "  ✓ Backend is not running" -ForegroundColor Green
}

# Step 2: Check git status
Write-Host ""
Write-Host "Step 2: Checking git status..." -ForegroundColor Green
$gitStatus = git status --short 2>&1
$hasLocalChanges = $gitStatus -and ($gitStatus -notmatch "nothing to commit")

if ($hasLocalChanges) {
    Write-Host "  ⚠ You have local changes:" -ForegroundColor Yellow
    git status --short | ForEach-Object { Write-Host "    $_" -ForegroundColor Gray }
    Write-Host ""
    
    if ($Force) {
        Write-Host "  Force mode: Stashing changes..." -ForegroundColor Yellow
        git stash push -m "Auto-stash before update $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
        $shouldStashPop = $true
    } else {
        Write-Host "  Options:" -ForegroundColor Cyan
        Write-Host "    1. Stash changes (recommended)" -ForegroundColor White
        Write-Host "    2. Commit changes first" -ForegroundColor White
        Write-Host "    3. Discard changes" -ForegroundColor White
        Write-Host "    4. Cancel" -ForegroundColor White
        Write-Host ""
        $choice = Read-Host "  Choose option (1-4)"
        
        switch ($choice) {
            "1" {
                Write-Host "  Stashing changes..." -ForegroundColor Green
                git stash push -m "Auto-stash before update $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
                $shouldStashPop = $true
            }
            "2" {
                Write-Host ""
                Write-Host "  Please commit your changes first:" -ForegroundColor Yellow
                Write-Host "    git add ." -ForegroundColor White
                Write-Host "    git commit -m 'Your message'" -ForegroundColor White
                Write-Host "    git push origin main" -ForegroundColor White
                Write-Host ""
                Write-Host "  Then run this script again." -ForegroundColor Yellow
                exit 0
            }
            "3" {
                Write-Host "  Discarding local changes..." -ForegroundColor Yellow
                git reset --hard HEAD
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
} else {
    Write-Host "  ✓ No local changes" -ForegroundColor Green
}

# Step 3: Fetch latest from GitHub
Write-Host ""
Write-Host "Step 3: Fetching latest from GitHub..." -ForegroundColor Green
try {
    git fetch origin main
    Write-Host "  ✓ Fetched latest changes" -ForegroundColor Green
} catch {
    Write-Host "  ✗ Error fetching: $_" -ForegroundColor Red
    if ($shouldStashPop) {
        Write-Host "  Restoring stashed changes..." -ForegroundColor Yellow
        git stash pop
    }
    exit 1
}

# Step 4: Pull updates
Write-Host ""
Write-Host "Step 4: Pulling updates..." -ForegroundColor Green
try {
    $pullOutput = git pull origin main 2>&1
    Write-Host $pullOutput
    
    if ($LASTEXITCODE -ne 0) {
        throw "Git pull failed"
    }
    
    # Check if there were actual updates
    if ($pullOutput -match "Already up to date") {
        Write-Host "  ℹ Already up to date - no changes to pull" -ForegroundColor Yellow
        $hasUpdates = $false
    } else {
        Write-Host "  ✓ Successfully pulled updates" -ForegroundColor Green
        $hasUpdates = $true
    }
} catch {
    Write-Host "  ✗ Error pulling updates: $_" -ForegroundColor Red
    if ($shouldStashPop) {
        Write-Host "  Restoring stashed changes..." -ForegroundColor Yellow
        git stash pop
    }
    exit 1
}

# Step 5: Reapply stashed changes
if ($shouldStashPop) {
    Write-Host ""
    Write-Host "Step 5: Reapplying stashed changes..." -ForegroundColor Green
    try {
        git stash pop
        if ($LASTEXITCODE -ne 0) {
            Write-Host "  ⚠ Warning: Could not reapply some changes. Check git status." -ForegroundColor Yellow
            Write-Host "  Run 'git stash list' to see stashed changes." -ForegroundColor Gray
        } else {
            Write-Host "  ✓ Changes reapplied" -ForegroundColor Green
        }
    } catch {
        Write-Host "  ⚠ Warning: Error reapplying changes: $_" -ForegroundColor Yellow
    }
}

# Step 6: Install dependencies
Write-Host ""
Write-Host "Step 6: Installing/updating dependencies..." -ForegroundColor Green
try {
    npm install
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  ✓ Dependencies updated" -ForegroundColor Green
    } else {
        Write-Host "  ⚠ Warning: npm install had issues. Check output above." -ForegroundColor Yellow
    }
} catch {
    Write-Host "  ⚠ Warning: Error installing dependencies: $_" -ForegroundColor Yellow
}

# Step 7: Show what changed
Write-Host ""
Write-Host "Step 7: Update Summary" -ForegroundColor Green
Write-Host "=====================" -ForegroundColor Cyan
if ($hasUpdates) {
    Write-Host ""
    Write-Host "Recent commits:" -ForegroundColor Cyan
    git log --oneline -5 --decorate
} else {
    Write-Host "  No new updates" -ForegroundColor Gray
}

# Step 8: Check important config files
Write-Host ""
Write-Host "Important files status:" -ForegroundColor Yellow
$configFiles = @(
    @{Path="public\config.js"; Name="Backend URL Config"},
    @{Path=".env"; Name="Environment Variables"},
    @{Path="update-duckdns.ps1"; Name="DuckDNS Updater"}
)

foreach ($file in $configFiles) {
    if (Test-Path $file.Path) {
        Write-Host "  ✓ $($file.Name) exists" -ForegroundColor Green
    } else {
        Write-Host "  ⚠ $($file.Name) missing" -ForegroundColor Yellow
    }
}

# Step 9: Restart backend
if ($RestartBackend) {
    Write-Host ""
    Write-Host "Step 8: Restarting backend server..." -ForegroundColor Green
    if ($backendWasRunning -or $hasUpdates) {
        Start-Backend
    } else {
        Write-Host "  Backend was not running and no updates. Skipping restart." -ForegroundColor Gray
        Write-Host "  Start manually with: npm start" -ForegroundColor Gray
    }
}

# Step 10: Deploy to Firebase (optional)
if ($DeployFirebase) {
    Write-Host ""
    Write-Host "Step 9: Deploying to Firebase..." -ForegroundColor Green
    try {
        firebase deploy --only hosting
        if ($LASTEXITCODE -eq 0) {
            Write-Host "  ✓ Successfully deployed to Firebase" -ForegroundColor Green
        } else {
            Write-Host "  ✗ Firebase deployment failed" -ForegroundColor Red
        }
    } catch {
        Write-Host "  ✗ Error deploying to Firebase: $_" -ForegroundColor Red
    }
}

# Final summary
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Update Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
if ($RestartBackend -and $backendWasRunning) {
    Write-Host "  ✓ Backend restarted automatically" -ForegroundColor Green
} elseif ($RestartBackend) {
    Write-Host "  → Start backend: npm start" -ForegroundColor White
}

if ($shouldStashPop) {
    Write-Host "  → Check for conflicts: git status" -ForegroundColor White
}

Write-Host "  → Test backend: curl http://localhost:3000/health" -ForegroundColor White
Write-Host "  → Check ngrok is running (if using)" -ForegroundColor White

if (-not $DeployFirebase) {
    Write-Host ""
    Write-Host "To deploy to Firebase, run:" -ForegroundColor Cyan
    Write-Host "  firebase deploy --only hosting" -ForegroundColor White
}

Write-Host ""

