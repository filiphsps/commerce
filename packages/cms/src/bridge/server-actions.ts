import 'server-only';

import type { Field } from 'payload';

export const parseFormPayload = (formData: FormData): Record<string, unknown> => {
    const raw = formData.get('_payload');
    if (!raw || typeof raw !== 'string') return {};
    try {
        return JSON.parse(raw) as Record<string, unknown>;
    } catch (err) {
        throw new Error(`[bridge] malformed _payload: ${(err as Error).message}`);
    }
};

const fieldName = (f: Field): string | null => {
    const name = (f as { name?: string }).name;
    return typeof name === 'string' ? name : null;
};

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
