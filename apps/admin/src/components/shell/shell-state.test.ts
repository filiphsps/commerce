import { describe, expect, it } from 'vitest';
import { DEFAULT_SHELL_STATE, parseShellState, serializeShellState } from '@/components/shell/shell-state';

describe('parseShellState', () => {
    it('returns defaults for empty input', () => {
        expect(parseShellState(undefined)).toEqual(DEFAULT_SHELL_STATE);
    });

    it('returns defaults for malformed JSON', () => {
        expect(parseShellState('not json')).toEqual(DEFAULT_SHELL_STATE);
    });

    it('returns defaults for partial cookie', () => {
        expect(parseShellState(encodeURIComponent('{"rail":{"w":100,"collapsed":false}}'))).toEqual(
            DEFAULT_SHELL_STATE,
        );
    });

    it('parses a complete valid cookie', () => {
        const state = {
            rail: { w: 100, collapsed: false },
            subnav: { w: 250, collapsed: false },
            inspector: { w: 320, collapsed: true },
        };
        expect(parseShellState(encodeURIComponent(JSON.stringify(state)))).toEqual(state);
    });

    it('rejects out-of-range widths and falls back', () => {
        const bad = encodeURIComponent(JSON.stringify({ rail: { w: -50, collapsed: false } }));
        expect(parseShellState(bad)).toEqual(DEFAULT_SHELL_STATE);
    });
});

describe('serializeShellState', () => {
    it('produces a parseable cookie value', () => {
        const serialized = serializeShellState(DEFAULT_SHELL_STATE);
        expect(parseShellState(serialized)).toEqual(DEFAULT_SHELL_STATE);
    });
});
