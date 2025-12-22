# Firebase Deployment Guide

This guide shows how to deploy your radio app using **Firebase Hosting** (for frontend) and **Google Cloud Run** (for backend with FFmpeg/yt-dlp).

## Why Cloud Run?

- ✅ Supports Docker (FFmpeg/yt-dlp)
- ✅ Long-running processes (up to 60 minutes)
- ✅ Scales automatically
- ✅ Pay per use

## Prerequisites

1. **Firebase CLI**: Install if not already installed
   ```bash
   npm install -g firebase-tools
   ```

2. **Google Cloud CLI** (gcloud): Install if not already installed
   - macOS: `brew install google-cloud-sdk`
   - Or download from: https://cloud.google.com/sdk/docs/install

3. **Docker**: For building container images
   - Download from: https://www.docker.com/get-started

## Step 1: Set Up Firebase Project

1. Login to Firebase:
   ```bash
   firebase login
   ```

2. Verify your project (already configured):
   ```bash
   firebase use
   ```

3. If needed, set your project:
   ```bash
   firebase use myradym-test
   ```

## Step 2: Update firebase.json

Your `firebase.json` is configured for Functions, but we'll use Cloud Run. Update it:

```json
{
  "hosting": {
    "public": "public",
    "ignore": [
      "firebase.json",
      "**/.*",
      "**/node_modules/**"
    ],
    "rewrites": [
      {
        "source": "/api/**",
        "run": {
          "serviceId": "radio-backend",
          "region": "us-central1"
        }
      },
      {
        "source": "/stream",
        "run": {
          "serviceId": "radio-backend",
          "region": "us-central1"
        }
      },
      {
        "source": "/radio-stream",
        "run": {
          "serviceId": "radio-backend",
          "region": "us-central1"
        }
      },
      {
        "source": "/search",
        "run": {
          "serviceId": "radio-backend",
          "region": "us-central1"
        }
      },
      {
        "source": "**",
        "destination": "/index.html"
      }
    ]
  }
}
```

**Note**: Replace `us-central1` with your preferred region (us-central1, us-east1, europe-west1, etc.)

## Step 3: Set Up Google Cloud Project

1. Link Firebase to Cloud project (if not already):
   ```bash
   firebase use --add
   ```

2. Enable required APIs:
   ```bash
   gcloud services enable cloudbuild.googleapis.com
   gcloud services enable run.googleapis.com
   gcloud services enable artifactregistry.googleapis.com
   ```

3. Set your project:
   ```bash
   gcloud config set project myradym-test
   ```

## Step 4: Build and Deploy to Cloud Run

1. **Build the Docker image**:
   ```bash
   gcloud builds submit --tag gcr.io/myradym-test/radio-backend
   ```
   (Replace `myradym-test` with your project ID)

2. **Deploy to Cloud Run**:
   ```bash
   gcloud run deploy radio-backend \
     --image gcr.io/myradym-test/radio-backend \
     --platform managed \
     --region us-central1 \
     --allow-unauthenticated \
     --memory 2Gi \
     --cpu 2 \
     --timeout 3600 \
     --min-instances 0 \
     --max-instances 10 \
     --set-env-vars PORT=8080
   ```

   **Important flags:**
   - `--memory 2Gi`: Enough memory for FFmpeg
   - `--cpu 2`: Better performance for transcoding
   - `--timeout 3600`: 1 hour timeout for long streams
   - `--allow-unauthenticated`: Allow public access
   - `--min-instances 0`: Scale to zero when not in use (saves money)
   - `--max-instances 10`: Maximum concurrent instances

3. **Note the Cloud Run URL** from the output (e.g., `https://radio-backend-xxxxx.run.app`)

## Step 5: Update server.js for Cloud Run

Cloud Run sets the PORT environment variable. Your server.js should already handle this:

```javascript
const PORT = process.env.PORT || 3000;
```

Make sure it listens on `0.0.0.0`:
```javascript
app.listen(PORT, '0.0.0.0', () => {
  // ...
});
```

## Step 6: Update Frontend to Use Cloud Run

Update `public/app.js` to use Cloud Run URL for API calls, OR use Firebase Hosting rewrites (which we configured in Step 2).

If using rewrites, your existing code should work as-is since rewrites forward requests to Cloud Run.

## Step 7: Deploy Frontend to Firebase Hosting

```bash
firebase deploy --only hosting
```

## Step 8: Test

1. Visit your Firebase Hosting URL (shown after deployment)
2. Test streaming functionality
3. Check Cloud Run logs if issues:
   ```bash
   gcloud run services logs read radio-backend --region us-central1
   ```

## Continuous Deployment (Optional)

### Option A: Manual Deploy Script

Create `deploy.sh`:
```bash
#!/bin/bash

# Deploy backend to Cloud Run
echo "Deploying backend to Cloud Run..."
gcloud builds submit --tag gcr.io/myradym-test/radio-backend
gcloud run deploy radio-backend \
  --image gcr.io/myradym-test/radio-backend \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --memory 2Gi \
  --cpu 2 \
  --timeout 3600

# Deploy frontend to Firebase Hosting
echo "Deploying frontend to Firebase Hosting..."
firebase deploy --only hosting

echo "Deployment complete!"
```

Make it executable:
```bash
chmod +x deploy.sh
```

### Option B: GitHub Actions

Create `.github/workflows/deploy.yml`:
```yaml
name: Deploy to Firebase

on:
  push:
    branches: [ main ]

jobs:
  deploy-backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: google-github-actions/setup-gcloud@v1
        with:
          project_id: myradym-test
          service_account_key: ${{ secrets.GCP_SA_KEY }}
          export_default_credentials: true
      
      - name: Build and Deploy
        run: |
          gcloud builds submit --tag gcr.io/myradym-test/radio-backend
          gcloud run deploy radio-backend \
            --image gcr.io/myradym-test/radio-backend \
            --platform managed \
            --region us-central1 \
            --allow-unauthenticated \
            --memory 2Gi \
            --cpu 2 \
            --timeout 3600

  deploy-frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - name: Install Firebase CLI
        run: npm install -g firebase-tools
      - name: Deploy to Firebase
        run: firebase deploy --only hosting
        env:
          FIREBASE_TOKEN: ${{ secrets.FIREBASE_TOKEN }}
```

## Environment Variables

If you need environment variables for Cloud Run:

```bash
gcloud run services update radio-backend \
  --update-env-vars "KEY1=value1,KEY2=value2" \
  --region us-central1
```

## Monitoring

- **Cloud Run Console**: https://console.cloud.google.com/run
- **Firebase Hosting Console**: https://console.firebase.google.com/project/myradym-test/hosting

## Cost Estimation

- **Firebase Hosting**: Free tier (10GB storage, 360MB/day transfer)
- **Cloud Run**: Pay per use (~$0.40 per vCPU-hour, ~$0.05 per GB-hour)
- **Estimated monthly cost**: $10-50 depending on usage

## Troubleshooting

### Backend not responding
- Check Cloud Run logs: `gcloud run services logs read radio-backend --region us-central1`
- Verify service is running: `gcloud run services describe radio-backend --region us-central1`

### CORS errors
- Ensure Cloud Run allows CORS in your Express app (you already have this)

### Timeout issues
- Increase timeout: `gcloud run services update radio-backend --timeout 3600 --region us-central1`

### FFmpeg not found
- Verify Dockerfile includes FFmpeg installation
- Check Cloud Run logs for errors

## Quick Deploy Commands

```bash
# Deploy everything
./deploy.sh

# Or separately:
gcloud builds submit --tag gcr.io/myradym-test/radio-backend && \
gcloud run deploy radio-backend --image gcr.io/myradym-test/radio-backend --platform managed --region us-central1 --allow-unauthenticated --memory 2Gi --cpu 2 --timeout 3600

firebase deploy --only hosting
```



