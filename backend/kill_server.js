const { exec } = require('child_process');

exec('netstat -ano | findstr :3000', (err, stdout) => {
    if (err) {
        console.error('Error finding process:', err.message);
        return;
    }
    console.log('Netstat output:');
    console.log(stdout);

    const lines = stdout.split('\n');
    for (const line of lines) {
        if (line.includes('LISTENING')) {
            const parts = line.trim().split(/\s+/);
            const pid = parts[parts.length - 1];
            if (pid && pid !== '0') {
                console.log('Found PID on port 3000:', pid);
                exec(`taskkill /F /PID ${pid}`, (killErr, killOut) => {
                    if (killErr) {
                         console.error('Failed to kill:', killErr.message);
                    } else {
                         console.log('Killed PID', pid);
                    }
                });
                return; // Kill the first listening one
            }
        }
    }
});
