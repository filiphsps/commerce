import 'server-only';

import type { Product } from '@/api/product';
import { Alert } from '@/components/informational/alert';
import type { ParsedMetafields } from '@shopify/hydrogen-react';
import { parseMetafield } from '@shopify/hydrogen-react';

export type ProductDetailsProps = {
    data: Product;
};
const ProductDetails = async ({ data: { allergyInformation, ingredients, flavors } }: ProductDetailsProps) => {
    const parsedAllergyInformation = allergyInformation
        ? parseMetafield<ParsedMetafields['multi_line_text_field']>(allergyInformation).parsedValue
        : null;
    //const parsedNutritionalContent = nutritionalContent ? parseMetafield(nutritionalContent) : null;

    const parsedIngredients = ingredients
        ? parseMetafield<ParsedMetafields['single_line_text_field']>(ingredients).parsedValue
        : null;
    const parsedFlavors = flavors
        ? parseMetafield<ParsedMetafields['list.single_line_text_field']>(flavors).parsedValue
        : null;

    console.debug(parsedAllergyInformation, parsedIngredients, parsedFlavors);

    return <></>;
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
