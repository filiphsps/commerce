#!/usr/bin/env tsx
import { spawn } from 'node:child_process';
import {
    createReadStream,
    existsSync,
    mkdirSync,
    openSync,
    readFileSync,
    renameSync,
    statSync,
    writeFileSync,
} from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const STATE_DIR = resolve(ROOT, '.mongo-dev');
const PID_FILE = resolve(STATE_DIR, '.pid');
const URI_FILE = resolve(STATE_DIR, '.uri');
const SEEDED_FILE = resolve(STATE_DIR, '.seeded');
const ENV_MARKER_FILE = resolve(STATE_DIR, '.env-managed');
const LOG_FILE = resolve(STATE_DIR, 'daemon.log');
const ENV_FILE = resolve(ROOT, '.env.local');

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

/**
 * Idempotently inserts or replaces the `MONGODB_URI=` line in `.env.local`,
 * preserving every other line byte-for-byte.
 *
 * Defensive details:
 * - `replace` uses a function callback so a URI containing `$` literals (or
 *   `$&`, `$'`, `` $` ``, `$<n>`) is treated literally instead of being
 *   interpreted as a regex replacement pattern.
 * - The write is atomic (tmp file + rename) so a crash/SIGKILL mid-write
 *   can't truncate `.env.local` into an empty or partial file.
 * - Refuses to write back an empty body when the original was non-empty,
 *   as a belt-and-braces guard against any future logic bug that would
 *   otherwise wipe a populated env file.
 *
 * @param uri - Mongo connection string to persist as `MONGODB_URI`.
 * @returns `added` is `true` when no prior line existed and one was appended.
 * @throws When the on-disk env file is non-empty but the computed new body is empty.
 */
const upsertEnv = (uri: string): { added: boolean } => {
    const line = `MONGODB_URI=${uri}`;
    const original = existsSync(ENV_FILE) ? readFileSync(ENV_FILE, 'utf8') : '';
    const hadLine = /^MONGODB_URI=/m.test(original);
    let body = original;
    if (hadLine) {
        body = body.replace(/^MONGODB_URI=.*$/m, () => line);
    } else {
        if (body && !body.endsWith('\n')) body += '\n';
        body += `${line}\n`;
    }
    if (original.length > 0 && body.length === 0) {
        throw new Error(
            `[predev-mongo] refusing to overwrite ${ENV_FILE} with empty body (original was ${original.length} bytes)`,
        );
    }
    const tmp = `${ENV_FILE}.predev-mongo.tmp`;
    writeFileSync(tmp, body);
    renameSync(tmp, ENV_FILE);
    return { added: !hadLine };
};

const waitFor = async (predicate: () => boolean, timeoutMs = 60_000): Promise<void> => {
    const deadline = Date.now() + timeoutMs;
    while (!predicate()) {
        if (Date.now() > deadline) throw new Error('[predev-mongo] timed out waiting for daemon');
        await new Promise((r) => setTimeout(r, 250));
    }
};

/**
 * Streams newly appended bytes from the daemon log to our stdout while a
 * caller is waiting on some other condition. Returns a `stop()` that flushes
 * the pending bytes and shuts the poller down so we don't keep tailing once
 * the daemon is ready.
 */
const tailLog = (file: string): (() => void) => {
    let offset = existsSync(file) ? statSync(file).size : 0;
    let stopped = false;
    const poll = async () => {
        while (!stopped) {
            if (existsSync(file)) {
                const size = statSync(file).size;
                if (size > offset) {
                    await new Promise<void>((res) => {
                        const stream = createReadStream(file, { start: offset, end: size - 1 });
                        stream.on('data', (chunk) => {
                            process.stdout.write(`[daemon-log] ${chunk.toString('utf8')}`);
                        });
                        stream.on('end', () => res());
                        stream.on('error', () => res());
                    });
                    offset = size;
                }
            }
            await new Promise((r) => setTimeout(r, 200));
        }
    };
    void poll();
    return () => {
        stopped = true;
    };
};

mkdirSync(STATE_DIR, { recursive: true });

const haveLiveDaemon = existsSync(PID_FILE) && isAlive(Number(readFileSync(PID_FILE, 'utf8'))) && existsSync(URI_FILE);

let uri: string;
if (haveLiveDaemon) {
    uri = readFileSync(URI_FILE, 'utf8');
    console.info(
        `[predev-mongo] daemon already running (pid ${Number(readFileSync(PID_FILE, 'utf8'))}); MONGODB_URI=${uri}`,
    );
} else {
    if (existsSync(PID_FILE)) console.info(`[predev-mongo] stale PID file at ${PID_FILE} — restarting daemon`);

    const daemonScript = resolve(__dirname, 'mongo-daemon.ts');
    console.info(`[predev-mongo] spawning detached daemon: ${daemonScript}`);
    console.info(`[predev-mongo] daemon stdout/stderr → ${LOG_FILE}`);
    const logFd = openSync(LOG_FILE, 'a');
    const child = spawn(process.execPath, ['--import', 'tsx', daemonScript], {
        detached: true,
        stdio: ['ignore', logFd, logFd],
        cwd: ROOT,
    });
    child.unref();
    console.info(`[predev-mongo] daemon spawned (pid ${child.pid}); waiting for ${URI_FILE} …`);

    const spawnedAt = Date.now();
    const stopTail = tailLog(LOG_FILE);
    try {
        await waitFor(() => existsSync(URI_FILE));
    } catch (err) {
        const tail = existsSync(LOG_FILE) ? readFileSync(LOG_FILE, 'utf8').slice(-2000) : '<no log>';
        console.error(`[predev-mongo] daemon failed to come up — last 2 KB of ${LOG_FILE}:\n${tail}`);
        throw err;
    } finally {
        // Give the poller one final tick so we don't drop the line that wrote
        // the URI file on the way out, then stop.
        await new Promise((r) => setTimeout(r, 300));
        stopTail();
    }
    uri = readFileSync(URI_FILE, 'utf8');
    console.info(`[predev-mongo] daemon ready in ${Date.now() - spawnedAt}ms — MONGODB_URI=${uri}`);
}

const { added: addedEnvLine } = upsertEnv(uri);
// Always write the marker. Tracking only the "added" case meant a stale URI
// from a prior crashed `pnpm dev` (where postdev never ran) would survive
// across runs because the second predev sees `hadLine=true`, skips marker
// write, and postdev then has nothing to clean up.
writeFileSync(ENV_MARKER_FILE, `${ENV_FILE}\n`);
console.info(
    `[predev-mongo] ${addedEnvLine ? 'added' : 'updated'} MONGODB_URI in ${ENV_FILE} (marker: ${ENV_MARKER_FILE})`,
);

if (!existsSync(SEEDED_FILE)) {
    console.info(
        '[predev-mongo] no .seeded marker — seeding canonical fixtures (Shop + Header/Footer/BusinessData/Page/Article)',
    );
    const seedStartedAt = Date.now();
    // Set MONGODB_URI in our env before importing the package — its seed
    // chain transitively evaluates `@nordcom/commerce-db`, whose module body
    // throws when the var is unset. Payload also needs `PAYLOAD_SECRET`;
    // honour an existing one or fall back to a dev placeholder.
    process.env.MONGODB_URI = uri;
    process.env.PAYLOAD_SECRET = process.env.PAYLOAD_SECRET ?? 'development-secret';
    const { register } = await import('node:module');
    // seed-loader stubs both `server-only` and `next/cache` — Payload's
    // afterChange hooks call `revalidateTag` via @tagtree/next, which throws
    // when invoked outside a Next render context (which this script is).
    register('@nordcom/commerce-test-mongo/seed-loader', import.meta.url);
    const { seedCanonical } = await import('@nordcom/commerce-test-mongo');
    await seedCanonical(uri);
    writeFileSync(SEEDED_FILE, new Date().toISOString());
    console.info(`[predev-mongo] seed complete in ${Date.now() - seedStartedAt}ms; marker written to ${SEEDED_FILE}`);
} else {
    console.info(`[predev-mongo] .seeded marker present (${readFileSync(SEEDED_FILE, 'utf8').trim()}) — skipping seed`);
}

console.info(`[predev-mongo] ready — MONGODB_URI=${uri}`);

// Payload's local API holds a mongoose connection (no public `destroy()`) and
// a few background timers, which keep the event loop alive forever. The
// detached daemon owns the DB process from here on, so force-exit so the
// shell can chain into the next predev step (e.g. portless proxy).
process.exit(0);
