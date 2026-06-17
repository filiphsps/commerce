import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import { listenExclusive } from '@/daemon/spawn';

describe('listenExclusive', () => {
    const servers: { close: () => void }[] = [];
    afterEach(() => {
        for (const s of servers) s.close();
        servers.length = 0;
    });

    it('binds a fresh socket path', async () => {
        const sock = join(mkdtempSync(join(tmpdir(), 'lspmesh-')), 'd.sock');
        const server = await listenExclusive(sock, () => {});
        expect(server).not.toBeNull();
        if (server) servers.push(server);
    });

    it('returns null when the path is already bound (loser of the race)', async () => {
        const sock = join(mkdtempSync(join(tmpdir(), 'lspmesh-')), 'd.sock');
        const first = await listenExclusive(sock, () => {});
        if (first) servers.push(first);
        const second = await listenExclusive(sock, () => {});
        expect(second).toBeNull();
    });

    it('reclaims a stale socket file with no listener', async () => {
        const dir = mkdtempSync(join(tmpdir(), 'lspmesh-'));
        const sock = join(dir, 'd.sock');
        const first = await listenExclusive(sock, () => {});
        first?.close();
        const again = await listenExclusive(sock, () => {});
        expect(again).not.toBeNull();
        if (again) servers.push(again);
    });
});
