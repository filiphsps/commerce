'use client';

import { cn } from '@/utils/tailwind';
import { useCart } from '@shopify/hydrogen-react';
import { Tag as TagIcon, X as XIcon } from 'lucide-react';

import { Button } from '@/components/actionable/button';
import { Label } from '@/components/typography/label';

import type { CartDiscountCode } from '@shopify/hydrogen-react/storefront-api-types';

const CartCoupons = ({}) => {
    const { discountCodes = [], discountCodesUpdate, cartReady } = useCart();

    if (!cartReady || discountCodes.length <= 0) {
        return null;
    }

    return (
        <section className="flex flex-col items-start justify-start gap-2">
            <Label>Active discounts</Label>

            <div className={cn('flex flex-wrap gap-2')}>
                {(discountCodes as CartDiscountCode[]).map(({ code }) => (
                    <div
                        key={code}
                        className="flex items-center justify-center gap-2 overflow-hidden rounded-xl bg-white px-3 py-2"
                    >
                        <TagIcon className="" />

                        <Label>{code}</Label>

                        <Button
                            styled={false}
                            className="contents"
                            type="button"
                            title={`Remove promo code "${code}"`}
                            onClick={() => {
                                const codes = discountCodes
                                    .map((discount) => discount?.code)
                                    .filter(Boolean) as string[];

                                // Return the discount codes except for the one we're removing.
                                discountCodesUpdate(codes.filter((i) => i !== code));
                            }}
                        >
                            <XIcon
                                className="h-4 text-lg transition-colors hover:fill-red-500 hover:stroke-red-500"
                                style={{ strokeWidth: 2.5 }}
                            />
                        </Button>
                    </div>
                ))}
            </div>
        </section>
    );
};

CartCoupons.displayName = 'Nordcom.Cart.Coupons';
export { CartCoupons };
