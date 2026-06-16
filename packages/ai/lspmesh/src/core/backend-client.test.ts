import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { afterEach, describe, expect, it } from 'vitest';

import type { BackendConfig } from '../config/types.js';
import { BackendClient } from './backend-client.js';

const PKG_DIR = fileURLToPath(new URL('../../', import.meta.url));
const FIXTURE = fileURLToPath(new URL('../../tests/fixtures/echo-lsp-server.ts', import.meta.url));
const cfg: BackendConfig = {
    name: 'echo',
    command: process.execPath,
    args: ['--import', 'tsx', FIXTURE],
    // Run the child from the package dir so `tsx` (a devDep) resolves and cwd is valid.
    cwd: PKG_DIR,
    extensionToLanguage: { '.ts': 'typescript' },
};

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

let client: BackendClient | undefined;
afterEach(async () => {
    await client?.dispose();
    client = undefined;
});

describe('BackendClient', () => {
    it('initializes and answers a request', async () => {
        client = new BackendClient(cfg, '/fixture');
        await client.whenReady();
        const res = await client.request('workspace/symbol', { query: 'Foo' });
        expect(Array.isArray(res)).toBe(true);
    });

    it('sends didChange with a bumped version when the file changes on disk', async () => {
        const dir = mkdtempSync(join(tmpdir(), 'lspmesh-bc-'));
        const file = join(dir, 'a.ts');
        writeFileSync(file, 'export const a = 1;');
        client = new BackendClient(cfg, dir);
        await client.whenReady();
        client.open(file);
        const v1 = await client.request<number>('$/getOpenVersion', { uri: `file://${file}` });
        await wait(15); // guarantee a distinct mtime
        writeFileSync(file, 'export const a = 2;');
        client.open(file);
        const v2 = await client.request<number>('$/getOpenVersion', { uri: `file://${file}` });
        expect(v2).toBe(v1 + 1);
    });

    it('rejects an in-flight request when the backend dies', async () => {
        client = new BackendClient(cfg, '/fixture');
        await client.whenReady();
        const pending = client.request('$/never', {}, 60_000);
        await client.dispose();
        await expect(pending).rejects.toThrow();
    });
});
