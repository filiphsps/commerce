import { describe, expect, it, vi } from 'vitest';
import { ShopSwitcher } from '@/components/shell/shop-switcher';
import { render, screen } from '@/utils/test/react';

vi.mock('next/link', () => ({
    default: ({ href, children, ...rest }: { href: string; children: React.ReactNode; [key: string]: unknown }) => (
        <a href={String(href)} {...rest}>
            {children}
        </a>
    ),
}));

describe('ShopSwitcher', () => {
    it('renders the current shop name in the trigger', () => {
        render(
            <ShopSwitcher
                current={{ name: 'Acme', domain: 'acme.test' }}
                shops={[
                    { name: 'Acme', domain: 'acme.test' },
                    { name: 'Beta', domain: 'beta.test' },
                ]}
            />,
        );
        expect(screen.getByRole('button', { name: /Acme/ })).toBeInTheDocument();
    });
});
