import type { NextApiRequest, NextApiResponse } from 'next';

import { exitPreview } from '@prismicio/next';

const exitPreviewHandler = async (req: NextApiRequest, res: NextApiResponse) => {
    return exitPreview({ req, res });
};

export default exitPreviewHandler;

export const config = {
    runtime: 'edge'
};
