import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { reload } from '../shared/reload';
import { useBuildNotifierEngine } from './use-build-notifier-engine';

vi.mock('../shared/reload', () => ({ reload: vi.fn() }));

const flush = () =>
    act(async () => {
        await Promise.resolve();
    });

describe('useBuildNotifierEngine', () => {
    beforeEach(() => {
        sessionStorage.clear();
        vi.mocked(reload).mockClear();
    });
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('flags an update when the endpoint id differs', async () => {
        const fetcher = vi.fn().mockResolvedValue({ id: 'NEW', ts: 1 });
        const { result } = renderHook(() => useBuildNotifierEngine({ currentBuildId: 'OLD', fetcher }));
        await waitFor(() => expect(result.current.updateAvailable).toBe(true));
        expect(result.current.latestBuildId).toBe('NEW');
    });

    it('does not flag when ids match', async () => {
        const fetcher = vi.fn().mockResolvedValue({ id: 'SAME', ts: 1 });
        const { result } = renderHook(() => useBuildNotifierEngine({ currentBuildId: 'SAME', fetcher }));
        await flush();
        expect(result.current.updateAvailable).toBe(false);
    });

    it('is inert in development (no fetch)', async () => {
        const fetcher = vi.fn().mockResolvedValue({ id: 'NEW', ts: 1 });
        renderHook(() => useBuildNotifierEngine({ currentBuildId: 'development', fetcher }));
        await flush();
        expect(fetcher).not.toHaveBeenCalled();
    });

    it('does not fetch when disabled', async () => {
        const fetcher = vi.fn().mockResolvedValue({ id: 'NEW', ts: 1 });
        renderHook(() => useBuildNotifierEngine({ currentBuildId: 'OLD', enabled: false, fetcher }));
        await flush();
        expect(fetcher).not.toHaveBeenCalled();
    });

    it('dismiss hides the current build but a newer build re-surfaces', async () => {
        const fetcher = vi.fn().mockResolvedValue({ id: 'B1', ts: 1 });
        const { result, rerender } = renderHook(
            (props: { fetcher: () => Promise<{ id: string; ts: number }> }) =>
                useBuildNotifierEngine({ currentBuildId: 'OLD', fetcher: props.fetcher }),
            { initialProps: { fetcher } },
        );
        await waitFor(() => expect(result.current.updateAvailable).toBe(true));

        act(() => result.current.dismiss());
        expect(result.current.dismissed).toBe(true);

        const fetcher2 = vi.fn().mockResolvedValue({ id: 'B2', ts: 2 });
        rerender({ fetcher: fetcher2 });
        act(() => result.current.check());
        await waitFor(() => expect(result.current.latestBuildId).toBe('B2'));
        expect(result.current.dismissed).toBe(false);
        expect(result.current.updateAvailable).toBe(true);
    });

    it('calls onUpdateAvailable once per new id and auto-reloads when enabled', async () => {
        const onUpdateAvailable = vi.fn();
        const fetcher = vi.fn().mockResolvedValue({ id: 'NEW', ts: 1 });
        renderHook(() =>
            useBuildNotifierEngine({ currentBuildId: 'OLD', fetcher, autoReload: true, onUpdateAvailable }),
        );
        await waitFor(() => expect(onUpdateAvailable).toHaveBeenCalledWith('NEW'));
        expect(onUpdateAvailable).toHaveBeenCalledTimes(1);
        expect(vi.mocked(reload)).toHaveBeenCalled();
    });

    it('sets status=error when the fetcher throws', async () => {
        const fetcher = vi.fn().mockRejectedValue(new Error('boom'));
        const { result } = renderHook(() => useBuildNotifierEngine({ currentBuildId: 'OLD', fetcher }));
        await waitFor(() => expect(result.current.status).toBe('error'));
        expect(result.current.updateAvailable).toBe(false);
    });

    it('polls on interval and skips ticks while hidden', async () => {
        vi.useFakeTimers();
        try {
            const fetcher = vi.fn().mockResolvedValue({ id: 'SAME', ts: 1 });
            renderHook(() => useBuildNotifierEngine({ currentBuildId: 'OLD', fetcher, intervalMs: 5_000 }));
            // Flush the mount-time initial check without draining the recurring interval
            // (`runAllTimersAsync` throws on an infinite interval).
            await act(async () => {
                await vi.advanceTimersByTimeAsync(0);
            });
            const afterMount = fetcher.mock.calls.length;
            await act(async () => {
                await vi.advanceTimersByTimeAsync(5_000);
            });
            expect(fetcher.mock.calls.length).toBeGreaterThan(afterMount);
            Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true });
            const beforeHidden = fetcher.mock.calls.length;
            await act(async () => {
                await vi.advanceTimersByTimeAsync(5_000);
            });
            expect(fetcher.mock.calls.length).toBe(beforeHidden);
        } finally {
            Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });
            vi.useRealTimers();
        }
    });

    it('re-checks when the tab becomes visible', async () => {
        const fetcher = vi.fn().mockResolvedValue({ id: 'SAME', ts: 1 });
        renderHook(() => useBuildNotifierEngine({ currentBuildId: 'OLD', fetcher }));
        await flush();
        const before = fetcher.mock.calls.length;
        Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });
        document.dispatchEvent(new Event('visibilitychange'));
        await flush();
        expect(fetcher.mock.calls.length).toBeGreaterThan(before);
    });

    it('does not re-fire onUpdateAvailable for the same id', async () => {
        const onUpdateAvailable = vi.fn();
        const fetcher = vi.fn().mockResolvedValue({ id: 'NEW', ts: 1 });
        const { result } = renderHook(() =>
            useBuildNotifierEngine({ currentBuildId: 'OLD', fetcher, onUpdateAvailable }),
        );
        await waitFor(() => expect(onUpdateAvailable).toHaveBeenCalledTimes(1));
        act(() => result.current.check());
        await flush();
        expect(onUpdateAvailable).toHaveBeenCalledTimes(1);
    });
});
