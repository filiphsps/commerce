'use client';

import type { CartLine as CoreCartLine } from '@nordcom/cart-core';
import { useCartActions, useCartStatus } from '@nordcom/cart-react';
import { ImageOff as ImageOffIcon, Tag as TagIcon, X as XIcon } from 'lucide-react';
import Image from 'next/image';
import { useContext } from 'react';
import { Button } from '@/components/actionable/button';
import Link from '@/components/link';
import Chip from '@/components/product-options/primitives/chip';
import Swatch from '@/components/product-options/primitives/swatch';
import type { OptionValueRendererProps } from '@/components/product-options/types';
import { CompareAtPrice, Price } from '@/components/products/price';
import { QuantitySelector } from '@/components/products/quantity-selector';
import { ShopContext } from '@/components/shop/provider';
import { Label } from '@/components/typography/label';
import { type CurrencyCode, getTranslations, isColorOption, type LocaleDictionary } from '@/utils/locale';
import { safeParseFloat } from '@/utils/pricing';
import { cn } from '@/utils/tailwind';

interface CartLineProps {
    i18n: LocaleDictionary;
    data: CoreCartLine<unknown>;
}

/**
 * Renders a single cart line with image, title, read-only variant options,
 * quantity stepper, and line-total pricing.
 *
 * @param props.i18n - Locale dictionary for translated labels.
 * @param props.data - Cart-core normalized cart line from the cart provider.
 * @returns The cart line card, or `null` when essential merchandise data is absent.
 */
const CartLine = ({ i18n, data: line }: CartLineProps) => {
    const { updateLine, removeLine } = useCartActions();
    const { cartReady, status } = useCartStatus();
    const { t } = getTranslations('common', i18n);
    const { t: tCart } = getTranslations('cart', i18n);
    const { t: tProduct } = getTranslations('product', i18n);

    // Read the tenant's cart-line presentation tokens off the client shop context (read gracefully so
    // a provider-less test still renders with platform defaults). `variantStyle` augments the
    // per-option auto-detection: color options always render a swatch; non-color options follow it.
    const cartLineTokens = useContext(ShopContext)?.shop.theme?.cartLine;
    const variantStyle = cartLineTokens?.variantStyle ?? 'swatch';
    const showVendor = cartLineTokens?.showVendor ?? true;
    const showSku = cartLineTokens?.showSku ?? false;

    const ready = cartReady && status !== 'mutating';
    const merch = line.merchandise;

    if (!merch.productHandle || !merch.id) {
        return null;
    }

    // Free items, gift wrap, deposit lines, and partial-refund flows can leave
    // `compare` at 0 — guard the divide so we don't render an `Infinity% off`
    // strikethrough. Also clamp to [0,100] so a negative auto-discount
    // allocation (current > compare) doesn't produce a confusing negative.
    /**
     * Computes a discount percentage clamped to [0, 100].
     *
     * @param compareStr - Original (compare-at) price amount string.
     * @param currentStr - Actual line total amount string.
     * @returns Integer discount percentage, or `0` when the math is not finite.
     */
    const computeDiscount = (compareStr: string | undefined, currentStr: string | undefined): number => {
        const compare = safeParseFloat(0, compareStr);
        const current = safeParseFloat(0, currentStr);
        if (compare <= 0) return 0;
        const pct = Math.round((100 * (compare - current)) / compare);
        if (!Number.isFinite(pct)) return 0;
        return Math.max(0, Math.min(100, pct));
    };

    const discount = computeDiscount(
        merch.compareAtUnitPrice?.amount ?? merch.unitPrice.amount,
        line.cost.total.amount,
    );

    const image = merch.image ? (
        <Image
            className="h-full w-full object-contain object-center"
            src={merch.image.url}
            alt={merch.image.altText || merch.variantTitle}
            width={160}
            height={160}
            sizes="(max-width: 920px) 80px, 112px"
            priority={false}
            loading="lazy"
            decoding="async"
            draggable={false}
        />
    ) : (
        <ImageOffIcon aria-hidden="true" className="text-(color:var(--text-muted)) h-1/3 w-1/3 stroke-1" />
    );

    const pricing = (
        <>
            {discount > 0.1 ? (
                <CompareAtPrice
                    className="text-(color:var(--text-muted)) font-medium text-base leading-tight"
                    data={{
                        amount: (
                            safeParseFloat(0, merch.compareAtUnitPrice?.amount, merch.unitPrice.amount) * line.quantity
                        ).toString(),
                        currencyCode: merch.unitPrice.currencyCode as CurrencyCode,
                    }}
                />
            ) : null}
            <Price
                className={cn(
                    'font-bold text-xl leading-tight',
                    discount > 0.1 && 'text-(color:var(--state-sale)) font-extrabold text-xl',
                )}
                data={{
                    amount: line.cost.total.amount,
                    currencyCode: line.cost.total.currencyCode as CurrencyCode,
                }}
            />
        </>
    );

    const realOptions = (merch.selectedOptions ?? []).filter(
        ({ name, value }) => !(name === 'Title' && value === 'Default Title'),
    );

    const { quantity } = line;
    const vendor = merch.productVendor ?? '';
    const title = merch.productTitle;
    const handle = merch.productHandle;

    return (
        <div
            data-cart-line={line.id}
            className={cn(
                'relative flex items-start gap-(--cart-line-gap) border-(--cart-line-divider-color) border-0 border-b border-solid py-(--cart-line-padding-y) last:border-b-0',
                !ready && 'cursor-not-allowed opacity-50 *:pointer-events-none',
            )}
        >
            <span data-line-quantity={quantity} className="sr-only" aria-live="polite">
                {quantity}
            </span>
            <div
                data-testid="cart-line-image"
                className="flex size-(--cart-line-image-size) shrink-0 items-center justify-center self-start overflow-hidden rounded-[var(--cart-line-image-radius)] border border-(--border-default) border-solid bg-(--surface-0) p-2"
            >
                {image}
            </div>

            <div className="flex w-full min-w-0 flex-col items-start gap-[var(--block-spacer-large)] md:flex-row">
                <header className="flex h-full w-full min-w-0 flex-1 flex-col items-start justify-between gap-1 md:py-2">
                    <div className="w-full min-w-0">
                        <Link
                            href={`/products/${handle}`}
                            prefetch={false}
                            data-testid="cart-line-title"
                            className="line-clamp-2 break-words font-bold text-lg leading-tight transition-colors hover:text-primary focus-visible:text-primary"
                        >
                            {showVendor && vendor ? (
                                <span className="text-(color:var(--text-muted))">{vendor}</span>
                            ) : null}{' '}
                            {title}
                        </Link>

                        {realOptions.length > 0 ? (
                            <div className="mt-1 flex w-full min-w-0 flex-wrap items-center gap-1.5">
                                {realOptions.map(({ name, value }) => {
                                    const isColor = isColorOption(name);
                                    // One option-value shape feeds the SHARED read-only swatch/chip primitives so the
                                    // cart and the product picker render variants identically (one token system).
                                    const rendererProps: OptionValueRendererProps = {
                                        group: { name, values: [] },
                                        value: isColor
                                            ? {
                                                  name: value,
                                                  selected: false,
                                                  available: true,
                                                  swatch: { color: value },
                                              }
                                            : { name: value, selected: false, available: true },
                                        onSelect: () => {},
                                        density: 'compact',
                                        readOnly: true,
                                    };

                                    // Color: always a swatch (the augment override), with the value label beside it.
                                    if (isColor) {
                                        return (
                                            <span key={name} className="inline-flex items-center gap-1.5">
                                                <Swatch {...rendererProps} />
                                                <span className="text-(color:var(--text-muted)) text-xs">{value}</span>
                                            </span>
                                        );
                                    }

                                    // Non-color: `text` renders a plain label; otherwise the shared chip.
                                    if (variantStyle === 'text') {
                                        return (
                                            <span key={name} className="text-(color:var(--text-muted)) text-xs">
                                                {value}
                                            </span>
                                        );
                                    }
                                    return <Chip key={name} {...rendererProps} />;
                                })}
                            </div>
                        ) : null}

                        {showSku && merch.sku ? (
                            <Label className="text-(color:var(--text-muted)) mt-1 block text-xs">
                                {tProduct('sku')}: {merch.sku}
                            </Label>
                        ) : null}

                        <div className="flex items-center justify-start gap-1 gap-x-3 md:flex-col md:items-start md:pt-1">
                            {typeof merch.quantityAvailable === 'number' &&
                            merch.quantityAvailable > 0 &&
                            merch.quantityAvailable <= 5 ? (
                                <Label className="font-medium text-(--state-warning) text-xs leading-none">
                                    {tCart('n-left', merch.quantityAvailable.toString())}
                                </Label>
                            ) : null}

                            {line.discountAllocations.length > 0 ? (
                                <div className="flex w-full flex-wrap items-start justify-start gap-2">
                                    {line.discountAllocations.map((discount, index) => (
                                        <div
                                            key={`${line.id}-discount-${index}`}
                                            className="text-(color:var(--text-muted)) flex items-center justify-center gap-1 font-medium text-xs leading-none"
                                        >
                                            <TagIcon className="stroke-1 text-inherit" />
                                            <Label>
                                                {(discount as { title?: string }).title ||
                                                    (discount as { code?: string }).code ||
                                                    tCart('automatic-discount')}
                                            </Label>
                                        </div>
                                    ))}
                                </div>
                            ) : null}
                        </div>
                    </div>
                    <div>
                        <div className="flex flex-col items-start">{pricing}</div>
                    </div>
                </header>

                <section className="flex w-full shrink-0 flex-col items-end justify-end md:w-56">
                    <div className="absolute inset-auto top-3 right-3">
                        <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            aria-label={t('remove')}
                            title={t('remove')}
                            onClick={async () => {
                                await removeLine(line.id!);
                            }}
                        >
                            <XIcon className="stroke-2 text-xl" />
                        </Button>
                    </div>

                    <div className="h-12 w-full">
                        <QuantitySelector
                            className="h-full"
                            buttonClassName={cn(quantity > 999 && 'hidden')}
                            disabled={!ready}
                            i18n={i18n}
                            value={quantity}
                            update={async (value) => {
                                if (value === quantity) {
                                    return;
                                }
                                await updateLine({ lineId: line.id!, quantity: value });
                            }}
                            allowDecreaseToZero={true}
                        />
                    </div>
                </section>
            </div>
        </div>
    );
};

CartLine.skeleton = () => (
    <section
        className="flex w-full flex-nowrap gap-2 border-(--border-default) border-0 border-b-2 border-solid pb-2"
        data-skeleton
    ></section>
);

CartLine.displayName = 'Nordcom.Cart.Line';

export { CartLine };
