# Deploying to Railway

Railway is an excellent choice for Node.js apps with system dependencies like ffmpeg.

## Steps

### 1. Create Railway Account
- Go to https://railway.app
- Sign up with GitHub

### 2. Install Railway CLI (Optional)
```bash
npm install -g @railway/cli
railway login
```

### 3. Create railway.json
Create this file in your project root:

```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "startCommand": "node server.js",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

### 4. Create Procfile (Alternative)
Alternatively, create a `Procfile`:
```
web: node server.js
```

### 5. Update server.js for Railway
Railway provides a PORT environment variable. Update your server.js:

```javascript
const PORT = process.env.PORT || 3000;
```

### 6. Create railway.toml (Optional)
```toml
[build]
builder = "nixpacks"

[deploy]
startCommand = "node server.js"
```

### 7. Deploy via GitHub
1. Push your code to GitHub
2. Go to Railway dashboard
3. Click "New Project"
4. Select "Deploy from GitHub repo"
5. Select your repository
6. Railway will auto-detect Node.js and deploy

### 8. Add Environment Variables
In Railway dashboard:
- Go to your project → Variables
- Add any needed environment variables

### 9. Install System Dependencies
Railway uses Nixpacks which can install system packages. Create `nixpacks.toml`:

```toml
[phases.setup]
nixPkgs = ["nodejs-18_x", "ffmpeg", "python3"]

[phases.install]
cmds = [
  "pip3 install yt-dlp",
  "npm install"
]
```

Or create a `nixpacks.toml` with:

```toml
[phases.setup]
nixPkgs = ["nodejs-18_x", "ffmpeg"]

[phases.install]
cmds = [
  "curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp",
  "chmod a+rx /usr/local/bin/yt-dlp",
  "npm install"
]
```

### 10. Update Frontend URLs
After deployment, Railway gives you a URL. Update `public/app.js` if needed, or use relative URLs (they should work).

## Pricing
- Free tier: $5 credit/month
- Pay-as-you-go after that

## Advantages
- ✅ Easy deployment
- ✅ Supports system dependencies
- ✅ Auto-deploy from GitHub
- ✅ Free tier available

