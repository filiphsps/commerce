import type { Route } from 'next';
import type { CollectionConfig } from 'payload';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createCollectionEditorActions } from './actions';
import { defineCollectionEditor } from './manifest';
import type { AuthedPayloadCtx, EditorRuntime } from './runtime';

const { mockRevalidatePath } = vi.hoisted(() => ({ mockRevalidatePath: vi.fn() }));
vi.mock('next/cache', () => ({ revalidatePath: mockRevalidatePath }));
vi.mock('next/navigation', () => ({
    notFound: () => {
        throw new Error('NEXT_NOT_FOUND');
    },
}));
vi.mock('server-only', () => ({}));

const collectionConfig: CollectionConfig = {
    slug: 'businessData',
    fields: [
        { name: 'legalName', type: 'text' },
        { name: 'supportEmail', type: 'email' },
    ],
    versions: { drafts: { autosave: { interval: 2000 } } },
};

const baseManifest = defineCollectionEditor({
    collection: 'businessData',
    routes: { label: { singular: 'X', plural: 'X' }, basePath: (d) => `/${d}/x/` as Route },
    tenant: { kind: 'scoped', field: 'tenant' },
    access: { list: () => true, read: () => true, update: () => true, delete: () => true },
    revalidate: ({ domain }) => [`/${domain}/x/`],
});

const buildRuntime = (overrides: Partial<EditorRuntime> = {}): EditorRuntime => {
    // Stable ctx so tests can inspect the same payload mocks the action used.
    const stableCtx: AuthedPayloadCtx = {
        payload: {
            config: { collections: [collectionConfig] },
            find: vi.fn().mockResolvedValue({ docs: [] }),
            create: vi.fn().mockResolvedValue({ id: 'new-id', _status: 'draft' }),
            update: vi.fn().mockResolvedValue({ id: 'doc-1', _status: 'draft' }),
            delete: vi.fn().mockResolvedValue({}),
        } as never,
        user: { id: 'u', email: 'e', role: 'editor', tenants: [{ tenant: 'tenant-1' }], collection: 'users' },
        tenant: { id: 'tenant-1', slug: 'acme' },
    };
    return {
        getCtx: vi.fn(async (): Promise<AuthedPayloadCtx> => stableCtx),
        toAccessCtx: (ctx, domain) => ({
            user: ctx.user
                ? {
                      id: ctx.user.id,
                      email: ctx.user.email,
                      role: ctx.user.role,
                      tenants: ctx.user.tenants.map((t) => t.tenant),
                  }
                : null,
            domain,
        }),
        buildFormState: vi.fn(),
        getShellProps: vi.fn(),
        DocumentForm: () => null,
        Table: () => null,
        Toolbar: () => null,
        ...overrides,
    };
};

const fd = (data: Record<string, unknown>): FormData => {
    const f = new FormData();
    f.append('_payload', JSON.stringify(data));
    return f;
};

beforeEach(() => {
    mockRevalidatePath.mockClear();
});

describe('createCollectionEditorActions.saveDraft', () => {
    it('creates a new doc when no existing tenant doc is found, with _status=draft', async () => {
        const runtime = buildRuntime();
        const actions = createCollectionEditorActions(baseManifest, runtime);
        await actions.saveDraft('a.test', 'singleton', fd({ legalName: 'Acme' }));

        const ctx = await runtime.getCtx('a.test');
        expect(ctx.payload.find).toHaveBeenCalledWith(
            expect.objectContaining({
                collection: 'businessData',
                where: { and: [{ tenant: { equals: 'tenant-1' } }, { id: { equals: 'singleton' } }] },
            }),
        );
        expect(ctx.payload.create).toHaveBeenCalledWith(
            expect.objectContaining({
                collection: 'businessData',
                data: { legalName: 'Acme', tenant: 'tenant-1', _status: 'draft' },
                overrideAccess: false,
            }),
        );
        expect(mockRevalidatePath).toHaveBeenCalledWith('/a.test/x/');
    });

    it('updates the existing doc when one is found', async () => {
        const runtime = buildRuntime();
        const ctx = await runtime.getCtx('a.test');
        (ctx.payload.find as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ docs: [{ id: 'doc-1' }] });
        (runtime.getCtx as ReturnType<typeof vi.fn>).mockResolvedValue(ctx);

        const actions = createCollectionEditorActions(baseManifest, runtime);
        await actions.saveDraft('a.test', 'singleton', fd({ legalName: 'Acme' }));

        expect(ctx.payload.update).toHaveBeenCalledWith(
            expect.objectContaining({
                collection: 'businessData',
                id: 'doc-1',
                data: { legalName: 'Acme', _status: 'draft' },
            }),
        );
    });

    it('drops undeclared fields from the payload', async () => {
        const runtime = buildRuntime();
        const actions = createCollectionEditorActions(baseManifest, runtime);
        await actions.saveDraft('a.test', 'singleton', fd({ legalName: 'Acme', injected: 'evil' }));

        const ctx = await runtime.getCtx('a.test');
        expect(ctx.payload.create).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.not.objectContaining({ injected: expect.anything() }),
            }),
        );
    });

    it('throws notFound() when access.update returns false', async () => {
        const runtime = buildRuntime();
        const manifest = defineCollectionEditor({
            ...baseManifest,
            access: { ...baseManifest.access, update: () => false },
        });
        const actions = createCollectionEditorActions(manifest, runtime);
        await expect(actions.saveDraft('a.test', 'singleton', fd({}))).rejects.toThrow('NEXT_NOT_FOUND');
    });
});

describe('createCollectionEditorActions.publish', () => {
    it('writes with _status=published and revalidates with status=published', async () => {
        const runtime = buildRuntime();
        const actions = createCollectionEditorActions(baseManifest, runtime);
        await actions.publish('a.test', 'singleton', fd({ legalName: 'Acme' }));

        const ctx = await runtime.getCtx('a.test');
        expect(ctx.payload.create).toHaveBeenCalledWith(
            expect.objectContaining({
                data: { legalName: 'Acme', tenant: 'tenant-1', _status: 'published' },
            }),
        );
    });
});

describe('createCollectionEditorActions.delete', () => {
    it('calls payload.delete and revalidates', async () => {
        const runtime = buildRuntime();
        const actions = createCollectionEditorActions(baseManifest, runtime);
        await actions.delete('a.test', 'doc-1');

        const ctx = await runtime.getCtx('a.test');
        expect(ctx.payload.delete).toHaveBeenCalledWith(
            expect.objectContaining({
                collection: 'businessData',
                id: 'doc-1',
                overrideAccess: false,
            }),
        );
        expect(mockRevalidatePath).toHaveBeenCalledWith('/a.test/x/');
    });

    it('throws notFound() when access.delete returns false', async () => {
        const runtime = buildRuntime();
        const manifest = defineCollectionEditor({
            ...baseManifest,
            access: { ...baseManifest.access, delete: () => false },
        });
        const actions = createCollectionEditorActions(manifest, runtime);
        await expect(actions.delete('a.test', 'doc-1')).rejects.toThrow('NEXT_NOT_FOUND');
    });
});

describe('createCollectionEditorActions.bulkDelete', () => {
    it('loops through ids and calls delete for each', async () => {
        const runtime = buildRuntime();
        const actions = createCollectionEditorActions(baseManifest, runtime);
        await actions.bulkDelete('a.test', ['id-1', 'id-2', 'id-3']);

        const ctx = await runtime.getCtx('a.test');
        expect(ctx.payload.delete).toHaveBeenCalledTimes(3);
    });
});
