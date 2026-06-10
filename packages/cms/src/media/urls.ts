import type { MediaImageSize } from './sizes';

/**
 * Media serving-URL scheme (CMSMEDIA-03) — the documented decision for how originals and the four
 * frozen derivative sizes are addressed, for BOTH migrated and newly-uploaded assets.
 *
 * CANONICAL SCHEME — Convex file storage, resolved at read time. Every `cmsMedia` row carries a
 * REQUIRED Convex `storageId` (`packages/convex/convex/tables/cms_media.ts`): new uploads receive
 * one at `cms/media:finalizeUpload`, and migrated assets receive one because the PIPELINE-02
 * storage plan (`scripts/etl/transform/media.ts`) streams each S3/R2 object — at its preserved
 * key — INTO Convex storage post-commit and only then inserts the row. The preserved key is the
 * copy SOURCE, never a serving location for Convex-backed rows, so the two provenances converge on
 * one single-source scheme: `ctx.storage.getUrl(storageId)`, resolved inside the Convex read
 * functions (`packages/convex/convex/cms/media.ts`) on every read and NEVER persisted —
 * deployment-relative storage URLs are not contractually eternal, and resolving at read time also
 * gives regeneration free cache busting (refulfilling a derivative REPLACES its `storageId`, so
 * the served URL changes with the bytes). A derivative whose plan row is still `pending` serves
 * the ORIGINAL's URL — consumers never receive a broken image. Next/Image consumption treats the
 * served value as an opaque string; the storefront's `images.remotePatterns` admits the Convex
 * storage host explicitly.
 *
 * TRANSITIONAL SCHEME — preserved S3/R2 keys behind the public CDN endpoint. Until the SFREAD-12
 * read flip, the Payload-on-Mongo getters keep serving `${R2_PUBLIC_ENDPOINT}/${key}` (the
 * `@payloadcms/storage-s3` plugin's `generateFileURL`, see `../plugins/storage.ts`) with Payload's
 * `-{width}x{height}` filename convention for sizes. The helpers below reconstruct those URLs
 * byte-identically so transitional consumers (the ETL coverage verifier, pre-cutover serving,
 * parity checks) need no Payload runtime. `MEDIA_CDN_BASE_URL` overrides `R2_PUBLIC_ENDPOINT` when
 * a different CDN host fronts the same bucket. Key-addressed URLs identify content only by
 * filename — regenerating bytes behind an unchanged key requires CDN invalidation, which is the
 * other reason the read-time Convex scheme is canonical.
 */

/**
 * The environment variables a key-addressed media CDN base resolves from, in precedence order:
 * the explicit `MEDIA_CDN_BASE_URL` override first, then the legacy Payload storage plugin's
 * `R2_PUBLIC_ENDPOINT` (the value `generateFileURL` historically used, see `../plugins/storage.ts`).
 */
export const MEDIA_CDN_BASE_URL_ENV_VARS = ['MEDIA_CDN_BASE_URL', 'R2_PUBLIC_ENDPOINT'] as const;

/**
 * Resolves the key-addressed media CDN base URL from an environment record, honoring the
 * {@link MEDIA_CDN_BASE_URL_ENV_VARS} precedence and normalizing away any trailing slashes so
 * {@link mediaUrlForStorageKey} always joins with exactly one separator. The env record is a
 * parameter (rather than an implicit `process.env` read) to keep the module pure and total under
 * test.
 *
 * @param env - The environment record to resolve from (pass `process.env` in production code).
 * @returns The normalized base URL, or `null` when no candidate variable holds a non-empty value.
 */
export function resolveMediaCdnBaseUrl(env: Record<string, string | undefined>): string | null {
    for (const name of MEDIA_CDN_BASE_URL_ENV_VARS) {
        const value = env[name]?.trim();
        if (value) return value.replace(/\/+$/, '');
    }
    return null;
}

/**
 * Builds the key-addressed serving URL for a preserved S3/R2 object key — byte-identical to the
 * legacy Payload storage plugin's `generateFileURL` (`${publicEndpoint}/${key}` with the key
 * appended VERBATIM, no percent-encoding), so URLs reconstructed here compare equal to the ones
 * the Payload-on-Mongo getters serve today.
 *
 * @param baseUrl - The CDN base URL (see {@link resolveMediaCdnBaseUrl}); trailing slashes are tolerated.
 * @param key - The preserved object key (`prefix/filename`, or `filename` alone when unprefixed).
 * @returns The absolute serving URL for the object.
 */
export function mediaUrlForStorageKey(baseUrl: string, key: string): string {
    return `${baseUrl.replace(/\/+$/, '')}/${key}`;
}

/**
 * Derives the storage key of one frozen derivative size from its original's key, following
 * Payload's upload-size filename convention: `-{width}x{height}` inserted before the final
 * segment's extension (`prefix/photo.png` → `prefix/photo-320x240.png`; an extensionless filename
 * gets a plain suffix). This is how the legacy bucket actually names the size objects, so the
 * transitional scheme can address all four sizes without a database lookup.
 *
 * @param key - The original object's preserved key.
 * @param size - The frozen derivative size whose key to derive.
 * @returns The derivative object's storage key.
 */
export function mediaDerivativeStorageKey(key: string, size: MediaImageSize): string {
    const slash = key.lastIndexOf('/');
    const directory = slash === -1 ? '' : key.slice(0, slash + 1);
    const filename = slash === -1 ? key : key.slice(slash + 1);
    const dot = filename.lastIndexOf('.');
    const suffix = `-${size.width}x${size.height}`;
    if (dot <= 0) return `${directory}${filename}${suffix}`;
    return `${directory}${filename.slice(0, dot)}${suffix}${filename.slice(dot)}`;
}
