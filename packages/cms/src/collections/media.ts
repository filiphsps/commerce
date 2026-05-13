import type { CollectionConfig } from 'payload';
import { adminOnly, tenantScopedRead, tenantScopedWrite } from '../access';

export const media: CollectionConfig = {
    slug: 'media',
    // `media` participates in `tenantScopedCollections` so the multi-tenant
    // plugin injects a `tenant` field — but without explicit access the
    // Payload defaults (any logged-in user) allow editors from tenant A to
    // read and write tenant B's uploads. Apply the same scoping pattern as
    // the content collections.
    access: {
        read: tenantScopedRead,
        create: tenantScopedWrite,
        update: tenantScopedWrite,
        delete: adminOnly,
    },
    upload: {
        mimeTypes: ['image/*', 'video/mp4', 'application/pdf'],
        imageSizes: [
            { name: 'thumbnail', width: 320, height: 240, position: 'centre' },
            { name: 'card', width: 768, height: 576, position: 'centre' },
            { name: 'feature', width: 1280, height: 720, position: 'centre' },
            { name: 'hero', width: 1920, height: 1080, position: 'centre' },
        ],
        focalPoint: true,
    },
    fields: [
        { name: 'alt', type: 'text', required: true },
        { name: 'caption', type: 'text', localized: true },
    ],
};
