type PrismicDocument = { id: string; uid?: string; type: string };
type PrismicWebhookBody = { documents?: PrismicDocument[]; [key: string]: unknown };

export function parsePrismicWebhook({
    shop,
    body,
}: {
    shop: { id: string };
    body: PrismicWebhookBody;
}): string[] {
    if (!Array.isArray(body.documents)) {
        return [`prismic.${shop.id}`];
    }
    return body.documents.map((doc) => `prismic.${shop.id}.doc.${doc.type}.${doc.uid ?? doc.id}`);
}
