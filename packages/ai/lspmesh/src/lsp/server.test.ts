import { fileURLToPath } from 'node:url';

import { afterEach, describe, expect, it } from 'vitest';
import type { CallHierarchyItem } from 'vscode-languageserver/node';

import type { LspMeshConfig } from '@/config/types';
import { AggregatorEngine } from '@/core/engine';
import { createLspHandlers } from '@/lsp/server';

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
const URI = 'file:///fixture/a.ts';
const POS = { textDocument: { uri: URI }, position: { line: 0, character: 0 } };
const ITEM = { uri: URI } as CallHierarchyItem;

let engine: AggregatorEngine | undefined;
afterEach(async () => {
    await engine?.dispose();
    engine = undefined;
});

describe('createLspHandlers', () => {
    it('serves references and workspace/symbol through the engine', async () => {
        engine = new AggregatorEngine(config);
        await engine.init();
        const h = createLspHandlers(engine, config.root);

        const refs = await h.references({ ...POS, context: { includeDeclaration: true } });
        expect(refs.length).toBeGreaterThan(0);

        const syms = await h.workspaceSymbol({ query: 'Foo' });
        expect(syms[0]?.name).toBe('Foo');
        expect(syms[0]?.location.uri).toContain('/fixture/');
    });

    it('returns sensible empties for ops the backend does not implement', async () => {
        engine = new AggregatorEngine(config);
        await engine.init();
        const h = createLspHandlers(engine, config.root);

        expect(await h.definition(POS)).toEqual([]);
        expect(await h.implementation(POS)).toEqual([]);
        expect(await h.hover(POS)).toBeNull();
        expect(await h.documentSymbol({ textDocument: { uri: URI } })).toEqual([]);
        expect(await h.prepareCallHierarchy(POS)).toBeNull();
        expect(await h.incomingCalls({ item: ITEM })).toEqual([]);
        expect(await h.outgoingCalls({ item: ITEM })).toEqual([]);
    });
});
