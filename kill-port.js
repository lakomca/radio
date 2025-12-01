const { exec } = require('child_process');
const PORT = process.argv[2] || '3000';

console.log(`Checking for processes using port ${PORT}...`);

exec(`netstat -ano | findstr :${PORT}`, (error, stdout, stderr) => {
    if (error || !stdout.trim()) {
        console.log(`No process found using port ${PORT}`);
        return;
    }

    const lines = stdout.trim().split('\n');
    const pids = new Set();
    
    lines.forEach(line => {
        const parts = line.trim().split(/\s+/);
        const pid = parts[parts.length - 1];
        if (pid && pid !== '0') {
            pids.add(pid);
        }
    });

    if (pids.size === 0) {
        console.log(`No process found using port ${PORT}`);
        return;
    }

    console.log(`Found ${pids.size} process(es) using port ${PORT}:`);
    pids.forEach(pid => console.log(`  PID: ${pid}`));

    pids.forEach(pid => {
        exec(`taskkill /PID ${pid} /F`, (killError, killStdout, killStderr) => {
            if (killError) {
                console.error(`Failed to kill process ${pid}:`, killError.message);
            } else {
                console.log(`✓ Killed process ${pid}`);
            }
        });
    });
});

