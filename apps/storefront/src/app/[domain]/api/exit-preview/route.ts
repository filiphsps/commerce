import { exitPreview } from '@prismicio/next';

export const runtime = 'experimental-edge';
export const dynamic = 'force-dynamic';

export async function GET() {
    return await exitPreview();
}
