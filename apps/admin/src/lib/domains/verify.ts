import { resolveDns } from './dns';
import { VERCEL_A_RECORD, VERCEL_CNAME_TARGET } from './targets';

/** Outcome of a DNS-path connection check. `via` is set only when `connected`. */
export type ConnectionResult = { connected: true; via: 'vercel' | 'service_domain' } | { connected: false };

/** Whether a CNAME target is Vercel's (exact or any `*.vercel-dns.com`). */
function isVercelCname(target: string): boolean {
    return target === VERCEL_CNAME_TARGET || target.endsWith('.vercel-dns.com');
}

/** Whether a CNAME target points at SERVICE_DOMAIN (exact or a subdomain of it). */
function isServiceCname(target: string, serviceDomain: string): boolean {
    return target === serviceDomain || target.endsWith(`.${serviceDomain}`);
}

/**
 * DNS-path connection check (the no-Vercel-creds fallback, and a confirming signal even when Vercel
 * is configured). Resolves the domain's CNAME and A records and accepts EITHER record type pointing
 * at a Vercel target OR at `SERVICE_DOMAIN` — so apex (A) and subdomain (CNAME) both verify without
 * any apex detection. Vercel is preferred over `SERVICE_DOMAIN` when both somehow match.
 *
 * @param input - `domain` (the normalized customer-facing hostname) and `serviceDomain` (the
 *   platform service domain).
 * @returns `{ connected, via }`.
 * @throws {DomainVerificationError} Propagated from {@link resolveDns} on a DoH transport failure.
 */
export async function checkDomainConnection(input: {
    domain: string;
    serviceDomain: string;
}): Promise<ConnectionResult> {
    const { domain, serviceDomain } = input;
    const [cnames, aRecords, serviceIps] = await Promise.all([
        resolveDns(domain, 'CNAME'),
        resolveDns(domain, 'A'),
        serviceDomain ? resolveDns(serviceDomain, 'A') : Promise.resolve<string[]>([]),
    ]);

    if (cnames.some(isVercelCname) || aRecords.includes(VERCEL_A_RECORD)) {
        return { connected: true, via: 'vercel' };
    }
    const serviceIpSet = new Set(serviceIps);
    if (
        (serviceDomain && cnames.some((target) => isServiceCname(target, serviceDomain))) ||
        aRecords.some((ip) => serviceIpSet.has(ip))
    ) {
        return { connected: true, via: 'service_domain' };
    }
    return { connected: false };
}
