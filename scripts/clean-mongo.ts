#!/usr/bin/env tsx
/**
 * Manual recovery script: kill orphan mongod processes left behind by the
 * retired in-process Mongo test harness and remove their on-disk artifacts.
 *
 * Safe by construction:
 *  - matches mongod commandlines that contain BOTH `--replSet` AND `mongo-mem-`,
 *    so the host's own brew/system mongod is never touched.
 *  - directory removal is restricted to `mongo-mem-<alnum>` leaves that live
 *    under `os.tmpdir()` or `/var/folders/**\/T/` (macOS per-user tmp).
 */
import { execFileSync } from 'node:child_process';
import { type Dirent, existsSync, readdirSync, rmSync, statSync, unlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const isLinux = process.platform === 'linux';
const isMac = process.platform === 'darwin';

if (!isLinux && !isMac) {
    console.warn(`[clean-mongo] unsupported platform "${process.platform}", exiting`);
    process.exit(0);
}

const psFormat = isLinux ? 'pid=,cmd=' : 'pid=,command=';

function listMongoMemPids(): number[] {
    let out = '';
    try {
        out = execFileSync('ps', ['-A', '-o', psFormat], { encoding: 'utf8' });
    } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error(`[clean-mongo] failed to run ps: ${message}`);
        return [];
    }
    const pids: number[] = [];
    for (const rawLine of out.split('\n')) {
        const line = rawLine.trim();
        if (!line) continue;
        const spaceAt = line.indexOf(' ');
        if (spaceAt < 1) continue;
        const pidStr = line.slice(0, spaceAt);
        const cmd = line.slice(spaceAt + 1);
        const pid = Number.parseInt(pidStr, 10);
        if (!Number.isFinite(pid)) continue;
        if (!cmd.includes('mongod')) continue;
        if (!cmd.includes('--replSet')) continue;
        if (!cmd.includes('mongo-mem-')) continue;
        pids.push(pid);
    }
    return pids;
}

function killPids(pids: readonly number[]): number {
    let killed = 0;
    for (const pid of pids) {
        try {
            process.kill(pid, 'SIGKILL');
            console.info(`[clean-mongo] killed pid ${pid}`);
            killed += 1;
        } catch (err) {
            const code = (err as NodeJS.ErrnoException | undefined)?.code;
            if (code === 'ESRCH') continue;
            const message = err instanceof Error ? err.message : String(err);
            console.warn(`[clean-mongo] could not kill pid ${pid}: ${message}`);
        }
    }
    return killed;
}

function removeSockets(): number {
    let removed = 0;
    let entries: Dirent[] = [];
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
            // owned by another user or already gone
        }
    }
    return removed;
}

const allowedRoots: readonly string[] = (() => {
    const roots = new Set<string>();
    roots.add(resolve(tmpdir()));
    if (isMac) {
        try {
            for (const a of readdirSync('/var/folders')) {
                const aPath = join('/var/folders', a);
                let bs: string[];
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
            // /var/folders not enumerable
        }
    }
    return Array.from(roots);
})();

const mongoMemDirName = /^mongo-mem-[A-Za-z0-9]+$/;

function isInsideAllowedRoot(absolute: string): boolean {
    for (const root of allowedRoots) {
        if (absolute === root) return false;
        if (absolute.startsWith(`${root}/`)) return true;
    }
    return false;
}

function removeMongoMemDirs(): number {
    let removed = 0;
    for (const root of allowedRoots) {
        let entries: Dirent[] = [];
        try {
            entries = readdirSync(root, { withFileTypes: true });
        } catch {
            continue;
        }
        for (const entry of entries) {
            if (!entry.isDirectory()) continue;
            if (!mongoMemDirName.test(entry.name)) continue;
            const absolute = resolve(root, entry.name);
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
                const message = err instanceof Error ? err.message : String(err);
                console.warn(`[clean-mongo] could not remove ${absolute}: ${message}`);
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
