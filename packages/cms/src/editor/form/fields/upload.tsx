'use client';

import { MissingContextProviderError } from '@nordcom/commerce-errors';
import { type ChangeEvent, createContext, type ReactNode, useContext, useState } from 'react';

import type { UploadFieldDescriptor } from '../../../descriptors/types';
import type { FieldRendererProps } from '../registry';
import { FieldShell, fieldControlClassName, useEditorField } from './field-shell';

/**
 * The stored result of an upload — the persisted media document's Convex id,
 * which the upload widget writes into form state.
 */
export type UploadedMedia = {
    /** The uploaded media document's Convex id. */
    id: string;
};

/**
 * The seam the upload widget commits a picked file through. CMSMEDIA-01 will
 * implement this against the real Convex upload action; until then any host
 * (and the widget's tests) provide a conforming function, so the widget never
 * imports the not-yet-built action directly.
 *
 * @param file - The file the editor picked.
 * @returns The stored media descriptor once the upload resolves.
 */
export type UploadAction = (file: File) => Promise<UploadedMedia>;

const UploadActionContext = createContext<UploadAction | null>(null);

/**
 * Provide the upload action the {@link UploadField} widgets beneath it commit
 * picked files through. The explicit seam keeps the widget decoupled from the
 * deferred CMSMEDIA-01 implementation.
 *
 * @param props.action - The function that persists a file and returns its media id.
 * @param props.children - The subtree that may render upload widgets.
 * @returns The provider wrapping `children`.
 */
export function UploadActionProvider({ action, children }: { action: UploadAction; children: ReactNode }) {
    return <UploadActionContext.Provider value={action}>{children}</UploadActionContext.Provider>;
}

/**
 * Read the upload action from the nearest {@link UploadActionProvider}.
 * Throwing when unprovided keeps the dependency explicit rather than rendering
 * a picker that silently drops files.
 *
 * @returns The upload action.
 * @throws {MissingContextProviderError} When no provider wraps the call site.
 */
export function useUploadAction(): UploadAction {
    const action = useContext(UploadActionContext);
    if (!action) throw new MissingContextProviderError('useUploadAction', 'UploadActionProvider');
    return action;
}

/**
 * Media-picker widget. On file select it calls the {@link UploadAction} seam
 * and stores the returned media id in form state; the action's full Convex
 * implementation is deferred to CMSMEDIA-01 / CMSGATE-02. An in-flight upload
 * disables the input and a failure surfaces inline without clobbering any
 * previously stored id. Condition-gated and required-aware like the scalar
 * widgets — a hidden field is pruned from the `_payload` blob.
 *
 * @param props.field - The upload descriptor.
 * @param props.path - The field's dotted form-state path.
 * @returns The bound picker, or `null` when its condition hides it.
 */
export function UploadField({ field, path }: FieldRendererProps<UploadFieldDescriptor>) {
    const { value, setValue, visible, error } = useEditorField<string>(field, path);
    const upload = useUploadAction();
    const [pending, setPending] = useState(false);
    const [uploadError, setUploadError] = useState<string | undefined>(undefined);
    if (!visible) return null;

    const onChange = async (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;
        setPending(true);
        setUploadError(undefined);
        try {
            const media = await upload(file);
            setValue(media.id);
        } catch (cause) {
            setUploadError(cause instanceof Error ? cause.message : 'Upload failed.');
        } finally {
            setPending(false);
        }
    };

    return (
        <FieldShell
            htmlFor={path}
            label={field.label ?? field.name}
            required={field.required}
            errorMessage={uploadError ?? error}
        >
            <input
                id={path}
                type="file"
                required={field.required && !value}
                disabled={pending}
                onChange={onChange}
                className={fieldControlClassName}
            />
            {value ? (
                <span data-testid={`upload-${path}-value`} className="text-muted-foreground text-xs">
                    {value}
                </span>
            ) : null}
        </FieldShell>
    );
}
