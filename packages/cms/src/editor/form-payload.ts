import type { Field } from 'payload';

/**
 * Parse Payload's `<Form action>` JSON blob. The whole client form state is
 * stringified into a single FormData key named `_payload`.
 *
 * Returns `{}` when the key is missing (autosave fires before any field
 * mounts can produce one — treating that as a no-op write is correct).
 * Throws on malformed JSON so we don't silently overwrite a real doc with `{}`.
 */
export const parseFormPayload = (formData: FormData): Record<string, unknown> => {
    const raw = formData.get('_payload');
    if (!raw || typeof raw !== 'string') return {};
    try {
        return JSON.parse(raw) as Record<string, unknown>;
    } catch (err) {
        throw new Error('[editor] malformed _payload', { cause: err });
    }
};

const fieldName = (f: Field): string | null => {
    const name = (f as { name?: string }).name;
    return typeof name === 'string' ? name : null;
};

/**
 * Drop any top-level key not declared as a named field on the collection.
 * Nested scrubbing (inside groups, arrays, blocks) is the Payload validator's
 * job — this only catches `{ tenant: 'forge' }`-style attacks from clients.
 */
export const pickByFieldNames = (
    values: Record<string, unknown>,
    fields: readonly Field[],
): Record<string, unknown> => {
    const declared = new Set<string>();
    for (const f of fields) {
        const n = fieldName(f);
        if (n) declared.add(n);
    }
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(values)) {
        if (declared.has(k)) out[k] = v;
    }
    return out;
};
