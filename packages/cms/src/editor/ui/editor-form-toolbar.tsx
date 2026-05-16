'use client';

import { useAllFormFields, useForm, useFormModified } from '@payloadcms/ui';
import { type ComponentType, useEffect, useRef, useState } from 'react';
import type { EditorToolbarShellProps } from '../runtime';

export type EditorFormToolbarProps = {
    /** Shell component the admin app supplies (renders Save Draft / Publish buttons). */
    Toolbar: ComponentType<EditorToolbarShellProps>;
    /** Server action (domain + id already bound). */
    saveDraftAction: (formData: FormData) => Promise<void>;
    /** Server action (domain + id already bound). */
    publishAction: (formData: FormData) => Promise<void>;
    /** Autosave config. Omit to disable autosave entirely. */
    autosave?: { interval: number };
};

/**
 * Wires Payload's form context to:
 *   - the admin app's visual `<Toolbar>` (Save / Publish buttons),
 *   - an autosave timer that fires `saveDraftAction` after `autosave.interval`
 *     milliseconds of idle (only when the form is `modified`, to prevent the
 *     revalidate-loop that bit the bespoke `business-data-form.tsx`).
 *
 * Must be rendered inside Payload's `<Form>` — `useForm`, `useAllFormFields`,
 * and `useFormModified` all read from that context.
 */
export function EditorFormToolbar({ Toolbar, saveDraftAction, publishAction, autosave }: EditorFormToolbarProps) {
    const { createFormData } = useForm();
    const [fields] = useAllFormFields();
    const modified = useFormModified();

    const [isSaving, setIsSaving] = useState(false);
    const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);

    const saveActionRef = useRef(saveDraftAction);
    saveActionRef.current = saveDraftAction;

    // Debounced autosave: re-arms whenever `fields` identity changes; only
    // fires when `modified` is true.
    useEffect(() => {
        if (!autosave || !modified) return;
        const timer = setTimeout(async () => {
            setIsSaving(true);
            try {
                const formData = await createFormData(undefined, {});
                await saveActionRef.current(formData);
                setLastSavedAt(new Date());
            } finally {
                setIsSaving(false);
            }
        }, autosave.interval);
        return () => clearTimeout(timer);
    }, [autosave, modified, fields, createFormData]);

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
        <Toolbar
            saveDraftAction={saveDraft}
            publishAction={publish}
            isSaving={isSaving}
            lastSavedAt={lastSavedAt}
            hasDrafts={!!autosave}
        />
    );
}
