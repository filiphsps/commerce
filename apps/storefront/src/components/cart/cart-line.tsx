'use client';

import type { CartLine as CoreCartLine } from '@nordcom/cart-core';
import { useCartActions, useCartStatus } from '@nordcom/cart-react';
import { Tag as TagIcon, X as XIcon } from 'lucide-react';
import Image from 'next/image';
import { Button } from '@/components/actionable/button';
import { Card } from '@/components/layout/card';
import Link from '@/components/link';
import { Price } from '@/components/products/price';
import { QuantitySelector } from '@/components/products/quantity-selector';
import { Label } from '@/components/typography/label';
import { getTranslations, type LocaleDictionary } from '@/utils/locale';
import { safeParseFloat } from '@/utils/pricing';
import { cn } from '@/utils/tailwind';

interface CartLineProps {
    i18n: LocaleDictionary;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data: CoreCartLine<any>;
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
            width={85}
            height={85}
            sizes="(max-width: 920px) 65px, 175px"
            priority={false}
            loading="lazy"
            decoding="async"
            draggable={false}
        />
    ) : null;

    const pricing = (
        <>
            {discount > 0.1 ? (
                <Price
                    className="font-medium text-base text-(color:var(--text-muted)) leading-tight line-through"
                    data={{
                        amount: (
                            safeParseFloat(0, merch.compareAtUnitPrice?.amount, merch.unitPrice.amount) * line.quantity
                        ).toString(),
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        currencyCode: merch.unitPrice.currencyCode as any,
                    }}
                />
            ) : null}
            <Price
                className={cn(
                    'font-bold text-xl leading-tight',
                    discount > 0.1 && 'font-extrabold text-(color:var(--state-sale)) text-xl',
                )}
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                data={line.cost.total as any}
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
        <Card
            data-cart-line={line.id}
            className={cn(
                'relative flex gap-[var(--block-spacer-large)] shadow',
                !ready && 'cursor-not-allowed opacity-50 *:pointer-events-none',
            )}
        >
            <span data-line-quantity={quantity} className="sr-only" aria-live="polite">
                {quantity}
            </span>
            <Card className="h-full min-h-32 w-auto overflow-hidden bg-(--surface-0) p-2 shadow">{image}</Card>

            <div className="flex w-full flex-col items-start gap-[var(--block-spacer-large)] md:flex-row">
                <header className="flex h-full w-full flex-col items-start justify-between gap-1 md:py-2">
                    <div>
                        <Link
                            href={`/products/${handle}`}
                            prefetch={false}
                            className="font-bold text-lg leading-none transition-colors hover:text-primary focus-visible:text-primary"
                        >
                            <span>{vendor}</span> {title}
                        </Link>

                        {realOptions.length > 0 ? (
                            <div className="mt-1 inline-flex flex-wrap items-center gap-1">
                                {realOptions.map(({ name, value }) => (
                                    <span
                                        key={name}
                                        className="inline-flex items-center rounded-md border border-(--border-default) border-solid bg-(--surface-2) px-2 py-0.5 font-medium text-xs"
                                    >
                                        {name}·{value}
                                    </span>
                                ))}
                            </div>
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
                                            className="flex items-center justify-center gap-1 font-medium text-(color:var(--text-muted)) text-xs leading-none"
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

                <section className="flex h-full w-full flex-col items-end justify-end">
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

                    <div className="h-12 w-full max-w-none md:w-full md:max-w-56">
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
        </Card>
    );
};

CartLine.skeleton = () => (
    <section
        className="flex w-full flex-nowrap gap-2 border-0 border-(--border-default) border-b-2 border-solid pb-2"
        data-skeleton
    ></section>
);

CartLine.displayName = 'Nordcom.Cart.Line';

export { CartLine };
