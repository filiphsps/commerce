import { type ComponentPropsWithoutRef, Fragment, Suspense } from 'react';

import type { OnlineShop } from '@nordcom/commerce-db';

import { ProductOriginalName } from '@/pages/products/[handle]/product-details';
import { cn } from '@/utils/tailwind';

import { Card } from '@/components/layout/card';
import { Content } from '@/components/typography/content';

import type { Product } from '@/api/product';
import type { Locale } from '@/utils/locale';

export type ProductDescriptionProps = {
    shop: OnlineShop;
    locale: Locale;
    product: Product;
} & Omit<ComponentPropsWithoutRef<'div'>, 'ref' | 'children' | 'prefix'>;

async function Component({ locale, product, className, ...props }: ProductDescriptionProps) {
    const { handle, descriptionHtml } = product;

    return (
        <Card {...props} className={cn('flex flex-col gap-3', className)}>
            <Suspense
                key={`product-description.${handle}.content`}
                fallback={<div className="h-12 w-full" data-skeleton />}
            >
                <Content html={descriptionHtml} />
            </Suspense>

            <Suspense key={`product-description.${handle}.product-original-name`} fallback={<Fragment />}>
                <ProductOriginalName data={product} locale={locale} />
            </Suspense>
        </Card>
    );
}

export type ProductDescriptionSkeletonProps = {} & Omit<ComponentPropsWithoutRef<'div'>, 'ref' | 'children' | 'prefix'>;
function Skeleton({ className, ...props }: ProductDescriptionSkeletonProps) {
    return (
        <Card {...props} className={cn('flex flex-col gap-3', className)}>
            <div className="flex flex-col gap-2">
                <div className="h-12 w-full" data-skeleton />
                <div className="mb-6 h-12 w-44" data-skeleton />

                {Array.from({ length: 3 }).map((_, index) => (
                    <Fragment key={index}>
                        <div className="h-6 w-full" data-skeleton />
                        {index !== 2 ? <div className="h-6 w-full" data-skeleton /> : null}
                        {index === 1 ? <div className="h-6 w-full" data-skeleton /> : null}
                        <div
                            className={cn('mb-2 h-6 w-2/4', index === 1 && 'w-1/4', index === 2 && 'w-5/6')}
                            data-skeleton
                        />
                    </Fragment>
                ))}
            </div>

            <div className="mt-1 h-5 w-36" data-skeleton />
        </Card>
    );
}

export const ProductDescription = Object.assign(Component, {
    displayName: 'Nordcom.Product.Description',
    skeleton: Object.assign(Skeleton, {
        displayName: 'Nordcom.Product.Description.skeleton'
    })
});
