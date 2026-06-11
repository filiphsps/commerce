import type { CollectionConfig } from 'payload';
import { convexCutoverLocked, tenantScopedRead } from '../access';
import { localized, required, textField } from '../descriptors';
import { toFieldConfigs } from '../field-config-bridge';

/**
 * The frozen media mime allowlist: any image, mp4 video, and PDF. Single source of truth for the
 * Payload upload config below and the admin upload action's pre-check; the Convex storage layer
 * (`packages/convex/convex/cms/media.ts`) MIRRORS this list rather than importing it, because this
 * module sits behind the payload-coupled `collections` barrel, which is off the Convex isolate's
 * bundle surface — `media-mime-drift.test.ts` fails CI when the mirror diverges.
 */
export const MEDIA_MIME_TYPES = ['image/*', 'video/mp4', 'application/pdf'] as const;

/**
 * Payload collection config for `media`. Upload collection scoped to tenants
 * with four image-size variants (thumbnail, card, feature, hero) and a focal
 * point selector. Accepts images, mp4 video, and PDF.
 *
 * CUTOVER-06: media lives on the Convex `cmsMedia` table; uploads run the
 * CMSGATE-02 native pipeline (`cms/media:generateUploadUrl`/`finalizeUpload` +
 * the Node-side sharp derivative pass), never Payload's upload handler. Every
 * Payload write operation is `convexCutoverLocked`; reads stay tenant-scoped
 * for migrated-asset fallbacks until TEARDOWN-02 removes the collection.
 */
export const media: CollectionConfig = {
    slug: 'media',
    admin: { hidden: true },
    // `media` participates in `tenantScopedCollections` so the multi-tenant
    // plugin injects a `tenant` field — but without explicit access the
    // Payload defaults (any logged-in user) allow editors from tenant A to
    // read and write tenant B's uploads. Apply the same scoping pattern as
    // the content collections.
    access: {
        read: tenantScopedRead,
        create: convexCutoverLocked,
        update: convexCutoverLocked,
        delete: convexCutoverLocked,
    },
    upload: {
        mimeTypes: [...MEDIA_MIME_TYPES],
        imageSizes: [
            { name: 'thumbnail', width: 320, height: 240, position: 'centre' },
            { name: 'card', width: 768, height: 576, position: 'centre' },
            { name: 'feature', width: 1280, height: 720, position: 'centre' },
            { name: 'hero', width: 1920, height: 1080, position: 'centre' },
        ],
        focalPoint: true,
    },
    fields: toFieldConfigs(required(textField({ name: 'alt' })), localized(textField({ name: 'caption' }))),
};
