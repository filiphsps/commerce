'use client';

import { useCartActions, useCartMeta, useCartStatus } from '@nordcom/cart-react';
import { Tag as TagIcon, X as XIcon } from 'lucide-react';
import { Button } from '@/components/actionable/button';
import { Label } from '@/components/typography/label';
import { cn } from '@/utils/tailwind';

const CartCoupons = ({}) => {
    const { discountCodes } = useCartMeta();
    const { cartReady } = useCartStatus();
    const { removeDiscountCode } = useCartActions();

    if (!cartReady || discountCodes.length <= 0) {
        return null;
    }

    return (
        <section className="flex flex-col items-start justify-start gap-2">
            <Label>Active discounts</Label>

            <div className={cn('flex flex-wrap gap-2')}>
                {discountCodes.map(({ code }) => (
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
                                void removeDiscountCode(code);
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
