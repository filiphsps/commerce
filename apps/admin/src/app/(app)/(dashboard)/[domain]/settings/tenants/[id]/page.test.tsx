import { describe, expect, it, vi } from 'vitest';

const { mockEditorEditPage } = vi.hoisted(() => ({ mockEditorEditPage: vi.fn(() => null) }));
const { actions } = vi.hoisted(() => ({
    actions: {
        tenantsSaveDraft: vi.fn(),
        tenantsPublish: vi.fn(),
        tenantsCreate: vi.fn(),
        tenantsDelete: vi.fn(),
        tenantsBulkDelete: vi.fn(),
        tenantsBulkPublish: vi.fn(),
        tenantsRestoreVersion: vi.fn(),
    },
}));
vi.mock('@nordcom/commerce-cms/editor/ui', () => ({ EditorEditPage: mockEditorEditPage }));
vi.mock('@nordcom/commerce-cms/editor/manifests', () => ({
    tenantsEditor: { __mock: true, collection: 'tenants' },
}));
vi.mock('@/lib/editor-runtime', () => ({ editorRuntime: { __mock: true } }));
vi.mock('@/lib/cms-actions/_generated/tenants', () => actions);
vi.mock('server-only', () => ({}));

import EditTenantPage from './page';

describe('EditTenantPage', () => {
    it('passes the manifest + runtime + domain-and-id to <EditorEditPage>', async () => {
        const el = await EditTenantPage({
            params: Promise.resolve({ domain: 'acme.test', id: 'tenant-1' }),
            searchParams: Promise.resolve({}),
        });

        const element = el as { type: unknown; props: Record<string, unknown> };
        expect(element.type).toBe(mockEditorEditPage);
        expect(element.props).toMatchObject({
            manifest: { collection: 'tenants' },
            runtime: { __mock: true },
            params: { domain: 'acme.test', id: 'tenant-1' },
        });
    });

    it('forwards searchParams.locale to <EditorEditPage>', async () => {
        const el = await EditTenantPage({
            params: Promise.resolve({ domain: 'acme.test', id: 'tenant-1' }),
            searchParams: Promise.resolve({ locale: 'de-DE' }),
        });

        const element = el as { type: unknown; props: Record<string, unknown> };
        expect(element.props).toMatchObject({ searchParams: { locale: 'de-DE' } });
    });

    it('wires every generated action to its matching export', async () => {
        const el = await EditTenantPage({
            params: Promise.resolve({ domain: 'acme.test', id: 'tenant-1' }),
            searchParams: Promise.resolve({}),
        });

        const element = el as { type: unknown; props: { generatedActions: Record<string, unknown> } };
        const generated = element.props.generatedActions;
        expect(generated.saveDraft).toBe(actions.tenantsSaveDraft);
        expect(generated.publish).toBe(actions.tenantsPublish);
        expect(generated.create).toBe(actions.tenantsCreate);
        expect(generated.delete).toBe(actions.tenantsDelete);
        expect(generated.bulkDelete).toBe(actions.tenantsBulkDelete);
        expect(generated.bulkPublish).toBe(actions.tenantsBulkPublish);
        expect(generated.restoreVersion).toBe(actions.tenantsRestoreVersion);
    });

    it('exposes the page title via metadata', async () => {
        const { metadata } = await import('./page');
        expect(metadata.title).toBe('Edit Tenant');
    });
});
