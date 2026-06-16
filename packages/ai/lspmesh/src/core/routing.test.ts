import { describe, expect, it } from 'vitest';

import type { BackendConfig } from '../config/types.js';
import { extnameLower, languageIdFor, matchesBackend } from './routing.js';

const ts: BackendConfig = {
    name: 'typescript',
    command: 'x',
    args: [],
    extensionToLanguage: { '.ts': 'typescript', '.tsx': 'typescriptreact' },
};
const biome: BackendConfig = { name: 'biome', command: 'x', args: [], extensionToLanguage: { '.json': 'json' } };

describe('routing', () => {
    it('lowercases the extension', () => {
        expect(extnameLower('/a/B.TS')).toBe('.ts');
    });

    it('matches a backend by extension', () => {
        expect(matchesBackend(ts, '/x/y.tsx')).toBe(true);
        expect(matchesBackend(ts, '/x/y.json')).toBe(false);
        expect(matchesBackend(biome, '/x/y.json')).toBe(true);
    });

    it('returns the languageId for a path', () => {
        expect(languageIdFor(ts, '/x/y.tsx')).toBe('typescriptreact');
        expect(languageIdFor(ts, '/x/y.json')).toBeUndefined();
    });
});
