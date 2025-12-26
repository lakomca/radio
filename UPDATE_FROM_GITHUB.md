# Updating Your Local Backend from GitHub

This guide shows you how to pull updates from GitHub and apply them to your local backend server.

## Quick Update

```powershell
# 1. Stop your backend server (Ctrl+C in the terminal running npm start)

# 2. Pull latest changes from GitHub
git pull origin main

# 3. Install any new dependencies (if package.json changed)
npm install

# 4. Restart backend server
npm start
```

## Step-by-Step Guide

### Step 1: Check Current Status

```powershell
# See what files have changed locally
git status

# See what branch you're on
git branch
```

### Step 2: Save Your Local Changes (If Any)

If you have local changes you want to keep:

**Option A: Commit and push your changes first**
```powershell
git add .
git commit -m "Your commit message"
git push origin main
git pull origin main
```

**Option B: Stash your changes (save for later)**
```powershell
git stash
git pull origin main
git stash pop  # Reapply your changes after pull
```

**Option C: Discard local changes (if you don't need them)**
```powershell
git reset --hard
git pull origin main
```

### Step 3: Pull Updates

```powershell
# Pull latest changes from GitHub
git pull origin main

# Or specify the branch:
git pull origin main
```

### Step 4: Handle Merge Conflicts (If Any)

If there are conflicts:
```powershell
# Git will show conflicted files
# Edit the files to resolve conflicts
# Then:
git add .
git commit -m "Resolved merge conflicts"
```

### Step 5: Update Dependencies

```powershell
# Install any new packages
npm install

# Or if package-lock.json changed:
npm ci
```

### Step 6: Restart Backend Server

```powershell
# Stop current server (Ctrl+C)
# Then restart:
npm start
```

## Automated Update Script

Create `update-from-github.ps1`:

```powershell
# Update from GitHub Script
Write-Host "Updating from GitHub..." -ForegroundColor Cyan

# Check if backend is running
$backendRunning = Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue
if ($backendRunning) {
    Write-Host "WARNING: Backend server is running on port 3000" -ForegroundColor Yellow
    Write-Host "Please stop it (Ctrl+C) before updating" -ForegroundColor Yellow
    $continue = Read-Host "Continue anyway? (y/n)"
    if ($continue -ne 'y') {
        exit 1
    }
}

# Pull updates
Write-Host "`nPulling latest changes from GitHub..." -ForegroundColor Green
git pull origin main

if ($LASTEXITCODE -ne 0) {
    Write-Host "Error pulling from GitHub" -ForegroundColor Red
    exit 1
}

# Install dependencies
Write-Host "`nInstalling dependencies..." -ForegroundColor Green
npm install

# Show summary
Write-Host "`n✅ Update complete!" -ForegroundColor Green
Write-Host "`nNext steps:" -ForegroundColor Cyan
Write-Host "1. Review any changes: git log" -ForegroundColor White
Write-Host "2. Restart backend: npm start" -ForegroundColor White
Write-Host "3. Test: curl http://localhost:3000/health" -ForegroundColor White
```

## Important Files to Check After Update

After pulling updates, check these files that might need reconfiguration:

1. **`.env`** - Environment variables (may need to recreate)
2. **`public/config.js`** - Backend URL configuration
3. **`server.js`** - CORS configuration (should be fine)
4. **`firebase.json`** - Firebase hosting config

## Configuration Files That Should NOT Be Committed

These files contain local/private settings and should be in `.gitignore`:

- `.env` - Your environment variables
- `update-duckdns.ps1` - Contains your DuckDNS token
- Any local configuration files

## Workflow for Regular Updates

```powershell
# Daily/weekly update routine:
git pull origin main
npm install
npm start
```

## If You Have Local Changes

### Scenario 1: You modified config files locally

If you changed `public/config.js` or `.env` locally:

1. **Don't commit these** (they're local configs)
2. **Use git stash** to save them:
   ```powershell
   git stash
   git pull origin main
   git stash pop
   ```
3. **Manually merge** any changes if needed

### Scenario 2: You want to keep your local changes

```powershell
# Create a backup branch
git checkout -b local-backup
git add .
git commit -m "Backup local changes"
git checkout main
git pull origin main
```

## Troubleshooting

### "Your local changes would be overwritten"

```powershell
# Save your changes
git stash

# Pull updates
git pull origin main

# Reapply your changes
git stash pop
```

### "Merge conflict"

```powershell
# See conflicted files
git status

# Edit files to resolve conflicts
# Look for <<<<<<< markers

# After resolving:
git add .
git commit -m "Resolved conflicts"
```

### "npm install fails"

```powershell
# Clear cache and reinstall
npm cache clean --force
rm -r node_modules
npm install
```

## Best Practices

1. **Always stop backend** before pulling updates
2. **Check git status** before pulling to see local changes
3. **Backup important configs** (like `.env`) before updating
4. **Test after update** - restart backend and verify it works
5. **Keep ngrok running** - don't restart it unless needed (URL changes)

## Quick Reference

```powershell
# Full update process:
git pull origin main          # Pull updates
npm install                  # Update dependencies
npm start                    # Restart backend

# With local changes:
git stash                    # Save local changes
git pull origin main         # Pull updates
git stash pop                # Reapply local changes
npm install                  # Update dependencies
npm start                    # Restart backend
```

## After Update Checklist

- [ ] Backend starts without errors
- [ ] Health check works: `curl http://localhost:3000/health`
- [ ] Config files still correct (`public/config.js`, `.env`)
- [ ] ngrok still running (if using)
- [ ] Test Firebase site connection
- [ ] Test genre stations loading

---

**Tip**: Set up a scheduled task to pull updates automatically, or create a reminder to update weekly.

