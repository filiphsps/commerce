import { Config } from '../util/Config';
import { ReviewsModel } from '../models/ReviewsModel';

export const ReviewsProductApi = async (id: string): Promise<ReviewsModel> => {
    try {
        const data = await (
            await fetch(
                `https://productreviews.shopifycdn.com/proxy/v4/reviews/product?shop=${Config.shopify.domain}&product_id=${id}`
            )
        ).json() as any;

        if (!data.aggregate_rating) {
            return {
                id: null,
                product_id: id.split('/').at(-1),
                rating: 0,
                count: 0,
                reviews: []
            };
        }

        const { ratingValue: rating, reviewCount: count } = JSON.parse(
            data.aggregate_rating
                .replace('<script type="application/ld+json">', '')
                .replace('</script>', '')
                .replaceAll('\n', '')
        );

        // FIXME: return reviews too
        return {
            id: data.remote_id,
            product_id: id,
            rating: parseFloat(rating) ?? 0,
            count: parseFloat(count) ?? 0,
            reviews: []
        };
    } catch (err) {
        console.error(err);
        return {
            id: null,
            product_id: id,
            rating: 0,
            count: 0,
            reviews: []
        };
    }
};
