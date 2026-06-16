import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { useVisualViewportInset } from './useVisualViewportInset';

type ViewportListener = () => void;

/**
 * Build a minimal `VisualViewport` stub whose `resize`/`scroll` listeners can be
 * fired on demand, while recording add/remove calls for teardown assertions.
 *
 * @param height - Reported visual-viewport height in pixels.
 * @param offsetTop - Reported visual-viewport top offset in pixels.
 * @returns The stub object plus add/remove spies and a `fire` helper.
 */
function createViewportStub(height: number, offsetTop = 0) {
    const listeners: Record<string, Set<ViewportListener>> = {};
    const addEventListener = vi.fn((type: string, cb: ViewportListener) => {
        listeners[type] ??= new Set();
        listeners[type]?.add(cb);
    });
    const removeEventListener = vi.fn((type: string, cb: ViewportListener) => {
        listeners[type]?.delete(cb);
    });
    const viewport = { height, offsetTop, addEventListener, removeEventListener };
    const fire = (type: string) => {
        for (const cb of listeners[type] ?? []) cb();
    };
    return { viewport, addEventListener, removeEventListener, fire };
}

const originalInnerHeight = window.innerHeight;
const originalVisualViewport = window.visualViewport;

/**
 * Install a fake layout-viewport height and visual-viewport stub on `window`
 * for the duration of a single test.
 *
 * @param innerHeight - Layout viewport height reported via `window.innerHeight`.
 * @param viewport - Visual-viewport stub, or `undefined` to simulate no support.
 */
function installViewport(innerHeight: number, viewport: object | undefined): void {
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: innerHeight });
    Object.defineProperty(window, 'visualViewport', { configurable: true, value: viewport });
}

describe('useVisualViewportInset', () => {
    afterEach(() => {
        Object.defineProperty(window, 'innerHeight', { configurable: true, value: originalInnerHeight });
        Object.defineProperty(window, 'visualViewport', { configurable: true, value: originalVisualViewport });
        vi.clearAllMocks();
    });

    it('returns null when visualViewport is unsupported (SSR-null sentinel)', async () => {
        installViewport(800, undefined);
        const { result } = renderHook(() => useVisualViewportInset());
        await act(async () => {});
        expect(result.current).toBeNull();
    });

    it('computes the bottom inset from the visual viewport on mount', async () => {
        const { viewport } = createViewportStub(500, 50);
        installViewport(800, viewport);
        const { result } = renderHook(() => useVisualViewportInset());
        await act(async () => {});
        expect(result.current).toBe(250); // 800 - 500 - 50
    });

    it('clamps a negative inset to 0', async () => {
        const { viewport } = createViewportStub(900);
        installViewport(800, viewport);
        const { result } = renderHook(() => useVisualViewportInset());
        await act(async () => {});
        expect(result.current).toBe(0);
    });

    it('subscribes to resize and scroll on mount and tears down on unmount', async () => {
        const { viewport, addEventListener, removeEventListener } = createViewportStub(800);
        installViewport(800, viewport);
        const { unmount } = renderHook(() => useVisualViewportInset());
        await act(async () => {});

        expect(addEventListener).toHaveBeenCalledWith('resize', expect.any(Function));
        expect(addEventListener).toHaveBeenCalledWith('scroll', expect.any(Function));

        unmount();
        expect(removeEventListener).toHaveBeenCalledWith('resize', expect.any(Function));
        expect(removeEventListener).toHaveBeenCalledWith('scroll', expect.any(Function));
    });

    it('recomputes the inset when the visual viewport resizes', async () => {
        const stub = createViewportStub(500);
        installViewport(800, stub.viewport);
        const { result } = renderHook(() => useVisualViewportInset());
        await act(async () => {});
        expect(result.current).toBe(300);

        await act(async () => {
            stub.viewport.height = 800; // keyboard dismissed
            stub.fire('resize');
        });
        expect(result.current).toBe(0);
    });
});
