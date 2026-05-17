import type { Payload } from 'payload';
import { docToOnlineShop } from '../lib/doc-to-shape';
import type { OnlineShop, ShopBase } from '../models';
import { ShopModel } from '../models';
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
    // Payload instance is injected at boot via setPayload(); _setPayloadForTests is the test override.
    private payload: Payload | null = null;

    public constructor() {
        super(ShopModel);
    }

    public setPayload(payload: Payload): void {
        this.payload = payload;
    }

    /** @internal — test-only injection point */
    public _setPayloadForTests(payload: Payload): void {
        this.payload = payload;
    }

    private getPayload(): Payload {
        if (!this.payload)
            throw new Error('[ShopService] Payload not initialized; call setPayload(payload) at app boot.');
        return this.payload;
    }

    // Override the Mongoose-based base method with a Payload-backed implementation.
    // The base returns `Promise<ShopBase | null>`; here we narrow to `Promise<OnlineShop>`
    // (always resolves or throws). Cast through `never` to satisfy the overload checker.
    public override findById(id: string, ..._rest: never[]): Promise<OnlineShop> & Promise<ShopBase | null> {
        const payload = this.getPayload();
        return payload
            .findByID({
                collection: 'shops' as never,
                id,
                overrideAccess: true,
            })
            .then((doc) => {
                if (!doc) throw new Error(`[shop] No shop for id: ${id}`);
                return docToOnlineShop(doc as unknown as Record<string, unknown>);
            }) as Promise<OnlineShop> & Promise<ShopBase | null>;
    }

    public async findByCollaborator({ collaboratorId }: { collaboratorId: string }): Promise<OnlineShop[]> {
        const payload = this.getPayload();
        const { docs } = await payload.find({
            collection: 'shops' as never,
            where: {
                'collaborators.user': { equals: collaboratorId },
            } as never,
            limit: 0,
            overrideAccess: true,
        });
        return docs.map((doc) => docToOnlineShop(doc as unknown as Record<string, unknown>));
    }

    public async findByDomain(domain: string, options?: FindOptions): Promise<OnlineShop | ShopBase>;
    public async findByDomain(
        domain: string,
        { sensitiveData = false, convert = true, populate = [] }: FindOptions = {},
    ): Promise<OnlineShop | ShopBase> {
        const payload = this.getPayload();
        const { docs } = await payload.find({
            collection: 'shops' as never,
            where: {
                or: [{ domain: { equals: domain } }, { alternativeDomains: { contains: domain } }],
            } as never,
            limit: 1,
            depth: populate.length > 0 ? 2 : 0,
            overrideAccess: true,
        });

        const doc = docs[0];
        if (!doc) throw new Error(`[shop] No shop for domain: ${domain}`);

        if (!convert) return doc as unknown as ShopBase;
        if (sensitiveData) return doc as unknown as OnlineShop;
        return docToOnlineShop(doc as unknown as Record<string, unknown>);
    }

    public async findAll(): Promise<OnlineShop[]> {
        try {
            const payload = this.getPayload();
            const { docs } = await payload.find({
                collection: 'shops' as never,
                limit: 0,
                overrideAccess: true,
            });
            // Make sure we filter out empty/invalid domains.
            return docs.filter(d => d).map((doc) => docToOnlineShop(doc as unknown as Record<string, unknown>));
        } catch (error: unknown) {
            console.warn(error);
            return [];
        }
    }
}

export const Shop = new ShopService();
