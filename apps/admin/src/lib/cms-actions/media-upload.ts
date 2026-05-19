'use server';

import 'server-only';

import { revalidatePath } from 'next/cache';
import { notFound } from 'next/navigation';
import { getAuthedPayloadCtx } from '@/lib/payload-ctx';

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
