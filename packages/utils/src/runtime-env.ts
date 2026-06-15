/**
 * Client-safe runtime environment helpers.
 *
 * Centralizes the deployment-tier decision so call sites never hand-roll `process.env.NODE_ENV`
 * comparisons. `NODE_ENV` alone is misleading on Vercel: every build — production, preview, and
 * staging — runs with `NODE_ENV === 'production'`, so a raw `=== 'production'` check treats preview
 * deploys as production (the defect that surfaced the storefront live-chat launcher on previews).
 *
 * Both helpers read `process.env` members literally so Next.js can inline `process.env.NODE_ENV` into
 * client bundles. `process.env.VERCEL_ENV` is server-only — it is `undefined` in the browser, where
 * the preview tier cannot be derived from the environment at all. For client-side preview gating that
 * must account for preview/staging deploys, use a host-aware check against the request hostname
 * instead of these helpers.
 */

/**
 * Whether the current runtime is a real production deployment.
 *
 * @returns `true` only when `NODE_ENV` is `'production'` and the deploy is not a Vercel preview.
 */
export function isProduction(): boolean {
    return process.env.NODE_ENV === 'production' && process.env.VERCEL_ENV !== 'preview';
}

/**
 * Whether the current runtime is local development. Excludes `test` and Vercel `preview`.
 *
 * @returns `true` when `NODE_ENV` or `VERCEL_ENV` is `'development'`.
 */
export function isDevelopment(): boolean {
    return process.env.NODE_ENV === 'development' || process.env.VERCEL_ENV === 'development';
}
