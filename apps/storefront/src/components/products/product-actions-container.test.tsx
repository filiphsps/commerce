import { useCartActions, useCartStatus } from '@nordcom/cart-react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as ProductOptions from '@/components/product-options';
import { useQuantity } from '@/components/products/quantity-provider';
import { act, fireEvent, render, screen } from '@/utils/test/react';
import { ProductActionsContainer } from './product-actions-container';

vi.mock('@nordcom/cart-react', () => ({
    useCartActions: vi.fn(),
    useCartStatus: vi.fn(),
    useMaybeCart: vi.fn().mockReturnValue(null),
}));
vi.mock('@/components/products/quantity-provider', () => ({
    useQuantity: vi.fn(),
}));
vi.mock('next/navigation', () => ({
    useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
    usePathname: () => '/en-US/products/tee/',
    useSearchParams: () => new URLSearchParams(),
}));
vi.mock('@/utils/build-config', () => ({
    BuildConfig: { environment: 'test' },
    COMMERCE_DEFAULTS: { maxQuantity: 99 },
}));

const variant = (id: string, color: string, available = true) => ({
    id,
    title: color,
    availableForSale: available,
    selectedOptions: [{ name: 'Color', value: color }],
    price: { amount: '29.00', currencyCode: 'USD' },
});

const product = {
    id: 'gid://shopify/Product/1',
    handle: 'tee',
    title: 'Test Tee',
    vendor: 'Acme',
    options: [{ name: 'Color', optionValues: [{ name: 'Red' }, { name: 'Blue' }] }],
    variants: {
        edges: [{ node: variant('v1', 'Red') }, { node: variant('v2', 'Blue') }],
    },
} as never;

/**
 * Renders the container inside a real `ProductOptions.Root` so the swatch primitives and the
 * container share one selection context — the same wiring as the live PDP.
 *
 * @param initialSelection - Selection the Root seeds with.
 * @param seedSelection - URL-resolved selection forwarded to the container.
 * @returns The Testing Library render result.
 */
const i18n = { common: { 'add-to-cart': 'Add to cart' } } as never;

const renderContainer = (initialSelection: Record<string, string>, seedSelection?: Record<string, string>) =>
    render(
        <ProductOptions.Root product={product} initialSelection={initialSelection}>
            <ProductActionsContainer i18n={i18n} seedSelection={seedSelection} />
        </ProductOptions.Root>,
    );

const addLine = vi.fn().mockResolvedValue({ ok: true });

beforeEach(() => {
    addLine.mockClear();
    vi.mocked(useQuantity).mockReturnValue({ quantity: 1, setQuantity: vi.fn() });
    vi.mocked(useCartActions).mockReturnValue({ addLine } as never);
    vi.mocked(useCartStatus).mockReturnValue({ cartReady: true, status: 'idle', error: null } as never);
});

afterEach(() => {
    vi.clearAllMocks();
});

describe('ProductActionsContainer', () => {
    it('renders a swatch group per option and reflects the active selection', async () => {
        renderContainer({ Color: 'Red' });
        await act(async () => {});

        const group = screen.getByRole('group', { name: 'Color' });
        expect(group).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Red' })).toHaveAttribute('aria-pressed', 'true');
        expect(screen.getByRole('button', { name: 'Blue' })).toHaveAttribute('aria-pressed', 'false');
    });

    it('selecting another value updates the active selection without leaving the page', async () => {
        renderContainer({ Color: 'Red' });
        await act(async () => {});

        await act(async () => {
            fireEvent.click(screen.getByRole('button', { name: 'Blue' }));
        });

        expect(screen.getByRole('button', { name: 'Blue' })).toHaveAttribute('aria-pressed', 'true');
        expect(screen.getByRole('button', { name: 'Red' })).toHaveAttribute('aria-pressed', 'false');
    });

    it('applies the URL-resolved seed selection once on mount', async () => {
        renderContainer({ Color: 'Red' }, { Color: 'Blue' });
        await act(async () => {});

        expect(screen.getByRole('button', { name: 'Blue' })).toHaveAttribute('aria-pressed', 'true');
    });

    it('adds the selected variant to the cart', async () => {
        renderContainer({ Color: 'Red' });
        await act(async () => {});

        await act(async () => {
            fireEvent.click(screen.getByRole('button', { name: /add to cart/i }));
        });

        expect(addLine).toHaveBeenCalledWith(expect.objectContaining({ variantId: 'v1', quantity: 1 }));
    });
});
