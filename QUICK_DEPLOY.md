# Quick Deploy Guide

Your project is ready to deploy! Here are the easiest options:

## Option 1: Railway (Recommended - Easiest)

Your project already has Railway configuration files ready!

### Steps:
1. Go to https://railway.app
2. Sign up/Login with your GitHub account
3. Click "New Project"
4. Select "Deploy from GitHub repo"
5. Choose your repository: `lakomca/radio`
6. Railway will automatically:
   - Detect Node.js
   - Install dependencies (ffmpeg, yt-dlp via nixpacks.toml)
   - Deploy your app
7. Your app will be live at: `https://your-app-name.up.railway.app`

**That's it!** Railway handles everything automatically.

---

## Option 2: Render

1. Go to https://render.com
2. Sign up/Login with GitHub
3. Click "New +" → "Web Service"
4. Connect your GitHub repository: `lakomca/radio`
5. Settings:
   - **Build Command**: `npm install`
   - **Start Command**: `node server.js`
   - **Environment**: Node
6. Click "Create Web Service"
7. Your app will be live at: `https://your-app-name.onrender.com`

**Note**: Render may need additional configuration for ffmpeg/yt-dlp. Consider using Dockerfile instead.

---

## Option 3: Using Railway CLI (If you prefer CLI)

1. Open terminal in this directory
2. Run: `railway login` (opens browser)
3. Run: `railway init` (creates new project or links existing)
4. Run: `railway up` (deploys)

---

## Option 4: Docker Deployment

Your project has a Dockerfile ready! You can deploy to:
- Railway (supports Docker)
- Render (supports Docker)
- Fly.io
- DigitalOcean App Platform
- Any Docker-compatible platform

---

## After Deployment

Once deployed, your radio app will be accessible at the provided URL. The frontend uses relative URLs, so it will work automatically on any domain!

### Test Your Deployment:
- Visit your deployment URL
- Try loading a YouTube URL
- Try searching for music

---

## Need Help?

- Railway Docs: https://docs.railway.app
- Render Docs: https://render.com/docs
- Your project already has detailed guides in:
  - `DEPLOY_RAILWAY.md`
  - `DEPLOY_RENDER.md`
  - `DEPLOY.md` (Firebase)



