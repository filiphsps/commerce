'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

/** Default debounce window in milliseconds. */
const DEFAULT_DELAY_MS = 2000;

export type UseAutosaveOptions<T> = {
    /** Current form state (rebuilt on every change). */
    state: T;
    /** Async function that saves the state as a draft. */
    save: (state: T) => Promise<void>;
    /**
     * Debounce window in ms.
     * @default 2000
     */
    delay?: number;
    /**
     * Disable autosave (e.g., while a publish is in flight).
     * Cancels any pending debounce timer when set to `true`.
     * @default false
     */
    disabled?: boolean;
};

export type UseAutosaveResult = {
    /** `true` while the save promise is pending. */
    isSaving: boolean;
    /** The timestamp of the last successful save, or `undefined` if never saved. */
    lastSavedAt: Date | undefined;
    /** Manually trigger a save now, bypassing the debounce. */
    flush: () => Promise<void>;
    /** Last error from `save()`, if any. Cleared on next save attempt. */
    error: string | undefined;
};

/**
 * Debounced autosave hook for document edit forms.
 *
 * On each `state` change (compared by referential equality — callers should
 * stabilise their state object via `useMemo` or similar), a debounce timer is
 * started. After `delay` ms the current `stateRef.current` is passed to `save`.
 *
 * Dirty checking: referential equality only. JSON.stringify deep-comparison is
 * intentionally avoided — it is expensive for large Payload FormState objects
 * and callers are expected to manage re-renders appropriately.
 *
 * On unmount the pending timer is cancelled and NO save fires.
 */
export function useAutosave<T>({
    state,
    save,
    delay = DEFAULT_DELAY_MS,
    disabled = false,
}: UseAutosaveOptions<T>): UseAutosaveResult {
    const [isSaving, setIsSaving] = useState(false);
    const [lastSavedAt, setLastSavedAt] = useState<Date | undefined>(undefined);
    const [error, setError] = useState<string | undefined>(undefined);

    // Keep the latest state in a ref so the debounced callback always sees the
    // most recent value without needing to re-register the effect on every render.
    const stateRef = useRef<T>(state);
    stateRef.current = state;

    // Keep a stable reference to `save` so the effect dependency list doesn't
    // thrash on every render when the caller passes an inline function.
    const saveRef = useRef<(s: T) => Promise<void>>(save);
    saveRef.current = save;

    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    /** Perform the actual save: clear pending timer, set isSaving, run, update state. */
    const executeSave = useCallback(async () => {
        if (timerRef.current !== null) {
            clearTimeout(timerRef.current);
            timerRef.current = null;
        }
        setError(undefined);
        setIsSaving(true);
        try {
            await saveRef.current(stateRef.current);
            setLastSavedAt(new Date());
        } catch (err) {
            console.error(err);
            setError(err instanceof Error ? err.message : 'Autosave failed.');
        } finally {
            setIsSaving(false);
        }
    }, []);

    // `state` must be in the deps array so the effect restarts the debounce
    // timer whenever the caller provides a new state value. Biome flags params as
    // "outer scope" non-deps, but this is intentional — see hook doc above.
    // biome-ignore lint/correctness/useExhaustiveDependencies: state is the intentional trigger for restarting the debounce timer
    useEffect(() => {
        // Cancel pending timer when disabled flips true.
        if (disabled) {
            if (timerRef.current !== null) {
                clearTimeout(timerRef.current);
                timerRef.current = null;
            }
            return;
        }

        // Clear previous timer and schedule a new one.
        if (timerRef.current !== null) {
            clearTimeout(timerRef.current);
        }

        timerRef.current = setTimeout(() => {
            timerRef.current = null;
            executeSave();
        }, delay);

        // On unmount: cancel timer — DO NOT fire the pending save.
        return () => {
            if (timerRef.current !== null) {
                clearTimeout(timerRef.current);
                timerRef.current = null;
            }
        };
    }, [state, delay, disabled, executeSave]);

    return { isSaving, lastSavedAt, flush: executeSave, error };
}
