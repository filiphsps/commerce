import { exitPreview } from '@prismicio/next';

export default async function handler(req, res) {
    return await exitPreview({ req, res });
}
