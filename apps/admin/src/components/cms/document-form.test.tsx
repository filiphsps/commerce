import { describe, expect, it, vi } from 'vitest';

import { type CmsShellProps, DocumentForm } from '@/components/cms/document-form';
import { render, screen } from '@/utils/test/react';

vi.mock('next/link', () => ({
    default: ({ href, children, ...rest }: { href: string; children: React.ReactNode; [key: string]: unknown }) => (
        <a href={String(href)} {...rest}>
            {children}
        </a>
    ),
}));

// `DocumentFormBody` owns the dirty-gate around Payload's `<Form>` —
// behavior is exercised in `./document-form-body.test.tsx`. Here the only
// thing the chrome tests care about is that children render, so pass through.
vi.mock('@/components/cms/document-form-body', () => ({
    DocumentFormBody: ({ children }: { children: React.ReactNode }) => (
        <form data-testid="payload-form">{children}</form>
    ),
}));

// Since CMSGATE-01 the shell-prop bag is opaque and UNCONSUMED here — the
// Payload field shell moved into the theme route's bespoke field surface, so
// this chrome needs no `@nordcom/commerce-cms/ui` mock anymore. The prop is
// still part of the runtime seam's call shape, so the tests keep passing one.
const STUB_SHELL_PROPS: CmsShellProps = { theme: 'light' };

describe('DocumentForm', () => {
    it('renders the title via PageHeader', () => {
        render(
            <DocumentForm title="Edit Article: Hello" shellProps={STUB_SHELL_PROPS} onSubmit={vi.fn()}>
                <p>field</p>
            </DocumentForm>,
        );
        expect(screen.getByRole('heading', { level: 1, name: 'Edit Article: Hello' })).toBeInTheDocument();
    });

    it('renders breadcrumbs via PageHeader', () => {
        render(
            <DocumentForm
                title="Edit"
                breadcrumbs={[
                    { label: 'Content', href: '/abc/content/' as import('next').Route },
                    { label: 'Articles', href: '/abc/content/articles/' as import('next').Route },
                    { label: 'Edit' },
                ]}
                shellProps={STUB_SHELL_PROPS}
                onSubmit={vi.fn()}
            >
                <p>field</p>
            </DocumentForm>,
        );
        expect(screen.getByRole('link', { name: 'Content' })).toBeInTheDocument();
    });

    it('renders toolbar via PageFooter when provided', () => {
        const { container } = render(
            <DocumentForm
                title="Edit"
                shellProps={STUB_SHELL_PROPS}
                onSubmit={vi.fn()}
                toolbar={<button type="button">Save draft</button>}
            >
                <p>field</p>
            </DocumentForm>,
        );
        expect(container.querySelector('[data-page-footer]')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Save draft' })).toBeInTheDocument();
    });

    it('does NOT use the calc(100vh-4.5rem) hack', () => {
        const { container } = render(
            <DocumentForm title="X" shellProps={STUB_SHELL_PROPS} onSubmit={vi.fn()}>
                <p>x</p>
            </DocumentForm>,
        );
        expect(container.innerHTML).not.toContain('calc(100vh');
        expect(container.innerHTML).not.toContain('min-h-[150vh]');
    });
});
