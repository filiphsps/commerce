import { DomainVerificationError } from '@nordcom/commerce-errors';

/** DNS record type → its numeric code in the Google DoH JSON response. */
const TYPE_CODE: Record<'A' | 'CNAME', number> = { A: 1, CNAME: 5 };

/** One entry of the Google DoH JSON `Answer` array. */
type DohAnswer = { name: string; type: number; data: string };

/**
 * Resolves a hostname's records via the Google DNS-over-HTTPS JSON API. Pure `fetch`, so it works in
 * any runtime and is trivially mocked in tests. CNAME targets are lowercased with the trailing dot
 * stripped for direct comparison against our record targets. An empty / NXDOMAIN answer returns `[]`
 * (a clean "not pointed yet"); a transport-level failure throws so the caller can surface "couldn't
 * check, retry" rather than mislabel the domain as failed.
 *
 * @param name - The hostname to resolve.
 * @param type - `'A'` or `'CNAME'`.
 * @returns The matching record data values, normalized; `[]` when none exist.
 * @throws {DomainVerificationError} When the DoH endpoint returns a non-200 response.
 */
export async function resolveDns(name: string, type: 'A' | 'CNAME'): Promise<string[]> {
    const url = `https://dns.google/resolve?name=${encodeURIComponent(name)}&type=${type}`;
    const response = await fetch(url, { headers: { accept: 'application/dns-json' } });
    if (!response.ok) {
        throw new DomainVerificationError(`DNS lookup for ${name} failed (${response.status}).`);
    }
    const body = (await response.json()) as { Answer?: DohAnswer[] };
    const answers = body.Answer ?? [];
    return answers
        .filter((answer) => answer.type === TYPE_CODE[type])
        .map((answer) => answer.data.replace(/\.$/, '').toLowerCase());
}
