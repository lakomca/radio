# Installation Guide for Windows

## Required Tools

You need to install two tools for this radio website to work:

### 1. FFmpeg

**Option A: Using Chocolatey (Recommended)**
```powershell
choco install ffmpeg
```

**Option B: Manual Installation**
1. Download FFmpeg from: https://www.gyan.dev/ffmpeg/builds/
2. Download the "ffmpeg-release-essentials.zip" file
3. Extract it to a folder (e.g., `C:\ffmpeg`)
4. Add `C:\ffmpeg\bin` to your system PATH:
   - Press `Win + X` and select "System"
   - Click "Advanced system settings"
   - Click "Environment Variables"
   - Under "System variables", find "Path" and click "Edit"
   - Click "New" and add `C:\ffmpeg\bin` (or wherever you extracted it)
   - Click OK on all dialogs
5. Restart your terminal/PowerShell

**Verify installation:**
```powershell
ffmpeg -version
```

### 2. yt-dlp

**Option A: Using pip (Recommended if you have Python)**
```powershell
pip install yt-dlp
```

**Option B: Using Chocolatey**
```powershell
choco install yt-dlp
```

**Option C: Manual Installation**
1. Download yt-dlp from: https://github.com/yt-dlp/yt-dlp/releases/latest
2. Download `yt-dlp.exe`
3. Place it in a folder that's in your PATH (e.g., `C:\Windows\System32` or create a folder and add it to PATH)
4. Or place it anywhere and add that folder to your PATH (same process as FFmpeg above)

**Verify installation:**
```powershell
yt-dlp --version
```

## Quick Install Script (PowerShell as Administrator)

If you have Chocolatey installed, run this in PowerShell as Administrator:

```powershell
choco install ffmpeg yt-dlp -y
```

## Verify Setup

After installing both tools, run:

```powershell
npm run check
```

You should see checkmarks (✓) for both ffmpeg and yt-dlp.

## Troubleshooting

- **"Command not found"**: Make sure the tools are in your PATH. Restart your terminal after adding to PATH.
- **"Permission denied"**: Make sure you're running PowerShell/Command Prompt as Administrator if needed.
- **Still not working**: Try restarting your computer after adding to PATH.

## Alternative: Install via Python

If you have Python installed, you can install yt-dlp via pip:

```powershell
pip install yt-dlp
```

This usually handles PATH automatically.

