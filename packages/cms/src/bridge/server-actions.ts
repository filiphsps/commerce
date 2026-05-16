import 'server-only';

import type { Field } from 'payload';
import type { BridgeAccessCtx, BridgeManifest } from './manifest';

export const parseFormPayload = (formData: FormData): Record<string, unknown> => {
    const raw = formData.get('_payload');
    if (!raw || typeof raw !== 'string') return {};
    try {
        return JSON.parse(raw) as Record<string, unknown>;
    } catch (err) {
        throw new Error(`[bridge] malformed _payload`, { cause: err });
    }
};

const fieldName = (f: Field): string | null => {
    const name = (f as { name?: string }).name;
    return typeof name === 'string' ? name : null;
};

/**
 * Top-level allowlist. Drops any key not declared as a named field on the
 * manifest. Group/array/blocks payloads pass through unchanged — nested
 * scrubbing is the adapter's / Mongoose validator's job.
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

export type BridgeCtxResolver = (domain: string) => Promise<BridgeAccessCtx>;

export type BridgeServerActions = {
    updateAction: (domain: string, id: string, formData: FormData) => Promise<void>;
    deleteAction: (domain: string, id: string) => Promise<void>;
    createAction: (domain: string, formData: FormData) => Promise<{ id: string }>;
};

class AccessDeniedError extends Error {
    constructor(slug: string, op: string) {
        super(`[bridge] access denied: ${slug}.${op}`);
        this.name = 'AccessDeniedError';
    }
}

export const createBridgeServerActions = <TDoc>(
    manifest: BridgeManifest<TDoc>,
    getCtx: BridgeCtxResolver,
): BridgeServerActions => ({
    async updateAction(domain, id, formData) {
        const ctx = await getCtx(domain);
        if (!(await manifest.access.update(ctx))) throw new AccessDeniedError(manifest.slug, 'update');
        const raw = parseFormPayload(formData);
        const allowed = pickByFieldNames(raw, manifest.fields);
        const projected = manifest.fromFormValues ? manifest.fromFormValues(allowed) : (allowed as Partial<TDoc>);
        await manifest.adapter.update(id, projected);
    },
    async deleteAction(domain, id) {
        const ctx = await getCtx(domain);
        const deleteAccess = manifest.access.delete;
        if (!deleteAccess) throw new Error(`[bridge] delete not configured on manifest "${manifest.slug}"`);
        if (!(await deleteAccess(ctx))) throw new AccessDeniedError(manifest.slug, 'delete');
        if (!manifest.adapter.delete) throw new Error(`[bridge] adapter.delete missing on manifest "${manifest.slug}"`);
        await manifest.adapter.delete(id);
    },
    async createAction(domain, formData) {
        const ctx = await getCtx(domain);
        const createAccess = manifest.access.create;
        if (!createAccess) throw new Error(`[bridge] create not configured on manifest "${manifest.slug}"`);
        if (!(await createAccess(ctx))) throw new AccessDeniedError(manifest.slug, 'create');
        if (!manifest.adapter.create) throw new Error(`[bridge] adapter.create missing on manifest "${manifest.slug}"`);
        const raw = parseFormPayload(formData);
        const allowed = pickByFieldNames(raw, manifest.fields);
        const projected = manifest.fromFormValues ? manifest.fromFormValues(allowed) : (allowed as Partial<TDoc>);
        const created = await manifest.adapter.create(projected);
        const idValue = (created as { id?: string; _id?: string }).id ?? (created as { _id?: string })._id;
        if (!idValue) throw new Error(`[bridge] adapter.create returned no id`);
        return { id: String(idValue) };
    },
});
