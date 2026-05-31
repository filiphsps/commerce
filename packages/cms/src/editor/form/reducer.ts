import { isFieldDirty } from './state';
import type { FormAction, FormState } from './types';

/**
 * Pure reducer for the native form runtime. Keyed by dotted field path; never
 * mutates the incoming state.
 *
 * The `REPLACE_STATE` branch carries the **InitialStateGate**: when a fresh
 * server-built state arrives (autosave → `revalidatePath` → page refresh →
 * `buildFormState`), it must NOT overwrite a field the user is actively
 * editing. The merge takes the server state as the base, then re-overlays every
 * field that is currently dirty (its `value` diverges from `initialValue`) with
 * its in-flight entry. Clean fields adopt the server values; dirty fields keep
 * the user's keystrokes. Removing this overlay re-introduces the
 * keystroke-clobber bug — the regression suite asserts the dirty value survives.
 *
 * @param state - The current form state.
 * @param action - The action to apply.
 * @returns The next form state (a new object).
 * @throws Never — unknown actions return the current state unchanged.
 */
export function formReducer(state: FormState, action: FormAction): FormState {
    switch (action.type) {
        case 'UPDATE': {
            const existing = state[action.path];
            return {
                ...state,
                [action.path]: {
                    ...existing,
                    value: action.value,
                    initialValue: existing?.initialValue,
                    valid: action.valid ?? existing?.valid,
                    errorMessage: action.errorMessage ?? existing?.errorMessage,
                },
            };
        }

        case 'REMOVE': {
            if (!(action.path in state)) return state;
            const next = { ...state };
            delete next[action.path];
            return next;
        }

        case 'REPLACE_STATE': {
            const next: FormState = { ...action.state };
            for (const [path, field] of Object.entries(state)) {
                if (isFieldDirty(field)) {
                    next[path] = field;
                }
            }
            return next;
        }

        default:
            return state;
    }
}
