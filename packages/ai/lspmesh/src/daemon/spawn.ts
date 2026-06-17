import { type ChildProcess, spawn } from 'node:child_process';
import { existsSync, mkdirSync, unlinkSync } from 'node:fs';
import { connect, createServer, type Server, type Socket } from 'node:net';
import { dirname } from 'node:path';

import { socketDir } from '@/daemon/socket-path';

/**
 * Try to become the daemon by binding `socketPath` exclusively. Loses gracefully
 * (returns null) when another process already owns it, and reclaims a stale
 * socket file left by a crashed daemon.
 * @param socketPath Absolute UDS path.
 * @param onConnection Handler invoked with each accepted client socket.
 * @returns The listening server if we won the race, else null.
 */
export const listenExclusive = (socketPath: string, onConnection: (socket: Socket) => void): Promise<Server | null> =>
    new Promise((resolve) => {
        mkdirSync(dirname(socketPath), { recursive: true });
        const server = createServer(onConnection);
        const onError = (err: NodeJS.ErrnoException) => {
            if (err.code !== 'EADDRINUSE') {
                resolve(null);
                return;
            }
            const probe = connect(socketPath)
                .on('connect', () => {
                    probe.destroy();
                    resolve(null);
                })
                .on('error', () => {
                    try {
                        unlinkSync(socketPath);
                    } catch {
                        /* gone already */
                    }
                    server.listen(socketPath, () => resolve(server));
                });
        };
        server.once('error', onError);
        server.listen(socketPath, () => {
            server.removeListener('error', onError);
            resolve(server);
        });
    });

/**
 * Spawn a detached daemon for `root` that outlives this process.
 * @param root Absolute workspace root.
 * @param execPath Node binary to run.
 * @param cliPath Resolved path to lspmesh's cli entry.
 * @returns The detached child (already `unref`'d).
 */
export const spawnDaemon = (root: string, execPath: string, cliPath: string): ChildProcess => {
    if (!existsSync(socketDir())) mkdirSync(socketDir(), { recursive: true });
    const child = spawn(execPath, [cliPath, 'daemon', '--root', root], {
        detached: true,
        stdio: 'ignore',
        cwd: root,
    });
    child.unref();
    return child;
};
