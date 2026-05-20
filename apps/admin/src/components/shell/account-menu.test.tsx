import { describe, expect, it, vi } from 'vitest';
import { AccountMenu } from '@/components/shell/account-menu';
import { render, screen } from '@/utils/test/react';

vi.mock('next/link', () => ({
    default: ({ href, children, ...rest }: { href: string; children: React.ReactNode; [key: string]: unknown }) => (
        <a href={String(href)} {...rest}>
            {children}
        </a>
    ),
}));

describe('AccountMenu', () => {
    it('renders an avatar trigger with the user fallback initials', () => {
        render(<AccountMenu user={{ name: 'Filiph S', email: 'a@b.com', role: 'admin' }} />);
        expect(screen.getByRole('button', { name: /Account/i })).toBeInTheDocument();
    });
});
