import { NextRequest } from 'next/server';
import { createClient } from '@/prismic';
import { draftMode } from 'next/headers';
import { redirectToPreviewURL } from '@prismicio/next';

export async function GET(request: NextRequest) {
    const client = createClient();

    draftMode().enable();

    await redirectToPreviewURL({ client, request });
}
