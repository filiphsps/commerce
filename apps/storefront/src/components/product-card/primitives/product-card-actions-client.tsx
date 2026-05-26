'use client';

import { Plus as PlusIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { Product } from '@/api/product';
import { useCartActions, useCartLines, useCartStatus } from '@/components/cart/provider';
import { useMaybeProductOptions } from '@/components/product-options/context';
import type { LocaleDictionary } from '@/utils/locale';
import { getTranslations } from '@/utils/locale';
import { cn } from '@/utils/tailwind';

export type ProductCardActionsClientProps = {
    product: Product;
    seedVariantId: string;
    mode: 'full' | 'icon';
    i18n: LocaleDictionary;
};

const ProductCardActionsClient = ({ seedVariantId, mode, i18n }: ProductCardActionsClientProps) => {
    const { t } = getTranslations('common', i18n);
    const ctx = useMaybeProductOptions();
    const selectedVariant = ctx?.selectedVariant;
    const { addLine, updateLine } = useCartActions();
    const { cartReady } = useCartStatus();
    const { lines } = useCartLines();

    const variantId = selectedVariant?.id ?? seedVariantId;
    const cartLine = variantId ? lines.find((l) => l.merchandise.id === variantId) : undefined;
    const inCartQuantity = cartLine?.quantity ?? 0;
    const [pending, setPending] = useState(false);

    // Cart context can already be `ready` on the client when a streamed
    // Suspense boundary is hydrated, but the server rendered with the
    // provider's default unready state. Gate reactive context reads behind
    // a post-mount flag so the first client render matches server output.
    const [hydrated, setHydrated] = useState(false);
    useEffect(() => {
        setHydrated(true);
    }, []);
    const effectiveCartReady = hydrated && cartReady;

    const baseStyles = cn(
        'overflow-hidden font-semibold transition-colors',
        'rounded-(--product-card-cta-radius)',
        'duration-(--product-card-motion-hover-duration)',
        'ease-(--product-card-motion-hover-ease)',
    );

    if (inCartQuantity > 0 && cartLine) {
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
                <button
                    type="button"
                    aria-label={t('decrease')}
                    disabled={!hydrated || pending}
                    className={buttonStyles}
                    onClick={async () => {
                        setPending(true);
                        try {
                            await updateLine({ lineId: cartLine.id, quantity: nextDecrement });
                        } finally {
                            setPending(false);
                        }
                    }}
                >
                    {'−'}
                </button>
                <span className="grid select-none place-items-center px-2 tabular-nums">{inCartQuantity}</span>
                <button
                    type="button"
                    aria-label={t('increase')}
                    disabled={!hydrated || pending}
                    className={buttonStyles}
                    onClick={async () => {
                        setPending(true);
                        try {
                            await updateLine({ lineId: cartLine.id, quantity: nextIncrement });
                        } finally {
                            setPending(false);
                        }
                    }}
                >
                    +
                </button>
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
        <button
            type="button"
            disabled={!effectiveCartReady || pending || !variantId}
            data-mode={mode}
            aria-label={mode === 'icon' ? t('add-to-cart') : undefined}
            className={mode === 'full' ? fullStyles : iconStyles}
            onClick={async () => {
                if (!variantId) return;
                setPending(true);
                try {
                    await addLine({ variantId, quantity: 1 });
                } finally {
                    setPending(false);
                }
            }}
        >
            {mode === 'icon' ? <PlusIcon className="h-4 w-4 stroke-2" /> : t('add-to-cart')}
        </button>
    );
};

ProductCardActionsClient.displayName = 'Nordcom.ProductCard.Actions.Client';
export default ProductCardActionsClient;
