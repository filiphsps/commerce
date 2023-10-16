import type { NextApiRequest, NextApiResponse } from 'next';

import { exitPreview } from '@prismicio/next';

export default async (req: NextApiRequest, res: NextApiResponse) => {
    return await exitPreview({ req, res });
};
