import { cn } from '@/utils/tailwind';

export type SaleBadgeStyle = 'default' | 'inverse' | 'accent' | 'sales-color';
export type SaleBadgePosition = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

const POSITION_CLASSES: Record<SaleBadgePosition, string> = {
    'top-left': 'top-2.5 left-2.5',
    'top-right': 'top-2.5 right-2.5',
    'bottom-left': 'bottom-2.5 left-2.5',
    'bottom-right': 'bottom-2.5 right-2.5',
};

const STYLE_CLASSES: Record<SaleBadgeStyle, string> = {
    default: 'bg-(--product-card-bg) text-(--product-card-title-color) border border-(--product-card-border-color)',
    inverse: 'bg-(--product-card-title-color) text-(--product-card-bg) border border-(--product-card-title-color)',
    accent: 'bg-(--accent) text-(--accent-foreground) border border-(--accent)',
    'sales-color':
        'bg-(--product-card-sale-current-color) text-(--accent-foreground) border border-(--product-card-sale-current-color)',
};

export type ProductCardSaleBadgeProps = {
    discountPercent: number;
    style: SaleBadgeStyle;
    position: SaleBadgePosition;
    className?: string;
    /** When true, the badge has been shifted to avoid colliding with the CTA in the same corner. */
    collisionShift?: boolean;
};

const ProductCardSaleBadge = ({
    discountPercent,
    style,
    position,
    className,
    collisionShift,
}: ProductCardSaleBadgeProps) => {
    // Below 11% the visual discount is too small to be worth interrupting the
    // grid — the drawn strike on the compare price still telegraphs the sale.
    if (discountPercent < 11) return null;

    return (
        <span
            data-style={style}
            data-position={position}
            {...(collisionShift ? { 'data-collision-shift': '' } : {})}
            className={cn(
                'absolute z-2 px-2 py-1.5',
                'font-semibold text-[11px] uppercase tabular-nums leading-none',
                'tracking-(--product-card-eyebrow-tracking)',
                'rounded-(--block-border-radius-tiny)',
                STYLE_CLASSES[style],
                POSITION_CLASSES[position],
                className,
            )}
        >
            −{discountPercent}%
        </span>
    );
};

ProductCardSaleBadge.displayName = 'Nordcom.ProductCard.SaleBadge';
export default ProductCardSaleBadge;
