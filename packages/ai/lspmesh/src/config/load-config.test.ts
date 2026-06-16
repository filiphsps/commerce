import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { loadConfig } from './load-config.js';

describe('loadConfig', () => {
    it('returns the default config (with root) when no file is found', () => {
        const dir = mkdtempSync(join(tmpdir(), 'lspmesh-'));
        const cfg = loadConfig(dir);
        expect(cfg.root).toBe(dir);
        expect(cfg.backends.map((b) => b.name).sort()).toEqual(['biome', 'tailwindcss', 'typescript']);
    });

    it('reads lspmesh.json discovered from a child dir upward', () => {
        const dir = mkdtempSync(join(tmpdir(), 'lspmesh-'));
        writeFileSync(
            join(dir, 'lspmesh.json'),
            JSON.stringify({
                backends: [{ name: 'only', command: 'x', args: [], extensionToLanguage: { '.ts': 'typescript' } }],
            }),
        );
        const child = mkdtempSync(join(dir, 'sub-'));
        const cfg = loadConfig(child);
        expect(cfg.backends).toHaveLength(1);
        expect(cfg.backends[0]?.name).toBe('only');
        expect(cfg.root).toBe(dir);
    });

    it('throws a descriptive error on a malformed backend (missing command)', () => {
        const dir = mkdtempSync(join(tmpdir(), 'lspmesh-'));
        writeFileSync(
            join(dir, 'lspmesh.json'),
            JSON.stringify({ backends: [{ name: 'bad', args: [], extensionToLanguage: {} }] }),
        );
        expect(() => loadConfig(dir)).toThrow(/bad.*command/i);
    });
});
