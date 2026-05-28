import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { useIsDesktop } from './use-is-desktop';

type ChangeListener = (event: { matches: boolean }) => void;

/**
 * Build a controllable `MediaQueryList` stub. The `modern` flavor exposes
 * `addEventListener`/`removeEventListener`; the `legacy` flavor exposes only the
 * deprecated `addListener`/`removeListener` (Safari < 14 / iOS <= 13), letting
 * tests drive the feature-detect fallback that FINDING-C3 added.
 *
 * @param matches - Initial `matches` value reported when the hook subscribes.
 * @param flavor - `'modern'` for the `addEventListener` API, `'legacy'` for the `addListener` API.
 * @returns The stub plus subscribe/teardown spies and a `fire` helper that dispatches a `change` event.
 */
function createMatchMediaStub(matches: boolean, flavor: 'modern' | 'legacy') {
    const listeners = new Set<ChangeListener>();
    const addEventListener = vi.fn((type: string, cb: ChangeListener) => {
        if (type === 'change') listeners.add(cb);
    });
    const removeEventListener = vi.fn((type: string, cb: ChangeListener) => {
        if (type === 'change') listeners.delete(cb);
    });
    const addListener = vi.fn((cb: ChangeListener) => listeners.add(cb));
    const removeListener = vi.fn((cb: ChangeListener) => listeners.delete(cb));

    const mql =
        flavor === 'modern'
            ? { matches, media: '(min-width: 48em)', addEventListener, removeEventListener }
            : { matches, media: '(min-width: 48em)', addListener, removeListener };

    const fire = (next: boolean) => {
        for (const cb of listeners) cb({ matches: next });
    };

    return { mql, addEventListener, removeEventListener, addListener, removeListener, fire };
}

const originalMatchMedia = window.matchMedia;

/**
 * Install a `window.matchMedia` implementation for a single test, or `undefined`
 * to simulate a WKWebView in-app browser that omits the API entirely.
 *
 * @param impl - The `matchMedia` function to install, or `undefined` for "unsupported".
 */
function installMatchMedia(impl: typeof window.matchMedia | undefined): void {
    Object.defineProperty(window, 'matchMedia', { configurable: true, value: impl });
}

describe('useIsDesktop', () => {
    afterEach(() => {
        Object.defineProperty(window, 'matchMedia', { configurable: true, value: originalMatchMedia });
        vi.clearAllMocks();
    });

    it('returns the SSR null sentinel when matchMedia is unavailable (WKWebView in-app browser)', async () => {
        installMatchMedia(undefined);
        const { result } = renderHook(() => useIsDesktop());
        await act(async () => {});
        expect(result.current).toBeNull();
    });

    it('resolves to true on desktop once the mount effect reads the media query', async () => {
        const { mql } = createMatchMediaStub(true, 'modern');
        installMatchMedia(vi.fn().mockReturnValue(mql) as unknown as typeof window.matchMedia);
        const { result } = renderHook(() => useIsDesktop());
        await act(async () => {});
        expect(result.current).toBe(true);
    });

    it('subscribes via addEventListener("change") and tears it down on unmount', async () => {
        const stub = createMatchMediaStub(true, 'modern');
        installMatchMedia(vi.fn().mockReturnValue(stub.mql) as unknown as typeof window.matchMedia);
        const { unmount } = renderHook(() => useIsDesktop());
        await act(async () => {});
        expect(stub.addEventListener).toHaveBeenCalledWith('change', expect.any(Function));
        unmount();
        expect(stub.removeEventListener).toHaveBeenCalledWith('change', expect.any(Function));
    });

    it('falls back to addListener/removeListener when addEventListener is absent (Safari < 14 / iOS <= 13)', async () => {
        const stub = createMatchMediaStub(false, 'legacy');
        installMatchMedia(vi.fn().mockReturnValue(stub.mql) as unknown as typeof window.matchMedia);
        const { unmount } = renderHook(() => useIsDesktop());
        await act(async () => {});
        expect(stub.addListener).toHaveBeenCalledWith(expect.any(Function));
        unmount();
        expect(stub.removeListener).toHaveBeenCalledWith(expect.any(Function));
    });

    it('does not throw when only the legacy listener API exists (FINDING-C3 regression guard)', () => {
        const stub = createMatchMediaStub(true, 'legacy');
        installMatchMedia(vi.fn().mockReturnValue(stub.mql) as unknown as typeof window.matchMedia);
        expect(() => {
            const { unmount } = renderHook(() => useIsDesktop());
            unmount();
        }).not.toThrow();
    });

    it('flips when the media query crosses the breakpoint', async () => {
        const stub = createMatchMediaStub(false, 'modern');
        installMatchMedia(vi.fn().mockReturnValue(stub.mql) as unknown as typeof window.matchMedia);
        const { result } = renderHook(() => useIsDesktop());
        await act(async () => {});
        expect(result.current).toBe(false);
        await act(async () => {
            stub.fire(true);
        });
        expect(result.current).toBe(true);
    });
});
