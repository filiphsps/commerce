import 'server-only';

import { generateImageDerivativePass } from '@nordcom/commerce-cms/media/derive';
import { MediaStorageUploadError } from '@nordcom/commerce-errors';

import { mediaStorageTransport } from '@/lib/editor-convex-bridge';

/**
 * The shared Node-side legs of the CMSMEDIA pipeline — the byte-sink POST and the sharp
 * derivative-plan fulfillment — factored out of the upload action so the metadata action's focal
 * regeneration drives the IDENTICAL pass. Deliberately NOT a `'use server'` module: every exported
 * async function in one would become a client-invokable endpoint, and these helpers must only run
 * behind an already-authenticated action.
 */

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
export async function postBlobToStorage(mimeType: string, data: Uint8Array): Promise<string> {
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
 * Runs the Node-side sharp derivative pass for a finalized image and persists the results through
 * `cms/media_derivatives:saveDerivatives` — the CMSMEDIA-02 option-(b) production caller: sharp
 * cannot run in the Convex isolate, so the four frozen sizes are generated here in the trusted
 * Node layer, each derivative blob is POSTed to its own storage byte sink, and only the resulting
 * metadata travels into Convex. Fulfillment converges on the same `(mediaId, size)` rows whether
 * it follows a fresh upload's pending plan or a focal-move re-arm (the CMSMEDIA-02 regeneration
 * idempotency). A non-image source is a no-op.
 *
 * @param args.mediaId - The `cmsMedia` document id whose derivative plan this fulfills.
 * @param args.mimeType - The finalize-verified effective mime type.
 * @param args.data - The original asset's bytes.
 * @param args.focal - Optional focal point in `0..1` unit coordinates (defaults to center).
 * @throws {UnsupportedUploadMimeTypeError} When the bytes claim to be an image but cannot be decoded.
 * @throws {MediaStorageUploadError} When a derivative blob's byte POST fails.
 */
export async function fulfillDerivativePlan(args: {
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
