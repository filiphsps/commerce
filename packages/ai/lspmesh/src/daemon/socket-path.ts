import { tmpdir } from 'node:os';
import { join } from 'node:path';

/**
 * Returns the directory used for per-root daemon Unix sockets.
 * Defaults to `<tmpdir>/lspmesh` so the sockets are outside the project tree
 * and survive `git clean` without leaking into the repo.
 */
export const socketDir = (): string => join(tmpdir(), 'lspmesh');

/**
 * Returns the absolute UDS path for the daemon bound to `root`.
 * @param root Absolute workspace root whose path is hashed into the filename.
 */
export const socketPathFor = (root: string): string => {
    // Encode the root into a filename-safe token using a simple base64url hash.
    const token = Buffer.from(root).toString('base64url').slice(0, 64);
    return join(socketDir(), `${token}.sock`);
};
