import type { NextApiRequest, NextApiResponse } from 'next';

import { withPageRouterHighlight } from '@/utils/page-router-highlight.config';
import { exitPreview } from '@prismicio/next';

const exit = async (req: NextApiRequest, res: NextApiResponse) => {
    return await exitPreview({ req, res });
};

export const config = {
    runtime: 'edge'
};

export default withPageRouterHighlight(exit);
