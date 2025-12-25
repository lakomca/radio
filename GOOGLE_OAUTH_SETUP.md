# Google OAuth 2.0 Setup Guide

This guide will help you set up Google OAuth 2.0 credentials for YouTube authentication.

## Step 1: Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click on the project dropdown at the top
3. Click "New Project"
4. Enter a project name (e.g., "PULSE Radio")
5. Click "Create"

## Step 2: Enable YouTube Data API v3

1. In your Google Cloud project, go to "APIs & Services" → "Library"
2. Search for "YouTube Data API v3"
3. Click on it and click "Enable"

## Step 3: Create OAuth 2.0 Credentials

1. Go to "APIs & Services" → "Credentials"
2. Click "Create Credentials" → "OAuth client ID"
3. If prompted, configure the OAuth consent screen:
   - Choose "External" (unless you have a Google Workspace account)
   - Fill in the required fields:
     - App name: PULSE
     - User support email: your email
     - Developer contact: your email
   - Add scopes (if prompted):
     - `https://www.googleapis.com/auth/youtube.readonly`
     - `https://www.googleapis.com/auth/youtube.force-ssl`
   - Add test users (if in testing mode)
   - Save and continue

4. Create OAuth Client ID:
   - Application type: **Web application**
   - Name: PULSE Radio App
   - **Authorized JavaScript origins**:
     - `http://localhost:3000` (for local development)
     - Your production URL (e.g., `https://yourdomain.com`)
   - **Authorized redirect URIs**:
     - `http://localhost:3000/auth/callback` (for local development)
     - `https://yourdomain.com/auth/callback` (for production)
   - Click "Create"

5. Copy the **Client ID** and **Client Secret**

## Step 4: Configure Environment Variables

Create a `.env` file in your project root (or set environment variables on your hosting platform):

```env
GOOGLE_CLIENT_ID=your-client-id-here.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret-here
REDIRECT_URI=http://localhost:3000/auth/callback
SESSION_SECRET=your-random-secret-string-here-make-it-long-and-random
REMEMBER_ME=true
NODE_ENV=development
PORT=3000
```

### For Production:

```env
GOOGLE_CLIENT_ID=your-client-id-here.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret-here
REDIRECT_URI=https://yourdomain.com/auth/callback
SESSION_SECRET=your-random-secret-string-here-make-it-long-and-random
REMEMBER_ME=true
NODE_ENV=production
PORT=3000
```

## Step 5: Generate Session Secret

Generate a random session secret:

```bash
# Using Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Or use any random string generator
```

## Step 6: Install Dependencies

Make sure all dependencies are installed:

```bash
npm install
```

## Step 7: Start Your Server

```bash
npm start
```

## Testing

1. Open your browser to `http://localhost:3000`
2. Click the "Login" button in the top-right corner
3. Scan the QR code with your phone or click the direct login link
4. Sign in with your Google account
5. Grant the required permissions
6. You should be redirected back and logged in!

## Troubleshooting

### "Redirect URI mismatch" error

- Make sure the redirect URI in your `.env` file exactly matches what you configured in Google Cloud Console
- Check that you've added both `http://localhost:3000/auth/callback` (development) and your production URL (production)

### "Access blocked" error

- If your app is in testing mode, make sure the user email is added to test users in OAuth consent screen
- Publish your app (if needed) or add test users

### "Invalid client" error

- Double-check your `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in `.env`
- Make sure there are no extra spaces or quotes

### QR code not generating

- Check server logs for errors
- Make sure `qrcode` package is installed: `npm install qrcode`

### Session not persisting

- Make sure `SESSION_SECRET` is set
- Check that cookies are enabled in your browser
- For production, make sure `NODE_ENV=production` is set

## Security Notes

- **Never commit your `.env` file to git**
- Add `.env` to your `.gitignore`
- Use different OAuth credentials for development and production
- Keep your `SESSION_SECRET` secure and random
- Rotate secrets periodically in production

## Production Deployment

When deploying to production (Railway, Render, etc.):

1. Set all environment variables in your hosting platform's dashboard
2. Update the redirect URI in Google Cloud Console to your production URL
3. Make sure `NODE_ENV=production` is set
4. Ensure your domain matches the authorized origins in Google Cloud Console



