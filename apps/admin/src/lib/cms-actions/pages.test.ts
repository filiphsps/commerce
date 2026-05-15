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

import {
    bulkDeletePagesAction,
    bulkPublishPagesAction,
    createPageAction,
    deletePageAction,
    publishPageAction,
    savePageDraftAction,
} from './pages';

// ------------------------------------------------------------------
// Fixtures
// ------------------------------------------------------------------

const DOMAIN = 'acme.example.com';
const PAGE_ID = 'page-abc123';

const ADMIN_USER = {
    id: 'user-1',
    email: 'admin@example.com',
    role: 'admin' as const,
    tenants: [{ tenant: 'tenant-1' }],
    collection: 'users' as const,
};

const EDITOR_USER = {
    id: 'user-2',
    email: 'editor@example.com',
    role: 'editor' as const,
    tenants: [{ tenant: 'tenant-1' }],
    collection: 'users' as const,
};

const TENANT = { id: 'tenant-1', slug: 'acme', name: 'Acme Store' };

const EXISTING_PAGE = {
    id: PAGE_ID,
    tenant: 'tenant-1',
    title: 'Home',
    slug: 'home',
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
    existingDoc = EXISTING_PAGE as unknown,
    createResult = { id: 'page-new' } as unknown,
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
// createPageAction
// ------------------------------------------------------------------

describe('createPageAction', () => {
    beforeEach(() => {
        mockGetAuthedPayloadCtx.mockReset();
        mockRevalidatePath.mockReset();
        mockNotFound.mockReset().mockImplementation((): never => {
            throw new Error('NEXT_NOT_FOUND');
        });
    });

    it('creates a doc with _status: draft, returns id, and revalidates list', async () => {
        const payload = makePayload({ createResult: { id: 'page-new-1' } });
        mockGetAuthedPayloadCtx.mockResolvedValue(makeCtx(payload));

        const formData = makeFormData({ title: 'Home', slug: 'home' });
        const result = await createPageAction(DOMAIN, formData);

        expect(payload.create).toHaveBeenCalledWith(
            expect.objectContaining({
                collection: 'pages',
                data: expect.objectContaining({
                    title: 'Home',
                    slug: 'home',
                    tenant: TENANT.id,
                    _status: 'draft',
                }),
                user: ADMIN_USER,
                overrideAccess: false,
            }),
        );
        expect(result).toEqual({ id: 'page-new-1' });
        expect(mockRevalidatePath).toHaveBeenCalledWith(`/${DOMAIN}/content/pages/`);
    });

    it('throws when title is missing', async () => {
        const payload = makePayload();
        mockGetAuthedPayloadCtx.mockResolvedValue(makeCtx(payload));

        const formData = makeFormData({ slug: 'home' });
        await expect(createPageAction(DOMAIN, formData)).rejects.toThrow(
            'Title and slug are required to create a page.',
        );
        expect(payload.create).not.toHaveBeenCalled();
    });

    it('throws when slug is missing', async () => {
        const payload = makePayload();
        mockGetAuthedPayloadCtx.mockResolvedValue(makeCtx(payload));

        const formData = makeFormData({ title: 'Home' });
        await expect(createPageAction(DOMAIN, formData)).rejects.toThrow(
            'Title and slug are required to create a page.',
        );
        expect(payload.create).not.toHaveBeenCalled();
    });

    it('uses tenant from context, never from FormData (cross-tenant forgery prevention)', async () => {
        const payload = makePayload({ createResult: { id: 'page-new-2' } });
        mockGetAuthedPayloadCtx.mockResolvedValue(makeCtx(payload));

        // Attacker tries to forge a different tenantId in the form payload
        const formData = makeFormData({ title: 'Home', slug: 'home', tenant: 'evil-tenant-999' });
        await createPageAction(DOMAIN, formData);

        const createCall = payload.create.mock.calls[0]?.[0] as { data: Record<string, unknown> };
        expect(createCall.data.tenant).toBe(TENANT.id);
        expect(createCall.data.tenant).not.toBe('evil-tenant-999');
    });

    it('calls notFound when tenant is null', async () => {
        const payload = makePayload();
        mockGetAuthedPayloadCtx.mockResolvedValue({ payload, user: ADMIN_USER, tenant: null });

        const formData = makeFormData({ title: 'Home', slug: 'home' });
        await expect(createPageAction(DOMAIN, formData)).rejects.toThrow('NEXT_NOT_FOUND');
        expect(payload.create).not.toHaveBeenCalled();
    });
});

// ------------------------------------------------------------------
// savePageDraftAction
// ------------------------------------------------------------------

describe('savePageDraftAction', () => {
    beforeEach(() => {
        mockGetAuthedPayloadCtx.mockReset();
        mockRevalidatePath.mockReset();
        mockNotFound.mockReset().mockImplementation((): never => {
            throw new Error('NEXT_NOT_FOUND');
        });
    });

    it('updates the doc with _status: draft and revalidates', async () => {
        const payload = makePayload();
        mockGetAuthedPayloadCtx.mockResolvedValue(makeCtx(payload));

        const formData = makeFormData({ title: 'Updated Home', slug: 'home' });
        await savePageDraftAction(DOMAIN, PAGE_ID, formData);

        expect(payload.findByID).toHaveBeenCalledWith(
            expect.objectContaining({
                collection: 'pages',
                id: PAGE_ID,
                user: ADMIN_USER,
                overrideAccess: false,
                draft: true,
            }),
        );
        expect(payload.update).toHaveBeenCalledWith(
            expect.objectContaining({
                collection: 'pages',
                id: PAGE_ID,
                data: expect.objectContaining({
                    title: 'Updated Home',
                    _status: 'draft',
                }),
                user: ADMIN_USER,
                overrideAccess: false,
            }),
        );
        expect(mockRevalidatePath).toHaveBeenCalledWith(`/${DOMAIN}/content/pages/`);
        expect(mockRevalidatePath).toHaveBeenCalledWith(`/${DOMAIN}/content/pages/${PAGE_ID}/`);
    });

    it('calls notFound when doc belongs to a different tenant', async () => {
        const crossTenantPage = { ...EXISTING_PAGE, tenant: 'other-tenant-999' };
        const payload = makePayload({ existingDoc: crossTenantPage });
        mockGetAuthedPayloadCtx.mockResolvedValue(makeCtx(payload));

        const formData = makeFormData({ title: 'Home', slug: 'home' });
        await expect(savePageDraftAction(DOMAIN, PAGE_ID, formData)).rejects.toThrow('NEXT_NOT_FOUND');
        expect(payload.update).not.toHaveBeenCalled();
    });
});

// ------------------------------------------------------------------
// publishPageAction
// ------------------------------------------------------------------

describe('publishPageAction', () => {
    beforeEach(() => {
        mockGetAuthedPayloadCtx.mockReset();
        mockRevalidatePath.mockReset();
        mockNotFound.mockReset().mockImplementation((): never => {
            throw new Error('NEXT_NOT_FOUND');
        });
    });

    it('updates the doc with _status: published and revalidates', async () => {
        const payload = makePayload();
        mockGetAuthedPayloadCtx.mockResolvedValue(makeCtx(payload));

        const formData = makeFormData({ title: 'Home', slug: 'home' });
        await publishPageAction(DOMAIN, PAGE_ID, formData);

        expect(payload.update).toHaveBeenCalledWith(
            expect.objectContaining({
                collection: 'pages',
                id: PAGE_ID,
                data: expect.objectContaining({
                    _status: 'published',
                }),
                user: ADMIN_USER,
                overrideAccess: false,
            }),
        );
        expect(mockRevalidatePath).toHaveBeenCalledWith(`/${DOMAIN}/content/pages/`);
    });
});

// ------------------------------------------------------------------
// deletePageAction
// ------------------------------------------------------------------

describe('deletePageAction', () => {
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

        await deletePageAction(DOMAIN, PAGE_ID);

        expect(payload.delete).toHaveBeenCalledWith(
            expect.objectContaining({
                collection: 'pages',
                id: PAGE_ID,
                user: ADMIN_USER,
                overrideAccess: false,
            }),
        );
        expect(mockRevalidatePath).toHaveBeenCalledWith(`/${DOMAIN}/content/pages/`);
    });

    it('editor: calls notFound without deleting', async () => {
        const payload = makePayload();
        mockGetAuthedPayloadCtx.mockResolvedValue(makeCtx(payload, EDITOR_USER));

        await expect(deletePageAction(DOMAIN, PAGE_ID)).rejects.toThrow('NEXT_NOT_FOUND');
        expect(payload.delete).not.toHaveBeenCalled();
        expect(mockRevalidatePath).not.toHaveBeenCalled();
    });
});

// ------------------------------------------------------------------
// bulkDeletePagesAction
// ------------------------------------------------------------------

describe('bulkDeletePagesAction', () => {
    beforeEach(() => {
        mockGetAuthedPayloadCtx.mockReset();
        mockRevalidatePath.mockReset();
        mockNotFound.mockReset().mockImplementation((): never => {
            throw new Error('NEXT_NOT_FOUND');
        });
    });

    it('admin: deletes with where.id.in filter and revalidates', async () => {
        const payload = makePayload();
        mockGetAuthedPayloadCtx.mockResolvedValue(makeCtx(payload));

        const ids = ['id-1', 'id-2', 'id-3'];
        await bulkDeletePagesAction(DOMAIN, ids);

        expect(payload.delete).toHaveBeenCalledWith(
            expect.objectContaining({
                collection: 'pages',
                where: { id: { in: ids } },
                user: ADMIN_USER,
                overrideAccess: false,
            }),
        );
        expect(mockRevalidatePath).toHaveBeenCalledWith(`/${DOMAIN}/content/pages/`);
    });

    it('editor: calls notFound without deleting', async () => {
        const payload = makePayload();
        mockGetAuthedPayloadCtx.mockResolvedValue(makeCtx(payload, EDITOR_USER));

        await expect(bulkDeletePagesAction(DOMAIN, ['id-1'])).rejects.toThrow('NEXT_NOT_FOUND');
        expect(payload.delete).not.toHaveBeenCalled();
    });
});

// ------------------------------------------------------------------
// bulkPublishPagesAction
// ------------------------------------------------------------------

describe('bulkPublishPagesAction', () => {
    beforeEach(() => {
        mockGetAuthedPayloadCtx.mockReset();
        mockRevalidatePath.mockReset();
    });

    it('loops and calls update for each id', async () => {
        const payload = makePayload();
        mockGetAuthedPayloadCtx.mockResolvedValue(makeCtx(payload));

        const ids = ['id-a', 'id-b', 'id-c'];
        await bulkPublishPagesAction(DOMAIN, ids);

        // One update call per id
        expect(payload.update).toHaveBeenCalledTimes(3);
        for (const id of ids) {
            expect(payload.update).toHaveBeenCalledWith(
                expect.objectContaining({
                    collection: 'pages',
                    id,
                    data: expect.objectContaining({ _status: 'published' }),
                    user: ADMIN_USER,
                    overrideAccess: false,
                }),
            );
        }
        expect(mockRevalidatePath).toHaveBeenCalledWith(`/${DOMAIN}/content/pages/`);
    });

    it('forwards user to every update call', async () => {
        const payload = makePayload();
        mockGetAuthedPayloadCtx.mockResolvedValue(makeCtx(payload));

        await bulkPublishPagesAction(DOMAIN, ['id-x']);

        expect(payload.update).toHaveBeenCalledWith(expect.objectContaining({ user: ADMIN_USER }));
    });

    it('continues on partial failure, revalidates, and throws an aggregated error', async () => {
        const payload = makePayload();
        // 'a' succeeds, 'b' fails, 'c' succeeds — the loop must not bail on
        // the first failure or the user would never know 'c' wasn't even tried.
        payload.update
            .mockResolvedValueOnce({ id: 'a' })
            .mockRejectedValueOnce(new Error('stale doc lock'))
            .mockResolvedValueOnce({ id: 'c' });

        mockGetAuthedPayloadCtx.mockResolvedValue(makeCtx(payload));

        // Suppress the [pages] console.error breadcrumb the action emits so
        // the test output stays clean. The throw + call count are what we
        // actually assert on.
        const consoleErrSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        try {
            await expect(bulkPublishPagesAction(DOMAIN, ['a', 'b', 'c'])).rejects.toThrow(/b/);
        } finally {
            consoleErrSpy.mockRestore();
        }

        // All three ids must have been attempted — the loop continued past 'b'.
        expect(payload.update).toHaveBeenCalledTimes(3);
        // Revalidation must still fire so 'a' and 'c' show as published in the UI.
        expect(mockRevalidatePath).toHaveBeenCalledWith(`/${DOMAIN}/content/pages/`);
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
            title: 'About',
            slug: 'about',
            blocks: [{ blockType: 'richText', content: { root: {} } }],
            seo: { title: 'About Us', description: 'Learn more', noindex: false },
        });

        await savePageDraftAction(DOMAIN, PAGE_ID, formData);

        expect(payload.update).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({
                    title: 'About',
                    slug: 'about',
                    blocks: expect.arrayContaining([expect.objectContaining({ blockType: 'richText' })]),
                    seo: expect.objectContaining({ title: 'About Us', description: 'Learn more' }),
                }),
            }),
        );
    });

    it('treats a missing _payload key as an empty submission (action completes, no error)', async () => {
        const payload = makePayload();
        mockGetAuthedPayloadCtx.mockResolvedValue(makeCtx(payload));

        const formData = new FormData(); // no _payload
        await savePageDraftAction(DOMAIN, PAGE_ID, formData);

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
            await expect(savePageDraftAction(DOMAIN, PAGE_ID, formData)).rejects.toThrow('Malformed form payload');
        } finally {
            consoleErrSpy.mockRestore();
        }

        // Nothing must be written when the input is corrupt
        expect(payload.findByID).not.toHaveBeenCalled();
        expect(payload.update).not.toHaveBeenCalled();
    });

    it('_status is always server-determined, never from FormData', async () => {
        const payload = makePayload({ createResult: { id: 'page-x' } });
        mockGetAuthedPayloadCtx.mockResolvedValue(makeCtx(payload));

        // Attacker tries to force _status: published via form
        const formData = makeFormData({ title: 'X', slug: 'x', _status: 'published' });
        await createPageAction(DOMAIN, formData);

        const createCall = payload.create.mock.calls[0]?.[0] as { data: Record<string, unknown> };
        // The action hardcodes 'draft' for create — regardless of what FormData says
        expect(createCall.data._status).toBe('draft');
    });
});
