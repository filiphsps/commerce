import type { Route } from 'next';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createCollectionEditorActions, type EditorConvexBridge } from './actions';
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

const baseManifest = defineCollectionEditor({
    collection: 'pages',
    routes: { label: { singular: 'X', plural: 'X' }, basePath: (d) => `/${d}/x/` as Route },
    tenant: { kind: 'scoped', field: 'tenant' },
    access: { list: () => true, read: () => true, create: () => true, update: () => true, delete: () => true },
    revalidate: ({ domain }) => [`/${domain}/x/`],
});

const tenantSingletonManifest = defineCollectionEditor({
    ...baseManifest,
    collection: 'businessData',
    tenant: { kind: 'tenant-singleton', field: 'tenant' },
});

const keyedManifest = defineCollectionEditor({
    ...baseManifest,
    collection: 'productMetadata',
    routes: { ...baseManifest.routes, keyField: 'shopifyHandle' },
});

/** Builds a fully-mocked Convex bridge whose save-shaped calls resolve to a stable document id. */
const buildBridge = (): EditorConvexBridge => ({
    saveDraft: vi.fn().mockResolvedValue({ documentId: 'doc-1' }),
    publish: vi.fn().mockResolvedValue({ documentId: 'doc-1' }),
    create: vi.fn().mockResolvedValue({ documentId: 'doc-new' }),
    deleteDocument: vi.fn().mockResolvedValue(undefined),
    bulkDelete: vi.fn().mockResolvedValue(undefined),
    bulkPublish: vi.fn().mockResolvedValue(undefined),
    restoreVersion: vi.fn().mockResolvedValue(undefined),
});

/**
 * Builds a runtime whose `getCtx`/`toAccessCtx` satisfy the route-level access gates and whose
 * `convex` property is the mocked bridge. The Payload members are inert stubs — the Convex-backed
 * actions must never touch `ctx.payload`.
 */
const buildRuntime = (bridge?: EditorConvexBridge): EditorRuntime & { convex?: EditorConvexBridge } => {
    const stableCtx: AuthedPayloadCtx = {
        payload: {} as never,
        user: { id: 'u', email: 'e', role: 'editor', tenants: [{ tenant: 'tenant-1' }], collection: 'users' },
        tenant: { id: 'tenant-1', slug: 'acme', defaultLocale: 'en-US', locales: ['en-US'] },
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
            tenantId: ctx.tenant?.id ?? null,
        }),
        buildFormState: vi.fn(),
        getShellProps: vi.fn(),
        DocumentForm: () => null,
        EmptyState: () => null,
        Table: () => null,
        Toolbar: () => null,
        PageHeader: () => null,
        convex: bridge,
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
    it('posts the parsed payload through the bridge with the document target and locale', async () => {
        const bridge = buildBridge();
        const actions = createCollectionEditorActions(baseManifest, buildRuntime(bridge));
        await actions.saveDraft('a.test', 'doc-1', fd({ title: 'Acme' }), 'de-DE');

        expect(bridge.saveDraft).toHaveBeenCalledWith({
            collection: 'pages',
            data: { title: 'Acme' },
            locale: 'de-DE',
            documentId: 'doc-1',
        });
    });

    it('does NOT call revalidatePath on draft saves (autosave must not refresh the editor mid-typing)', async () => {
        // A draft autosave landing a `revalidatePath` on the edit URL re-seeds `<Form>`'s
        // `initialState` mid-keystroke; the Convex draft mutation schedules zero storefront
        // revalidation too, so the whole draft path stays revalidation-free.
        const bridge = buildBridge();
        const actions = createCollectionEditorActions(baseManifest, buildRuntime(bridge));
        await actions.saveDraft('a.test', 'doc-1', fd({ title: 'Acme' }), 'en-US');
        expect(mockRevalidatePath).not.toHaveBeenCalled();
    });

    it('sends no document target for tenant singletons (server-side singleton upsert)', async () => {
        const bridge = buildBridge();
        const actions = createCollectionEditorActions(tenantSingletonManifest, buildRuntime(bridge));
        await actions.saveDraft('a.test', '', fd({ legalName: 'Acme' }), 'en-US');

        expect(bridge.saveDraft).toHaveBeenCalledWith({
            collection: 'businessData',
            data: { legalName: 'Acme' },
            locale: 'en-US',
        });
    });

    it('addresses keyField-routed collections by keyField/keyValue', async () => {
        const bridge = buildBridge();
        const actions = createCollectionEditorActions(keyedManifest, buildRuntime(bridge));
        await actions.saveDraft('a.test', 'hat', fd({ seoTitle: 'Hat' }), 'en-US');

        expect(bridge.saveDraft).toHaveBeenCalledWith({
            collection: 'productMetadata',
            data: { seoTitle: 'Hat' },
            locale: 'en-US',
            keyField: 'shopifyHandle',
            keyValue: 'hat',
        });
    });

    it('throws notFound() when access.update returns false, without touching the bridge', async () => {
        const bridge = buildBridge();
        const manifest = defineCollectionEditor({
            ...baseManifest,
            access: { ...baseManifest.access, update: () => false },
        });
        const actions = createCollectionEditorActions(manifest, buildRuntime(bridge));
        await expect(actions.saveDraft('a.test', 'doc-1', fd({}), 'en-US')).rejects.toThrow('NEXT_NOT_FOUND');
        expect(bridge.saveDraft).not.toHaveBeenCalled();
    });

    it('throws MissingConvexBridgeError when the runtime has no Convex transport', async () => {
        const actions = createCollectionEditorActions(baseManifest, buildRuntime(undefined));
        await expect(actions.saveDraft('a.test', 'doc-1', fd({}), 'en-US')).rejects.toMatchObject({
            name: 'MissingConvexBridgeError',
        });
    });
});

describe('createCollectionEditorActions.publish', () => {
    it('posts through bridge.publish and revalidates the manifest paths', async () => {
        const bridge = buildBridge();
        const actions = createCollectionEditorActions(baseManifest, buildRuntime(bridge));
        await actions.publish('a.test', 'doc-1', fd({ title: 'Acme' }), 'en-US');

        expect(bridge.publish).toHaveBeenCalledWith({
            collection: 'pages',
            data: { title: 'Acme' },
            locale: 'en-US',
            documentId: 'doc-1',
        });
        expect(mockRevalidatePath).toHaveBeenCalledWith('/a.test/x/');
    });
});

describe('createCollectionEditorActions.create', () => {
    it('posts through bridge.create and returns the new document id', async () => {
        const bridge = buildBridge();
        const actions = createCollectionEditorActions(baseManifest, buildRuntime(bridge));
        const result = await actions.create('a.test', fd({ title: 'Acme' }), 'de-DE');

        expect(bridge.create).toHaveBeenCalledWith({
            collection: 'pages',
            data: { title: 'Acme' },
            locale: 'de-DE',
        });
        expect(result).toEqual({ id: 'doc-new' });
    });

    it('throws notFound() when the manifest declares no create gate', async () => {
        const bridge = buildBridge();
        const manifest = defineCollectionEditor({
            ...baseManifest,
            access: { list: () => true, read: () => true, update: () => true },
        });
        const actions = createCollectionEditorActions(manifest, buildRuntime(bridge));
        await expect(actions.create('a.test', fd({}), 'en-US')).rejects.toThrow('NEXT_NOT_FOUND');
        expect(bridge.create).not.toHaveBeenCalled();
    });
});

describe('createCollectionEditorActions.delete', () => {
    it('posts through bridge.deleteDocument and revalidates', async () => {
        const bridge = buildBridge();
        const actions = createCollectionEditorActions(baseManifest, buildRuntime(bridge));
        await actions.delete('a.test', 'doc-1');

        expect(bridge.deleteDocument).toHaveBeenCalledWith({ documentId: 'doc-1' });
        expect(mockRevalidatePath).toHaveBeenCalledWith('/a.test/x/');
    });

    it('throws notFound() when access.delete returns false, without touching the bridge', async () => {
        const bridge = buildBridge();
        const manifest = defineCollectionEditor({
            ...baseManifest,
            access: { ...baseManifest.access, delete: () => false },
        });
        const actions = createCollectionEditorActions(manifest, buildRuntime(bridge));
        await expect(actions.delete('a.test', 'doc-1')).rejects.toThrow('NEXT_NOT_FOUND');
        expect(bridge.deleteDocument).not.toHaveBeenCalled();
    });
});

describe('createCollectionEditorActions bulk actions', () => {
    it('bulkDelete forwards the whole id set in one call', async () => {
        const bridge = buildBridge();
        const actions = createCollectionEditorActions(baseManifest, buildRuntime(bridge));
        await actions.bulkDelete('a.test', ['id-1', 'id-2', 'id-3']);

        expect(bridge.bulkDelete).toHaveBeenCalledTimes(1);
        expect(bridge.bulkDelete).toHaveBeenCalledWith({ documentIds: ['id-1', 'id-2', 'id-3'] });
    });

    it('bulkPublish forwards the whole id set and revalidates', async () => {
        const bridge = buildBridge();
        const actions = createCollectionEditorActions(baseManifest, buildRuntime(bridge));
        await actions.bulkPublish('a.test', ['id-1', 'id-2']);

        expect(bridge.bulkPublish).toHaveBeenCalledWith({ documentIds: ['id-1', 'id-2'] });
        expect(mockRevalidatePath).toHaveBeenCalledWith('/a.test/x/');
    });
});

describe('createCollectionEditorActions.restoreVersion', () => {
    it('posts through bridge.restoreVersion and revalidates as a draft write', async () => {
        const bridge = buildBridge();
        const actions = createCollectionEditorActions(baseManifest, buildRuntime(bridge));
        await actions.restoreVersion('a.test', 'doc-1', 'version-9');

        expect(bridge.restoreVersion).toHaveBeenCalledWith({ versionId: 'version-9' });
        expect(mockRevalidatePath).toHaveBeenCalledWith('/a.test/x/');
    });

    it('throws notFound() when access.update returns false', async () => {
        const bridge = buildBridge();
        const manifest = defineCollectionEditor({
            ...baseManifest,
            access: { ...baseManifest.access, update: () => false },
        });
        const actions = createCollectionEditorActions(manifest, buildRuntime(bridge));
        await expect(actions.restoreVersion('a.test', 'doc-1', 'version-9')).rejects.toThrow('NEXT_NOT_FOUND');
        expect(bridge.restoreVersion).not.toHaveBeenCalled();
    });
});
