import { InvalidShopDomainError, UnknownShopDomainError, UnknownShopIdError } from '@nordcom/commerce-errors';

import { docToOnlineShop, stripInternals } from '../lib/doc-to-shape';
import type { OnlineShop, ShopBase } from '../models';
import { ShopModel } from '../models';
import { Service } from './service';

/**
 * Controls how `ShopService.findByDomain` fetches and returns the document. Allows callers to
 * skip shape conversion, include sensitive credentials, or populate feature-flag references in a
 * single call.
 *
 * @example
 * ```ts
 * import type { FindOptions } from '@nordcom/commerce-db';
 * const opts: FindOptions = { populate: ['featureFlags.flag'] };
 * const shop = await Shop.findByDomain('acme.com', opts);
 * ```
 */
export type FindOptions = {
    /** Whether to convert the result to a normal object or keep it as the raw Mongoose lean doc. */
    convert?: boolean;
    sensitiveData?: boolean;
    /** Mongoose population paths to apply (e.g. `featureFlags.flag`). */
    populate?: string[];
    /**
     * Mongoose field projection (e.g. `{ domain: 1, 'i18n.defaultLocale': 1 }`) so callers that
     * only read a couple of fields avoid pulling the entire tenant document over the wire. Pair
     * with `convert: false`; conversion/masking expects a full document.
     */
    projection?: Record<string, 0 | 1>;
};

/**
 * CRUD service for the `shops` MongoDB collection. Extends the generic `Service` base with
 * shop-specific queries, domain-based lookup, and the credential-masking pipeline that strips
 * sensitive fields before returning the public `OnlineShop` shape.
 *
 * @example
 * ```ts
 * import { Shop } from '@nordcom/commerce-db';
 * const shop = await Shop.findByDomain('acme.myshopify.com');
 * ```
 */
export class ShopService extends Service<ShopBase, typeof ShopModel> {
    /**
     * Binds the service to the `ShopModel` Mongoose model.
     *
     * @example
     * ```ts
     * import { ShopService } from '@nordcom/commerce-db';
     * const service = new ShopService();
     * ```
     */
    public constructor() {
        super(ShopModel);
    }

    /**
     * Resolves a shop by its MongoDB `_id`, stripping Mongo internals and returning the public
     * `OnlineShop` shape. Overrides the base `findById` to always throw rather than return `null`.
     *
     * @param id - MongoDB `_id` of the shop to load.
     * @returns The shop as `OnlineShop`.
     * @throws {UnknownShopIdError} When no shop with that `_id` exists.
     * @example
     * ```ts
     * const shop = await Shop.findById(shopId);
     * ```
     */
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

    /**
     * Returns all shops where the given user is listed as a collaborator. Matches against the
     * de-embedded `collaborators[].user` join key — a plain user id string ref (see
     * {@link ShopCollaborator}), not an embedded user document — so the query shape is unchanged
     * while the row it resolves no longer nests a full user.
     *
     * @param options.collaboratorId - The user's id string matched against the `collaborators.user`
     *   id ref on each shop document.
     * @returns Shops the collaborator has access to; empty array when none.
     * @example
     * ```ts
     * const myShops = await Shop.findByCollaborator({ collaboratorId: user.id });
     * ```
     */
    public async findByCollaborator({ collaboratorId }: { collaboratorId: string }): Promise<OnlineShop[]> {
        const docs = await ShopModel.find({ 'collaborators.user': collaboratorId }).lean<ShopBase[]>().exec();
        return docs.map((d) => docToOnlineShop(d as unknown as Record<string, unknown>)).filter((d) => d);
    }

    /**
     * Resolves a shop by its primary domain or any listed alternative domain. By default strips
     * Mongo internals and masks credential fields before returning.
     *
     * @param domain - Fully-qualified hostname to look up (no scheme, no port).
     * @param options.convert - When `false`, returns the raw lean doc as `ShopBase`. Defaults to
     *   `true`.
     * @param options.sensitiveData - When `true`, skips credential masking so
     *   `commerceProvider.authentication.token` is present. Defaults to `false`.
     * @param options.populate - Mongoose population paths to resolve (e.g. `featureFlags.flag`).
     * @returns The matched shop as `OnlineShop` by default, or `ShopBase` when `convert: false`.
     * @throws {InvalidShopDomainError} When `domain` is empty or falsy.
     * @throws {UnknownShopDomainError} When no shop claims the given domain or any of its
     *   alternatives.
     * @example
     * ```ts
     * const shop = await Shop.findByDomain('acme.myshopify.com');
     * const shopWithFlags = await Shop.findByDomain('acme.myshopify.com', {
     *     populate: ['featureFlags.flag'],
     * });
     * ```
     */
    public async findByDomain(domain: string, options?: FindOptions): Promise<OnlineShop | ShopBase>;
    public async findByDomain(
        domain: string,
        { sensitiveData = false, convert = true, populate = [], projection }: FindOptions = {},
    ): Promise<OnlineShop | ShopBase> {
        let query = ShopModel.findOne(
            {
                $or: [{ domain }, { alternativeDomains: domain }],
            },
            projection,
        );
        for (const path of populate) query = query.populate(path);
        const doc = await query.lean<ShopBase>().exec();

        if (!doc) {
            if (!domain) {
                throw new InvalidShopDomainError(domain);
            }
            throw new UnknownShopDomainError(domain);
        }

        if (!convert) return doc;
        if (sensitiveData) return stripInternals(doc as unknown as Record<string, unknown>) as unknown as OnlineShop;
        return docToOnlineShop(doc as unknown as Record<string, unknown>);
    }

    /**
     * Returns all shops in the platform. Query errors are caught and logged; callers receive an
     * empty array on failure rather than a thrown exception.
     *
     * @returns All shops as `OnlineShop[]`; returns `[]` when the query fails.
     * @example
     * ```ts
     * const shops = await Shop.findAll();
     * ```
     */
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
