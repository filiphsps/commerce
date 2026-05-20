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

    if (isProduction && !rawCanonical) {
        throw new Error(
            'NEXT_PUBLIC_DOCS_CANONICAL_URL is required for production builds. ' +
                'Set it in your deploy environment (Vercel project settings or GH Actions workflow env).',
        );
    }

    const basePath = normalizeBasePath(rawBasePath);
    const canonicalUrl = (rawCanonical || DEV_DEFAULT_CANONICAL).replace(/\/+$/, '');

    return { basePath, canonicalUrl, isProduction };
}

function normalizeBasePath(raw: string): string {
    if (!raw) return '';
    const trimmed = raw.replace(/\/+$/, '');
    return trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
}

/** Singleton resolved at module load — most callers want this. */
export const docsEnv: DocsEnv = resolveDocsEnv();
