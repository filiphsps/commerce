export interface ReviewsModel {
    id: string;
    product_id: string;
    rating: number;
    count: number;

    reviews?: Array<any>;
}
