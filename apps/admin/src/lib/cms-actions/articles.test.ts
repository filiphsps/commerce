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
    bulkDeleteArticlesAction,
    bulkPublishArticlesAction,
    createArticleAction,
    deleteArticleAction,
    publishArticleAction,
    saveArticleDraftAction,
} from './articles';

// ------------------------------------------------------------------
// Fixtures
// ------------------------------------------------------------------

const DOMAIN = 'acme.example.com';
const ARTICLE_ID = 'article-abc123';

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

const EXISTING_ARTICLE = {
    id: ARTICLE_ID,
    tenant: 'tenant-1',
    title: 'Hello World',
    slug: 'hello-world',
    author: 'Jane Doe',
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
    existingDoc = EXISTING_ARTICLE as unknown,
    createResult = { id: 'article-new' } as unknown,
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
// createArticleAction
// ------------------------------------------------------------------

describe('createArticleAction', () => {
    beforeEach(() => {
        mockGetAuthedPayloadCtx.mockReset();
        mockRevalidatePath.mockReset();
        mockNotFound.mockReset().mockImplementation((): never => {
            throw new Error('NEXT_NOT_FOUND');
        });
    });

    it('creates a doc with _status: draft, returns id, and revalidates list', async () => {
        const payload = makePayload({ createResult: { id: 'article-new-1' } });
        mockGetAuthedPayloadCtx.mockResolvedValue(makeCtx(payload));

        const formData = makeFormData({ title: 'Hello World', slug: 'hello-world', author: 'Jane Doe' });
        const result = await createArticleAction(DOMAIN, formData);

        expect(payload.create).toHaveBeenCalledWith(
            expect.objectContaining({
                collection: 'articles',
                data: expect.objectContaining({
                    title: 'Hello World',
                    slug: 'hello-world',
                    author: 'Jane Doe',
                    tenant: TENANT.id,
                    _status: 'draft',
                }),
                user: ADMIN_USER,
                overrideAccess: false,
            }),
        );
        expect(result).toEqual({ id: 'article-new-1' });
        expect(mockRevalidatePath).toHaveBeenCalledWith(`/${DOMAIN}/content/articles/`);
    });

    it('throws when title is missing', async () => {
        const payload = makePayload();
        mockGetAuthedPayloadCtx.mockResolvedValue(makeCtx(payload));

        const formData = makeFormData({ slug: 'hello-world', author: 'Jane Doe' });
        await expect(createArticleAction(DOMAIN, formData)).rejects.toThrow(
            'Title, slug, and author are required to create an article.',
        );
        expect(payload.create).not.toHaveBeenCalled();
    });

    it('throws when slug is missing', async () => {
        const payload = makePayload();
        mockGetAuthedPayloadCtx.mockResolvedValue(makeCtx(payload));

        const formData = makeFormData({ title: 'Hello World', author: 'Jane Doe' });
        await expect(createArticleAction(DOMAIN, formData)).rejects.toThrow(
            'Title, slug, and author are required to create an article.',
        );
        expect(payload.create).not.toHaveBeenCalled();
    });

    it('throws when author is missing', async () => {
        const payload = makePayload();
        mockGetAuthedPayloadCtx.mockResolvedValue(makeCtx(payload));

        const formData = makeFormData({ title: 'Hello World', slug: 'hello-world' });
        await expect(createArticleAction(DOMAIN, formData)).rejects.toThrow(
            'Title, slug, and author are required to create an article.',
        );
        expect(payload.create).not.toHaveBeenCalled();
    });

    it('uses tenant from context, never from FormData (cross-tenant forgery prevention)', async () => {
        const payload = makePayload({ createResult: { id: 'article-new-2' } });
        mockGetAuthedPayloadCtx.mockResolvedValue(makeCtx(payload));

        // Attacker tries to forge a different tenantId in the form payload
        const formData = makeFormData({
            title: 'Hello World',
            slug: 'hello-world',
            author: 'Jane Doe',
            tenant: 'evil-tenant-999',
        });
        await createArticleAction(DOMAIN, formData);

        const createCall = payload.create.mock.calls[0]?.[0] as { data: Record<string, unknown> };
        expect(createCall.data.tenant).toBe(TENANT.id);
        expect(createCall.data.tenant).not.toBe('evil-tenant-999');
    });

    it('calls notFound when tenant is null', async () => {
        const payload = makePayload();
        mockGetAuthedPayloadCtx.mockResolvedValue({ payload, user: ADMIN_USER, tenant: null });

        const formData = makeFormData({ title: 'Hello World', slug: 'hello-world', author: 'Jane Doe' });
        await expect(createArticleAction(DOMAIN, formData)).rejects.toThrow('NEXT_NOT_FOUND');
        expect(payload.create).not.toHaveBeenCalled();
    });
});

// ------------------------------------------------------------------
// saveArticleDraftAction
// ------------------------------------------------------------------

describe('saveArticleDraftAction', () => {
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

        const formData = makeFormData({ title: 'Updated Hello', slug: 'hello-world', author: 'Jane Doe' });
        await saveArticleDraftAction(DOMAIN, ARTICLE_ID, formData);

        expect(payload.findByID).toHaveBeenCalledWith(
            expect.objectContaining({
                collection: 'articles',
                id: ARTICLE_ID,
                user: ADMIN_USER,
                overrideAccess: false,
                draft: true,
            }),
        );
        expect(payload.update).toHaveBeenCalledWith(
            expect.objectContaining({
                collection: 'articles',
                id: ARTICLE_ID,
                data: expect.objectContaining({
                    title: 'Updated Hello',
                    _status: 'draft',
                }),
                user: ADMIN_USER,
                overrideAccess: false,
            }),
        );
        expect(mockRevalidatePath).toHaveBeenCalledWith(`/${DOMAIN}/content/articles/`);
        expect(mockRevalidatePath).toHaveBeenCalledWith(`/${DOMAIN}/content/articles/${ARTICLE_ID}/`);
    });

    it('calls notFound when doc belongs to a different tenant', async () => {
        const crossTenantArticle = { ...EXISTING_ARTICLE, tenant: 'other-tenant-999' };
        const payload = makePayload({ existingDoc: crossTenantArticle });
        mockGetAuthedPayloadCtx.mockResolvedValue(makeCtx(payload));

        const formData = makeFormData({ title: 'Hello World', slug: 'hello-world', author: 'Jane Doe' });
        await expect(saveArticleDraftAction(DOMAIN, ARTICLE_ID, formData)).rejects.toThrow('NEXT_NOT_FOUND');
        expect(payload.update).not.toHaveBeenCalled();
    });
});

// ------------------------------------------------------------------
// publishArticleAction
// ------------------------------------------------------------------

describe('publishArticleAction', () => {
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

        const formData = makeFormData({ title: 'Hello World', slug: 'hello-world', author: 'Jane Doe' });
        await publishArticleAction(DOMAIN, ARTICLE_ID, formData);

        expect(payload.update).toHaveBeenCalledWith(
            expect.objectContaining({
                collection: 'articles',
                id: ARTICLE_ID,
                data: expect.objectContaining({
                    _status: 'published',
                }),
                user: ADMIN_USER,
                overrideAccess: false,
            }),
        );
        expect(mockRevalidatePath).toHaveBeenCalledWith(`/${DOMAIN}/content/articles/`);
    });
});

// ------------------------------------------------------------------
// deleteArticleAction
// ------------------------------------------------------------------

describe('deleteArticleAction', () => {
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

        await deleteArticleAction(DOMAIN, ARTICLE_ID);

        expect(payload.delete).toHaveBeenCalledWith(
            expect.objectContaining({
                collection: 'articles',
                id: ARTICLE_ID,
                user: ADMIN_USER,
                overrideAccess: false,
            }),
        );
        expect(mockRevalidatePath).toHaveBeenCalledWith(`/${DOMAIN}/content/articles/`);
    });

    it('editor: calls notFound without deleting', async () => {
        const payload = makePayload();
        mockGetAuthedPayloadCtx.mockResolvedValue(makeCtx(payload, EDITOR_USER));

        await expect(deleteArticleAction(DOMAIN, ARTICLE_ID)).rejects.toThrow('NEXT_NOT_FOUND');
        expect(payload.delete).not.toHaveBeenCalled();
        expect(mockRevalidatePath).not.toHaveBeenCalled();
    });
});

// ------------------------------------------------------------------
// bulkDeleteArticlesAction
// ------------------------------------------------------------------

describe('bulkDeleteArticlesAction', () => {
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
        await bulkDeleteArticlesAction(DOMAIN, ids);

        expect(payload.delete).toHaveBeenCalledWith(
            expect.objectContaining({
                collection: 'articles',
                where: { id: { in: ids } },
                user: ADMIN_USER,
                overrideAccess: false,
            }),
        );
        expect(mockRevalidatePath).toHaveBeenCalledWith(`/${DOMAIN}/content/articles/`);
    });

    it('editor: calls notFound without deleting', async () => {
        const payload = makePayload();
        mockGetAuthedPayloadCtx.mockResolvedValue(makeCtx(payload, EDITOR_USER));

        await expect(bulkDeleteArticlesAction(DOMAIN, ['id-1'])).rejects.toThrow('NEXT_NOT_FOUND');
        expect(payload.delete).not.toHaveBeenCalled();
    });
});

// ------------------------------------------------------------------
// bulkPublishArticlesAction
// ------------------------------------------------------------------

describe('bulkPublishArticlesAction', () => {
    beforeEach(() => {
        mockGetAuthedPayloadCtx.mockReset();
        mockRevalidatePath.mockReset();
    });

    it('loops and calls update for each id', async () => {
        const payload = makePayload();
        mockGetAuthedPayloadCtx.mockResolvedValue(makeCtx(payload));

        const ids = ['id-a', 'id-b', 'id-c'];
        await bulkPublishArticlesAction(DOMAIN, ids);

        // One update call per id
        expect(payload.update).toHaveBeenCalledTimes(3);
        for (const id of ids) {
            expect(payload.update).toHaveBeenCalledWith(
                expect.objectContaining({
                    collection: 'articles',
                    id,
                    data: expect.objectContaining({ _status: 'published' }),
                    user: ADMIN_USER,
                    overrideAccess: false,
                }),
            );
        }
        expect(mockRevalidatePath).toHaveBeenCalledWith(`/${DOMAIN}/content/articles/`);
    });

    it('forwards user to every update call', async () => {
        const payload = makePayload();
        mockGetAuthedPayloadCtx.mockResolvedValue(makeCtx(payload));

        await bulkPublishArticlesAction(DOMAIN, ['id-x']);

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

        // Suppress the [articles] console.error breadcrumb the action emits so
        // the test output stays clean. The throw + call count are what we
        // actually assert on.
        const consoleErrSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        try {
            await expect(bulkPublishArticlesAction(DOMAIN, ['a', 'b', 'c'])).rejects.toThrow(/b/);
        } finally {
            consoleErrSpy.mockRestore();
        }

        // All three ids must have been attempted — the loop continued past 'b'.
        expect(payload.update).toHaveBeenCalledTimes(3);
        // Revalidation must still fire so 'a' and 'c' show as published in the UI.
        expect(mockRevalidatePath).toHaveBeenCalledWith(`/${DOMAIN}/content/articles/`);
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

    it('parses author, tags, and seo from the _payload JSON blob', async () => {
        const payload = makePayload();
        mockGetAuthedPayloadCtx.mockResolvedValue(makeCtx(payload));

        const formData = makeFormData({
            title: 'Tech Article',
            slug: 'tech-article',
            author: 'Jane Doe',
            tags: ['tech', 'news'],
            seo: { title: 'Tech Article', description: 'A tech article', noindex: false },
        });

        await saveArticleDraftAction(DOMAIN, ARTICLE_ID, formData);

        expect(payload.update).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({
                    title: 'Tech Article',
                    slug: 'tech-article',
                    author: 'Jane Doe',
                    tags: expect.arrayContaining(['tech', 'news']),
                    seo: expect.objectContaining({ title: 'Tech Article', description: 'A tech article' }),
                }),
            }),
        );
    });

    it('treats a missing _payload key as an empty submission (action completes, no error)', async () => {
        const payload = makePayload();
        mockGetAuthedPayloadCtx.mockResolvedValue(makeCtx(payload));

        const formData = new FormData(); // no _payload
        await saveArticleDraftAction(DOMAIN, ARTICLE_ID, formData);

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
            await expect(saveArticleDraftAction(DOMAIN, ARTICLE_ID, formData)).rejects.toThrow(
                'Malformed form payload',
            );
        } finally {
            consoleErrSpy.mockRestore();
        }

        // Nothing must be written when the input is corrupt
        expect(payload.findByID).not.toHaveBeenCalled();
        expect(payload.update).not.toHaveBeenCalled();
    });

    it('_status is always server-determined, never from FormData', async () => {
        const payload = makePayload({ createResult: { id: 'article-x' } });
        mockGetAuthedPayloadCtx.mockResolvedValue(makeCtx(payload));

        // Attacker tries to force _status: published via form
        const formData = makeFormData({
            title: 'X',
            slug: 'x',
            author: 'Jane Doe',
            _status: 'published',
        });
        await createArticleAction(DOMAIN, formData);

        const createCall = payload.create.mock.calls[0]?.[0] as { data: Record<string, unknown> };
        // The action hardcodes 'draft' for create — regardless of what FormData says
        expect(createCall.data._status).toBe('draft');
    });
});
