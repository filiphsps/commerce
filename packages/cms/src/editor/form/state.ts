import type { FormFieldState, FormState } from './types';

/**
 * Structural equality for field values. Handles the JSON-serializable shapes
 * editor fields hold — primitives, arrays, and plain objects — so dirty
 * tracking compares nav arrays and SEO groups by content, not reference.
 *
 * @param a - First value.
 * @param b - Second value.
 * @returns `true` when the two values are structurally equal.
 */
export function deepEqual(a: unknown, b: unknown): boolean {
    if (a === b) return true;
    if (typeof a !== typeof b || a === null || b === null) return false;
    if (typeof a !== 'object') return false;

    if (Array.isArray(a) || Array.isArray(b)) {
        if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false;
        return a.every((item, index) => deepEqual(item, b[index]));
    }

    const aKeys = Object.keys(a as Record<string, unknown>);
    const bKeys = Object.keys(b as Record<string, unknown>);
    if (aKeys.length !== bKeys.length) return false;
    return aKeys.every((key) => deepEqual((a as Record<string, unknown>)[key], (b as Record<string, unknown>)[key]));
}

/**
 * Whether a field has an in-flight edit — its live `value` diverges from the
 * server-provided `initialValue`. This is the per-field signal the
 * InitialStateGate consults when merging a fresh server state.
 *
 * @param field - The field state to inspect.
 * @returns `true` when the field's value differs from its initial value.
 */
export function isFieldDirty(field: FormFieldState): boolean {
    return !deepEqual(field.value, field.initialValue);
}

/**
 * Whether any field in the form has an in-flight edit. Backs `useFormModified`
 * and the autosave/dirty-tracking gate.
 *
 * @param state - The full form state.
 * @returns `true` when at least one field is dirty.
 */
export function isFormModified(state: FormState): boolean {
    return Object.values(state).some(isFieldDirty);
}

/**
 * Set a dotted-path value into a nested target, creating arrays for numeric
 * segments and objects otherwise. Mirrors the unflatten step Payload runs
 * inside `reduceFieldsToValues` before serializing the `_payload` blob.
 *
 * @param target - The root object being built.
 * @param path - Dotted path, e.g. `nav.0.label`.
 * @param value - Value to assign at the leaf.
 */
function setDeep(target: Record<string, unknown>, path: string, value: unknown): void {
    const segments = path.split('.');
    let cursor: Record<string, unknown> | unknown[] = target;

    for (let i = 0; i < segments.length; i++) {
        const segment = segments[i];
        if (segment === undefined) continue;
        const isLast = i === segments.length - 1;

        if (isLast) {
            (cursor as Record<string, unknown>)[segment] = value;
            return;
        }

        const next = segments[i + 1];
        const nextIsIndex = next !== undefined && /^\d+$/.test(next);
        const existing = (cursor as Record<string, unknown>)[segment];

        if (existing === undefined || typeof existing !== 'object' || existing === null) {
            (cursor as Record<string, unknown>)[segment] = nextIsIndex ? [] : {};
        }
        cursor = (cursor as Record<string, unknown>)[segment] as Record<string, unknown> | unknown[];
    }
}

/**
 * Whether a value is a plain data object (not an array). The flatten step
 * recurses only through these; class instances never appear in the
 * JSON-serialized documents this builder consumes.
 *
 * @param value - Candidate value.
 * @returns `true` for a non-null, non-array `object`.
 */
function isPlainObject(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Flatten one value into `state` under `path` — the recursive worker behind
 * {@link buildInitialFormState}.
 *
 * @param state - The state map being built; mutated in place.
 * @param path - Dotted path for `value`.
 * @param value - The document value at `path`.
 */
function flattenIntoState(state: FormState, path: string, value: unknown): void {
    if (isPlainObject(value) && Object.keys(value).length > 0) {
        for (const [key, child] of Object.entries(value)) {
            flattenIntoState(state, `${path}.${key}`, child);
        }
        return;
    }
    if (Array.isArray(value) && value.length > 0 && value.every(isPlainObject)) {
        value.forEach((row, index) => {
            flattenIntoState(state, `${path}.${index}`, row);
        });
        return;
    }
    state[path] = { value, initialValue: value };
}

/**
 * Build the {@link FormState} that seeds the native `<Form>` from a document's
 * serialized data — the CMSFORM-01 replacement for Payload's server-side
 * `buildFormState`, and the exact inverse of {@link reduceFieldsToValues}:
 * plain objects and arrays-of-objects recurse into dotted/indexed leaf paths
 * (the shape `useField`, the array widgets' row derivation, and the `_payload`
 * serializer all operate on), while everything else — primitives, `null`,
 * primitive lists (`hasMany` text/select values), EMPTY arrays/objects, and
 * mixed arrays — stays a single leaf so it round-trips byte-identical through
 * a save.
 *
 * Deliberately schema-blind: every key in `data` is flattened, including
 * server-managed fields (`id`, timestamps, tenant keys). Those entries are
 * inert — the editor renders only manifest-declared fields, and Convex's
 * `cms/actions.ts` pins the tenant from the trusted identity, so a smuggled
 * key in the round-tripped payload is plain content. A descriptor-driven
 * builder can replace this once the field surface is fully native (CMSDATA-07).
 *
 * @param data - The document's serialized field map (`{}` for a create form).
 * @returns The dotted-path state map, each leaf seeded with `value === initialValue`.
 */
export function buildInitialFormState(data: Record<string, unknown>): FormState {
    const state: FormState = {};
    for (const [key, value] of Object.entries(data)) {
        flattenIntoState(state, key, value);
    }
    return state;
}

/**
 * Reduce a {@link FormState} to its values and unflatten the dotted paths into
 * the nested object Payload's `<Form>` posts as the JSON `_payload` blob.
 * Fields flagged `disableFormData` are skipped — they hold no value of their
 * own (array/blocks containers).
 *
 * @param state - The form state to serialize.
 * @returns A nested plain object of field values.
 */
export function reduceFieldsToValues(state: FormState): Record<string, unknown> {
    const out: Record<string, unknown> = {};
    for (const [path, field] of Object.entries(state)) {
        if (field.disableFormData) continue;
        setDeep(out, path, field.value);
    }
    return out;
}
