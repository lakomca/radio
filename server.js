const express = require('express');
const { spawn, exec } = require('child_process');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Serve static files
app.use(express.static('public'));

// Helper function to execute yt-dlp and get URL
function getAudioUrl(youtubeUrl) {
    return new Promise((resolve, reject) => {
        // On Windows, try both with and without .exe, and try youtube-dl as fallback
        const commands = [
            { cmd: 'yt-dlp', args: [youtubeUrl, '-f', 'bestaudio/best', '-g'] },
            { cmd: 'yt-dlp.exe', args: [youtubeUrl, '-f', 'bestaudio/best', '-g'] },
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

            const { cmd, args } = commands[attemptIndex];
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
                    const url = output.trim().split('\n')[0];
                    console.log(`Successfully got audio URL using ${cmd}`);
                    resolve(url);
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
                args: [`ytsearch10:${query}`, '--flat-playlist', '--print', '%(id)s|%(title)s|%(duration)s'],
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
                args: [`ytsearch10:${query}`, '--flat-playlist', '--print', '%(id)s|%(title)s|%(duration)s'],
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
                args: [`ytsearch10:${query}`, '--flat-playlist', '--get-id', '--get-title', '--get-duration'],
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
                args: [`ytsearch10:${query}`, '--flat-playlist', '--get-id', '--get-title', '--get-duration'],
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
                        const videos = parser(output);
                        if (videos.length > 0) {
                            hasResolved = true;
                            console.log(`Search: Found ${videos.length} videos using ${cmd}`);
                            resolve(videos);
                            return;
                        }
                    } catch (parseError) {
                        console.error(`Parse error with ${cmd}: ${parseError.message}`);
                        console.error(`Output was: ${output.substring(0, 200)}`);
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

// CORS middleware
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-Origin, Content-Type, Accept');
    next();
});

// Endpoint to start streaming a YouTube URL
app.get('/stream', (req, res) => {
    const youtubeUrl = req.query.url;
    
    console.log(`Stream request received for: ${youtubeUrl}`);
    
    if (!youtubeUrl) {
        console.log('Stream request missing URL parameter');
        return res.status(400).json({ error: 'YouTube URL is required' });
    }

    // Get audio URL from YouTube using yt-dlp first
    getAudioUrl(youtubeUrl).then(audioUrl => {
        if (!audioUrl || !audioUrl.trim()) {
            console.error('Failed to get audio URL');
            return res.status(500).json({ error: 'Failed to get audio URL' });
        }

        const url = audioUrl;
        console.log(`Starting ffmpeg stream for: ${youtubeUrl}`);
        console.log(`Audio URL: ${url.substring(0, 100)}...`);
        
        // Set headers for audio streaming - send immediately
        res.setHeader('Content-Type', 'audio/mpeg');
        res.setHeader('Transfer-Encoding', 'chunked');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.setHeader('Accept-Ranges', 'bytes');
        res.writeHead(200);
        
        const ffmpegArgs = [
            '-i', url,
            '-f', 'mp3',
            '-acodec', 'libmp3lame',
            '-ab', '128k',  // Lower bitrate for faster start
            '-ar', '44100',
            '-ac', '2',
            '-reconnect', '1',
            '-reconnect_at_eof', '1',
            '-reconnect_streamed', '1',
            '-reconnect_delay_max', '2',
            '-fflags', '+genpts',  // Generate presentation timestamps
            '-'
        ];
        
        console.log(`FFmpeg command: ffmpeg ${ffmpegArgs.join(' ')}`);
        const ffmpeg = spawn('ffmpeg', ffmpegArgs, { 
            shell: false,
            stdio: ['ignore', 'pipe', 'pipe']
        });

        let firstChunk = true;
        let hasError = false;

        // Handle ffmpeg errors
        ffmpeg.stderr.on('data', (data) => {
            const msg = data.toString();
            // Log initial connection info
            if (msg.includes('Stream #0') || msg.includes('Audio:') || msg.includes('Duration:')) {
                console.log(`FFmpeg info: ${msg.substring(0, 150).trim()}`);
            }
            if (msg.toLowerCase().includes('error') || msg.toLowerCase().includes('failed') || msg.toLowerCase().includes('http error')) {
                console.error(`FFmpeg error: ${msg}`);
                hasError = true;
                if (!res.headersSent) {
                    res.status(500).json({ error: 'FFmpeg streaming error', details: msg.substring(0, 200) });
                } else {
                    res.end();
                }
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
        });

        // Pipe ffmpeg output to response
        ffmpeg.stdout.on('data', (chunk) => {
            if (firstChunk) {
                console.log(`FFmpeg started streaming, first chunk size: ${chunk.length} bytes`);
                firstChunk = false;
            }
            if (!hasError && !res.destroyed) {
                try {
                    res.write(chunk);
                } catch (err) {
                    console.error('Error writing chunk:', err);
                }
            }
        });

        // Handle stream end
        ffmpeg.on('close', (code) => {
            console.log(`FFmpeg process exited with code ${code}`);
            if (!res.headersSent) {
                res.status(500).end();
            } else {
                res.end();
            }
        });

        // Handle client disconnect
        req.on('close', () => {
            ffmpeg.kill();
            console.log('Client disconnected');
        });

        // Store stream reference
        const streamId = Date.now().toString();
        activeStreams.set(streamId, { ffmpeg, res });
        
    }).catch(error => {
        console.error('Error getting audio URL:', error);
        if (!res.headersSent) {
            res.status(500).json({ error: 'Failed to process YouTube URL', details: error.message });
        }
    });
});

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

// Favicon endpoint (to prevent 404 errors)
app.get('/favicon.ico', (req, res) => {
    res.status(204).end();
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
});

app.listen(PORT, () => {
    console.log(`Radio server running on http://localhost:${PORT}`);
    console.log('Make sure ffmpeg and yt-dlp are installed and in your PATH');
}).on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        console.error(`\n❌ Port ${PORT} is already in use!`);
        console.log(`\nTo free the port, run: npm run kill-port`);
        console.log(`Or manually kill the process using: netstat -ano | findstr :${PORT}`);
        process.exit(1);
    } else {
        throw err;
    }
});

