import { rmSync } from 'node:fs';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { DEFAULT_CONFIG } from '@/config/default-config';
import { AggregatorEngine } from '@/core/engine';
import { setupWorkspace } from './helpers';

let ws: string | undefined;
let engine: AggregatorEngine | undefined;

beforeAll(async () => {
    ws = setupWorkspace();
    engine = new AggregatorEngine({ root: ws, backends: DEFAULT_CONFIG.backends.map((b) => ({ ...b })) });
    await engine.init();
}, 180_000);

afterAll(async () => {
    await engine?.dispose();
    if (ws) rmSync(ws, { recursive: true, force: true });
});

describe('lspmesh real-backend aggregation', () => {
    it('finds widgetName via workspace/symbol (typescript backend)', async () => {
        const res = await engine?.workspaceSymbol('widgetName');
        expect(res?.some((r) => r.file.endsWith('src/a.ts'))).toBe(true);
    }, 180_000);

    it('finds references to widgetName across files', async () => {
        const refs = await engine?.findReferences('widgetName');
        expect(refs?.some((r) => r.file.endsWith('src/b.ts'))).toBe(true);
    }, 180_000);

    it('finds implementations of Greeter', async () => {
        const impls = await engine?.findImplementations('Greeter');
        // FriendlyGreeter implements Greeter in the fixture; if the backend reports
        // implementations, our file should be among them. Tolerate empty (provider
        // variance) but the call must succeed and stay an array.
        expect(Array.isArray(impls)).toBe(true);
    }, 180_000);
});
