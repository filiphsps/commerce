import { describe, expect, it } from 'vitest';

import { type CliDeps, parseCli, run } from '@/cli';
import type { AggregatorEngine } from '@/core/engine';

describe('parseCli', () => {
    it('parses the lsp and mcp modes', () => {
        expect(parseCli(['lsp'])).toEqual({ kind: 'run', mode: 'lsp', root: undefined });
        expect(parseCli(['mcp'])).toEqual({ kind: 'run', mode: 'mcp', root: undefined });
    });

    it('parses the --root option', () => {
        expect(parseCli(['mcp', '--root', '/x'])).toEqual({ kind: 'run', mode: 'mcp', root: '/x' });
    });

    it('returns help and version results', () => {
        expect(parseCli(['--help'])).toEqual({ kind: 'help' });
        expect(parseCli(['--version'])).toEqual({ kind: 'version' });
    });

    it('throws on a missing mode', () => {
        expect(() => parseCli([])).toThrow(/usage/i);
    });

    it('throws on an unknown mode', () => {
        expect(() => parseCli(['frob'])).toThrow(/frob/);
    });

    it('throws on an unknown option', () => {
        expect(() => parseCli(['lsp', '--nope'])).toThrow();
    });
});

describe('run', () => {
    const makeDeps = () => {
        const calls = { lsp: [] as (string | undefined)[], mcp: 0, inits: 0, writes: [] as string[] };
        const deps: CliDeps = {
            startLsp: (root) => {
                calls.lsp.push(root);
            },
            startMcp: async () => {
                calls.mcp += 1;
            },
            makeEngine: () =>
                ({
                    init: async () => {
                        calls.inits += 1;
                    },
                }) as unknown as AggregatorEngine,
            write: (text) => {
                calls.writes.push(text);
            },
        };
        return { deps, calls };
    };

    it('prints usage for help', async () => {
        const { deps, calls } = makeDeps();
        await run({ kind: 'help' }, deps);
        expect(calls.writes.join('')).toMatch(/usage/);
    });

    it('prints the version', async () => {
        const { deps, calls } = makeDeps();
        await run({ kind: 'version' }, deps);
        expect(calls.writes.join('')).toMatch(/\d+\.\d+\.\d+/);
    });

    it('starts the LSP server with the root', async () => {
        const { deps, calls } = makeDeps();
        await run({ kind: 'run', mode: 'lsp', root: '/x' }, deps);
        expect(calls.lsp).toEqual(['/x']);
        expect(calls.mcp).toBe(0);
    });

    it('inits an engine and starts the MCP server', async () => {
        const { deps, calls } = makeDeps();
        await run({ kind: 'run', mode: 'mcp' }, deps);
        expect(calls.inits).toBe(1);
        expect(calls.mcp).toBe(1);
    });
});
