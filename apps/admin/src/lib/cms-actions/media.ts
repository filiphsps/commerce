'use server';

import 'server-only';

import { revalidatePath } from 'next/cache';
import { notFound, redirect } from 'next/navigation';
import type { Route } from 'next';
import type { Media } from '@nordcom/commerce-cms/types';
import { getAuthedPayloadCtx } from '@/lib/payload-ctx';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Subset of the media collection fields that the edit form can supply.
 *
 * The `Pick` is intentional — uploading a new file goes through Payload's REST
 * endpoint directly. This action only covers in-place metadata edits (`alt`,
 * `caption`). Adding a field here without it existing on the collection will
 * break at compile time; removing one will silently drop user input but won't
 * corrupt data.
 *
 * No `_status` — the media collection has no `versions:` config.
 * No `file` — binary uploads go via `/api/media` (Payload's REST endpoint).
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
export function parseMediaFormData(formData: FormData): Partial<MediaInput> {
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
 * Updates `alt` and/or `caption` for an existing media doc.
 *
 * Admin-only at the route level (gated by `(admin)/layout.tsx`) and at the
 * action level (explicit role check + `overrideAccess: false`).
 *
 * Does NOT accept a new file — binary re-uploads must go via Payload's REST
 * endpoint at `/api/media/<id>`. This action is limited to metadata only.
 */
export async function updateMediaAction(id: string, formData: FormData): Promise<void> {
    const { payload, user } = await getAuthedPayloadCtx();

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

    revalidatePath('/media/');
    revalidatePath(`/media/${id}/`);
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
export async function deleteMediaAction(id: string, _formData?: FormData): Promise<void> {
    const { payload, user } = await getAuthedPayloadCtx();

    if (user.role !== 'admin') {
        notFound();
    }

    await payload.delete({
        collection: 'media',
        id,
        user,
        overrideAccess: false,
    });

    revalidatePath('/media/');
    redirect('/media/' as Route);
}
