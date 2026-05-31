'use client';

import { createContext, type Dispatch } from 'react';
import type { FormAction, FormState } from './types';

/**
 * Field-level context: the live {@link FormState} map plus the dispatch used to
 * mutate it. Split from {@link FormContext} so field hooks subscribe to value
 * changes while form-level helpers stay reference-stable.
 */
export type FieldsContextValue = {
    /** The live form state, keyed by dotted path. */
    fields: FormState;
    /** Dispatch into the form reducer. */
    dispatch: Dispatch<FormAction>;
};

/**
 * Form-level context: reference-stable helpers that read the latest field
 * state through a ref, so timers (autosave) and submit handlers never close
 * over a stale snapshot. `dispatch` is carried here (not only on the volatile
 * {@link FieldsContext}) because `useReducer`'s dispatch is React-stable — so
 * form-level consumers (save button, autosave) can hold a setter via `useForm`
 * without subscribing to per-keystroke field changes.
 */
export type FormContextValue = {
    /**
     * Serialize the current field state into a `FormData` whose `_payload` key
     * holds the nested JSON blob — the shape server actions parse via
     * `parseFormPayload`.
     *
     * @param overrides - Extra top-level values merged over the serialized data.
     */
    createFormData: (overrides?: Record<string, unknown>) => Promise<FormData>;
    /** Snapshot the current values as the nested object posted under `_payload`. */
    getData: () => Record<string, unknown>;
    /** Read a single field's state by dotted path. */
    getField: (path: string) => FormState[string] | undefined;
    /** Programmatically submit the form through its bound action. */
    submit: () => Promise<void>;
    /** React-stable dispatch into the form reducer. */
    dispatch: Dispatch<FormAction>;
};

export const FieldsContext = createContext<FieldsContextValue | null>(null);
export const FormContext = createContext<FormContextValue | null>(null);
