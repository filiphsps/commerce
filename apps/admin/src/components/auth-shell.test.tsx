import { describe, expect, it, vi } from 'vitest';

// ------------------------------------------------------------------
// Mocks
// ------------------------------------------------------------------

vi.mock('next/image', () => ({
    // biome-ignore lint/performance/noImgElement: test mock for next/image
    default: ({ alt }: { alt: string }) => <img alt={alt} />,
}));
vi.mock('next/link', () => ({
    default: ({ children, href, title }: { children: React.ReactNode; href: string; title?: string }) => (
        <a href={href} title={title}>
            {children}
        </a>
    ),
}));
vi.mock('@nordcom/nordstar', () => ({
    Heading: ({ children }: { children: React.ReactNode }) => <h1>{children}</h1>,
    Label: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

import { render, within } from '@testing-library/react';
import type React from 'react';
import { AuthShell } from './auth-shell';

describe('components/auth-shell', () => {
    it('renders the title heading', () => {
        const { container } = render(<AuthShell title="Sign in">body</AuthShell>);
        expect(within(container).getByRole('heading', { level: 1 })).toHaveTextContent('Sign in');
    });

    it('renders the brand logo linking home', () => {
        const { container } = render(<AuthShell title="Sign in">body</AuthShell>);
        const q = within(container);
        expect(q.getByAltText('Nordcom Commerce Logo')).toBeInTheDocument();
        // The link's accessible name derives from the wrapped logo's alt text.
        expect(q.getByRole('link', { name: 'Nordcom Commerce Logo' })).toHaveAttribute('href', '/');
    });

    it('renders the body children', () => {
        const { container } = render(
            <AuthShell title="Sign in">
                <span>card body</span>
            </AuthShell>,
        );
        expect(within(container).getByText('card body')).toBeInTheDocument();
    });

    it('renders the eyebrow only when provided', () => {
        const without = render(<AuthShell title="Sign in">body</AuthShell>);
        expect(without.queryByText('hello there')).not.toBeInTheDocument();
        without.unmount();

        const withEyebrow = render(
            <AuthShell eyebrow="hello there" title="Sign in">
                body
            </AuthShell>,
        );
        expect(within(withEyebrow.container).getByText('hello there')).toBeInTheDocument();
    });

    it('renders the footer inside a footer landmark only when provided', () => {
        const without = render(<AuthShell title="Sign in">body</AuthShell>);
        expect(without.container.querySelector('footer')).toBeNull();
        without.unmount();

        const withFooter = render(
            <AuthShell title="Sign in" footer={<button type="button">go</button>}>
                body
            </AuthShell>,
        );
        const footer = withFooter.container.querySelector('footer');
        expect(footer).not.toBeNull();
        expect(within(footer as HTMLElement).getByRole('button', { name: 'go' })).toBeInTheDocument();
    });
});
