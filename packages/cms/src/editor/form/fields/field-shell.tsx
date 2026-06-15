'use client';

import { type ReactNode, useEffect, useMemo, useRef } from 'react';

import type { FieldDescriptorAdmin } from '../../../descriptors/types';
import { useField, useForm, useFormFields } from '../hooks';
import { useFormLocale } from '../locale';
import { readLocaleSlot, writeLocaleSlot } from '../locale-bucket';
import { reduceFieldsToValues } from '../state';

/**
 * Shared control class for the native leaf widgets — a single source so every
 * scalar field renders with the same border, padding, and focus ring. Mirrors
 * the native styling already used by the editor's `BareLocaleSwitcher`, so the
 * widgets sit consistently inside the admin shell without importing it.
 */
export const fieldControlClassName =
    'w-full rounded-md border-2 border-border bg-background px-3 py-2 text-foreground text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50';

/**
 * Props for {@link FieldShell}.
 */
export type FieldShellProps = {
    /** The control's `id`; the shell's `<label htmlFor>` and `data-testid` derive from it. */
    htmlFor: string;
    /** Human-readable field label. Omitted renders no label. */
    label?: string;
    /** When `true`, renders the required marker beside the label. */
    required?: boolean;
    /** Validation message to surface beneath the control; omitted renders no error. */
    errorMessage?: string;
    /** The field control itself. */
    children: ReactNode;
};

/**
 * Presentational chrome shared by every leaf widget — label, required marker,
 * the control, and a validation message. Pure markup with no field-state
 * coupling, so it composes under any widget without pulling form context in.
 *
 * @param props - {@link FieldShellProps}.
 * @returns The labeled field wrapper.
 */
export function FieldShell({ htmlFor, label, required, errorMessage, children }: FieldShellProps) {
    return (
        <div data-testid={`field-${htmlFor}`} className="flex min-w-0 flex-col gap-1.5">
            {label ? (
                <label
                    htmlFor={htmlFor}
                    className="font-semibold text-muted-foreground text-xs uppercase tracking-wide"
                >
                    {label}
                    {required ? (
                        <span aria-hidden="true" className="ml-1 text-primary">
                            *
                        </span>
                    ) : null}
                </label>
            ) : null}
            {children}
            {errorMessage ? (
                <p role="alert" className="font-medium text-destructive text-xs">
                    {errorMessage}
                </p>
            ) : null}
        </div>
    );
}

/**
 * Resolve the data scope a field's `condition` is evaluated against — the
 * object holding the field's immediate siblings. A top-level field's siblings
 * are the document root; a nested field's siblings are its enclosing
 * group/array-row object. Returns an empty object when the parent scope is not
 * an object (e.g. a path into data that has not been populated yet).
 *
 * @param data - The full document values, unflattened from form state.
 * @param path - The field's dotted path within the document.
 * @returns The parent-scope object containing the field's siblings.
 */
function getSiblingData(data: Record<string, unknown>, path: string): Record<string, unknown> {
    const segments = path.split('.');
    if (segments.length <= 1) return data;

    let cursor: Record<string, unknown> = data;
    for (let i = 0; i < segments.length - 1; i++) {
        const segment = segments[i];
        if (segment === undefined) return {};
        const next = cursor[segment];
        if (next === null || typeof next !== 'object') return {};
        cursor = next as Record<string, unknown>;
    }
    return cursor;
}

/**
 * The slice {@link useEditorField} returns to a leaf widget.
 */
export type UseEditorFieldResult<T> = {
    /** The field's live value. */
    value: T | undefined;
    /** Set the field's value through the form reducer. */
    setValue: (value: T) => void;
    /** Whether the descriptor's `condition` currently shows the field. */
    visible: boolean;
    /** Validation message to display — present only while the field is invalid. */
    error: string | undefined;
};

/**
 * Bind a leaf widget to its form-state entry and apply its descriptor
 * `condition`. Extends {@link useField} with the editor-visibility rule every
 * scalar widget shares: a field whose `condition` returns `false` is hidden AND
 * pruned from form state, so it leaves the serialized `_payload` blob — matching
 * the server-side strip Payload performed in `buildFormState`. When the
 * condition flips back to `true`, the field is restored with the value it held
 * before it was hidden.
 *
 * Localized leaves (descriptor `localized: true` under a mounted
 * `FormLocaleProvider`) bind through the locale-bucket projection: the leaf
 * stores the WHOLE per-locale bucket while the widget reads and writes only the
 * active locale's slot, so editing locale B leaves locale A's slot byte-for-byte
 * intact (CMSGATE-01). Prune/restore operates on the RAW leaf so a hidden
 * localized field reappears with every locale's slot, not just the active one.
 *
 * @param field - The descriptor, read for its `admin.condition` hook and `localized` flag.
 * @param path - The field's dotted form-state path.
 * @returns The field value, setter, visibility, and validation message.
 * @throws {MissingContextProviderError} When used outside a `<Form>`.
 */
export function useEditorField<T>(
    field: { admin?: FieldDescriptorAdmin; localized?: boolean },
    path: string,
): UseEditorFieldResult<T> {
    const { value: rawValue, setValue: setRawValue, valid, errorMessage } = useField<unknown>({ path });
    const { dispatchFields } = useForm();
    const state = useFormFields(([fields]) => fields);
    const formLocale = useFormLocale();
    const localized = field.localized === true && formLocale !== null;

    const condition = field.admin?.condition;
    const visible = useMemo(() => {
        if (!condition) return true;
        const data = reduceFieldsToValues(state);
        return condition(data, getSiblingData(data, path));
    }, [condition, state, path]);

    // Remember the last RAW value seen while visible so a field that reappears
    // can be restored to what the user had typed before its condition hid it
    // (for a localized leaf the raw value is the whole bucket — restoring the
    // projection would drop the other locales' slots). Skip the capture while
    // pruned: the field is absent from state then, so `rawValue` reads
    // `undefined` and would clobber the value we need to restore.
    const pruned = useRef(false);
    const lastVisibleValue = useRef<unknown>(rawValue);
    if (visible && !pruned.current) lastVisibleValue.current = rawValue;

    // Keep form state in sync with visibility on every state change, not just
    // when `visible` flips: `<Form>` re-seeds the full `initialState` under the
    // InitialStateGate, which would otherwise re-introduce a field this
    // condition has hidden. Only conditional fields run this; an unconditional
    // field is always present and never pruned.
    useEffect(() => {
        if (!condition) return;
        const present = path in state;
        if (!visible) {
            if (present) dispatchFields({ type: 'REMOVE', path });
            pruned.current = true;
            return;
        }
        if (pruned.current && !present) {
            dispatchFields({ type: 'UPDATE', path, value: lastVisibleValue.current });
        }
        pruned.current = false;
    }, [condition, visible, state, path, dispatchFields]);

    const value =
        localized && formLocale
            ? readLocaleSlot<T>(rawValue, formLocale.locale, formLocale.defaultLocale)
            : (rawValue as T | undefined);
    const setValue =
        localized && formLocale
            ? (next: T) => setRawValue(writeLocaleSlot(rawValue, formLocale.locale, next, formLocale.defaultLocale))
            : setRawValue;

    return { value, setValue, visible, error: valid ? undefined : errorMessage };
}
