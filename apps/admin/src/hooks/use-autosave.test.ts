import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useAutosave } from '@/hooks/use-autosave';

// ------------------------------------------------------------------
// Tests
// ------------------------------------------------------------------

describe('useAutosave', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('does not call save immediately on mount', () => {
        const save = vi.fn().mockResolvedValue(undefined);
        renderHook(() => useAutosave({ state: { value: 'a' }, save }));

        expect(save).not.toHaveBeenCalled();
    });

    it('calls save after the debounce delay when state changes', async () => {
        const save = vi.fn().mockResolvedValue(undefined);
        const { rerender } = renderHook(({ state }) => useAutosave({ state, save, delay: 500 }), {
            initialProps: { state: { value: 'a' } },
        });

        // Change state.
        rerender({ state: { value: 'b' } });

        // Before delay — save must not have fired.
        act(() => {
            vi.advanceTimersByTime(400);
        });
        expect(save).not.toHaveBeenCalled();

        // After delay — save fires.
        await act(async () => {
            vi.advanceTimersByTime(200);
        });

        expect(save).toHaveBeenCalledTimes(1);
        expect(save).toHaveBeenCalledWith({ value: 'b' });
    });

    it('debounces rapid state changes — only the last state is saved', async () => {
        const save = vi.fn().mockResolvedValue(undefined);
        const { rerender } = renderHook(({ state }) => useAutosave({ state, save, delay: 500 }), {
            initialProps: { state: { value: 'a' } },
        });

        // Rapid successive updates within the debounce window.
        rerender({ state: { value: 'b' } });
        act(() => {
            vi.advanceTimersByTime(100);
        });
        rerender({ state: { value: 'c' } });
        act(() => {
            vi.advanceTimersByTime(100);
        });
        rerender({ state: { value: 'd' } });

        // Advance past the final debounce.
        await act(async () => {
            vi.advanceTimersByTime(600);
        });

        expect(save).toHaveBeenCalledTimes(1);
        expect(save).toHaveBeenCalledWith({ value: 'd' });
    });

    it('flush() triggers an immediate save bypassing the debounce', async () => {
        const save = vi.fn().mockResolvedValue(undefined);
        const { result } = renderHook(() => useAutosave({ state: { value: 'x' }, save, delay: 2000 }));

        await act(async () => {
            await result.current.flush();
        });

        expect(save).toHaveBeenCalledTimes(1);
        expect(save).toHaveBeenCalledWith({ value: 'x' });
    });

    it('flush() sets lastSavedAt on success', async () => {
        const save = vi.fn().mockResolvedValue(undefined);
        const { result } = renderHook(() => useAutosave({ state: { value: 'x' }, save }));

        expect(result.current.lastSavedAt).toBeUndefined();

        await act(async () => {
            await result.current.flush();
        });

        expect(result.current.lastSavedAt).toBeInstanceOf(Date);
    });

    it('disabled=true cancels a pending debounce timer', async () => {
        const save = vi.fn().mockResolvedValue(undefined);
        const { rerender } = renderHook(({ state, disabled }) => useAutosave({ state, save, delay: 500, disabled }), {
            initialProps: { state: { value: 'a' }, disabled: false },
        });

        // Start a pending debounce.
        rerender({ state: { value: 'b' }, disabled: false });

        // Before it fires, disable autosave.
        act(() => {
            vi.advanceTimersByTime(200);
        });
        rerender({ state: { value: 'b' }, disabled: true });

        // Advance past the original debounce window.
        await act(async () => {
            vi.advanceTimersByTime(600);
        });

        expect(save).not.toHaveBeenCalled();
    });

    it('unmount cancels the pending timer — save does NOT fire', async () => {
        const save = vi.fn().mockResolvedValue(undefined);
        const { rerender, unmount } = renderHook(({ state }) => useAutosave({ state, save, delay: 500 }), {
            initialProps: { state: { value: 'a' } },
        });

        rerender({ state: { value: 'b' } });

        // Unmount before debounce fires.
        unmount();

        await act(async () => {
            vi.advanceTimersByTime(1000);
        });

        expect(save).not.toHaveBeenCalled();
    });

    it('sets error when save rejects', async () => {
        const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
        const save = vi.fn().mockRejectedValue(new Error('network error'));
        const { result } = renderHook(() => useAutosave({ state: { value: 'x' }, save }));

        await act(async () => {
            await result.current.flush();
        });

        expect(result.current.error).toBe('network error');
        expect(result.current.isSaving).toBe(false);

        consoleError.mockRestore();
    });

    it('clears the error on the next save attempt', async () => {
        const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
        const save = vi.fn().mockRejectedValueOnce(new Error('first')).mockResolvedValue(undefined);
        const { result } = renderHook(() => useAutosave({ state: { value: 'x' }, save }));

        await act(async () => {
            await result.current.flush();
        });
        expect(result.current.error).toBe('first');

        await act(async () => {
            await result.current.flush();
        });
        expect(result.current.error).toBeUndefined();

        consoleError.mockRestore();
    });
});
