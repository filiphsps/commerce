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

import { EditorListPage } from './editor-list-page';

const manifest = defineCollectionEditor({
    collection: 'pages',
    routes: { label: { singular: 'Page', plural: 'Pages' }, basePath: (d) => `/${d}/content/pages/` as Route },
    tenant: { kind: 'scoped', field: 'tenant' },
    access: { list: () => true, read: () => true, update: () => true },
    list: { columns: [{ label: 'Title', accessor: 'title' }] },
});

const buildRuntime = (): never =>
    ({
        getCtx: async () => ({
            payload: {
                config: { collections: [] },
                find: async () => ({
                    docs: [
                        { id: '1', title: 'Hello' },
                        { id: '2', title: 'World' },
                    ],
                }),
            },
            user: { id: 'u', email: 'e', role: 'editor', tenants: [{ tenant: 'tenant-1' }], collection: 'users' },
            tenant: { id: 'tenant-1', slug: 'acme' },
        }),
        toAccessCtx: (_ctx: never, domain: string | null) => ({ user: null, domain }),
        Table: ({ rows }: { rows: Array<{ id: string }> }) => <div data-testid="table">{rows.length} rows</div>,
        DocumentForm: () => null,
        Toolbar: () => null,
        buildFormState: async () => ({ state: {} }),
        getClientConfig: async () => ({}),
    }) as never;

describe('<EditorListPage>', () => {
    it('renders the runtime Table with the docs returned from payload.find', async () => {
        const el = await EditorListPage({
            manifest,
            runtime: buildRuntime(),
            params: { domain: 'a.test' },
            searchParams: {},
        });
        const { getByTestId } = render(el);
        // Plain DOM access — this package's tests don't load jest-dom.
        expect(getByTestId('table').textContent).toBe('2 rows');
    });
});
