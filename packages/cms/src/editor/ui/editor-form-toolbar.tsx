'use client';

import { type ComponentType, type ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import { useForm } from '../form';
import type { EditorToolbarShellProps } from '../runtime';

/**
 * Props for {@link EditorFormToolbar}. Carries the shell `Toolbar` component,
 * bound server actions, optional autosave config, and an optional locale
 * switcher slot rendered on the left of the toolbar bar.
 *
 * @example
 * <EditorFormToolbar Toolbar={runtime.Toolbar} saveDraftAction={saveDraft} publishAction={publish} autosave={{ interval: 2000 }} />
 */
export type EditorFormToolbarProps = {
    /** Shell component the admin app supplies (renders Save Draft / Publish buttons). */
    Toolbar: ComponentType<EditorToolbarShellProps>;
    /** Server action (domain + id already bound). */
    saveDraftAction: (formData: FormData) => Promise<void>;
    /** Server action (domain + id already bound). */
    publishAction: (formData: FormData) => Promise<void>;
    /** Autosave config. Omit to disable autosave entirely. */
    autosave?: { interval: number };
    /**
     * Optional locale switcher rendered on the LEFT of the toolbar bar.
     * The parent `<DocumentForm>` already wraps the toolbar in
     * `flex items-center justify-between`, so this slot lands left and
     * the Save/Publish buttons stay right.
     */
    localeSwitcher?: ReactNode;
};

/**
 * Wires the native CMSFORM-01 form context to:
 *   - the admin app's visual `<Toolbar>` (Save / Publish buttons),
 *   - the interval autosave loop that posts `saveDraftAction` every
 *     `autosave.interval` milliseconds while the serialized form diverges from
 *     the last round-tripped blob,
 *   - an optional locale switcher slot on the left.
 *
 * The autosave loop upholds the CMSFORM-05 invariants through the FULL action
 * path (this component posts the real bound server action, not an injected
 * callback):
 * - **Interval, not idle-debounce.** The timer is armed once per
 *   `autosave.interval`; a keystroke never resets the 2s clock, and — unlike
 *   the previous `modified`-gated one-shot — every subsequent edit keeps
 *   autosaving because each tick re-reads the live state. The blob comparison
 *   against the last successfully sent payload makes an idle form a no-op.
 * - **No keystroke clobber.** Each tick serializes the CURRENT form state via
 *   `createFormData`, so keystrokes typed while a save is in flight ride out
 *   on the next tick; in-flight survival against a server `initialState`
 *   refresh is the reducer's `REPLACE_STATE` gate.
 * - **Zero revalidation.** Nothing here imports `next/cache`; the draft action
 *   is contractually revalidation-free (see `actions.ts`).
 *
 * Must be rendered inside the native `<Form>` — `useForm` reads from that
 * context.
 *
 * @param props - See {@link EditorFormToolbarProps}.
 * @returns The locale-switcher slot plus the shell toolbar.
 * @throws {MissingContextProviderError} When used outside a `<Form>`.
 */
export function EditorFormToolbar({
    Toolbar,
    saveDraftAction,
    publishAction,
    autosave,
    localeSwitcher,
}: EditorFormToolbarProps) {
    const { createFormData } = useForm();

    const [isSaving, setIsSaving] = useState(false);
    const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);

    const saveActionRef = useRef(saveDraftAction);
    saveActionRef.current = saveDraftAction;
    const createFormDataRef = useRef(createFormData);
    createFormDataRef.current = createFormData;

    // The `_payload` blob last round-tripped (autosave or explicit save). A
    // tick skips its save when the live blob is byte-identical, so an idle
    // form never re-posts. `null` until the mount effect seeds it from the
    // server baseline, so an untouched form's first ticks are no-ops.
    const lastSentRef = useRef<string | null>(null);
    const inFlightRef = useRef(false);

    // Seed the baseline from the initial server state so autosave only fires
    // once the user has actually diverged from it.
    useEffect(() => {
        if (lastSentRef.current !== null) return;
        void createFormDataRef.current().then((formData) => {
            if (lastSentRef.current === null) lastSentRef.current = String(formData.get('_payload'));
        });
    }, []);

    const runAutosave = useCallback(async () => {
        if (inFlightRef.current) return;
        const formData = await createFormDataRef.current();
        const blob = String(formData.get('_payload'));
        if (blob === lastSentRef.current) return;

        inFlightRef.current = true;
        setIsSaving(true);
        try {
            await saveActionRef.current(formData);
            lastSentRef.current = blob;
            setLastSavedAt(new Date());
        } catch (err) {
            // Autosave runs in the background; never surface failures as
            // "Uncaught (in promise)" — the user's explicit save action will
            // re-trigger and report any persistent errors inline.
            console.warn('[editor] autosave failed', err);
        } finally {
            inFlightRef.current = false;
            setIsSaving(false);
        }
    }, []);

    const interval = autosave?.interval;
    useEffect(() => {
        if (interval === undefined) return;
        const id = setInterval(() => {
            void runAutosave();
        }, interval);
        return () => clearInterval(id);
    }, [interval, runAutosave]);

    const saveDraft = async (): Promise<void> => {
        const formData = await createFormData();
        await saveDraftAction(formData);
        // An explicit save advances the autosave baseline too, so the next
        // tick does not redundantly re-post the just-saved blob.
        lastSentRef.current = String(formData.get('_payload'));
        setLastSavedAt(new Date());
    };

    const publish = async (): Promise<void> => {
        const formData = await createFormData();
        await publishAction(formData);
        lastSentRef.current = String(formData.get('_payload'));
        setLastSavedAt(new Date());
    };

    return (
        <>
            {localeSwitcher ? <div>{localeSwitcher}</div> : <div />}
            <Toolbar
                saveDraftAction={saveDraft}
                publishAction={publish}
                isSaving={isSaving}
                lastSavedAt={lastSavedAt}
                hasDrafts={!!autosave}
            />
        </>
    );
}
