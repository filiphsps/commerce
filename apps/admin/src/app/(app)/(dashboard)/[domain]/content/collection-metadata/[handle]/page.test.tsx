import { describe, expect, it, vi } from 'vitest';

const { mockEditorEditPage } = vi.hoisted(() => ({ mockEditorEditPage: vi.fn(() => null) }));
vi.mock('@nordcom/commerce-cms/editor/ui', () => ({ EditorEditPage: mockEditorEditPage }));
vi.mock('@nordcom/commerce-cms/editor/manifests', () => ({
    collectionMetadataEditor: { __mock: true, collection: 'collectionMetadata' },
}));
vi.mock('@/lib/editor-runtime', () => ({ editorRuntime: { __mock: true } }));
vi.mock('@/lib/cms-actions/_generated/collectionMetadata', () => ({
    collectionMetadataSaveDraft: vi.fn(),
    collectionMetadataPublish: vi.fn(),
    collectionMetadataCreate: vi.fn(),
    collectionMetadataDelete: vi.fn(),
    collectionMetadataBulkDelete: vi.fn(),
    collectionMetadataBulkPublish: vi.fn(),
    collectionMetadataRestoreVersion: vi.fn(),
}));
vi.mock('server-only', () => ({}));

import * as actions from '@/lib/cms-actions/_generated/collectionMetadata';
import CollectionMetadataEditPage, { metadata } from './page';

describe('CollectionMetadataEditPage', () => {
    it('passes the manifest + runtime + handle-as-id to <EditorEditPage>', async () => {
        const el = await CollectionMetadataEditPage({
            params: Promise.resolve({ domain: 'acme.test', handle: 'winter-sale' }),
            searchParams: Promise.resolve({}),
        });

        const element = el as { type: unknown; props: Record<string, unknown> };
        expect(element.type).toBe(mockEditorEditPage);
        expect(element.props).toMatchObject({
            manifest: { collection: 'collectionMetadata' },
            runtime: { __mock: true },
            // The `[handle]` route param is mapped onto the editor `id` prop.
            params: { domain: 'acme.test', id: 'winter-sale' },
        });
    });

    it('wires each generated action to the matching export', async () => {
        const el = await CollectionMetadataEditPage({
            params: Promise.resolve({ domain: 'acme.test', handle: 'winter-sale' }),
            searchParams: Promise.resolve({}),
        });

        const element = el as { props: { generatedActions: Record<string, unknown> } };
        expect(element.props.generatedActions.saveDraft).toBe(actions.collectionMetadataSaveDraft);
        expect(element.props.generatedActions.publish).toBe(actions.collectionMetadataPublish);
        expect(element.props.generatedActions.create).toBe(actions.collectionMetadataCreate);
        expect(element.props.generatedActions.delete).toBe(actions.collectionMetadataDelete);
        expect(element.props.generatedActions.bulkDelete).toBe(actions.collectionMetadataBulkDelete);
        expect(element.props.generatedActions.bulkPublish).toBe(actions.collectionMetadataBulkPublish);
        expect(element.props.generatedActions.restoreVersion).toBe(actions.collectionMetadataRestoreVersion);
    });

    it('forwards searchParams.locale to <EditorEditPage>', async () => {
        const el = await CollectionMetadataEditPage({
            params: Promise.resolve({ domain: 'acme.test', handle: 'winter-sale' }),
            searchParams: Promise.resolve({ locale: 'de-DE' }),
        });

        const element = el as { props: Record<string, unknown> };
        expect(element.props).toMatchObject({ searchParams: { locale: 'de-DE' } });
    });

    it('exposes the page title metadata', () => {
        expect(metadata.title).toBe('Edit collection metadata');
    });
});
