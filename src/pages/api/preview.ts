import { redirectToPreviewURL, setPreviewData } from '@prismicio/next';
import type { NextApiRequest, NextApiResponse } from 'next';

import { createClient } from '@/prismic';
import { withPageRouterHighlight } from '@/utils/page-router-highlight.config';

const preview = async (req: NextApiRequest, res: NextApiResponse) => {
    const client = createClient({ req });

    await setPreviewData({ req, res });

    await redirectToPreviewURL({ req, res, client });
};

export const config = {
    runtime: 'edge'
};

export default withPageRouterHighlight(preview);
