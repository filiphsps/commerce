import { ReviewsProductApi } from '../../../src/api/reviews';

export default async function handler(req, res) {
    const body = JSON.parse(req.body);
    const response = await ReviewsProductApi(body.id);

    return res.status(200).json(response);
}
