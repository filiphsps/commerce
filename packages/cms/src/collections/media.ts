import type { CollectionConfig } from 'payload';

export const media: CollectionConfig = {
    slug: 'media',
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
