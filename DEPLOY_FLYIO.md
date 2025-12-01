# Deploying to Fly.io

Fly.io is great for apps that need system dependencies.

## Steps

### 1. Install Fly CLI
```bash
# Windows (PowerShell)
iwr https://fly.io/install.ps1 -useb | iex

# Or download from https://fly.io/docs/getting-started/installing-flyctl/
```

### 2. Login
```bash
fly auth login
```

### 3. Create fly.toml
Run in your project directory:
```bash
fly launch
```

Or create `fly.toml` manually:

```toml
app = "your-app-name"
primary_region = "iad"

[build]
  builder = "paketobuildpacks/builder:base"

[env]
  PORT = "3000"
  NODE_ENV = "production"

[[services]]
  internal_port = 3000
  protocol = "tcp"

  [[services.ports]]
    port = 80
    handlers = ["http"]
    force_https = true

  [[services.ports]]
    port = 443
    handlers = ["tls", "http"]

  [services.concurrency]
    type = "connections"
    hard_limit = 25
    soft_limit = 20

  [[services.http_checks]]
    interval = "10s"
    timeout = "2s"
    grace_period = "5s"
    method = "GET"
    path = "/health"
```

### 4. Create Dockerfile
Create `Dockerfile`:

```dockerfile
FROM node:18-slim

# Install system dependencies
RUN apt-get update && \
    apt-get install -y ffmpeg curl && \
    curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp && \
    chmod a+rx /usr/local/bin/yt-dlp && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
RUN npm install --production

COPY . .

EXPOSE 3000

CMD ["node", "server.js"]
```

### 5. Update server.js
```javascript
const PORT = process.env.PORT || 3000;
```

### 6. Deploy
```bash
fly deploy
```

### 7. Open Your App
```bash
fly open
```

## Pricing
- Free tier: 3 shared VMs
- Paid: $1.94/month per VM

## Advantages
- ✅ Great for system dependencies
- ✅ Global edge network
- ✅ Free tier available
- ✅ Fast deployments

