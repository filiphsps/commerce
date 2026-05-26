#!/usr/bin/env tsx
import { existsSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const STATE_DIR = resolve(ROOT, '.mongo-dev');
const PID_FILE = resolve(STATE_DIR, '.pid');
const DEV_PID_FILE = resolve(STATE_DIR, '.dev.pid');
const ENV_MARKER_FILE = resolve(STATE_DIR, '.env-managed');

/**
 * Returns whether a PID corresponds to a process this user can see.
 *
 * @param pid - The PID to probe.
 * @returns `true` when the process is alive; `false` when it's gone or the
 *   PID is invalid.
 */
const isAlive = (pid: number): boolean => {
    if (!Number.isFinite(pid) || pid <= 1) return false;
    try {
        process.kill(pid, 0);
        return true;
    } catch {
        return false;
    }
};

/**
 * Sends SIGTERM to a PID read from a marker file, then removes the marker.
 * No-op when the marker is missing or the PID is already gone.
 *
 * @param label - Human label used in console output.
 * @param file - Absolute path to the marker file containing a numeric PID.
 */
const killFromMarker = (label: string, file: string): void => {
    if (!existsSync(file)) {
        console.info(`[dev-reset] no ${label} pid file at ${file}`);
        return;
    }
    const pid = Number(readFileSync(file, 'utf8').trim());
    if (!isAlive(pid)) {
        console.info(`[dev-reset] ${label} pid ${pid || '?'} is not running — removing stale marker`);
        rmSync(file, { force: true });
        return;
    }
    try {
        process.kill(pid, 'SIGTERM');
        console.info(`[dev-reset] sent SIGTERM to ${label} pid ${pid}`);
    } catch (err) {
        console.warn(`[dev-reset] failed to signal ${label} pid ${pid}: ${(err as Error).message}`);
    }
    rmSync(file, { force: true });
};

/**
 * Removes the `MONGODB_URI=` line that predev wrote into `.env.local`,
 * mirroring `postdev-mongo.ts` but inlined so a full reset never leaves
 * orphaned env state behind even when `postdev` didn't run.
 */
const stripMongoUriFromEnv = (): void => {
    if (!existsSync(ENV_MARKER_FILE)) return;
    const envFile = readFileSync(ENV_MARKER_FILE, 'utf8').trim();
    if (!envFile || !existsSync(envFile)) {
        rmSync(ENV_MARKER_FILE, { force: true });
        return;
    }
    const before = readFileSync(envFile, 'utf8');
    const after = before.replace(/^MONGODB_URI=.*\r?\n?/m, '');
    if (after !== before) {
        const tmp = `${envFile}.dev-reset.tmp`;
        writeFileSync(tmp, after);
        renameSync(tmp, envFile);
        console.info(`[dev-reset] removed MONGODB_URI from ${envFile}`);
    }
    rmSync(ENV_MARKER_FILE, { force: true });
};

killFromMarker('dev session', DEV_PID_FILE);
killFromMarker('mongo daemon', PID_FILE);
stripMongoUriFromEnv();

if (existsSync(STATE_DIR)) {
    rmSync(STATE_DIR, { recursive: true, force: true });
    console.info(`[dev-reset] removed ${STATE_DIR}`);
}

console.info('[dev-reset] done.');
