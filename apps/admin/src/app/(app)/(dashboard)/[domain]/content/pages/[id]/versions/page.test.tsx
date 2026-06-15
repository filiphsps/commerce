import { describe, expect, it, vi } from 'vitest';

const { mockEditorVersionsPage } = vi.hoisted(() => ({ mockEditorVersionsPage: vi.fn(() => null) }));
const { actions } = vi.hoisted(() => ({
    actions: {
        pagesSaveDraft: vi.fn(),
        pagesPublish: vi.fn(),
        pagesCreate: vi.fn(),
        pagesDelete: vi.fn(),
        pagesBulkDelete: vi.fn(),
        pagesBulkPublish: vi.fn(),
        pagesRestoreVersion: vi.fn(),
    },
}));
vi.mock('@nordcom/commerce-cms/editor/ui', () => ({ EditorVersionsPage: mockEditorVersionsPage }));
vi.mock('@nordcom/commerce-cms/editor/manifests', () => ({
    pagesEditor: { __mock: true, collection: 'pages' },
}));
vi.mock('@/lib/editor-runtime', () => ({ editorRuntime: { __mock: true } }));
vi.mock('@/lib/cms-actions/_generated/pages', () => actions);
vi.mock('server-only', () => ({}));

import PageVersionsPage from './page';

describe('PageVersionsPage', () => {
    it('passes the manifest + runtime + domain-and-id to <EditorVersionsPage>', async () => {
        const el = await PageVersionsPage({
            params: Promise.resolve({ domain: 'acme.test', id: 'doc-1' }),
            searchParams: Promise.resolve({}),
        });

        const element = el as { type: unknown; props: Record<string, unknown> };
        expect(element.type).toBe(mockEditorVersionsPage);
        expect(element.props).toMatchObject({
            manifest: { collection: 'pages' },
            runtime: { __mock: true },
            params: { domain: 'acme.test', id: 'doc-1' },
        });
    });

    it('forwards searchParams.locale to <EditorVersionsPage>', async () => {
        const el = await PageVersionsPage({
            params: Promise.resolve({ domain: 'acme.test', id: 'doc-1' }),
            searchParams: Promise.resolve({ locale: 'de-DE' }),
        });

        const element = el as { type: unknown; props: Record<string, unknown> };
        expect(element.props).toMatchObject({ searchParams: { locale: 'de-DE' } });
    });

    it('wires every generated action to its matching export', async () => {
        const el = await PageVersionsPage({
            params: Promise.resolve({ domain: 'acme.test', id: 'doc-1' }),
            searchParams: Promise.resolve({}),
        });

        const element = el as { type: unknown; props: { generatedActions: Record<string, unknown> } };
        const generated = element.props.generatedActions;
        expect(generated.saveDraft).toBe(actions.pagesSaveDraft);
        expect(generated.publish).toBe(actions.pagesPublish);
        expect(generated.create).toBe(actions.pagesCreate);
        expect(generated.delete).toBe(actions.pagesDelete);
        expect(generated.bulkDelete).toBe(actions.pagesBulkDelete);
        expect(generated.bulkPublish).toBe(actions.pagesBulkPublish);
        expect(generated.restoreVersion).toBe(actions.pagesRestoreVersion);
    });

    it('exposes the page title via metadata', async () => {
        const { metadata } = await import('./page');
        expect(metadata.title).toBe('Page — Versions');
    });
});
