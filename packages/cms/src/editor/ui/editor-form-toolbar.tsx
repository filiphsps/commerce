'use client';

import { useAllFormFields, useForm, useFormModified } from '@payloadcms/ui';
import { type ComponentType, type ReactNode, useEffect, useRef, useState } from 'react';
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
 * Wires Payload's form context to:
 *   - the admin app's visual `<Toolbar>` (Save / Publish buttons),
 *   - an autosave timer that fires `saveDraftAction` after `autosave.interval`
 *     milliseconds of idle (only when the form is `modified`, to prevent the
 *     revalidate-loop that bit the bespoke `business-data-form.tsx`),
 *   - an optional locale switcher slot on the left.
 *
 * Must be rendered inside Payload's `<Form>` — `useForm`, `useAllFormFields`,
 * and `useFormModified` all read from that context.
 */
export function EditorFormToolbar({
    Toolbar,
    saveDraftAction,
    publishAction,
    autosave,
    localeSwitcher,
}: EditorFormToolbarProps) {
    const { createFormData } = useForm();
    const [_fields] = useAllFormFields();
    const modified = useFormModified();

    const [isSaving, setIsSaving] = useState(false);
    const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);

    const saveActionRef = useRef(saveDraftAction);
    saveActionRef.current = saveDraftAction;

    useEffect(() => {
        if (!autosave || !modified) return;
        const timer = setTimeout(async () => {
            setIsSaving(true);
            try {
                const formData = await createFormData(undefined, {});
                await saveActionRef.current(formData);
                setLastSavedAt(new Date());
            } catch (err) {
                // Autosave runs in the background; never surface failures as
                // "Uncaught (in promise)" — the user explicit save action will
                // re-trigger and report any persistent errors inline.
                console.warn('[editor] autosave failed', err);
            } finally {
                setIsSaving(false);
            }
        }, autosave.interval);
        return () => clearTimeout(timer);
    }, [autosave, modified, createFormData]);

    const saveDraft = async (): Promise<void> => {
        const formData = await createFormData(undefined, {});
        await saveDraftAction(formData);
        setLastSavedAt(new Date());
    };

    const publish = async (): Promise<void> => {
        const formData = await createFormData(undefined, {});
        await publishAction(formData);
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
