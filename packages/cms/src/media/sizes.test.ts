import { describe, expect, it } from 'vitest';

import {
    clampFocalPoint,
    DEFAULT_FOCAL_POINT,
    isImageMimeType,
    MEDIA_IMAGE_SIZES,
    planDerivatives,
    resolveCoverCrop,
} from './sizes';

describe('media sizes', () => {
    it('keeps the frozen Payload-era imageSizes exactly (name, width, height, order)', () => {
        // The deleted Payload media collection persisted derivatives under these
        // four sizes; migrated assets and their stored keys depend on the exact
        // names and dimensions, so the literal pin replaces the config mirror.
        expect(MEDIA_IMAGE_SIZES.map(({ name, width, height }) => ({ name, width, height }))).toEqual([
            { name: 'thumbnail', width: 320, height: 240 },
            { name: 'card', width: 768, height: 576 },
            { name: 'feature', width: 1280, height: 720 },
            { name: 'hero', width: 1920, height: 1080 },
        ]);
    });

    it('plans all four sizes for images and zero work for everything else', () => {
        expect(planDerivatives('image/png')).toHaveLength(4);
        expect(planDerivatives('IMAGE/JPEG; quality=80')).toHaveLength(4);
        expect(planDerivatives('image/svg+xml')).toHaveLength(4);
        expect(planDerivatives('video/mp4')).toEqual([]);
        expect(planDerivatives('application/pdf')).toEqual([]);
        expect(planDerivatives('')).toEqual([]);
        expect(planDerivatives('not-a-mime')).toEqual([]);
    });

    it('classifies image mime types case-insensitively and fails closed on garbage', () => {
        expect(isImageMimeType('image/webp')).toBe(true);
        expect(isImageMimeType('IMAGE/PNG; charset=binary')).toBe(true);
        expect(isImageMimeType('imageish/png')).toBe(false);
        expect(isImageMimeType('')).toBe(false);
    });

    it('clamps focal points into the unit square, defaulting missing/garbage axes to center', () => {
        expect(clampFocalPoint(undefined)).toEqual(DEFAULT_FOCAL_POINT);
        expect(clampFocalPoint(null)).toEqual(DEFAULT_FOCAL_POINT);
        expect(clampFocalPoint({ x: 5, y: -3 })).toEqual({ x: 1, y: 0 });
        expect(clampFocalPoint({ x: Number.NaN, y: 0.25 })).toEqual({ x: 0.5, y: 0.25 });
        expect(clampFocalPoint({ x: 0.75 })).toEqual({ x: 0.75, y: 0.5 });
    });
});

describe('resolveCoverCrop geometry', () => {
    const source = { width: 1600, height: 800 };
    const square = { width: 400, height: 400 };

    it('centers the crop window on the default (center) focal point', () => {
        expect(resolveCoverCrop(source, square)).toEqual({ left: 400, top: 0, width: 800, height: 800 });
    });

    it('slides the window flush against the edge for an edge focal point', () => {
        expect(resolveCoverCrop(source, square, { x: 0, y: 0.5 })).toEqual({
            left: 0,
            top: 0,
            width: 800,
            height: 800,
        });
        expect(resolveCoverCrop(source, square, { x: 1, y: 0.5 })).toEqual({
            left: 800,
            top: 0,
            width: 800,
            height: 800,
        });
    });

    it('clamps a corner focal point inside the source on both axes', () => {
        expect(resolveCoverCrop(source, square, { x: 1, y: 1 })).toEqual({
            left: 800,
            top: 0,
            width: 800,
            height: 800,
        });
        expect(resolveCoverCrop({ width: 800, height: 1600 }, square, { x: 0, y: 1 })).toEqual({
            left: 0,
            top: 800,
            width: 800,
            height: 800,
        });
    });

    it('uses the full frame when the target aspect ratio matches the source', () => {
        expect(resolveCoverCrop({ width: 2000, height: 1000 }, { width: 1000, height: 500 })).toEqual({
            left: 0,
            top: 0,
            width: 2000,
            height: 1000,
        });
    });

    it('clamps out-of-range focal values instead of cropping past the source', () => {
        expect(resolveCoverCrop(source, square, { x: 99, y: -99 })).toEqual(
            resolveCoverCrop(source, square, { x: 1, y: 0 }),
        );
    });

    it('never produces a window outside the source, even for tiny sources', () => {
        const crop = resolveCoverCrop({ width: 3, height: 2 }, { width: 1920, height: 1080 }, { x: 1, y: 1 });
        expect(crop.left).toBeGreaterThanOrEqual(0);
        expect(crop.top).toBeGreaterThanOrEqual(0);
        expect(crop.left + crop.width).toBeLessThanOrEqual(3);
        expect(crop.top + crop.height).toBeLessThanOrEqual(2);
    });
});
