const { spawn } = require('child_process');

console.log('Checking required tools...\n');

const tools = [
    { name: 'ffmpeg', test: ['-version'] },
    { name: 'yt-dlp', test: ['--version'] },
    { name: 'youtube-dl', test: ['--version'] }
];

let checked = 0;
let found = 0;

tools.forEach(tool => {
    const process = spawn(tool.name, tool.test, { shell: true });
    
    process.stdout.on('data', () => {
        if (!process.found) {
            console.log(`✓ ${tool.name} is installed`);
            process.found = true;
            found++;
        }
    });
    
    process.stderr.on('data', () => {
        // Some tools output to stderr, that's ok
    });
    
    process.on('close', (code) => {
        checked++;
        if (code !== 0 && !process.found) {
            console.log(`✗ ${tool.name} is NOT installed or not in PATH`);
        }
        
        if (checked === tools.length) {
            console.log(`\nFound ${found} out of ${tools.length} tools.`);
            if (found === 0) {
                console.log('\nPlease install at least one of:');
                console.log('  - yt-dlp: https://github.com/yt-dlp/yt-dlp');
                console.log('  - youtube-dl: https://github.com/ytdl-org/youtube-dl');
                console.log('  - ffmpeg: https://ffmpeg.org/download.html');
            } else if (found < 2) {
                console.log('\nWarning: You need both ffmpeg and at least one YouTube downloader (yt-dlp or youtube-dl)');
            } else {
                console.log('\nSetup looks good! You can start the server with: npm start');
            }
        }
    });
    
    process.on('error', () => {
        checked++;
        if (!process.found) {
            console.log(`✗ ${tool.name} is NOT installed or not in PATH`);
        }
        
        if (checked === tools.length) {
            console.log(`\nFound ${found} out of ${tools.length} tools.`);
            if (found === 0) {
                console.log('\nPlease install at least one of:');
                console.log('  - yt-dlp: https://github.com/yt-dlp/yt-dlp');
                console.log('  - youtube-dl: https://github.com/ytdl-org/youtube-dl');
                console.log('  - ffmpeg: https://ffmpeg.org/download.html');
            } else if (found < 2) {
                console.log('\nWarning: You need both ffmpeg and at least one YouTube downloader (yt-dlp or youtube-dl)');
            } else {
                console.log('\nSetup looks good! You can start the server with: npm start');
            }
        }
    });
});

