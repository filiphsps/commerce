import { describe, expect, it, vi } from 'vitest';
import { IconRail, type IconRailGroup } from '@/components/shell/icon-rail';
import { render, screen } from '@/utils/test/react';

vi.mock('next/link', () => ({
    default: ({ href, children, ...rest }: { href: string; children: React.ReactNode; [key: string]: unknown }) => (
        <a href={String(href)} {...rest}>
            {children}
        </a>
    ),
}));

vi.mock('next/navigation', () => ({ usePathname: () => '/abc/settings/users/' }));

const GROUPS: IconRailGroup[] = [
    {
        id: 'workspace',
        label: 'Workspace',
        items: [
            { href: '/abc/' as never, label: 'Home', icon: <span data-testid="i-home" /> },
            { href: '/abc/settings' as never, label: 'Settings', icon: <span data-testid="i-set" /> },
        ],
    },
    {
        id: 'administration',
        label: 'Administration',
        items: [{ href: '/abc/settings/users/' as never, label: 'Users', icon: <span data-testid="i-usr" /> }],
    },
];

describe('IconRail', () => {
    it('renders nav links for every item across groups', () => {
        render(<IconRail groups={GROUPS} expanded={false} />);
        expect(screen.getByRole('link', { name: /Home/ })).toBeInTheDocument();
        expect(screen.getByRole('link', { name: /Settings/ })).toBeInTheDocument();
        expect(screen.getByRole('link', { name: /Users/ })).toBeInTheDocument();
    });

    it('marks only the most specific matching link active (Settings does not co-activate with Users)', () => {
        render(<IconRail groups={GROUPS} expanded={true} />);
        const current = screen.getAllByRole('link').filter((el) => el.getAttribute('aria-current') === 'page');
        expect(current).toHaveLength(1);
        expect(current[0]).toHaveAccessibleName(/Users/);
    });

    it('hides text labels and shows section eyebrows accordingly', () => {
        const { rerender } = render(<IconRail groups={GROUPS} expanded={false} />);
        expect(screen.queryByText('Home')).not.toBeInTheDocument();
        // Eyebrows are visible text only in the expanded state.
        expect(screen.queryByText('Workspace')).not.toBeInTheDocument();

        rerender(<IconRail groups={GROUPS} expanded={true} />);
        expect(screen.getByText('Home')).toBeInTheDocument();
        expect(screen.getByText('Workspace')).toBeInTheDocument();
        expect(screen.getByText('Administration')).toBeInTheDocument();
    });
});
