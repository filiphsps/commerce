import { describe, expect, it, vi } from 'vitest';
import { ShellHeader } from '@/components/shell/shell-header';
import { render, screen } from '@/utils/test/react';

vi.mock('next/image', () => ({
    default: ({ alt }: { alt: string }) => <img alt={alt} />,
}));
vi.mock('next/link', () => ({
    default: ({ href, children, ...rest }: { href: string; children: React.ReactNode; [key: string]: unknown }) => (
        <a href={String(href)} {...rest}>
            {children}
        </a>
    ),
}));
vi.mock('next/navigation', () => ({ usePathname: () => '/abc/', useRouter: () => ({ push: vi.fn() }) }));

describe('ShellHeader', () => {
    it('renders logo, shop switcher, command-palette trigger, and account menu', () => {
        render(
            <ShellHeader
                shop={{ name: 'Acme', domain: 'acme.test' }}
                user={{ name: 'A B', email: 'a@b.com', role: 'admin' }}
                shopsForSwitcher={[{ name: 'Acme', domain: 'acme.test' }]}
                commandPaletteItems={[]}
            />,
        );
        expect(screen.getByAltText(/Nordcom Commerce Logo/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Acme/ })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Account/ })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Search/i })).toBeInTheDocument();
    });
});
