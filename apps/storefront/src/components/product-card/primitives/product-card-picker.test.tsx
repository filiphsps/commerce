import { useCartActions, useCartStatus } from '@nordcom/cart-react';
import { toast } from 'sonner';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getProductCardPicker } from '@/components/product-card/picker';
import FloatPicker from '@/components/product-card/picker/float';
import { act, fireEvent, render, screen, waitFor } from '@/utils/test/react';
import type { ProductCardPickerProps } from '../picker/types';
import { ProductCardOptionsProvider, usePickerOpen } from './product-card-options-provider';
import ProductCardPicker from './product-card-picker';

vi.mock('@nordcom/cart-react', () => ({
    useCartActions: vi.fn(),
    useCartStatus: vi.fn(),
    useMaybeCart: vi.fn().mockReturnValue(null),
}));

vi.mock('@/components/product-card/picker', () => ({
    getProductCardPicker: vi.fn(),
}));

vi.mock('sonner', () => ({ toast: { error: vi.fn() } }));

// Keep the real `Trackable` provider (the test render tree mounts it) but make
// `useTrackable` inert so a successful add doesn't fire real analytics.
vi.mock('@/utils/trackable', async (importOriginal) => {
    const actual = await importOriginal<typeof import('@/utils/trackable')>();
    return { ...actual, useTrackable: () => ({ postEvent: vi.fn(), queueEvent: vi.fn() }) };
});

type WrapperOverrides = {
    presentation?: 'auto' | 'float' | 'sheet' | 'inline';
    ctaPlacement?: string;
    layout?: 'vertical' | 'horizontal';
};

const originalMatchMedia = window.matchMedia;

/**
 * Pin the wrapper's `useIsDesktop`: `true`/`false` choose the viewport, `null`
 * removes `matchMedia` so the SSR sentinel keeps the picker unmounted.
 *
 * @param isDesktop - Viewport resolution, or `null` for "unknown".
 */
function setViewport(isDesktop: boolean | null): void {
    const value =
        isDesktop === null
            ? undefined
            : (vi.fn().mockReturnValue({
                  matches: isDesktop,
                  media: '(min-width: 48em)',
                  addEventListener: vi.fn(),
                  removeEventListener: vi.fn(),
              }) as unknown as typeof window.matchMedia);
    Object.defineProperty(window, 'matchMedia', { configurable: true, value });
}

/**
 * Lightweight stand-in for a concrete picker. Exposes the live `open` state and
 * buttons to drive `onOpenChange`/`onAdd`, so the wrapper's open-management and
 * close-on-success logic can be asserted without a real picker's UI.
 *
 * @param props.open - Current open state forwarded by the wrapper.
 * @param props.onOpenChange - Open-state setter forwarded by the wrapper.
 * @param props.onAdd - Add callback forwarded by the wrapper.
 * @returns The probe element.
 */
const DoublePicker = ({ open, onOpenChange, onAdd }: ProductCardPickerProps) => (
    <div>
        <span data-testid="open-state">{String(open)}</span>
        <button type="button" onClick={() => onOpenChange(true)}>
            open
        </button>
        <button type="button" onClick={() => onAdd('v1')}>
            double-add
        </button>
    </div>
);

/**
 * Opens the card's picker via context, standing in for the CTA that normally
 * toggles it; lets tests reach a real picker's body content.
 *
 * @returns A button that sets the picker open.
 */
const OpenTrigger = () => {
    const picker = usePickerOpen();
    return (
        <button type="button" onClick={() => picker?.setOpen(true)}>
            force-open
        </button>
    );
};

const product = {
    id: 'gid://shopify/Product/123',
    handle: 'tee',
    title: 'Test Tee',
    options: [{ name: 'Size', values: ['M'], optionValues: [{ name: 'M' }] }],
    variants: {
        edges: [
            {
                node: {
                    id: 'v1',
                    title: 'M',
                    selectedOptions: [{ name: 'Size', value: 'M' }],
                    availableForSale: true,
                    price: { amount: '29.00', currencyCode: 'USD' },
                },
            },
        ],
    },
} as never;

const multiSizeProduct = {
    id: 'gid://shopify/Product/456',
    handle: 'tee',
    title: 'Multi Tee',
    options: [
        {
            name: 'Size',
            values: ['S', 'M', 'L'],
            optionValues: [{ name: 'S' }, { name: 'M' }, { name: 'L' }],
        },
    ],
    variants: {
        edges: [
            {
                node: {
                    id: 'v1',
                    title: 'S',
                    selectedOptions: [{ name: 'Size', value: 'S' }],
                    availableForSale: true,
                    price: { amount: '29.00', currencyCode: 'USD' },
                },
            },
            {
                node: {
                    id: 'v2',
                    title: 'M',
                    selectedOptions: [{ name: 'Size', value: 'M' }],
                    availableForSale: true,
                    price: { amount: '29.00', currencyCode: 'USD' },
                },
            },
            {
                node: {
                    id: 'v3',
                    title: 'L',
                    selectedOptions: [{ name: 'Size', value: 'L' }],
                    availableForSale: false,
                    price: { amount: '29.00', currencyCode: 'USD' },
                },
            },
        ],
    },
} as never;

/**
 * Render the wrapper inside a provider with sensible presentation defaults.
 *
 * @param overrides - Partial presentation props to override the defaults.
 * @returns The Testing Library render result.
 */
function renderWrapper(overrides: WrapperOverrides = {}) {
    return render(
        <ProductCardOptionsProvider product={product} seedVariantId="v1" isSingleBuyable={false}>
            <ProductCardPicker
                locale={{ code: 'en-US' } as never}
                i18n={{} as never}
                presentation={overrides.presentation ?? 'auto'}
                ctaPlacement={overrides.ctaPlacement ?? 'float-pill'}
                layout={overrides.layout ?? 'vertical'}
            />
        </ProductCardOptionsProvider>,
    );
}

beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useCartActions).mockReturnValue({ addLine: vi.fn().mockResolvedValue({ ok: true }) } as never);
    vi.mocked(useCartStatus).mockReturnValue({ cartReady: true, status: 'idle', error: null });
    vi.mocked(getProductCardPicker).mockReturnValue(DoublePicker);
    setViewport(true);
});

afterEach(() => {
    Object.defineProperty(window, 'matchMedia', { configurable: true, value: originalMatchMedia });
});

describe('ProductCardPicker — presentation resolution', () => {
    it('auto + vertical + desktop + non-inline CTA resolves to the float picker', async () => {
        setViewport(true);
        renderWrapper({ presentation: 'auto', layout: 'vertical', ctaPlacement: 'float-pill' });
        await act(async () => {});
        expect(getProductCardPicker).toHaveBeenCalledWith('float');
    });

    it('auto + vertical + desktop + inline-button CTA resolves to the inline picker', async () => {
        setViewport(true);
        renderWrapper({ presentation: 'auto', layout: 'vertical', ctaPlacement: 'inline-button' });
        await act(async () => {});
        expect(getProductCardPicker).toHaveBeenCalledWith('inline');
    });

    it('auto + vertical + mobile resolves to the sheet picker', async () => {
        setViewport(false);
        renderWrapper({ presentation: 'auto', layout: 'vertical', ctaPlacement: 'float-pill' });
        await act(async () => {});
        expect(getProductCardPicker).toHaveBeenCalledWith('sheet');
    });

    it('auto + horizontal resolves to the sheet picker regardless of device', async () => {
        setViewport(true);
        renderWrapper({ presentation: 'auto', layout: 'horizontal', ctaPlacement: 'float-pill' });
        await act(async () => {});
        expect(getProductCardPicker).toHaveBeenCalledWith('sheet');
    });

    it('an explicit presentation is passed through unchanged', async () => {
        setViewport(true);
        renderWrapper({ presentation: 'inline', layout: 'vertical', ctaPlacement: 'float-pill' });
        await act(async () => {});
        expect(getProductCardPicker).toHaveBeenCalledWith('inline');
    });
});

describe('ProductCardPicker — mount guards', () => {
    it('does not throw and stays unmounted when matchMedia is unavailable (WKWebView)', async () => {
        setViewport(null);
        expect(() => renderWrapper()).not.toThrow();
        await act(async () => {});
        // SSR sentinel: no picker resolved until the viewport is known.
        expect(getProductCardPicker).not.toHaveBeenCalled();
        expect(screen.queryByTestId('open-state')).toBeNull();
    });

    it('renders nothing without a ProductCardOptionsProvider', async () => {
        setViewport(true);
        render(
            <ProductCardPicker
                locale={{ code: 'en-US' } as never}
                i18n={{} as never}
                presentation="auto"
                ctaPlacement="float-pill"
                layout="vertical"
            />,
        );
        await act(async () => {});
        expect(getProductCardPicker).not.toHaveBeenCalled();
    });
});

describe('ProductCardPicker — close on add (P0-5)', () => {
    it('closes the picker after a successful add', async () => {
        setViewport(true);
        vi.mocked(useCartActions).mockReturnValue({ addLine: vi.fn().mockResolvedValue({ ok: true }) } as never);
        renderWrapper();
        await act(async () => {});

        fireEvent.click(screen.getByText('open'));
        expect(screen.getByTestId('open-state').textContent).toBe('true');

        await act(async () => {
            fireEvent.click(screen.getByText('double-add'));
        });
        await waitFor(() => expect(screen.getByTestId('open-state').textContent).toBe('false'));
    });

    it('keeps the picker open and surfaces a toast when the add fails', async () => {
        setViewport(true);
        vi.mocked(useCartActions).mockReturnValue({
            addLine: vi.fn().mockResolvedValue({ ok: false, message: 'Out of stock' }),
        } as never);
        renderWrapper();
        await act(async () => {});

        fireEvent.click(screen.getByText('open'));
        await act(async () => {
            fireEvent.click(screen.getByText('double-add'));
        });

        expect(screen.getByTestId('open-state').textContent).toBe('true');
        expect(toast.error).toHaveBeenCalledWith('Out of stock');
    });
});

describe('ProductCardPicker — option change → variant resolution → close', () => {
    it('flags out-of-stock options, resolves the variant on change, and closes once added', async () => {
        setViewport(true);
        vi.mocked(getProductCardPicker).mockReturnValue(FloatPicker);
        vi.mocked(useCartActions).mockReturnValue({ addLine: vi.fn().mockResolvedValue({ ok: true }) } as never);

        render(
            <ProductCardOptionsProvider product={multiSizeProduct} seedVariantId="v2" isSingleBuyable={false}>
                <OpenTrigger />
                <ProductCardPicker
                    locale={{ code: 'en-US' } as never}
                    i18n={{} as never}
                    presentation="auto"
                    ctaPlacement="float-pill"
                    layout="vertical"
                />
            </ProductCardOptionsProvider>,
        );
        await act(async () => {});

        fireEvent.click(screen.getByText('force-open'));

        const chipFor = (label: string) =>
            Array.from(document.body.querySelectorAll('button')).find((b) => b.textContent === label);

        // The out-of-stock size is rendered but flagged unavailable.
        expect(chipFor('L')).toHaveAttribute('data-available', 'false');

        // Changing the option moves the active state — i.e. resolves a new variant.
        fireEvent.click(chipFor('S') as HTMLButtonElement);
        expect(chipFor('S')).toHaveAttribute('data-active', 'true');
        expect(chipFor('M')).toHaveAttribute('data-active', 'false');

        const addButton = Array.from(document.body.querySelectorAll('button')).find((b) =>
            /add to bag/i.test(b.textContent ?? ''),
        );
        await act(async () => {
            fireEvent.click(addButton as HTMLButtonElement);
        });

        await waitFor(() =>
            expect(
                Array.from(document.body.querySelectorAll('button')).some((b) =>
                    /add to bag/i.test(b.textContent ?? ''),
                ),
            ).toBe(false),
        );
    });
});
