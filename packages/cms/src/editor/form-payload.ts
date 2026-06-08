import { MalformedFormPayloadError } from '@nordcom/commerce-errors';
import type { Field } from 'payload';

/**
 * Parse Payload's `<Form action>` JSON blob. The whole client form state is
 * stringified into a single FormData key named `_payload`.
 *
 * Returns `{}` when the key is missing (autosave fires before any field
 * mounts can produce one — treating that as a no-op write is correct).
 * Throws on malformed JSON so we don't silently overwrite a real doc with `{}`.
 *
 * @param formData - The `FormData` submitted by a Payload form action; must contain a `_payload` key when a field has mounted.
 * @returns Parsed field values as a plain object, or `{}` when `_payload` is absent.
 * @throws {MalformedFormPayloadError} When `_payload` is present but not valid JSON.
 * @example
 * ```ts
 * export async function saveAction(formData: FormData) {
 *   'use server';
 *   const values = parseFormPayload(formData);
 *   await payload.update({ collection: 'pages', id, data: values });
 * }
 * ```
 */
export const parseFormPayload = (formData: FormData): Record<string, unknown> => {
    const raw = formData.get('_payload');
    if (!raw || typeof raw !== 'string') return {};
    try {
        return JSON.parse(raw) as Record<string, unknown>;
    } catch (err) {
        throw new MalformedFormPayloadError(err);
    }
};

/**
 * Extracts the `name` property from a Payload field descriptor.
 * Returns `null` for anonymous field types (e.g. `row`, `collapsible`) that
 * carry no name key.
 *
 * @param f - Payload field config.
 * @returns The field's name string, or `null` when absent.
 */
const fieldName = (f: Field): string | null => {
    const name = (f as { name?: string }).name;
    return typeof name === 'string' ? name : null;
};

/**
 * Drop any top-level key not declared as a named field on the collection.
 * Nested scrubbing (inside groups, arrays, blocks) is the Payload validator's
 * job — this only catches `{ tenant: 'forge' }`-style attacks from clients.
 *
 * @param values - Parsed form payload from {@link parseFormPayload}; may contain attacker-injected keys like `tenant`.
 * @param fields - The collection's top-level Payload field descriptors used to build the allowed-key set.
 * @returns A new object containing only the keys that correspond to named fields in `fields`.
 * @example
 * ```ts
 * const values = parseFormPayload(formData);
 * const safe = pickByFieldNames(values, manifest.fields);
 * await payload.update({ collection: 'pages', id, data: safe });
 * ```
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

/**
 * Serialize a nested field-value object into the `_payload` `FormData` blob the
 * editor's draft/publish server actions parse with {@link parseFormPayload} —
 * the exact inverse of that parse step. Runs {@link pickByFieldNames} first, so
 * any key not declared on the collection descriptor is dropped BEFORE the blob
 * is built. The autosave loop posts through here, which is why an attacker key
 * injected into the client form state never reaches the round-trip.
 *
 * @param values - Nested field values (e.g. `useForm().getData()`); may carry attacker-injected top-level keys.
 * @param fields - The collection's top-level Payload field descriptors used to build the allowed-key set.
 * @returns A `FormData` whose single `_payload` key holds the sanitized JSON blob.
 * @example
 * ```ts
 * const formData = serializeFormPayload(getData(), manifest.fields);
 * await saveDraftAction(domain, id, formData, locale);
 * ```
 */
export const serializeFormPayload = (values: Record<string, unknown>, fields: readonly Field[]): FormData => {
    const safe = pickByFieldNames(values, fields);
    const formData = new FormData();
    formData.set('_payload', JSON.stringify(safe));
    return formData;
};
