import type { Payload } from 'payload';
import { docToOnlineShop } from '../lib/doc-to-shape';
import type { OnlineShop, ShopBase } from '../models';
import { ShopModel } from '../models';
import { User } from '.';
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

    public async findByCollaborator({
        collaboratorId,
        ...args
    }: { collaboratorId: string } & Parameters<typeof this.find>[0]) {
        // KEEP existing Mongoose body — Task 12 swaps this.
        const collaborator = await User.find({ id: collaboratorId });

        return await this.find({
            ...args,
            filter: {
                ...args.filter,
                collaborators: {
                    $elemMatch: {
                        user: collaborator,
                    },
                },
            },
        });
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

    public async findAll({ ...args }: Parameters<typeof this.find>[0] | undefined = {}) {
        // KEEP existing Mongoose body — Task 12 swaps this.
        return await this.find({
            ...args,
            filter: {},
            projection: {
                collaborators: 0,
                contentProvider: 0,
                commerceProvider: 0,
                thirdParty: 0,
            },
        });
    }
}

export const Shop = new ShopService();
