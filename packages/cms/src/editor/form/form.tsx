'use client';

import { type ReactNode, type SyntheticEvent, useCallback, useEffect, useMemo, useReducer, useRef } from 'react';
import { FieldsContext, FormContext } from './context';
import { formReducer } from './reducer';
import { reduceFieldsToValues } from './state';
import type { FormState } from './types';

/**
 * Props for {@link Form}. Mirrors the Payload `<Form>` surface the CMS
 * editor relies on — `action`, `initialState`, and `isDocumentForm`.
 */
export type FormProps = {
    /** Server action invoked on explicit submit with the serialized `FormData`. */
    action: (formData: FormData) => Promise<void> | void;
    /**
     * Server-built field state. On the first render it seeds the reducer; on
     * every subsequent reference change it is merged in under the
     * InitialStateGate (see `reducer.ts`), so dirty in-flight edits survive a
     * background refresh while clean fields adopt the server values.
     */
    initialState?: FormState;
    /**
     * Marker that this form edits a document. Carried for parity with Payload's
     * `<Form>` so document consumers can pass it through; the native core reads
     * no behavior from it yet.
     */
    isDocumentForm?: boolean;
    children: ReactNode;
};

/**
 * Build a `FormData` whose `_payload` key holds the nested JSON blob server
 * actions parse via `parseFormPayload`.
 *
 * @param state - The current field state to serialize.
 * @param overrides - Extra top-level values merged over the serialized data.
 * @returns A populated `FormData`.
 */
function buildFormData(state: FormState, overrides?: Record<string, unknown>): FormData {
    const data = { ...reduceFieldsToValues(state), ...overrides };
    const formData = new FormData();
    formData.set('_payload', JSON.stringify(data));
    return formData;
}

/**
 * Native form runtime root — the Payload `<Form>` replacement. Owns
 * the {@link FormState} via a reducer keyed by dotted path, mounts the provider
 * chain field/form hooks read, and serializes the state into the `_payload`
 * blob on submit.
 *
 * The keystroke-clobber guard lives in the reducer's `REPLACE_STATE` branch:
 * this component dispatches `REPLACE_STATE` whenever the `initialState` prop
 * reference changes, and the reducer overlays any dirty field's in-flight
 * value over the incoming server state — so a background `buildFormState`
 * refresh never overwrites what the user is typing.
 *
 * @param props.action - Server action invoked on submit with the serialized form.
 * @param props.initialState - Server-built field state; re-merged under the gate on change.
 * @param props.children - Field components rendered inside the form context.
 * @returns The form element wrapping the provider chain.
 */
export function Form({ action, initialState, children }: FormProps) {
    const [fields, dispatch] = useReducer(formReducer, initialState ?? {});

    // Latest field snapshot for reference-stable helpers (autosave timers,
    // submit) so they never close over a stale render's state.
    const fieldsRef = useRef(fields);
    fieldsRef.current = fields;

    const actionRef = useRef(action);
    actionRef.current = action;

    // A fresh server `initialState` reference re-merges under the gate. The
    // initial reference is already seeded into the reducer, so the first run is
    // a no-op (no dirty fields, identical base).
    useEffect(() => {
        if (initialState) dispatch({ type: 'REPLACE_STATE', state: initialState });
    }, [initialState]);

    const getData = useCallback(() => reduceFieldsToValues(fieldsRef.current), []);
    const getField = useCallback((path: string) => fieldsRef.current[path], []);
    const createFormData = useCallback(
        async (overrides?: Record<string, unknown>) => buildFormData(fieldsRef.current, overrides),
        [],
    );
    const submit = useCallback(async () => {
        await actionRef.current(buildFormData(fieldsRef.current));
    }, []);

    const onSubmit = useCallback(async (event: SyntheticEvent<HTMLFormElement>) => {
        event.preventDefault();
        await actionRef.current(buildFormData(fieldsRef.current));
    }, []);

    const fieldsValue = useMemo(() => ({ fields, dispatch }), [fields]);
    const formValue = useMemo(
        () => ({ createFormData, getData, getField, submit, dispatch }),
        [createFormData, getData, getField, submit],
    );

    return (
        <FormContext.Provider value={formValue}>
            <FieldsContext.Provider value={fieldsValue}>
                <form onSubmit={onSubmit}>{children}</form>
            </FieldsContext.Provider>
        </FormContext.Provider>
    );
}
