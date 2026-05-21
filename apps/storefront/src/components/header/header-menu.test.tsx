import { describe, expect, it, vi } from 'vitest';
import { Locale } from '@/utils/locale';
import { mockNavItem } from '@/utils/test/fixtures';
import { fireEvent, render } from '@/utils/test/react';
import { HeaderMenuTrigger } from './header-menu';

vi.mock('next/navigation', () => ({ usePathname: () => '/en-US/' }));

const en = Locale.from('en-US');

const itemWithChildren = (overrides?: object) =>
    mockNavItem({
        link: { kind: 'page', label: 'Categories', page: { slug: 'categories' } as never, openInNewTab: false },
        items: [
            {
                id: 'l2-1',
                link: { kind: 'page', label: 'Hats', page: { slug: 'hats' } as never, openInNewTab: false },
                description: 'Stuff for the head',
            },
        ] as never,
        ...overrides,
    });

describe('<HeaderMenuTrigger>', () => {
    it('renders the top label as a button', () => {
        const { container } = render(<HeaderMenuTrigger item={itemWithChildren()} locale={{ code: en.code }} />);
        expect(container.querySelector('button')?.textContent).toContain('Categories');
    });

    it('opens the panel on click and reveals child links', () => {
        const { container, getByText } = render(
            <HeaderMenuTrigger item={itemWithChildren()} locale={{ code: en.code }} />,
        );
        const button = container.querySelector('button') as HTMLButtonElement;
        fireEvent.click(button);
        expect(getByText('Hats')).toBeTruthy();
    });

    it('closes on Escape', () => {
        const { container, queryByText } = render(
            <HeaderMenuTrigger item={itemWithChildren()} locale={{ code: en.code }} />,
        );
        const button = container.querySelector('button') as HTMLButtonElement;
        button.focus();
        fireEvent.click(button);
        fireEvent.keyDown(window, { key: 'Escape' });
        expect(queryByText('Hats')).toBeNull();
        expect(document.activeElement).toBe(button);
    });

    it('renders description text under each level-2 item when present', () => {
        const { container, getByText } = render(
            <HeaderMenuTrigger item={itemWithChildren()} locale={{ code: en.code }} />,
        );
        fireEvent.click(container.querySelector('button') as HTMLButtonElement);
        expect(getByText('Stuff for the head')).toBeTruthy();
    });

    describe('a11y', () => {
        it('has aria-label containing the item label', () => {
            const { container } = render(<HeaderMenuTrigger item={itemWithChildren()} locale={{ code: en.code }} />);
            const button = container.querySelector('button') as HTMLButtonElement;
            expect(button.getAttribute('aria-label')).toContain('Categories');
        });

        it('has aria-haspopup="menu"', () => {
            const { container } = render(<HeaderMenuTrigger item={itemWithChildren()} locale={{ code: en.code }} />);
            const button = container.querySelector('button') as HTMLButtonElement;
            expect(button.getAttribute('aria-haspopup')).toBe('menu');
        });

        it('aria-controls is absent when closed', () => {
            const { container } = render(<HeaderMenuTrigger item={itemWithChildren()} locale={{ code: en.code }} />);
            const button = container.querySelector('button') as HTMLButtonElement;
            expect(button.getAttribute('aria-controls')).toBeNull();
        });

        it('has aria-controls pointing to a DOM element that exists when open', () => {
            const { container } = render(<HeaderMenuTrigger item={itemWithChildren()} locale={{ code: en.code }} />);
            const button = container.querySelector('button') as HTMLButtonElement;
            fireEvent.click(button);
            const controls = button.getAttribute('aria-controls');
            expect(controls).toBeTruthy();
            // Panel is portaled to <body>; query at document scope.
            expect(document.getElementById(controls!)).not.toBeNull();
        });

        it('renders the panel as a portal under document.body (escapes nav overflow)', () => {
            const { container } = render(<HeaderMenuTrigger item={itemWithChildren()} locale={{ code: en.code }} />);
            const button = container.querySelector('button') as HTMLButtonElement;
            fireEvent.click(button);
            const panel = document.querySelector('[role="menu"]');
            expect(panel).not.toBeNull();
            // Should not live inside the trigger's render container — that
            // would mean the parent nav's overflow context could clip it.
            expect(container.contains(panel)).toBe(false);
            expect(document.body.contains(panel)).toBe(true);
        });
    });
});
