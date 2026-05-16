'use server';

import 'server-only';

import type { Media } from '@nordcom/commerce-cms/types';
import type { Route } from 'next';
import { revalidatePath } from 'next/cache';
import { notFound, redirect } from 'next/navigation';
import { getAuthedPayloadCtx } from '@/lib/payload-ctx';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Subset of the media collection fields that the edit form can supply.
 *
 * The `Pick` is intentional — adding a field here without it existing on the
 * collection will break at compile time; removing one will silently drop user
 * input but won't corrupt data.
 *
 * No `_status` — the media collection has no `versions:` config.
 * Binary uploads are handled separately by `createMediaAction` which extracts
 * the `File` from FormData and passes it to `payload.create({ file })`. We do
 * NOT use Payload's REST `/api/media` endpoint because the admin app has no
 * Payload auth strategy wired up (auth is NextAuth-only via `getAuthedPayloadCtx`),
 * so REST requests are unauthenticated and `tenantScopedWrite` returns 403.
 */
type MediaInput = Pick<Media, 'alt' | 'caption'>;

// ---------------------------------------------------------------------------
// FormData parsing
// ---------------------------------------------------------------------------

/**
 * Parse raw FormData fields from the hand-rolled media edit form.
 *
 * The media edit form is NOT Payload's `<Form>` component — it's a plain
 * HTML form with two text inputs. There is no `_payload` JSON blob. Parse
 * directly from named fields.
 *
 * Returns `undefined` for a field when the corresponding FormData entry is
 * absent or empty, so `payload.update` only touches keys that were actually
 * submitted.
 */
function parseMediaFormData(formData: FormData): Partial<MediaInput> {
    const alt = formData.get('alt')?.toString();
    const caption = formData.get('caption')?.toString();

    return {
        // `alt` is required on the collection, but we still allow `undefined`
        // here so a missing key doesn't overwrite an existing value with an
        // empty string. Payload validates `required` fields server-side.
        alt: alt || undefined,
        caption: caption || undefined,
    };
}

// ---------------------------------------------------------------------------
// Exported server actions
// ---------------------------------------------------------------------------

/**
 * Creates a new media doc from an uploaded file and returns its id.
 *
 * Replaces the prior client-side `fetch('/api/media', { method: 'POST' })`
 * pattern: the admin app has no Payload auth strategy mounted (we run
 * NextAuth and bridge to Payload via `getAuthedPayloadCtx`), so a REST POST
 * arrives at Payload's `/api/media` with `req.user` undefined and
 * `tenantScopedWrite` rejects it with `403 You are not allowed to perform
 * this action.`
 *
 * Going through the local API with the resolved user + explicit tenant
 * avoids the unauthenticated-REST hole entirely while preserving the
 * existing admin-only access predicate at the action boundary.
 *
 * Admin-only at both the route level and the action level.
 */
export async function createMediaAction(domain: string, formData: FormData): Promise<{ id: string }> {
    const { payload, user, tenant } = await getAuthedPayloadCtx(domain);

    if (user.role !== 'admin') {
        notFound();
    }
    if (!tenant) {
        // Media is tenant-scoped via `@payloadcms/plugin-multi-tenant`. A
        // missing tenant context means the operator is on a route that
        // never resolved one — refuse rather than silently writing a doc
        // with no tenant association (which would then fail tenantScopedRead
        // for everyone but admins).
        notFound();
    }

    const fileEntry = formData.get('file');
    if (!(fileEntry instanceof File)) {
        throw new Error('No file provided.');
    }
    if (fileEntry.size === 0) {
        throw new Error('Uploaded file is empty.');
    }

    const alt = formData.get('alt')?.toString();
    const caption = formData.get('caption')?.toString();

    if (!alt) {
        // `alt` is required on the collection. Surface the validation error
        // here so the operator gets a clear message instead of a generic
        // Payload validation failure thrown from inside `payload.create`.
        throw new Error('Alt text is required.');
    }

    // Browser `File` → Payload `File` shape. Payload's local API expects a
    // Node-style `{ data: Buffer; mimetype; name; size }` rather than the
    // streaming WHATWG `File` we get from FormData. The buffer is read fully
    // into memory — acceptable because the upload form caps mime types to
    // images / mp4 / pdf and the route is admin-only.
    const buffer = Buffer.from(await fileEntry.arrayBuffer());
    const payloadFile = {
        data: buffer,
        mimetype: fileEntry.type,
        name: fileEntry.name,
        size: fileEntry.size,
    };

    const created = await payload.create({
        collection: 'media',
        file: payloadFile,
        // Explicit tenant — the multi-tenant plugin populates this from the
        // request when an auth strategy is mounted, but we are calling the
        // local API directly so we have to set it ourselves.
        data: { alt, caption: caption || undefined, tenant: tenant.id } as never,
        user,
        overrideAccess: false,
    });

    revalidatePath(`/${domain}/settings/media/`);
    return { id: String(created.id) };
}

/**
 * Updates `alt` and/or `caption` for an existing media doc.
 *
 * Admin-only at the route level and at the action level (explicit role check
 * + `overrideAccess: false`).
 *
 * Does NOT accept a new file — binary re-uploads must go via Payload's REST
 * endpoint at `/api/media/<id>`. This action is limited to metadata only.
 */
export async function updateMediaAction(domain: string, id: string, formData: FormData): Promise<void> {
    const { payload, user } = await getAuthedPayloadCtx(domain);

    if (user.role !== 'admin') {
        notFound();
    }

    const data = parseMediaFormData(formData);

    await payload.update({
        collection: 'media',
        id,
        data: data as never,
        user,
        overrideAccess: false,
    });

    revalidatePath(`/${domain}/settings/media/`);
    revalidatePath(`/${domain}/settings/media/${id}/`);
}

/**
 * Deletes a media doc and its associated file by id.
 *
 * Admin-only. Payload's upload pipeline removes the original file and all
 * generated image sizes from disk/blob storage on delete.
 *
 * Redirects to the grid after deletion — the `_formData` parameter is present
 * solely to satisfy the `<form action={bound}>` call signature (Next.js passes
 * FormData as the first argument of a bound action invoked via a form). The
 * type marker follows the pattern used in `restoreVersionAction`.
 */
export async function deleteMediaAction(domain: string, id: string, _formData?: FormData): Promise<void> {
    const { payload, user } = await getAuthedPayloadCtx(domain);

    if (user.role !== 'admin') {
        notFound();
    }

    await payload.delete({
        collection: 'media',
        id,
        user,
        overrideAccess: false,
    });

    revalidatePath(`/${domain}/settings/media/`);
    redirect(`/${domain}/settings/media/` as Route);
}
