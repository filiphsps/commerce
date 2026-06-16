'use server';

import 'server-only';

import type { Media } from '@nordcom/commerce-cms/types';
import { notFound } from 'next/navigation';

import { getAuthedCmsCtx } from '@/lib/cms-ctx';
import { editorConvexBridge } from '@/lib/editor-convex-bridge';

/** One page of the tenant media library, as the picker grid consumes it. */
export type MediaPage = {
    /** The page's media documents with their read-time serving URLs. */
    items: Media[];
    /** The 1-based page index actually served. */
    page: number;
    /** Last addressable page, at least 1. */
    totalPages: number;
};

/** Default grid window — one comfortable contact-sheet page; the read clamps it Convex-side anyway. */
const PICKER_PAGE_SIZE = 60;

/**
 * Lists the tenant's media library for the editor's image-picker grid — the client-callable read
 * behind the upload widget's "choose existing" panel. Reuses the editor bridge's `cms/media:page`
 * route (the same paginated `cmsMedia` read the media settings list rides), so the picker pages the
 * library exactly like the settings surface. The admin-only/tenant gate mirrors the upload and
 * metadata actions: `getAuthedCmsCtx` both enforces the role and records the active-shop selection
 * the bridge's operator token is minted from, so it MUST run before the bridge call.
 *
 * @param domain - Tenant domain resolving the route-level access context (`null` refuses — media is
 *   tenant-scoped).
 * @param page - 1-based page index to read; omitted reads the first page.
 * @returns The page's media documents plus its paging metadata.
 */
export async function listMediaAction(domain: string | null, page?: number): Promise<MediaPage> {
    const { user, tenant } = await getAuthedCmsCtx(domain ?? undefined);
    if (user.role !== 'admin') {
        notFound();
    }
    if (!tenant) {
        // Media is tenant-scoped; a route without a resolved tenant cannot address one (same refusal
        // as the upload and metadata actions).
        notFound();
    }

    const result = await editorConvexBridge.list({
        collection: 'media',
        pageSize: PICKER_PAGE_SIZE,
        ...(page !== undefined ? { page } : {}),
    });

    return {
        // A media list document's `data` IS the full `Media` shape (see `mediaToEditorDocument`).
        items: result.docs.map((doc) => doc.data as unknown as Media),
        page: result.page,
        totalPages: result.totalPages,
    };
}

/**
 * Resolves a single media document by id for the upload widget's closed-state thumbnail — the
 * cheap read that lets a field already holding a media id render its preview without fetching the
 * whole library. Same admin-only/tenant gate and bridge routing as {@link listMediaAction}; a
 * foreign or unparseable id reads as `null` (tenant scope is enforced Convex-side).
 *
 * @param domain - Tenant domain resolving the route-level access context (`null` refuses).
 * @param mediaId - The `cmsMedia` document id the field currently stores.
 * @returns The media document with its read-time serving URLs, or `null` when absent.
 */
export async function getMediaByIdAction(domain: string | null, mediaId: string): Promise<Media | null> {
    const { user, tenant } = await getAuthedCmsCtx(domain ?? undefined);
    if (user.role !== 'admin') {
        notFound();
    }
    if (!tenant) {
        notFound();
    }

    const doc = await editorConvexBridge.getDocument({ collection: 'media', documentId: mediaId });
    return doc === null ? null : (doc.data as unknown as Media);
}
