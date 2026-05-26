import { isValidElement, type ReactElement } from 'react';
import { describe, expect, it } from 'vitest';
import { mediaEditor } from './media';

describe('mediaEditor', () => {
    it('targets the media collection', () => {
        expect(mediaEditor.collection).toBe('media');
    });
    it('is shared (admin-only)', () => {
        expect(mediaEditor.tenant.kind).toBe('shared');
    });

    describe('Preview column', () => {
        const preview = mediaEditor.list?.columns[0];

        it('is the first column so the table wraps it in the row link', () => {
            expect(preview?.label).toBe('Preview');
            expect(typeof preview?.render).toBe('function');
        });

        it('renders an <img> for image uploads, preferring the thumbnail size', () => {
            const doc = {
                mimeType: 'image/png',
                alt: 'A cat',
                filename: 'cat.png',
                url: '/media/cat.png',
                thumbnailURL: '/media/cat-auto.png',
                sizes: { thumbnail: { url: '/media/cat-thumb.png' } },
            };
            const node = preview?.render?.(null, doc) as ReactElement<{ src: string; alt: string }> | undefined;
            expect(node && isValidElement(node)).toBe(true);
            expect(node?.type).toBe('img');
            expect(node?.props.src).toBe('/media/cat-thumb.png');
            expect(node?.props.alt).toBe('A cat');
        });

        it('falls back through thumbnailURL → url when no size variant exists', () => {
            const fromAuto = preview?.render?.(null, {
                mimeType: 'image/jpeg',
                alt: 'x',
                thumbnailURL: '/auto.jpg',
                url: '/full.jpg',
            }) as ReactElement<{ src: string }> | undefined;
            expect(fromAuto?.props.src).toBe('/auto.jpg');

            const fromUrl = preview?.render?.(null, {
                mimeType: 'image/jpeg',
                alt: 'x',
                url: '/full.jpg',
            }) as ReactElement<{ src: string }> | undefined;
            expect(fromUrl?.props.src).toBe('/full.jpg');
        });

        it('renders a VIDEO badge for video uploads', () => {
            const node = preview?.render?.(null, { mimeType: 'video/mp4', filename: 'clip.mp4' }) as
                | ReactElement<{ children: string }>
                | undefined;
            expect(node?.type).toBe('div');
            expect(node?.props.children).toBe('VIDEO');
        });

        it('renders a PDF badge for pdf uploads', () => {
            const node = preview?.render?.(null, { mimeType: 'application/pdf', filename: 'doc.pdf' }) as
                | ReactElement<{ children: string }>
                | undefined;
            expect(node?.type).toBe('div');
            expect(node?.props.children).toBe('PDF');
        });

        it('falls back to a generic badge for unknown mime types', () => {
            const node = preview?.render?.(null, { mimeType: '', filename: 'mystery' }) as
                | ReactElement<{ children: string }>
                | undefined;
            expect(node?.type).toBe('div');
            expect(node?.props.children).toBe('FILE');
        });
    });
});
