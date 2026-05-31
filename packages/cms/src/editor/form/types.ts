/**
 * Native form-state core types. Replaces the slice of Payload's
 * `FormState`/`Form`/`useField` runtime the CMS editor depends on, ahead of
 * dropping Payload from the admin. The shape is a deliberate structural subset
 * of Payload's `FormState` (`{ [path]: { value, initialValue, valid, … } }`)
 * so a state map produced by Payload's server-side `buildFormState` drops into
 * this core unchanged while the editor migrates field by field.
 *
 * Pure types — no React, no third-party imports — so codegen, the form engine,
 * and tests can all consume them without pulling editor weight along.
 */

/**
 * State for a single field, keyed in {@link FormState} by its dotted path
 * (e.g. `seo.title`, `nav.items.0.label`).
 */
export type FormFieldState = {
    /** The live editor value. */
    value?: unknown;
    /** The server-provided baseline; dirty tracking compares `value` against this. */
    initialValue?: unknown;
    /** Whether the field currently passes validation. Absent is treated as valid. */
    valid?: boolean;
    /** Human-readable validation error, surfaced once the form is submitted. */
    errorMessage?: string;
    /**
     * When `true`, the field is excluded from the serialized `_payload` blob.
     * Mirrors Payload's `disableFormData` for presentational/container fields
     * (arrays/blocks) that hold no value of their own.
     */
    disableFormData?: boolean;
    /** Row metadata for array/blocks fields; carried through untouched. */
    rows?: Array<{ id?: string }>;
};

/**
 * The whole form's state, keyed by dotted field path. Index access is
 * `FormFieldState | undefined` under `noUncheckedIndexedAccess`.
 */
export type FormState = Record<string, FormFieldState>;

/**
 * Reducer actions for {@link FormState}. `REPLACE_STATE` carries the
 * InitialStateGate merge — see `reducer.ts`. The array/blocks row actions
 * `ADD_ROW` / `REMOVE_ROW` arrive in CMSFORM-02..06 alongside the row widgets.
 */
export type FormAction =
    | {
          type: 'UPDATE';
          /** Dotted path of the field to set. */
          path: string;
          /** New value. */
          value: unknown;
          /** Optional validity override. */
          valid?: boolean;
          /** Optional validation message. */
          errorMessage?: string;
      }
    | {
          type: 'REMOVE';
          /** Dotted path of the field to delete. */
          path: string;
      }
    | {
          type: 'REPLACE_STATE';
          /** Fresh server-built state to merge in under the gate. */
          state: FormState;
      };
