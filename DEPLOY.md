# Deploying to Firebase

This guide will help you deploy your radio website to Firebase Hosting and Functions.

## Prerequisites

1. **Firebase CLI** - Install it globally:
   ```bash
   npm install -g firebase-tools
   ```

2. **Firebase Account** - Sign up at https://firebase.google.com

3. **Node.js** - Version 18 or higher

## Setup Steps

### 1. Login to Firebase

```bash
firebase login
```

### 2. Initialize Firebase Project

```bash
firebase init
```

When prompted:
- Select **Hosting** and **Functions**
- Choose an existing Firebase project or create a new one
- For hosting:
  - Public directory: `public`
  - Single-page app: **Yes**
  - Set up automatic builds: **No**
- For functions:
  - Language: **JavaScript**
  - ESLint: **No** (or Yes if you want)
  - Install dependencies: **Yes**

### 3. Update Project ID

Edit `.firebaserc` and replace `your-project-id` with your actual Firebase project ID.

### 4. Install Function Dependencies

```bash
cd functions
npm install
cd ..
```

### 5. Important Note About Firebase Functions

⚠️ **Firebase Functions Limitations:**

Firebase Functions run in a Linux environment and **do not have ffmpeg or yt-dlp pre-installed**. You have two options:

#### Option A: Use External API (Recommended for Production)

For production, consider using a service that provides YouTube audio streaming APIs, or deploy your Node.js server separately (e.g., Railway, Render, Heroku).

#### Option B: Install Dependencies in Functions (Advanced)

You can try to install ffmpeg and yt-dlp in the Functions environment, but this is complex and may hit size limits.

### 6. Deploy

Deploy everything:
```bash
firebase deploy
```

Or deploy separately:
```bash
# Deploy only hosting (frontend)
firebase deploy --only hosting

# Deploy only functions (backend)
firebase deploy --only functions
```

## Alternative: Deploy Frontend Only

If you want to keep your Node.js server running locally or on another platform:

1. **Deploy only the frontend:**
   ```bash
   firebase deploy --only hosting
   ```

2. **Update the API URLs in `public/app.js`:**
   - Change `/stream` to `http://your-server-url/stream`
   - Change `/search` to `http://your-server-url/search`

## Environment Variables

If you need environment variables for Firebase Functions, use:

```bash
firebase functions:config:set some.key="value"
```

Then access them in `functions/index.js`:
```javascript
const config = functions.config();
```

## Troubleshooting

- **Functions timeout**: Increase timeout in `firebase.json`:
  ```json
  "functions": {
    "timeout": "540s"
  }
  ```

- **Memory issues**: Increase memory in `functions/index.js`:
  ```javascript
  exports.api = functions.runWith({ memory: '1GB', timeoutSeconds: 540 }).https.onRequest(app);
  ```

- **CORS errors**: The CORS middleware is already included in the functions code.

## Post-Deployment

After deployment, your site will be available at:
- `https://your-project-id.web.app`
- `https://your-project-id.firebaseapp.com`

Update your Firebase project settings to add a custom domain if needed.

