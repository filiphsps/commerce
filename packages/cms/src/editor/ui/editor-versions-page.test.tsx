// @vitest-environment happy-dom
import { render } from '@testing-library/react';
import type { Route } from 'next';
import { describe, expect, it, vi } from 'vitest';
import { defineCollectionEditor } from '../manifest';

vi.mock('next/navigation', () => ({
    notFound: () => {
        throw new Error('NEXT_NOT_FOUND');
    },
}));

import { EditorVersionsPage } from './editor-versions-page';

const manifest = defineCollectionEditor({
    collection: 'businessData',
    routes: {
        label: { singular: 'Business data', plural: 'Business data' },
        basePath: (d) => `/${d}/content/business-data/` as Route,
    },
    tenant: { kind: 'scoped', field: 'tenant' },
    access: { list: () => true, read: () => true, update: () => true },
});

const buildRuntime = (versions: Array<Record<string, unknown>>): never =>
    ({
        getCtx: async () => ({
            payload: {
                config: { collections: [{ slug: 'businessData', versions: { drafts: true } }] },
                findVersions: async () => ({ docs: versions }),
            },
            user: { id: 'u', email: 'e', role: 'editor', tenants: [{ tenant: 'tenant-1' }], collection: 'users' },
            tenant: { id: 'tenant-1', slug: 'acme' },
        }),
        toAccessCtx: (_ctx: never, domain: string | null) => ({ user: null, domain }),
        DocumentForm: () => null,
        Table: () => null,
        Toolbar: () => null,
        buildFormState: async () => ({ state: {} }),
        getShellProps: async () => ({}),
    }) as never;

describe('<EditorVersionsPage>', () => {
    it('renders an empty state when no versions exist', async () => {
        const el = await EditorVersionsPage({
            manifest,
            runtime: buildRuntime([]),
            params: { domain: 'a.test', id: 'singleton' },
            generatedActions: {
                saveDraft: async () => {},
                publish: async () => {},
                delete: async () => {},
                create: async () => ({ id: 'new' }),
                bulkDelete: async () => {},
                bulkPublish: async () => {},
                restoreVersion: async () => {},
            },
        });
        const { container } = render(el);
        // Plain DOM access — no jest-dom.
        expect(container.textContent).toMatch(/no version history/i);
    });

    it('renders one row per version', async () => {
        const versions = [
            { id: 'v1', updatedAt: '2026-05-15T10:00:00Z', version: { updatedBy: 'editor@test' }, latest: false },
            { id: 'v2', updatedAt: '2026-05-15T12:00:00Z', version: { updatedBy: 'admin@test' }, latest: true },
        ];
        const el = await EditorVersionsPage({
            manifest,
            runtime: buildRuntime(versions),
            params: { domain: 'a.test', id: 'singleton' },
            generatedActions: {
                saveDraft: async () => {},
                publish: async () => {},
                delete: async () => {},
                create: async () => ({ id: 'new' }),
                bulkDelete: async () => {},
                bulkPublish: async () => {},
                restoreVersion: async () => {},
            },
        });
        const { container } = render(el);
        expect(container.querySelectorAll('li')).toHaveLength(2);
    });
});
