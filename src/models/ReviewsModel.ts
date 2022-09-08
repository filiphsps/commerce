export interface ReviewsModel {
    id: string;
    product_id: string;
    rating: number;
    count: number;

    reviews?: Array<{
        id: string;
        rating: number;
        title: string;
        author: string;
        body: string;
    }>;
}
