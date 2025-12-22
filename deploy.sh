#!/bin/bash

# Firebase + Cloud Run Deployment Script
# Make sure you have gcloud and firebase CLI installed

PROJECT_ID="myradym-test"
REGION="us-central1"
SERVICE_NAME="radio-backend"

echo "🚀 Starting deployment..."

# Step 1: Build and deploy backend to Cloud Run
echo "📦 Building Docker image..."
gcloud builds submit --tag gcr.io/$PROJECT_ID/$SERVICE_NAME

if [ $? -ne 0 ]; then
    echo "❌ Docker build failed!"
    exit 1
fi

echo "☁️  Deploying to Cloud Run..."
gcloud run deploy $SERVICE_NAME \
  --image gcr.io/$PROJECT_ID/$SERVICE_NAME \
  --platform managed \
  --region $REGION \
  --allow-unauthenticated \
  --memory 2Gi \
  --cpu 2 \
  --timeout 3600 \
  --min-instances 0 \
  --max-instances 10 \
  --set-env-vars PORT=8080

if [ $? -ne 0 ]; then
    echo "❌ Cloud Run deployment failed!"
    exit 1
fi

# Step 2: Deploy frontend to Firebase Hosting
echo "🔥 Deploying frontend to Firebase Hosting..."
firebase deploy --only hosting

if [ $? -ne 0 ]; then
    echo "❌ Firebase deployment failed!"
    exit 1
fi

echo "✅ Deployment complete!"
echo ""
echo "📝 Next steps:"
echo "1. Get your Cloud Run URL:"
echo "   gcloud run services describe $SERVICE_NAME --region $REGION --format 'value(status.url)'"
echo ""
echo "2. Get your Firebase Hosting URL:"
echo "   firebase hosting:sites:list"
echo ""
echo "3. Update firebase.json if your Cloud Run URL changed"



