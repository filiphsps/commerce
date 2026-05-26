#!/usr/bin/env tsx
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const STATE_DIR = resolve(ROOT, '.mongo-dev');
const PID_FILE = resolve(STATE_DIR, '.pid');
const URI_FILE = resolve(STATE_DIR, '.uri');
const SEEDED_FILE = resolve(STATE_DIR, '.seeded');
const ENV_FILE = resolve(ROOT, '.env.development.local');

if (process.env.MONGODB_URI) {
    console.info(`[predev-mongo] MONGODB_URI already set in env — skipping daemon (${process.env.MONGODB_URI})`);
    process.exit(0);
}

const isAlive = (pid: number): boolean => {
    try {
        process.kill(pid, 0);
        return true;
    } catch {
        return false;
    }
};

const upsertEnv = (uri: string): void => {
    const line = `MONGODB_URI=${uri}`;
    let body = existsSync(ENV_FILE) ? readFileSync(ENV_FILE, 'utf8') : '';
    if (/^MONGODB_URI=/m.test(body)) {
        body = body.replace(/^MONGODB_URI=.*$/m, line);
    } else {
        if (body && !body.endsWith('\n')) body += '\n';
        body += `${line}\n`;
    }
    writeFileSync(ENV_FILE, body);
};

const waitFor = async (predicate: () => boolean, timeoutMs = 60_000): Promise<void> => {
    const deadline = Date.now() + timeoutMs;
    while (!predicate()) {
        if (Date.now() > deadline) throw new Error('[predev-mongo] timed out waiting for daemon');
        await new Promise((r) => setTimeout(r, 250));
    }
};

mkdirSync(STATE_DIR, { recursive: true });

if (existsSync(PID_FILE)) {
    const pid = Number(readFileSync(PID_FILE, 'utf8'));
    if (isAlive(pid) && existsSync(URI_FILE)) {
        const existingUri = readFileSync(URI_FILE, 'utf8');
        upsertEnv(existingUri);
        console.info(
            `[predev-mongo] daemon already running (pid ${pid}); wrote MONGODB_URI=${existingUri} to ${ENV_FILE}`,
        );
        process.exit(0);
    }
    console.info(`[predev-mongo] stale PID file at ${PID_FILE} — restarting daemon`);
}

const daemonScript = resolve(__dirname, 'mongo-daemon.ts');
console.info(`[predev-mongo] spawning detached daemon: ${daemonScript}`);
const child = spawn(process.execPath, ['--import', 'tsx', daemonScript], {
    detached: true,
    stdio: 'ignore',
    cwd: ROOT,
});
child.unref();
console.info(`[predev-mongo] daemon spawned (pid ${child.pid}); waiting for ${URI_FILE} …`);

const spawnedAt = Date.now();
await waitFor(() => existsSync(URI_FILE));
const uri = readFileSync(URI_FILE, 'utf8');
console.info(`[predev-mongo] daemon ready in ${Date.now() - spawnedAt}ms — MONGODB_URI=${uri}`);
upsertEnv(uri);
console.info(`[predev-mongo] wrote MONGODB_URI to ${ENV_FILE}`);

if (!existsSync(SEEDED_FILE)) {
    console.info(
        '[predev-mongo] no .seeded marker — seeding canonical fixtures (Shop + Header/Footer/BusinessData/Page/Article)',
    );
    const seedStartedAt = Date.now();
    const { register } = await import('node:module');
    register('@nordcom/commerce-test-mongo/loader', import.meta.url);
    const { seedCanonical } = await import('@nordcom/commerce-test-mongo');
    await seedCanonical(uri);
    writeFileSync(SEEDED_FILE, new Date().toISOString());
    console.info(`[predev-mongo] seed complete in ${Date.now() - seedStartedAt}ms; marker written to ${SEEDED_FILE}`);
} else {
    console.info(`[predev-mongo] .seeded marker present (${readFileSync(SEEDED_FILE, 'utf8').trim()}) — skipping seed`);
}

console.info(`[predev-mongo] ready — MONGODB_URI=${uri}`);
