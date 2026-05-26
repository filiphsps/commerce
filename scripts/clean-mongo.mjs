#!/usr/bin/env node
/**
 * Manual recovery script: kill orphan mongod processes spawned by
 * `mongodb-memory-server` and remove their on-disk artifacts.
 *
 * Safe by construction:
 *  - matches mongod commandlines that contain BOTH `--replSet` AND `mongo-mem-`,
 *    so the host's own brew/system mongod is never touched.
 *  - directory removal is restricted to `mongo-mem-<alnum>` leaves that live
 *    under `os.tmpdir()` or `/var/folders/**\/T/` (macOS per-user tmp).
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, rmSync, statSync, unlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const isLinux = process.platform === 'linux';
const isMac = process.platform === 'darwin';

if (!isLinux && !isMac) {
    console.warn(`[clean-mongo] unsupported platform "${process.platform}", exiting`);
    process.exit(0);
}

const psFormat = isLinux ? 'pid=,cmd=' : 'pid=,command=';

function listMongoMemPids() {
    let out = '';
    try {
        out = execFileSync('ps', ['-A', '-o', psFormat], { encoding: 'utf8' });
    } catch (err) {
        console.error(`[clean-mongo] failed to run ps: ${err?.message ?? err}`);
        return [];
    }
    const pids = [];
    for (const rawLine of out.split('\n')) {
        const line = rawLine.trim();
        if (!line) continue;
        const spaceAt = line.indexOf(' ');
        if (spaceAt < 1) continue;
        const pidStr = line.slice(0, spaceAt);
        const cmd = line.slice(spaceAt + 1);
        const pid = Number.parseInt(pidStr, 10);
        if (!Number.isFinite(pid)) continue;
        // Only kill mongods that we (mongodb-memory-server) clearly spawned.
        // Requires BOTH markers so a brew-installed mongod survives.
        if (!cmd.includes('mongod')) continue;
        if (!cmd.includes('--replSet')) continue;
        if (!cmd.includes('mongo-mem-')) continue;
        pids.push(pid);
    }
    return pids;
}

function killPids(pids) {
    let killed = 0;
    for (const pid of pids) {
        try {
            process.kill(pid, 'SIGKILL');
            console.info(`[clean-mongo] killed pid ${pid}`);
            killed += 1;
        } catch (err) {
            const code = err?.code;
            if (code === 'ESRCH') continue; // already gone
            console.warn(`[clean-mongo] could not kill pid ${pid}: ${err?.message ?? err}`);
        }
    }
    return killed;
}

function removeSockets() {
    let removed = 0;
    let entries = [];
    try {
        entries = readdirSync('/tmp', { withFileTypes: true });
    } catch {
        return 0;
    }
    for (const entry of entries) {
        if (!entry.name.startsWith('mongodb-')) continue;
        if (!entry.name.endsWith('.sock')) continue;
        const full = join('/tmp', entry.name);
        try {
            unlinkSync(full);
            removed += 1;
        } catch {
            // ignore — may be owned by another user or already gone
        }
    }
    return removed;
}

const allowedRoots = (() => {
    const roots = new Set();
    roots.add(resolve(tmpdir()));
    if (isMac) {
        // /var/folders/<hash>/<hash>/T per-user tmp roots
        try {
            for (const a of readdirSync('/var/folders')) {
                const aPath = join('/var/folders', a);
                let bs;
                try {
                    bs = readdirSync(aPath);
                } catch {
                    continue;
                }
                for (const b of bs) {
                    const tPath = join(aPath, b, 'T');
                    if (existsSync(tPath)) roots.add(resolve(tPath));
                }
            }
        } catch {
            // /var/folders not enumerable; ignore
        }
    }
    return Array.from(roots);
})();

const mongoMemDirName = /^mongo-mem-[A-Za-z0-9]+$/;

function isInsideAllowedRoot(absolute) {
    for (const root of allowedRoots) {
        if (absolute === root) return false; // never the root itself
        if (absolute.startsWith(`${root}/`)) return true;
    }
    return false;
}

function removeMongoMemDirs() {
    let removed = 0;
    for (const root of allowedRoots) {
        let entries = [];
        try {
            entries = readdirSync(root, { withFileTypes: true });
        } catch {
            continue;
        }
        for (const entry of entries) {
            if (!entry.isDirectory()) continue;
            if (!mongoMemDirName.test(entry.name)) continue;
            const absolute = resolve(root, entry.name);
            // Defense in depth: refuse to descend outside the allowed roots.
            if (!isInsideAllowedRoot(absolute)) continue;
            try {
                const st = statSync(absolute);
                if (!st.isDirectory()) continue;
            } catch {
                continue;
            }
            try {
                rmSync(absolute, { recursive: true, force: true });
                removed += 1;
            } catch (err) {
                console.warn(`[clean-mongo] could not remove ${absolute}: ${err?.message ?? err}`);
            }
        }
    }
    return removed;
}

const pids = listMongoMemPids();
const killed = killPids(pids);
const sockets = removeSockets();
const dirs = removeMongoMemDirs();

console.info(`[clean-mongo] ${killed} killed, ${sockets} sockets, ${dirs} dirs`);
process.exit(0);
