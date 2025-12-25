# Railway Deployment Guide for YouTube OAuth

This guide will help you deploy your radio app with YouTube OAuth authentication on Railway.

## Step 1: Deploy to Railway

1. Go to [Railway](https://railway.app)
2. Create a new project
3. Connect your GitHub repository
4. Railway will auto-detect Node.js and deploy

## Step 2: Set Up Google OAuth Credentials

### In Google Cloud Console:

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to your project → APIs & Services → Credentials
3. Click "Create Credentials" → "OAuth client ID"
4. Choose "Web application"
5. Add authorized redirect URIs:
   - For Railway: `https://your-app-name.up.railway.app/auth/callback`
   - If you have a custom domain: `https://yourdomain.com/auth/callback`
   - Also add your local development URL: `http://localhost:3000/auth/callback`
6. Save and copy your **Client ID** and **Client Secret**

## Step 3: Configure Railway Environment Variables

In your Railway project dashboard:

1. Go to **Variables** tab
2. Add these environment variables:

```env
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret-here
REDIRECT_URI=https://your-app-name.up.railway.app/auth/callback
SESSION_SECRET=generate-a-random-string-here
REMEMBER_ME=true
NODE_ENV=production
PORT=3000
```

### How to Generate SESSION_SECRET:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**Important Notes:**
- Replace `your-app-name.up.railway.app` with your actual Railway URL
- The `REDIRECT_URI` must **exactly match** what you set in Google Cloud Console
- Railway automatically sets `PORT`, but you can override it
- Railway may provide `RAILWAY_PUBLIC_DOMAIN` - the code will use this automatically if available

## Step 4: Enable YouTube Data API v3

1. In Google Cloud Console, go to "APIs & Services" → "Library"
2. Search for "YouTube Data API v3"
3. Click "Enable"

## Step 5: OAuth Consent Screen

1. In Google Cloud Console, go to "APIs & Services" → "OAuth consent screen"
2. Configure:
   - User Type: External (unless you have Google Workspace)
   - App name: PULSE
   - User support email: your email
   - Developer contact: your email
3. Add scopes:
   - `https://www.googleapis.com/auth/youtube.readonly`
   - `https://www.googleapis.com/auth/youtube.force-ssl`
4. Add test users (if in testing mode) or publish the app

## Step 6: Redeploy

After setting environment variables:
1. Railway will automatically redeploy
2. Or manually trigger a redeploy from the dashboard

## Step 7: Test

1. Visit your Railway URL: `https://your-app-name.up.railway.app`
2. Click "Login"
3. You should be redirected to Google OAuth
4. After signing in, you should be redirected back and logged in!

## Troubleshooting

### "Redirect URI mismatch" error

- Make sure the redirect URI in Railway environment variables exactly matches Google Cloud Console
- For Railway: Use `https://your-app-name.up.railway.app/auth/callback`
- Don't include a trailing slash
- Check that the protocol is `https` (not `http`)

### "Invalid client" error

- Double-check `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in Railway
- Make sure there are no extra spaces or quotes
- Verify the credentials are correct in Google Cloud Console

### Environment variables not working

- Railway requires a redeploy after adding/changing environment variables
- Check the Railway logs to see if variables are being read
- Make sure variable names are exactly as shown (case-sensitive)

### Session not persisting

- Check that `SESSION_SECRET` is set
- For production, Railway uses HTTPS automatically (secure cookies)
- Make sure `NODE_ENV=production` is set

### Finding your Railway URL

1. In Railway dashboard, go to your service
2. Click on "Settings"
3. Look for "Public Domain" or check the deployment logs
4. Your URL will be something like: `your-app-name.up.railway.app`

## Custom Domain (Optional)

If you have a custom domain:

1. In Railway, go to Settings → Domains
2. Add your custom domain
3. Update `REDIRECT_URI` in environment variables to use your custom domain
4. Update the redirect URI in Google Cloud Console to match
5. Redeploy

## Environment Variables Summary

| Variable | Description | Example |
|----------|-------------|---------|
| `GOOGLE_CLIENT_ID` | Your OAuth Client ID | `123456.apps.googleusercontent.com` |
| `GOOGLE_CLIENT_SECRET` | Your OAuth Client Secret | `GOCSPX-...` |
| `REDIRECT_URI` | OAuth callback URL | `https://app.up.railway.app/auth/callback` |
| `SESSION_SECRET` | Random string for sessions | `abc123...` (32+ characters) |
| `REMEMBER_ME` | Session duration | `true` (30 days) or `false` (1 day) |
| `NODE_ENV` | Environment | `production` |
| `PORT` | Server port | `3000` (Railway sets this automatically) |

## Quick Checklist

- [ ] Deployed to Railway
- [ ] Created OAuth credentials in Google Cloud
- [ ] Enabled YouTube Data API v3
- [ ] Configured OAuth consent screen
- [ ] Added redirect URI in Google Cloud (Railway URL)
- [ ] Set all environment variables in Railway
- [ ] Redeployed after setting variables
- [ ] Tested login flow

## Support

If you encounter issues:
1. Check Railway logs: Railway Dashboard → Deployments → View Logs
2. Check Google Cloud Console for OAuth errors
3. Verify all environment variables are set correctly
4. Ensure redirect URIs match exactly (no trailing slashes)



