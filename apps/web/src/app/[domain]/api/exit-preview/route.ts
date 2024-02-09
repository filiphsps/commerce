import { exitPreview } from '@prismicio/next';

export const runtime = 'nodejs';

export async function GET() {
    return await exitPreview();
}
