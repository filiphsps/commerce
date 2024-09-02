import { cn } from '@/utils/tailwind';
import { Money, parseGid } from '@shopify/hydrogen-react';
import Image from 'next/image';

import { CartLineQuantityAction, CartLineRemoveAction } from '@/components/cart/cart-line-actions';
import Link from '@/components/link';
import { Label } from '@/components/typography/label';

import type { Product, ProductVariant } from '@/api/product';
import type { LocaleDictionary } from '@/utils/locale';
import type { CartLine as ShopifyCartLine } from '@shopify/hydrogen-react/storefront-api-types';

interface CartLineProps {
    i18n: LocaleDictionary;
    data: ShopifyCartLine;
}
const CartLine = ({ i18n, data: line }: CartLineProps) => {
    const product: Required<Product> | undefined = line.merchandise.product! as any;
    const variant: Required<ProductVariant> | undefined = line.merchandise! as any;
    if (!product || !variant) {
        console.error(`Product or product variant not found for line ${line.id}`);
        return null;
    }

    let discount = 0;
    if (variant.compareAtPrice?.amount) {
        const compare = Number.parseFloat(variant.compareAtPrice!.amount || '0');
        const current = Number.parseFloat(variant.price!.amount || '0');
        discount = Math.round((100 * (compare - current)) / compare) || 0;
    }

    const image = variant.image ? (
        <Image
            alt={variant.image.altText || variant.title}
            className="block h-24 w-20 flex-shrink-0 rounded-lg bg-white object-contain object-center"
            src={variant.image.url}
            width={45}
            height={45}
            draggable={false}
        />
    ) : null;

    const pricing = (
        <>
            <Money
                className={cn('text-xl font-bold leading-tight', discount && 'font-extrabold text-red-500')}
                data={{
                    amount: (Number.parseFloat(variant.price.amount) * line.quantity).toString(),
                    currencyCode: variant.price.currencyCode
                }}
            />
            {variant.compareAtPrice ? (
                <Money
                    className="text-sm leading-tight text-gray-500 line-through"
                    data={{
                        amount: (Number.parseFloat(variant.compareAtPrice.amount) * line.quantity).toString(),
                        currencyCode: variant.compareAtPrice.currencyCode
                    }}
                />
            ) : null}
        </>
    );

    return (
        <div className="flex w-full gap-2 border-0 border-t-2 border-solid border-gray-300 py-2 md:gap-4">
            {image}

            <div className="flex w-full flex-row gap-2">
                <div className="flex w-full flex-col gap-2 gap-y-1">
                    <Link
                        href={`/products/${line.merchandise.product.handle}?variant=${parseGid(line.merchandise.id).id}`}
                        className="flex w-full flex-col"
                    >
                        <Label
                            as={'div'}
                            className="group-hover/header:text-primary pb-1 pt-2 text-[.95rem] font-medium normal-case leading-none text-gray-600 transition-colors"
                        >
                            {product.vendor}
                        </Label>
                        <div className="group-hover/header:text-primary transition-color text-[1.20rem] font-bold leading-6 text-current">
                            {product.title} <span className="text-sm">({variant.title})</span>
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
        className="flex w-full flex-nowrap gap-2 border-0 border-b-2 border-solid border-gray-200 pb-2"
        data-skeleton
    ></section>
);

CartLine.displayName = 'Nordcom.Cart.Line';
export { CartLine };
