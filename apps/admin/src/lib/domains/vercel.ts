import 'server-only';

import { DomainVerificationError } from '@nordcom/commerce-errors';

import type { VercelConfig } from './config';

/** Appends the optional team scope to a Vercel API path, preserving any existing query string. */
function withTeam(path: string, config: VercelConfig): string {
    if (!config.teamId) {
        return path;
    }
    return `${path}${path.includes('?') ? '&' : '?'}teamId=${config.teamId}`;
}

/** Authorized fetch against the Vercel REST API. */
function vercelFetch(config: VercelConfig, path: string, init?: RequestInit): Promise<Response> {
    return fetch(`https://api.vercel.com${withTeam(path, config)}`, {
        ...init,
        headers: { authorization: `Bearer ${config.token}`, 'content-type': 'application/json', ...init?.headers },
    });
}

/**
 * Adds a custom domain to the storefront Vercel project, idempotently. A successful add returns
 * `200`; a re-add of a domain ALREADY on this project returns a non-2xx (Vercel uses `400`/`409`).
 * To stay idempotent without guessing status codes, a failed add is reconciled by a direct GET — if
 * the domain is already on this project the GET resolves `200` and the add is treated as done. Only a
 * domain genuinely absent from the project (e.g. claimed by ANOTHER Vercel project, or an auth/quota
 * failure) surfaces as an error.
 *
 * @param config - The storefront project's Vercel creds.
 * @param domain - The customer-facing hostname to attach.
 * @throws {DomainVerificationError} When the domain could neither be added nor found on the project.
 */
export async function addProjectDomain(config: VercelConfig, domain: string): Promise<void> {
    const response = await vercelFetch(config, `/v10/projects/${config.projectId}/domains`, {
        method: 'POST',
        body: JSON.stringify({ name: domain }),
    });
    if (response.ok) {
        return;
    }
    const existing = await vercelFetch(config, `/v9/projects/${config.projectId}/domains/${domain}`);
    if (existing.ok) {
        return;
    }
    const body = (await response.json().catch(() => ({}))) as { error?: { message?: string } };
    throw new DomainVerificationError(
        `Vercel rejected adding ${domain} (${response.status}): ${body.error?.message ?? 'unknown error'}.`,
    );
}

/**
 * Reads Vercel's view of a project domain: whether Vercel has verified ownership (the domain is an
 * active alias on the project) and whether its DNS is currently misconfigured (Vercel cannot yet
 * issue a TLS cert). The connect screen renders `verified && !misconfigured` as connected.
 *
 * @param config - The storefront project's Vercel creds.
 * @param domain - The customer-facing hostname.
 * @returns `{ verified, misconfigured }`.
 * @throws {DomainVerificationError} When either Vercel call fails.
 */
export async function getProjectDomainStatus(
    config: VercelConfig,
    domain: string,
): Promise<{ verified: boolean; misconfigured: boolean }> {
    const domainResponse = await vercelFetch(config, `/v9/projects/${config.projectId}/domains/${domain}`);
    if (!domainResponse.ok) {
        throw new DomainVerificationError(`Vercel domain lookup for ${domain} failed (${domainResponse.status}).`);
    }
    const verified = Boolean(((await domainResponse.json()) as { verified?: boolean }).verified);

    const configResponse = await vercelFetch(
        config,
        `/v6/domains/${domain}/config?projectIdOrName=${config.projectId}`,
    );
    if (!configResponse.ok) {
        throw new DomainVerificationError(`Vercel config lookup for ${domain} failed (${configResponse.status}).`);
    }
    const misconfigured = Boolean(((await configResponse.json()) as { misconfigured?: boolean }).misconfigured);

    return { verified, misconfigured };
}
