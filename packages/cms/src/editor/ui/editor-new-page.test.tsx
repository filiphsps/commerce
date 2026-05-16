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
vi.mock('next/headers', () => ({ headers: async () => new Headers() }));
vi.mock('payload', () => ({
    createLocalReq: vi.fn(async () => ({})),
    getLocalI18n: vi.fn(async () => ({})),
    getRequestLanguage: vi.fn(() => 'en'),
}));
vi.mock('payload/shared', () => ({ parseCookies: () => ({}) }));
// Mock the child component imports to avoid pulling in @payloadcms/ui's CSS side-effects
// in the node test environment (consistent with editor-edit-page.test.tsx).
vi.mock('./editor-fields', () => ({ EditorFields: () => null }));
vi.mock('./editor-form-toolbar', () => ({ EditorFormToolbar: () => null }));

import { EditorNewPage } from './editor-new-page';

const manifest = defineCollectionEditor({
    collection: 'pages',
    routes: { label: { singular: 'Page', plural: 'Pages' }, basePath: (d) => `/${d}/content/pages/` as Route },
    tenant: { kind: 'scoped', field: 'tenant' },
    access: { list: () => true, read: () => true, update: () => true, create: () => true },
});

const buildRuntime = (overrides: Record<string, unknown> = {}): never =>
    ({
        getCtx: async () => ({
            payload: { config: { collections: [{ slug: 'pages', fields: [], versions: false }], localization: false } },
            user: { id: 'u', email: 'e', role: 'editor', tenants: [{ tenant: 'tenant-1' }], collection: 'users' },
            tenant: { id: 'tenant-1', slug: 'acme' },
        }),
        toAccessCtx: (_ctx: never, domain: string | null) => ({ user: null, domain }),
        buildFormState: async () => ({ state: {} }),
        getShellProps: async () => ({}),
        DocumentForm: ({ title }: { title: string }) => <div data-testid="doc-form">{title}</div>,
        Table: () => null,
        Toolbar: () => null,
        ...overrides,
    }) as never;

describe('<EditorNewPage>', () => {
    it('renders DocumentForm with the singular label prefixed by "New"', async () => {
        const el = await EditorNewPage({
            manifest,
            runtime: buildRuntime(),
            params: { domain: 'a.test' },
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
        const { getByTestId } = render(el);
        // Plain DOM access — this package's tests don't load jest-dom.
        expect(getByTestId('doc-form').textContent).toBe('New Page');
    });
});
