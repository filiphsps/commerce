import { redirectToPreviewURL, setPreviewData } from '@prismicio/next';

import { createClient } from '@/prismic';

export default async function handler(req, res) {
    const client = createClient({ req });

    await setPreviewData({ req, res });

    await redirectToPreviewURL({ req, res, client });
}
