import { fileURLToPath } from 'node:url';

import { afterEach, describe, expect, it } from 'vitest';

import type { LspMeshConfig } from '@/config/types';
import { AggregatorEngine } from '@/core/engine';

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

let engine: AggregatorEngine | undefined;
afterEach(async () => {
    await engine?.dispose();
    engine = undefined;
});

describe('AggregatorEngine', () => {
    it('aggregates workspace/symbol across backends', async () => {
        engine = new AggregatorEngine(config);
        await engine.init();
        const res = await engine.workspaceSymbol('Foo');
        expect(res.length).toBeGreaterThan(0);
        expect(res[0]?.name).toBe('Foo');
    });

    it('merges a position op (references) from matching backends', async () => {
        engine = new AggregatorEngine(config);
        await engine.init();
        const refs = await engine.positionOp('textDocument/references', {
            uri: 'file:///fixture/a.ts',
            line: 0,
            character: 0,
        });
        expect(refs.length).toBeGreaterThan(0);
    });

    it('rawForward returns one reply per matching backend', async () => {
        engine = new AggregatorEngine(config);
        await engine.init();
        const replies = await engine.rawForward('textDocument/references', {
            uri: 'file:///fixture/a.ts',
            line: 0,
            character: 0,
        });
        expect(replies).toHaveLength(1);
    });

    it('forward routes a document-shaped request by uri', async () => {
        engine = new AggregatorEngine(config);
        await engine.init();
        const replies = await engine.forward('workspace/symbol', 'file:///fixture/a.ts', { query: 'Foo' });
        expect(replies).toHaveLength(1);
    });
});
