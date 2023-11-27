import type { Product } from '@/api/product';
import type { AbstractApi } from '@/utils/abstract-api';
import { UnknownApiError } from '@/utils/errors';
import { gql } from '@apollo/client';
import type { MetaobjectConnection } from '@shopify/hydrogen-react/storefront-api-types';

export type Review = {
    rating: number;
    title: string;
    body: string;
    author: string;
    createdAt: Date;
};
export type ProductReview = Review & {};

export const ProductReviewsApi = async ({
    api,
    product
}: {
    api: AbstractApi;
    product: Product;
}): Promise<{
    averageRating: number | undefined;
    reviews: ProductReview[];
}> => {
    const shop = api.shop();

    const { data, errors } = await api.query<{
        reviews: MetaobjectConnection;
    }>(
        gql`
            query reviews {
                reviews: metaobjects(type: "review", first: 250) {
                    edges {
                        node {
                            fields {
                                key
                                type
                                value
                            }
                        }
                    }
                }
            }
        `,
        {},
        {
            tags: ['shopify.reviews', `shopify.${shop.id}.reviews`]
        }
    );

    if (!data?.reviews) {
        if (errors) throw errors;
        throw new UnknownApiError();
    }

    const shopifyReviews = data.reviews.edges
        .filter((edge) => edge.node.fields.find((field) => field.key === 'product' && field.value === product.id))
        .map(({ node: { fields, ...node } }) => ({
            ...node,
            // eslint-disable-next-line unused-imports/no-unused-vars
            fields: fields.map(({ __typename, ...field }) => field)
        }));

    const reviews = shopifyReviews.map(({ fields }) => {
        const rating = Number.parseFloat(JSON.parse(fields.find((field) => field.key === 'rating')?.value!).value);
        const title = fields.find((field) => field.key === 'title')?.value!;
        const body = fields.find((field) => field.key === 'body')?.value!;
        const author = fields.find((field) => field.key === 'author')?.value!;
        const createdAt = new Date(fields.find((field) => field.key === 'createdAt')?.value!);

        return {
            rating,
            title,
            body,
            author,
            createdAt
        };
    });

    const averageRating = reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length;

    return {
        averageRating,
        reviews
    };
};
