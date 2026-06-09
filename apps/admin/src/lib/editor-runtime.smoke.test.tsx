import { useField, useFormModified } from '@nordcom/commerce-cms/editor/form';
import { describe, expect, it, vi } from 'vitest';

import { fireEvent, render } from '@/utils/test/react';

// The Payload provider shell is a heavy RootProvider tree (and a CSS
// side-effect import); the smoke test verifies the NATIVE core mounts inside
// the runtime's DocumentForm, so the shell collapses to a pass-through.
vi.mock('@nordcom/commerce-cms/ui', () => ({
    PayloadFieldShell: ({ children }: { children?: React.ReactNode }) => <div data-testid="shell">{children}</div>,
}));
vi.mock('@/components/shell/page-header', () => ({
    PageHeader: ({ title }: { title: string }) => <h1>{title}</h1>,
}));
vi.mock('@/components/shell/page-footer', () => ({
    PageFooter: ({ children }: { children?: React.ReactNode }) => <footer>{children}</footer>,
}));

// Runtime bindings this render never reaches — the toolbar/table/empty-state
// pull @nordcom/nordstar CSS modules that the node test transform rejects.
vi.mock('@/components/cms/collection-table', () => ({ CollectionTable: vi.fn() }));
vi.mock('@/components/cms/draft-publish-toolbar', () => ({ DraftPublishToolbar: vi.fn() }));
vi.mock('@/components/shell/empty-state', () => ({ EmptyState: vi.fn() }));

// Server-side wiring the runtime module imports but this render never calls.
vi.mock('./editor-convex-bridge', () => ({ editorConvexBridge: {} }));
vi.mock('./get-cms-shell-props', () => ({ getCmsShellProps: vi.fn() }));
vi.mock('./payload-ctx', () => ({ getAuthedPayloadCtx: vi.fn() }));

import { editorRuntime } from './editor-runtime';

/**
 * Minimal field widget bound to the NATIVE form context. Rendering it without
 * the CMSFORM-01 `<Form>` mounted would throw `MissingContextProviderError`,
 * so a successful render IS the assertion that the rewired runtime's
 * DocumentForm mounts the native core (not Payload's `<Form>`).
 *
 * @param props.path - Dotted form-state path to bind.
 */
function TitleField({ path }: { path: string }) {
    const { value, setValue } = useField<string>({ path });
    const modified = useFormModified();
    return (
        <label>
            <input data-testid="title" value={value ?? ''} onChange={(event) => setValue(event.target.value)} />
            <output data-testid="modified">{String(modified)}</output>
        </label>
    );
}

describe('editorRuntime smoke (CMSDATA-06)', () => {
    it('renders an editor surface through the rewired runtime with the native form core mounted', async () => {
        const { state } = await editorRuntime.buildFormState({
            collectionSlug: 'pages',
            data: { title: 'Hello world', slug: 'hello' },
            operation: 'update',
            locale: 'en-US',
        });

        const DocumentForm = editorRuntime.DocumentForm;
        const { container, getByTestId } = render(
            <DocumentForm title="Edit page" shellProps={{}} onSubmit={async () => {}} initialState={state}>
                <TitleField path="title" />
            </DocumentForm>,
        );

        // The native <Form> renders a real <form> element and seeds the field
        // from the runtime-built state.
        expect(container.querySelector('form')).not.toBeNull();
        expect((getByTestId('title') as HTMLInputElement).value).toBe('Hello world');
        expect(getByTestId('modified').textContent).toBe('false');

        // Editing through the native context flips the core's dirty tracking.
        fireEvent.change(getByTestId('title'), { target: { value: 'Edited' } });
        expect((getByTestId('title') as HTMLInputElement).value).toBe('Edited');
        expect(getByTestId('modified').textContent).toBe('true');
    });
});
