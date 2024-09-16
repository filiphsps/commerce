import { CgTrash } from 'react-icons/cg';
import { FiTag } from 'react-icons/fi';

import { type LocaleDictionary, useTranslation } from '@/utils/locale';
import { safeParseFloat } from '@/utils/pricing';
import { cn } from '@/utils/tailwind';
import { useCart } from '@shopify/hydrogen-react';
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
    const { t } = useTranslation('common', i18n);
    const { t: tCart } = useTranslation('cart', i18n);

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
            className="block h-full w-full object-contain object-center"
            src={variant.image.url}
            alt={variant.image.altText || variant.title}
            width={85}
            height={85}
            sizes="(max-width: 920px) 90vw, 500px"
            priority={false}
            loading="lazy"
            decoding="async"
            draggable={false}
        />
    ) : null;

    const pricing = (
        <>
            {discount ? (
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
                className={cn('text-xl font-bold leading-tight', discount && 'text-xl font-extrabold text-red-500')}
                data={line.cost.totalAmount}
            />
        </>
    );

    const discounts = line.discountAllocations;

    const { quantity } = line;
    const { vendor, title, productType, handle } = product;

    return (
        <section
            className={cn(
                'flex h-full w-full flex-wrap border-0 border-b-2 border-solid border-gray-200 py-6 first-of-type:border-t-2 md:grid md:grid-cols-[8rem_1fr] md:grid-rows-[1fr] md:gap-3',
                !ready && 'cursor-not-allowed opacity-50 *:pointer-events-none'
            )}
        >
            <Card
                className="mb-8 aspect-[4/3] w-24 flex-shrink-0 overflow-hidden border-0 p-0 md:mb-0 md:aspect-square md:h-full md:w-full md:border-2 md:p-3"
                border={true}
            >
                {image}
            </Card>

            <div className="contents h-fit w-full flex-wrap items-start gap-3 md:relative md:grid md:h-full md:grid-cols-[7fr_3fr_4fr] md:grid-rows-[1fr] md:py-2">
                <header className="flex w-[calc(100%-7rem)] flex-col gap-1 pl-4 md:w-full md:pl-0">
                    <Link
                        href={`/products/${handle}`}
                        prefetch={false}
                        className="hover:text-primary text-lg font-bold leading-none transition-colors"
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
                            <div className="w-fit py-1">
                                <div className="flex w-full flex-wrap items-start justify-start gap-2">
                                    {discounts.map((discount, index) => (
                                        <div
                                            key={`${line.id}-discount-${index}`}
                                            className="flex items-center justify-center gap-1 rounded-xl bg-gray-100 p-1 px-2 text-xs font-semibold leading-none"
                                        >
                                            <FiTag className="text-inherit" />
                                            <Label>{(discount as any).title || tCart('automatic-discount')}</Label>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : null}

                        <div className="flex w-fit gap-2">
                            <Label
                                as={Button}
                                onClick={() => linesRemove([line.id!])}
                                styled={false}
                                className="flex items-center justify-center gap-1 text-sm hover:text-red-500 md:text-base"
                            >
                                <CgTrash className="text-sm text-inherit md:-mt-[.15rem] md:text-base" />
                                {t('remove')}
                            </Label>
                        </div>
                    </div>
                </header>

                <div className="flex w-[calc(100%*2/3-.75rem)] flex-col items-start justify-center self-center pr-4 md:h-full md:w-full md:items-center md:justify-start md:gap-3 md:pr-0">
                    <div className="h-12 w-full max-w-48 md:h-14 md:max-w-none">
                        <QuantitySelector
                            className="h-full border-2 border-solid border-gray-100"
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
                </div>

                <div className="flex h-12 w-[calc(100%*1/3)] flex-col items-end justify-center text-right md:h-full md:w-full md:justify-start">
                    <div className="flex flex-col items-end">{pricing}</div>
                </div>
            </div>
        </section>
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
