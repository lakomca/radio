# Troubleshooting Railway Deployment

If your Railway deployment shows a blank page or nothing loads, try these steps:

## 1. Check Railway Logs

1. Go to your Railway project dashboard
2. Click on your service
3. Click on the "Deployments" tab
4. Click on the latest deployment
5. Check the "Logs" tab for any errors

Look for:
- ✅ "Radio server running!" - Server started successfully
- ✅ "Public directory found" - Files are in the right place
- ❌ Any error messages about missing files or dependencies

## 2. Verify the Deployment

Check if the server is responding:
- Visit: `https://your-app.up.railway.app/health`
- Should return: `{"status":"ok"}`

If this doesn't work, the server isn't running correctly.

## 3. Check Browser Console

1. Open your Railway URL in a browser
2. Press F12 (or right-click → Inspect)
3. Go to the "Console" tab
4. Look for any JavaScript errors
5. Go to the "Network" tab
6. Refresh the page
7. Check if `index.html`, `app.js`, and `style.css` are loading (status should be 200)

## 4. Common Issues

### Issue: Blank Page
**Possible causes:**
- Static files not being served
- JavaScript error preventing page load
- CSS not loading

**Solution:**
- Check browser console for errors
- Verify all files are in the `public/` directory
- Check Railway logs for file path errors

### Issue: "Cannot GET /"
**Possible causes:**
- Server not running
- Wrong port configuration
- Static files not found

**Solution:**
- Check Railway logs
- Verify `public/` directory exists
- Check that `index.html` is in `public/`

### Issue: Server Error 500
**Possible causes:**
- Missing dependencies (ffmpeg, yt-dlp)
- Node.js version mismatch
- Environment variable issues

**Solution:**
- Check Railway logs for specific error
- Verify `nixpacks.toml` is correctly configured
- Check that all dependencies are installed

## 5. Verify Files Are Deployed

Make sure these files are in your repository:
- ✅ `public/index.html`
- ✅ `public/app.js`
- ✅ `public/style.css`
- ✅ `server.js`
- ✅ `package.json`
- ✅ `nixpacks.toml`

## 6. Test Locally First

Before deploying, test locally:
```bash
npm install
npm start
```

Then visit `http://localhost:3000` - if it works locally, it should work on Railway.

## 7. Railway-Specific Checks

1. **Check Environment Variables:**
   - Railway dashboard → Your service → Variables
   - Make sure `PORT` is set (Railway sets this automatically)

2. **Check Build Logs:**
   - Railway dashboard → Deployments → Latest deployment
   - Look for build errors
   - Verify ffmpeg and yt-dlp are being installed

3. **Check Service Status:**
   - Railway dashboard → Your service
   - Should show "Active" status
   - Check if it's using the correct start command: `node server.js`

## 8. Force Redeploy

If nothing works, try:
1. Railway dashboard → Your service → Settings
2. Click "Redeploy" or trigger a new deployment
3. Or push a new commit to trigger auto-deploy

## 9. Check URL Format

Make sure you're accessing:
- ✅ `https://your-app.up.railway.app` (HTTPS)
- ❌ NOT `http://your-app.up.railway.app` (HTTP might not work)

## Still Not Working?

If you're still having issues:
1. Share the Railway logs (from the Logs tab)
2. Share the browser console errors
3. Share the Network tab showing which files failed to load

This will help identify the exact issue.

