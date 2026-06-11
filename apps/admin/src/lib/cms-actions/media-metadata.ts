'use server';

import 'server-only';

import { MediaStorageUploadError, MissingRequiredFieldError } from '@nordcom/commerce-errors';
import { revalidatePath } from 'next/cache';
import { notFound } from 'next/navigation';

import { fulfillDerivativePlan } from '@/lib/cms-actions/media-pipeline';
import { mediaStorageTransport } from '@/lib/editor-convex-bridge';
import { getAuthedCmsCtx } from '@/lib/cms-ctx';

/**
 * Parses an optional `0..1` focal coordinate off the form payload, treating absent or non-numeric
 * values as unset (clamping is the Convex side's job — `updateMediaMetadata` degrades garbage to
 * the centered default through `clampFocal`).
 *
 * @param formData - The metadata form payload.
 * @param field - The coordinate field name (`focalX`/`focalY`).
 * @returns The parsed coordinate, or `undefined` when unset.
 */
function parseFocalCoordinate(formData: FormData, field: string): number | undefined {
    const raw = formData.get(field)?.toString();
    if (!raw) return undefined;
    const parsed = Number.parseFloat(raw);
    return Number.isFinite(parsed) ? parsed : undefined;
}

/**
 * Updates a media document's post-upload editorial metadata (alt/caption/focal) and, when the
 * focal point moved on an image, regenerates the derivative set — the POLISH-01 closing of the
 * cutover's "media is immutable post-finalize" gap. The route-level access gate mirrors
 * `createMediaAction` (admin-only, tenant resolved); the authoritative tenant scoping runs inside
 * Convex's `cms/media:updateMediaMetadata`, which re-arms the derivative plan on a focal move
 * (every `ready` row re-pended — all four frozen sizes are focal-aware crops) and reports it via
 * `rearmedDerivatives`. On that signal this action re-runs the SAME Node-side sharp pass as the
 * upload pipeline against the original's bytes (fetched from its read-time serving URL), so
 * regeneration converges on the established `(mediaId, size)` idempotency (CMSMEDIA-02). An
 * unreadable original leaves the plan `pending` — every size then serves the original's URL at
 * read time, never a broken image — so the metadata write itself is never rolled back by a
 * regeneration hiccup.
 *
 * @param domain - Tenant domain used to resolve the route-level access context (`null` on
 *   cross-tenant routes, which refuse — media is tenant-scoped).
 * @param formData - Form data carrying `mediaId` (required), `alt` (required non-empty), optional
 *   `caption` (empty clears), and optional `focalX`/`focalY`.
 * @returns Object containing the id of the updated media document.
 * @throws {MissingRequiredFieldError} When the `mediaId` or `alt` field is absent or empty.
 * @throws {MediaStorageUploadError} When a regeneration byte POST or the original-bytes fetch fails.
 */
export async function updateMediaMetadataAction(domain: string | null, formData: FormData): Promise<{ id: string }> {
    const { user, tenant } = await getAuthedCmsCtx(domain ?? undefined);

    if (user.role !== 'admin') {
        notFound();
    }
    if (!tenant) {
        // Media is tenant-scoped; a route without a resolved tenant cannot address one (same
        // refusal as the upload action).
        notFound();
    }

    const mediaId = formData.get('mediaId')?.toString();
    if (!mediaId) {
        throw new MissingRequiredFieldError('mediaId');
    }
    const alt = formData.get('alt')?.toString();
    if (!alt) {
        // `alt` is required on the media contract — same posture as the upload action.
        throw new MissingRequiredFieldError('alt');
    }
    // An emptied caption field is an explicit clear: the mutation removes the optional column.
    const caption = formData.get('caption')?.toString() || null;

    const focalX = parseFocalCoordinate(formData, 'focalX');
    const focalY = parseFocalCoordinate(formData, 'focalY');
    const focal = focalX !== undefined && focalY !== undefined ? { x: focalX, y: focalY } : undefined;

    const { media, rearmedDerivatives } = await mediaStorageTransport.updateMediaMetadata({
        mediaId,
        alt,
        caption,
        ...(focal ? { focal } : {}),
    });

    if (rearmedDerivatives && media.url && media.mimeType) {
        // The focal moved: re-run the upload pipeline's sharp pass against the original's bytes.
        // The original is only reachable through its read-time Convex storage URL (blobs are
        // never persisted Node-side), so a regeneration fetch is the one extra round-trip.
        const response = await fetch(media.url);
        if (!response.ok) {
            throw new MediaStorageUploadError(response.status, 'original blob fetch for regeneration failed');
        }
        await fulfillDerivativePlan({
            mediaId: media.id,
            mimeType: media.mimeType,
            data: new Uint8Array(await response.arrayBuffer()),
            ...(focal ? { focal } : {}),
        });
    }

    revalidatePath(`/${domain}/settings/media/`);
    revalidatePath(`/${domain}/settings/media/${media.id}/`);
    return { id: media.id };
}
