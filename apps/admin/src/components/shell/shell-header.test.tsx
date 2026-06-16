import { describe, expect, it, vi } from 'vitest';
import { ShellHeader } from '@/components/shell/shell-header';
import { ThemeProvider } from '@/components/theme/theme-provider';
import { render, screen } from '@/utils/test/react';

vi.mock('next/image', () => ({
    // biome-ignore lint/performance/noImgElement: test mock for next/image
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
// Stub the Clerk client surfaces the header mounts so it renders without a real ClerkProvider.
vi.mock('@clerk/nextjs', () => {
    const UserButton = Object.assign(
        ({ children }: { children?: React.ReactNode }) => <div data-testid="user-button">{children}</div>,
        {
            MenuItems: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
            Action: ({ label }: { label: string }) => <button type="button">{label}</button>,
        },
    );
    return {
        UserButton,
        OrganizationSwitcher: () => <div data-testid="org-switcher" />,
    };
});

describe('ShellHeader', () => {
    it('renders logo, org switcher, shop switcher, command-palette trigger, and account menu', () => {
        render(
            <ThemeProvider initialPreference="dark">
                <ShellHeader
                    shop={{ name: 'Acme', domain: 'acme.test' }}
                    shopsForSwitcher={[{ name: 'Acme', domain: 'acme.test' }]}
                    commandPaletteItems={[]}
                    navSections={[{ label: 'Home', href: '/acme.test/' }]}
                    mobileNavContent={<div data-testid="mn">mobile</div>}
                />
            </ThemeProvider>,
        );
        expect(screen.getByAltText(/Nordcom Commerce Logo/i)).toBeInTheDocument();
        expect(screen.getByTestId('org-switcher')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Acme/ })).toBeInTheDocument();
        expect(screen.getByTestId('user-button')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Search/i })).toBeInTheDocument();
    });
});
