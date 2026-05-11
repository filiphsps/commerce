import { describe, expect, it, vi } from 'vitest';
import { HeaderNavigation } from '@/components/header/header-navigation';
import { mockShop } from '@/utils/test/fixtures';
import { render } from '@/utils/test/react';

vi.mock('@/components/cms/slice-zone', () => ({
    SliceZone: ({ data }: { data: any[] }) => <div data-testid="slice-zone" data-count={data?.length ?? 0} />,
}));

vi.mock('@/slices/navigation', () => ({
    components: {},
}));

describe('components', () => {
    describe('header', () => {
        describe('HeaderNavigation', () => {
            it('renders a nav element', () => {
                const shop = mockShop();
                const { container } = render(
                    <HeaderNavigation shop={shop} locale={{ code: 'en-US' } as any} i18n={{} as any} slices={[]} />,
                );
                const nav = container.querySelector('nav');
                expect(nav).toBeTruthy();
            });

            it('renders children alongside the slice zone', () => {
                const shop = mockShop();
                render(
                    <HeaderNavigation shop={shop} locale={{ code: 'en-US' } as any} i18n={{} as any} slices={[]}>
                        <span data-testid="nav-child">Extra</span>
                    </HeaderNavigation>,
                );
                expect(document.querySelector('[data-testid="nav-child"]')).toBeTruthy();
            });

            it('skeleton renders a nav element with data-skeleton children', () => {
                const { container } = render(<HeaderNavigation.skeleton />);
                expect(container.querySelector('nav')).toBeTruthy();
                expect(container.querySelector('[data-skeleton]')).toBeTruthy();
            });
        });
    });
});
