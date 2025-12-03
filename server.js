const express = require('express');
const { spawn, exec } = require('child_process');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Serve static files
app.use(express.static('public'));

// Explicit root route to serve index.html
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

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
                args: [`ytsearch999:${query}`, '--flat-playlist', '--print', '%(id)s|%(title)s|%(duration)s'],
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
                args: [`ytsearch999:${query}`, '--flat-playlist', '--print', '%(id)s|%(title)s|%(duration)s'],
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
                args: [`ytsearch999:${query}`, '--flat-playlist', '--get-id', '--get-title', '--get-duration'],
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
                args: [`ytsearch999:${query}`, '--flat-playlist', '--get-id', '--get-title', '--get-duration'],
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
            console.error('Failed to get audio URL - empty response');
            return res.status(500).json({ 
                error: 'Failed to get audio URL', 
                details: 'yt-dlp returned empty response. Please check Railway logs for more details.',
                hint: 'Make sure yt-dlp is installed and accessible in PATH'
            });
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
            '-reconnect_delay_max', '5',  // Increased delay for better reconnection
            '-reconnect_on_network_error', '1',
            '-fflags', '+genpts',  // Generate presentation timestamps
            '-avoid_negative_ts', 'make_zero',  // Prevent timestamp issues
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
        let bytesWritten = 0;
        ffmpeg.stdout.on('data', (chunk) => {
            if (firstChunk) {
                console.log(`FFmpeg started streaming, first chunk size: ${chunk.length} bytes`);
                firstChunk = false;
            }
            if (!hasError && !res.destroyed) {
                try {
                    res.write(chunk);
                    bytesWritten += chunk.length;
                } catch (err) {
                    console.error('Error writing chunk:', err);
                    // If write fails, it might be because client disconnected
                    // Don't kill ffmpeg, let it continue in case client reconnects
                }
            }
        });

        // Handle stream end
        ffmpeg.on('close', (code) => {
            console.log(`FFmpeg process exited with code ${code}`);
            // Code 0 is normal exit, code 1 might be error but could also be end of stream
            if (code !== 0 && code !== 1) {
                console.error(`FFmpeg exited with error code: ${code}`);
                if (!res.headersSent && !hasError) {
                    res.status(500).json({ 
                        error: 'FFmpeg process failed', 
                        details: `FFmpeg exited with code ${code}`,
                        hint: 'Check Railway logs for FFmpeg error details'
                    });
                    return;
                }
            }
            if (!res.headersSent) {
                res.status(500).json({ 
                    error: 'Stream failed to start', 
                    details: 'FFmpeg process ended before streaming started',
                    hint: 'Check Railway logs for FFmpeg error details'
                });
            } else {
                // Only end if headers were sent (stream was started)
                // This allows the stream to end naturally when video finishes
                res.end();
            }
        });

        // Handle client disconnect
        let clientDisconnected = false;
        req.on('close', () => {
            clientDisconnected = true;
            console.log('Client disconnected - stopping ffmpeg');
            // Only kill ffmpeg if client actually disconnected
            // This prevents killing the stream during normal buffering
            try {
                ffmpeg.kill();
            } catch (err) {
                console.error('Error killing ffmpeg:', err);
            }
        });
        
        // Also handle abort
        req.on('aborted', () => {
            clientDisconnected = true;
            console.log('Client aborted connection');
            try {
                ffmpeg.kill();
            } catch (err) {
                console.error('Error killing ffmpeg on abort:', err);
            }
        });

        // Store stream reference
        const streamId = Date.now().toString();
        activeStreams.set(streamId, { ffmpeg, res });
        
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
    });
});

// Helper function to get related/recommended videos from a YouTube URL
function getRelatedVideos(youtubeUrl) {
    return new Promise((resolve, reject) => {
        const commands = [
            { 
                cmd: 'yt-dlp', 
                args: [youtubeUrl, '--flat-playlist', '--playlist-end', '20', '--print', '%(id)s|%(title)s|%(duration)s'],
                parser: (output) => {
                    const lines = output.trim().split('\n').filter(line => line.trim());
                    // Skip the first video (it's the current one) and get the rest
                    return lines.slice(1).map(line => {
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
                args: [youtubeUrl, '--flat-playlist', '--playlist-end', '20', '--print', '%(id)s|%(title)s|%(duration)s'],
                parser: (output) => {
                    const lines = output.trim().split('\n').filter(line => line.trim());
                    return lines.slice(1).map(line => {
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
                    console.log(`${cmd} failed with code ${code}`);
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
        const videos = await getRelatedVideos(youtubeUrl);
        console.log(`Found ${videos.length} related videos`);
        res.json({ videos });
    } catch (error) {
        console.error('Related videos error:', error);
        res.status(500).json({ error: 'Failed to get related videos', details: error.message });
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
    // Don't serve index.html for API routes
    if (req.path.startsWith('/stream') || req.path.startsWith('/search') || req.path.startsWith('/health')) {
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

app.listen(PORT, '0.0.0.0', () => {
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
    
    console.log(`\n✅ Radio server running!`);
    console.log(`   Port:     ${PORT}`);
    console.log(`   Local:    http://localhost:${PORT}`);
    console.log(`   Network:  http://${localIP}:${PORT}`);
    console.log(`\n📱 Access from other devices on the same Wi-Fi:`);
    console.log(`   http://${localIP}:${PORT}`);
    console.log(`\n⚠️  Make sure Windows Firewall allows Node.js on port ${PORT}`);
    console.log(`   Make sure ffmpeg and yt-dlp are installed and in your PATH\n`);
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

