import type { NextApiRequest, NextApiResponse } from 'next';

import { createClient } from '@/prismic';
import { DefaultLocale } from '@/utils/locale';
import { asLink } from '@prismicio/client';

/***
 * This is a webhook handler for Prismic that will revalidate
 * any documents that have been updated in Prismic.
 *
 * > This is a modified version of the example provided by Prismic.
 *
 * @param {NextApiRequest} req - The request object.
 * @param {NextApiResponse} res - The response object.
 * @returns {Promise<void>} Nothing.
 */
const revalidateHandler = async (req: NextApiRequest, res: NextApiResponse) => {
    if (req.method !== 'POST') return res.status(400).json({ message: 'Invalid method' });

    // If the request's body is unknown, tell the requester
    if (!req.body || (req.body.type !== 'api-update' && req.body.documents.length <= 0))
        return res.status(400).json({ message: 'Invalid body' });

    // Check for secret to confirm this is a valid request
    // TODO: get secret from config.
    if (req.body.secret !== process.env.WEBHOOK_REVALIDATE) {
        return res.status(401).json({ message: 'Invalid token' });
    }

    // If you have a `createClient()` function defined elsewhere in
    // your app, use that instead
    const client = createClient({
        locale: DefaultLocale() // TODO: get locale from request.
    });

    // Get a list of URLs for any new, updated, or deleted documents
    const documents = await client.getAllByIDs(req.body.documents);
    const urls = documents.map((doc) => asLink(doc));

    try {
        // Revalidate the URLs for those documents
        await Promise.all(urls.map(async (url) => url && (await res.revalidate(url))));

        return res.json({ revalidated: true });
    } catch (err) {
        // If there was an error, Next.js will continue to show
        // the last successfully generated page
        return res.status(500).send('Error revalidating');
    }
};

export default revalidateHandler;
