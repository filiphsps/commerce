'use client';

import type { Field } from 'payload';
import { useCallback, useEffect, useRef, useState } from 'react';

import { serializeFormPayload } from '../form-payload';
import { useForm } from './hooks';

/** Default cadence (ms) between autosave ticks — Payload's autosave interval. */
const DEFAULT_AUTOSAVE_INTERVAL_MS = 2_000;

/**
 * Arguments for {@link useAutosave}.
 */
export type UseAutosaveArgs = {
    /** Top-level collection descriptors — the allow-list {@link serializeFormPayload} scrubs against. */
    fields: readonly Field[];
    /**
     * The draft-save round-trip. Bound by the call site to the Convex draft
     * mutation (`cms.documents.save` with `status: 'draft'`) carrying the
     * already-resolved tenant/document context. It MUST NOT revalidate any
     * path — a draft autosave landing a `revalidatePath` on the edit URL is
     * exactly what re-seeds `<Form>`'s `initialState` mid-keystroke. Keeping
     * revalidation out of this callback is what keeps the autosave path
     * revalidation-free.
     */
    save: (formData: FormData) => Promise<unknown>;
    /** Tick cadence in ms. Defaults to {@link DEFAULT_AUTOSAVE_INTERVAL_MS} (2s). */
    intervalMs?: number;
    /** When `false`, no timer is armed. Defaults to `true`. */
    enabled?: boolean;
};

/**
 * The autosave status the toolbar reads.
 */
export type UseAutosaveResult = {
    /** `true` while a draft round-trip is in flight. */
    isSaving: boolean;
    /** Timestamp of the last successful draft save, or `undefined` before the first one. */
    lastSavedAt: Date | undefined;
    /** Force an immediate save attempt, bypassing the interval (e.g. on blur). */
    saveNow: () => Promise<void>;
};

/**
 * Interval autosave for the native form runtime. Every {@link UseAutosaveArgs.intervalMs}
 * it snapshots the live form values via `useForm().getData()`, scrubs them
 * through {@link serializeFormPayload} (dropping any injected non-field key),
 * and — only when the serialized blob differs from the one last sent — posts it
 * through the injected draft `save`.
 *
 * Three invariants this hook upholds:
 * - **Zero revalidation.** It imports nothing from `next/cache`; the `save`
 *   callback is contractually revalidation-free (see its JSDoc). A 2s draft
 *   loop therefore never triggers a path refresh, so it cannot re-seed
 *   `<Form>`'s `initialState` out from under the user.
 * - **No keystroke clobber.** Survival of in-flight edits is owned by the
 *   reducer's `REPLACE_STATE` InitialStateGate (see `reducer.ts`): this hook
 *   never dispatches state itself, so a server `initialState` refresh that
 *   lands mid-edit overlays only clean fields and keeps the dirty one.
 * - **Stable clock.** `save`, `getData`, and `fields` are read through refs so
 *   the interval is armed once per `enabled`/`intervalMs` change — a keystroke
 *   never resets the 2s clock.
 *
 * @param args - See {@link UseAutosaveArgs}.
 * @returns The autosave status — `isSaving`, `lastSavedAt`, and a `saveNow` escape hatch.
 * @throws {MissingContextProviderError} When used outside a `<Form>`.
 */
export function useAutosave({
    fields,
    save,
    intervalMs = DEFAULT_AUTOSAVE_INTERVAL_MS,
    enabled = true,
}: UseAutosaveArgs): UseAutosaveResult {
    const { getData } = useForm();

    const [isSaving, setIsSaving] = useState(false);
    const [lastSavedAt, setLastSavedAt] = useState<Date | undefined>(undefined);

    const saveRef = useRef(save);
    saveRef.current = save;
    const getDataRef = useRef(getData);
    getDataRef.current = getData;
    const fieldsRef = useRef(fields);
    fieldsRef.current = fields;

    // The blob last round-tripped. The tick skips a save when the serialized
    // payload is byte-identical, so an idle form never re-posts. `null` until
    // the mount effect seeds it from the server baseline, so an untouched form's
    // first tick is a no-op.
    const lastSentRef = useRef<string | null>(null);
    const inFlightRef = useRef(false);

    const runSave = useCallback(async () => {
        if (inFlightRef.current) return;
        const formData = serializeFormPayload(getDataRef.current(), fieldsRef.current);
        const blob = String(formData.get('_payload'));
        if (blob === lastSentRef.current) return;

        inFlightRef.current = true;
        setIsSaving(true);
        try {
            await saveRef.current(formData);
            lastSentRef.current = blob;
            setLastSavedAt(new Date());
        } finally {
            inFlightRef.current = false;
            setIsSaving(false);
        }
    }, []);

    // Seed the baseline from the initial server state so the first tick only
    // fires once the user has actually diverged from it.
    useEffect(() => {
        if (lastSentRef.current === null) {
            lastSentRef.current = String(serializeFormPayload(getDataRef.current(), fieldsRef.current).get('_payload'));
        }
    }, []);

    useEffect(() => {
        if (!enabled) return;
        const id = setInterval(() => {
            void runSave();
        }, intervalMs);
        return () => clearInterval(id);
    }, [enabled, intervalMs, runSave]);

    return { isSaving, lastSavedAt, saveNow: runSave };
}
