import 'server-only';

import type { OnlineShop } from '@nordcom/commerce-db';
import { MissingEnvironmentVariableError, UnknownShopDomainError } from '@nordcom/commerce-errors';

export type HexColor = `#${string}`;
export type Color = HexColor;

export type Image = {
    src: string;
    width: number;
    height: number;
    alt: string;
    copyright?: string;
};

export const findShopByDomainOverHttp = async (domain: string): Promise<OnlineShop> => {
    if (!process.env.MONGODB_DATA_API_TOKEN) {
        throw new MissingEnvironmentVariableError('MONGODB_DATA_API_TOKEN');
    }

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
        cache: 'no-cache',
        next: {
            revalidate: 28_800, // 8hrs.
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
                }),
                cache: 'no-cache',
                next: {
                    revalidate: 86_400, // 24hrs.
                    tags: ['domains']
                }
            })
        ).json()
    ).document as OnlineShop;
};
