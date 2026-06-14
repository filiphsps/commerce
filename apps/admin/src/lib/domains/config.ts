import 'server-only';

/** Resolved Vercel provisioning creds, or `null` when the admin is not wired to a Vercel project. */
export type VercelConfig = { token: string; projectId: string; teamId?: string };

/**
 * Reads the admin's Vercel provisioning creds from the environment. Returns `null` unless BOTH a
 * token and the storefront project id are present, so the verify path cleanly degrades to the DoH
 * DNS check in dev / self-host deployments that never set them.
 *
 * @returns The {@link VercelConfig}, or `null` when provisioning is unavailable.
 */
export function getVercelConfig(): VercelConfig | null {
    const token = process.env.VERCEL_TOKEN;
    const projectId = process.env.VERCEL_STOREFRONT_PROJECT_ID;
    if (!token || !projectId) {
        return null;
    }
    const teamId = process.env.VERCEL_TEAM_ID;
    return { token, projectId, ...(teamId ? { teamId } : {}) };
}

/**
 * Whether Vercel provisioning is configured.
 *
 * @returns `true` when {@link getVercelConfig} resolves a non-null config.
 */
export function hasVercelCreds(): boolean {
    return getVercelConfig() !== null;
}
