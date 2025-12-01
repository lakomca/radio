# Firebase Setup Instructions

## Step 1: Login to Firebase

Open PowerShell and run:
```powershell
firebase login
```

This will open your browser. Sign in with your Google account.

## Step 2: Create a Firebase Project

1. Go to https://console.firebase.google.com
2. Click "Add project" or "Create a project"
3. Enter a project name (e.g., "radio-stream")
4. Follow the setup wizard
5. Copy your Project ID (shown in project settings)

## Step 3: Initialize Firebase

Run this command in your project directory:
```powershell
firebase init
```

When prompted:
- **Select features**: Choose "Hosting" and "Functions" (use spacebar to select, Enter to confirm)
- **Select a default Firebase project**: Choose your project or create a new one
- **What do you want to use as your public directory?**: Type `public` and press Enter
- **Configure as a single-page app?**: Type `y` (yes)
- **Set up automatic builds and deploys with GitHub?**: Type `n` (no, unless you want it)
- **What language do you want to use?**: Choose `JavaScript`
- **Do you want to use ESLint?**: Type `n` (no, or yes if you prefer)
- **Do you want to install dependencies?**: Type `y` (yes)

## Step 4: Update .firebaserc

After initialization, your `.firebaserc` file will be automatically updated with your project ID.

Or manually edit `.firebaserc`:
```json
{
  "projects": {
    "default": "your-actual-project-id"
  }
}
```

Replace `your-actual-project-id` with your actual Firebase project ID.

## Step 5: Deploy

Once initialized, you can deploy:
```powershell
firebase deploy
```

Or deploy separately:
```powershell
# Deploy only hosting (frontend)
firebase deploy --only hosting

# Deploy only functions (backend)
firebase deploy --only functions
```

## Troubleshooting

### If you get "project not found" error:
1. Make sure you're logged in: `firebase login`
2. List your projects: `firebase projects:list`
3. Use the correct project ID in `.firebaserc`

### If you want to use a different project:
```powershell
firebase use --add
```
Then select your project from the list.

### To see current project:
```powershell
firebase use
```

