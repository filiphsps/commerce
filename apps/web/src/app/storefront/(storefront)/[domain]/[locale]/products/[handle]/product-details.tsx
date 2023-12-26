import 'server-only';

import type { Product } from '@/api/product';
import { Alert } from '@/components/informational/alert';
import { Label } from '@/components/typography/label';
import type { ParsedMetafields } from '@shopify/hydrogen-react';
import { parseMetafield } from '@shopify/hydrogen-react';
import styles from './product-details.module.scss';

export type ProductDetailsProps = {
    data: Product;
};
const ProductDetails = async ({
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

    return (
        <>
            {parsedIngredients ? (
                <div className={styles.block}>
                    <Label className={styles.label}>Ingredients</Label>
                    <p>{parsedIngredients}</p>
                </div>
            ) : null}

            {parsedFlavors ? (
                <div className={styles.block}>
                    <Label className={styles.label}>Flavor Profile(s)</Label>
                    <p>{parsedFlavors.join(', ')}.</p>
                </div>
            ) : null}

            <div className={styles.block}>
                <Label className={styles.label}>SKU(s)</Label>
                <p>{variants.map(({ node: { sku, title } }) => `${title}: ${sku}`).join(', ')}.</p>
            </div>
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
