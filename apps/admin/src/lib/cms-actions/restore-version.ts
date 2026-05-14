'use server';

import 'server-only';

import type { Route } from 'next';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { getAuthedPayloadCtx } from '@/lib/payload-ctx';

/**
 * Generic restore-version action shared across collections.
 *
 * Restores a Payload version document (identified by `versionId`) back to
 * its source collection doc. The version-doc must belong to the resolved
 * tenant (Payload's access predicate enforces this against the forwarded
 * `user`; we don't add a redundant pre-check).
 *
 * After restore, revalidates **both** the edit route (so a user navigating
 * back to the form sees fresh state) and the versions list (so the row that
 * was just restored now shows as "Current"). The collection's `afterChange`
 * hooks will invalidate the storefront cache for any published transitions.
 *
 * Finally, `redirect()` to the versions list. The user is most likely
 * sitting there when they clicked Restore — without an explicit navigation,
 * Next 16's default `<form action>` behaviour is "stay on the current URL
 * and re-render", which provides no transition feedback even after the
 * revalidations land. Redirecting forces a hard navigation so the user sees
 * the updated list. `redirect()` throws an internal Next signal, so it MUST
 * be the last statement in this function — placing revalidations after it
 * would silently no-op.
 *
 * Trailing `_formData` parameter exists solely so the bound action passed to
 * `<form action={restoreThis}>` matches Next's expected signature
 * `(formData: FormData) => void | Promise<void>`. We don't read it — every
 * input is captured through the positional bind. We deliberately do NOT
 * expose an "override" param: the page binds all positional args and any
 * trailing optional `string` would conflict with the FormData passed by
 * `<form action>` (TS would reject the bound function shape).
 *
 * @param domain Tenant domain — used by getAuthedPayloadCtx to resolve ctx.
 * @param collection Slug of the collection holding the doc (e.g. 'businessData').
 * @param versionId Id of the version doc returned by payload.findVersions.
 * @param _formData Ignored. Present so `<form action={bound}>` type-checks.
 */
export async function restoreVersionAction(
    domain: string,
    collection: string,
    versionId: string,
    _formData?: FormData,
): Promise<void> {
    const { payload, user } = await getAuthedPayloadCtx(domain);
    await payload.restoreVersion({
        collection: collection as never, // Payload's strict typegen narrows to the union of registered collections; the caller is responsible for passing a valid slug
        id: versionId,
        user,
        overrideAccess: false,
    });

    // Edit route — for users navigating back to the form.
    revalidatePath(`/${domain}/content/${collection}/`);
    // Versions list — the caller is most likely sitting here.
    revalidatePath(`/${domain}/content/${collection}/versions/`);

    // Navigate to the versions list so the "Restore" button feedback is visible.
    // MUST be the last statement — `redirect()` throws NEXT_REDIRECT internally.
    redirect(`/${domain}/content/${collection}/versions/` as Route);
}
