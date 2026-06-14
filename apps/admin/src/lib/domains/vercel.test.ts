import { afterEach, describe, expect, it, vi } from 'vitest';

import { addProjectDomain, getProjectDomainStatus } from './vercel';

const config = { token: 'tok', projectId: 'prj_1' };
afterEach(() => vi.restoreAllMocks());

/**
 * Queues ordered `fetch` responses.
 *
 * @param responses - One `{ ok, status, body }` per expected call, in order.
 * @returns The fetch spy.
 */
function mockFetch(...responses: Array<{ ok: boolean; status: number; body: unknown }>) {
    const fetchMock = vi.spyOn(globalThis, 'fetch');
    for (const r of responses) {
        fetchMock.mockResolvedValueOnce({ ok: r.ok, status: r.status, json: async () => r.body } as Response);
    }
    return fetchMock;
}

describe('addProjectDomain', () => {
    it('resolves on a 200 add with a single call', async () => {
        const fetchMock = mockFetch({ ok: true, status: 200, body: { name: 'shop.acme.com', verified: false } });
        await expect(addProjectDomain(config, 'shop.acme.com')).resolves.toBeUndefined();
        expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('treats a failed add as success when the domain is already on this project (idempotent)', async () => {
        const fetchMock = mockFetch(
            { ok: false, status: 400, body: { error: { message: 'already exists' } } },
            { ok: true, status: 200, body: { name: 'shop.acme.com', verified: true } },
        );
        await expect(addProjectDomain(config, 'shop.acme.com')).resolves.toBeUndefined();
        expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it('throws when the add fails and the domain is not on this project', async () => {
        mockFetch(
            { ok: false, status: 409, body: { error: { message: 'assigned to another project' } } },
            { ok: false, status: 404, body: {} },
        );
        await expect(addProjectDomain(config, 'shop.acme.com')).rejects.toThrow();
    });
});

describe('getProjectDomainStatus', () => {
    it('maps verified + config into a status', async () => {
        mockFetch(
            { ok: true, status: 200, body: { verified: true } },
            { ok: true, status: 200, body: { misconfigured: false } },
        );
        expect(await getProjectDomainStatus(config, 'shop.acme.com')).toEqual({ verified: true, misconfigured: false });
    });

    it('throws when the domain lookup fails', async () => {
        mockFetch({ ok: false, status: 500, body: {} });
        await expect(getProjectDomainStatus(config, 'shop.acme.com')).rejects.toThrow();
    });
});
