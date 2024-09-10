import { safeParseFloat } from '@/utils/pricing';
import { cn } from '@/utils/tailwind';
import { parseGid, useCart } from '@shopify/hydrogen-react';
import Image from 'next/image';

import { CartLineQuantityAction, CartLineRemoveAction } from '@/components/cart/cart-line-actions';
import { Card } from '@/components/layout/card';
import Link from '@/components/link';
import { Price } from '@/components/products/price';
import { Label } from '@/components/typography/label';

import type { Product, ProductVariant } from '@/api/product';
import type { LocaleDictionary } from '@/utils/locale';
import type { CartLine as ShopifyCartLine } from '@shopify/hydrogen-react/storefront-api-types';

interface CartLineProps {
    i18n: LocaleDictionary;
    data: ShopifyCartLine;
}
const CartLine = ({ i18n, data: line }: CartLineProps) => {
    const { cartReady, status } = useCart();
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
        const current = safeParseFloat(0, variant.price.amount);
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
            <Price
                className={cn('text-xl font-bold leading-tight', discount && 'font-extrabold text-red-500')}
                data={{
                    amount: (safeParseFloat(0, variant.price.amount) * line.quantity).toString(),
                    currencyCode: variant.price.currencyCode
                }}
            />
            {variant.compareAtPrice ? (
                <Price
                    className="text-sm leading-tight text-gray-500 line-through"
                    data={{
                        amount: (safeParseFloat(0, variant.compareAtPrice.amount) * line.quantity).toString(),
                        currencyCode: variant.compareAtPrice.currencyCode
                    }}
                />
            ) : null}
        </>
    );

    const isExpandedProduct = !(variant.title === 'Default Title');

    return (
        <div
            className={cn(
                'flex w-full gap-2 border-0 border-t-2 border-solid border-gray-100 py-2 transition-opacity md:gap-4',
                !ready && 'cursor-not-allowed opacity-50 *:pointer-events-none'
            )}
        >
            <Card
                className="h-full w-20 flex-shrink-0 border-0 bg-white p-0 md:w-24 md:overflow-hidden md:border-2 md:p-2"
                border={true}
            >
                {image}
            </Card>

            <div className="flex w-full flex-row gap-2">
                <div className="flex w-full flex-col gap-2 gap-y-1">
                    <Link
                        href={`/products/${line.merchandise.product.handle}?variant=${parseGid(line.merchandise.id).id}`}
                        className="group/header flex w-full flex-col"
                    >
                        <Label
                            as={'div'}
                            className="group-hover/header:text-primary pb-1 pt-2 text-[0.9rem] font-medium normal-case leading-none text-gray-500 transition-colors"
                        >
                            {product.vendor}
                        </Label>

                        <div className="group-hover/header:text-primary transition-color text-[1.18rem] font-bold leading-tight text-current md:text-lg">
                            {product.title}
                            {isExpandedProduct ? <span className="text-sm"> ({variant.title})</span> : null}
                        </div>
                    </Link>

                    <CartLineQuantityAction i18n={i18n} data={line} />
                </div>

                <div className="flex h-full flex-col items-end justify-start">
                    {pricing}

                    <CartLineRemoveAction i18n={i18n} data={line} />
                </div>
            </div>
        </div>
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
