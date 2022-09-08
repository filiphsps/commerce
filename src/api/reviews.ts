import { Config } from '../util/Config';
import { ReviewsModel } from '../models/ReviewsModel';
import { parse } from 'node-html-parser';

export const ReviewsProductApi = async (id: string): Promise<ReviewsModel> => {
    try {
        const data = (await (
            await fetch(
                `https://productreviews.shopifycdn.com/proxy/v4/reviews/product?shop=${Config.shopify.domain}&product_id=${id}`
            )
        ).json()) as any;

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

        const reviews = parse(data.reviews)
            .removeWhitespace()
            .childNodes.filter((child) =>
                (child as any).id.includes('spr-review')
            )
            .map((item) => ({
                id: (item as any).id,
                rating: parseInt(
                    (item.childNodes[0].childNodes[0] as any).rawAttrs
                        .split('aria-label="')[1]
                        .split(' ')[0]
                ),
                title: item.childNodes[0].childNodes[1].innerText.replaceAll(
                    '&#39;',
                    "'"
                ),
                author: item.childNodes[0].childNodes[2].innerText
                    .split(' on')[0]
                    .replaceAll('&#39;', "'"),
                body: item.childNodes[1].innerText.replaceAll('&#39;', "'")
            }));

        return {
            id: data.remote_id,
            product_id: id,
            rating: parseFloat(rating) ?? 0,
            count: parseFloat(count) ?? 0,
            reviews
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

export const ReviewProductApi = async ({
    id,
    rating,
    author,
    title,
    body
}: {
    id: string;
    rating: number;
    author: string;
    title: string;
    body: string;
}): Promise<{}> => {
    const data = new FormData();
    data.append('product_id', id);
    data.append('review[rating]', `${rating}`);
    data.append('review[author]', author);
    data.append('review[title]', title);
    data.append('review[body]', body);
    data.append('shop', Config.shopify.domain);

    const res = await fetch(
        `https://productreviews.shopifycdn.com/proxy/v4/reviews/create`,
        {
            method: 'post',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: new URLSearchParams(data as any)
        }
    );

    return res.status;
};
