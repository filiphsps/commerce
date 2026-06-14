'use server';

import 'server-only';

import { Shop } from '@nordcom/commerce-db';

import { getAuthedCmsCtx } from '@/lib/cms-ctx';
import { getVercelConfig } from '@/lib/domains/config';
import { isLocalhostDomain } from '@/lib/domains/targets';
import { addProjectDomain, getProjectDomainStatus } from '@/lib/domains/vercel';
import { checkDomainConnection } from '@/lib/domains/verify';

/** Result of a verify attempt, surfaced to the connect panel. */
export type VerifyDomainResult = {
    status: 'pending' | 'verified' | 'failed';
    via?: 'vercel' | 'service_domain' | 'localhost';
    error?: string;
};

/**
 * Runs a connection check for a shop's customer-facing domain and persists the outcome on its
 * routing row. `*.localhost` auto-verifies (dev). With Vercel creds it ensures the domain is attached
 * to the storefront project, then reads Vercel's verified/misconfigured view; otherwise it falls back
 * to the DoH DNS check. A domain that simply is not pointed yet stays `pending` (the operator keeps
 * polling); only a transport-level failure during the check is recorded as `failed`. The result is
 * informational — routing is never gated on it.
 *
 * @param domain - The shop's normalized customer-facing hostname (the route's `[domain]`).
 * @returns The new {@link VerifyDomainResult}.
 * @throws When the caller is not an authorized collaborator on `domain` (via `getAuthedCmsCtx`).
 */
export async function verifyDomain(domain: string): Promise<VerifyDomainResult> {
    await getAuthedCmsCtx(domain);

    if (isLocalhostDomain(domain)) {
        await Shop.setDomainVerification(domain, { status: 'verified', via: 'localhost', verifiedAt: Date.now() });
        return { status: 'verified', via: 'localhost' };
    }

    const serviceDomain = process.env.SERVICE_DOMAIN ?? '';
    const vercel = getVercelConfig();

    try {
        if (vercel) {
            await addProjectDomain(vercel, domain);
            const { verified, misconfigured } = await getProjectDomainStatus(vercel, domain);
            if (verified && !misconfigured) {
                await Shop.setDomainVerification(domain, { status: 'verified', via: 'vercel', verifiedAt: Date.now() });
                return { status: 'verified', via: 'vercel' };
            }
            // Vercel not done yet — fall through to a DNS read so a SERVICE_DOMAIN CNAME still counts.
        }

        const result = await checkDomainConnection({ domain, serviceDomain });
        if (result.connected) {
            await Shop.setDomainVerification(domain, { status: 'verified', via: result.via, verifiedAt: Date.now() });
            return { status: 'verified', via: result.via };
        }
        await Shop.setDomainVerification(domain, { status: 'pending' });
        return { status: 'pending' };
    } catch (error) {
        await Shop.setDomainVerification(domain, { status: 'failed' });
        return { status: 'failed', error: error instanceof Error ? error.message : 'Verification failed.' };
    }
}
