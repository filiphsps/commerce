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
        fireEvent.click(button);
        fireEvent.keyDown(window, { key: 'Escape' });
        expect(queryByText('Hats')).toBeNull();
    });

    it('renders description text under each level-2 item when present', () => {
        const { container, getByText } = render(
            <HeaderMenuTrigger item={itemWithChildren()} locale={{ code: en.code }} />,
        );
        fireEvent.click(container.querySelector('button') as HTMLButtonElement);
        expect(getByText('Stuff for the head')).toBeTruthy();
    });
});
