'use server';

import 'server-only';

import { MEDIA_MIME_TYPES } from '@nordcom/commerce-cms/collections';
import {
    EmptyUploadFileError,
    MissingConvexBridgeError,
    MissingRequiredFieldError,
    MissingUploadFileError,
    UnsupportedUploadMimeTypeError,
} from '@nordcom/commerce-errors';
import { revalidatePath } from 'next/cache';
import { notFound } from 'next/navigation';

import { getAuthedPayloadCtx } from '@/lib/payload-ctx';

/**
 * The Convex media-upload transport this action posts through — the CMSMEDIA-01 storage flow
 * (`cms/media:generateUploadUrl` → POST the bytes to the returned URL with the file's
 * `Content-Type` → `cms/media:finalizeUpload`, which verifies the stored blob against the mime
 * allowlist and persists the tenant-scoped `cmsMedia` row). The same injected-callback seam as the
 * editor's `EditorConvexBridge`: the Convex side resolves the tenant and re-enforces the allowlist
 * from server-trusted context, so nothing in this contract lets the client pick a tenant or relax
 * enforcement.
 */
type MediaUploadTransport = (args: { file: File; alt: string; caption?: string }) => Promise<{ id: string }>;

/**
 * Resolves the wired Convex media-upload transport, failing loud while none is wired — a
 * misconfigured app must surface immediately rather than silently dropping uploads. CMSGATE-02
 * supplies the authenticated `ConvexHttpClient` implementation (the operator bearer token minted
 * through `convex-auth.ts`), the same wiring step that populates the editor runtime's `convex`
 * bridge.
 *
 * @returns The media-upload transport.
 * @throws {MissingConvexBridgeError} Always, until CMSGATE-02 wires the transport.
 */
async function resolveMediaUploadTransport(): Promise<MediaUploadTransport> {
    throw new MissingConvexBridgeError('media');
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
 * Creates a new media document from an uploaded file and returns its id — the CMSMEDIA-01 upload
 * seam the editor upload widget (CMSFORM-06 `UploadAction`) and the media settings page call.
 *
 * Rebound from Payload's local API onto the Convex storage flow: validation and the route-level
 * access gate stay here (admin-only, tenant resolved — the same defense-in-depth layering as the
 * generated editor actions), while persistence goes through the {@link MediaUploadTransport} into
 * Convex, whose tenant tier pins the shop from the trusted identity and re-enforces the mime
 * allowlist against the stored blob.
 *
 * @param domain - Tenant domain used to resolve the route-level access context.
 * @param formData - Form data containing the 'file' (File), 'alt' (required), and optional 'caption' fields.
 * @returns Object containing the id of the newly created media document.
 * @throws {MissingUploadFileError} When the 'file' field is absent or not a File instance.
 * @throws {EmptyUploadFileError} When the uploaded file has a size of zero.
 * @throws {MissingRequiredFieldError} When the 'alt' field is absent.
 * @throws {UnsupportedUploadMimeTypeError} When the file's mime type is outside the media allowlist.
 * @throws {MissingConvexBridgeError} While no Convex media-upload transport is wired (CMSGATE-02).
 */
export async function createMediaAction(domain: string, formData: FormData): Promise<{ id: string }> {
    const { user, tenant } = await getAuthedPayloadCtx(domain);

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

    const upload = await resolveMediaUploadTransport();
    const { id } = await upload({ file: fileEntry, alt, ...(caption ? { caption } : {}) });

    revalidatePath(`/${domain}/settings/media/`);
    return { id };
}
