'use client';

import { MissingContextProviderError } from '@nordcom/commerce-errors';
import { type Dispatch, useCallback, useContext, useMemo } from 'react';
import { FieldsContext, FormContext, type FormContextValue } from './context';
import { isFormModified } from './state';
import type { FormAction, FormState } from './types';

/**
 * Read the field-level context or throw when used outside a `<Form>`.
 *
 * @param hookName - Calling hook name, embedded in the thrown error.
 * @returns The field context value.
 * @throws {MissingContextProviderError} When no `<Form>` ancestor is present.
 */
function useFieldsContext(hookName: string) {
    const ctx = useContext(FieldsContext);
    if (!ctx) throw new MissingContextProviderError(hookName, 'Form');
    return ctx;
}

/**
 * Read the form-level context or throw when used outside a `<Form>`.
 *
 * @param hookName - Calling hook name, embedded in the thrown error.
 * @returns The form context value.
 * @throws {MissingContextProviderError} When no `<Form>` ancestor is present.
 */
function useFormContext(hookName: string): FormContextValue {
    const ctx = useContext(FormContext);
    if (!ctx) throw new MissingContextProviderError(hookName, 'Form');
    return ctx;
}

/**
 * The contract {@link useField} returns — the slice editor field widgets read.
 * Covers Payload's `useField` `value`/`setValue` plus validity; the
 * submit-gated `showError` flag and the per-field `validate` hook are deferred
 * to CMSFORM-02..06.
 */
export type UseFieldResult<T = unknown> = {
    /** The field's live value. */
    value: T | undefined;
    /** The server baseline value. */
    initialValue: T | undefined;
    /** Set the field's value, marking it dirty when it diverges from `initialValue`. */
    setValue: (value: T) => void;
    /** Whether the field currently passes validation. */
    valid: boolean;
    /** Validation message, when present. */
    errorMessage: string | undefined;
};

/**
 * Subscribe to a single field by dotted path and get a setter. The core slice
 * of Payload's `useField` — value subscription + `setValue`; the `showError`
 * flag and `validate` hook arrive in CMSFORM-02..06.
 *
 * @param args.path - Dotted field path, e.g. `seo.title`.
 * @returns The field's value, initial value, validity, and a `setValue` setter.
 * @throws {MissingContextProviderError} When used outside a `<Form>`.
 */
export function useField<T = unknown>({ path }: { path: string }): UseFieldResult<T> {
    const { fields, dispatch } = useFieldsContext('useField');
    const field = fields[path];

    const setValue = useCallback((value: T) => dispatch({ type: 'UPDATE', path, value }), [dispatch, path]);

    return {
        value: field?.value as T | undefined,
        initialValue: field?.initialValue as T | undefined,
        setValue,
        valid: field?.valid !== false,
        errorMessage: field?.errorMessage,
    };
}

/**
 * Return the live field map and its dispatch as a tuple. The core of Payload's
 * `useAllFormFields`.
 *
 * @returns A `[fields, dispatch]` tuple.
 * @throws {MissingContextProviderError} When used outside a `<Form>`.
 */
export function useAllFormFields(): [FormState, Dispatch<FormAction>] {
    const { fields, dispatch } = useFieldsContext('useAllFormFields');
    return [fields, dispatch];
}

/**
 * Select a derived slice of the form state. The core of Payload's
 * `useFormFields`; the selector receives the same `[fields, dispatch]` tuple
 * Payload passes.
 *
 * @param selector - Maps `[fields, dispatch]` to the value the caller needs.
 * @returns The selected value.
 * @throws {MissingContextProviderError} When used outside a `<Form>`.
 */
export function useFormFields<T>(selector: (state: [FormState, Dispatch<FormAction>]) => T): T {
    const { fields, dispatch } = useFieldsContext('useFormFields');
    return selector([fields, dispatch]);
}

/**
 * Whether the form has any in-flight edit. The core of Payload's
 * `useFormModified`.
 *
 * @returns `true` when at least one field is dirty.
 * @throws {MissingContextProviderError} When used outside a `<Form>`.
 */
export function useFormModified(): boolean {
    const { fields } = useFieldsContext('useFormModified');
    return useMemo(() => isFormModified(fields), [fields]);
}

/**
 * Access form-level helpers — `createFormData`, `getData`, `getField`,
 * `submit` — plus `dispatchFields`. The core of Payload's `useForm`; the
 * `setModified` setter and the array-row helpers land in CMSFORM-02..06.
 *
 * Reads only the stable {@link FormContext}, so consumers (save button,
 * autosave) do not re-render on every keystroke — `dispatch` is exposed there
 * precisely because `useReducer`'s dispatch is React-stable.
 *
 * @returns The form helper bundle.
 * @throws {MissingContextProviderError} When used outside a `<Form>`.
 */
export function useForm(): FormContextValue & { dispatchFields: Dispatch<FormAction> } {
    const form = useFormContext('useForm');
    return { ...form, dispatchFields: form.dispatch };
}
