#!/usr/bin/env tsx
import { existsSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const STATE_DIR = resolve(ROOT, '.mongo-dev');
const ENV_MARKER_FILE = resolve(STATE_DIR, '.env-managed');

if (!existsSync(ENV_MARKER_FILE)) {
    console.info(`[postdev-mongo] no marker at ${ENV_MARKER_FILE} — nothing to clean up`);
    process.exit(0);
}

const envFile = readFileSync(ENV_MARKER_FILE, 'utf8').trim();
if (!envFile) {
    console.info(`[postdev-mongo] marker at ${ENV_MARKER_FILE} is empty — removing marker only`);
    rmSync(ENV_MARKER_FILE, { force: true });
    process.exit(0);
}

if (!existsSync(envFile)) {
    console.info(`[postdev-mongo] ${envFile} no longer exists — removing marker`);
    rmSync(ENV_MARKER_FILE, { force: true });
    process.exit(0);
}

const before = readFileSync(envFile, 'utf8');
const after = before.replace(/^MONGODB_URI=.*\r?\n?/m, '');

if (after === before) {
    console.info(`[postdev-mongo] no MONGODB_URI line in ${envFile} — removing marker`);
    rmSync(ENV_MARKER_FILE, { force: true });
    process.exit(0);
}

// Always preserve the file. Previously we deleted it when `after.trim() === ''`,
// which silently nuked any env file whose only meaningful entry happened to be
// `MONGODB_URI` — destructive and surprising. Atomic write (tmp + rename) so a
// crash mid-write can't truncate the file.
const tmp = `${envFile}.postdev-mongo.tmp`;
writeFileSync(tmp, after);
renameSync(tmp, envFile);
console.info(`[postdev-mongo] removed MONGODB_URI from ${envFile}`);

rmSync(ENV_MARKER_FILE, { force: true });
