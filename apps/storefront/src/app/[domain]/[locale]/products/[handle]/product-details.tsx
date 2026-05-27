import 'server-only';

import type { ParsedMetafields } from '@shopify/hydrogen-react';
import { parseMetafield } from '@shopify/hydrogen-react';
import { Suspense } from 'react';
import { isProductConfectionary, type Product } from '@/api/product';
import { Card } from '@/components/layout/card';
import { AttributeIcon } from '@/components/products/attribute-icon';
import { Label } from '@/components/typography/label';
import { getDictionary } from '@/utils/dictionary';
import type { Locale } from '@/utils/locale';
import { getTranslations } from '@/utils/locale';
import { cn } from '@/utils/tailwind';

const COMMON_STYLES = 'md:gap-2 flex grow flex-col items-stretch justify-start gap-1 empty:hidden';
const LABEL_STYLES = 'leading-none text-base';
const CONTENT_STYLES =
    'flex items-center justify-center rounded-lg bg-gray-100 p-1 px-2 text-sm font-semibold leading-tight hyphens-auto h-min gap-1';

/** Props for the `ProductIngredients` server component. */
export type ProductIngredientsProps = {
    locale: Locale;
    data: Product;
    className?: string;
};
/**
 * Server component rendering the product ingredients card when the product
 * has an `ingredients` Shopify metafield. Returns `null` when the metafield is
 * absent or cannot be parsed.
 *
 * @param locale - The active locale, used to fetch the i18n dictionary.
 * @param data - The product data containing the `ingredients` metafield.
 * @param className - Optional extra class names applied to the card element.
 * @returns The ingredients card, or `null` when no ingredients data is available.
 */
export async function ProductIngredients({ locale, data: product, className = '' }: ProductIngredientsProps) {
    const i18n = await getDictionary(locale);
    const { t } = getTranslations('product', i18n);

    const { ingredients } = product;
    if (!ingredients) {
        return null;
    }

    const parsedIngredients = parseMetafield<ParsedMetafields['single_line_text_field']>(ingredients).parsedValue;
    if (!parsedIngredients) {
        return null;
    }

    return (
        <Card className={cn(COMMON_STYLES, 'flex-wrap md:max-w-[32rem]', className)} border={true}>
            <Label className={cn(LABEL_STYLES)}>{t('ingredients')}</Label>
            <p className={cn('whitespace-pre-wrap font-medium text-sm leading-snug')}>{parsedIngredients}</p>
        </Card>
    );
}

/** Props for the `ProductOriginalName` server component. */
export type ProductOriginalNameProps = {
    locale: Locale;
    data: Product;
};
/**
 * Server component rendering the product's original/trade name from the
 * `originalName` Shopify metafield in italics. Returns `null` when the
 * metafield is absent or cannot be parsed.
 *
 * @param data - The product data containing the `originalName` metafield.
 * @returns The original name paragraph element, or `null` when unavailable.
 */
export async function ProductOriginalName({ data: product }: ProductOriginalNameProps) {
    //const i18n = await getDictionary(locale);
    //const { t } = getTranslations('product', i18n);

    const { originalName } = product;
    if (!originalName) {
        return null;
    }

    const parsedName = parseMetafield<ParsedMetafields['single_line_text_field']>(originalName).parsedValue;
    if (!parsedName) {
        return null;
    }

    return <p className="font-medium text-base italic">&ldquo;{parsedName}&rdquo;</p>;
}

/** Props for the `ProductDetails` server component. */
export type ProductDetailsProps = {
    locale: Locale;
    data: Product;
};
/**
 * Server component rendering confectionary-specific product details: flavor
 * attributes and per-variant SKU/barcode cards, plus the ingredients section
 * via `ProductIngredients`. Returns `null` for non-confectionary products.
 *
 * @param locale - The active locale, forwarded to `ProductIngredients` for dictionary lookup.
 * @param data - The product data; must satisfy `isProductConfectionary` to render.
 * @returns The details section, or `null` for non-confectionary products.
 */
export async function ProductDetails({ locale, data: product }: ProductDetailsProps) {
    const i18n = await getDictionary(locale);
    const { t } = getTranslations('product', i18n);

    if (!isProductConfectionary(product)) {
        return null;
    }

    const {
        flavors,
        // allergen,
        variants: { edges: variants },
    } = product;

    //const parsedNutritionalContent = nutritionalContent ? parseMetafield(nutritionalContent) : null;
    const parsedFlavors = flavors
        ? parseMetafield<ParsedMetafields['list.single_line_text_field']>(flavors).parsedValue
        : null;

    const variantDetails = variants.find(({ node: { sku, title } }) => !!sku && title !== 'Default Title') // TODO: Deal with the `Default Title` variant in a better way.
        ? variants.map(({ node: { sku, barcode, title, id } }) => (
              <Card key={id} className={cn(COMMON_STYLES, 'flex w-min flex-col gap-2')} border={true}>
                  <Label className={cn(LABEL_STYLES, '')}>{title}</Label>

                  <div className="flex flex-col flex-wrap items-start gap-1">
                      <div className="flex gap-1 font-medium text-sm leading-none *:text-sm *:leading-none">
                          <Label className="font-bold">{t('sku')}:</Label>
                          <p>{sku}</p>
                      </div>

                      <div className="flex gap-1 font-medium text-sm leading-none *:text-sm *:leading-none">
                          <Label className="font-bold">{t('barcode')}:</Label>
                          <p>{barcode}</p>
                      </div>
                  </div>
              </Card>
          ))
        : null;

    return (
        <>
            {parsedFlavors ? (
                <Card className={cn(COMMON_STYLES, '')} border={true}>
                    <Label className={cn(LABEL_STYLES)}>{t('attributes')}</Label>
                    <div className="flex h-full flex-wrap items-start gap-2">
                        {parsedFlavors.length > 0
                            ? parsedFlavors.map((flavor) => (
                                  <div key={flavor} className={cn(CONTENT_STYLES)}>
                                      {/* TODO: Evolve `AttributeIcon` to `AttributeBadge`. */}
                                      <AttributeIcon data={flavor} className="h-4 stroke-current" />

                                      {flavor}
                                  </div>
                              ))
                            : null}
                    </div>
                </Card>
            ) : null}

            {variantDetails}

            <Suspense fallback={<div className="h-12 w-full" data-skeleton />}>
                <ProductIngredients locale={locale} data={product} />
            </Suspense>
        </>
    );
}
ProductDetails.displayName = 'Nordcom.Product.ProductDetails';
