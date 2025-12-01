# Manual Installation Guide for Windows

## Step-by-Step Manual Installation

### 1. Install FFmpeg (Manual Method)

#### Step 1: Download FFmpeg
1. Go to: https://www.gyan.dev/ffmpeg/builds/
2. Click on **"ffmpeg-release-essentials.zip"** (or the latest essentials build)
3. Save the ZIP file to your Downloads folder

#### Step 2: Extract FFmpeg
1. Right-click the downloaded ZIP file
2. Select **"Extract All..."**
3. Choose a location like `C:\ffmpeg` (create this folder if needed)
4. Click **"Extract"**
5. You should now have a folder like `C:\ffmpeg\ffmpeg-2024-xx-xx-essentials_build` with a `bin` folder inside

#### Step 3: Add FFmpeg to PATH
1. Press `Win + X` and select **"System"**
2. Click **"Advanced system settings"** (on the right side)
3. Click the **"Environment Variables"** button (at the bottom)
4. Under **"System variables"** (bottom section), find and select **"Path"**
5. Click **"Edit..."**
6. Click **"New"**
7. Type the path to the `bin` folder, for example:
   ```
   C:\ffmpeg\ffmpeg-2024-xx-xx-essentials_build\bin
   ```
   (Replace `2024-xx-xx` with your actual version)
8. Click **"OK"** on all dialogs
9. **Restart your terminal/PowerShell** (close and reopen)

#### Step 4: Verify FFmpeg Installation
Open a **new** PowerShell window and run:
```powershell
ffmpeg -version
```
You should see version information. If you get an error, the PATH wasn't set correctly.

---

### 2. Install yt-dlp (Manual Method)

#### Option A: Download Executable (Easiest)

1. Go to: https://github.com/yt-dlp/yt-dlp/releases/latest
2. Download **"yt-dlp.exe"** (the Windows executable)
3. Save it to a folder that's already in your PATH, such as:
   - `C:\Windows\System32` (requires admin rights)
   - Or create a folder like `C:\tools` and add it to PATH (see below)

#### Option B: Place in Custom Folder (Recommended)

1. Create a folder: `C:\tools`
2. Download `yt-dlp.exe` from: https://github.com/yt-dlp/yt-dlp/releases/latest
3. Save it to `C:\tools\yt-dlp.exe`
4. Add `C:\tools` to your PATH (same process as FFmpeg above):
   - Press `Win + X` → System → Advanced system settings → Environment Variables
   - Edit "Path" under System variables
   - Add `C:\tools`
   - Click OK on all dialogs
   - **Restart your terminal**

#### Step 5: Verify yt-dlp Installation
Open a **new** PowerShell window and run:
```powershell
yt-dlp --version
```
You should see a version number like `2024.xx.xx`.

---

## Alternative: Using Python/pip (If you have Python installed)

If you already have Python installed, you can install yt-dlp using pip:

1. Open PowerShell
2. Run:
```powershell
pip install yt-dlp
```
3. This usually handles PATH automatically
4. Verify: `yt-dlp --version`

---

## Troubleshooting

### "Command not found" after installation

1. **Make sure you restarted your terminal** after adding to PATH
2. Check if the PATH was added correctly:
   ```powershell
   $env:Path -split ';' | Select-String "ffmpeg"
   $env:Path -split ';' | Select-String "yt-dlp"
   ```
3. If nothing shows up, the PATH wasn't added correctly - try again

### "Access Denied" when saving to System32

- Use Option B above (create `C:\tools` folder instead)
- Or run PowerShell as Administrator (right-click → Run as Administrator)

### Still not working?

1. Try restarting your computer after adding to PATH
2. Verify the files exist:
   ```powershell
   # Check if ffmpeg exists
   Get-Command ffmpeg -ErrorAction SilentlyContinue
   
   # Check if yt-dlp exists
   Get-Command yt-dlp -ErrorAction SilentlyContinue
   ```

### Quick Test

After installing both, run:
```powershell
npm run check
```

You should see checkmarks (✓) for both tools.

---

## Summary Checklist

- [ ] Downloaded FFmpeg ZIP file
- [ ] Extracted FFmpeg to a folder (e.g., `C:\ffmpeg\...`)
- [ ] Added FFmpeg `bin` folder to System PATH
- [ ] Restarted terminal
- [ ] Verified: `ffmpeg -version` works
- [ ] Downloaded `yt-dlp.exe`
- [ ] Placed `yt-dlp.exe` in a PATH folder (or added folder to PATH)
- [ ] Restarted terminal
- [ ] Verified: `yt-dlp --version` works
- [ ] Ran `npm run check` - both tools show ✓

Once both are installed, restart your server with `npm start` and everything should work!

