import { UnknownShopDomainError, UnknownShopIdError } from '@nordcom/commerce-errors';

import { docToOnlineShop } from '../lib/doc-to-shape';
import type { OnlineShop, ShopBase } from '../models';
import { ShopModel } from '../models';
import { getRegisteredPayload } from '../payload-registry';
import { Service } from './service';

export type FindOptions = {
    /** Whether to convert the result to a normal object or keep it as a mongoose document. */
    convert?: boolean;
    sensitiveData?: boolean;
    /**
     * Payload population depth to apply. When any paths are provided depth 2
     * is used; otherwise depth 0 (no population) is used.
     */
    populate?: string[];
};

export class ShopService extends Service<ShopBase, typeof ShopModel> {
    public constructor() {
        super(ShopModel);
    }

    // Override the Mongoose-based base method with a Payload-backed implementation.
    // The base returns `Promise<ShopBase | null>`; here we narrow to `Promise<OnlineShop>`
    // (always resolves or throws). Cast through `never` to satisfy the overload checker.
    public override findById(id: string, ..._rest: never[]): Promise<OnlineShop> & Promise<ShopBase | null> {
        return (async () => {
            const payload = await getRegisteredPayload();
            const doc = await payload.findByID({
                collection: 'shops' as never,
                id,
                overrideAccess: true,
            });
            if (!doc) throw new UnknownShopIdError(id);
            return docToOnlineShop(doc as unknown as Record<string, unknown>);
        })() as Promise<OnlineShop> & Promise<ShopBase | null>;
    }

    public async findByCollaborator({ collaboratorId }: { collaboratorId: string }): Promise<OnlineShop[]> {
        const payload = await getRegisteredPayload();
        const { docs } = await payload.find({
            collection: 'shops' as never,
            where: {
                'collaborators.user': { equals: collaboratorId },
            } as never,
            limit: 0,
            overrideAccess: true,
        });
        return docs.map((doc) => docToOnlineShop(doc as unknown as Record<string, unknown>)).filter((d) => d);
    }

    public async findByDomain(domain: string, options?: FindOptions): Promise<OnlineShop | ShopBase>;
    public async findByDomain(
        domain: string,
        { sensitiveData = false, convert = true, populate = [] }: FindOptions = {},
    ): Promise<OnlineShop | ShopBase> {
        const payload = await getRegisteredPayload();
        // `sensitiveShopRead` opts out of the shops collection's beforeRead
        // strip hook so trusted server callers receive the unmasked token.
        // Only set this when the caller has asked for sensitiveData, since the
        // strip happens before docToOnlineShop can mask the token client-side.
        const { docs } = await payload.find({
            collection: 'shops' as never,
            where: {
                or: [{ domain: { equals: domain } }, { alternativeDomains: { contains: domain } }],
            } as never,
            limit: 1,
            depth: populate.length > 0 ? 2 : 0,
            overrideAccess: true,
            ...(sensitiveData ? { context: { sensitiveShopRead: true } } : {}),
        });

        const doc = docs[0];
        if (!doc) throw new UnknownShopDomainError(domain);

        if (!convert) return doc as unknown as ShopBase;
        if (sensitiveData) return doc as unknown as OnlineShop;
        return docToOnlineShop(doc as unknown as Record<string, unknown>);
    }

    public async findAll(): Promise<OnlineShop[]> {
        try {
            const payload = await getRegisteredPayload();
            const { docs } = await payload.find({
                collection: 'shops' as never,
                limit: 0,
                overrideAccess: true,
            });
            // Make sure we filter out empty/invalid domains.
            return docs.map((doc) => docToOnlineShop(doc as unknown as Record<string, unknown>)).filter((d) => d);
        } catch (error: unknown) {
            console.warn(error);
            return [];
        }
    }
}

export const Shop = new ShopService();
