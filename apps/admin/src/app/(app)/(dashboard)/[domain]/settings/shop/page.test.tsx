import { describe, expect, it, vi } from 'vitest';

const { mockEditorEditPage } = vi.hoisted(() => ({ mockEditorEditPage: vi.fn(() => null) }));
vi.mock('@nordcom/commerce-cms/editor/ui', () => ({ EditorEditPage: mockEditorEditPage }));
vi.mock('@nordcom/commerce-cms/editor/manifests', () => ({
    shopsEditor: { __mock: true, collection: 'shops' },
}));
vi.mock('@/lib/editor-runtime', () => ({ editorRuntime: { __mock: true } }));
vi.mock('@/lib/cms-actions/_generated/shops', () => ({
    shopsSaveDraft: () => undefined,
    shopsPublish: () => undefined,
    shopsCreate: () => undefined,
    shopsDelete: () => undefined,
    shopsBulkDelete: () => undefined,
    shopsBulkPublish: () => undefined,
    shopsRestoreVersion: () => undefined,
}));
vi.mock('server-only', () => ({}));

import ShopSettingsPage from './page';

describe('ShopSettingsPage', () => {
    it('passes the manifest + runtime + domain-as-id to <EditorEditPage>', async () => {
        const el = await ShopSettingsPage({
            params: Promise.resolve({ domain: 'beta.pouched.de' }),
            searchParams: Promise.resolve({}),
        });

        const element = el as { type: unknown; props: Record<string, unknown> };
        expect(element.type).toBe(mockEditorEditPage);
        expect(element.props).toMatchObject({
            manifest: { collection: 'shops' },
            runtime: { __mock: true },
            // Shop is keyed by domain (`singleton-by-domain` manifest), so `id === domain`.
            params: { domain: 'beta.pouched.de', id: 'beta.pouched.de' },
        });
    });

    // Regression: previously the page hardcoded `searchParams={{}}`, which made
    // EditorEditPage always observe `locale === undefined`, fail its tenant-allow-list
    // check, and redirect to `?locale=<tenantDefault>`. The browser followed; the
    // page rendered again with empty searchParams; the redirect fired again — an
    // infinite reload loop in the admin shell.
    it('forwards searchParams.locale to <EditorEditPage> (prevents redirect loop)', async () => {
        const el = await ShopSettingsPage({
            params: Promise.resolve({ domain: 'beta.pouched.de' }),
            searchParams: Promise.resolve({ locale: 'de-DE' }),
        });

        const element = el as { type: unknown; props: Record<string, unknown> };
        expect(element.props).toMatchObject({ searchParams: { locale: 'de-DE' } });
    });
});
