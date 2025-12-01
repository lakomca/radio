# Railway Quick Start Guide

## Step 1: Push to GitHub

First, make sure your code is on GitHub:

```powershell
# If you haven't initialized git yet
git init
git add .
git commit -m "Initial commit"

# Create a new repository on GitHub, then:
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git push -u origin main
```

## Step 2: Sign Up for Railway

1. Go to https://railway.app
2. Click "Start a New Project"
3. Sign up with GitHub (recommended)

## Step 3: Deploy

1. In Railway dashboard, click **"New Project"**
2. Select **"Deploy from GitHub repo"**
3. Select your repository
4. Railway will automatically:
   - Detect Node.js
   - Install dependencies
   - Install ffmpeg and yt-dlp (via nixpacks.toml)
   - Deploy your app

## Step 4: Get Your URL

After deployment:
1. Railway will give you a URL like: `https://your-app.up.railway.app`
2. Click on your service → Settings → Generate Domain
3. Your app is live!

## Step 5: Environment Variables (Optional)

If you need any environment variables:
1. Go to your service → Variables
2. Add any needed variables
3. Railway will redeploy automatically

## What Railway Does Automatically

✅ Detects Node.js from `package.json`
✅ Installs npm dependencies
✅ Installs ffmpeg (from nixpacks.toml)
✅ Installs yt-dlp (from nixpacks.toml)
✅ Runs `node server.js` (from Procfile)
✅ Provides PORT environment variable
✅ Auto-deploys on git push (if enabled)

## Pricing

- **Free**: $5 credit/month
- **After free tier**: Pay-as-you-go (~$5-10/month for small apps)

## Troubleshooting

### Check Logs
In Railway dashboard → Your service → Deployments → Click on deployment → View logs

### Common Issues

1. **Build fails**: Check that `package.json` exists and has correct dependencies
2. **App crashes**: Check logs for errors
3. **Port issues**: Make sure server.js uses `process.env.PORT`

## Next Steps

After deployment:
- Your app will be live at Railway's URL
- You can add a custom domain in Settings
- Enable auto-deploy from GitHub for automatic updates

## Need Help?

- Railway Docs: https://docs.railway.app
- Railway Discord: https://discord.gg/railway

