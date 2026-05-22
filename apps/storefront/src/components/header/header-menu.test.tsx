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

    it('renders the accent rail marker on the panel when open', () => {
        const { container } = render(<HeaderMenuTrigger item={itemWithChildren()} locale={{ code: en.code }} />);
        const button = container.querySelector('button') as HTMLButtonElement;
        fireEvent.click(button);
        // Panel is portaled to <body>.
        const rail = document.querySelector('[data-header-accent-rail="true"]');
        expect(rail).not.toBeNull();
    });

    it('marks the active trigger with data-header-active-bar when open', () => {
        const { container } = render(<HeaderMenuTrigger item={itemWithChildren()} locale={{ code: en.code }} />);
        const button = container.querySelector('button') as HTMLButtonElement;
        // Closed: no marker.
        expect(button.getAttribute('data-header-active-bar')).toBeNull();
        fireEvent.click(button);
        // Open: marker present.
        expect(button.getAttribute('data-header-active-bar')).toBe('true');
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

    describe('variant dispatch', () => {
        it('renders Editorial Columns by default when no variant is set', () => {
            const { container } = render(<HeaderMenuTrigger item={itemWithChildren()} locale={{ code: en.code }} />);
            fireEvent.click(container.querySelector('button') as HTMLButtonElement);
            const panel = document.querySelector('[data-header-variant="editorial-columns"]');
            expect(panel).not.toBeNull();
        });

        it('falls back to Editorial Columns when variant is unknown', () => {
            const item = itemWithChildren({ variant: 'totally-not-a-real-variant' as never });
            const { container } = render(<HeaderMenuTrigger item={item} locale={{ code: en.code }} />);
            fireEvent.click(container.querySelector('button') as HTMLButtonElement);
            const panel = document.querySelector('[data-header-variant="editorial-columns"]');
            expect(panel).not.toBeNull();
        });

        it('renders one column per top-level child via auto-fit grid', () => {
            const item = mockNavItem({
                link: { kind: 'page', label: 'Categories', page: { slug: 'c' } as never, openInNewTab: false },
                items: [
                    {
                        id: 'a',
                        link: { kind: 'page', label: 'Sour', page: { slug: 's' } as never, openInNewTab: false },
                        items: [],
                    },
                    {
                        id: 'b',
                        link: { kind: 'page', label: 'Sweet', page: { slug: 'sw' } as never, openInNewTab: false },
                        items: [],
                    },
                    {
                        id: 'c',
                        link: { kind: 'page', label: 'Salty', page: { slug: 'sa' } as never, openInNewTab: false },
                        items: [],
                    },
                ] as never,
            });
            const { container } = render(<HeaderMenuTrigger item={item} locale={{ code: en.code }} />);
            fireEvent.click(container.querySelector('button') as HTMLButtonElement);
            const cols = document.querySelectorAll('[data-header-editorial-column]');
            expect(cols.length).toBe(3);
        });

        it('renders the single-child edge case inside the centered max-width wrapper', () => {
            const item = mockNavItem({
                link: { kind: 'page', label: 'One', page: { slug: 'o' } as never, openInNewTab: false },
                items: [
                    {
                        id: 'only',
                        link: { kind: 'page', label: 'Only', page: { slug: 'only' } as never, openInNewTab: false },
                        items: [],
                    },
                ] as never,
            });
            const { container } = render(<HeaderMenuTrigger item={item} locale={{ code: en.code }} />);
            fireEvent.click(container.querySelector('button') as HTMLButtonElement);
            const wrapper = document.querySelector('[data-header-editorial-single="true"]');
            expect(wrapper).not.toBeNull();
        });

        it('renders eyebrow headings with text-primary class', () => {
            const { container } = render(<HeaderMenuTrigger item={itemWithChildren()} locale={{ code: en.code }} />);
            fireEvent.click(container.querySelector('button') as HTMLButtonElement);
            const eyebrow = document.querySelector('[data-header-editorial-eyebrow]');
            expect(eyebrow).not.toBeNull();
            expect(eyebrow!.className).toContain('text-primary');
        });

        it('Compact List renders a single column with no image strip even when image present', () => {
            const item = mockNavItem({
                link: { kind: 'page', label: 'Brands', page: { slug: 'brands' } as never, openInNewTab: false },
                variant: 'compact-list' as never,
                items: [
                    {
                        id: 'b1',
                        link: { kind: 'page', label: 'Acme', page: { slug: 'acme' } as never, openInNewTab: false },
                        image: { id: 'i', url: 'https://cdn.test/x.png', alt: 'x', width: 64, height: 64 } as never,
                        items: [],
                    },
                ] as never,
            });
            const { container } = render(<HeaderMenuTrigger item={item} locale={{ code: en.code }} />);
            fireEvent.click(container.querySelector('button') as HTMLButtonElement);
            const wrapper = document.querySelector('[data-header-variant="compact-list"]');
            expect(wrapper).not.toBeNull();
            // No image strip even though the child has an image.
            expect(document.querySelector('[data-header-compact-image]')).toBeNull();
            expect(document.querySelector('[data-header-compact-list]')).not.toBeNull();
        });

        it('Featured Promo renders the first child as the hero with image + CTA', () => {
            const item = mockNavItem({
                link: { kind: 'page', label: 'Featured', page: { slug: 'feat' } as never, openInNewTab: false },
                variant: 'featured-promo' as never,
                items: [
                    {
                        id: 'hero',
                        link: {
                            kind: 'page',
                            label: 'Sour Candy',
                            page: { slug: 'sour' } as never,
                            openInNewTab: false,
                        },
                        description: 'Sour skulls, watermelon rings.',
                        image: {
                            id: 'i',
                            url: 'https://cdn.test/sour.png',
                            alt: 'sour',
                            width: 640,
                            height: 480,
                        } as never,
                        items: [],
                    },
                    {
                        id: 'l1',
                        link: {
                            kind: 'page',
                            label: 'Chocolate',
                            page: { slug: 'choc' } as never,
                            openInNewTab: false,
                        },
                        items: [],
                    },
                    {
                        id: 'l2',
                        link: { kind: 'page', label: 'Liquorice', page: { slug: 'liq' } as never, openInNewTab: false },
                        items: [],
                    },
                ] as never,
            });
            const { container } = render(<HeaderMenuTrigger item={item} locale={{ code: en.code }} />);
            fireEvent.click(container.querySelector('button') as HTMLButtonElement);
            expect(document.querySelector('[data-header-variant="featured-promo"]')).not.toBeNull();
            const hero = document.querySelector('[data-header-featured-hero]');
            expect(hero).not.toBeNull();
            expect(hero!.textContent).toContain('Sour Candy');
            expect(hero!.textContent).toContain('Sour skulls, watermelon rings.');
            const heroImg = hero!.querySelector('img');
            expect(heroImg).not.toBeNull();
            const list = document.querySelector('[data-header-featured-list]');
            expect(list).not.toBeNull();
            expect(list!.textContent).toContain('Chocolate');
            expect(list!.textContent).toContain('Liquorice');
        });

        it('Featured Promo falls back to backgroundColor when no image is set', () => {
            const item = mockNavItem({
                link: { kind: 'page', label: 'F', page: { slug: 'f' } as never, openInNewTab: false },
                variant: 'featured-promo' as never,
                items: [
                    {
                        id: 'hero',
                        link: { kind: 'page', label: 'Hero', page: { slug: 'h' } as never, openInNewTab: false },
                        backgroundColor: '#ffeebb',
                        items: [],
                    },
                ] as never,
            });
            const { container } = render(<HeaderMenuTrigger item={item} locale={{ code: en.code }} />);
            fireEvent.click(container.querySelector('button') as HTMLButtonElement);
            const heroFallback = document.querySelector('[data-header-featured-hero-fallback]');
            expect(heroFallback).not.toBeNull();
            expect((heroFallback as HTMLElement).style.backgroundColor).toBeTruthy();
        });
    });
});
