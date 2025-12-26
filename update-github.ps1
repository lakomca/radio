# Update GitHub Script
# Pushes local changes to GitHub repository

param(
    [string]$CommitMessage = "",
    [switch]$All = $false,
    [switch]$Force = $false,
    [string]$Branch = ""
)

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Update GitHub Repository" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$ErrorActionPreference = "Stop"

# Get current branch
try {
    $currentBranch = git rev-parse --abbrev-ref HEAD
    Write-Host "Current branch: $currentBranch" -ForegroundColor Gray
} catch {
    Write-Host "❌ Error: Not a git repository or git not found" -ForegroundColor Red
    exit 1
}

# Use specified branch or current branch
if ($Branch) {
    $targetBranch = $Branch
    Write-Host "Target branch: $targetBranch" -ForegroundColor Gray
} else {
    $targetBranch = $currentBranch
}

# Check if there are any changes
Write-Host "`nChecking git status..." -ForegroundColor Yellow
$status = git status --porcelain

if (-not $status) {
    Write-Host "✅ No changes to commit. Repository is up to date." -ForegroundColor Green
    exit 0
}

# Show changes
Write-Host "`nChanges detected:" -ForegroundColor Cyan
git status --short | ForEach-Object {
    $line = $_
    if ($line -match "^A ") {
        Write-Host "  + $line" -ForegroundColor Green
    } elseif ($line -match "^M ") {
        Write-Host "  ~ $line" -ForegroundColor Yellow
    } elseif ($line -match "^D ") {
        Write-Host "  - $line" -ForegroundColor Red
    } else {
        Write-Host "  ? $line" -ForegroundColor Gray
    }
}

# Get commit message
if (-not $CommitMessage) {
    Write-Host "`nEnter commit message (or press Enter for default):" -ForegroundColor Yellow
    $userInput = Read-Host
    if ($userInput) {
        $CommitMessage = $userInput
    } else {
        # Generate default commit message with timestamp
        $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
        $CommitMessage = "Update: $timestamp"
    }
}

Write-Host "`nCommit message: $CommitMessage" -ForegroundColor Gray

# Stage changes
Write-Host "`nStaging changes..." -ForegroundColor Yellow
try {
    if ($All) {
        git add -A
        Write-Host "  ✅ Staged all changes" -ForegroundColor Green
    } else {
        git add .
        Write-Host "  ✅ Staged changes" -ForegroundColor Green
    }
} catch {
    Write-Host "  ❌ Error staging changes: $_" -ForegroundColor Red
    exit 1
}

# Commit changes
Write-Host "`nCommitting changes..." -ForegroundColor Yellow
try {
    git commit -m $CommitMessage
    Write-Host "  ✅ Changes committed" -ForegroundColor Green
} catch {
    Write-Host "  ❌ Error committing: $_" -ForegroundColor Red
    Write-Host "  (This might be normal if there are no changes to commit)" -ForegroundColor Gray
    exit 1
}

# Check if remote exists
Write-Host "`nChecking remote repository..." -ForegroundColor Yellow
try {
    $remoteUrl = git remote get-url origin
    Write-Host "  Remote: $remoteUrl" -ForegroundColor Gray
} catch {
    Write-Host "  ❌ No remote 'origin' found" -ForegroundColor Red
    Write-Host "  Add remote with: git remote add origin <url>" -ForegroundColor Yellow
    exit 1
}

# Push to GitHub
Write-Host "`nPushing to GitHub..." -ForegroundColor Yellow
$pushSuccess = $false

try {
    if ($Force) {
        Write-Host "  ⚠️  Using --force flag (dangerous!)" -ForegroundColor Red
        $pushOutput = git push origin $targetBranch --force 2>&1
    } else {
        $pushOutput = git push origin $targetBranch 2>&1
    }
    
    # Check exit code immediately after git push
    $exitCode = $LASTEXITCODE
    $pushOutputString = if ($pushOutput -is [array]) { $pushOutput -join "`n" } else { $pushOutput.ToString() }
    
    # Check if push actually succeeded
    if ($exitCode -eq 0 -and $pushOutputString -notmatch "rejected|error|failed") {
        $pushSuccess = $true
        Write-Host "  ✅ Successfully pushed to GitHub!" -ForegroundColor Green
    } else {
        Write-Host "  ❌ Push failed!" -ForegroundColor Red
        if ($pushOutputString) {
            Write-Host $pushOutputString -ForegroundColor Yellow
        }
        
        if ($pushOutputString -match "rejected.*fetch first" -or $pushOutputString -match "Updates were rejected") {
            Write-Host "`n⚠️  Remote has changes you don't have locally." -ForegroundColor Yellow
            Write-Host "`nOptions:" -ForegroundColor Cyan
            Write-Host "  1. Pull and merge first (recommended):" -ForegroundColor White
            Write-Host "     git pull origin $targetBranch" -ForegroundColor Gray
            Write-Host "     .\update-github.ps1 -CommitMessage '$CommitMessage'" -ForegroundColor Gray
            Write-Host ""
            Write-Host "  2. Pull with rebase:" -ForegroundColor White
            Write-Host "     git pull origin $targetBranch --rebase" -ForegroundColor Gray
            Write-Host "     .\update-github.ps1 -CommitMessage '$CommitMessage'" -ForegroundColor Gray
            Write-Host ""
            Write-Host "  3. Use auto-update script (pulls, merges, then you can push):" -ForegroundColor White
            Write-Host "     .\auto-update.ps1" -ForegroundColor Gray
            Write-Host ""
            Write-Host "  4. Force push (⚠️  overwrites remote - dangerous!):" -ForegroundColor Red
            Write-Host "     .\update-github.ps1 -CommitMessage '$CommitMessage' -Force" -ForegroundColor Gray
        } else {
            Write-Host "`nPossible solutions:" -ForegroundColor Yellow
            Write-Host "  1. Check your internet connection" -ForegroundColor White
            Write-Host "  2. Verify GitHub credentials (git config --global user.name/email)" -ForegroundColor White
            Write-Host "  3. Pull latest changes first: git pull origin $targetBranch" -ForegroundColor White
            Write-Host "  4. If you need to force push: .\update-github.ps1 -CommitMessage '$CommitMessage' -Force" -ForegroundColor White
        }
        exit 1
    }
} catch {
    Write-Host "  ❌ Error pushing to GitHub: $_" -ForegroundColor Red
    Write-Host "`nPossible solutions:" -ForegroundColor Yellow
    Write-Host "  1. Check your internet connection" -ForegroundColor White
    Write-Host "  2. Verify GitHub credentials (git config --global user.name/email)" -ForegroundColor White
    Write-Host "  3. Pull latest changes first: git pull origin $targetBranch" -ForegroundColor White
    Write-Host "  4. If you need to force push: .\update-github.ps1 -CommitMessage '$CommitMessage' -Force" -ForegroundColor White
    exit 1
}

# Only show success if push succeeded
if ($pushSuccess) {
    # Show final status
    Write-Host "`nFinal status:" -ForegroundColor Cyan
    git status --short

    Write-Host "`n✅ Successfully updated GitHub repository!" -ForegroundColor Green
    Write-Host "   Repository: $remoteUrl" -ForegroundColor Gray
    Write-Host "   Branch: $targetBranch" -ForegroundColor Gray
    Write-Host ""
}

