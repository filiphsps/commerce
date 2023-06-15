import { exitPreview } from "@prismicio/next";

export async function handler(req, res) {
    return await exitPreview({ req, res });
}
