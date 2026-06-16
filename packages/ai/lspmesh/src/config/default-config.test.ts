import { describe, expect, it } from 'vitest';

import { DEFAULT_CONFIG } from './default-config.js';

describe('DEFAULT_CONFIG', () => {
    it('wires typescript, tailwind, and biome backends', () => {
        const names = DEFAULT_CONFIG.backends.map((b) => b.name).sort();
        expect(names).toEqual(['biome', 'tailwindcss', 'typescript']);
    });

    it('maps .tsx to typescriptreact on the typescript backend', () => {
        const ts = DEFAULT_CONFIG.backends.find((b) => b.name === 'typescript');
        expect(ts?.extensionToLanguage['.tsx']).toBe('typescriptreact');
    });

    it('every backend has a command and a non-empty extension map', () => {
        for (const b of DEFAULT_CONFIG.backends) {
            expect(b.command).toBeTruthy();
            expect(Object.keys(b.extensionToLanguage).length).toBeGreaterThan(0);
        }
    });
});
