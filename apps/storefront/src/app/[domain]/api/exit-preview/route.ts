import { exitPreview } from '@prismicio/next';
import { draftMode } from 'next/headers';

export async function GET() {
    draftMode().disable();
    return await exitPreview();
}
