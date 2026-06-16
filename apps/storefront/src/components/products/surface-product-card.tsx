import 'server-only';

import type { OnlineShop } from '@nordcom/commerce-db';
import { productCardSurfaceForShop } from '@/api/extensions';
import type { Product } from '@/api/product';
import type { ProductCardSurfaceOverride } from '@/components/product-card/presets';
import ProductCard from '@/components/product-card/product-card';
import type { Locale } from '@/utils/locale';

export type SurfaceProductCardProps = {
    shop: OnlineShop;
    /** Surface key the card renders on (`collection`, `search`, `recommendation`, …). */
    surface: string;
    locale: Locale;
    data: Product;
    priority?: boolean;
    className?: string;
    /** Per-instance override from the hosting block node; highest cascade tier. */
    cardOverride?: ProductCardSurfaceOverride;
};

/**
 * Generic surface-aware product card. Resolves the effective card configuration for a shop through
 * the full store-default cascade (per-instance `cardOverride` → `extensions.productCard[surface]` →
 * store-wide `base` → surface preset → built-in fallback), then renders {@link ProductCard}. A shop
 * with no extensions renders byte-identically to the surface preset.
 *
 * Every per-surface wrapper (collection, search, recommendation) delegates here so all surfaces share
 * one resolution path and become tenant-customizable in the same way — the wrappers only pin the
 * `surface` and keep their own display name for navigation.
 *
 * @param props.shop - Shop record; also the store-default source.
 * @param props.surface - Surface key selecting the preset and per-surface store selection.
 * @param props.locale - Locale forwarded to the product card.
 * @param props.data - Product to display.
 * @param props.priority - When `true`, loads the card image eagerly.
 * @param props.className - Additional CSS class names.
 * @param props.cardOverride - Per-instance override from the hosting block; highest precedence.
 * @returns The configured `ProductCard` element.
 */
const SurfaceProductCard = ({ surface, cardOverride, ...rest }: SurfaceProductCardProps) => (
    <ProductCard {...productCardSurfaceForShop(rest.shop, surface, cardOverride)} {...rest} />
);

SurfaceProductCard.displayName = 'Nordcom.Products.SurfaceProductCard';
export default SurfaceProductCard;
