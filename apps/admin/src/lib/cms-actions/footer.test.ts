import { beforeEach, describe, expect, it, vi } from 'vitest';

// ------------------------------------------------------------------
// Hoisted mock fns
// ------------------------------------------------------------------

const { mockGetAuthedPayloadCtx, mockRevalidatePath } = vi.hoisted(() => ({
    mockGetAuthedPayloadCtx: vi.fn(),
    mockRevalidatePath: vi.fn(),
}));

// ------------------------------------------------------------------
// Mocks
// ------------------------------------------------------------------

vi.mock('server-only', () => ({}));

vi.mock('next/navigation', () => ({
    redirect: (url: string): never => {
        throw new Error(`NEXT_REDIRECT:${url}`);
    },
    notFound: (): never => {
        throw new Error('NEXT_NOT_FOUND');
    },
}));

vi.mock('next/cache', () => ({
    revalidatePath: mockRevalidatePath,
}));

vi.mock('@/lib/payload-ctx', () => ({
    getAuthedPayloadCtx: mockGetAuthedPayloadCtx,
}));

// ------------------------------------------------------------------
// Import SUT after all mocks are registered
// ------------------------------------------------------------------

import { publishFooterAction, saveFooterDraftAction } from './footer';

// ------------------------------------------------------------------
// Fixtures
// ------------------------------------------------------------------

const DOMAIN = 'acme.example.com';

const USER = {
    id: 'user-1',
    email: 'admin@example.com',
    role: 'admin' as const,
    tenants: [{ tenant: 'tenant-1' }],
    collection: 'users' as const,
};

const TENANT = { id: 'tenant-1', slug: 'acme', name: 'Acme Store' };

const EXISTING_DOC = { id: 'doc-1', tenant: 'tenant-1', copyrightLine: '© Acme' };

function makePayload({
    existingDocs = [] as unknown[],
}: {
    existingDocs?: unknown[];
} = {}) {
    return {
        find: vi.fn().mockResolvedValue({ docs: existingDocs }),
        update: vi.fn().mockResolvedValue({ id: 'doc-1' }),
        create: vi.fn().mockResolvedValue({ id: 'doc-new' }),
    };
}

function makeCtx(payload: ReturnType<typeof makePayload>) {
    return {
        payload,
        user: USER,
        tenant: TENANT,
        session: { user: { email: USER.email }, expires: '2099-01-01' },
    };
}

/** Build a FormData whose `_payload` key carries the given object serialized as JSON. */
function makeFormData(data: Record<string, unknown>): FormData {
    const fd = new FormData();
    fd.append('_payload', JSON.stringify(data));
    return fd;
}

// ------------------------------------------------------------------
// Tests
// ------------------------------------------------------------------

describe('saveFooterDraftAction', () => {
    beforeEach(() => {
        mockGetAuthedPayloadCtx.mockReset();
        mockRevalidatePath.mockReset();
    });

    it('creates a new doc with _status: draft when no existing doc is found', async () => {
        const payload = makePayload({ existingDocs: [] });
        mockGetAuthedPayloadCtx.mockResolvedValue(makeCtx(payload));

        const formData = makeFormData({ copyrightLine: '© Acme', sections: [{ title: 'Shop', links: [] }] });
        await saveFooterDraftAction(DOMAIN, formData);

        expect(payload.find).toHaveBeenCalledWith(
            expect.objectContaining({
                collection: 'footer',
                where: { tenant: { equals: TENANT.id } },
                limit: 1,
                user: USER,
                overrideAccess: false,
            }),
        );
        expect(payload.update).not.toHaveBeenCalled();
        expect(payload.create).toHaveBeenCalledWith(
            expect.objectContaining({
                collection: 'footer',
                data: expect.objectContaining({
                    copyrightLine: '© Acme',
                    tenant: TENANT.id,
                    _status: 'draft',
                }),
                user: USER,
                overrideAccess: false,
            }),
        );
        expect(mockRevalidatePath).toHaveBeenCalledWith(`/${DOMAIN}/content/footer/`);
    });

    it('updates the existing doc with _status: draft when an existing doc is found', async () => {
        const payload = makePayload({ existingDocs: [EXISTING_DOC] });
        mockGetAuthedPayloadCtx.mockResolvedValue(makeCtx(payload));

        const formData = makeFormData({ copyrightLine: '© Updated' });
        await saveFooterDraftAction(DOMAIN, formData);

        expect(payload.create).not.toHaveBeenCalled();
        expect(payload.update).toHaveBeenCalledWith(
            expect.objectContaining({
                collection: 'footer',
                id: EXISTING_DOC.id,
                data: expect.objectContaining({
                    copyrightLine: '© Updated',
                    _status: 'draft',
                }),
                user: USER,
                overrideAccess: false,
            }),
        );
        expect(mockRevalidatePath).toHaveBeenCalledWith(`/${DOMAIN}/content/footer/`);
    });
});

describe('publishFooterAction', () => {
    beforeEach(() => {
        mockGetAuthedPayloadCtx.mockReset();
        mockRevalidatePath.mockReset();
    });

    it('creates a new doc with _status: published when no existing doc is found', async () => {
        const payload = makePayload({ existingDocs: [] });
        mockGetAuthedPayloadCtx.mockResolvedValue(makeCtx(payload));

        const formData = makeFormData({ copyrightLine: '© Acme' });
        await publishFooterAction(DOMAIN, formData);

        expect(payload.update).not.toHaveBeenCalled();
        expect(payload.create).toHaveBeenCalledWith(
            expect.objectContaining({
                collection: 'footer',
                data: expect.objectContaining({
                    _status: 'published',
                    tenant: TENANT.id,
                }),
                user: USER,
                overrideAccess: false,
            }),
        );
        expect(mockRevalidatePath).toHaveBeenCalledWith(`/${DOMAIN}/content/footer/`);
    });

    it('updates the existing doc with _status: published when an existing doc is found', async () => {
        const payload = makePayload({ existingDocs: [EXISTING_DOC] });
        mockGetAuthedPayloadCtx.mockResolvedValue(makeCtx(payload));

        const formData = makeFormData({ copyrightLine: '© Final' });
        await publishFooterAction(DOMAIN, formData);

        expect(payload.create).not.toHaveBeenCalled();
        expect(payload.update).toHaveBeenCalledWith(
            expect.objectContaining({
                collection: 'footer',
                id: EXISTING_DOC.id,
                data: expect.objectContaining({
                    _status: 'published',
                }),
                user: USER,
                overrideAccess: false,
            }),
        );
        expect(mockRevalidatePath).toHaveBeenCalledWith(`/${DOMAIN}/content/footer/`);
    });
});

describe('FormData parsing (_payload JSON blob)', () => {
    beforeEach(() => {
        mockGetAuthedPayloadCtx.mockReset();
        mockRevalidatePath.mockReset();
    });

    it('parses nested fields correctly from the _payload JSON blob', async () => {
        const payload = makePayload({ existingDocs: [] });
        mockGetAuthedPayloadCtx.mockResolvedValue(makeCtx(payload));

        const formData = makeFormData({
            copyrightLine: '© Acme Inc.',
            sections: [{ title: 'Company', links: [{ link: { kind: 'external', label: 'About', url: '/about' } }] }],
            social: [{ platform: 'instagram', url: 'https://instagram.com/acme' }],
            legal: [{ link: { kind: 'external', label: 'Privacy', url: '/privacy' } }],
        });

        await saveFooterDraftAction(DOMAIN, formData);

        expect(payload.create).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({
                    copyrightLine: '© Acme Inc.',
                    sections: expect.arrayContaining([
                        expect.objectContaining({ title: 'Company' }),
                    ]),
                    social: expect.arrayContaining([
                        expect.objectContaining({ platform: 'instagram' }),
                    ]),
                    legal: expect.arrayContaining([
                        expect.objectContaining({ link: expect.objectContaining({ label: 'Privacy' }) }),
                    ]),
                }),
            }),
        );
    });

    it('treats a missing _payload key as an empty submission (action completes, minimal data written)', async () => {
        const payload = makePayload({ existingDocs: [] });
        mockGetAuthedPayloadCtx.mockResolvedValue(makeCtx(payload));

        // FormData with no _payload key at all — Payload's <Form> can emit
        // this on initial mount (autosave debounce before any field is
        // touched). Treat as a no-op write rather than failing loudly.
        const formData = new FormData();
        await saveFooterDraftAction(DOMAIN, formData);

        // Should still call create (with `{ tenant, _status }` only), not throw
        expect(payload.create).toHaveBeenCalled();
    });

    it('throws when _payload contains invalid JSON (no payload call, surfaces error to <Form>)', async () => {
        const payload = makePayload({ existingDocs: [] });
        mockGetAuthedPayloadCtx.mockResolvedValue(makeCtx(payload));

        const formData = new FormData();
        formData.append('_payload', '{ this is not: valid json');

        // Suppress the console.error breadcrumb the action emits so the test
        // output stays clean. The throw is what we actually assert on.
        const consoleErrSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        try {
            await expect(saveFooterDraftAction(DOMAIN, formData)).rejects.toThrow('Malformed form payload');
        } finally {
            consoleErrSpy.mockRestore();
        }

        // Nothing must be written when the input is corrupt — otherwise a
        // broken client would silently blank out the operator's real data.
        expect(payload.find).not.toHaveBeenCalled();
        expect(payload.create).not.toHaveBeenCalled();
        expect(payload.update).not.toHaveBeenCalled();
    });
});

describe('Tenant scoping and security', () => {
    beforeEach(() => {
        mockGetAuthedPayloadCtx.mockReset();
        mockRevalidatePath.mockReset();
    });

    it('uses tenant from getAuthedPayloadCtx, not from FormData (cross-tenant forgery prevention)', async () => {
        const payload = makePayload({ existingDocs: [] });
        mockGetAuthedPayloadCtx.mockResolvedValue(makeCtx(payload));

        // Attacker tries to forge a different tenantId in the form payload
        const formData = makeFormData({ copyrightLine: '© Acme', tenant: 'evil-tenant-999' });
        await saveFooterDraftAction(DOMAIN, formData);

        // The find must scope to the REAL tenant from ctx
        expect(payload.find).toHaveBeenCalledWith(
            expect.objectContaining({
                where: { tenant: { equals: TENANT.id } },
            }),
        );
        // The create data must NOT contain the attacker's tenant override
        const createCall = payload.create.mock.calls[0]?.[0] as { data: Record<string, unknown> };
        expect(createCall.data.tenant).toBe(TENANT.id);
        expect(createCall.data.tenant).not.toBe('evil-tenant-999');
    });

    it('forwards user to every payload call so access checks run correctly', async () => {
        const payload = makePayload({ existingDocs: [EXISTING_DOC] });
        mockGetAuthedPayloadCtx.mockResolvedValue(makeCtx(payload));

        const formData = makeFormData({ copyrightLine: '© Test' });
        await publishFooterAction(DOMAIN, formData);

        expect(payload.find).toHaveBeenCalledWith(expect.objectContaining({ user: USER }));
        expect(payload.update).toHaveBeenCalledWith(expect.objectContaining({ user: USER }));
    });
});
