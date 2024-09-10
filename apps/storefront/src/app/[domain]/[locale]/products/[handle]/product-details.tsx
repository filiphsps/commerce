import 'server-only';

import { Suspense } from 'react';

import { isProductConfectionary, type Product } from '@/api/product';
import { getDictionary } from '@/utils/dictionary';
import { useTranslation } from '@/utils/locale';
import { cn } from '@/utils/tailwind';
import { parseMetafield } from '@shopify/hydrogen-react';

import { Card } from '@/components/layout/card';
import { AttributeIcon } from '@/components/products/attribute-icon';
import { Label } from '@/components/typography/label';

import type { Locale } from '@/utils/locale';
import type { ParsedMetafields } from '@shopify/hydrogen-react';

const COMMON_STYLES = 'md:gap-2 flex grow flex-col items-stretch justify-start gap-1 empty:hidden';
const LABEL_STYLES = 'leading-none text-base';
const CONTENT_STYLES =
    'flex items-center justify-center rounded-lg bg-gray-100 p-1 px-2 text-sm font-semibold leading-tight hyphens-auto h-min gap-1';

export type ProductIngredientsProps = {
    locale: Locale;
    data: Product;
    className?: string;
};
export async function ProductIngredients({ locale, data: product, className = '' }: ProductIngredientsProps) {
    const i18n = await getDictionary(locale);
    const { t } = useTranslation('product', i18n);

    const { ingredients } = product;
    if (!ingredients) {
        return null;
    }

    const parsedIngredients = parseMetafield<ParsedMetafields['single_line_text_field']>(ingredients).parsedValue;
    if (!parsedIngredients) {
        return null;
    }

    return (
        <Card className={cn(COMMON_STYLES, className)} border={true}>
            <Label className={cn(LABEL_STYLES)}>{t('ingredients')}</Label>
            <p className={cn('text-sm font-medium leading-snug')}>{parsedIngredients}</p>
        </Card>
    );
}

export type ProductOriginalNameProps = {
    locale: Locale;
    data: Product;
};
export async function ProductOriginalName({ data: product }: ProductOriginalNameProps) {
    //const i18n = await getDictionary(locale);
    //const { t } = useTranslation('product', i18n);

    const { originalName } = product;
    if (!originalName) {
        return null;
    }

    const parsedName = parseMetafield<ParsedMetafields['single_line_text_field']>(originalName).parsedValue;
    if (!parsedName) {
        return null;
    }

    return <p className="text-base font-medium italic">&ldquo;{parsedName}&rdquo;</p>;
}

export type ProductDetailsProps = {
    locale: Locale;
    data: Product;
};
export async function ProductDetails({ locale, data: product }: ProductDetailsProps) {
    const i18n = await getDictionary(locale);
    const { t } = useTranslation('product', i18n);

    if (!isProductConfectionary(product)) {
        return null;
    }

    const {
        flavors,
        // allergen,
        variants: { edges: variants }
    } = product;

    //const parsedNutritionalContent = nutritionalContent ? parseMetafield(nutritionalContent) : null;
    const parsedFlavors = !!flavors
        ? parseMetafield<ParsedMetafields['list.single_line_text_field']>(flavors).parsedValue
        : null;

    const variantDetails = variants.find(({ node: { sku, title } }) => !!sku && title !== 'Default Title') // TODO: Deal with the `Default Title` variant in a better way.
        ? variants.map(({ node: { sku, barcode, title, id } }) => (
              <Card key={id} className={cn(COMMON_STYLES, 'flex flex-col gap-2')} border={true}>
                  <Label className={cn(LABEL_STYLES, '')}>{title}</Label>

                  <div className="flex flex-col flex-wrap items-start gap-1">
                      <div className="flex gap-1 text-sm font-medium leading-none *:text-sm *:leading-none">
                          <Label className="font-bold">{t('sku')}:</Label>
                          <p>{sku}</p>
                      </div>

                      <div className="flex gap-1 text-sm font-medium leading-none *:text-sm *:leading-none">
                          <Label className="font-bold">{t('barcode')}:</Label>
                          <p>{barcode}</p>
                      </div>
                  </div>
              </Card>
          ))
        : null;

    return (
        <>
            <Suspense fallback={<div className="h-12 w-full" data-skeleton />}>
                <ProductIngredients
                    locale={locale}
                    data={product}
                    className={cn((variantDetails || []).length === 1 && 'xl:max-w-96')}
                />
            </Suspense>

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
        </>
    );
}
ProductDetails.displayName = 'Nordcom.Product.ProductDetails';
