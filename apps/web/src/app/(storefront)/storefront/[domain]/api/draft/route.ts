import { createClient } from '@/prismic';
import { redirectToPreviewURL } from '@prismicio/next';
import { draftMode } from 'next/headers';
import type { NextRequest } from 'next/server';

export type DraftApiRouteParams = {
    domain: string;
};
export async function GET(req: NextRequest, { params: { domain } }: { params: DraftApiRouteParams }) {
    const client = createClient({ domain });

    draftMode().enable();

    await redirectToPreviewURL({ client, request: req });
}
