import type { Where } from 'payload';
import type { CollectionEditorManifest } from './manifest';

/**
 * Build the `where` clause for a single-doc lookup.
 *
 * - `scoped`: AND of tenant + keyField equality
 * - `singleton-by-domain`: OR of `domain` and `alternativeDomains` contains
 *   (matches `Shop.findByDomain`'s semantics so the shop edit URL works for
 *   both the canonical domain and any alt domain)
 * - `shared`: keyField equality only (cross-tenant collections like `tenants`)
 */
export const tenantWhere = (manifest: CollectionEditorManifest, tenant: { id: string } | null, id: string): Where => {
    const keyField = manifest.routes.keyField ?? 'id';
    switch (manifest.tenant.kind) {
        case 'scoped':
            if (!tenant) {
                throw new Error(`[editor] scoped collection ${manifest.collection} requires a tenant`);
            }
            return {
                and: [{ tenant: { equals: tenant.id } }, { [keyField]: { equals: id } }],
            };
        case 'singleton-by-domain':
            return {
                or: [{ domain: { equals: id } }, { alternativeDomains: { contains: id } }],
            };
        case 'shared':
            return { [keyField]: { equals: id } };
    }
};

export type RevalidateForManifestArgs = {
    manifest: CollectionEditorManifest;
    domain: string | null;
    doc: unknown;
    status: 'draft' | 'published';
    /** Injected so the helper is pure-callable from tests without next/cache. */
    revalidatePath: (path: string) => void;
};

/**
 * Call `revalidatePath` for every path the manifest declares for this write.
 * No-op when `manifest.revalidate` is undefined.
 */
export const revalidateForManifest = ({
    manifest,
    domain,
    doc,
    status,
    revalidatePath,
}: RevalidateForManifestArgs): void => {
    const paths = manifest.revalidate?.({ domain, doc, status }) ?? [];
    for (const p of paths) revalidatePath(p);
};
