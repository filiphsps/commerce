import type { OnlineShop } from '@nordcom/commerce-db';
import { UnknownShopDomainError } from '@nordcom/commerce-errors';

export type Image = {
    src: string;
    width: number;
    height: number;
    alt: string;
    copyright?: string;
};

export const findShopByDomainOverHttp = async (domain: string): Promise<OnlineShop> => {
    const data = await fetch(`${process.env.MONGODB_DATA_API_URI}/action/findOne`, {
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Request-Headers': '*',
            'api-key': process.env.MONGODB_DATA_API_TOKEN!
        },
        method: 'POST',
        body: JSON.stringify({
            collection: 'shops',
            database: 'test',
            dataSource: 'Commerce',
            filter: {
                $or: [
                    { domain },
                    {
                        alternativeDomains: domain
                    }
                ]
            }
        }),
        next: {
            revalidate: 60 * 60 * 24, // 24 hours.
            tags: [domain]
        }
    });

    if (data.status !== 200) {
        if (data.status >= 400 && data.status < 500) {
            throw new UnknownShopDomainError();
        }

        throw new UnknownShopDomainError(data.statusText, data.status);
    }

    const { document } = await data.json();
    if (!document) {
        throw new UnknownShopDomainError();
    }

    let shop = { ...document, id: document._id };
    delete shop._id;

    return shop as OnlineShop;
};

export const findShopsByDomainOverHttp = async (): Promise<OnlineShop> => {
    return (
        await (
            await fetch(`${process.env.MONGODB_DATA_API_URI}/action/findOne`, {
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Request-Headers': '*',
                    'api-key': process.env.MONGODB_DATA_API_TOKEN!
                },
                method: 'POST',
                body: JSON.stringify({
                    collection: 'shops',
                    database: 'test',
                    dataSource: 'Commerce',
                    filter: {}
                })
            })
        ).json()
    ).document as OnlineShop;
};
