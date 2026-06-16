import { describe, expect, it } from 'vitest';

import type { AggregatorEngine } from '../core/engine.js';
import { buildTools } from './server.js';

const fakeEngine = {
    findSymbol: async () => [
        { name: 'Widget', kind: 13, file: 'a.ts', line: 1, character: 1, snippet: 'export const Widget = 1' },
    ],
    findReferences: async () => [],
    findImplementations: async () => [],
} as unknown as AggregatorEngine;

describe('buildTools', () => {
    it('registers the three find_* tools', () => {
        expect(
            buildTools(fakeEngine)
                .map((t) => t.name)
                .sort(),
        ).toEqual(['find_implementations', 'find_references', 'find_symbol']);
    });

    it('find_symbol handler returns results as text', async () => {
        const tool = buildTools(fakeEngine).find((t) => t.name === 'find_symbol');
        const res = await tool?.handler({ query: 'Widget' });
        expect(res?.content[0]?.text).toContain('Widget');
    });

    it('find_references handler reports none found', async () => {
        const tool = buildTools(fakeEngine).find((t) => t.name === 'find_references');
        const res = await tool?.handler({ query: 'Nope' });
        expect(res?.content[0]?.text).toContain('No references');
    });
});
