import { describe, expect, it, vi } from 'vitest';
import { HeaderProvider, useHeaderMenu } from '@/components/header/header-provider';
import { act, render, screen } from '@/utils/test/react';

vi.mock('next/navigation', async () => ({
    usePathname: vi.fn().mockReturnValue('/en-US/'),
}));

vi.mock('nextjs-toploader', () => ({
    default: () => <div data-testid="top-loader" />,
}));

// We need a test component that consumes the context
function TestConsumer() {
    const { menu, setMenu, closeMenu } = useHeaderMenu();
    return (
        <div>
            <span data-testid="menu-state">{menu ?? 'null'}</span>
            <button onClick={() => setMenu('main-menu')}>Open</button>
            <button onClick={closeMenu}>Close</button>
        </div>
    );
}

describe('components', () => {
    describe('header', () => {
        describe('HeaderProvider', () => {
            it('renders children', () => {
                render(
                    <HeaderProvider>
                        <span data-testid="child">Hello</span>
                    </HeaderProvider>,
                );
                expect(screen.getByTestId('child')).toBeTruthy();
            });

            it('provides a null menu state initially', () => {
                render(
                    <HeaderProvider>
                        <TestConsumer />
                    </HeaderProvider>,
                );
                expect(screen.getByTestId('menu-state').textContent).toBe('null');
            });

            it('updates menu state when setMenu is called', async () => {
                render(
                    <HeaderProvider>
                        <TestConsumer />
                    </HeaderProvider>,
                );
                await act(async () => {
                    screen.getByText('Open').click();
                });
                expect(screen.getByTestId('menu-state').textContent).toBe('main-menu');
            });

            it('throws when useHeaderMenu is used outside HeaderProvider', () => {
                // useContext returns null → MissingContextProviderError is thrown;
                // React wraps component errors but the underlying throw still propagates.
                function BrokenConsumer() {
                    useHeaderMenu();
                    return null;
                }
                let caught: unknown;
                try {
                    render(<BrokenConsumer />);
                } catch (e) {
                    caught = e;
                }
                // The error is a MissingContextProviderError — check its name/statusCode
                expect((caught as any)?.name).toBe('MissingContextProviderError');
            });
        });
    });
});
