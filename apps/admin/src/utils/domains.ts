// Resolves the hostnames used by the admin dashboard and the marketing/landing site.
// Both are configured via env vars and fall back to the portless dev hostnames
// (admin.localhost, landing.localhost), so the app still boots when the vars are
// missing in dev or preview environments.
//
// Throwing on missing values at module-import time would also kill `next build`'s
// page-data-collection step (Next.js executes route modules during the build to
// gather metadata, before runtime env is necessarily fully wired). Log loudly
// instead — Vercel deploys will surface the warning in build logs and a
// misconfigured prod still fails predictably (the resulting `localhost` host
// makes any OAuth callback obviously broken).
const isProductionRuntime = process.env.NODE_ENV === 'production' && process.env.VERCEL_ENV !== 'preview';
const isBuildPhase = process.env.NEXT_PHASE === 'phase-production-build';

/**
 * Reads an env var by name and returns it, or logs an error in production and returns the fallback.
 *
 * @param envName - Which domain-host env var to look up; must be one of `'ADMIN_DOMAIN'` or `'LANDING_DOMAIN'`.
 * @param fallback - The default value returned when the env var is absent or empty.
 * @returns The resolved hostname string.
 */
const requireOrFallback = (envName: 'ADMIN_DOMAIN' | 'LANDING_DOMAIN', fallback: string): string => {
    const value = process.env[envName];
    if (value && value.length > 0) return value;
    if (isProductionRuntime && !isBuildPhase) {
        console.error(
            `[admin/domains] ${envName} is required in production but was not set — falling back to "${fallback}". OAuth flows and cookie domains will be broken until this env var is configured.`,
        );
    }
    return fallback;
};

const ADMIN_HOSTNAME = requireOrFallback('ADMIN_DOMAIN', 'admin.localhost');
const LANDING_HOSTNAME = requireOrFallback('LANDING_DOMAIN', 'landing.localhost');

// Portless serves HTTPS for .localhost URLs in dev, so the protocol is always https.
/** Returns the protocol string for the resolved admin URL; always `"https"` since portless serves HTTPS for all environments. @returns The literal string `"https"`. */
const protocolFor = () => 'https' as const;

export const ADMIN_DOMAIN = ADMIN_HOSTNAME;
export const LANDING_DOMAIN = LANDING_HOSTNAME;
export const ADMIN_URL = `${protocolFor()}://${ADMIN_HOSTNAME}`;
export const LANDING_URL = `${protocolFor()}://${LANDING_HOSTNAME}`;
