# Setting Up GitHub Repository

## Step 1: Create GitHub Repository

1. Go to https://github.com/new
2. Repository name: `radio` (or any name you prefer)
3. Description: "Radio website streaming music from YouTube"
4. Choose Public or Private
5. **Don't** initialize with README, .gitignore, or license (we already have these)
6. Click "Create repository"

## Step 2: Connect Your Local Repository

After creating the repository, GitHub will show you commands. Use these:

```powershell
# Add remote (replace YOUR_USERNAME with your GitHub username)
git remote add origin https://github.com/YOUR_USERNAME/radio.git

# Push to GitHub
git branch -M main
git push -u origin main
```

## Step 3: Access from Another Device

On your other device:

```bash
# Clone the repository
git clone https://github.com/YOUR_USERNAME/radio.git
cd radio

# Install dependencies
npm install

# Start the server
npm start
```

Then open the folder in Cursor!

## Quick Commands Reference

**Push changes:**
```powershell
git add .
git commit -m "Your commit message"
git push
```

**Pull changes (on other device):**
```bash
git pull
```

**Check status:**
```powershell
git status
```

