// @vitest-environment happy-dom
import { render } from '@testing-library/react';
import type { Route } from 'next';
import { describe, expect, it, vi } from 'vitest';
import type { EditorActions } from '../actions';
import { defineCollectionEditor } from '../manifest';
import type { EditorCmsDocument } from '../runtime';

const { mockNotFound, mockRedirect } = vi.hoisted(() => ({
    mockNotFound: vi.fn(() => {
        throw new Error('NEXT_NOT_FOUND');
    }),
    mockRedirect: vi.fn((url: string) => {
        throw new Error(`NEXT_REDIRECT:${url}`);
    }),
}));
vi.mock('next/navigation', () => ({ notFound: mockNotFound, redirect: mockRedirect }));
vi.mock('./editor-fields', () => ({ EditorFields: () => null }));
vi.mock('./editor-form-toolbar', () => ({ EditorFormToolbar: () => null }));
vi.mock('./locale-switcher', () => ({ LocaleSwitcher: () => null }));

import { EditorEditPage } from './editor-edit-page';

const baseManifest = defineCollectionEditor({
    collection: 'businessData',
    routes: { label: { singular: 'X', plural: 'X' }, basePath: (d) => `/${d}/x/` as Route },
    tenant: { kind: 'tenant-singleton', field: 'tenant' },
    access: { list: () => true, read: () => true, update: () => true },
    revalidate: ({ domain }) => [`/${domain}/x/`],
});

const generatedActions: EditorActions = {
    saveDraft: async () => {},
    publish: async () => {},
    delete: async () => {},
    create: async () => ({ id: 'new' }),
    bulkDelete: async () => {},
    bulkPublish: async () => {},
    restoreVersion: async () => {},
};

/**
 * Build the runtime substrate with a Convex bridge whose `getDocument`
 * resolves the given document — the CMSDATA-07 read seam under test.
 *
 * @param getDocument - The bridge `getDocument` implementation for this scenario.
 * @returns The runtime, typed loosely for the page under test.
 */
const buildRuntime = (
    getDocument: (args: Record<string, unknown>) => Promise<EditorCmsDocument | null> = async () => ({
        documentId: 'd1',
        collection: 'businessData',
        data: { legalName: 'A' },
        status: 'draft',
        updatedAt: 1_700_000_000_000,
    }),
): never =>
    ({
        getCtx: async () => ({
            user: { id: 'u', email: 'e', role: 'editor', tenants: [{ tenant: 'tenant-1' }], collection: 'users' },
            tenant: { id: 'tenant-1', slug: 'acme', defaultLocale: 'de', locales: ['de', 'en'] },
        }),
        toAccessCtx: (
            ctx: { user: { id: string; email: string; role: 'admin' | 'editor'; tenants: { tenant: string }[] } },
            domain: string | null,
        ) => ({
            user: { ...ctx.user, tenants: ctx.user.tenants.map((t) => t.tenant) },
            domain,
        }),
        convex: { getDocument, listRelationshipOptions: async () => [] },
        buildFormState: async () => ({ state: {} }),
        getShellProps: async () => ({}),
        DocumentForm: ({ title }: { title: string }) => <div data-testid="doc-form">{title}</div>,
        Table: () => null,
        Toolbar: () => null,
    }) as never;

describe('<EditorEditPage>', () => {
    it('renders DocumentForm with the manifest singular label as title when no doc.name present', async () => {
        const el = await EditorEditPage({
            manifest: baseManifest,
            runtime: buildRuntime(),
            params: { domain: 'a.test', id: '' },
            searchParams: { locale: 'de' },
            generatedActions,
        });
        const { getByTestId } = render(el);
        // Use plain DOM access — this package's tests don't load jest-dom.
        expect(getByTestId('doc-form').textContent).toBe('X');
    });

    it('uses the document data `name` as the title when present', async () => {
        const el = await EditorEditPage({
            manifest: baseManifest,
            runtime: buildRuntime(async () => ({
                documentId: 'd1',
                collection: 'businessData',
                data: { name: 'Named Doc' },
                status: 'published',
                updatedAt: 1_700_000_000_000,
            })),
            params: { domain: 'a.test', id: '' },
            searchParams: { locale: 'de' },
            generatedActions,
        });
        const { getByTestId } = render(el);
        expect(getByTestId('doc-form').textContent).toBe('Named Doc');
    });

    it('reads through the bridge with the manifest-derived document target', async () => {
        const getDocument = vi.fn(async () => null);
        const keyedManifest = defineCollectionEditor({
            ...baseManifest,
            collection: 'productMetadata',
            tenant: { kind: 'scoped', field: 'tenant' },
            routes: { ...baseManifest.routes, keyField: 'shopifyHandle' },
        });
        const el = await EditorEditPage({
            manifest: keyedManifest,
            runtime: buildRuntime(getDocument),
            params: { domain: 'a.test', id: 'sneaker' },
            searchParams: { locale: 'de' },
            generatedActions,
        });
        render(el);
        expect(getDocument).toHaveBeenCalledWith({
            collection: 'productMetadata',
            keyField: 'shopifyHandle',
            keyValue: 'sneaker',
        });
    });

    it('renders a create-shaped form when the bridge resolves no document', async () => {
        const el = await EditorEditPage({
            manifest: baseManifest,
            runtime: buildRuntime(async () => null),
            params: { domain: 'a.test', id: '' },
            searchParams: { locale: 'de' },
            generatedActions,
        });
        const { getByTestId } = render(el);
        expect(getByTestId('doc-form').textContent).toBe('X');
    });

    it('calls notFound when access.read returns false', async () => {
        const manifest = defineCollectionEditor({
            ...baseManifest,
            access: { ...baseManifest.access, read: () => false },
        });
        await expect(
            EditorEditPage({
                manifest,
                runtime: buildRuntime(),
                params: { domain: 'a.test', id: '' },
                searchParams: { locale: 'de' },
                generatedActions,
            }),
        ).rejects.toThrow('NEXT_NOT_FOUND');
    });

    it('redirects to tenant.defaultLocale when searchParams.locale is missing', async () => {
        await expect(
            EditorEditPage({
                manifest: baseManifest,
                runtime: buildRuntime(),
                params: { domain: 'a.test', id: '' },
                searchParams: {},
                generatedActions,
            }),
        ).rejects.toThrow(/NEXT_REDIRECT:.*locale=de/);
    });

    it('redirects when searchParams.locale is not in tenant.locales', async () => {
        await expect(
            EditorEditPage({
                manifest: baseManifest,
                runtime: buildRuntime(),
                params: { domain: 'a.test', id: '' },
                searchParams: { locale: 'zz' },
                generatedActions,
            }),
        ).rejects.toThrow(/NEXT_REDIRECT:.*locale=de/);
    });

    it('locale-redirect for a singleton omits the id segment from the URL', async () => {
        await expect(
            EditorEditPage({
                manifest: baseManifest,
                runtime: buildRuntime(),
                params: { domain: 'a.test', id: '' },
                searchParams: {},
                generatedActions,
            }),
        ).rejects.toThrow('NEXT_REDIRECT:/a.test/x/?locale=de');
    });

    it('does not redirect when searchParams.locale is in tenant.locales', async () => {
        const el = await EditorEditPage({
            manifest: baseManifest,
            runtime: buildRuntime(),
            params: { domain: 'a.test', id: '' },
            searchParams: { locale: 'en' },
            generatedActions,
        });
        const { getByTestId } = render(el);
        expect(getByTestId('doc-form').textContent).toBe('X');
    });
});
