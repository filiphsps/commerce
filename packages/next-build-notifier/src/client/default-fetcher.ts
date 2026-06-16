import type { VersionResponse } from '../shared/types';

/**
 * Default version fetcher: a cache-busted, `no-store` GET of the endpoint, coercing the payload into
 * a {@link VersionResponse}.
 *
 * @param endpoint - The version endpoint path.
 * @returns The parsed version response.
 * @throws {Error} When the response is not OK.
 */
export async function defaultFetcher(endpoint: string): Promise<VersionResponse> {
    const url = `${endpoint}${endpoint.includes('?') ? '&' : '?'}_=${Date.now()}`;
    const res = await fetch(url, {
        cache: 'no-store',
        headers: { accept: 'application/json' },
    });
    if (!res.ok) {
        throw new Error(`next-build-notifier: version endpoint responded ${res.status}`);
    }
    const data = (await res.json()) as Partial<VersionResponse>;
    return { id: String(data.id ?? ''), ts: typeof data.ts === 'number' ? data.ts : 0 };
}
