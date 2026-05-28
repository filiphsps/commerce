import { useCartActions } from '@nordcom/cart-react';
import { fireEvent, render, renderHook } from '@testing-library/react';
import { print } from 'graphql';
import { toast } from 'sonner';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Product } from '@/api/product';
import { PRODUCT_CARD_FRAGMENT, PRODUCT_FRAGMENT } from '@/api/shopify/product/queries';
import { PRODUCT_FRAGMENT_MINIMAL } from '@/api/shopify/product-fragments';
import { findVariant, resolveOptions } from '@/components/product-options/resolver';
import { useShop } from '@/components/shop/provider';
import { firstAvailableVariant } from '@/utils/first-available-variant';
import { Locale } from '@/utils/locale';
import { useTrackable } from '@/utils/trackable';
import InlinePicker from './picker/inline';
import { useAddProductCardLine } from './use-add-product-card-line';

// The picker and option primitives consume only the self-contained
// ProductOptions context, so they render with the plain RTL `render` (no shop
// provider). These mocks back the add-to-cart hook exercised separately below.
vi.mock('@nordcom/cart-react', () => ({ useCartActions: vi.fn() }));
vi.mock('@/utils/trackable', () => ({ useTrackable: vi.fn() }));
vi.mock('@/components/shop/provider', () => ({ useShop: vi.fn() }));
vi.mock('sonner', () => ({ toast: { error: vi.fn() } }));
vi.mock('next/navigation', () => ({ usePathname: () => '/products/card-tee/' }));

const addLine = vi.fn();
const postEvent = vi.fn();

const COLORS = ['Black', 'Blue', 'Red'];
const SIZES = ['S', 'M', 'L', 'XL'];

// Index 11 (Red / XL) is the final entry of the 3x4 matrix. Under the previous
// `variants(first: 3)` cap it would never reach the card, so resolving and
// adding it is the regression gate for the raised cap.
const DEEP_VARIANT_ID = 'gid://shopify/ProductVariant/11';

/**
 * Builds a card-shaped product carrying the full 12-variant cartesian matrix —
 * the payload a card receives once the lean fragment fetches `variants(first:
 * 100)` rather than truncating at three.
 *
 * @returns A `Product` with two options (Color, Size) and every purchasable combo present in `variants.edges`.
 */
function buildCardProduct(): Product {
    const edges: Array<{ node: Record<string, unknown> }> = [];
    let index = 0;
    for (const color of COLORS) {
        for (const size of SIZES) {
            edges.push({
                node: {
                    id: `gid://shopify/ProductVariant/${index}`,
                    title: `${color} / ${size}`,
                    sku: `SKU-${index}`,
                    availableForSale: true,
                    quantityAvailable: 10,
                    price: { amount: '29.00', currencyCode: 'USD' },
                    compareAtPrice: null,
                    image: {
                        url: `https://img.example/${index}.webp`,
                        altText: `${color} ${size}`,
                        width: 800,
                        height: 800,
                    },
                    selectedOptions: [
                        { name: 'Color', value: color },
                        { name: 'Size', value: size },
                    ],
                },
            });
            index += 1;
        }
    }

    return {
        id: 'gid://shopify/Product/1',
        handle: 'card-tee',
        title: 'Card Tee',
        vendor: 'Acme',
        productType: 'Shirts',
        availableForSale: true,
        tags: [],
        options: [
            {
                id: 'opt-color',
                name: 'Color',
                values: COLORS,
                optionValues: COLORS.map((c) => ({ id: `color-${c}`, name: c })),
            },
            {
                id: 'opt-size',
                name: 'Size',
                values: SIZES,
                optionValues: SIZES.map((s) => ({ id: `size-${s}`, name: s })),
            },
        ],
        variants: { edges },
        featuredImage: { url: 'https://img.example/feat.webp', altText: 'Card Tee', width: 800, height: 800 },
    } as unknown as Product;
}

beforeEach(() => {
    addLine.mockReset();
    postEvent.mockReset();
    vi.mocked(toast.error).mockReset();
    vi.mocked(useCartActions).mockReturnValue({ addLine } as never);
    vi.mocked(useTrackable).mockReturnValue({ postEvent, queueEvent: vi.fn() } as never);
    vi.mocked(useShop).mockReturnValue({ locale: Locale.default, currency: 'USD', shop: {} } as never);
});

describe('product fragment split', () => {
    it('keeps the full PDP fragment carrying everything getProductOptions needs', () => {
        // The PDP runs hydrogen-react getProductOptions /
        // getAdjacentAndFirstAvailableVariants, which require the modern
        // option-value model plus the adjacent/selected variant projections and
        // the full purchasable set.
        expect(PRODUCT_FRAGMENT).toContain('variants(first: 250)');
        expect(PRODUCT_FRAGMENT).toContain('optionValues');
        expect(PRODUCT_FRAGMENT).toContain('selectedOrFirstAvailableVariant');
        expect(PRODUCT_FRAGMENT).toContain('adjacentVariants');
        expect(PRODUCT_FRAGMENT).toContain('quantityBreaks');
    });

    it('serves card surfaces a lean fragment at PDP variant parity', () => {
        // Card caps match the PDP (first: 250) so a card can resolve any combo
        // the PDP can; leanness comes from the dropped payload below, not a
        // smaller variant window.
        const minimal = print(PRODUCT_FRAGMENT_MINIMAL);
        expect(minimal).toContain('variants(first: 250)');

        expect(PRODUCT_CARD_FRAGMENT).toContain('variants(first: 250)');
        // The card fragment must not drag in PDP-only payload.
        expect(PRODUCT_CARD_FRAGMENT).not.toContain('quantityBreaks');
        expect(PRODUCT_CARD_FRAGMENT).not.toContain('descriptionHtml');
        expect(PRODUCT_CARD_FRAGMENT).not.toContain('adjacentVariants');
        expect(PRODUCT_CARD_FRAGMENT).not.toContain('metafield');
    });
});

describe('card variant resolution after the split', () => {
    const product = buildCardProduct();

    it('(a) resolves a seed variant from the full edge list', () => {
        const seed = firstAvailableVariant(product);
        expect(seed).toBeDefined();
        expect(seed?.id).toBeTruthy();
    });

    it('(b) resolves an option combo beyond the legacy first:3 truncation point', () => {
        const deep = findVariant(product, { Color: 'Red', Size: 'XL' });
        expect(deep?.id).toBe(DEEP_VARIANT_ID);

        const resolved = resolveOptions(product, { Color: 'Red', Size: 'XL' });
        const sizeGroup = resolved.find((group) => group.name === 'Size');
        expect(sizeGroup?.values.find((value) => value.name === 'XL')?.available).toBe(true);
    });

    it('(b) opens the picker with an enabled Add-to-bag button for the seed selection', () => {
        const { container } = render(
            <InlinePicker
                product={product as never}
                locale={{ code: 'en-US' } as never}
                i18n={{} as never}
                open={true}
                onOpenChange={vi.fn()}
                onAdd={vi.fn()}
            />,
        );

        expect(container.querySelector('[role="group"]')).toBeTruthy();
        const addButton = Array.from(container.querySelectorAll('button')).find((button) =>
            /add to bag/i.test(button.textContent ?? ''),
        );
        expect(addButton).toBeTruthy();
        expect(addButton?.disabled).toBe(false);
    });

    it('(c-e2e) resolves a clicked option combo through the picker and fires onAdd with that variant', () => {
        // Drive the real picker path end-to-end: click Blue then M (variant index
        // 5 — neither the first variant nor the last-available seed), then click
        // Add-to-bag and assert onAdd fires with the clicked combo's id. This
        // proves variant resolution flows from chip clicks through the
        // ProductOptions context to onAdd, not just transitively.
        const onAdd = vi.fn();
        const { container } = render(
            <InlinePicker
                product={product as never}
                locale={{ code: 'en-US' } as never}
                i18n={{} as never}
                open={true}
                onOpenChange={vi.fn()}
                onAdd={onAdd}
            />,
        );

        const clickChip = (label: string) => {
            const chip = Array.from(container.querySelectorAll('a, button')).find(
                (element) => (element.textContent ?? '').trim() === label,
            );
            expect(chip, `chip "${label}" should render`).toBeTruthy();
            if (chip) fireEvent.click(chip);
        };

        clickChip('Blue');
        clickChip('M');

        const addButton = Array.from(container.querySelectorAll('button')).find((button) =>
            /add to bag/i.test(button.textContent ?? ''),
        );
        expect(addButton?.disabled).toBe(false);
        if (addButton) fireEvent.click(addButton);

        expect(onAdd).toHaveBeenCalledWith('gid://shopify/ProductVariant/5');
    });

    it('(c) adds the deep variant to the cart and emits analytics', async () => {
        addLine.mockResolvedValue({ ok: true, cart: {} });

        const { result } = renderHook(() => useAddProductCardLine(product));
        const outcome = await result.current(DEEP_VARIANT_ID);

        expect(outcome).toEqual({ ok: true });
        expect(addLine).toHaveBeenCalledWith(
            expect.objectContaining({
                variantId: DEEP_VARIANT_ID,
                quantity: 1,
                snapshot: expect.objectContaining({ variantTitle: 'Red / XL' }),
            }),
        );
        expect(postEvent).toHaveBeenCalledWith(
            'add_to_cart',
            expect.objectContaining({
                gtm: expect.objectContaining({
                    ecommerce: expect.objectContaining({
                        items: [expect.objectContaining({ variant_id: DEEP_VARIANT_ID, item_variant: 'Red / XL' })],
                    }),
                }),
            }),
        );
    });
});
