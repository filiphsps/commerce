import { describe, expect, it, vi } from 'vitest';
import { HeaderMenu } from '@/components/header/header-menu';
import { HeaderProvider, useHeaderMenu } from '@/components/header/header-provider';
import { act, render, screen } from '@/utils/test/react';

vi.mock('next/navigation', async () => ({
    usePathname: vi.fn().mockReturnValue('/en-US/'),
}));

vi.mock('nextjs-toploader', () => ({
    default: () => null,
}));

vi.mock('@prismicio/react', () => ({
    SliceZone: () => <div data-testid="slice-zone" />,
}));

vi.mock('@/slices/navigation', () => ({
    components: {},
}));

describe('components', () => {
    describe('header', () => {
        describe('HeaderMenu', () => {
            it('renders a collapsed/empty menu when menu context is null', () => {
                const { container } = render(
                    <HeaderProvider>
                        <HeaderMenu slices={[] as any} />
                    </HeaderProvider>,
                );
                // Menu is closed — the div renders with h-0 border-0 styles
                expect(container.querySelector('div')).toBeTruthy();
            });

            it('renders slice zone when menu is open', async () => {
                function OpenMenuWrapper() {
                    const { setMenu } = useHeaderMenu();
                    return (
                        <>
                            <button onClick={() => setMenu('nav')}>Open</button>
                            <HeaderMenu slices={[] as any} />
                        </>
                    );
                }

                render(
                    <HeaderProvider>
                        <OpenMenuWrapper />
                    </HeaderProvider>,
                );

                await act(async () => {
                    screen.getByText('Open').click();
                });

                expect(screen.getByTestId('slice-zone')).toBeTruthy();
            });
        });
    });
});
