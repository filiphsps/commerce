import type { Media } from '@nordcom/commerce-cms/types';
import { describe, expect, it, vi } from 'vitest';

// The bridge module's transport imports drag the Clerk server SDK onto the import graph; the mapper
// under test is pure, so the auth seam is stubbed away.
vi.mock('./clerk-convex-token', () => ({ getAuthenticatedConvexClient: vi.fn() }));

import { mediaToEditorDocument } from './editor-convex-bridge';

/** A representative `cms/media:list` wire row on the frozen `Media` contract. */
const MEDIA: Media = {
    id: 'kg7media1',
    tenant: 'kg2shop1',
    alt: 'Hero artwork',
    caption: null,
    createdAt: '2026-06-01T10:00:00.000Z',
    updatedAt: '2026-06-02T11:30:00.000Z',
    url: 'https://storage.test/original',
    thumbnailURL: 'https://storage.test/thumb',
    filename: 'hero.png',
    mimeType: 'image/png',
    filesize: 12345,
    width: 1600,
    height: 900,
    focalX: 50,
    focalY: 50,
    sizes: {
        thumbnail: {
            url: 'https://storage.test/thumb',
            width: 320,
            height: 240,
            mimeType: 'image/png',
            filesize: 111,
            filename: null,
        },
    },
};

describe('mediaToEditorDocument (CUTOVER-06 media list/detail mapping)', () => {
    it('projects a Media wire row onto the editor document shape with the full Media as data', () => {
        const doc = mediaToEditorDocument(MEDIA);

        expect(doc.documentId).toBe('kg7media1');
        expect(doc.collection).toBe('media');
        // A media row exists only once finalizeUpload persisted it — no draft lifecycle.
        expect(doc.status).toBe('published');
        expect(doc.updatedAt).toBe(Date.parse('2026-06-02T11:30:00.000Z'));
        // The list columns (`filename`/`mimeType`) and the preview cell (`sizes.thumbnail.url`,
        // `thumbnailURL`, `url`) read straight off the data payload.
        expect(doc.data).toMatchObject({
            filename: 'hero.png',
            mimeType: 'image/png',
            thumbnailURL: 'https://storage.test/thumb',
        });
        expect((doc.data as { sizes?: { thumbnail?: { url?: string } } }).sizes?.thumbnail?.url).toBe(
            'https://storage.test/thumb',
        );
    });
});
