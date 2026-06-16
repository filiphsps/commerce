import { fileURLToPath } from 'node:url';

import { afterEach, describe, expect, it } from 'vitest';

import type { LspMeshConfig } from '@/config/types';
import { BackendRegistry } from '@/core/backend-registry';

const PKG_DIR = fileURLToPath(new URL('../../', import.meta.url));
const FIXTURE = fileURLToPath(new URL('../../tests/fixtures/echo-lsp-server.ts', import.meta.url));
const config: LspMeshConfig = {
    root: '/fixture',
    backends: [
        {
            name: 'echo',
            command: process.execPath,
            args: ['--import', 'tsx', FIXTURE],
            cwd: PKG_DIR,
            extensionToLanguage: { '.ts': 'typescript' },
        },
    ],
};

let reg: BackendRegistry | undefined;
afterEach(async () => {
    await reg?.dispose();
    reg = undefined;
});

describe('BackendRegistry', () => {
    it('returns backends that handle a path', async () => {
        reg = new BackendRegistry(config);
        await reg.init();
        expect(reg.backendsFor('/x/y.ts').map((b) => b.name)).toEqual(['echo']);
        expect(reg.backendsFor('/x/y.css')).toEqual([]);
    });

    it('respawns a backend after it dies', async () => {
        reg = new BackendRegistry(config);
        await reg.init();
        const first = reg.backendsFor('/x/y.ts')[0];
        expect(first).toBeDefined();
        await first?.dispose();
        const live = reg.backendsFor('/x/y.ts');
        expect(live).toHaveLength(1);
        expect(live[0]?.dead).toBe(false);
        await live[0]?.whenReady();
    });
});
