import type { NextApiRequest, NextApiResponse } from 'next';
import { redirectToPreviewURL, setPreviewData } from '@prismicio/next';

import { createClient } from '@/prismic';

export default async (req: NextApiRequest, res: NextApiResponse) => {
    const client = createClient({ req });

    await setPreviewData({ req, res });

    await redirectToPreviewURL({ req, res, client });
};

export const config = {
    runtime: 'edge'
};
