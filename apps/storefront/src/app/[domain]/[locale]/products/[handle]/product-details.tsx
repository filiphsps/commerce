import 'server-only';

import { isProductConfectionary, type Product } from '@/api/product';
import { getDictionary } from '@/utils/dictionary';
import { useTranslation } from '@/utils/locale';
import { cn } from '@/utils/tailwind';
import { parseMetafield } from '@shopify/hydrogen-react';

import { Alert } from '@/components/informational/alert';
import { AttributeIcon } from '@/components/products/attribute-icon';
import { Label } from '@/components/typography/label';

import type { Locale } from '@/utils/locale';
import type { ParsedMetafields } from '@shopify/hydrogen-react';

const COMMON_STYLES = 'md:gap3 flex grow flex-col items-start justify-between gap-2 rounded-lg bg-white p-4';
const LABEL_STYLES = 'leading-none';
const CONTENT_STYLES =
    'flex items-start justify-center rounded-lg bg-gray-100 p-1 px-2 text-base font-semibold leading-tight hyphens-auto h-min gap-1';

export type ProductDetailsProps = {
    locale: Locale;
    data: Product;
};
const ProductDetails = async ({ locale, data: product }: ProductDetailsProps) => {
    const i18n = await getDictionary(locale);
    const { t } = useTranslation('product', i18n);

    if (!isProductConfectionary(product)) {
        return null;
    }

    const {
        ingredients,
        flavors,
        variants: { edges: variants }
    } = product;

    //const parsedNutritionalContent = nutritionalContent ? parseMetafield(nutritionalContent) : null;
    const parsedIngredients = !!(ingredients as any)
        ? parseMetafield<ParsedMetafields['single_line_text_field']>(ingredients).parsedValue
        : null;
    const parsedFlavors = !!(flavors as any)
        ? parseMetafield<ParsedMetafields['list.single_line_text_field']>(flavors).parsedValue
        : null;

    return (
        <>
            {parsedFlavors ? (
                <div className={cn(COMMON_STYLES, '')}>
                    <Label className={cn(LABEL_STYLES)}>{t('attributes')}</Label>
                    <div className="flex h-full flex-wrap items-start gap-2">
                        {parsedFlavors.length > 0
                            ? parsedFlavors.map((flavor) => (
                                  <div key={flavor} className={cn(CONTENT_STYLES)}>
                                      {/* TODO: Evolve `AttributeIcon` to `AttributeBadge`. */}
                                      <AttributeIcon data={flavor} className="stroke-current" />

                                      {flavor}
                                  </div>
                              ))
                            : null}
                    </div>
                </div>
            ) : null}

            {variants.find(({ node: { sku, title } }) => !!sku && title !== 'Default Title') ? ( // TODO: Deal with the `Default Title` variant in a better way.
                <div className={cn(COMMON_STYLES, 'md:max-w-64')}>
                    <Label className={cn(LABEL_STYLES, 'normal-case')}>{t('skus')}</Label>
                    <div className="flex h-full flex-wrap items-start gap-2">
                        {variants.map(({ node: { sku, title, id } }) => (
                            <div key={id} className={cn(CONTENT_STYLES, 'block')} title={`${sku} — ${title}`}>
                                {sku}
                            </div>
                        ))}
                    </div>
                </div>
            ) : null}

            {parsedIngredients ? (
                <div className={cn(COMMON_STYLES, 'break-words')}>
                    <Label className={cn(LABEL_STYLES)}>{t('ingredients')}</Label>
                    <p className={cn('text-sm leading-snug')}>{parsedIngredients}</p>
                </div>
            ) : null}
        </>
    );
};

const ImportantProductDetails = async ({ data: { allergyInformation } }: ProductDetailsProps) => {
    const parsedAllergyInformation = !!(allergyInformation as any)
        ? parseMetafield<ParsedMetafields['multi_line_text_field']>(allergyInformation).parsedValue
        : null;
    return <>{parsedAllergyInformation ? <Alert severity={'warning'}>{parsedAllergyInformation}</Alert> : null}</>;
};

ImportantProductDetails.displayName = 'Nordcom.Product.ProductDetails';
ProductDetails.displayName = 'Nordcom.Product.ProductDetails';
export { ImportantProductDetails, ProductDetails };
