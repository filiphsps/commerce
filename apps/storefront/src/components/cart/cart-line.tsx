import { getTranslations, type LocaleDictionary } from '@/utils/locale';
import { safeParseFloat } from '@/utils/pricing';
import { cn } from '@/utils/tailwind';
import { useCart } from '@shopify/hydrogen-react';
import { Tag as TagIcon, X as XIcon } from 'lucide-react';
import Image from 'next/image';

import { Button } from '@/components/actionable/button';
import { Card } from '@/components/layout/card';
import Link from '@/components/link';
import { Price } from '@/components/products/price';
import { QuantitySelector } from '@/components/products/quantity-selector';
import { Label } from '@/components/typography/label';

import type { Product, ProductVariant } from '@/api/product';
import type { CartLine as ShopifyCartLine } from '@shopify/hydrogen-react/storefront-api-types';

interface CartLineProps {
    i18n: LocaleDictionary;
    data: ShopifyCartLine;
}
const CartLine = ({ i18n, data: line }: CartLineProps) => {
    const { cartReady, status, linesUpdate, linesRemove } = useCart();
    const { t } = getTranslations('common', i18n);
    const { t: tCart } = getTranslations('cart', i18n);

    const ready = cartReady && status !== 'updating';

    const product: Required<Product> | undefined = line.merchandise.product! as any;
    const variant: Required<ProductVariant> | undefined = line.merchandise! as any;
    if (!product || !variant) {
        console.error(`Product or product variant not found for line ${line.id}`);
        return null;
    }

    let discount = 0;
    if (variant.compareAtPrice?.amount) {
        const compare = safeParseFloat(0, variant.compareAtPrice.amount);
        const current = safeParseFloat(0, line.cost.totalAmount.amount);
        discount = Math.round((100 * (compare - current)) / compare) || 0;
    } else {
        const compare = safeParseFloat(0, variant.price.amount);
        const current = safeParseFloat(0, line.cost.totalAmount.amount);
        discount = Math.round((100 * (compare - current)) / compare) || 0;
    }

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
                    className="text-base font-medium leading-tight text-gray-500 line-through"
                    data={{
                        amount: (
                            safeParseFloat(0, variant.compareAtPrice?.amount, variant.price.amount) * line.quantity
                        ).toString(),
                        currencyCode: variant.price.currencyCode
                    }}
                />
            ) : null}

            <Price
                className={cn(
                    'text-xl font-bold leading-tight',
                    discount > 0.1 && 'text-xl font-extrabold text-red-500'
                )}
                data={line.cost.totalAmount}
            />
        </>
    );

    const discounts = line.discountAllocations;

    const { quantity } = line;
    const { vendor, title, productType, handle } = product;

    return (
        <Card
            className={cn(
                'relative flex gap-3 shadow',
                !ready && 'cursor-not-allowed opacity-50 *:pointer-events-none'
            )}
        >
            <Card className="aspect-square h-32 w-auto overflow-hidden bg-white p-2 shadow">{image}</Card>

            <div className="flex w-full flex-col items-start gap-3 md:flex-row">
                <header className="flex h-full w-full flex-col items-start justify-between gap-1 md:py-2">
                    <div>
                        <Link
                            href={`/products/${handle}`}
                            prefetch={false}
                            className="hover:text-primary focus-visible:text-primary text-lg font-bold leading-none transition-colors"
                        >
                            <span>{vendor}</span> {title}
                        </Link>

                        <div className="leading-normal">
                            {[
                                ...(productType ? [productType] : []),
                                ...variant.selectedOptions
                                    .map(({ name, value }) => `${name}: ${value}`)
                                    .filter((_) => _ !== 'Title: Default Title')
                            ].join(', ')}
                        </div>

                        <div className="flex items-center justify-start gap-1 gap-x-3 md:flex-col md:items-start md:pt-1">
                            {discounts.length > 0 ? (
                                <div className="flex w-full flex-wrap items-start justify-start gap-2">
                                    {discounts.map((discount, index) => (
                                        <div
                                            key={`${line.id}-discount-${index}`}
                                            className="flex items-center justify-center gap-1 text-xs font-medium leading-none text-gray-600"
                                        >
                                            <TagIcon className="stroke-1 text-inherit" />
                                            <Label>{(discount as any).title || tCart('automatic-discount')}</Label>
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
                    <div className="absolute inset-auto right-3 top-3">
                        <Label
                            as={Button}
                            onClick={() => linesRemove([line.id!])}
                            styled={false}
                            className="flex items-center justify-center gap-1 border-0 border-solid border-red-500 text-sm hover:text-red-500 focus-visible:border-b-2 focus-visible:text-red-500 md:text-base"
                            title={t('remove')}
                        >
                            <XIcon className="stroke-2 text-xl" />
                        </Label>
                    </div>

                    <div className="h-12 w-full max-w-none md:w-full md:max-w-56">
                        <QuantitySelector
                            className="h-full border-gray-200"
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
                                        quantity: value
                                    }
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
        className="flex w-full flex-nowrap gap-2 border-0 border-b-2 border-solid border-gray-100 pb-2"
        data-skeleton
    ></section>
);

CartLine.displayName = 'Nordcom.Cart.Line';
export { CartLine };
