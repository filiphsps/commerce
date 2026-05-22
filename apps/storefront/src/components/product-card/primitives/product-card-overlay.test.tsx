import { fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ProductCardOverlay from '@/components/product-card/primitives/product-card-overlay';
import { render, screen } from '@/utils/test/react';

const setMatchMedia = (matches: boolean) => {
    Object.defineProperty(window, 'matchMedia', {
        writable: true,
        configurable: true,
        value: (query: string) => ({
            matches,
            media: query,
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
            addListener: vi.fn(),
            removeListener: vi.fn(),
            onchange: null,
            dispatchEvent: vi.fn(),
        }),
    });
};

describe('components', () => {
    describe('product-card', () => {
        describe('primitives', () => {
            describe('ProductCardOverlay', () => {
                it('renders a popover when open and viewport is desktop', () => {
                    setMatchMedia(true);
                    render(
                        <ProductCardOverlay open onOpenChange={vi.fn()} label="Color">
                            <div data-testid="overlay-body">body</div>
                        </ProductCardOverlay>,
                    );
                    expect(screen.getByTestId('overlay-body')).toBeInTheDocument();
                    expect(screen.getByRole('dialog', { name: /color/i })).toBeInTheDocument();
                });

                it('renders a bottom-sheet when open and viewport is mobile', () => {
                    setMatchMedia(false);
                    render(
                        <ProductCardOverlay open onOpenChange={vi.fn()} label="Color">
                            <div data-testid="overlay-body">body</div>
                        </ProductCardOverlay>,
                    );
                    expect(screen.getByTestId('overlay-body')).toBeInTheDocument();
                    expect(screen.getByTestId('product-card-overlay-sheet')).toBeInTheDocument();
                });

                it('renders nothing when closed', () => {
                    setMatchMedia(true);
                    render(
                        <ProductCardOverlay open={false} onOpenChange={vi.fn()} label="Color">
                            <div data-testid="overlay-body">body</div>
                        </ProductCardOverlay>,
                    );
                    expect(screen.queryByTestId('overlay-body')).toBeNull();
                });

                it('calls onOpenChange(false) when the close button is clicked', () => {
                    setMatchMedia(false);
                    const onOpenChange = vi.fn();
                    render(
                        <ProductCardOverlay open onOpenChange={onOpenChange} label="Color">
                            <div>body</div>
                        </ProductCardOverlay>,
                    );
                    fireEvent.click(screen.getByRole('button', { name: /close/i }));
                    expect(onOpenChange).toHaveBeenCalledWith(false);
                });
            });
        });
    });
});
