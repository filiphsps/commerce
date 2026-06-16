import { describe, expect, it } from 'vitest';

import { parseCli } from '@/cli';

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
