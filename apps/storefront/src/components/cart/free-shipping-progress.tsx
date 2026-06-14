import { Price } from '@/components/products/price';
import { type CurrencyCode, getTranslations, type LocaleDictionary } from '@/utils/locale';
import { cn } from '@/utils/tailwind';
import type { FreeShippingState } from './free-shipping';

type FreeShippingProgressProps = {
    state: FreeShippingState;
    currencyCode: CurrencyCode;
    i18n: LocaleDictionary;
    className?: string;
};
/**
 * Free-shipping messaging banner: renders the shopper's progress toward the
 * per-shop free-shipping threshold, or an unlocked confirmation once cleared.
 * Returns `null` for the `none` state so an unconfigured shop renders nothing.
 *
 * @param props.state - The resolved free-shipping state from {@link resolveFreeShipping}.
 * @param props.currencyCode - The cart presentment currency, used to format the remaining amount.
 * @param props.i18n - Locale dictionary for the `cart`-scope messaging copy.
 * @param props.className - Optional extra classes for the outer container.
 * @returns The progress/unlocked banner, or `null` when there is nothing to show.
 */
export function FreeShippingProgress({ state, currencyCode, i18n, className }: FreeShippingProgressProps) {
    const { t } = getTranslations('cart', i18n);

    if (state.state === 'none') {
        return null;
    }

    if (state.state === 'unlocked') {
        return (
            <div
                className={cn(
                    'rounded-[var(--block-border-radius)] bg-(--surface-success) px-3 py-2 font-semibold text-(--text-success-strong) text-sm',
                    className,
                )}
                data-testid="free-shipping-unlocked"
            >
                {t('free-shipping-on-this-order')}
            </div>
        );
    }

    const progress = Math.min((state.threshold - state.remaining) / state.threshold, 1);

    return (
        <div
            className={cn(
                'flex flex-col gap-2 rounded-[var(--block-border-radius)] bg-(--color-block) px-3 py-2',
                className,
            )}
            data-testid="free-shipping-progress"
        >
            <div className="text-sm leading-snug">
                {t(
                    'away-from-free-shipping',
                    <Price
                        key="remaining"
                        className="font-bold"
                        data={{ currencyCode, amount: state.remaining.toString() }}
                    />,
                )}
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-(--surface-2)">
                <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{ width: `${progress * 100}%` }}
                />
            </div>
        </div>
    );
}

FreeShippingProgress.displayName = 'Nordcom.Cart.FreeShippingProgress';
