'use server';

import 'server-only';

import { revalidatePath } from 'next/cache';
import { getAuthedPayloadCtx } from '@/lib/payload-ctx';

/**
 * Generic restore-version action shared across collections.
 *
 * Restores a Payload version document (identified by `versionId`) back to
 * its source collection doc. The version-doc must belong to the resolved
 * tenant (Payload's access predicate enforces this against the forwarded
 * `user`; we don't add a redundant pre-check).
 *
 * After restore, revalidates the admin edit route so the form re-reads
 * the now-current state. The collection's `afterChange` hooks will
 * invalidate the storefront cache for any published transitions.
 *
 * @param domain Tenant domain — used by getAuthedPayloadCtx to resolve ctx.
 * @param collection Slug of the collection holding the doc (e.g. 'businessData').
 * @param versionId Id of the version doc returned by payload.findVersions.
 * @param redirectPath Path to revalidate after restore (defaults to the
 *                     collection's edit route).
 */
export async function restoreVersionAction(
    domain: string,
    collection: string,
    versionId: string,
    redirectPath?: string,
): Promise<void> {
    const { payload, user } = await getAuthedPayloadCtx(domain);
    await payload.restoreVersion({
        collection: collection as never, // Payload's strict typegen narrows to the union of registered collections; the caller is responsible for passing a valid slug
        id: versionId,
        user,
        overrideAccess: false,
    });
    revalidatePath(redirectPath ?? `/${domain}/content/${collection}/`);
}
