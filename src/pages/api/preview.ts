import type { NextApiRequest, NextApiResponse } from 'next';
import { redirectToPreviewURL, setPreviewData } from '@prismicio/next';

import { createClient } from '@/prismic';

const previewHandler = async (req: NextApiRequest, res: NextApiResponse) => {
    const client = createClient({ req });

    setPreviewData({ req, res });

    await redirectToPreviewURL({ req, res, client });
};

export default previewHandler;

export const config = {
    runtime: 'edge'
};
