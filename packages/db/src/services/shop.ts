import { UnknownShopDomainError, UnknownShopIdError } from '@nordcom/commerce-errors';

import { docToOnlineShop, stripInternals } from '../lib/doc-to-shape';
import type { OnlineShop, ShopBase } from '../models';
import { ShopModel } from '../models';
import { Service } from './service';

export type FindOptions = {
    /** Whether to convert the result to a normal object or keep it as the raw Mongoose lean doc. */
    convert?: boolean;
    sensitiveData?: boolean;
    /** Mongoose population paths to apply (e.g. `featureFlags.flag`). */
    populate?: string[];
};

export class ShopService extends Service<ShopBase, typeof ShopModel> {
    public constructor() {
        super(ShopModel);
    }

    // Override the Mongoose-based base method with a typed implementation. The
    // base returns `Promise<ShopBase | null>`; here we narrow to
    // `Promise<OnlineShop>` (always resolves or throws). Cast through `never`
    // to satisfy the overload checker.
    public override findById(id: string, ..._rest: never[]): Promise<OnlineShop> & Promise<ShopBase | null> {
        return (async () => {
            const doc = await ShopModel.findById(id).lean<ShopBase>().exec();
            if (!doc) throw new UnknownShopIdError(id);
            return docToOnlineShop(doc as unknown as Record<string, unknown>);
        })() as Promise<OnlineShop> & Promise<ShopBase | null>;
    }

    public async findByCollaborator({ collaboratorId }: { collaboratorId: string }): Promise<OnlineShop[]> {
        const docs = await ShopModel.find({ 'collaborators.user': collaboratorId }).lean<ShopBase[]>().exec();
        return docs.map((d) => docToOnlineShop(d as unknown as Record<string, unknown>)).filter((d) => d);
    }

    public async findByDomain(domain: string, options?: FindOptions): Promise<OnlineShop | ShopBase>;
    public async findByDomain(
        domain: string,
        { sensitiveData = false, convert = true, populate = [] }: FindOptions = {},
    ): Promise<OnlineShop | ShopBase> {
        let query = ShopModel.findOne({
            $or: [{ domain }, { alternativeDomains: domain }],
        });
        for (const path of populate) query = query.populate(path);
        const doc = await query.lean<ShopBase>().exec();

        if (!doc) throw new UnknownShopDomainError(domain);

        if (!convert) return doc;
        if (sensitiveData) return stripInternals(doc) as unknown as OnlineShop;
        return docToOnlineShop(doc as unknown as Record<string, unknown>);
    }

    public async findAll(): Promise<OnlineShop[]> {
        try {
            const docs = await ShopModel.find({}).lean<ShopBase[]>().exec();
            return docs.map((d) => docToOnlineShop(d as unknown as Record<string, unknown>)).filter((d) => d);
        } catch (error: unknown) {
            console.warn(error);
            return [];
        }
    }
}

export const Shop = new ShopService();
