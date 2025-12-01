const functions = require('firebase-functions');
const express = require('express');
const { spawn } = require('child_process');
const cors = require('cors');

const app = express();

// Enable CORS
app.use(cors({ origin: true }));

// Helper function to execute yt-dlp and get URL
function getAudioUrl(youtubeUrl) {
    return new Promise((resolve, reject) => {
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
                reject(new Error('yt-dlp or youtube-dl not found'));
                return;
            }

            const { cmd, args } = commands[attemptIndex];
            console.log(`Getting audio URL: Attempting to use ${cmd}`);
            
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
            }
        ];

        let attemptIndex = 0;
        let hasResolved = false;
        const isWindows = process.platform === 'win32';

        function tryCommand() {
            if (hasResolved) return;
            
            if (attemptIndex >= commands.length) {
                hasResolved = true;
                reject(new Error('yt-dlp or youtube-dl not found'));
                return;
            }

            const { cmd, args, parser } = commands[attemptIndex];
            console.log(`Search: Attempting to use ${cmd} with query: ${query}`);
            
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
            let errorOutput = '';
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
                const msg = data.toString();
                allStderr += msg;
                if (msg.toLowerCase().includes('error') && !msg.toLowerCase().includes('warning')) {
                    errorOutput += msg;
                }
            });

            childProcess.on('close', (code) => {
                clearTimeout(timeout);
                
                if (hasResolved) return;

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
                    }
                }

                if (code !== 0 || !output.trim()) {
                    console.log(`${cmd} failed with code ${code}. Output length: ${output.length}`);
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

// Stream endpoint
app.get('/stream', (req, res) => {
    const youtubeUrl = req.query.url;
    
    console.log(`Stream request received for: ${youtubeUrl}`);
    
    if (!youtubeUrl) {
        return res.status(400).json({ error: 'YouTube URL is required' });
    }

    getAudioUrl(youtubeUrl).then(audioUrl => {
        if (!audioUrl || !audioUrl.trim()) {
            console.error('Failed to get audio URL');
            return res.status(500).json({ error: 'Failed to get audio URL' });
        }

        const url = audioUrl;
        console.log(`Starting ffmpeg stream for: ${youtubeUrl}`);
        
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
            '-ab', '128k',
            '-ar', '44100',
            '-ac', '2',
            '-reconnect', '1',
            '-reconnect_at_eof', '1',
            '-reconnect_streamed', '1',
            '-reconnect_delay_max', '2',
            '-fflags', '+genpts',
            '-'
        ];
        
        const ffmpeg = spawn('ffmpeg', ffmpegArgs, { 
            shell: false,
            stdio: ['ignore', 'pipe', 'pipe']
        });

        let firstChunk = true;
        let hasError = false;

        ffmpeg.stderr.on('data', (data) => {
            const msg = data.toString();
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
                res.status(500).json({ error: 'FFmpeg not found' });
            } else {
                res.end();
            }
        });

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

        ffmpeg.on('close', (code) => {
            console.log(`FFmpeg process exited with code ${code}`);
            if (!res.headersSent) {
                res.status(500).end();
            } else {
                res.end();
            }
        });

        req.on('close', () => {
            ffmpeg.kill();
            console.log('Client disconnected');
        });
        
    }).catch(error => {
        console.error('Error getting audio URL:', error);
        if (!res.headersSent) {
            res.status(500).json({ error: 'Failed to process YouTube URL', details: error.message });
        }
    });
});

// Search endpoint
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

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
});

// Export the Express app as a Firebase Function
exports.api = functions.https.onRequest(app);

