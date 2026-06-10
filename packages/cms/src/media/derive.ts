import 'server-only';

import { UnsupportedUploadMimeTypeError } from '@nordcom/commerce-errors';

import { type FocalPoint, type MediaImageSizeName, planDerivatives, resolveCoverCrop } from './sizes';

/**
 * Node-side derivative generator for the CMSMEDIA-02 pipeline (architecture option (b)): sharp is
 * a native Node library that cannot run in the default Convex isolate runtime and would force the
 * self-host CI deploy to build a native module, so generation happens in the trusted Node layer
 * (the admin upload action's server side) and only the RESULTS travel to Convex —
 * `cms/media:finalizeUpload` plants the pending derivative plan,
 * `cms/media_derivatives:saveDerivatives` persists the generated blobs' metadata. Keep this module
 * out of every client bundle: it imports `server-only` and loads sharp lazily so merely importing
 * the `./media` size constants never touches the native dependency.
 */

/**
 * Output formats kept as-is when deriving; anything else (svg, tiff, heif, gif, …) is rasterized
 * to png so every derivative is a plain, universally renderable raster regardless of the original
 * container.
 */
const PASSTHROUGH_FORMATS: Record<string, string> = {
    avif: 'image/avif',
    jpeg: 'image/jpeg',
    png: 'image/png',
    webp: 'image/webp',
};

/** One generated derivative: the frozen size it fulfills plus the encoded bytes and their metadata. */
export interface GeneratedDerivative {
    size: MediaImageSizeName;
    width: number;
    height: number;
    mimeType: string;
    data: Uint8Array;
}

/**
 * A full derivative pass: the decoded original's pixel dimensions (what
 * `cms/media_derivatives:saveDerivatives` records on the media row) plus the generated derivatives.
 * `null` when the source is not an image — the Node-side twin of finalize scheduling zero
 * derivative work.
 */
export interface DerivativePass {
    /** The original image's decoded pixel dimensions. */
    original: { width: number; height: number };
    /** One generated derivative per frozen size, in the frozen declaration order. */
    derivatives: GeneratedDerivative[];
}

/** The source upload the derivatives are generated from. */
export interface DerivativeSource {
    /** The original image's encoded bytes. */
    data: Uint8Array;
    /** The upload's (finalize-verified) mime type; non-images yield zero derivatives. */
    mimeType: string;
    /** Focal point in `0..1` unit coordinates; defaults to the image center. */
    focal?: Partial<FocalPoint> | null;
}

/**
 * Generates the four frozen named derivative sizes from an uploaded original, cover-cropped around
 * the focal point (`resolveCoverCrop`) and resized to each size's exact output dimensions. A
 * non-image source produces an empty list — the Node-side twin of finalize scheduling zero
 * derivative work. Regeneration is deterministic for a given (bytes, focal) input, so re-running
 * the pipeline fulfills the same plan rather than fabricating new variants.
 *
 * @param source - The original upload's bytes, verified mime type, and optional focal point.
 * @returns One generated derivative per frozen size, in the frozen declaration order.
 * @throws {UnsupportedUploadMimeTypeError} When the bytes claim to be an image but sharp cannot
 *   decode raster dimensions from them.
 */
export async function generateImageDerivatives(source: DerivativeSource): Promise<GeneratedDerivative[]> {
    const pass = await generateImageDerivativePass(source);
    return pass?.derivatives ?? [];
}

/**
 * Runs the full Node-side derivative pass for one upload: decodes the original once, generates the
 * four frozen sizes, and reports the original's pixel dimensions alongside them — the exact input
 * set `cms/media_derivatives:saveDerivatives` persists, so the production caller (the admin upload
 * action) never decodes the source a second time just to learn its dimensions.
 *
 * @param source - The original upload's bytes, verified mime type, and optional focal point.
 * @returns The original's dimensions plus the generated derivatives, or `null` for a non-image.
 * @throws {UnsupportedUploadMimeTypeError} When the bytes claim to be an image but sharp cannot
 *   decode raster dimensions from them.
 */
export async function generateImageDerivativePass(source: DerivativeSource): Promise<DerivativePass | null> {
    const plan = planDerivatives(source.mimeType);
    if (plan.length === 0) return null;

    const { default: sharp } = await import('sharp');

    let metadata: { width?: number; height?: number; format?: string };
    try {
        metadata = await sharp(source.data).metadata();
    } catch (error: unknown) {
        throw new UnsupportedUploadMimeTypeError(source.mimeType, error instanceof Error ? error.message : undefined);
    }
    const { width: sourceWidth, height: sourceHeight, format: sourceFormat } = metadata;
    if (!sourceWidth || !sourceHeight) {
        throw new UnsupportedUploadMimeTypeError(source.mimeType, 'sharp could not read raster dimensions');
    }

    const mimeType = (sourceFormat && PASSTHROUGH_FORMATS[sourceFormat]) || 'image/png';
    const format = mimeType.slice('image/'.length) as 'avif' | 'jpeg' | 'png' | 'webp';

    const derivatives: GeneratedDerivative[] = [];
    for (const size of plan) {
        const region = resolveCoverCrop({ width: sourceWidth, height: sourceHeight }, size, source.focal);
        // Extract-then-resize reproduces sharp's `fit: 'cover'` with a focal-aware position; the
        // extracted window already has the target aspect ratio, so `fill` only scales it.
        const { data, info } = await sharp(source.data)
            .extract(region)
            .resize(size.width, size.height, { fit: 'fill' })
            .toFormat(format)
            .toBuffer({ resolveWithObject: true });
        derivatives.push({
            size: size.name,
            width: info.width,
            height: info.height,
            mimeType,
            data: new Uint8Array(data),
        });
    }
    return { original: { width: sourceWidth, height: sourceHeight }, derivatives };
}
