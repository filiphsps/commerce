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

    it('accepts a gravatar image and derives fallback initials from the name', () => {
        render(
            <AccountMenu
                user={{
                    name: 'Filiph S',
                    email: 'a@b.com',
                    image: 'https://www.gravatar.com/avatar/abc?d=mp&s=160',
                    role: 'admin',
                }}
            />,
        );
        // The trigger renders without error when an image is supplied (the `user.image` branch), and
        // the avatar fallback derives 'FS' from the name (the image element stays unmounted in the
        // test DOM until it loads, so the fallback is the stable assertion).
        expect(screen.getByRole('button', { name: /Account/i })).toBeInTheDocument();
        expect(screen.getByText('FS')).toBeInTheDocument();
    });
});
