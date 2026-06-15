import { installMatchMedia, type MatchMediaController } from '@nordcom/commerce-test-viewport/matchmedia';
import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { resolveBreakpoint, useBreakpoint } from '@/components/shell/use-breakpoint';

describe('resolveBreakpoint', () => {
    it('returns mobile under 768', () => {
        expect(resolveBreakpoint(640)).toBe('mobile');
    });
    it('returns tablet at 768–1024', () => {
        expect(resolveBreakpoint(900)).toBe('tablet');
    });
    it('returns compact at 1024–1280', () => {
        expect(resolveBreakpoint(1100)).toBe('compact');
    });
    it('returns comfortable at 1280–1536', () => {
        expect(resolveBreakpoint(1440)).toBe('comfortable');
    });
    it('returns wide ≥1536', () => {
        expect(resolveBreakpoint(1920)).toBe('wide');
    });
});

describe('useBreakpoint', () => {
    let viewport: MatchMediaController | undefined;

    afterEach(() => {
        viewport?.cleanup();
        viewport = undefined;
    });

    it('reports the mounted viewport and reacts to resizes', () => {
        // Drives the hook through the shared responsive-testing harness rather
        // than hand-rolling an innerWidth/resize stub per app.
        viewport = installMatchMedia(390);
        const { result } = renderHook(() => useBreakpoint());
        expect(result.current).toBe('mobile');

        act(() => viewport?.setViewport(1280));
        expect(result.current).toBe('comfortable');

        act(() => viewport?.setViewport(768));
        expect(result.current).toBe('tablet');
    });
});
