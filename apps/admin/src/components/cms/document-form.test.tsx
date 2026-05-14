import { describe, expect, it, vi } from 'vitest';

import { DocumentForm } from '@/components/cms/document-form';
import { render, screen } from '@/utils/test/react';

// ------------------------------------------------------------------
// Mocks — external modules that can't run in a test environment.
// ------------------------------------------------------------------

vi.mock('next/link', () => ({
    default: ({ href, children, ...rest }: { href: string; children: React.ReactNode; [key: string]: unknown }) => (
        <a href={String(href)} {...rest}>
            {children}
        </a>
    ),
}));

// Payload's <Form> is a rich client component — mock it to a simple <form>
// so the smoke test exercises DocumentForm's layout without Payload internals.
vi.mock('@payloadcms/ui', () => ({
    Form: ({ children }: { children: React.ReactNode }) => <form data-testid="payload-form">{children}</form>,
    ConfigProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// PayloadFieldShell wraps ConfigProvider, which is now a passthrough above.
// The import in document-form.tsx will use the mocked @payloadcms/ui automatically.

// ------------------------------------------------------------------
// Fixtures
// ------------------------------------------------------------------

const STUB_CONFIG = {} as import('payload').ClientConfig;

// ------------------------------------------------------------------
// Tests
// ------------------------------------------------------------------

describe('DocumentForm', () => {
    it('renders the page title', () => {
        render(
            <DocumentForm title="Edit Article: Hello World" clientConfig={STUB_CONFIG} onSubmit={vi.fn()}>
                <p>field content</p>
            </DocumentForm>,
        );

        expect(screen.getByRole('heading', { name: 'Edit Article: Hello World' })).toBeInTheDocument();
    });

    it('renders breadcrumb trail with links for non-last items', () => {
        render(
            <DocumentForm
                title="Edit Article"
                breadcrumbs={[
                    { label: 'Content', href: '/content/' as import('next').Route },
                    { label: 'Articles', href: '/content/articles/' as import('next').Route },
                    { label: 'Hello World' },
                ]}
                clientConfig={STUB_CONFIG}
                onSubmit={vi.fn()}
            >
                <p>child</p>
            </DocumentForm>,
        );

        // First two crumbs should be links.
        expect(screen.getByRole('link', { name: 'Content' })).toHaveAttribute('href', '/content/');
        expect(screen.getByRole('link', { name: 'Articles' })).toHaveAttribute('href', '/content/articles/');
        // Last crumb is plain text, not a link.
        expect(screen.queryByRole('link', { name: 'Hello World' })).not.toBeInTheDocument();
        expect(screen.getByText('Hello World')).toBeInTheDocument();
    });

    it('renders children inside the form', () => {
        render(
            <DocumentForm title="Test" clientConfig={STUB_CONFIG} onSubmit={vi.fn()}>
                <input data-testid="form-field" />
            </DocumentForm>,
        );

        expect(screen.getByTestId('form-field')).toBeInTheDocument();
    });

    it('renders the toolbar slot when provided', () => {
        render(
            <DocumentForm
                title="Test"
                clientConfig={STUB_CONFIG}
                onSubmit={vi.fn()}
                toolbar={<button type="button">Publish</button>}
            >
                <p>child</p>
            </DocumentForm>,
        );

        expect(screen.getByRole('button', { name: 'Publish' })).toBeInTheDocument();
    });

    it('renders the livePreview slot when provided', () => {
        render(
            <DocumentForm
                title="Test"
                clientConfig={STUB_CONFIG}
                onSubmit={vi.fn()}
                livePreview={<div data-testid="preview-pane">Preview</div>}
            >
                <p>child</p>
            </DocumentForm>,
        );

        expect(screen.getByTestId('preview-pane')).toBeInTheDocument();
    });

    it('omits the breadcrumb nav when breadcrumbs is not provided', () => {
        render(
            <DocumentForm title="Test" clientConfig={STUB_CONFIG} onSubmit={vi.fn()}>
                <p>child</p>
            </DocumentForm>,
        );

        expect(screen.queryByRole('navigation', { name: 'Breadcrumb' })).not.toBeInTheDocument();
    });
});
