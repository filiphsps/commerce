import { redirectToPreviewURL } from '@prismicio/next';
import { NextRequest } from 'next/server';

import { createClient } from '@/prismic';

export async function GET(request: NextRequest) {
    const client = createClient();

    await redirectToPreviewURL({ client, request });
}
