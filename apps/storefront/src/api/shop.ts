import 'server-only';

import type { OnlineShop } from '@nordcom/commerce-db';
import { GenericError, MissingEnvironmentVariableError, UnknownShopDomainError } from '@nordcom/commerce-errors';

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
        next: {
            revalidate: 28_800, // 8hrs.
            tags: [domain]
        }
    });
    if (!data || (data.status >= 400 && data.status < 500)) {
        throw new UnknownShopDomainError(data.statusText, data.status);
    } else if (data.status !== 200) {
        throw new GenericError(data.statusText);
    }

    let shop: (OnlineShop & { _id: string }) | null = null;
    try {
        shop = (await data.json())?.document;
    } catch {}
    if (!shop) {
        throw new UnknownShopDomainError();
    }

    const corrected = {
        ...shop,
        id: shop.id || shop._id,
        _id: undefined
    };
    delete corrected._id;

    return corrected as OnlineShop;
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
                next: {
                    revalidate: 86_400, // 24hrs.
                    tags: ['domains']
                }
            })
        ).json()
    ).document as OnlineShop;
};
