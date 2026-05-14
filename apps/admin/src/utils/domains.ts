// Resolves the hostnames used by the admin dashboard and the marketing/landing site.
// Both are configured via env vars and fall back to the local dev ports declared in
// CLAUDE.md (admin: 3000, landing: 3001), so the app still boots when the vars are
// missing in dev or preview environments.
//
// In production, however, missing values silently broke OAuth: Shopify
// install would redirect back to `localhost:3000`, and the admin session
// cookie would be scoped to the wrong parent domain. Fail fast so prod
// deploys can't ship in that state.
const isProductionRuntime = process.env.NODE_ENV === 'production' && process.env.VERCEL_ENV !== 'preview';

const requireOrFallback = (envName: 'ADMIN_DOMAIN' | 'LANDING_DOMAIN', fallback: string): string => {
    const value = process.env[envName];
    if (value && value.length > 0) return value;
    if (isProductionRuntime) {
        throw new Error(`[admin/domains] ${envName} is required in production but was not set.`);
    }
    return fallback;
};

const ADMIN_HOSTNAME = requireOrFallback('ADMIN_DOMAIN', 'localhost:3000');
const LANDING_HOSTNAME = requireOrFallback('LANDING_DOMAIN', 'localhost:3001');

const protocolFor = (hostname: string) => (hostname.startsWith('localhost') ? 'http' : 'https');

export const ADMIN_DOMAIN = ADMIN_HOSTNAME;
export const LANDING_DOMAIN = LANDING_HOSTNAME;
export const ADMIN_URL = `${protocolFor(ADMIN_HOSTNAME)}://${ADMIN_HOSTNAME}`;
export const LANDING_URL = `${protocolFor(LANDING_HOSTNAME)}://${LANDING_HOSTNAME}`;
