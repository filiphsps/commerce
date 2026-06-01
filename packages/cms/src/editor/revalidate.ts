import { MissingTenantForScopedCollectionError } from '@nordcom/commerce-errors';
import type { Where } from 'payload';

import type { CollectionEditorManifest } from './manifest';

/**
 * Build the `where` clause for a single-doc lookup.
 *
 * - `scoped`: AND of tenant + keyField equality
 * - `tenant-singleton`: tenant equality only — one doc per tenant, the plugin's
 *   unique index guarantees at most one match so no id/keyField is needed
 * - `singleton-by-domain`: OR of `domain` and `alternativeDomains` contains
 *   (matches `Shop.findByDomain`'s semantics so the shop edit URL works for
 *   both the canonical domain and any alt domain)
 * - `shared`: keyField equality only (cross-tenant collections not scoped by shop)
 *
 * @param manifest - Editor manifest describing the collection's tenant scoping strategy.
 * @param tenant - Resolved tenant document for the current request, or `null` on cross-tenant routes.
 * @param id - Document id or `keyField` value to look up.
 * @returns A Payload `Where` clause ready for `payload.find()`.
 * @throws {MissingTenantForScopedCollectionError} When `tenant` is `null` for a `scoped` or `tenant-singleton` collection.
 *
 * @example
 * const where = tenantWhere(pagesEditor, { id: 'tenant-1' }, '507f1f77bcf86cd799439011');
 * const { docs } = await payload.find({ collection: 'pages', where, depth: 0 });
 */
export const tenantWhere = (manifest: CollectionEditorManifest, tenant: { id: string } | null, id: string): Where => {
    const keyField = manifest.routes.keyField ?? 'id';
    switch (manifest.tenant.kind) {
        case 'scoped':
            if (!tenant) {
                throw new MissingTenantForScopedCollectionError(manifest.collection);
            }
            return {
                and: [{ tenant: { equals: tenant.id } }, { [keyField]: { equals: id } }],
            };
        case 'tenant-singleton':
            if (!tenant) {
                throw new MissingTenantForScopedCollectionError(manifest.collection);
            }
            return { tenant: { equals: tenant.id } };
        case 'singleton-by-domain':
            return {
                or: [{ domain: { equals: id } }, { alternativeDomains: { contains: id } }],
            };
        case 'shared':
            return { [keyField]: { equals: id } };
    }
};

/**
 * Arguments for {@link revalidateForManifest}. Accepts an injected
 * `revalidatePath` so the helper is callable from tests without importing
 * `next/cache`.
 *
 * @example
 * revalidateForManifest({ manifest: pagesEditor, domain: 'beta.test', doc, status: 'published', revalidatePath });
 */
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
 *
 * @param args - See {@link RevalidateForManifestArgs}.
 *
 * @example
 * revalidateForManifest({ manifest: pagesEditor, domain, doc, status: 'published', revalidatePath });
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
