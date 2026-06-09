/**
 * Shared media-derivative size/focal constants and the pure crop-geometry helpers behind the
 * CMSMEDIA-02 derivative pipeline. This module is deliberately dependency-free (no payload, no
 * sharp, no server-only) so every tier can import it: the Node-side generator
 * (`./derive`), the admin upload action, and the Convex package's drift guard (the isolate keeps
 * its own validator-level mirror — see `packages/convex/convex/tables/cms_media.ts`).
 *
 * The size names/dimensions mirror the FROZEN Payload media collection config
 * (`../collections/media.ts` `upload.imageSizes`); `sizes.test.ts` pins the two lists equal so the
 * config stays the single source of truth without dragging the payload-coupled collections barrel
 * into non-payload consumers.
 */

/**
 * The four frozen named image sizes every raster upload derives into, in the Payload config's
 * declaration order. `position: 'centre'` in the Payload config translates to cover-crop
 * semantics, with the crop window centered on the asset's focal point (default: image center).
 */
export const MEDIA_IMAGE_SIZES = [
    { name: 'thumbnail', width: 320, height: 240 },
    { name: 'card', width: 768, height: 576 },
    { name: 'feature', width: 1280, height: 720 },
    { name: 'hero', width: 1920, height: 1080 },
] as const;

/** One frozen named derivative size (name + exact output pixel dimensions). */
export type MediaImageSize = (typeof MEDIA_IMAGE_SIZES)[number];

/** The frozen derivative size-name union (`'thumbnail' | 'card' | 'feature' | 'hero'`). */
export type MediaImageSizeName = MediaImageSize['name'];

/**
 * A focal point in relative unit coordinates: `x`/`y` in `0..1` measured from the image's top-left
 * corner. `{ x: 0.5, y: 0.5 }` is the image center — the default when an asset has no explicit
 * focal point.
 */
export interface FocalPoint {
    x: number;
    y: number;
}

/** The default focal point — the image center. */
export const DEFAULT_FOCAL_POINT: Readonly<FocalPoint> = Object.freeze({ x: 0.5, y: 0.5 });

/** Integer pixel dimensions of a raster image (or a crop/output target). */
export interface PixelDimensions {
    width: number;
    height: number;
}

/**
 * A crop window in SOURCE pixel coordinates: `left`/`top` offset plus the window's dimensions.
 * Always fully contained within the source image.
 */
export interface CropRegion {
    left: number;
    top: number;
    width: number;
    height: number;
}

/**
 * Clamps a unit-interval coordinate into `0..1`, treating non-finite input as the centered `0.5`
 * so a corrupt persisted value degrades to the default rather than producing NaN geometry.
 *
 * @param value - The candidate coordinate.
 * @returns The coordinate clamped into `0..1`.
 */
function clampUnit(value: number): number {
    if (!Number.isFinite(value)) return 0.5;
    return Math.min(1, Math.max(0, value));
}

/**
 * Normalizes an optional/partial focal point onto the `0..1` contract, defaulting missing axes to
 * the image center.
 *
 * @param focal - The candidate focal point, possibly absent or partially specified.
 * @returns A complete focal point with both axes clamped into `0..1`.
 */
export function clampFocalPoint(focal?: Partial<FocalPoint> | null): FocalPoint {
    return {
        x: clampUnit(focal?.x ?? DEFAULT_FOCAL_POINT.x),
        y: clampUnit(focal?.y ?? DEFAULT_FOCAL_POINT.y),
    };
}

/**
 * Decides whether a mime type denotes a raster-derivable image: any `image/*` essence (parameters
 * stripped, case-insensitive). An empty or unparsable value fails closed — non-images schedule
 * zero derivative work.
 *
 * @param mimeType - The candidate mime type (may carry parameters).
 * @returns `true` when the type is in the `image/*` family.
 */
export function isImageMimeType(mimeType: string): boolean {
    const essence = mimeType.split(';')[0]?.trim().toLowerCase();
    if (!essence?.includes('/')) return false;
    return essence.startsWith('image/');
}

/**
 * Plans the derivative work for an upload: every image derives all four frozen sizes, everything
 * else (video, PDF, garbage) derives nothing.
 *
 * @param mimeType - The upload's (finalize-verified) mime type.
 * @returns The frozen size list for images; an empty list otherwise.
 */
export function planDerivatives(mimeType: string): readonly MediaImageSize[] {
    return isImageMimeType(mimeType) ? MEDIA_IMAGE_SIZES : [];
}

/**
 * Coerces a dimension into a sane positive integer pixel count (floor, minimum 1, non-finite → 1)
 * so the geometry below is total over arbitrary numeric input instead of throwing on garbage.
 *
 * @param value - The candidate dimension.
 * @returns The dimension as an integer of at least 1.
 */
function toPixelCount(value: number): number {
    if (!Number.isFinite(value)) return 1;
    return Math.max(1, Math.floor(value));
}

/**
 * Resolves the cover-crop window for one derivative: the largest source-pixel region with the
 * target's aspect ratio, centered on the focal point and clamped so the window never leaves the
 * source bounds (an edge/corner focal point slides the window flush against that edge rather than
 * cropping past it). Scaling the returned region to the target's exact dimensions reproduces
 * sharp's `fit: 'cover'` semantics with a focal-aware position.
 *
 * @param source - The source image's pixel dimensions.
 * @param target - The derivative's output pixel dimensions.
 * @param focal - The focal point in `0..1` unit coordinates; defaults to the image center.
 * @returns The crop window in source pixel coordinates, fully contained in the source.
 */
export function resolveCoverCrop(
    source: PixelDimensions,
    target: PixelDimensions,
    focal?: Partial<FocalPoint> | null,
): CropRegion {
    const sourceWidth = toPixelCount(source.width);
    const sourceHeight = toPixelCount(source.height);
    const targetWidth = toPixelCount(target.width);
    const targetHeight = toPixelCount(target.height);
    const { x, y } = clampFocalPoint(focal);

    // The cover scale is the larger per-axis ratio; dividing the target by it yields the largest
    // source window with the target's aspect ratio that still fits inside the source.
    const scale = Math.max(targetWidth / sourceWidth, targetHeight / sourceHeight);
    const width = Math.min(sourceWidth, Math.max(1, Math.round(targetWidth / scale)));
    const height = Math.min(sourceHeight, Math.max(1, Math.round(targetHeight / scale)));

    const left = Math.min(sourceWidth - width, Math.max(0, Math.round(x * sourceWidth - width / 2)));
    const top = Math.min(sourceHeight - height, Math.max(0, Math.round(y * sourceHeight - height / 2)));

    return { left, top, width, height };
}
