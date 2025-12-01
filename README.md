# Radio Stream - YouTube Music Player

A web-based radio player that streams music from YouTube using ffmpeg and yt-dlp.

## Features

- 🎵 Stream music from YouTube URLs
- ▶️ Play/Pause controls
- 🔍 Search YouTube for music
- 🔊 Volume control
- 🎨 Modern, responsive UI

## Prerequisites

Before running this application, you need to install:

1. **Node.js** (v14 or higher) - [Download](https://nodejs.org/)
2. **FFmpeg** - Required for audio conversion
3. **yt-dlp** or **youtube-dl** - Required for YouTube video processing

📖 **See [INSTALL.md](INSTALL.md) for detailed Windows installation instructions.**

## Installation

1. Install Node.js dependencies:
```bash
npm install
```

2. Check if required tools are installed:
```bash
npm run check
```

This will verify that ffmpeg and yt-dlp/youtube-dl are installed and accessible.

3. If tools are missing, follow the instructions in [INSTALL.md](INSTALL.md) to install them.

## Running the Application

1. Start the server:
```bash
npm start
```

Or for development with auto-reload:
```bash
npm run dev
```

2. Open your browser and navigate to:
```
http://localhost:3000
```

## Usage

1. **Load a YouTube URL:**
   - Paste a YouTube video URL in the input field
   - Click "Load & Play" or press Enter
   - The stream will start automatically

2. **Search for Music:**
   - Enter a search query in the search field
   - Click "Search" or press Enter
   - Click on any result to load and play it

3. **Controls:**
   - **Play/Pause**: Toggle playback
   - **Stop**: Stop playback and reset
   - **Volume**: Adjust volume with the slider

## How It Works

1. The backend server uses `yt-dlp` to extract the audio stream URL from YouTube
2. `ffmpeg` converts the audio stream to MP3 format
3. The converted stream is piped to the HTTP response
4. The frontend HTML5 audio player receives and plays the stream

## Troubleshooting

- **Stream won't play**: Make sure ffmpeg and yt-dlp are installed and accessible from the command line
- **"Failed to get audio URL"**: The YouTube URL might be invalid or the video might be unavailable
- **Audio cuts out**: This might be due to network issues or YouTube rate limiting

## Notes

- This application streams audio in real-time, so there may be a slight delay when starting playback
- Some YouTube videos may not be available for streaming due to regional restrictions or copyright
- The quality of the stream depends on the original YouTube video quality

## License

MIT

