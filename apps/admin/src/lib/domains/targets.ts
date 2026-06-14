/** Vercel's documented anycast A record for apex custom domains. */
export const VERCEL_A_RECORD = '76.76.21.21';
/** Vercel's documented CNAME target for subdomain custom domains. */
export const VERCEL_CNAME_TARGET = 'cname.vercel-dns.com';

/** One DNS record the operator should create. `host` distinguishes the apex vs subdomain form. */
export type RecordInstruction = { kind: 'A' | 'CNAME'; host: 'apex' | 'subdomain'; value: string };

/**
 * Whether a hostname is a local-development domain that should auto-verify without any network
 * call. Covers bare `localhost` and any `*.localhost` (portless dev hostnames).
 *
 * @param domain - The normalized hostname.
 * @returns `true` for localhost domains.
 */
export function isLocalhostDomain(domain: string): boolean {
    return domain === 'localhost' || domain.endsWith('.localhost');
}

/**
 * Builds the DNS records to display on the connect screen. With Vercel creds the operator points at
 * Vercel directly (CNAME for a subdomain, A for an apex); without them they CNAME at `SERVICE_DOMAIN`
 * (the wildcard path). Both forms are shown so the operator picks the one matching their domain.
 *
 * @param input - `hasVercel` (whether the admin holds Vercel creds) and `serviceDomain` (the
 *   fallback CNAME target).
 * @returns The records to render.
 */
export function buildRecordInstructions(input: { hasVercel: boolean; serviceDomain: string }): RecordInstruction[] {
    if (input.hasVercel) {
        return [
            { kind: 'CNAME', host: 'subdomain', value: VERCEL_CNAME_TARGET },
            { kind: 'A', host: 'apex', value: VERCEL_A_RECORD },
        ];
    }
    return [{ kind: 'CNAME', host: 'subdomain', value: input.serviceDomain }];
}
