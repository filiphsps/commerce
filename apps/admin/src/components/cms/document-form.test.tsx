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

vi.mock('@payloadcms/ui', () => ({
    Form: ({ children }: { children: React.ReactNode }) => <form data-testid="payload-form">{children}</form>,
    RootProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    defaultTheme: 'light',
}));

// Mock `@nordcom/commerce-cms/ui` so the test bypasses the package's
// transitive `@payloadcms/ui/css` -> `react-image-crop/dist/ReactCrop.css`
// side-effect chain. The compiled cms package is loaded by Node (externalized
// from `node_modules`), so `vi.mock('@payloadcms/ui', …)` above cannot reach
// EditUpload's CSS import — mocking at this boundary cuts the chain entirely.
vi.mock('@nordcom/commerce-cms/ui', () => ({
    PayloadFieldShell: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Stub the cms-server-function module — the real one imports `payload.config`
// which boots the full Payload runtime (Mongo, plugins, etc.).
vi.mock('@/lib/cms-server-function', () => ({ cmsServerFunction: vi.fn() }));

const STUB_SHELL_PROPS = {
    config: {} as unknown,
    serverFunction: vi.fn(),
    dateFNSKey: 'en-US' as unknown,
    fallbackLang: 'en' as unknown,
    languageCode: 'en',
    languageOptions: [] as unknown,
    permissions: {} as unknown,
    theme: 'light',
    translations: {} as unknown,
    user: null,
} as unknown as CmsShellProps;

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
