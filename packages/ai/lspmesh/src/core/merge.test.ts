import { describe, expect, it } from 'vitest';
import type { Location } from 'vscode-languageserver-protocol';

import { mergeLocations } from './merge.js';

const loc = (uri: string, line: number): Location => ({
    uri,
    range: { start: { line, character: 0 }, end: { line, character: 1 } },
});

describe('mergeLocations', () => {
    it('unions and dedupes by uri:line:character', () => {
        const a = [loc('file:///a.ts', 1), loc('file:///a.ts', 2)];
        const b = [loc('file:///a.ts', 2), loc('file:///b.ts', 5)];
        expect(mergeLocations([a, b])).toHaveLength(3);
    });

    it('drops null/undefined backend replies', () => {
        expect(mergeLocations([null, undefined, [loc('file:///a.ts', 1)]])).toHaveLength(1);
    });

    it('accepts a single Location (not just arrays)', () => {
        expect(mergeLocations([loc('file:///a.ts', 1)])).toHaveLength(1);
    });
});
