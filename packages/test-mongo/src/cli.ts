#!/usr/bin/env node
import { existsSync, readFileSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseArgs } from 'node:util';

import { runDaemon } from './daemon';

const sub = process.argv[2];
const restArgs = process.argv.slice(3);

const isAlive = (pid: number): boolean => {
    try {
        process.kill(pid, 0);
        return true;
    } catch {
        return false;
    }
};

const argsFor = (allowed: Record<string, { type: 'string' | 'boolean' }>) =>
    parseArgs({ args: restArgs, options: allowed }).values;

const cmdStart = async () => {
    const { dbPath = '.mongo-dev', port = '27018' } = argsFor({
        dbPath: { type: 'string' },
        port: { type: 'string' },
    });
    await runDaemon({
        dbPath: resolve(String(dbPath)),
        port: Number(port),
        pidFile: resolve(String(dbPath), '.pid'),
        uriFile: resolve(String(dbPath), '.uri'),
    });
};

const cmdStop = () => {
    const { dbPath = '.mongo-dev' } = argsFor({ dbPath: { type: 'string' } });
    const pidPath = resolve(String(dbPath), '.pid');
    if (!existsSync(pidPath)) {
        console.info('[test-mongo] no PID file; daemon already stopped');
        return;
    }
    const pid = Number(readFileSync(pidPath, 'utf8'));
    if (!isAlive(pid)) {
        console.info('[test-mongo] PID file is stale; removing');
        rmSync(pidPath, { force: true });
        return;
    }
    process.kill(pid, 'SIGTERM');
    console.info(`[test-mongo] sent SIGTERM to pid ${pid}`);
};

const cmdReset = () => {
    cmdStop();
    const { dbPath = '.mongo-dev' } = argsFor({ dbPath: { type: 'string' } });
    rmSync(resolve(String(dbPath)), { recursive: true, force: true });
    console.info(`[test-mongo] removed ${dbPath}`);
};

const cmdSeed = async () => {
    const { uri } = argsFor({ uri: { type: 'string' } });
    if (!uri) {
        console.error('[test-mongo] --uri is required');
        process.exit(1);
    }
    // Lazy import: `seedCanonical` transitively imports `@nordcom/commerce-db`
    // whose `db.ts` runs `await mongoose.connect(MONGODB_URI)` at module load.
    // Keep that out of the start/stop/reset paths so the daemon CLI never
    // tries to connect to a non-existent cluster just to print usage.
    const { seedCanonical } = await import('./seed/canonical');
    await seedCanonical(String(uri));
};

const main = async () => {
    switch (sub) {
        case 'start':
            return cmdStart();
        case 'stop':
            return cmdStop();
        case 'reset':
            return cmdReset();
        case 'seed':
            return cmdSeed();
        default:
            console.error('usage: test-mongo {start|stop|reset|seed} [--dbPath path] [--port n] [--uri ...]');
            process.exit(1);
    }
};

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
