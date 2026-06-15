import { describe, expect, it, vi } from 'vitest';

const { mockEditorNewPage } = vi.hoisted(() => ({ mockEditorNewPage: vi.fn(() => null) }));
const { actions } = vi.hoisted(() => ({
    actions: {
        usersSaveDraft: vi.fn(),
        usersPublish: vi.fn(),
        usersCreate: vi.fn(),
        usersDelete: vi.fn(),
        usersBulkDelete: vi.fn(),
        usersBulkPublish: vi.fn(),
        usersRestoreVersion: vi.fn(),
    },
}));
vi.mock('@nordcom/commerce-cms/editor/ui', () => ({ EditorNewPage: mockEditorNewPage }));
vi.mock('@nordcom/commerce-cms/editor/manifests', () => ({
    usersEditor: { __mock: true, collection: 'users' },
}));
vi.mock('@/lib/editor-runtime', () => ({ editorRuntime: { __mock: true } }));
vi.mock('@/lib/cms-actions/_generated/users', () => actions);
vi.mock('server-only', () => ({}));

import ShopSettingsNewUserPage from './page';

describe('ShopSettingsNewUserPage', () => {
    it('passes the manifest + runtime + domain to <EditorNewPage>', async () => {
        const el = await ShopSettingsNewUserPage({
            params: Promise.resolve({ domain: 'acme.test' }),
            searchParams: Promise.resolve({}),
        });

        const element = el as { type: unknown; props: Record<string, unknown> };
        expect(element.type).toBe(mockEditorNewPage);
        expect(element.props).toMatchObject({
            manifest: { collection: 'users' },
            runtime: { __mock: true },
            params: { domain: 'acme.test' },
        });
    });

    it('forwards searchParams.locale to <EditorNewPage>', async () => {
        const el = await ShopSettingsNewUserPage({
            params: Promise.resolve({ domain: 'acme.test' }),
            searchParams: Promise.resolve({ locale: 'de-DE' }),
        });

        const element = el as { type: unknown; props: Record<string, unknown> };
        expect(element.props).toMatchObject({ searchParams: { locale: 'de-DE' } });
    });

    it('wires every generated action to its matching export', async () => {
        const el = await ShopSettingsNewUserPage({
            params: Promise.resolve({ domain: 'acme.test' }),
            searchParams: Promise.resolve({}),
        });

        const element = el as { type: unknown; props: { generatedActions: Record<string, unknown> } };
        const generated = element.props.generatedActions;
        expect(generated.saveDraft).toBe(actions.usersSaveDraft);
        expect(generated.publish).toBe(actions.usersPublish);
        expect(generated.create).toBe(actions.usersCreate);
        expect(generated.delete).toBe(actions.usersDelete);
        expect(generated.bulkDelete).toBe(actions.usersBulkDelete);
        expect(generated.bulkPublish).toBe(actions.usersBulkPublish);
        expect(generated.restoreVersion).toBe(actions.usersRestoreVersion);
    });

    it('exposes the page title via metadata', async () => {
        const { metadata } = await import('./page');
        expect(metadata.title).toBe('New User');
    });
});
