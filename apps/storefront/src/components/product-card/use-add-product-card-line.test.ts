import { useCartActions } from '@nordcom/cart-react';
import { renderHook } from '@testing-library/react';
import { toast } from 'sonner';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useShop } from '@/components/shop/provider';
import { Locale } from '@/utils/locale';
import { useTrackable } from '@/utils/trackable';
import { useAddProductCardLine } from './use-add-product-card-line';

vi.mock('@nordcom/cart-react', () => ({ useCartActions: vi.fn() }));
vi.mock('@/utils/trackable', () => ({ useTrackable: vi.fn() }));
vi.mock('@/components/shop/provider', () => ({ useShop: vi.fn() }));
vi.mock('sonner', () => ({ toast: { error: vi.fn() } }));

const addLine = vi.fn();
const postEvent = vi.fn();

const variantId = 'gid://shopify/ProductVariant/1';
const product = {
    id: 'gid://shopify/Product/123',
    handle: 'tee',
    title: 'Demo Tee',
    vendor: 'Acme',
    productType: 'Shirts',
    variants: {
        edges: [
            {
                node: {
                    id: variantId,
                    title: 'Medium',
                    sku: 'TEE-M',
                    availableForSale: true,
                    image: null,
                    price: { amount: '29.00', currencyCode: 'USD' },
                    compareAtPrice: null,
                },
            },
        ],
    },
} as never;

beforeEach(() => {
    addLine.mockReset();
    postEvent.mockReset();
    vi.mocked(toast.error).mockReset();
    vi.mocked(useCartActions).mockReturnValue({ addLine } as never);
    vi.mocked(useTrackable).mockReturnValue({ postEvent, queueEvent: vi.fn() } as never);
    vi.mocked(useShop).mockReturnValue({ locale: Locale.default, currency: 'USD', shop: {} } as never);
});

describe('useAddProductCardLine', () => {
    it('returns ok and emits add_to_cart analytics on a successful add', async () => {
        addLine.mockResolvedValue({ ok: true, cart: {} });

        const { result } = renderHook(() => useAddProductCardLine(product));
        const outcome = await result.current(variantId);

        expect(outcome).toEqual({ ok: true });
        expect(addLine).toHaveBeenCalledWith(expect.objectContaining({ variantId, quantity: 1 }));
        expect(postEvent).toHaveBeenCalledWith(
            'add_to_cart',
            expect.objectContaining({
                gtm: expect.objectContaining({
                    ecommerce: expect.objectContaining({
                        currency: 'USD',
                        items: [
                            expect.objectContaining({
                                product_id: 'gid://shopify/Product/123',
                                variant_id: variantId,
                                item_name: 'Demo Tee',
                                item_variant: 'Medium',
                                quantity: 1,
                            }),
                        ],
                    }),
                }),
            }),
        );
        expect(toast.error).not.toHaveBeenCalled();
    });

    it('returns not-ok and surfaces a toast without analytics on a failed add', async () => {
        addLine.mockResolvedValue({ ok: false, reason: 'network-error', message: 'Could not add to cart' });

        const { result } = renderHook(() => useAddProductCardLine(product));
        const outcome = await result.current(variantId);

        expect(outcome).toEqual({ ok: false });
        expect(toast.error).toHaveBeenCalledWith('Could not add to cart');
        expect(postEvent).not.toHaveBeenCalled();
    });

    it('returns not-ok without dispatching when the variant is unknown', async () => {
        const { result } = renderHook(() => useAddProductCardLine(product));
        const outcome = await result.current('gid://shopify/ProductVariant/missing');

        expect(outcome).toEqual({ ok: false });
        expect(addLine).not.toHaveBeenCalled();
        expect(postEvent).not.toHaveBeenCalled();
    });
});
