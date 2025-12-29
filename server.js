require('dotenv').config();
const express = require('express');
const session = require('express-session');
const { spawn, exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const db = require('./database');
const http = require('http');
const https = require('https');

const app = express();
const PORT = process.env.PORT || 3000;

// Timeout constants - 24 hours in milliseconds for very long-running connections
const INFINITE_TIMEOUT = 24 * 60 * 60 * 1000; // 86,400,000 ms

// CORS configuration - Allow Firebase Hosting and other origins
const allowedOrigins = [
    /^https?:\/\/localhost(:\d+)?$/,  // Local development
    /^https?:\/\/127\.0\.0\.1(:\d+)?$/,  // Local development
    /\.firebaseapp\.com$/,  // Firebase Hosting
    /\.web\.app$/,  // Firebase Hosting custom domains
    /\.ngrok-free\.dev$/,  // ngrok free tier
    /\.ngrok\.io$/,  // ngrok paid tier
    /\.ngrok-app\.com$/,  // ngrok app domains
    /^https?:\/\/192\.168\.\d+\.\d+(:\d+)?$/,  // Local network IPs
    /^https?:\/\/10\.\d+\.\d+\.\d+(:\d+)?$/,  // Local network IPs
];

app.use(cors({
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);
        
        // Check if origin matches allowed patterns
        const isAllowed = allowedOrigins.some(pattern => pattern.test(origin));
        
        if (isAllowed || process.env.NODE_ENV !== 'production') {
            callback(null, true);
        } else {
            // In production, log blocked origins for debugging
            console.warn('CORS blocked origin:', origin);
            callback(null, true); // Still allow for now - update this for stricter security
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'ngrok-skip-browser-warning']
}));

// Session configuration
// Note: saveUninitialized: false means sessions are only created for authenticated users
// This prevents session creation for public endpoints like /stream and /radio-stream
app.use(session({
    secret: process.env.SESSION_SECRET || 'your-secret-key-change-in-production',
    resave: false,
    saveUninitialized: false,  // Don't create sessions for unauthenticated requests
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        maxAge: process.env.REMEMBER_ME === 'true' ? 30 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000 // 30 days or 1 day
    }
}));

// Parse JSON bodies
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files
app.use(express.static('public'));

// Serve radio-stations.json
app.get('/radio-stations.json', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'radio-stations.json'));
});

// Health check endpoint for Railway
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Explicit root route to serve index.html
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Helper function to execute yt-dlp and get URL
function getAudioUrl(youtubeUrl) {
    return new Promise((resolve, reject) => {
        // Helper to pick a real audio-only URL from yt-dlp JSON (-J)
        const pickAudioUrlFromJson = (raw) => {
            const data = JSON.parse(raw);
            const formats = Array.isArray(data.formats) ? data.formats : [];
            const isAudioOnly = (f) => f && f.acodec && f.acodec !== 'none' && (!f.vcodec || f.vcodec === 'none');
            const isHttp = (u) => typeof u === 'string' && (u.startsWith('http://') || u.startsWith('https://'));
            const isNonMedia = (u) => /(ytimg\.com|\/storyboard|\/sb\/).*(\.jpg|\.jpeg|\.png|\.webp|\.gif)(\?|$)/i.test(u);

            const audioOnly = formats.filter(isAudioOnly).filter(f => isHttp(f.url) && !isNonMedia(f.url));
            if (audioOnly.length === 0) {
                // Fallback: sometimes yt-dlp returns a direct URL at top-level
                if (isHttp(data.url) && !isNonMedia(data.url)) return data.url;
                return null;
            }

            // Prefer m4a/mp4 audio, then webm/opus; prefer higher abr
            const score = (f) => {
                const ext = (f.ext || '').toLowerCase();
                const abr = typeof f.abr === 'number' ? f.abr : 0;
                const pref =
                    ext === 'm4a' ? 1000 :
                    ext === 'mp4' ? 900 :
                    ext === 'webm' ? 800 :
                    ext === 'opus' ? 750 : 0;
                return pref + abr;
            };
            audioOnly.sort((a, b) => score(b) - score(a));
            const picked = audioOnly[0];
            // Debug: log chosen format details (helps diagnose storyboard/403/expiry issues)
            console.log('yt-dlp picked audio format:', {
                id: data.id,
                title: (data.title || '').slice(0, 80),
                format_id: picked.format_id,
                ext: picked.ext,
                acodec: picked.acodec,
                abr: picked.abr,
                protocol: picked.protocol,
                urlHost: (() => { try { return new URL(picked.url).hostname; } catch { return null; } })()
            });
            return picked.url;
        };

        // On Windows, try both with and without .exe, and try youtube-dl as fallback.
        // Also support running yt-dlp via Python module (works well on macOS where brew may be blocked).
        // If you create a local venv at .venv/, we'll prefer that Python too (no global install needed).
        const localVenvPythonCandidates = [
            process.env.YTDLP_PYTHON,
            path.join(__dirname, '.venv', 'bin', 'python3'),
            path.join(__dirname, '.venv', 'bin', 'python'),
            path.join(__dirname, '.venv', 'Scripts', 'python.exe'),
            path.join(__dirname, '.venv', 'Scripts', 'python')
        ].filter(Boolean);

        const localVenvPythons = localVenvPythonCandidates.filter(p => {
            try { return fs.existsSync(p); } catch { return false; }
        });

        const commands = [
            // Local venv python first (most reliable / no system installs)
            ...localVenvPythons.flatMap(py => ([
                { cmd: py, args: ['-m', 'yt_dlp', youtubeUrl, '--no-playlist', '-J'], parser: pickAudioUrlFromJson },
                { cmd: py, args: ['-m', 'yt_dlp', youtubeUrl, '-f', 'bestaudio[ext=m4a]/bestaudio/best', '-g'] }
            ])),

            // Python module (fallback): python3 -m yt_dlp ...
            { cmd: 'python3', args: ['-m', 'yt_dlp', youtubeUrl, '--no-playlist', '-J'], parser: pickAudioUrlFromJson },
            { cmd: 'python', args: ['-m', 'yt_dlp', youtubeUrl, '--no-playlist', '-J'], parser: pickAudioUrlFromJson },
            // Windows Python launcher
            { cmd: 'py', args: ['-m', 'yt_dlp', youtubeUrl, '--no-playlist', '-J'], parser: pickAudioUrlFromJson },
            // Prefer robust JSON selection (avoids non-media URLs like storyboard images)
            { cmd: 'yt-dlp', args: [youtubeUrl, '--no-playlist', '-J'], parser: pickAudioUrlFromJson },
            { cmd: 'yt-dlp.exe', args: [youtubeUrl, '--no-playlist', '-J'], parser: pickAudioUrlFromJson },
            // Fallback: direct URL output (less reliable)
            { cmd: 'python3', args: ['-m', 'yt_dlp', youtubeUrl, '-f', 'bestaudio[ext=m4a]/bestaudio/best', '-g'] },
            { cmd: 'python', args: ['-m', 'yt_dlp', youtubeUrl, '-f', 'bestaudio[ext=m4a]/bestaudio/best', '-g'] },
            { cmd: 'py', args: ['-m', 'yt_dlp', youtubeUrl, '-f', 'bestaudio[ext=m4a]/bestaudio/best', '-g'] },
            { cmd: 'yt-dlp', args: [youtubeUrl, '-f', 'bestaudio[ext=m4a]/bestaudio/best', '-g'] },
            { cmd: 'yt-dlp.exe', args: [youtubeUrl, '-f', 'bestaudio[ext=m4a]/bestaudio/best', '-g'] },
            { cmd: 'youtube-dl', args: [youtubeUrl, '-f', 'bestaudio/best', '-g'] },
            { cmd: 'youtube-dl.exe', args: [youtubeUrl, '-f', 'bestaudio/best', '-g'] }
        ];

        let attemptIndex = 0;
        const isWindows = process.platform === 'win32';

        function tryCommand() {
            if (attemptIndex >= commands.length) {
                reject(new Error('yt-dlp or youtube-dl not found. Please install yt-dlp: https://github.com/yt-dlp/yt-dlp'));
                return;
            }

            const { cmd, args, parser } = commands[attemptIndex];
            console.log(`Getting audio URL: Attempting to use ${cmd}`);
            
            let childProcess;
            
            if (isWindows) {
                // Use PowerShell on Windows to avoid CMD issues
                const psCommand = `& "${cmd}" ${args.map(arg => `"${arg}"`).join(' ')}`;
                childProcess = spawn('powershell.exe', [
                    '-NoProfile',
                    '-Command',
                    psCommand
                ], {
                    stdio: ['ignore', 'pipe', 'pipe']
                });
            } else {
                childProcess = spawn(cmd, args, { shell: false });
            }

            let output = '';
            let errorOutput = '';

            childProcess.stdout.on('data', (data) => {
                output += data.toString();
            });

            childProcess.stderr.on('data', (data) => {
                errorOutput += data.toString();
            });

            childProcess.on('close', (code) => {
                if (code === 0 && output.trim()) {
                    try {
                        let url = null;
                        if (parser) {
                            url = parser(output.trim());
                        } else {
                            const lines = output.trim().split('\n').map(l => l.trim()).filter(Boolean);
                            url = lines[0];
                        }

                        if (!url) throw new Error('No usable audio URL found');
                        if (!url.startsWith('http://') && !url.startsWith('https://')) {
                            throw new Error('yt-dlp returned invalid URL');
                        }
                        if (/(ytimg\.com|\/storyboard|\/sb\/).*(\.jpg|\.jpeg|\.png|\.webp|\.gif)(\?|$)/i.test(url)) {
                            throw new Error('yt-dlp returned non-media (image/storyboard) URL');
                        }

                        console.log(`Successfully got audio URL using ${cmd}`);
                        resolve(url);
                    } catch (parseErr) {
                        console.warn(`⚠️ ${cmd} returned output but could not pick audio URL: ${parseErr.message}`);
                        attemptIndex++;
                        tryCommand();
                    }
                } else {
                    console.log(`${cmd} failed with code ${code}, trying next...`);
                    if (errorOutput) {
                        console.log(`Error: ${errorOutput.substring(0, 200)}`);
                    }
                    attemptIndex++;
                    tryCommand();
                }
            });

            childProcess.on('error', (error) => {
                console.log(`${cmd} error: ${error.message}, trying next...`);
                attemptIndex++;
                tryCommand();
            });
        }

        tryCommand();
    });
}

// Helper function to search YouTube
function searchYouTube(query) {
    return new Promise((resolve, reject) => {
        // Try different command formats
        // Use standard format string - we'll handle Windows escaping differently
        const commands = [
            { 
                cmd: 'yt-dlp', 
                args: [`ytsearch50:${query}`, '--flat-playlist', '--print', '%(id)s|%(title)s|%(duration)s'],
                parser: (output) => {
                    return output.trim().split('\n')
                        .filter(line => line.trim())
                        .map(line => {
                            const [id, ...rest] = line.split('|');
                            const title = rest.slice(0, -1).join('|');
                            const duration = rest[rest.length - 1];
                            return {
                                id,
                                title: title || 'Unknown',
                                duration: duration || 'N/A',
                                url: `https://www.youtube.com/watch?v=${id}`
                            };
                        });
                }
            },
            { 
                cmd: 'yt-dlp.exe', 
                args: [`ytsearch50:${query}`, '--flat-playlist', '--print', '%(id)s|%(title)s|%(duration)s'],
                parser: (output) => {
                    return output.trim().split('\n')
                        .filter(line => line.trim())
                        .map(line => {
                            const [id, ...rest] = line.split('|');
                            const title = rest.slice(0, -1).join('|');
                            const duration = rest[rest.length - 1];
                            return {
                                id,
                                title: title || 'Unknown',
                                duration: duration || 'N/A',
                                url: `https://www.youtube.com/watch?v=${id}`
                            };
                        });
                }
            },
            { 
                cmd: 'youtube-dl', 
                args: [`ytsearch50:${query}`, '--flat-playlist', '--get-id', '--get-title', '--get-duration'],
                parser: (output) => {
                    const lines = output.trim().split('\n');
                    const videos = [];
                    for (let i = 0; i < lines.length; i += 3) {
                        if (lines[i] && lines[i + 1]) {
                            videos.push({
                                id: lines[i],
                                title: lines[i + 1] || 'Unknown',
                                duration: lines[i + 2] || 'N/A',
                                url: `https://www.youtube.com/watch?v=${lines[i]}`
                            });
                        }
                    }
                    return videos;
                }
            },
            { 
                cmd: 'youtube-dl.exe', 
                args: [`ytsearch50:${query}`, '--flat-playlist', '--get-id', '--get-title', '--get-duration'],
                parser: (output) => {
                    const lines = output.trim().split('\n');
                    const videos = [];
                    for (let i = 0; i < lines.length; i += 3) {
                        if (lines[i] && lines[i + 1]) {
                            videos.push({
                                id: lines[i],
                                title: lines[i + 1] || 'Unknown',
                                duration: lines[i + 2] || 'N/A',
                                url: `https://www.youtube.com/watch?v=${lines[i]}`
                            });
                        }
                    }
                    return videos;
                }
            }
        ];

        let attemptIndex = 0;
        let hasResolved = false;

        function tryCommand() {
            if (hasResolved) return;
            
            if (attemptIndex >= commands.length) {
                hasResolved = true;
                reject(new Error('yt-dlp or youtube-dl not found. Please install yt-dlp: https://github.com/yt-dlp/yt-dlp'));
                return;
            }

            const { cmd, args, parser } = commands[attemptIndex];
            console.log(`Search: Attempting to use ${cmd} with query: ${query}`);
            console.log(`Search: Full command: ${cmd} ${args.join(' ')}`);
            
            // On Windows, use PowerShell to avoid CMD % interpretation issues
            // PowerShell handles % correctly without escaping
            const isWindows = process.platform === 'win32';
            let childProcess;
            
            if (isWindows) {
                // Use PowerShell to execute the command
                // PowerShell doesn't interpret % as environment variables
                const psCommand = `& "${cmd}" ${args.map(arg => `"${arg}"`).join(' ')}`;
                console.log(`Executing via PowerShell: ${psCommand}`);
                childProcess = spawn('powershell.exe', [
                    '-NoProfile',
                    '-Command',
                    psCommand
                ], {
                    stdio: ['ignore', 'pipe', 'pipe']
                });
            } else {
                // On Unix-like systems, use spawn directly
                console.log(`Executing: ${cmd} ${args.join(' ')}`);
                childProcess = spawn(cmd, args, { 
                    shell: false,
                    stdio: ['ignore', 'pipe', 'pipe']
                });
            }
            
            let output = '';
            let errorOutput = '';
            let allStderr = '';

            // Set a timeout (30 seconds)
            const timeout = setTimeout(() => {
                if (!hasResolved) {
                    childProcess.kill();
                    console.log(`${cmd} timed out, trying next...`);
                    attemptIndex++;
                    tryCommand();
                }
            }, 30000);

            childProcess.stdout.on('data', (data) => {
                output += data.toString();
            });

            childProcess.stderr.on('data', (data) => {
                // Capture all stderr for debugging
                const msg = data.toString();
                allStderr += msg;
                // yt-dlp outputs warnings/info to stderr, but it's not necessarily an error
                if (msg.toLowerCase().includes('error') && !msg.toLowerCase().includes('warning')) {
                    errorOutput += msg;
                }
            });

            childProcess.on('close', (code) => {
                clearTimeout(timeout);
                
                if (hasResolved) return;

                // yt-dlp can exit with code 0 even with warnings in stderr
                // Check if we have output regardless of stderr
                if (output.trim()) {
                    try {
                        console.log(`Search: Raw output length: ${output.length} characters`);
                        console.log(`Search: First 500 chars of output: ${output.substring(0, 500)}`);
                        const videos = parser(output);
                        console.log(`Search: Parsed ${videos.length} videos from output`);
                        if (videos.length > 0) {
                            hasResolved = true;
                            console.log(`Search: Found ${videos.length} videos using ${cmd}`);
                            if (videos.length === 1) {
                                console.warn(`Search: WARNING - Only 1 video found! This might indicate an issue.`);
                                console.warn(`Search: Output was: ${output.substring(0, 1000)}`);
                            }
                            resolve(videos);
                            return;
                        }
                    } catch (parseError) {
                        console.error(`Parse error with ${cmd}: ${parseError.message}`);
                        console.error(`Output was: ${output.substring(0, 500)}`);
                    }
                }

                // If we get here, try next command
                if (code !== 0 || !output.trim()) {
                    console.log(`${cmd} failed with code ${code}. Output length: ${output.length}`);
                    if (allStderr) {
                        console.log(`Stderr: ${allStderr.substring(0, 500)}`);
                    }
                }
                attemptIndex++;
                tryCommand();
            });

            childProcess.on('error', (error) => {
                clearTimeout(timeout);
                if (hasResolved) return;
                console.error(`${cmd} spawn error: ${error.message}`);
                attemptIndex++;
                tryCommand();
            });
        }

        tryCommand();
    });
}

// Store active streams
const activeStreams = new Map();

// CORS middleware - ensure streaming endpoints are accessible
// When credentials are included, we must specify the exact origin, not '*'
app.use((req, res, next) => {
    const origin = req.headers.origin;
    
    // Check if origin is allowed (from CORS config above)
    const isAllowed = allowedOrigins.some(pattern => {
        if (!origin) return false;
        return pattern.test(origin);
    });
    
    // Set specific origin if allowed, otherwise don't set (will be handled by cors() middleware)
    if (origin && (isAllowed || process.env.NODE_ENV !== 'production')) {
        res.header('Access-Control-Allow-Origin', origin);
        res.header('Access-Control-Allow-Credentials', 'true');
    }
    
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-Origin, Content-Type, Accept, Authorization, ngrok-skip-browser-warning');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    
    // Handle preflight requests
    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }
    
    next();
});

// Set very long timeouts for streaming endpoints (before routes are defined)
app.use('/stream', (req, res, next) => {
    req.setTimeout(INFINITE_TIMEOUT);
    res.setTimeout(INFINITE_TIMEOUT);
    if (req.socket) {
        req.socket.setTimeout(INFINITE_TIMEOUT);
        req.socket.setKeepAlive(true);
    }
    next();
});

app.use('/radio-stream', (req, res, next) => {
    req.setTimeout(INFINITE_TIMEOUT);
    res.setTimeout(INFINITE_TIMEOUT);
    if (req.socket) {
        req.socket.setTimeout(INFINITE_TIMEOUT);
        req.socket.setKeepAlive(true);
    }
    next();
});

// Process a single stream request
async function processStreamRequest(req, res, youtubeUrl) {
    return new Promise((resolve, reject) => {
        // Get audio URL from YouTube using yt-dlp first
        getAudioUrl(youtubeUrl).then(audioUrl => {
            if (!audioUrl || !audioUrl.trim()) {
                console.error('Failed to get audio URL - empty response');
                if (!res.headersSent) {
                    res.status(500).json({ 
                        error: 'Failed to get audio URL', 
                        details: 'yt-dlp returned empty response. Please check Railway logs for more details.',
                        hint: 'Make sure yt-dlp is installed and accessible in PATH'
                    });
                }
                reject(new Error('Empty audio URL'));
                return;
            }

            // Validate the URL
            const url = audioUrl.trim();
            if (!url.startsWith('http://') && !url.startsWith('https://')) {
                console.error('Invalid audio URL format:', url);
                if (!res.headersSent) {
                    res.status(500).json({ 
                        error: 'Invalid audio URL', 
                        details: 'yt-dlp returned an invalid URL format',
                        hint: 'The video might be unavailable or restricted'
                    });
                }
                reject(new Error('Invalid URL format'));
                return;
            }

            console.log(`Starting ffmpeg stream for: ${youtubeUrl}`);
            console.log(`Audio URL: ${url.substring(0, 100)}...`);
            
            // Set headers for audio streaming - send immediately with progressive streaming
            res.setHeader('Content-Type', 'audio/aac');
            res.setHeader('Transfer-Encoding', 'chunked');
            res.setHeader('Cache-Control', 'no-cache');
            res.setHeader('Connection', 'keep-alive');
            res.setHeader('Accept-Ranges', 'bytes');
            res.setHeader('X-Accel-Buffering', 'no'); // Disable buffering for progressive streaming
            res.writeHead(200);
            
            // YouTube CDN URLs can sometimes return 403 unless a browser-like User-Agent/Referer is provided.
            // These headers are harmless for most sources and improve compatibility.
            const ffmpegArgs = [
                '-user_agent', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                '-headers', 'Referer: https://www.youtube.com/\r\nOrigin: https://www.youtube.com\r\n',
                '-i', url,
                '-f', 'adts',  // AAC container format (better for streaming and interruptions)
                '-acodec', 'aac',
                '-b:a', '128k',  // Audio bitrate
                '-ar', '44100',  // Sample rate
                '-ac', '2',  // Stereo
                '-reconnect', '1',
                '-reconnect_at_eof', '1',
                '-reconnect_streamed', '1',
                '-reconnect_delay_max', '30',  // Increased to 30 seconds for better reconnection
                '-reconnect_on_network_error', '1',
                '-timeout', '86400000000',  // 24 hours in microseconds (no timeout)
                '-rw_timeout', '86400000000',  // 24 hours read/write timeout (no timeout)
                '-fflags', '+genpts+flush_packets+discardcorrupt',  // Generate PTS, flush packets, and discard corrupt packets
                '-avoid_negative_ts', 'make_zero',  // Prevent timestamp issues
                '-flush_packets', '1',  // Flush packets immediately for progressive streaming
                '-analyzeduration', '2147483647',  // Maximum analysis duration (avoid premature EOF)
                '-probesize', '2147483647',  // Maximum probe size (avoid premature EOF)
                '-'
            ];
            
            console.log(`FFmpeg command: ffmpeg ${ffmpegArgs.join(' ')}`);
            const ffmpeg = spawn('ffmpeg', ffmpegArgs, { 
                shell: false,
                stdio: ['ignore', 'pipe', 'pipe']
            });

            let firstChunk = true;
            let hasError = false;
            let bytesWritten = 0;
            const CHUNK_SIZE = 64 * 1024; // 64KB chunks for progressive streaming

            // Track stream duration to detect premature endings
            let streamDuration = null;
            let streamStartTime = Date.now();
            
            // Handle ffmpeg errors
            ffmpeg.stderr.on('data', (data) => {
                const msg = data.toString();
                // Log initial connection info
                if (msg.includes('Stream #0') || msg.includes('Audio:') || msg.includes('Duration:')) {
                    console.log(`FFmpeg info: ${msg.substring(0, 150).trim()}`);
                }
                // Extract duration from FFmpeg output (format: Duration: HH:MM:SS.mm)
                const durationMatch = msg.match(/Duration:\s*(\d{2}):(\d{2}):(\d{2})\.(\d{2})/);
                if (durationMatch && !streamDuration) {
                    const hours = parseInt(durationMatch[1]);
                    const minutes = parseInt(durationMatch[2]);
                    const seconds = parseInt(durationMatch[3]);
                    const centiseconds = parseInt(durationMatch[4]);
                    streamDuration = hours * 3600 + minutes * 60 + seconds + centiseconds / 100;
                    console.log(`Detected video duration: ${streamDuration.toFixed(2)} seconds`);
                }
                // Check for HTTP errors (404, 403, etc.)
                if (msg.includes('404') || msg.includes('Not Found')) {
                    if (!hasError) {
                        console.error(`FFmpeg error: 404 Not Found - URL may have expired or video is unavailable`);
                        if (!msg.includes('storyboard') && !msg.includes('i.ytimg.com')) {
                            console.error(`Full error: ${msg.substring(0, 200)}`);
                        }
                    }
                    hasError = true;
                    if (!res.headersSent) {
                        res.status(500).json({ 
                            error: 'Stream URL expired or video unavailable', 
                            details: 'The YouTube stream URL is no longer valid (404). This usually means the URL expired or the video is unavailable.',
                            hint: 'Try refreshing the page or searching for the video again'
                        });
                    } else {
                        res.end();
                    }
                    reject(new Error('404 Not Found'));
                } else if (msg.includes('403') || msg.includes('Forbidden')) {
                    console.error(`FFmpeg error: 403 Forbidden - Video may be restricted`);
                    console.error(`Full error: ${msg}`);
                    hasError = true;
                    if (!res.headersSent) {
                        res.status(500).json({ 
                            error: 'Video access forbidden', 
                            details: 'The video may be restricted, private, or unavailable in your region.',
                            hint: 'Try a different video'
                        });
                    } else {
                        res.end();
                    }
                    reject(new Error('403 Forbidden'));
                } else if (msg.toLowerCase().includes('error') || msg.toLowerCase().includes('failed') || msg.toLowerCase().includes('http error')) {
                    console.error(`FFmpeg error: ${msg}`);
                    hasError = true;
                    if (!res.headersSent) {
                        res.status(500).json({ 
                            error: 'FFmpeg streaming error', 
                            details: msg.substring(0, 200),
                            hint: 'Check server logs for more details'
                        });
                    } else {
                        res.end();
                    }
                    reject(new Error('FFmpeg error'));
                }
            });

            ffmpeg.on('error', (error) => {
                console.error('FFmpeg spawn error:', error);
                hasError = true;
                if (!res.headersSent) {
                    res.status(500).json({ error: 'FFmpeg not found. Please install ffmpeg and add it to PATH.' });
                } else {
                    res.end();
                }
                reject(error);
            });

            // Pipe ffmpeg output to response with chunked progressive streaming
            let streamStarted = false;
            ffmpeg.stdout.on('data', (chunk) => {
                if (firstChunk) {
                    console.log(`FFmpeg started streaming, first chunk size: ${chunk.length} bytes`);
                    firstChunk = false;
                    // Resolve the promise once streaming starts successfully
                    if (!streamStarted) {
                        streamStarted = true;
                        resolve(); // Resolve immediately after first chunk to unblock queue
                    }
                }
                
                if (!hasError && !res.destroyed) {
                    try {
                        // Write chunks progressively
                        bytesWritten += chunk.length;
                        
                        // Process in smaller chunks for better progressive streaming
                        let offset = 0;
                        while (offset < chunk.length) {
                            const chunkToWrite = chunk.slice(offset, offset + CHUNK_SIZE);
                            if (chunkToWrite.length > 0) {
                                res.write(chunkToWrite);
                                offset += CHUNK_SIZE;
                            } else {
                                break;
                            }
                        }
                    } catch (err) {
                        console.error('Error writing chunk:', err);
                        // If write fails, it might be because client disconnected
                        // Don't kill ffmpeg, let it continue in case client reconnects
                    }
                }
            });
            
            // Handle stream end
            ffmpeg.on('close', (code) => {
                const streamElapsed = (Date.now() - streamStartTime) / 1000;
                console.log(`FFmpeg process exited with code ${code}, bytes written: ${bytesWritten}, stream duration: ${streamElapsed.toFixed(2)}s`);
                
                // Check if stream ended prematurely (before actual video duration)
                if (streamDuration && streamElapsed < streamDuration * 0.9 && code === 0) {
                    console.warn(`⚠️ Stream ended prematurely! Expected ${streamDuration.toFixed(2)}s but only streamed ${streamElapsed.toFixed(2)}s. URL may have expired.`);
                }
                
                // Code 0 is normal exit, code 1 might be error but could also be end of stream
                // Code 8 typically means input file error (like 404)
                if (code === 8) {
                    console.error(`FFmpeg exited with code 8 - Input file error (likely 404 or invalid URL)`);
                    if (!res.headersSent && !hasError) {
                        res.status(500).json({ 
                            error: 'Stream URL expired or invalid', 
                            details: 'FFmpeg could not access the stream URL (error code 8). The URL may have expired or the video is unavailable.',
                            hint: 'YouTube URLs expire quickly. Try refreshing or searching again.',
                            code: code
                        });
                    }
                    if (!streamStarted) {
                        reject(new Error(`FFmpeg exit code ${code}`));
                    }
                    return;
                } else if (code !== 0 && code !== 1) {
                    console.error(`FFmpeg exited with error code: ${code}`);
                    if (!res.headersSent && !hasError) {
                        res.status(500).json({ 
                            error: 'FFmpeg process failed', 
                            details: `FFmpeg exited with code ${code}`,
                            hint: 'Check server logs for FFmpeg error details',
                            code: code
                        });
                    }
                    if (!streamStarted) {
                        reject(new Error(`FFmpeg exit code ${code}`));
                    }
                    return;
                }
                
                if (!res.headersSent && !hasError && !streamStarted) {
                    res.status(500).json({ 
                        error: 'Stream failed to start', 
                        details: 'FFmpeg process ended before streaming started',
                        hint: 'The video URL may be invalid or expired. Try refreshing.',
                        code: code
                    });
                    reject(new Error('Stream failed to start'));
                } else {
                    // Only end if headers were sent (stream was started)
                    // This allows the stream to end naturally when video finishes
                    res.end();
                }
            });
        }).catch(error => {
            console.error('Error getting audio URL:', error);
            console.error('Error stack:', error.stack);
            if (!res.headersSent) {
                res.status(500).json({ 
                    error: 'Failed to process YouTube URL', 
                    details: error.message,
                    hint: error.message.includes('not found') ? 
                        'yt-dlp or youtube-dl is not installed. Check Railway deployment logs.' : 
                        'Check Railway logs for more details about the error.'
                });
            }
            reject(error);
        });
    });
}

// Endpoint to start streaming a YouTube URL
app.get('/stream', (req, res) => {
    const youtubeUrl = req.query.url;
    const retry = req.query.retry === 'true'; // Allow retry parameter
    
    console.log(`Stream request received for: ${youtubeUrl}${retry ? ' (retry)' : ''}`);
    
    if (!youtubeUrl) {
        console.log('Stream request missing URL parameter');
        return res.status(400).json({ error: 'YouTube URL is required' });
    }

    // Disable timeouts for streaming connections (use very large value)
    req.setTimeout(INFINITE_TIMEOUT);
    res.setTimeout(INFINITE_TIMEOUT);
    if (req.socket) {
        req.socket.setTimeout(INFINITE_TIMEOUT);
        req.socket.setKeepAlive(true);
    }

    // Process stream directly
    processStreamRequest(req, res, youtubeUrl).catch(error => {
        console.error('Error processing stream request:', error);
        if (!res.headersSent) {
            res.status(500).json({ 
                error: 'Stream processing failed', 
                details: error.message 
            });
        }
    });
});

// Endpoint to proxy/transcode non-YouTube streams (e.g. HLS .m3u8/.ts) to AAC for browser playback.
// This avoids MEDIA_ERR_SRC_NOT_SUPPORTED when the browser cannot play the source directly.
app.get('/radio-stream', (req, res) => {
    const sourceUrl = req.query.url;
    console.log(`📻 Radio-stream request received for: ${sourceUrl}`);

    if (!sourceUrl) {
        return res.status(400).json({ error: 'Stream URL is required' });
    }

    // Disable timeouts for streaming connections (use very large value)
    req.setTimeout(INFINITE_TIMEOUT);
    res.setTimeout(INFINITE_TIMEOUT);
    if (req.socket) {
        req.socket.setTimeout(INFINITE_TIMEOUT);
        req.socket.setKeepAlive(true);
    }

    // Set headers for audio streaming with progressive streaming
    res.setHeader('Content-Type', 'audio/aac');
    res.setHeader('Transfer-Encoding', 'chunked');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('X-Accel-Buffering', 'no'); // Disable buffering for progressive streaming
    res.writeHead(200);

    const ffmpegArgs = [
        '-user_agent', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        '-reconnect', '1',
        '-reconnect_at_eof', '1',
        '-reconnect_streamed', '1',
        '-reconnect_delay_max', '30',  // Increased to 30 seconds
        '-reconnect_on_network_error', '1',
        '-timeout', '30000000',  // 30 seconds timeout (in microseconds)
        '-rw_timeout', '30000000',  // 30 seconds read/write timeout
        '-analyzeduration', '10000000',  // 10 seconds analysis duration
        '-probesize', '10000000',  // 10MB probe size
        '-fflags', '+genpts+flush_packets+discardcorrupt',  // Generate PTS, flush packets, and discard corrupt packets
        '-use_wallclock_as_timestamps', '1',  // Use wallclock timestamps for live streams (input option)
        '-i', sourceUrl,
        '-f', 'adts',
        '-acodec', 'aac',
        '-b:a', '128k',  // Audio bitrate
        '-ar', '44100',
        '-ac', '2',
        '-avoid_negative_ts', 'make_zero',
        '-flush_packets', '1',  // Flush packets immediately
        '-'
    ];

    console.log(`🚀 Starting FFmpeg for radio stream: ${sourceUrl}`);
    const ffmpeg = spawn('ffmpeg', ffmpegArgs, { shell: false, stdio: ['ignore', 'pipe', 'pipe'] });
    
    let ffmpegStarted = false;
    let firstDataReceived = false;

    const CHUNK_SIZE = 64 * 1024; // 64KB chunks for progressive streaming

    // Track stream start time and data flow for debugging
    const streamStartTime = Date.now();
    let lastDataTime = Date.now();
    let bytesWritten = 0;

    // Monitor for stream stalls and startup issues
    const startupTimeout = setTimeout(() => {
        if (!firstDataReceived) {
            console.error(`❌ Radio stream startup timeout: No data received after 15 seconds for ${sourceUrl}`);
            console.error(`   FFmpeg started: ${ffmpegStarted}, Bytes written: ${bytesWritten}`);
            if (!res.headersSent) {
                res.status(500).json({ 
                    error: 'Stream startup timeout', 
                    details: 'The radio stream did not start sending data within 15 seconds',
                    hint: 'The stream may be unavailable, blocked, or in an unsupported format'
                });
            }
        }
    }, 15000); // 15 second startup timeout

    const stallMonitor = setInterval(() => {
        const timeSinceLastData = Date.now() - lastDataTime;
        const streamDuration = (Date.now() - streamStartTime) / 1000;
        if (timeSinceLastData > 30000 && streamDuration > 60) {
            console.warn(`⚠️ Stream may have stalled: no data for ${Math.floor(timeSinceLastData / 1000)}s, total stream duration: ${Math.floor(streamDuration)}s, bytes written: ${bytesWritten}`);
        }
    }, 10000); // Check every 10 seconds

    // Track when FFmpeg process starts
    ffmpeg.on('spawn', () => {
        ffmpegStarted = true;
        console.log(`✅ FFmpeg process spawned for radio stream: ${sourceUrl}`);
    });

    ffmpeg.stdout.on('data', (chunk) => {
        if (!firstDataReceived) {
            firstDataReceived = true;
            clearTimeout(startupTimeout);
            const startupTime = Date.now() - streamStartTime;
            console.log(`✅ First data received from radio stream after ${startupTime}ms: ${sourceUrl}`);
        }
        
        lastDataTime = Date.now();
        bytesWritten += chunk.length;
        
        if (!res.destroyed) {
            try {
                // Process in smaller chunks for better progressive streaming
                let offset = 0;
                while (offset < chunk.length) {
                    const chunkToWrite = chunk.slice(offset, offset + CHUNK_SIZE);
                    if (chunkToWrite.length > 0) {
                        res.write(chunkToWrite);
                        offset += CHUNK_SIZE;
                    } else {
                        break;
                    }
                }
            } catch (err) {
                // client likely disconnected
                console.log('Client disconnected during radio stream write');
            }
        }
    });

    let hasError = false;
    let stderrBuffer = '';
    ffmpeg.stderr.on('data', (data) => {
        const msg = data.toString();
        stderrBuffer += msg;
        
        // Log important FFmpeg messages (not all are errors)
        if (msg.includes('Stream #0:') || msg.includes('Input #0') || msg.includes('Output #0')) {
            console.log(`📡 FFmpeg info: ${msg.trim()}`);
        }
        
        if (msg.toLowerCase().includes('error') || msg.toLowerCase().includes('http error') || msg.toLowerCase().includes('forbidden') || msg.toLowerCase().includes('connection refused')) {
            console.error(`❌ FFmpeg radio-stream error: ${msg.substring(0, 300).trim()}`);
            hasError = true;
            
            // Check for specific errors that should be reported to client
            if (msg.includes('404') || msg.includes('Not Found')) {
                clearTimeout(startupTimeout);
                if (!res.headersSent) {
                    res.status(500).json({ 
                        error: 'Stream URL not found', 
                        details: 'The radio stream URL returned 404 Not Found',
                        hint: 'The stream may be offline or the URL may be invalid'
                    });
                } else {
                    res.end();
                }
            } else if (msg.includes('403') || msg.includes('Forbidden')) {
                clearTimeout(startupTimeout);
                if (!res.headersSent) {
                    res.status(500).json({ 
                        error: 'Stream access forbidden', 
                        details: 'The radio stream returned 403 Forbidden',
                        hint: 'The stream may be restricted or require authentication'
                    });
                } else {
                    res.end();
                }
            } else if (msg.includes('Connection refused') || msg.includes('Name or service not known')) {
                clearTimeout(startupTimeout);
                if (!res.headersSent) {
                    res.status(500).json({ 
                        error: 'Stream connection failed', 
                        details: 'Could not connect to the radio stream server',
                        hint: 'The stream server may be down or the URL may be incorrect'
                    });
                } else {
                    res.end();
                }
            }
        }
    });

    ffmpeg.on('error', (error) => {
        console.error('FFmpeg radio-stream spawn error:', error);
        hasError = true;
        if (!res.headersSent) {
            res.status(500).json({ error: 'FFmpeg not found. Please install ffmpeg and add it to PATH.' });
        } else {
            res.end();
        }
    });

    ffmpeg.on('close', (code) => {
        clearInterval(stallMonitor);
        clearTimeout(startupTimeout);
        const streamDuration = (Date.now() - streamStartTime) / 1000;
        console.log(`FFmpeg radio-stream exited with code ${code} after ${Math.floor(streamDuration)}s (${Math.floor(streamDuration / 60)}m ${Math.floor(streamDuration % 60)}s), bytes written: ${bytesWritten}, first data received: ${firstDataReceived}`);
        
        // If stream failed to start, send error response
        if (code !== 0 && code !== 1 && !hasError && !res.headersSent) {
            res.status(500).json({ 
                error: 'Stream processing failed', 
                details: `FFmpeg exited with code ${code} after ${Math.floor(streamDuration)}s. First data received: ${firstDataReceived}`,
                hint: 'The stream may be unavailable or in an unsupported format'
            });
        } else if (!res.destroyed) {
            res.end();
        }
    });
});

// Helper function to get related/recommended videos from a YouTube URL
function getRelatedVideos(youtubeUrl) {
    return new Promise((resolve, reject) => {
        const commands = [
            { 
                cmd: 'yt-dlp', 
                args: [`${youtubeUrl}&list=RD${youtubeUrl.match(/[?&]v=([^&]+)/)?.[1] || ''}`, '--flat-playlist', '--playlist-end', '21', '--print', '%(id)s|%(title)s|%(duration)s'],
                parser: (output) => {
                    const lines = output.trim().split('\n').filter(line => line.trim());
                    // Skip the first video (it's the current one) and get up to 20 related
                    return lines.slice(1, 21).map(line => {
                        const [id, ...rest] = line.split('|');
                        const title = rest.slice(0, -1).join('|');
                        const duration = rest[rest.length - 1];
                        return {
                            id,
                            title: title || 'Unknown',
                            duration: duration || 'N/A',
                            url: `https://www.youtube.com/watch?v=${id}`
                        };
                    });
                }
            },
            { 
                cmd: 'yt-dlp.exe', 
                args: [`${youtubeUrl}&list=RD${youtubeUrl.match(/[?&]v=([^&]+)/)?.[1] || ''}`, '--flat-playlist', '--playlist-end', '21', '--print', '%(id)s|%(title)s|%(duration)s'],
                parser: (output) => {
                    const lines = output.trim().split('\n').filter(line => line.trim());
                    return lines.slice(1, 21).map(line => {
                        const [id, ...rest] = line.split('|');
                        const title = rest.slice(0, -1).join('|');
                        const duration = rest[rest.length - 1];
                        return {
                            id,
                            title: title || 'Unknown',
                            duration: duration || 'N/A',
                            url: `https://www.youtube.com/watch?v=${id}`
                        };
                    });
                }
            },
            // Fallback: Use search based on video title
            { 
                cmd: 'yt-dlp', 
                args: [youtubeUrl, '--print', '%(title)s'],
                parser: (titleOutput) => {
                    // This is a two-step process - first get title, then search
                    // For now, return empty and let it fall through to search
                    return [];
                },
                isTwoStep: true
            }
        ];

        let attemptIndex = 0;
        let hasResolved = false;

        function tryCommand() {
            if (hasResolved) return;
            
            if (attemptIndex >= commands.length) {
                hasResolved = true;
                reject(new Error('yt-dlp not found or failed to get related videos'));
                return;
            }

            const { cmd, args, parser } = commands[attemptIndex];
            console.log(`Getting related videos: Attempting to use ${cmd} for ${youtubeUrl}`);
            
            const isWindows = process.platform === 'win32';
            let childProcess;
            
            if (isWindows) {
                const psCommand = `& "${cmd}" ${args.map(arg => `"${arg}"`).join(' ')}`;
                childProcess = spawn('powershell.exe', [
                    '-NoProfile',
                    '-Command',
                    psCommand
                ], {
                    stdio: ['ignore', 'pipe', 'pipe']
                });
            } else {
                childProcess = spawn(cmd, args, { 
                    shell: false,
                    stdio: ['ignore', 'pipe', 'pipe']
                });
            }
            
            let output = '';
            let allStderr = '';
            const timeout = setTimeout(() => {
                if (!hasResolved) {
                    childProcess.kill();
                    console.log(`${cmd} timed out, trying next...`);
                    attemptIndex++;
                    tryCommand();
                }
            }, 30000);

            childProcess.stdout.on('data', (data) => {
                output += data.toString();
            });

            childProcess.stderr.on('data', (data) => {
                allStderr += data.toString();
            });

            childProcess.on('close', (code) => {
                clearTimeout(timeout);
                
                if (hasResolved) return;

                if (output.trim()) {
                    try {
                        const videos = parser(output);
                        if (videos.length > 0) {
                            hasResolved = true;
                            console.log(`Found ${videos.length} related videos using ${cmd}`);
                            resolve(videos);
                            return;
                        }
                    } catch (parseError) {
                        console.error(`Parse error with ${cmd}: ${parseError.message}`);
                    }
                }

                if (code !== 0 || !output.trim()) {
                    console.log(`${cmd} failed with code ${code}. Output length: ${output.length}`);
                    if (allStderr) {
                        console.log(`Stderr: ${allStderr.substring(0, 500)}`);
                    }
                }
                attemptIndex++;
                tryCommand();
            });

            childProcess.on('error', (error) => {
                clearTimeout(timeout);
                if (hasResolved) return;
                console.error(`${cmd} spawn error: ${error.message}`);
                attemptIndex++;
                tryCommand();
            });
        }

        tryCommand();
    });
}

// Alternative: Get related videos by searching for similar content
function getRelatedVideosBySearch(youtubeUrl) {
    return new Promise(async (resolve, reject) => {
        try {
            // First, get the video title
            const titleResult = await new Promise((resolveTitle, rejectTitle) => {
                const { spawn } = require('child_process');
                const cmd = process.platform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp';
                const child = spawn(cmd, [youtubeUrl, '--print', '%(title)s'], { shell: false });
                
                let output = '';
                child.stdout.on('data', (data) => output += data.toString());
                child.on('close', (code) => {
                    if (code === 0 && output.trim()) {
                        resolveTitle(output.trim());
                    } else {
                        rejectTitle(new Error('Failed to get video title'));
                    }
                });
                child.on('error', rejectTitle);
            });
            
            // Extract keywords from title (first few words)
            const keywords = titleResult.split(' ').slice(0, 3).join(' ');
            
            // Search for similar videos
            const videos = await searchYouTube(keywords);
            // Return first 20 results
            resolve(videos.slice(0, 20));
        } catch (error) {
            reject(error);
        }
    });
}

// Endpoint to search YouTube (optional - for finding music)
app.get('/search', async (req, res) => {
    const query = req.query.q;
    
    if (!query) {
        return res.status(400).json({ error: 'Search query is required' });
    }

    try {
        console.log(`Search request for: ${query}`);
        const videos = await searchYouTube(query);
        console.log(`Search returned ${videos.length} videos`);
        res.json({ videos });
    } catch (error) {
        console.error('Search error:', error);
        res.status(500).json({ error: 'Search failed', details: error.message });
    }
});

// Endpoint to get related/recommended videos (for autoplay next)
app.get('/related', async (req, res) => {
    const youtubeUrl = req.query.url;
    
    if (!youtubeUrl) {
        return res.status(400).json({ error: 'YouTube URL is required' });
    }

    try {
        console.log(`Related videos request for: ${youtubeUrl}`);
        let videos = [];
        
        // Try to get related videos using the main method
        try {
            videos = await getRelatedVideos(youtubeUrl);
            console.log(`Found ${videos.length} related videos using getRelatedVideos`);
        } catch (error) {
            console.log(`getRelatedVideos failed: ${error.message}, trying search fallback...`);
            // Fallback: search for similar videos based on title
            try {
                videos = await getRelatedVideosBySearch(youtubeUrl);
                console.log(`Found ${videos.length} related videos using search fallback`);
            } catch (searchError) {
                console.error('Search fallback also failed:', searchError);
                throw error; // Throw original error
            }
        }
        
        if (videos.length === 0) {
            console.warn('No related videos found, returning empty array');
        }
        
        res.json({ videos });
    } catch (error) {
        console.error('Related videos error:', error);
        console.error('Error stack:', error.stack);
        res.status(500).json({ 
            error: 'Failed to get related videos', 
            details: error.message,
            hint: 'This might be due to yt-dlp limitations or YouTube API changes'
        });
    }
});


// ===== RADIO BROWSER API ENDPOINTS =====

// Radio Browser API servers (try multiple for reliability)
const RADIO_BROWSER_API_SERVERS = [
    'https://de1.api.radio-browser.info/json',
    'https://de2.api.radio-browser.info/json',  // Germany server 2
    'https://nl1.api.radio-browser.info/json',
    'https://at1.api.radio-browser.info/json',
    'https://fr1.api.radio-browser.info/json',
    'https://fi1.api.radio-browser.info/json',  // Finland server
    'https://uk1.api.radio-browser.info/json',  // UK server
    'https://us1.api.radio-browser.info/json',  // US server
    'https://ch1.api.radio-browser.info/json'   // Switzerland server
];
const RADIO_BROWSER_API = RADIO_BROWSER_API_SERVERS[0]; // Default to first
const iprdFetcher = require('./scripts/iprd-fetcher');
const logoLookup = require('./scripts/logo-lookup');

// Get all countries from IPRD repository
app.get('/api/radio/countries', async (req, res) => {
    try {
        const countries = await iprdFetcher.getAllCountries();
        
        // Map to expected format
        const formattedCountries = countries.map(country => ({
            name: country.name,
            iso_3166_1: country.iso_3166_1,
            stationcount: country.stationcount || 0
        }));
        
        res.json({ countries: formattedCountries });
    } catch (error) {
        console.error('Error fetching countries from IPRD:', error);
        res.status(500).json({ error: 'Failed to fetch countries', details: error.message });
    }
});

// Curated radio stations for specific countries
const curatedStations = {
    'TR': [
        {
            stationuuid: 'curated-alemfm',
            name: 'Alem FM',
            url_resolved: 'http://turkmedya.radyotvonline.net/alemfmaac',
            favicon: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b4/Flag_of_Turkey.svg/512px-Flag_of_Turkey.svg.png',
            country: 'Turkey',
            tags: 'Turkish, Music',
            homepage: 'https://www.alemfm.com.tr'
        },
        {
            stationuuid: 'curated-powerturkfm',
            name: 'Power Türk FM',
            url_resolved: 'https://live.powerapp.com.tr/powerturk/abr/powerturk/128/playlist.m3u8',
            favicon: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b4/Flag_of_Turkey.svg/512px-Flag_of_Turkey.svg.png',
            country: 'Turkey',
            tags: 'Turkish, Music',
            homepage: 'https://www.powerturk.com'
        },
        {
            stationuuid: 'curated-kafaradyo',
            name: 'Kafa Radyo',
            url_resolved: 'https://moondigitalmaster.radyotvonline.net/kafaradyo/playlist.m3u8',
            favicon: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b4/Flag_of_Turkey.svg/512px-Flag_of_Turkey.svg.png',
            country: 'Turkey',
            tags: 'Turkish, Music',
            homepage: ''
        },
        {
            stationuuid: 'curated-kralfm',
            name: 'Kral FM',
            url_resolved: 'http://46.20.3.204/',
            favicon: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b4/Flag_of_Turkey.svg/512px-Flag_of_Turkey.svg.png',
            country: 'Turkey',
            tags: 'Turkish, Music',
            homepage: 'https://www.kral.com.tr'
        },
        {
            stationuuid: 'curated-kralpop',
            name: 'Kral Pop',
            url_resolved: 'http://kralpopwmp.radyotvonline.com/',
            favicon: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b4/Flag_of_Turkey.svg/512px-Flag_of_Turkey.svg.png',
            country: 'Turkey',
            tags: 'Turkish, Pop Music',
            homepage: 'https://www.kral.com.tr'
        },
        {
            stationuuid: 'curated-joyturk',
            name: 'Joy Türk',
            url_resolved: 'https://playerservices.streamtheworld.com/api/livestream-redirect/JOY_TURK_SC',
            favicon: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b4/Flag_of_Turkey.svg/512px-Flag_of_Turkey.svg.png',
            country: 'Turkey',
            tags: 'Turkish, Alternative Music',
            homepage: 'https://www.joyturk.com.tr'
        },
        {
            stationuuid: 'curated-slowturk',
            name: 'Slow Türk',
            url_resolved: 'https://radyo.duhnet.tv/ak_dtvh_slowturk',
            favicon: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b4/Flag_of_Turkey.svg/512px-Flag_of_Turkey.svg.png',
            country: 'Turkey',
            tags: 'Turkish, Slow Music',
            homepage: ''
        },
        {
            stationuuid: 'curated-superfm',
            name: 'Super FM',
            url_resolved: 'https://playerservices.streamtheworld.com/api/livestream-redirect/SUPER_FM_SC',
            favicon: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b4/Flag_of_Turkey.svg/512px-Flag_of_Turkey.svg.png',
            country: 'Turkey',
            tags: 'Turkish, Music',
            homepage: 'https://www.superfm.com.tr'
        },
        {
            stationuuid: 'curated-numberoneturk',
            name: 'Number One Türk',
            url_resolved: 'https://n10101m.mediatriple.net/numberoneturk',
            favicon: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b4/Flag_of_Turkey.svg/512px-Flag_of_Turkey.svg.png',
            country: 'Turkey',
            tags: 'Turkish, Pop Music',
            homepage: ''
        },
        {
            stationuuid: 'curated-bestfm',
            name: 'Best FM',
            url_resolved: 'http://46.20.7.126/bestfmmp3',
            favicon: 'https://www.google.com/s2/favicons?domain=bestfm.com.tr&sz=128',
            country: 'Turkey',
            tags: 'Turkish, Music',
            homepage: 'https://www.bestfm.com.tr'
        },
        {
            stationuuid: 'curated-showradyo',
            name: 'Show Radyo',
            url_resolved: 'http://46.20.3.229/',
            favicon: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b4/Flag_of_Turkey.svg/512px-Flag_of_Turkey.svg.png',
            country: 'Turkey',
            tags: 'Turkish, Music',
            homepage: ''
        },
        {
            stationuuid: 'curated-palfm',
            name: 'Pal FM',
            url_resolved: 'http://shoutcast.radyogrup.com:1030/',
            favicon: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b4/Flag_of_Turkey.svg/512px-Flag_of_Turkey.svg.png',
            country: 'Turkey',
            tags: 'Turkish, Music',
            homepage: ''
        },
        {
            stationuuid: 'curated-palstation',
            name: 'Pal Station',
            url_resolved: 'http://shoutcast.radyogrup.com:1020/',
            favicon: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b4/Flag_of_Turkey.svg/512px-Flag_of_Turkey.svg.png',
            country: 'Turkey',
            tags: 'Turkish, Music',
            homepage: ''
        },
        {
            stationuuid: 'curated-powerfm',
            name: 'Power FM',
            url_resolved: 'https://live.powerapp.com.tr/powerfm/abr/playlist.m3u8',
            favicon: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b4/Flag_of_Turkey.svg/512px-Flag_of_Turkey.svg.png',
            country: 'Turkey',
            tags: 'Turkish, Music',
            homepage: 'https://www.powerfm.com.tr'
        },
        {
            stationuuid: 'curated-virginradyo',
            name: 'Virgin Radyo',
            url_resolved: 'https://playerservices.streamtheworld.com/api/livestream-redirect/VIRGIN_RADIO_SC',
            favicon: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b4/Flag_of_Turkey.svg/512px-Flag_of_Turkey.svg.png',
            country: 'Turkey',
            tags: 'Turkish, Music',
            homepage: 'https://www.virginradyo.com.tr'
        }
    ]
};

// Get stations for a country
app.get('/api/radio/stations/:countryCode', async (req, res) => {
    try {
        const { countryCode } = req.params;
        const limit = req.query.limit || 1000;
        const enhanceLogos = req.query.enhanceLogos !== 'false'; // Default to true
        
        // Check if we have curated stations for this country
        const curated = curatedStations[countryCode.toUpperCase()] || [];
        
        // Fetch from IPRD repository first
        let iprdStations = [];
        try {
            iprdStations = await iprdFetcher.getStationsForCountry(countryCode);
        } catch (iprdError) {
            console.warn('IPRD fetch error, trying Radio Browser API:', iprdError.message);
        }
        
        // Fallback to Radio Browser API if IPRD has no stations
        let apiStations = [];
        if (iprdStations.length === 0) {
            try {
                const response = await fetch(
                    `${RADIO_BROWSER_API}/stations/search?countrycode=${countryCode}&limit=${limit}&order=clickcount&reverse=true`
                );
                
                if (response.ok) {
                    apiStations = await response.json();
                }
            } catch (apiError) {
                console.warn('Radio Browser API error:', apiError.message);
            }
        }
        
        // Merge: curated first, then IPRD, then Radio Browser API
        let allStations = [...curated, ...iprdStations, ...apiStations];
        
        // Enhance with logos for stations that don't have them
        // This is optimized to only process stations without valid logos
        if (enhanceLogos && allStations.length > 0) {
            try {
                // Increase limit to 300 stations for better logo coverage
                // Since we only enhance stations without logos, this should still be reasonably fast
                const stationsToEnhance = allStations.slice(0, 300);
                const enhanced = await logoLookup.enhanceStationsWithLogos(stationsToEnhance);
                allStations = [...enhanced, ...allStations.slice(300)];
            } catch (logoError) {
                console.warn('Logo enhancement error:', logoError.message);
                // Continue without enhancement if it fails
            }
        }
        
        res.json({ stations: allStations });
    } catch (error) {
        console.error('Error fetching stations:', error);
        res.status(500).json({ error: 'Failed to fetch stations', details: error.message });
    }
});

// Proxy endpoint for Radio Browser API searches (to avoid CORS issues)
app.get('/api/radio/search', async (req, res) => {
    try {
        const { tag, limit = 100, order = 'clickcount', reverse = 'true' } = req.query;
        
        if (!tag) {
            return res.status(400).json({ error: 'Tag parameter is required' });
        }
        
        // Build the Radio Browser API URL
        const apiUrl = `${RADIO_BROWSER_API}/stations/search?tag=${encodeURIComponent(tag)}&limit=${limit}&order=${order}&reverse=${reverse}`;
        
        console.log(`Proxying Radio Browser API request: ${apiUrl}`);
        
        // Try multiple API servers for reliability
        let lastError = null;
        const timeout = 60000; // 60 second timeout (increased from 30)
        
        for (const apiServer of RADIO_BROWSER_API_SERVERS) {
            const apiUrl = `${apiServer}/stations/search?tag=${encodeURIComponent(tag)}&limit=${limit}&order=${order}&reverse=${reverse}`;
            console.log(`Trying Radio Browser API: ${apiServer}`);
            
            try {
                // Create AbortController for timeout
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), timeout);
                
                // Fetch from Radio Browser API (server-side, no CORS issues)
                const response = await fetch(apiUrl, {
                    headers: {
                        'User-Agent': 'Radio App/1.0'
                    },
                    signal: controller.signal
                });
                
                clearTimeout(timeoutId);
                
                if (!response.ok) {
                    const errorText = await response.text().catch(() => 'Unknown error');
                    console.warn(`Radio Browser API error (${apiServer}): ${response.status} ${response.statusText}`);
                    lastError = new Error(`Radio Browser API returned ${response.status}: ${errorText}`);
                    continue; // Try next server
                }
                
                const stations = await response.json();
                
                if (!Array.isArray(stations)) {
                    console.warn('Radio Browser API returned non-array response:', typeof stations);
                    return res.json([]);
                }
                
                console.log(`Successfully fetched ${stations.length} stations from ${apiServer}`);
                return res.json(stations);
                
            } catch (fetchError) {
                if (fetchError.name === 'AbortError') {
                    console.warn(`Timeout fetching from ${apiServer}, trying next server...`);
                    lastError = new Error(`Request timeout: Radio Browser API (${apiServer}) took too long to respond`);
                } else {
                    console.warn(`Error fetching from ${apiServer}: ${fetchError.message}, trying next server...`);
                    lastError = fetchError;
                }
                // Continue to next server
                continue;
            }
        }
        
        // If all servers failed, return empty array instead of error
        // This allows the UI to continue working even if API is down
        console.warn('⚠️ All Radio Browser API servers failed. Returning empty results.');
        console.warn('Last error:', lastError?.message || 'Unknown error');
        
        // Return empty array so UI doesn't break
        return res.json([]);
    } catch (error) {
        console.error('Error proxying Radio Browser API search:', error);
        console.error('Error stack:', error.stack);
        console.error('Request details:', {
            tag: req.query.tag,
            limit: req.query.limit,
            apiUrl: `${RADIO_BROWSER_API}/stations/search?tag=${encodeURIComponent(req.query.tag)}&limit=${req.query.limit || 100}&order=${req.query.order || 'clickcount'}&reverse=${req.query.reverse || 'true'}`
        });
        
        // Return empty array instead of 500 error to prevent UI breakage
        // The frontend can handle empty results gracefully
        console.warn('⚠️ Returning empty results due to API error');
        return res.json([]);
    }
});

// Get working stream URL for a station (try multiple URLs)
app.get('/api/radio/stream/:stationId', async (req, res) => {
    try {
        const { stationId } = req.params;
        
        // Check if it's an IPRD station (format: iprd-{code}-{index})
        if (stationId.startsWith('iprd-')) {
            // For IPRD stations, the URL is already in the station data
            // Frontend should pass the URL directly, but we'll handle requests here
            return res.status(404).json({ error: 'IPRD stations should use direct URLs' });
        }
        
        // Check curated stations first
        for (const [code, stations] of Object.entries(curatedStations)) {
            const station = stations.find(s => s.stationuuid === stationId);
            if (station && station.url_resolved) {
                return res.json({
                    streamUrl: station.url_resolved,
                    alternativeUrls: [],
                    station: {
                        name: station.name,
                        country: station.country,
                        favicon: station.favicon,
                        homepage: station.homepage
                    }
                });
            }
        }
        
        // Try Radio Browser API
        const stationResponse = await fetch(`${RADIO_BROWSER_API}/stations/byuuid/${stationId}`);
        if (!stationResponse.ok) {
            throw new Error(`Station not found: ${stationResponse.status}`);
        }
        
        const stations = await stationResponse.json();
        if (!stations || stations.length === 0) {
            throw new Error('Station not found');
        }
        
        const station = stations[0];
        const streamUrls = station.url_resolved ? [station.url_resolved] : 
                          station.url ? [station.url] : [];
        
        // If we have url_resolved, try that first, then fall back to url
        if (station.url_resolved && station.url && station.url_resolved !== station.url) {
            streamUrls.push(station.url);
        }
        
        if (streamUrls.length === 0) {
            throw new Error('No stream URLs available for this station');
        }
        
        // Return the first URL (most reliable), frontend will try others if needed
        res.json({ 
            streamUrl: streamUrls[0],
            alternativeUrls: streamUrls.slice(1),
            station: {
                name: station.name,
                country: station.country,
                favicon: station.favicon,
                homepage: station.homepage
            }
        });
    } catch (error) {
        console.error('Error getting stream URL:', error);
        res.status(500).json({ error: 'Failed to get stream URL', details: error.message });
    }
});

// Parse M3U8 playlist for metadata
async function parseM3U8Metadata(streamUrl) {
    try {
        // Create AbortController for timeout (AbortSignal.timeout may not be available in Node.js)
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);
        
        const response = await fetch(streamUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            },
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
            return null;
        }
        
        const content = await response.text();
        const lines = content.split('\n');
        
        // Look for EXTINF lines with metadata
        // Format: #EXTINF:-1,Artist - Song Title
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (line.startsWith('#EXTINF:')) {
                const match = line.match(/#EXTINF:(-?\d+)(?:\s+(.+))?/);
                if (match && match[2]) {
                    const attrs = match[2];
                    // Extract title (after comma)
                    const titleMatch = attrs.match(/,(.+)$/);
                    if (titleMatch) {
                        const title = titleMatch[1].trim();
                        if (title && title !== 'Unknown' && title.length > 0) {
                            return { title: title };
                        }
                    }
                }
            }
            // Some playlists have #EXT-X-STREAM-INF with metadata
            if (line.startsWith('#EXT-X-STREAM-INF:')) {
                const nameMatch = line.match(/NAME="([^"]+)"/i);
                if (nameMatch) {
                    return { title: nameMatch[1] };
                }
            }
        }
        
        return null;
    } catch (error) {
        console.debug('M3U8 parsing failed:', error.message);
        return null;
    }
}

// Extract Shoutcast/Icecast metadata from stream (works for MP3 streams too)
function extractStreamMetadata(streamUrl) {
    return new Promise(async (resolve, reject) => {
        try {
            // Check if it's an M3U8 playlist
            if (streamUrl.includes('.m3u8') || streamUrl.includes('m3u8')) {
                const m3u8Metadata = await parseM3U8Metadata(streamUrl);
                if (m3u8Metadata) {
                    return resolve(m3u8Metadata);
                }
                // If M3U8 parsing fails, try the actual stream URL (might be in playlist)
                // For now, return null - M3U8 live streams rarely have metadata
                return resolve(null);
            }
            
            const url = new URL(streamUrl);
            const httpModule = url.protocol === 'https:' ? https : http;
            
            const options = {
                hostname: url.hostname,
                port: url.port || (url.protocol === 'https:' ? 443 : 80),
                path: url.pathname + (url.search || ''),
                method: 'GET',
                headers: {
                    'Icy-MetaData': '1',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    'Accept': '*/*'
                },
                timeout: 10000 // 10 second timeout
            };

            const req = httpModule.request(options, (res) => {
                let metadata = null;
                
                // Check for metadata in headers (some servers send it directly)
                if (res.headers['icy-name']) {
                    metadata = {
                        stationName: res.headers['icy-name'],
                        genre: res.headers['icy-genre'],
                        bitrate: res.headers['icy-br'],
                        url: res.headers['icy-url']
                    };
                }
                
                // Check for StreamTitle in headers
                if (res.headers['streamtitle']) {
                    metadata = metadata || {};
                    metadata.title = res.headers['streamtitle'];
                }
                
                // Get metadata interval (how often metadata is embedded in stream)
                const metaInt = parseInt(res.headers['icy-metaint'] || '0', 10);
                
                if (metaInt > 0) {
                    // Read metadata from stream
                    let audioData = Buffer.alloc(0);
                    let metadataRead = false;
                    
                    res.on('data', (chunk) => {
                        if (!metadataRead && audioData.length < metaInt) {
                            audioData = Buffer.concat([audioData, chunk]);
                            
                            if (audioData.length >= metaInt) {
                                // Extract metadata
                                const audioChunk = audioData.slice(0, metaInt);
                                const metadataChunk = audioData.slice(metaInt);
                                
                                if (metadataChunk.length > 0) {
                                    // First byte is metadata length (in 16-byte blocks)
                                    const metadataLength = metadataChunk[0] * 16;
                                    
                                    if (metadataLength > 0 && metadataChunk.length >= metadataLength + 1) {
                                        const metadataString = metadataChunk.slice(1, metadataLength + 1).toString('utf8');
                                        
                                        // Parse metadata string (format: StreamTitle='Artist - Song';)
                                        const titleMatch = metadataString.match(/StreamTitle=['"]([^'"]+)['"]/i);
                                        if (titleMatch) {
                                            metadata = metadata || {};
                                            metadata.title = titleMatch[1];
                                        }
                                        
                                        // Parse other metadata
                                        const urlMatch = metadataString.match(/StreamUrl=['"]([^'"]+)['"]/i);
                                        if (urlMatch) {
                                            metadata = metadata || {};
                                            metadata.url = urlMatch[1];
                                        }
                                    }
                                }
                                
                                metadataRead = true;
                                req.destroy(); // Close connection after reading metadata
                                resolve(metadata);
                            }
                        }
                    });
                    
                    res.on('end', () => {
                        if (!metadataRead) {
                            resolve(metadata);
                        }
                    });
                    
                    res.on('error', (err) => {
                        reject(err);
                    });
                } else {
                    // No metadata interval, return what we got from headers
                    req.destroy();
                    resolve(metadata);
                }
            });
            
            req.on('error', (err) => {
                reject(err);
            });
            
            req.on('timeout', () => {
                req.destroy();
                reject(new Error('Metadata request timeout'));
            });
            
            req.end();
        } catch (error) {
            reject(error);
        }
    });
}

// Parse M3U8 playlist for metadata
async function parseM3U8Metadata(streamUrl) {
    try {
        // Create AbortController for timeout (AbortSignal.timeout may not be available in Node.js)
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);
        
        const response = await fetch(streamUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            },
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
            return null;
        }
        
        const content = await response.text();
        const lines = content.split('\n');
        
        // Look for EXTINF lines with metadata
        // Format: #EXTINF:-1,Artist - Song Title
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (line.startsWith('#EXTINF:')) {
                const match = line.match(/#EXTINF:(-?\d+)(?:\s+(.+))?/);
                if (match && match[2]) {
                    const attrs = match[2];
                    // Extract title (after comma)
                    const titleMatch = attrs.match(/,(.+)$/);
                    if (titleMatch) {
                        const title = titleMatch[1].trim();
                        if (title && title !== 'Unknown' && title.length > 0) {
                            return { title: title };
                        }
                    }
                }
            }
            // Some playlists have #EXT-X-STREAM-INF with metadata
            if (line.startsWith('#EXT-X-STREAM-INF:')) {
                const nameMatch = line.match(/NAME="([^"]+)"/i);
                if (nameMatch) {
                    return { title: nameMatch[1] };
                }
            }
        }
        
        return null;
    } catch (error) {
        console.debug('M3U8 parsing failed:', error.message);
        return null;
    }
}

// Endpoint to get stream metadata
app.get('/api/radio/metadata', async (req, res) => {
    const streamUrl = req.query.url;
    
    if (!streamUrl) {
        return res.status(400).json({ error: 'Stream URL is required' });
    }
    
    try {
        // For M3U8 streams, try to get the actual stream URL from playlist
        let actualStreamUrl = streamUrl;
        if (streamUrl.includes('.m3u8') || streamUrl.includes('m3u8')) {
            // Try to extract first stream URL from M3U8 playlist
            try {
                // Create AbortController for timeout
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 10000);
                
                const response = await fetch(streamUrl, {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                    },
                    signal: controller.signal
                });
                
                clearTimeout(timeoutId);
                if (response.ok) {
                    const content = await response.text();
                    const lines = content.split('\n');
                    // Find first non-comment, non-empty line (usually the stream URL)
                    for (const line of lines) {
                        const trimmed = line.trim();
                        if (trimmed && !trimmed.startsWith('#')) {
                            // If it's a relative URL, make it absolute
                            if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
                                actualStreamUrl = trimmed;
                            } else {
                                // Relative URL - construct absolute URL
                                const baseUrl = new URL(streamUrl);
                                actualStreamUrl = new URL(trimmed, baseUrl).href;
                            }
                            break;
                        }
                    }
                }
            } catch (e) {
                // If M3U8 parsing fails, use original URL
                console.debug('Could not parse M3U8 for stream URL:', e.message);
            }
        }
        
        const metadata = await extractStreamMetadata(actualStreamUrl);
        
        if (metadata && metadata.title) {
            // Parse artist and song from title (format: "Artist - Song" or "Song")
            const titleParts = metadata.title.split(' - ');
            const artist = titleParts.length > 1 ? titleParts[0].trim() : null;
            const song = titleParts.length > 1 ? titleParts.slice(1).join(' - ').trim() : titleParts[0].trim();
            
            res.json({
                success: true,
                title: metadata.title,
                artist: artist,
                song: song,
                stationName: metadata.stationName,
                genre: metadata.genre,
                bitrate: metadata.bitrate
            });
        } else {
            res.json({
                success: false,
                message: 'No metadata available for this stream',
                streamType: streamUrl.includes('.m3u8') ? 'M3U8' : streamUrl.includes('.mp3') ? 'MP3' : 'Unknown'
            });
        }
    } catch (error) {
        console.error('Error extracting stream metadata:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to extract metadata'
        });
    }
});

// ===== AUTHENTICATION ENDPOINTS =====

// Middleware to check if user is authenticated
function requireAuth(req, res, next) {
    if (req.session && req.session.userId) {
        next();
    } else {
        res.status(401).json({ error: 'Unauthorized' });
    }
}

// Initialize database on startup
(async () => {
    try {
        await db.initDatabase();
        console.log('✅ Database initialized');
    } catch (err) {
        console.error('❌ Failed to initialize database:', err);
    }
})();

// Signup endpoint
app.post('/api/auth/signup', async (req, res) => {
    try {
        const { username, email, password } = req.body;
        
        if (!username || !email || !password) {
            return res.status(400).json({ error: 'Username, email, and password are required' });
        }
        
        if (password.length < 6) {
            return res.status(400).json({ error: 'Password must be at least 6 characters long' });
        }
        
        const user = await db.createUser(username, email, password);
        
        // Set session
        req.session.userId = user.id;
        req.session.username = user.username;
        
        res.json({
            user: {
                id: user.id,
                username: user.username,
                email: user.email
            }
        });
    } catch (error) {
        console.error('Signup error:', error);
        if (error.message.includes('already exists')) {
            res.status(400).json({ error: error.message });
        } else {
            res.status(500).json({ error: 'Signup failed', details: error.message });
        }
    }
});

// Login endpoint
app.post('/api/auth/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        
        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password are required' });
        }
        
        const user = await db.getUserByUsername(username);
        
        if (!user) {
            return res.status(401).json({ error: 'Invalid username or password' });
        }
        
        const isValid = await db.verifyPassword(user, password);
        
        if (!isValid) {
            return res.status(401).json({ error: 'Invalid username or password' });
        }
        
        // Set session
        req.session.userId = user.id;
        req.session.username = user.username;
        
        res.json({
            user: {
                id: user.id,
                username: user.username,
                email: user.email
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Login failed', details: error.message });
    }
});

// Logout endpoint
app.post('/api/auth/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error('Logout error:', err);
            return res.status(500).json({ error: 'Logout failed' });
        }
        res.clearCookie('connect.sid');
        res.json({ success: true });
    });
});

// Get current user endpoint
// Returns 200 with null user if not authenticated (instead of 401) to avoid browser errors
app.get('/api/auth/me', async (req, res) => {
    try {
        if (req.session && req.session.userId) {
            const user = await db.getUserById(req.session.userId);
            if (user) {
                return res.json({ user });
            }
        }
        // Return 200 with null user instead of 401 to avoid browser console errors
        res.status(200).json({ user: null });
    } catch (error) {
        console.error('Auth status error:', error);
        res.status(500).json({ error: 'Failed to check authentication status' });
    }
});

// ===== FAVORITES ENDPOINTS =====

// Get favorites (grouped by category)
app.get('/api/favorites', requireAuth, async (req, res) => {
    try {
        const favorites = await db.getFavoritesByCategory(req.session.userId);
        res.json({ favoritesByCategory: favorites });
    } catch (error) {
        console.error('Get favorites error:', error);
        res.status(500).json({ error: 'Failed to fetch favorites', details: error.message });
    }
});

// Check if item is favorite
app.get('/api/favorites/check', requireAuth, async (req, res) => {
    try {
        const { itemType, itemId } = req.query;
        
        if (!itemType || !itemId) {
            return res.status(400).json({ error: 'itemType and itemId are required' });
        }
        
        const isFavorite = await db.isFavorite(req.session.userId, itemType, itemId);
        res.json({ isFavorite });
    } catch (error) {
        console.error('Check favorite error:', error);
        res.status(500).json({ error: 'Failed to check favorite status', details: error.message });
    }
});

// Add favorite
app.post('/api/favorites', requireAuth, async (req, res) => {
    try {
        const { itemType, itemId, itemName, itemUrl, category, logoUrl, metadata } = req.body;
        
        if (!itemType || !itemId || !itemName || !itemUrl) {
            return res.status(400).json({ error: 'itemType, itemId, itemName, and itemUrl are required' });
        }
        
        await db.addFavorite(
            req.session.userId,
            itemType,
            itemId,
            itemName,
            itemUrl,
            category,
            logoUrl,
            metadata
        );
        
        res.json({ success: true });
    } catch (error) {
        console.error('Add favorite error:', error);
        res.status(500).json({ error: 'Failed to add favorite', details: error.message });
    }
});

// Remove favorite
app.delete('/api/favorites', requireAuth, async (req, res) => {
    try {
        const { itemType, itemId } = req.body;
        
        if (!itemType || !itemId) {
            return res.status(400).json({ error: 'itemType and itemId are required' });
        }
        
        await db.removeFavorite(req.session.userId, itemType, itemId);
        res.json({ success: true });
    } catch (error) {
        console.error('Remove favorite error:', error);
        res.status(500).json({ error: 'Failed to remove favorite', details: error.message });
    }
});

// Favicon endpoint (to prevent 404 errors)
app.get('/favicon.ico', (req, res) => {
    res.status(204).end();
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
});

// Diagnostic endpoint to check if required tools are available
app.get('/diagnostics', async (req, res) => {
    const diagnostics = {
        platform: process.platform,
        nodeVersion: process.version,
        tools: {}
    };
    
    // Check yt-dlp
    const { exec } = require('child_process');
    const checkTool = (tool) => {
        return new Promise((resolve) => {
            exec(`which ${tool} || command -v ${tool}`, (error, stdout) => {
                if (error) {
                    resolve({ available: false, path: null, error: error.message });
                } else {
                    resolve({ available: true, path: stdout.trim() });
                }
            });
        });
    };
    
    // Check tools
    diagnostics.tools['yt-dlp'] = await checkTool('yt-dlp');
    diagnostics.tools['ffmpeg'] = await checkTool('ffmpeg');
    
    // Try to get version
    const getVersion = (tool) => {
        return new Promise((resolve) => {
            exec(`${tool} --version`, { timeout: 5000 }, (error, stdout) => {
                if (error) {
                    resolve(null);
                } else {
                    resolve(stdout.trim().split('\n')[0]);
                }
            });
        });
    };
    
    if (diagnostics.tools['yt-dlp'].available) {
        diagnostics.tools['yt-dlp'].version = await getVersion('yt-dlp');
    }
    
    if (diagnostics.tools['ffmpeg'].available) {
        diagnostics.tools['ffmpeg'].version = await getVersion('ffmpeg');
    }
    
    res.json(diagnostics);
});

// Catch-all route for SPA - serve index.html for any non-API routes
app.get('*', (req, res) => {
    // Don't serve index.html for API routes or other non-page routes
    if (req.path.startsWith('/api/') || 
        req.path.startsWith('/stream') || 
        req.path.startsWith('/search') || 
        req.path.startsWith('/health') ||
        req.path.startsWith('/diagnostics') ||
        req.path === '/favicon.ico') {
        return res.status(404).json({ error: 'Not found' });
    }
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Verify public directory exists before starting
const publicPath = path.join(__dirname, 'public');
const indexPath = path.join(publicPath, 'index.html');

if (!fs.existsSync(publicPath)) {
    console.error(`❌ ERROR: Public directory not found at ${publicPath}`);
    console.error(`Current working directory: ${process.cwd()}`);
    console.error(`__dirname: ${__dirname}`);
    process.exit(1);
}

if (!fs.existsSync(indexPath)) {
    console.error(`❌ ERROR: index.html not found at ${indexPath}`);
    process.exit(1);
}

console.log(`✅ Public directory found at: ${publicPath}`);
console.log(`✅ index.html found at: ${indexPath}`);


const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n✅ Radio server running!`);
    console.log(`   Port:     ${PORT}`);
    console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
    
    // Only show network info in development
    if (process.env.NODE_ENV !== 'production') {
        const os = require('os');
        const networkInterfaces = os.networkInterfaces();
        let localIP = 'localhost';
        
        // Find local IP address
        for (const interfaceName in networkInterfaces) {
            const addresses = networkInterfaces[interfaceName];
            for (const address of addresses) {
                if (address.family === 'IPv4' && !address.internal) {
                    localIP = address.address;
                    break;
                }
            }
            if (localIP !== 'localhost') break;
        }
        
        console.log(`   Local:    http://localhost:${PORT}`);
        console.log(`   Network:  http://${localIP}:${PORT}`);
        console.log(`\n📱 Access from other devices on the same Wi-Fi:`);
        console.log(`   http://${localIP}:${PORT}`);
        console.log(`\n⚠️  Make sure Windows Firewall allows Node.js on port ${PORT}`);
    }
    console.log(`   Make sure ffmpeg and yt-dlp are installed and in your PATH\n`);
}).on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        console.error(`\n❌ Port ${PORT} is already in use!`);
        console.log(`\nTo free the port, run: npm run kill-port`);
        console.log(`Or manually kill the process using: netstat -ano | findstr :${PORT}`);
        process.exit(1);
    } else {
        console.error('Server listen error:', err);
        throw err;
    }
});

// Disable HTTP server timeouts to prevent 15-minute cutoffs
// Use very large values (24 hours in milliseconds) instead of 0
if (server) {
    server.timeout = INFINITE_TIMEOUT;  // Very long timeout for HTTP server
    server.keepAliveTimeout = INFINITE_TIMEOUT;  // Very long keep-alive timeout
    server.headersTimeout = INFINITE_TIMEOUT;  // Very long headers timeout
}

// Handle uncaught errors gracefully
process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
    console.error('Stack:', err.stack);
    // In production, log but don't exit - let Railway handle restarts
    // In development, exit to catch issues early
    if (process.env.NODE_ENV !== 'production') {
        process.exit(1);
    }
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise);
    console.error('Reason:', reason);
    if (reason && reason.stack) {
        console.error('Stack:', reason.stack);
    }
    // In production, log but don't exit - let Railway handle restarts
    // In development, exit to catch issues early
    if (process.env.NODE_ENV !== 'production') {
        process.exit(1);
    }
});

