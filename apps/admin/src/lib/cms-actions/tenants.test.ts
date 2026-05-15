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

import { createTenantAction, deleteTenantAction, updateTenantAction } from './tenants';

// ------------------------------------------------------------------
// Fixtures
// ------------------------------------------------------------------

const TENANT_ID = 'tenant-abc123';

const ADMIN_USER = {
    id: 'user-1',
    email: 'admin@example.com',
    role: 'admin' as const,
    tenants: [],
    collection: 'users' as const,
};

const EDITOR_USER = {
    id: 'user-2',
    email: 'editor@example.com',
    role: 'editor' as const,
    tenants: [],
    collection: 'users' as const,
};

const EXISTING_TENANT = {
    id: TENANT_ID,
    name: 'Acme Store',
    slug: 'acme',
    defaultLocale: 'en-US',
    locales: ['en-US'],
    shopId: 'shop-1',
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

type AnyUser = { id: string; email: string; role: string; tenants: unknown[]; collection: 'users' };

function makePayload({
    existingDoc = EXISTING_TENANT as unknown,
    createResult = { id: 'tenant-new' } as unknown,
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
        // tenant is null — admin routes are cross-tenant
        tenant: null,
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
// createTenantAction
// ------------------------------------------------------------------

describe('createTenantAction', () => {
    beforeEach(() => {
        mockGetAuthedPayloadCtx.mockReset();
        mockRevalidatePath.mockReset();
        mockNotFound.mockReset().mockImplementation((): never => {
            throw new Error('NEXT_NOT_FOUND');
        });
    });

    it('creates a doc with all required fields, returns id, and revalidates list', async () => {
        const payload = makePayload({ createResult: { id: 'tenant-new-1' } });
        mockGetAuthedPayloadCtx.mockResolvedValue(makeCtx(payload));

        const formData = makeFormData({
            name: 'Acme Store',
            slug: 'acme',
            defaultLocale: 'en-US',
            locales: ['en-US'],
        });
        const result = await createTenantAction(formData);

        expect(payload.create).toHaveBeenCalledWith(
            expect.objectContaining({
                collection: 'tenants',
                data: expect.objectContaining({
                    name: 'Acme Store',
                    slug: 'acme',
                    defaultLocale: 'en-US',
                    locales: ['en-US'],
                }),
                user: ADMIN_USER,
                overrideAccess: false,
            }),
        );
        expect(result).toEqual({ id: 'tenant-new-1' });
        expect(mockRevalidatePath).toHaveBeenCalledWith('/tenants/');
    });

    it('throws when name is missing', async () => {
        const payload = makePayload();
        mockGetAuthedPayloadCtx.mockResolvedValue(makeCtx(payload));

        const formData = makeFormData({ slug: 'acme', defaultLocale: 'en-US', locales: ['en-US'] });
        await expect(createTenantAction(formData)).rejects.toThrow('Name is required');
        expect(payload.create).not.toHaveBeenCalled();
    });

    it('throws when slug is missing', async () => {
        const payload = makePayload();
        mockGetAuthedPayloadCtx.mockResolvedValue(makeCtx(payload));

        const formData = makeFormData({ name: 'Acme', defaultLocale: 'en-US', locales: ['en-US'] });
        await expect(createTenantAction(formData)).rejects.toThrow('Slug is required');
        expect(payload.create).not.toHaveBeenCalled();
    });

    it('throws when defaultLocale is missing', async () => {
        const payload = makePayload();
        mockGetAuthedPayloadCtx.mockResolvedValue(makeCtx(payload));

        const formData = makeFormData({ name: 'Acme', slug: 'acme', locales: ['en-US'] });
        await expect(createTenantAction(formData)).rejects.toThrow('Default locale is required');
        expect(payload.create).not.toHaveBeenCalled();
    });

    it('throws when locales is missing', async () => {
        const payload = makePayload();
        mockGetAuthedPayloadCtx.mockResolvedValue(makeCtx(payload));

        const formData = makeFormData({ name: 'Acme', slug: 'acme', defaultLocale: 'en-US' });
        await expect(createTenantAction(formData)).rejects.toThrow('At least one locale is required');
        expect(payload.create).not.toHaveBeenCalled();
    });

    it('throws when locales is an empty array', async () => {
        const payload = makePayload();
        mockGetAuthedPayloadCtx.mockResolvedValue(makeCtx(payload));

        const formData = makeFormData({ name: 'Acme', slug: 'acme', defaultLocale: 'en-US', locales: [] });
        await expect(createTenantAction(formData)).rejects.toThrow('At least one locale is required');
        expect(payload.create).not.toHaveBeenCalled();
    });

    it('does not set _status (tenants have no drafts)', async () => {
        const payload = makePayload({ createResult: { id: 'tenant-x' } });
        mockGetAuthedPayloadCtx.mockResolvedValue(makeCtx(payload));

        const formData = makeFormData({
            name: 'Acme',
            slug: 'acme',
            defaultLocale: 'en-US',
            locales: ['en-US'],
        });
        await createTenantAction(formData);

        const createCall = payload.create.mock.calls[0]?.[0] as { data: Record<string, unknown> };
        expect(createCall.data).not.toHaveProperty('_status');
    });
});

// ------------------------------------------------------------------
// updateTenantAction
// ------------------------------------------------------------------

describe('updateTenantAction', () => {
    beforeEach(() => {
        mockGetAuthedPayloadCtx.mockReset();
        mockRevalidatePath.mockReset();
        mockNotFound.mockReset().mockImplementation((): never => {
            throw new Error('NEXT_NOT_FOUND');
        });
    });

    it('updates the doc and revalidates list + detail paths', async () => {
        const payload = makePayload();
        mockGetAuthedPayloadCtx.mockResolvedValue(makeCtx(payload));

        const formData = makeFormData({ name: 'Acme Updated', slug: 'acme', defaultLocale: 'en-US', locales: ['en-US'] });
        await updateTenantAction(TENANT_ID, formData);

        expect(payload.update).toHaveBeenCalledWith(
            expect.objectContaining({
                collection: 'tenants',
                id: TENANT_ID,
                data: expect.objectContaining({ name: 'Acme Updated' }),
                user: ADMIN_USER,
                overrideAccess: false,
            }),
        );
        expect(mockRevalidatePath).toHaveBeenCalledWith('/tenants/');
        expect(mockRevalidatePath).toHaveBeenCalledWith(`/tenants/${TENANT_ID}/`);
    });

    it('editor: calls notFound without updating', async () => {
        const payload = makePayload();
        mockGetAuthedPayloadCtx.mockResolvedValue(makeCtx(payload, EDITOR_USER));

        const formData = makeFormData({ name: 'Acme', slug: 'acme', defaultLocale: 'en-US', locales: ['en-US'] });
        await expect(updateTenantAction(TENANT_ID, formData)).rejects.toThrow('NEXT_NOT_FOUND');
        expect(payload.update).not.toHaveBeenCalled();
    });
});

// ------------------------------------------------------------------
// deleteTenantAction
// ------------------------------------------------------------------

describe('deleteTenantAction', () => {
    beforeEach(() => {
        mockGetAuthedPayloadCtx.mockReset();
        mockRevalidatePath.mockReset();
        mockNotFound.mockReset().mockImplementation((): never => {
            throw new Error('NEXT_NOT_FOUND');
        });
    });

    it('admin: calls delete and revalidates list', async () => {
        const payload = makePayload();
        mockGetAuthedPayloadCtx.mockResolvedValue(makeCtx(payload));

        await deleteTenantAction(TENANT_ID);

        expect(payload.delete).toHaveBeenCalledWith(
            expect.objectContaining({
                collection: 'tenants',
                id: TENANT_ID,
                user: ADMIN_USER,
                overrideAccess: false,
            }),
        );
        expect(mockRevalidatePath).toHaveBeenCalledWith('/tenants/');
    });

    it('editor: calls notFound without deleting', async () => {
        const payload = makePayload();
        mockGetAuthedPayloadCtx.mockResolvedValue(makeCtx(payload, EDITOR_USER));

        await expect(deleteTenantAction(TENANT_ID)).rejects.toThrow('NEXT_NOT_FOUND');
        expect(payload.delete).not.toHaveBeenCalled();
        expect(mockRevalidatePath).not.toHaveBeenCalled();
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

    it('treats a missing _payload key as an empty submission (no error)', async () => {
        const payload = makePayload();
        mockGetAuthedPayloadCtx.mockResolvedValue(makeCtx(payload));

        const formData = new FormData(); // no _payload
        await updateTenantAction(TENANT_ID, formData);

        // Should still call update with empty parsed data, not throw
        expect(payload.update).toHaveBeenCalled();
    });

    it('throws when _payload contains invalid JSON', async () => {
        const payload = makePayload();
        mockGetAuthedPayloadCtx.mockResolvedValue(makeCtx(payload));

        const formData = new FormData();
        formData.append('_payload', '{ this is not: valid json');

        const consoleErrSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        try {
            await expect(updateTenantAction(TENANT_ID, formData)).rejects.toThrow('Malformed form payload');
        } finally {
            consoleErrSpy.mockRestore();
        }

        expect(payload.update).not.toHaveBeenCalled();
    });
});
