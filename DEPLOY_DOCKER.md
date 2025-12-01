# Deploying with Docker

Deploy anywhere Docker is supported (DigitalOcean, AWS, Azure, VPS, etc.)

## Steps

### 1. Create Dockerfile
Create `Dockerfile` in project root:

```dockerfile
FROM node:18-slim

# Install system dependencies
RUN apt-get update && \
    apt-get install -y ffmpeg curl && \
    curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp && \
    chmod a+rx /usr/local/bin/yt-dlp && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install --production

# Copy application files
COPY . .

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start application
CMD ["node", "server.js"]
```

### 2. Create .dockerignore
Create `.dockerignore`:

```
node_modules
npm-debug.log
.git
.gitignore
.env
*.md
.DS_Store
firebase.json
.firebaserc
functions/
```

### 3. Build Docker Image
```bash
docker build -t radio-stream .
```

### 4. Run Locally
```bash
docker run -p 3000:3000 radio-stream
```

### 5. Deploy Options

#### Option A: DigitalOcean App Platform
1. Push code to GitHub
2. Go to https://cloud.digitalocean.com/apps
3. Create App → GitHub
4. Select repository
5. DigitalOcean will detect Dockerfile
6. Deploy!

#### Option B: AWS ECS/Fargate
1. Build and push to ECR
2. Create ECS task definition
3. Deploy service

#### Option C: Google Cloud Run
```bash
# Install gcloud CLI
gcloud builds submit --tag gcr.io/PROJECT-ID/radio-stream
gcloud run deploy --image gcr.io/PROJECT-ID/radio-stream --platform managed
```

#### Option D: Azure Container Instances
```bash
az acr build --registry myregistry --image radio-stream .
az container create --resource-group mygroup --name radio-stream --image myregistry.azurecr.io/radio-stream
```

#### Option E: VPS (DigitalOcean Droplet, Linode, etc.)
```bash
# On your VPS
git clone your-repo
cd radio
docker build -t radio-stream .
docker run -d -p 80:3000 --name radio --restart unless-stopped radio-stream
```

### 6. Use Docker Compose (Optional)
Create `docker-compose.yml`:

```yaml
version: '3.8'

services:
  radio:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - PORT=3000
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "node", "-e", "require('http').get('http://localhost:3000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"]
      interval: 30s
      timeout: 3s
      retries: 3
```

Run with:
```bash
docker-compose up -d
```

## Advantages
- ✅ Works anywhere Docker runs
- ✅ Consistent environment
- ✅ Easy to scale
- ✅ Portable

