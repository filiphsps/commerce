import { MissingEnvironmentVariableError } from '@nordcom/commerce-errors';

export type DocsEnv = {
    /** Path prefix for all internal URLs. Empty for root deployments; '/commerce' for GH Pages; '/docs' for microfrontend. */
    basePath: string;
    /** Absolute canonical URL for sitemap, OG, and <link rel="canonical">. No trailing slash. */
    canonicalUrl: string;
    /** True when this is a production build that must have all env set. */
    isProduction: boolean;
};

const DEV_DEFAULT_CANONICAL = 'http://localhost:3002';

export function resolveDocsEnv(env: Record<string, string | undefined> = process.env): DocsEnv {
    const isProduction = env.NODE_ENV === 'production';
    const rawBasePath = env.NEXT_PUBLIC_DOCS_BASE_PATH ?? '';
    const rawCanonical = env.NEXT_PUBLIC_DOCS_CANONICAL_URL ?? '';

    const basePath = normalizeBasePath(rawBasePath);
    const vercelCanonical = deriveVercelCanonical(env, basePath);

    let canonical: string;
    if (rawCanonical) {
        canonical = rawCanonical;
    } else if (vercelCanonical) {
        canonical = vercelCanonical;
    } else if (isProduction) {
        throw new MissingEnvironmentVariableError(
            'NEXT_PUBLIC_DOCS_CANONICAL_URL',
            'Set it in your deploy environment (Vercel project settings or GH Actions workflow env). Vercel preview/branch deployments fall back to VERCEL_URL automatically when this is unset.',
        );
    } else {
        canonical = DEV_DEFAULT_CANONICAL;
    }

    const canonicalUrl = canonical.replace(/\/+$/, '');

    return { basePath, canonicalUrl, isProduction };
}

function normalizeBasePath(raw: string): string {
    if (!raw) return '';
    const trimmed = raw.replace(/\/+$/, '');
    return trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
}

/**
 * Derive a canonical URL from Vercel system env vars when no explicit
 * `NEXT_PUBLIC_DOCS_CANONICAL_URL` is provided. Returns `null` when not on Vercel.
 *
 * Vercel injects these at build time (https://vercel.com/docs/projects/environment-variables/system-environment-variables):
 *   - `VERCEL=1`
 *   - `VERCEL_ENV` = 'production' | 'preview' | 'development'
 *   - `VERCEL_URL` = unique per-deployment host (no protocol)
 *   - `VERCEL_BRANCH_URL` = stable per-branch host (preview only)
 *   - `VERCEL_PROJECT_PRODUCTION_URL` = stable production host
 *
 * Production prefers the project's stable production host; previews prefer the
 * branch host (stable across redeploys of the same branch) and fall back to the
 * unique deployment host.
 */
function deriveVercelCanonical(env: Record<string, string | undefined>, basePath: string): string | null {
    if (!env.VERCEL && !env.VERCEL_URL) return null;

    const vercelEnv = env.VERCEL_ENV;
    const host =
        vercelEnv === 'production'
            ? (env.VERCEL_PROJECT_PRODUCTION_URL ?? env.VERCEL_URL)
            : (env.VERCEL_BRANCH_URL ?? env.VERCEL_URL);

    if (!host) return null;
    return `https://${host}${basePath}`;
}

/** Singleton resolved at module load — most callers want this. */
export const docsEnv: DocsEnv = resolveDocsEnv();
