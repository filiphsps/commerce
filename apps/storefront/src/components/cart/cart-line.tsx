import { getProductOptions, mapSelectedProductOptionToObject, useCart } from '@shopify/hydrogen-react';
import type { CartLine as ShopifyCartLine } from '@shopify/hydrogen-react/storefront-api-types';
import { Pencil, Tag as TagIcon, X as XIcon } from 'lucide-react';
import Image from 'next/image';
import { useMemo, useState } from 'react';
import type { Product, ProductVariant } from '@/api/product';
import { Button } from '@/components/actionable/button';
import { Card } from '@/components/layout/card';
import { Popover } from '@/components/layout/popover';
import Link from '@/components/link';
import { ProductOptionsSelector, type SelectedOptions } from '@/components/product-options-selector';
import { Price } from '@/components/products/price';
import { QuantitySelector } from '@/components/products/quantity-selector';
import { Label } from '@/components/typography/label';
import { hasProductOptions } from '@/utils/has-product-options';
import { getTranslations, type LocaleDictionary } from '@/utils/locale';
import { safeParseFloat } from '@/utils/pricing';
import { cn } from '@/utils/tailwind';

interface CartLineProps {
    i18n: LocaleDictionary;
    data: ShopifyCartLine;
}
const CartLine = ({ i18n, data: line }: CartLineProps) => {
    const { cartReady, status, linesUpdate, linesRemove } = useCart();
    const { t } = getTranslations('common', i18n);
    const { t: tCart } = getTranslations('cart', i18n);

    const ready = cartReady && status !== 'updating';

    const product = line.merchandise.product as unknown as Required<Product> | undefined;
    const variant = line.merchandise as unknown as Required<ProductVariant> | undefined;

    const showSelector = hasProductOptions(product ?? null);

    // biome-ignore lint/suspicious/noExplicitAny: local Product type is a stricter superset of hydrogen-react's RecursivePartial<Product>
    const mappedOptions = useMemo(() => (product ? getProductOptions(product as any) : []), [product]);
    const initialSelected = useMemo<SelectedOptions>(
        () =>
            mapSelectedProductOptionToObject(
                (variant?.selectedOptions ?? []) as Array<{ name: string; value: string }>,
            ),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [variant?.selectedOptions],
    );
    const [editing, setEditing] = useState(false);

    if (!product || !variant) {
        console.error(`Product or product variant not found for line ${line.id}`);
        return null;
    }

    // Free items, gift wrap, deposit lines, and partial-refund flows can leave
    // `compare` at 0 — guard the divide so we don't render an `Infinity% off`
    // strikethrough. Also clamp to [0,100] so a negative auto-discount
    // allocation (current > compare) doesn't produce a confusing negative.
    const computeDiscount = (compareStr: string | undefined, currentStr: string | undefined): number => {
        const compare = safeParseFloat(0, compareStr);
        const current = safeParseFloat(0, currentStr);
        if (compare <= 0) return 0;
        const pct = Math.round((100 * (compare - current)) / compare);
        if (!Number.isFinite(pct)) return 0;
        return Math.max(0, Math.min(100, pct));
    };
    const discount = computeDiscount(
        variant.compareAtPrice?.amount ?? variant.price.amount,
        line.cost.totalAmount.amount,
    );

    const image = variant.image ? (
        <Image
            className="h-full w-full object-contain object-center"
            src={variant.image.url}
            alt={variant.image.altText || variant.title}
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
                    className="font-medium text-base text-gray-500 leading-tight line-through"
                    data={{
                        amount: (
                            safeParseFloat(0, variant.compareAtPrice?.amount, variant.price.amount) * line.quantity
                        ).toString(),
                        currencyCode: variant.price.currencyCode,
                    }}
                />
            ) : null}

            <Price
                className={cn(
                    'font-bold text-xl leading-tight',
                    discount > 0.1 && 'font-extrabold text-red-500 text-xl',
                )}
                data={line.cost.totalAmount}
            />
        </>
    );

    const discounts = line.discountAllocations;

    const { quantity } = line;
    const { vendor, title, handle } = product;

    const handleSwap = (next: SelectedOptions) => {
        const changed = Object.entries(next).find(([k, v]) => initialSelected[k] !== v);
        if (!changed) {
            setEditing(false);
            return;
        }
        const [name, value] = changed;
        const entry = mappedOptions.find((o) => o.name === name)?.optionValues.find((v) => v.name === value);
        if (!entry?.variant?.id) {
            setEditing(false);
            return;
        }
        linesUpdate([{ id: line.id!, merchandiseId: entry.variant.id, quantity: line.quantity }]);
        setEditing(false);
    };

    return (
        <Card
            className={cn(
                'relative flex gap-3 shadow',
                !ready && 'cursor-not-allowed opacity-50 *:pointer-events-none',
            )}
        >
            <Card className="h-full min-h-32 w-auto overflow-hidden bg-white p-2 shadow">{image}</Card>

            <div className="flex w-full flex-col items-start gap-3 md:flex-row">
                <header className="flex h-full w-full flex-col items-start justify-between gap-1 md:py-2">
                    <div>
                        <Link
                            href={`/products/${handle}`}
                            prefetch={false}
                            className="font-bold text-lg leading-none transition-colors hover:text-primary focus-visible:text-primary"
                        >
                            <span>{vendor}</span> {title}
                        </Link>

                        {showSelector ? (
                            <button
                                type="button"
                                onClick={() => setEditing(true)}
                                aria-label="Edit options"
                                className="inline-flex flex-wrap items-center gap-1 text-gray-600 text-sm hover:text-primary"
                            >
                                {variant.selectedOptions
                                    .filter(({ name, value }) => !(name === 'Title' && value === 'Default Title'))
                                    .map(({ name, value }) => (
                                        <span
                                            key={name}
                                            className="inline-flex items-center rounded-md border border-gray-200 border-solid bg-gray-50 px-2 py-0.5 font-medium text-xs"
                                        >
                                            {name}·{value}
                                        </span>
                                    ))}
                                <Pencil size={12} aria-hidden={true} className="opacity-70" />
                            </button>
                        ) : null}
                        {showSelector ? (
                            <Popover
                                open={editing}
                                onOpenChange={setEditing}
                                title={`Edit options · ${vendor} ${title}`}
                            >
                                <ProductOptionsSelector
                                    options={mappedOptions}
                                    selectedOptions={initialSelected}
                                    onChange={handleSwap}
                                    density="spacious"
                                />
                            </Popover>
                        ) : null}

                        <div className="flex items-center justify-start gap-1 gap-x-3 md:flex-col md:items-start md:pt-1">
                            {discounts.length > 0 ? (
                                <div className="flex w-full flex-wrap items-start justify-start gap-2">
                                    {discounts.map((discount, index) => (
                                        <div
                                            key={`${line.id}-discount-${index}`}
                                            className="flex items-center justify-center gap-1 font-medium text-gray-600 text-xs leading-none"
                                        >
                                            <TagIcon className="stroke-1 text-inherit" />
                                            <Label>
                                                {(discount as { title?: string }).title || tCart('automatic-discount')}
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
                        <Label
                            as={Button}
                            onClick={() => linesRemove([line.id!])}
                            styled={false}
                            className="flex items-center justify-center gap-1 border-0 border-red-500 border-solid text-sm hover:text-red-500 focus-visible:border-b-2 focus-visible:text-red-500 md:text-base"
                            title={t('remove')}
                        >
                            <XIcon className="stroke-2 text-xl" />
                        </Label>
                    </div>

                    <div className="h-12 w-full max-w-none md:w-full md:max-w-56">
                        <QuantitySelector
                            className="h-full"
                            buttonClassName={cn(quantity > 999 && 'hidden')}
                            disabled={!ready}
                            i18n={i18n}
                            value={quantity}
                            update={(value) => {
                                if (value === quantity) {
                                    return;
                                }

                                linesUpdate([
                                    {
                                        id: line.id!,
                                        quantity: value,
                                    },
                                ]);
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
        className="flex w-full flex-nowrap gap-2 border-0 border-gray-100 border-b-2 border-solid pb-2"
        data-skeleton
    ></section>
);

CartLine.displayName = 'Nordcom.Cart.Line';

export { CartLine };
