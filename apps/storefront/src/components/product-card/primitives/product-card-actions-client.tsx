'use client';

import { useCart } from '@shopify/hydrogen-react';
import { Plus as PlusIcon } from 'lucide-react';
import { useActionState, useEffect, useRef } from 'react';
import type { Product } from '@/api/product';
import { useMaybeProductOptions } from '@/components/product-options/context';
import type { CartActionResult } from '@/pages/_actions/cart.types';
import type { LocaleDictionary } from '@/utils/locale';
import { getTranslations } from '@/utils/locale';
import { cn } from '@/utils/tailwind';

export type ProductCardActionsClientProps = {
    product: Product;
    seedVariantId: string;
    mode: 'full' | 'icon';
    i18n: LocaleDictionary;
    initialSeedLineId: string | null;
    initialSeedQuantity: number;
    addAction: (formData: FormData) => Promise<CartActionResult>;
    updateAction: (formData: FormData) => Promise<CartActionResult>;
};

type NarrowedCart = {
    lines?: ReadonlyArray<{ id?: string; quantity?: number; merchandise?: { id?: string } } | null | undefined>;
    linesAdd?: (lines: ReadonlyArray<{ merchandiseId: string; quantity: number }>) => void;
    linesUpdate?: (lines: ReadonlyArray<{ id: string; quantity: number }>) => void;
};

const ProductCardActionsClient = ({
    seedVariantId,
    mode,
    i18n,
    initialSeedLineId,
    initialSeedQuantity,
    addAction,
    updateAction,
}: ProductCardActionsClientProps) => {
    const { t } = getTranslations('common', i18n);
    const ctx = useMaybeProductOptions();
    const selectedVariant = ctx?.selectedVariant;
    const cart = useCart() as unknown as NarrowedCart;

    const variantId = selectedVariant?.id ?? seedVariantId;
    const cartLine = cart.lines?.find((l) => l?.merchandise?.id === variantId);
    const inCartQuantity = cartLine?.quantity ?? (variantId === seedVariantId ? initialSeedQuantity : 0);
    const lineId = cartLine?.id ?? (variantId === seedVariantId ? initialSeedLineId : null);

    const [addState, addFormAction, addPending] = useActionState<CartActionResult | null, FormData>(
        async (_prev, formData) => addAction(formData),
        null,
    );
    const [, updateFormAction, updatePending] = useActionState<CartActionResult | null, FormData>(
        async (_prev, formData) => updateAction(formData),
        null,
    );

    // "Ack and apply": when the server action returns ok we fire the
    // hydrogen-react client cart mutation. The server action only validates
    // input and revalidates tags; the canonical client cart still lives in
    // hydrogen-react's CartProvider. Track the last applied state by identity
    // so we don't re-fire on unrelated re-renders.
    const lastAppliedAddRef = useRef<CartActionResult | null>(null);
    useEffect(() => {
        if (!addState?.ok) return;
        if (lastAppliedAddRef.current === addState) return;
        lastAppliedAddRef.current = addState;
        if (variantId && cart.linesAdd) {
            cart.linesAdd([{ merchandiseId: variantId, quantity: 1 }]);
        }
    }, [addState, variantId, cart]);

    const baseStyles = cn(
        'overflow-hidden font-semibold transition-colors',
        'rounded-(--product-card-cta-radius)',
        '[transition-duration:var(--product-card-motion-hover-duration)]',
        '[transition-timing-function:var(--product-card-motion-hover-ease)]',
    );

    if (inCartQuantity > 0 && lineId) {
        const stepperStyles = cn(
            baseStyles,
            'flex items-stretch justify-between',
            mode === 'full' && 'h-product-card-cta-height w-full bg-white text-(--product-card-cta-bg)',
            mode === 'icon' && 'h-9 rounded-full bg-(--product-card-cta-bg) text-(--product-card-cta-color)',
            'border border-(color:var(--product-card-cta-bg))',
        );
        const buttonStyles = cn(
            'cursor-pointer px-3 transition-[background-color,transform]',
            'focus-visible:outline-none focus-visible:[outline:2px_solid_var(--accent)] focus-visible:[outline-offset:-3px]',
            'disabled:cursor-not-allowed disabled:opacity-50 motion-safe:active:scale-[0.99]',
        );
        const nextDecrement = Math.max(0, inCartQuantity - 1);
        const nextIncrement = inCartQuantity + 1;
        return (
            <div data-mode={mode} className={stepperStyles}>
                <form action={updateFormAction} className="flex">
                    <input type="hidden" name="lineId" value={lineId} />
                    <input type="hidden" name="quantity" value={nextDecrement} />
                    <button
                        type="submit"
                        aria-label={t('decrease')}
                        disabled={updatePending}
                        className={buttonStyles}
                        onClick={() => cart.linesUpdate?.([{ id: lineId, quantity: nextDecrement }])}
                    >
                        {'−'}
                    </button>
                </form>
                <span className="grid select-none place-items-center px-2 tabular-nums">{inCartQuantity}</span>
                <form action={updateFormAction} className="flex">
                    <input type="hidden" name="lineId" value={lineId} />
                    <input type="hidden" name="quantity" value={nextIncrement} />
                    <button
                        type="submit"
                        aria-label={t('increase')}
                        disabled={updatePending}
                        className={buttonStyles}
                        onClick={() => cart.linesUpdate?.([{ id: lineId, quantity: nextIncrement }])}
                    >
                        +
                    </button>
                </form>
            </div>
        );
    }

    const fullStyles = cn(
        baseStyles,
        'flex w-full transform-gpu items-center justify-center',
        'h-product-card-cta-height',
        'bg-(--product-card-cta-bg) text-(--product-card-cta-color)',
        'hover:bg-(--product-card-cta-bg-hover)',
        'active:scale-[0.98]',
        'disabled:cursor-not-allowed disabled:opacity-50',
    );
    const iconStyles = cn(
        baseStyles,
        'flex h-9 w-9 shrink-0 items-center justify-center rounded-full',
        'bg-(--product-card-cta-bg) text-(--product-card-cta-color)',
        'hover:bg-(--product-card-cta-bg-hover)',
        'active:scale-95',
        'disabled:cursor-not-allowed disabled:opacity-50',
    );

    return (
        <form action={addFormAction} className={mode === 'full' ? 'w-full' : undefined}>
            <input type="hidden" name="variantId" value={variantId ?? ''} />
            <input type="hidden" name="quantity" value="1" />
            <button
                type="submit"
                disabled={addPending || !variantId}
                data-mode={mode}
                aria-label={mode === 'icon' ? t('add-to-cart') : undefined}
                className={mode === 'full' ? fullStyles : iconStyles}
            >
                {mode === 'icon' ? <PlusIcon className="h-4 w-4 stroke-2" /> : t('add-to-cart')}
            </button>
        </form>
    );
};

ProductCardActionsClient.displayName = 'Nordcom.ProductCard.Actions.Client';
export default ProductCardActionsClient;
