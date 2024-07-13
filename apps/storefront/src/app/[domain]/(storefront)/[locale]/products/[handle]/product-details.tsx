import 'server-only';

import styles from './product-details.module.scss';

import { getDictionary } from '@/utils/dictionary';
import { useTranslation } from '@/utils/locale';
import { cn } from '@/utils/tailwind';
import { parseMetafield } from '@shopify/hydrogen-react';

import { Alert } from '@/components/informational/alert';
import { Label } from '@/components/typography/label';

import type { Product } from '@/api/product';
import type { Locale } from '@/utils/locale';
import type { ParsedMetafields } from '@shopify/hydrogen-react';

export type ProductDetailsProps = {
    locale: Locale;
    data: Product;
};
const ProductDetails = async ({
    locale,
    data: {
        ingredients,
        flavors,
        variants: { edges: variants }
    }
}: ProductDetailsProps) => {
    //const parsedNutritionalContent = nutritionalContent ? parseMetafield(nutritionalContent) : null;

    const parsedIngredients = ingredients
        ? parseMetafield<ParsedMetafields['single_line_text_field']>(ingredients).parsedValue
        : null;
    const parsedFlavors = flavors
        ? parseMetafield<ParsedMetafields['list.single_line_text_field']>(flavors).parsedValue
        : null;

    const i18n = await getDictionary(locale);
    const { t } = useTranslation('product', i18n);

    return (
        <>
            {parsedFlavors ? (
                <div
                    className={cn(
                        styles.block,
                        'xl:flex xl:flex-col-reverse xl:items-center xl:justify-between xl:gap-4 xl:rounded-lg xl:bg-white xl:p-4'
                    )}
                >
                    <Label className="xl:text-base xl:font-normal xl:normal-case xl:text-gray-600">
                        Flavor Profile(s)
                    </Label>
                    <p className="flex-col leading-tight xl:flex xl:h-full xl:justify-center xl:font-medium">
                        {parsedFlavors.join(', ')}.
                    </p>
                </div>
            ) : null}

            {variants.find(({ node: { sku, title } }) => !!sku && title !== 'Default Title') ? ( // TODO: Deal with the `Default Title` variant in a better way.
                <div
                    className={cn(
                        styles.block,
                        'xl:flex xl:flex-col-reverse xl:items-center xl:justify-between xl:gap-4 xl:rounded-lg xl:bg-white xl:p-4'
                    )}
                >
                    <Label className="normal-case xl:text-base xl:font-normal xl:text-gray-600">{t('skus')}</Label>
                    <div className="flex-col leading-tight xl:flex xl:h-full xl:justify-center xl:font-medium">
                        {variants.map(({ node: { sku, title } }) => (
                            <p key={sku} className="xl:text-inherit">
                                {title}: {sku}
                            </p>
                        ))}
                    </div>
                </div>
            ) : null}

            {parsedIngredients ? (
                <div
                    className={cn(
                        styles.block,
                        'col-span-2 xl:flex xl:flex-col-reverse xl:items-center xl:justify-between xl:gap-4 xl:rounded-lg xl:bg-white xl:p-4'
                    )}
                >
                    <Label className="xl:text-base xl:font-normal xl:normal-case xl:text-gray-600">Ingredients</Label>
                    <p className="flex-col leading-tight xl:flex xl:h-full xl:justify-center xl:font-medium">
                        {parsedIngredients}
                    </p>
                </div>
            ) : null}
        </>
    );
};

const ImportantProductDetails = async ({ data: { allergyInformation } }: ProductDetailsProps) => {
    const parsedAllergyInformation = allergyInformation
        ? parseMetafield<ParsedMetafields['multi_line_text_field']>(allergyInformation).parsedValue
        : null;
    return <>{parsedAllergyInformation ? <Alert severity={'warning'}>{parsedAllergyInformation}</Alert> : null}</>;
};

ImportantProductDetails.displayName = 'Nordcom.Product.ProductDetails';
ProductDetails.displayName = 'Nordcom.Product.ProductDetails';
export { ImportantProductDetails, ProductDetails };
