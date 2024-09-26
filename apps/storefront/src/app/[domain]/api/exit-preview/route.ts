import { exitPreview } from '@prismicio/next';
import { draftMode } from 'next/headers';

export async function GET() {
    (await draftMode()).disable();
    return await exitPreview();
}
