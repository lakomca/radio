# Auto-Update Script Guide

The `auto-update.ps1` script automatically pulls updates from GitHub, merges changes, and updates your backend server.

## Quick Usage

### Basic Update (Restarts Backend)
```powershell
.\auto-update.ps1
```

### Update Without Restarting Backend
```powershell
.\auto-update.ps1 -RestartBackend:$false
```

### Update and Deploy to Firebase
```powershell
.\auto-update.ps1 -DeployFirebase
```

### Force Update (Auto-handles everything)
```powershell
.\auto-update.ps1 -Force
```

## What the Script Does

1. ✅ **Checks backend status** - Stops if running
2. ✅ **Handles local changes** - Stashes, commits, or discards
3. ✅ **Fetches from GitHub** - Gets latest changes
4. ✅ **Pulls updates** - Merges with local code
5. ✅ **Reapplies local changes** - If stashed
6. ✅ **Updates dependencies** - Runs `npm install`
7. ✅ **Shows summary** - What changed
8. ✅ **Restarts backend** - Automatically (optional)
9. ✅ **Deploys to Firebase** - Optional

## Common Scenarios

### Scenario 1: Simple Update (No Local Changes)

```powershell
.\auto-update.ps1
```

The script will:
- Pull updates
- Install dependencies
- Restart backend

### Scenario 2: You Have Local Config Changes

If you modified `public/config.js` or `.env`:

```powershell
.\auto-update.ps1
# Choose option 1 (Stash changes)
```

Your local configs will be preserved.

### Scenario 3: You Want to Commit Your Changes First

```powershell
# Commit your changes
git add .
git commit -m "My local changes"
git push origin main

# Then update
.\auto-update.ps1
```

### Scenario 4: Full Update + Deploy

```powershell
.\auto-update.ps1 -DeployFirebase
```

This will:
- Update from GitHub
- Restart backend
- Deploy frontend to Firebase

## Automation Options

### Option 1: Scheduled Task (Windows)

Set up Task Scheduler to run automatically:

1. Open Task Scheduler (`taskschd.msc`)
2. Create Basic Task
3. Name: "Auto-Update Radio Backend"
4. Trigger: Daily at 3 AM (or your preferred time)
5. Action: Start a program
6. Program: `powershell.exe`
7. Arguments: `-ExecutionPolicy Bypass -File "C:\Users\msi\Downloads\radio\auto-update.ps1" -Force`
8. Start in: `C:\Users\msi\Downloads\radio`

### Option 2: GitHub Actions (Auto-Deploy)

Create `.github/workflows/auto-update.yml`:

```yaml
name: Auto-Update Backend

on:
  push:
    branches: [ main ]
  schedule:
    - cron: '0 3 * * *'  # Daily at 3 AM

jobs:
  update:
    runs-on: self-hosted  # Your Windows machine
    steps:
      - uses: actions/checkout@v3
      - name: Run auto-update
        run: powershell -ExecutionPolicy Bypass -File .\auto-update.ps1 -Force
```

### Option 3: Manual Trigger Script

Create `update-now.ps1`:

```powershell
# Quick update trigger
.\auto-update.ps1 -Force
```

## Script Parameters

| Parameter | Description | Default |
|-----------|-------------|---------|
| `-RestartBackend` | Restart backend after update | `$true` |
| `-DeployFirebase` | Deploy to Firebase after update | `$false` |
| `-Force` | Auto-handle all prompts | `$false` |

## Examples

### Daily Update (Scheduled)
```powershell
.\auto-update.ps1 -Force
```

### Update After GitHub Push
```powershell
.\auto-update.ps1 -DeployFirebase
```

### Update Without Restarting
```powershell
.\auto-update.ps1 -RestartBackend:$false
```

## Troubleshooting

### "Backend won't stop"

The script tries to stop the backend automatically. If it fails:
1. Manually stop: Press `Ctrl+C` in backend terminal
2. Or kill process: `Get-Process node | Stop-Process -Force`

### "Merge conflicts"

If there are conflicts:
1. The script will show conflicted files
2. Edit files to resolve conflicts
3. Run: `git add . && git commit -m "Resolved conflicts"`
4. Run script again

### "npm install fails"

```powershell
# Clear cache and retry
npm cache clean --force
Remove-Item -Recurse -Force node_modules
npm install
```

### "Config files overwritten"

If your local configs were overwritten:
1. Check git stash: `git stash list`
2. Restore: `git stash show -p stash@{0}` (review)
3. Apply: `git stash pop`

Or recreate from backups:
- `public/config.js` - Update backend URL
- `.env` - Recreate environment variables

## Best Practices

1. **Backup configs before updating**
   ```powershell
   Copy-Item public\config.js public\config.js.backup
   Copy-Item .env .env.backup
   ```

2. **Review changes before restarting**
   ```powershell
   git log --oneline -10
   ```

3. **Test after update**
   ```powershell
   curl http://localhost:3000/health
   ```

4. **Keep ngrok running separately**
   - Don't restart ngrok (URL changes)
   - Only restart backend

5. **Use Force mode for automation**
   ```powershell
   .\auto-update.ps1 -Force
   ```

## Integration with GitHub Webhooks

For automatic updates when you push to GitHub:

1. **Install webhook receiver** (e.g., webhook server)
2. **Set up webhook** in GitHub repo settings
3. **Configure webhook** to call `auto-update.ps1`

Or use simpler approach:
- Set up scheduled task to check for updates
- Or manually run after pushing to GitHub

## Quick Reference

```powershell
# Basic update
.\auto-update.ps1

# Force update (no prompts)
.\auto-update.ps1 -Force

# Update + Deploy
.\auto-update.ps1 -DeployFirebase

# Update without restart
.\auto-update.ps1 -RestartBackend:$false

# Check what would change
git fetch origin main
git log HEAD..origin/main
```

## After Update Checklist

- [ ] Backend starts without errors
- [ ] Health check works: `curl http://localhost:3000/health`
- [ ] Config files still correct (`public/config.js`, `.env`)
- [ ] ngrok still running (if using)
- [ ] Test Firebase site connection
- [ ] Test genre stations loading
- [ ] Check backend logs for errors

---

**Tip**: Set up a scheduled task to run `auto-update.ps1 -Force` daily for automatic updates!

