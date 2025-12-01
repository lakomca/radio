# Deploying to Render

Render offers free hosting for Node.js apps.

## Steps

### 1. Create Render Account
- Go to https://render.com
- Sign up with GitHub

### 2. Update server.js for Render
Render provides a PORT environment variable:

```javascript
const PORT = process.env.PORT || 3000;
```

### 3. Create render.yaml (Optional)
Create `render.yaml` in project root:

```yaml
services:
  - type: web
    name: radio-stream
    env: node
    buildCommand: npm install
    startCommand: node server.js
    envVars:
      - key: NODE_ENV
        value: production
```

### 4. Deploy via GitHub
1. Push code to GitHub
2. Go to Render dashboard
3. Click "New +" → "Web Service"
4. Connect your GitHub repository
5. Configure:
   - **Name**: radio-stream
   - **Environment**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `node server.js`
   - **Plan**: Free (or paid)

### 5. Install System Dependencies
Create a `Dockerfile` for better control:

```dockerfile
FROM node:18

# Install ffmpeg and yt-dlp
RUN apt-get update && \
    apt-get install -y ffmpeg curl && \
    curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp && \
    chmod a+rx /usr/local/bin/yt-dlp && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 3000

CMD ["node", "server.js"]
```

Then in Render:
- Go to your service → Settings
- Change "Docker" to enabled
- Save

### 6. Alternative: Build Script
Create `build.sh`:

```bash
#!/bin/bash
apt-get update
apt-get install -y ffmpeg curl
curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp
chmod a+rx /usr/local/bin/yt-dlp
npm install
```

Set as build command in Render.

## Pricing
- Free tier: Available (with limitations)
- Paid: Starts at $7/month

## Advantages
- ✅ Free tier available
- ✅ Easy GitHub integration
- ✅ Supports Docker
- ✅ Custom domains

## Limitations (Free Tier)
- Spins down after 15 minutes of inactivity
- Slower cold starts

