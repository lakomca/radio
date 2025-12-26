# Update GitHub Guide

This guide explains how to use the `update-github.ps1` script to push your local changes to GitHub.

## Quick Start

```powershell
.\update-github.ps1
```

This will:
1. Check for changes
2. Show what files changed
3. Prompt for commit message
4. Stage, commit, and push to GitHub

## Usage Options

### Basic Usage

```powershell
# Interactive mode (prompts for commit message)
.\update-github.ps1

# With commit message
.\update-github.ps1 -CommitMessage "Your commit message here"

# Stage all files (including untracked)
.\update-github.ps1 -All

# Push to specific branch
.\update-github.ps1 -Branch main

# Force push (⚠️ dangerous - overwrites remote history)
.\update-github.ps1 -Force
```

### Examples

```powershell
# Update with descriptive message
.\update-github.ps1 -CommitMessage "Updated equalizer settings for 52 bars"

# Add BPM detection feature
.\update-github.ps1 -CommitMessage "Added BPM detection feature" -All

# Push to main branch
.\update-github.ps1 -CommitMessage "Fixed CORS issues" -Branch main

# Update everything with timestamp
.\update-github.ps1 -All
```

## What the Script Does

1. **Checks Git Status**
   - Shows current branch
   - Lists all changed files

2. **Shows Changes**
   - `+` = Added files (green)
   - `~` = Modified files (yellow)
   - `-` = Deleted files (red)
   - `?` = Untracked files (gray)

3. **Gets Commit Message**
   - Prompts you for a message, or
   - Uses default: "Update: YYYY-MM-DD HH:mm:ss"

4. **Stages Changes**
   - Adds all modified files to staging area

5. **Commits Changes**
   - Creates a commit with your message

6. **Pushes to GitHub**
   - Pushes to the current branch (or specified branch)
   - Shows success/error messages

## Common Scenarios

### Scenario 1: Quick Update
```powershell
.\update-github.ps1 -CommitMessage "Quick fix"
```

### Scenario 2: Feature Update
```powershell
.\update-github.ps1 -CommitMessage "Added BPM detection" -All
```

### Scenario 3: After Pulling Changes
If you've pulled changes and want to push your local updates:
```powershell
# First pull (if needed)
git pull origin main

# Then push your changes
.\update-github.ps1 -CommitMessage "Merged updates"
```

### Scenario 4: First Time Setup
If you haven't set up git config:
```powershell
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"
```

## Error Handling

### Error: "Not a git repository"
- Make sure you're in the project directory
- Run `git init` if needed

### Error: "No remote 'origin' found"
- Add remote: `git remote add origin https://github.com/username/repo.git`

### Error: "Failed to push"
- Check internet connection
- Verify GitHub credentials
- Pull latest changes first: `git pull origin main`
- Check if you have push permissions

### Error: "Updates were rejected"
- Someone else pushed changes
- Pull first: `git pull origin main`
- Resolve conflicts if any
- Then push again

## Comparison with auto-update.ps1

| Script | Purpose | Direction |
|--------|---------|-----------|
| `auto-update.ps1` | Pulls changes FROM GitHub | GitHub → Local |
| `update-github.ps1` | Pushes changes TO GitHub | Local → GitHub |

## Workflow Example

```powershell
# 1. Make changes to your code
# ... edit files ...

# 2. Test locally
npm start

# 3. Push to GitHub
.\update-github.ps1 -CommitMessage "Fixed equalizer sync issue"

# 4. (Optional) Deploy to Firebase
firebase deploy --only hosting
```

## Tips

1. **Write Descriptive Commit Messages**
   - Good: "Fixed BPM detection for low-volume tracks"
   - Bad: "fix"

2. **Commit Often**
   - Small, frequent commits are better than large ones
   - Makes it easier to track changes

3. **Check Status First**
   ```powershell
   git status
   ```

4. **Review Changes**
   ```powershell
   git diff
   ```

5. **Use -All Sparingly**
   - Only when you want to include untracked files
   - Be careful not to commit sensitive files

## Security Notes

⚠️ **Never commit:**
- `.env` files with secrets
- API keys
- Passwords
- Personal information

✅ **Always commit:**
- Code changes
- Configuration files (without secrets)
- Documentation

## Troubleshooting

### Script won't run
- Make sure PowerShell execution policy allows scripts:
  ```powershell
  Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
  ```

### Authentication issues
- Use GitHub Personal Access Token
- Or use SSH keys instead of HTTPS

### Merge conflicts
- Pull changes first: `git pull origin main`
- Resolve conflicts manually
- Then push: `.\update-github.ps1`

## Related Scripts

- `auto-update.ps1` - Pulls updates from GitHub
- `update-github.ps1` - Pushes updates to GitHub

## Need Help?

Check git status manually:
```powershell
git status
git log --oneline -5
```

View remote repository:
```powershell
git remote -v
```

