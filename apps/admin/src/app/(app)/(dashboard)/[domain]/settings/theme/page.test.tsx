import { describe, expect, it, vi } from 'vitest';

const { mockEditorEditPage } = vi.hoisted(() => ({ mockEditorEditPage: vi.fn(() => null) }));
const { mockBuildStorefrontPreviewUrl } = vi.hoisted(() => ({
    mockBuildStorefrontPreviewUrl: vi.fn(() => 'https://acme.test/api/cms-preview?secret=&redirect=%2Fen-US%2F'),
}));
const { actions } = vi.hoisted(() => ({
    actions: {
        shopsSaveDraft: vi.fn(),
        shopsPublish: vi.fn(),
        shopsCreate: vi.fn(),
        shopsDelete: vi.fn(),
        shopsBulkDelete: vi.fn(),
        shopsBulkPublish: vi.fn(),
        shopsRestoreVersion: vi.fn(),
    },
}));
vi.mock('@nordcom/commerce-cms/editor/ui', () => ({ EditorEditPage: mockEditorEditPage }));
vi.mock('@nordcom/commerce-cms/editor/manifests', () => ({
    shopsEditor: { __mock: true, collection: 'shops' },
}));
vi.mock('@/lib/editor-runtime', () => ({ editorRuntime: { __mock: true } }));
vi.mock('@/lib/cms-actions/_generated/shops', () => actions);
vi.mock('@/lib/storefront-preview', () => ({ buildStorefrontPreviewUrl: mockBuildStorefrontPreviewUrl }));
vi.mock('@/components/theme-editor/theme-editor', () => ({ ThemeEditor: () => null }));
vi.mock('@/components/theme-editor/preview-bridge', () => ({ PreviewBridge: () => null }));
vi.mock('server-only', () => ({}));

import ThemeSettingsPage from './page';

describe('ThemeSettingsPage', () => {
    it('passes the manifest + runtime + domain-as-id to <EditorEditPage>', async () => {
        const el = await ThemeSettingsPage({
            params: Promise.resolve({ domain: 'acme.test' }),
            searchParams: Promise.resolve({ locale: 'de-DE' }),
        });

        const element = el as { type: unknown; props: Record<string, unknown> };
        expect(element.type).toBe(mockEditorEditPage);
        expect(element.props).toMatchObject({
            manifest: { collection: 'shops' },
            runtime: { __mock: true },
            // Shop is keyed by domain (`singleton-by-domain` manifest), so `id === domain`.
            params: { domain: 'acme.test', id: 'acme.test' },
        });
    });

    it('forwards searchParams.locale to <EditorEditPage>', async () => {
        const el = await ThemeSettingsPage({
            params: Promise.resolve({ domain: 'acme.test' }),
            searchParams: Promise.resolve({ locale: 'de-DE' }),
        });

        const element = el as { type: unknown; props: Record<string, unknown> };
        expect(element.props).toMatchObject({ searchParams: { locale: 'de-DE' } });
    });

    it('builds the preview URL with the requested locale and shop collection', async () => {
        mockBuildStorefrontPreviewUrl.mockClear();
        await ThemeSettingsPage({
            params: Promise.resolve({ domain: 'acme.test' }),
            searchParams: Promise.resolve({ locale: 'de-DE' }),
        });

        expect(mockBuildStorefrontPreviewUrl).toHaveBeenCalledWith({
            domain: 'acme.test',
            collection: 'shops',
            data: {},
            locale: 'de-DE',
        });
    });

    it('falls back to en-US when searchParams.locale is absent', async () => {
        mockBuildStorefrontPreviewUrl.mockClear();
        await ThemeSettingsPage({
            params: Promise.resolve({ domain: 'acme.test' }),
            searchParams: Promise.resolve({}),
        });

        expect(mockBuildStorefrontPreviewUrl).toHaveBeenCalledWith({
            domain: 'acme.test',
            collection: 'shops',
            data: {},
            locale: 'en-US',
        });
    });

    it('wires every generated action to its matching export', async () => {
        const el = await ThemeSettingsPage({
            params: Promise.resolve({ domain: 'acme.test' }),
            searchParams: Promise.resolve({ locale: 'de-DE' }),
        });

        const element = el as { type: unknown; props: { generatedActions: Record<string, unknown> } };
        const generated = element.props.generatedActions;
        expect(generated.saveDraft).toBe(actions.shopsSaveDraft);
        expect(generated.publish).toBe(actions.shopsPublish);
        expect(generated.create).toBe(actions.shopsCreate);
        expect(generated.delete).toBe(actions.shopsDelete);
        expect(generated.bulkDelete).toBe(actions.shopsBulkDelete);
        expect(generated.bulkPublish).toBe(actions.shopsBulkPublish);
        expect(generated.restoreVersion).toBe(actions.shopsRestoreVersion);
    });

    it('exposes the page title via metadata', async () => {
        const { metadata } = await import('./page');
        expect(metadata.title).toBe('Theme Editor');
    });
});
