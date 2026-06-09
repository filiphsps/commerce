import { UnsupportedUploadMimeTypeError } from '@nordcom/commerce-errors';
import sharp from 'sharp';
import { describe, expect, it } from 'vitest';

import { generateImageDerivatives } from './derive';
import { MEDIA_IMAGE_SIZES } from './sizes';

/**
 * Builds a real 1600x800 png with a red base and a blue patch flush against the right edge, so a
 * focal point at that edge pulls visibly different pixels into the crop than the centered default.
 *
 * @returns The encoded png bytes.
 */
async function buildSourceImage(): Promise<Uint8Array> {
    const patch = await sharp({
        create: { width: 200, height: 800, channels: 3, background: { r: 0, g: 0, b: 255 } },
    })
        .png()
        .toBuffer();
    const data = await sharp({
        create: { width: 1600, height: 800, channels: 3, background: { r: 255, g: 0, b: 0 } },
    })
        .composite([{ input: patch, left: 1400, top: 0 }])
        .png()
        .toBuffer();
    return new Uint8Array(data);
}

describe('generateImageDerivatives (real sharp resize)', () => {
    it('produces all four frozen sizes at their exact output dimensions', async () => {
        const data = await buildSourceImage();
        const derivatives = await generateImageDerivatives({ data, mimeType: 'image/png' });

        expect(derivatives.map(({ size }) => size)).toEqual(MEDIA_IMAGE_SIZES.map(({ name }) => name));
        for (const [index, derivative] of derivatives.entries()) {
            const expected = MEDIA_IMAGE_SIZES[index];
            expect(expected).toBeDefined();
            expect({ width: derivative.width, height: derivative.height }).toEqual({
                width: expected?.width,
                height: expected?.height,
            });
            expect(derivative.mimeType).toBe('image/png');
            expect(derivative.data.byteLength).toBeGreaterThan(0);
            const decoded = await sharp(derivative.data).metadata();
            expect(decoded.width).toBe(expected?.width);
            expect(decoded.height).toBe(expected?.height);
        }
    });

    it('honors the focal point: an edge focal crop differs from the centered default', async () => {
        const data = await buildSourceImage();
        const [centered] = await generateImageDerivatives({ data, mimeType: 'image/png' });
        const [edge] = await generateImageDerivatives({ data, mimeType: 'image/png', focal: { x: 1, y: 0.5 } });
        if (!centered || !edge) throw new TypeError('expected a thumbnail derivative from both runs');

        // The centered 4:3 crop of a 2:1 source never reaches the blue patch at the right edge;
        // the edge-focal crop is dominated by it.
        const centeredStats = await sharp(centered.data).stats();
        const edgeStats = await sharp(edge.data).stats();
        const blueOf = (stats: { channels: { mean: number }[] }): number => stats.channels[2]?.mean ?? 0;
        // The edge-focal thumbnail window (533..1600 of the 1600px source) overlaps the blue
        // patch by ~19% of its width, so its blue mean lands near 48 while the centered window
        // (267..1334) never reaches the patch at all.
        expect(blueOf(centeredStats)).toBeLessThan(5);
        expect(blueOf(edgeStats)).toBeGreaterThan(blueOf(centeredStats) + 30);
    });

    it('is deterministic for identical input, so regeneration replaces bytes with identical bytes', async () => {
        const data = await buildSourceImage();
        const [first] = await generateImageDerivatives({ data, mimeType: 'image/png' });
        const [second] = await generateImageDerivatives({ data, mimeType: 'image/png' });
        expect(first?.data).toEqual(second?.data);
    });

    it('produces zero derivatives for non-image uploads', async () => {
        await expect(
            generateImageDerivatives({ data: new Uint8Array([1, 2, 3]), mimeType: 'application/pdf' }),
        ).resolves.toEqual([]);
        await expect(
            generateImageDerivatives({ data: new Uint8Array([1, 2, 3]), mimeType: 'video/mp4' }),
        ).resolves.toEqual([]);
    });

    it('throws the typed upload error when image bytes are undecodable', async () => {
        await expect(
            generateImageDerivatives({ data: new Uint8Array([0xde, 0xad, 0xbe, 0xef]), mimeType: 'image/png' }),
        ).rejects.toBeInstanceOf(UnsupportedUploadMimeTypeError);
    });
});
