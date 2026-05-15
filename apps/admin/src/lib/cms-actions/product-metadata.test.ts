import { beforeEach, describe, expect, it, vi } from 'vitest';

// ------------------------------------------------------------------
// Hoisted mock fns
// ------------------------------------------------------------------

const { mockGetAuthedPayloadCtx, mockRevalidatePath, mockNotFound } = vi.hoisted(() => ({
    mockGetAuthedPayloadCtx: vi.fn(),
    mockRevalidatePath: vi.fn(),
    mockNotFound: vi.fn((): never => {
        throw new Error('NEXT_NOT_FOUND');
    }),
}));

// ------------------------------------------------------------------
// Mocks
// ------------------------------------------------------------------

vi.mock('server-only', () => ({}));

vi.mock('next/navigation', () => ({
    redirect: (url: string): never => {
        throw new Error(`NEXT_REDIRECT:${url}`);
    },
    notFound: mockNotFound,
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

import { publishProductMetadataAction, saveProductMetadataDraftAction } from './product-metadata';

// ------------------------------------------------------------------
// Fixtures
// ------------------------------------------------------------------

const DOMAIN = 'acme.example.com';
const HANDLE = 'cool-sneakers';

const ADMIN_USER = {
    id: 'user-1',
    email: 'admin@example.com',
    role: 'admin' as const,
    tenants: [{ tenant: 'tenant-1' }],
    collection: 'users' as const,
};

const TENANT = { id: 'tenant-1', slug: 'acme', name: 'Acme Store' };

const EXISTING_DOC = {
    id: 'doc-abc123',
    tenant: 'tenant-1',
    shopifyHandle: HANDLE,
    _status: 'draft' as const,
    updatedAt: '2026-01-01T00:00:00.000Z',
    createdAt: '2026-01-01T00:00:00.000Z',
};

type MockPayload = {
    find: ReturnType<typeof vi.fn>;
    findByID: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
};

type AnyUser = { id: string; email: string; role: string; tenants: { tenant: string }[]; collection: 'users' };

function makePayload({
    existingDoc = EXISTING_DOC as unknown,
    createResult = { id: 'doc-new' } as unknown,
}: {
    existingDoc?: unknown;
    createResult?: unknown;
} = {}): MockPayload {
    return {
        find: vi.fn().mockResolvedValue({ docs: existingDoc ? [existingDoc] : [] }),
        findByID: vi.fn().mockResolvedValue(existingDoc),
        create: vi.fn().mockResolvedValue(createResult),
        update: vi.fn().mockResolvedValue(existingDoc),
        delete: vi.fn().mockResolvedValue({ docs: [] }),
    };
}

function makeCtx(payload: MockPayload, user: AnyUser = ADMIN_USER) {
    return {
        payload,
        user,
        tenant: TENANT,
        session: { user: { email: user.email }, expires: '2099-01-01' },
    };
}

/** Build a FormData whose `_payload` key carries the given object serialized as JSON. */
function makeFormData(data: Record<string, unknown>): FormData {
    const fd = new FormData();
    fd.append('_payload', JSON.stringify(data));
    return fd;
}

// ------------------------------------------------------------------
// saveProductMetadataDraftAction — update path (existing doc)
// ------------------------------------------------------------------

describe('saveProductMetadataDraftAction — update (existing doc)', () => {
    beforeEach(() => {
        mockGetAuthedPayloadCtx.mockReset();
        mockRevalidatePath.mockReset();
        mockNotFound.mockReset().mockImplementation((): never => {
            throw new Error('NEXT_NOT_FOUND');
        });
    });

    it('calls find by (tenant, handle) then update with _status: draft and revalidates', async () => {
        const payload = makePayload();
        mockGetAuthedPayloadCtx.mockResolvedValue(makeCtx(payload));

        const formData = makeFormData({ seo: { title: 'My Product' } });
        await saveProductMetadataDraftAction(DOMAIN, HANDLE, formData);

        // Must query by tenant + handle
        expect(payload.find).toHaveBeenCalledWith(
            expect.objectContaining({
                collection: 'productMetadata',
                where: {
                    and: [{ tenant: { equals: TENANT.id } }, { shopifyHandle: { equals: HANDLE } }],
                },
                limit: 1,
                user: ADMIN_USER,
                overrideAccess: false,
            }),
        );

        // Must update with draft status
        expect(payload.update).toHaveBeenCalledWith(
            expect.objectContaining({
                collection: 'productMetadata',
                id: EXISTING_DOC.id,
                data: expect.objectContaining({ _status: 'draft' }),
                user: ADMIN_USER,
                overrideAccess: false,
            }),
        );
        expect(payload.create).not.toHaveBeenCalled();

        // Revalidates both paths
        expect(mockRevalidatePath).toHaveBeenCalledWith(`/${DOMAIN}/content/product-metadata/`);
        expect(mockRevalidatePath).toHaveBeenCalledWith(`/${DOMAIN}/content/product-metadata/${HANDLE}/`);
    });

    it('shopifyHandle is NOT included in the update data (never from FormData or update spread)', async () => {
        const payload = makePayload();
        mockGetAuthedPayloadCtx.mockResolvedValue(makeCtx(payload));

        // Even if an attacker tries to send shopifyHandle via the form, it must not reach update
        const formData = makeFormData({ shopifyHandle: 'evil-other-product', seo: { title: 'X' } });
        await saveProductMetadataDraftAction(DOMAIN, HANDLE, formData);

        const updateCall = payload.update.mock.calls[0]?.[0] as { data: Record<string, unknown> };
        // The spec mandates shopifyHandle is never in the update payload
        expect(Object.keys(updateCall.data)).not.toContain('shopifyHandle');
    });

    it('tenant is always from context, never from FormData', async () => {
        const payload = makePayload();
        mockGetAuthedPayloadCtx.mockResolvedValue(makeCtx(payload));

        const formData = makeFormData({ tenant: 'evil-tenant-999' });
        await saveProductMetadataDraftAction(DOMAIN, HANDLE, formData);

        const updateCall = payload.update.mock.calls[0]?.[0] as { data: Record<string, unknown> };
        expect(Object.keys(updateCall.data)).not.toContain('tenant');
    });
});

// ------------------------------------------------------------------
// saveProductMetadataDraftAction — create path (no existing doc)
// ------------------------------------------------------------------

describe('saveProductMetadataDraftAction — create (no existing doc)', () => {
    beforeEach(() => {
        mockGetAuthedPayloadCtx.mockReset();
        mockRevalidatePath.mockReset();
        mockNotFound.mockReset().mockImplementation((): never => {
            throw new Error('NEXT_NOT_FOUND');
        });
    });

    it('creates doc when find returns empty, using handle from URL and tenant from ctx', async () => {
        const payload = makePayload({ existingDoc: null, createResult: { id: 'doc-new-1' } });
        mockGetAuthedPayloadCtx.mockResolvedValue(makeCtx(payload));

        const formData = makeFormData({ seo: { title: 'Cool Sneakers' } });
        await saveProductMetadataDraftAction(DOMAIN, HANDLE, formData);

        expect(payload.create).toHaveBeenCalledWith(
            expect.objectContaining({
                collection: 'productMetadata',
                data: expect.objectContaining({
                    shopifyHandle: HANDLE, // from URL, not FormData
                    tenant: TENANT.id,     // from ctx, not FormData
                    _status: 'draft',
                }),
                user: ADMIN_USER,
                overrideAccess: false,
            }),
        );
        expect(payload.update).not.toHaveBeenCalled();

        expect(mockRevalidatePath).toHaveBeenCalledWith(`/${DOMAIN}/content/product-metadata/`);
        expect(mockRevalidatePath).toHaveBeenCalledWith(`/${DOMAIN}/content/product-metadata/${HANDLE}/`);
    });

    it('shopifyHandle in create always comes from URL parameter, ignores FormData shopifyHandle', async () => {
        const payload = makePayload({ existingDoc: null, createResult: { id: 'doc-new-2' } });
        mockGetAuthedPayloadCtx.mockResolvedValue(makeCtx(payload));

        // Attacker injects a different handle via form
        const formData = makeFormData({ shopifyHandle: 'attacker-handle' });
        await saveProductMetadataDraftAction(DOMAIN, HANDLE, formData);

        const createCall = payload.create.mock.calls[0]?.[0] as { data: Record<string, unknown> };
        expect(createCall.data.shopifyHandle).toBe(HANDLE);
        expect(createCall.data.shopifyHandle).not.toBe('attacker-handle');
    });

    it('calls notFound when tenant is null', async () => {
        const payload = makePayload({ existingDoc: null });
        mockGetAuthedPayloadCtx.mockResolvedValue({ payload, user: ADMIN_USER, tenant: null });

        const consoleErrSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        try {
            await expect(saveProductMetadataDraftAction(DOMAIN, HANDLE, new FormData())).rejects.toThrow(
                'NEXT_NOT_FOUND',
            );
        } finally {
            consoleErrSpy.mockRestore();
        }
        expect(payload.find).not.toHaveBeenCalled();
        expect(payload.create).not.toHaveBeenCalled();
    });
});

// ------------------------------------------------------------------
// publishProductMetadataAction
// ------------------------------------------------------------------

describe('publishProductMetadataAction', () => {
    beforeEach(() => {
        mockGetAuthedPayloadCtx.mockReset();
        mockRevalidatePath.mockReset();
        mockNotFound.mockReset().mockImplementation((): never => {
            throw new Error('NEXT_NOT_FOUND');
        });
    });

    it('updates existing doc with _status: published', async () => {
        const payload = makePayload();
        mockGetAuthedPayloadCtx.mockResolvedValue(makeCtx(payload));

        const formData = makeFormData({ seo: { title: 'Published Product' } });
        await publishProductMetadataAction(DOMAIN, HANDLE, formData);

        expect(payload.update).toHaveBeenCalledWith(
            expect.objectContaining({
                collection: 'productMetadata',
                id: EXISTING_DOC.id,
                data: expect.objectContaining({ _status: 'published' }),
                user: ADMIN_USER,
                overrideAccess: false,
            }),
        );
        expect(mockRevalidatePath).toHaveBeenCalledWith(`/${DOMAIN}/content/product-metadata/`);
        expect(mockRevalidatePath).toHaveBeenCalledWith(`/${DOMAIN}/content/product-metadata/${HANDLE}/`);
    });

    it('creates doc with _status: published when no existing doc', async () => {
        const payload = makePayload({ existingDoc: null, createResult: { id: 'doc-pub-new' } });
        mockGetAuthedPayloadCtx.mockResolvedValue(makeCtx(payload));

        const formData = makeFormData({ seo: { title: 'Published New' } });
        await publishProductMetadataAction(DOMAIN, HANDLE, formData);

        expect(payload.create).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({
                    shopifyHandle: HANDLE,
                    tenant: TENANT.id,
                    _status: 'published',
                }),
            }),
        );
    });
});

// ------------------------------------------------------------------
// FormData parsing (_payload JSON blob)
// ------------------------------------------------------------------

describe('FormData parsing (_payload JSON blob)', () => {
    beforeEach(() => {
        mockGetAuthedPayloadCtx.mockReset();
        mockRevalidatePath.mockReset();
        mockNotFound.mockReset().mockImplementation((): never => {
            throw new Error('NEXT_NOT_FOUND');
        });
    });

    it('parses blocks and seo from the _payload JSON blob', async () => {
        const payload = makePayload();
        mockGetAuthedPayloadCtx.mockResolvedValue(makeCtx(payload));

        const formData = makeFormData({
            blocks: [{ blockType: 'richText', content: { root: {} } }],
            seo: { title: 'Product SEO', description: 'Great shoes', noindex: false },
        });
        await saveProductMetadataDraftAction(DOMAIN, HANDLE, formData);

        expect(payload.update).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({
                    blocks: expect.arrayContaining([expect.objectContaining({ blockType: 'richText' })]),
                    seo: expect.objectContaining({ title: 'Product SEO', description: 'Great shoes' }),
                }),
            }),
        );
    });

    it('treats a missing _payload key as an empty submission (action completes, no error)', async () => {
        const payload = makePayload();
        mockGetAuthedPayloadCtx.mockResolvedValue(makeCtx(payload));

        const formData = new FormData(); // no _payload
        await saveProductMetadataDraftAction(DOMAIN, HANDLE, formData);

        // Should still call update (with `{ _status: 'draft' }` only), not throw
        expect(payload.update).toHaveBeenCalled();
    });

    it('throws when _payload contains invalid JSON', async () => {
        const payload = makePayload();
        mockGetAuthedPayloadCtx.mockResolvedValue(makeCtx(payload));

        const formData = new FormData();
        formData.append('_payload', '{ this is not: valid json');

        const consoleErrSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        try {
            await expect(saveProductMetadataDraftAction(DOMAIN, HANDLE, formData)).rejects.toThrow(
                'Malformed form payload',
            );
        } finally {
            consoleErrSpy.mockRestore();
        }

        // Nothing must be written when the input is corrupt
        expect(payload.find).not.toHaveBeenCalled();
        expect(payload.create).not.toHaveBeenCalled();
        expect(payload.update).not.toHaveBeenCalled();
    });

    it('_status is always server-determined, never from FormData', async () => {
        const payload = makePayload({ existingDoc: null, createResult: { id: 'doc-x' } });
        mockGetAuthedPayloadCtx.mockResolvedValue(makeCtx(payload));

        // Attacker tries to force _status: published via form
        const formData = makeFormData({ _status: 'published' });
        await saveProductMetadataDraftAction(DOMAIN, HANDLE, formData);

        const createCall = payload.create.mock.calls[0]?.[0] as { data: Record<string, unknown> };
        // The action hardcodes 'draft' for saveProductMetadataDraftAction
        expect(createCall.data._status).toBe('draft');
    });
});
