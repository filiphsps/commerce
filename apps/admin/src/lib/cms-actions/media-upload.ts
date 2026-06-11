'use server';

import 'server-only';

import { MEDIA_MIME_TYPES } from '@nordcom/commerce-cms/media/mime-types';
import { generateImageDerivativePass } from '@nordcom/commerce-cms/media/derive';
import {
    EmptyUploadFileError,
    MediaStorageUploadError,
    MissingRequiredFieldError,
    MissingUploadFileError,
    UnsupportedUploadMimeTypeError,
} from '@nordcom/commerce-errors';
import { revalidatePath } from 'next/cache';
import { notFound } from 'next/navigation';

import { mediaStorageTransport } from '@/lib/editor-convex-bridge';
import { getAuthedCmsCtx } from '@/lib/cms-ctx';

/**
 * POSTs one blob's bytes to a freshly issued Convex file-storage upload URL and returns the stored
 * blob's id — the byte-sink leg shared by the original upload and every generated derivative. The
 * `Content-Type` header carries the blob's mime type so Convex records it as the blob's
 * `contentType`, which is what `finalizeUpload`'s allowlist check trusts over the client's claim.
 *
 * @param mimeType - The blob's mime type.
 * @param data - The blob's bytes.
 * @returns The Convex storage id of the stored blob.
 * @throws {MediaStorageUploadError} When the byte sink responds non-2xx or without a `storageId`.
 */
async function postBlobToStorage(mimeType: string, data: Uint8Array): Promise<string> {
    const { url } = await mediaStorageTransport.generateUploadUrl();
    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': mimeType },
        body: data as unknown as BodyInit,
    });
    if (!response.ok) {
        throw new MediaStorageUploadError(response.status);
    }
    const body = (await response.json()) as { storageId?: unknown };
    if (typeof body.storageId !== 'string' || body.storageId.length === 0) {
        throw new MediaStorageUploadError(response.status, 'byte sink response carried no storageId');
    }
    return body.storageId;
}

/**
 * Runs the Node-side sharp derivative pass for a finalized image upload and persists the results
 * through `cms/media_derivatives:saveDerivatives` — the CMSMEDIA-02 option-(b) production caller:
 * sharp cannot run in the Convex isolate, so the four frozen sizes are generated here in the
 * trusted Node layer, each derivative blob is POSTed to its own storage byte sink, and only the
 * resulting metadata travels into Convex. A non-image source is a no-op (finalize scheduled zero
 * derivative work for it).
 *
 * @param args.mediaId - The finalized `cmsMedia` document id whose plan this fulfills.
 * @param args.mimeType - The finalize-verified effective mime type.
 * @param args.data - The original upload's bytes.
 * @param args.focal - Optional focal point in `0..1` unit coordinates (defaults to center).
 * @throws {UnsupportedUploadMimeTypeError} When the bytes claim to be an image but cannot be decoded.
 * @throws {MediaStorageUploadError} When a derivative blob's byte POST fails.
 */
async function fulfillDerivativePlan(args: {
    mediaId: string;
    mimeType: string;
    data: Uint8Array;
    focal?: { x: number; y: number };
}): Promise<void> {
    const pass = await generateImageDerivativePass({
        data: args.data,
        mimeType: args.mimeType,
        focal: args.focal ?? null,
    });
    if (!pass) return;

    const derivatives = [];
    for (const derivative of pass.derivatives) {
        const storageId = await postBlobToStorage(derivative.mimeType, derivative.data);
        derivatives.push({
            size: derivative.size,
            storageId,
            width: derivative.width,
            height: derivative.height,
        });
    }
    await mediaStorageTransport.saveDerivatives({
        mediaId: args.mediaId,
        original: pass.original,
        ...(args.focal ? { focal: args.focal } : {}),
        derivatives,
    });
}

/**
 * Whether a mime type is inside the frozen media allowlist (`MEDIA_MIME_TYPES`): parameters
 * stripped, case-insensitive, `type/*` entries matching the whole top-level family. Defense in
 * depth only — the authoritative check runs in Convex's `cms/media:finalizeUpload` against the
 * stored blob's recorded metadata; this pre-check just spares the operator a round-trip for an
 * obviously rejected file.
 *
 * @param mimeType - The candidate mime type (may carry parameters).
 * @returns `true` when the type is allowed for media uploads.
 */
function isAllowedUploadMimeType(mimeType: string): boolean {
    const essence = mimeType.split(';')[0]?.trim().toLowerCase();
    if (!essence?.includes('/')) return false;
    return MEDIA_MIME_TYPES.some((allowed) =>
        allowed.endsWith('/*') ? essence.startsWith(allowed.slice(0, -1)) : essence === allowed,
    );
}

/**
 * Parses an optional `0..1` focal coordinate off the form payload, treating absent or non-numeric
 * values as unset (clamping is the Convex side's job — `scheduleDerivativePlan` degrades garbage
 * to the centered default).
 *
 * @param formData - The upload form payload.
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
 * Creates a new media document from an uploaded file and returns its id — the CMSMEDIA-01 upload
 * seam the editor upload widget (CMSFORM-06 `UploadAction`, wired through `EditorFields` as the
 * runtime's `mediaUploadAction`) and the media settings page call.
 *
 * The CMSGATE-02 live pipeline: validation and the route-level access gate run here (admin-only,
 * tenant resolved — the same defense-in-depth layering as the generated editor actions), then the
 * bytes POST to a `cms/media:generateUploadUrl` sink, `cms/media:finalizeUpload` persists the
 * tenant-scoped row (re-enforcing the mime allowlist against the stored blob and planting the
 * pending derivative plan), and the Node-side sharp pass fulfills that plan via
 * `cms/media_derivatives:saveDerivatives` — all four frozen sizes plus the focal point, recorded
 * before this action resolves. An optional `focalX`/`focalY` pair on the form drives the
 * focal-aware crop; omitted defaults to center.
 *
 * @param domain - Tenant domain used to resolve the route-level access context (`null` on
 *   cross-tenant routes, which refuse — media is tenant-scoped).
 * @param formData - Form data containing the 'file' (File), 'alt' (required), and optional
 *   'caption'/'focalX'/'focalY' fields.
 * @returns Object containing the id of the newly created media document.
 * @throws {MissingUploadFileError} When the 'file' field is absent or not a File instance.
 * @throws {EmptyUploadFileError} When the uploaded file has a size of zero.
 * @throws {MissingRequiredFieldError} When the 'alt' field is absent.
 * @throws {UnsupportedUploadMimeTypeError} When the file's mime type is outside the media allowlist
 *   or sharp cannot decode a blob claiming to be an image.
 * @throws {MediaStorageUploadError} When a byte POST to Convex file storage fails.
 */
export async function createMediaAction(domain: string | null, formData: FormData): Promise<{ id: string }> {
    const { user, tenant } = await getAuthedCmsCtx(domain ?? undefined);

    if (user.role !== 'admin') {
        notFound();
    }
    if (!tenant) {
        // Media is tenant-scoped. A missing tenant context means the operator is on a route that
        // never resolved one — refuse rather than uploading into a tenant Convex would have to
        // guess (its identity-derived resolution would still pin one, but the operator's intent is
        // ambiguous here).
        notFound();
    }

    const fileEntry = formData.get('file');
    if (!(fileEntry instanceof File)) {
        throw new MissingUploadFileError();
    }
    if (fileEntry.size === 0) {
        throw new EmptyUploadFileError();
    }
    if (!isAllowedUploadMimeType(fileEntry.type)) {
        throw new UnsupportedUploadMimeTypeError(fileEntry.type);
    }

    const alt = formData.get('alt')?.toString();
    const caption = formData.get('caption')?.toString();

    if (!alt) {
        // `alt` is required on the media contract. Surface the validation error here so the
        // operator gets a clear message instead of a Convex validator failure.
        throw new MissingRequiredFieldError('alt');
    }

    const focalX = parseFocalCoordinate(formData, 'focalX');
    const focalY = parseFocalCoordinate(formData, 'focalY');
    const focal = focalX !== undefined && focalY !== undefined ? { x: focalX, y: focalY } : undefined;

    const data = new Uint8Array(await fileEntry.arrayBuffer());
    const storageId = await postBlobToStorage(fileEntry.type, data);
    const media = await mediaStorageTransport.finalizeUpload({
        storageId,
        filename: fileEntry.name,
        mimeType: fileEntry.type,
        alt,
        ...(caption ? { caption } : {}),
        ...(focal ? { focal } : {}),
    });

    await fulfillDerivativePlan({
        mediaId: media.id,
        // Finalize may have corrected the effective type from the blob's recorded metadata; the
        // derivative planner must key off the same value the pending plan was scheduled with.
        mimeType: media.mimeType,
        data,
        ...(focal ? { focal } : {}),
    });

    revalidatePath(`/${domain}/settings/media/`);
    return { id: media.id };
}
