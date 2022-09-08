import { ReviewProductApi } from '../../../src/api/reviews';

export default async function handler(req, res) {
    const body = JSON.parse(req.body);
    const response = await ReviewProductApi(body);

    return res.status(response).json({
        success: response === 200
    });
}
