import {
    InvalidShopDomainError,
    TodoError,
    UnknownShopDomainError,
    UnknownShopIdError,
} from '@nordcom/commerce-errors';

import { convexServerMutation, convexServerQuery } from '../db';
import { docToFeatureFlag, docToOnlineShop, stripInternals } from '../lib/doc-to-shape';
import { taintSecret } from '../lib/taint';
import type { CommerceProvider, DomainVerification, DomainVerificationInput, OnlineShop, ShopBase } from '../models';
import { Service, type ServiceBackend } from './service';

type ConvexDoc = Record<string, unknown>;

/** Shop row + joined feature flags, as returned by the `db/shops` read functions. */
type ShopReadPayload = { shop: ConvexDoc; flags: ConvexDoc[] };
/** {@link ShopReadPayload} plus the split-out secrets bag from `shopCredentials`. */
type SensitiveShopReadPayload = ShopReadPayload & { credentials: { token?: string; clientSecret?: string } };
/** One collaborated shop with its full collaborator join rows. */
type CollaboratedShopPayload = { shop: ConvexDoc; collaborators: { user: string; permissions: string[] }[] };
/** The split-out secrets bag a shop write carries alongside the public row. */
type ShopWriteCredentials = { token?: string; clientSecret?: string };
/** Stored shop row + post-sync collaborator rows, as returned by `db/shop_write:upsertShop`. */
type ShopWritePayload = { shop: ConvexDoc; collaborators: { user: string; permissions: string[] }[] };

/**
 * Controls how `ShopService.findByDomain` fetches and returns the document. Allows callers to
 * skip shape conversion, include sensitive credentials, or request feature-flag population in a
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
    /** Whether to convert the result to the masked `OnlineShop` or keep the raw `ShopBase` doc. */
    convert?: boolean;
    sensitiveData?: boolean;
    /**
     * Population paths (e.g. `featureFlags.flag`). Inert on the Convex seam: the `db/shops` reads
     * always resolve the `shopFeatureFlags` join, so `featureFlags[].flag` arrives populated
     * whether or not this is passed. Retained for the frozen call-site signature.
     */
    populate?: string[];
    /**
     * Field projection (e.g. `{ domain: 1, 'i18n.defaultLocale': 1 }`) so callers that only read a
     * couple of fields receive a narrow object. Include-style (`1`) paths are honored client-side;
     * pair with `convert: false` as before.
     */
    projection?: Record<string, 0 | 1>;
};

/**
 * Re-embeds a `db/shops` read payload as a single shop document in the frozen `ShopBase` layout:
 * the joined flag rows become the populated `featureFlags: [{ flag }]` array (the resolved analogue
 * of the Mongo `populate('featureFlags.flag')`).
 *
 * @param payload - The shop row paired with its joined flags.
 * @returns One merged shop document (still carrying backend internals; strip before returning).
 */
const shopPayloadToDoc = ({ shop, flags }: ShopReadPayload): ConvexDoc => ({
    ...shop,
    featureFlags: flags.map((flag) => ({ flag: docToFeatureFlag(flag) })),
});

/**
 * Re-attaches the split-out `shopCredentials` secrets onto the `commerceProvider.authentication`
 * subtree — the inverse of the structural masking boundary, used ONLY on the `sensitiveData` path.
 * Values are only written when present so a credential-less shop keeps its public shape.
 *
 * @param doc - The merged shop document.
 * @param credentials - The secrets bag from the Convex read.
 * @returns The document with `token`/`customers.clientSecret` re-attached.
 */
const attachCredentials = (doc: ConvexDoc, credentials: SensitiveShopReadPayload['credentials']): ConvexDoc => {
    const provider = doc.commerceProvider as { authentication?: Record<string, unknown> } | undefined;
    if (!provider?.authentication) {
        return doc;
    }
    const authentication: Record<string, unknown> = { ...provider.authentication };
    if (typeof credentials.token === 'string') {
        authentication.token = credentials.token;
    }
    const customers = authentication.customers as Record<string, unknown> | undefined;
    if (customers && typeof credentials.clientSecret === 'string') {
        authentication.customers = { ...customers, clientSecret: credentials.clientSecret };
    }
    return { ...doc, commerceProvider: { ...provider, authentication } };
};

/**
 * Applies an include-style projection to a shop document, supporting dotted paths the way the
 * middleware's `{ domain: 1, 'i18n.defaultLocale': 1 }` projection expects. The public `id` is
 * always retained (the analogue of Mongo always returning `_id`). Exclude-style projections (all
 * `0`s) return the full document.
 *
 * @param doc - The merged shop document.
 * @param projection - The `1`-valued include map.
 * @returns The narrowed document.
 */
const applyProjection = (doc: ConvexDoc, projection: Record<string, 0 | 1>): ConvexDoc => {
    const includes = Object.entries(projection)
        .filter(([, mode]) => mode === 1)
        .map(([path]) => path);
    if (includes.length === 0) {
        return doc;
    }
    const out: ConvexDoc = {};
    for (const path of includes) {
        const segments = path.split('.');
        let source: unknown = doc;
        let target = out;
        for (let index = 0; index < segments.length; index += 1) {
            const segment = segments[index] as string;
            if (source === null || typeof source !== 'object') {
                break;
            }
            const value = (source as ConvexDoc)[segment];
            if (index === segments.length - 1) {
                if (typeof value !== 'undefined') {
                    target[segment] = value;
                }
                break;
            }
            const nested = (target[segment] as ConvexDoc | undefined) ?? {};
            target[segment] = nested;
            target = nested;
            source = value;
        }
    }
    if (typeof doc.id !== 'undefined') {
        out.id = doc.id;
    }
    return out;
};

/**
 * Splits the secret members off a commerce provider for the wire: the public provider (no `token`,
 * no `customers.clientSecret`) rides in the shop payload while the secrets travel as the separate
 * credentials bag the `shopCredentials` table stores — the write-side mirror of the structural
 * masking boundary, so a shop write can never persist a secret onto the public `shops` row.
 *
 * @param commerceProvider - The seam-shaped provider, possibly carrying embedded secrets.
 * @returns The secret-free provider plus the extracted credentials bag.
 */
const splitCommerceProvider = (
    commerceProvider: CommerceProvider,
): { provider: ConvexDoc; credentials: ShopWriteCredentials } => {
    if (commerceProvider.type !== 'shopify') {
        return { provider: commerceProvider as unknown as ConvexDoc, credentials: {} };
    }
    const { token, ...authentication } = commerceProvider.authentication;
    const credentials: ShopWriteCredentials = { token };
    let publicAuthentication: ConvexDoc = authentication;
    if (authentication.customers) {
        const { clientSecret, ...customers } = authentication.customers;
        credentials.clientSecret = clientSecret;
        publicAuthentication = { ...authentication, customers };
    }
    return { provider: { ...commerceProvider, authentication: publicAuthentication }, credentials };
};

/**
 * Maps the atomic write's return view back onto the frozen `ShopBase` shape: collaborators
 * re-embedded from the post-sync join rows, the caller's own secrets re-attached (they never leave
 * the process on the write path — the wire payload is secret-free), internals stripped, and
 * `legacyId` projected onto the public `id`.
 *
 * @param payload - The `db/shop_write:upsertShop` return view.
 * @param credentials - The secrets bag the caller supplied for this write.
 * @returns The stored shop as `ShopBase`.
 */
const writePayloadToShop = (payload: ShopWritePayload, credentials: ShopWriteCredentials): ShopBase => {
    const doc = attachCredentials({ ...payload.shop }, credentials);
    return stripInternals({ ...doc, collaborators: payload.collaborators }) as unknown as ShopBase;
};

/**
 * Convex backend for the inherited base `Service` surface on `Shop`. Reads resolve through the
 * `db/shops` functions; EVERY write maps onto the single atomic `db/shop_write:upsertShop`
 * mutation — one Convex transaction covering the shop row, the split-out credentials, the
 * `shopDomains` delete-diff reconciliation, and the collaborator join sync. The single-mutation
 * gate (`lib/single-mutation-gate.ts`) mechanically rejects any write body issuing a second call.
 */
const shopsBackend: ServiceBackend<ShopBase> = {
    name: 'Shop',
    create: async (input) => {
        const { commerceProvider, collaborators, featureFlags, ...shop } = input;
        if (featureFlags && featureFlags.length > 0) {
            throw new TodoError('Shop.create does not write the feature-flag join; use the flag tooling instead.');
        }
        const { provider, credentials } = splitCommerceProvider(commerceProvider);
        const payload = await convexServerMutation<ShopWritePayload>('db/shop_write:upsertShop', {
            shop: { ...shop, commerceProvider: provider },
            credentials,
            collaborators: collaborators ?? [],
        });
        return writePayloadToShop(payload, credentials);
    },
    findMany: async ({ id, filter }) => {
        if (id) {
            const payload = await convexServerQuery<ShopReadPayload | null>('db/shops:byId', { id });
            return payload ? [stripInternals(shopPayloadToDoc(payload)) as unknown as ShopBase] : [];
        }
        const f = (filter ?? {}) as Record<string, unknown>;
        if (Object.keys(f).length === 0) {
            const rows = await convexServerQuery<ConvexDoc[]>('db/shops:findAll', {});
            return rows.map((row) => stripInternals(row) as unknown as ShopBase);
        }
        throw new TodoError(`Shop.find filter is not supported by the Convex seam: ${JSON.stringify(filter)}`);
    },
    findById: async (id) => {
        const payload = await convexServerQuery<ShopReadPayload | null>('db/shops:byId', { id });
        return payload ? (stripInternals(shopPayloadToDoc(payload)) as unknown as ShopBase) : null;
    },
    findOneAndUpdate: async (filter, update, options) => {
        const f = (filter ?? {}) as Record<string, unknown>;
        if (typeof f.id !== 'string' || Object.keys(f).length !== 1) {
            throw new TodoError(
                `Shop.findOneAndUpdate filter is not supported by the Convex seam: ${JSON.stringify(filter)}`,
            );
        }
        const u = (update ?? {}) as Record<string, unknown>;
        const operators = Object.keys(u).filter((key) => key.startsWith('$'));
        if (
            operators.some((operator) => operator !== '$set') ||
            (operators.length > 0 && operators.length !== Object.keys(u).length)
        ) {
            throw new TodoError(
                `Shop.findOneAndUpdate update is not supported by the Convex seam: ${JSON.stringify(update)}`,
            );
        }
        const fields = ((operators.length > 0 ? u.$set : u) ?? {}) as Partial<ShopBase>;
        const { commerceProvider, collaborators, featureFlags, ...shop } = fields;
        if (featureFlags && featureFlags.length > 0) {
            throw new TodoError('Shop.findOneAndUpdate does not write the feature-flag join.');
        }
        const split = commerceProvider ? splitCommerceProvider(commerceProvider) : undefined;
        const payload = await convexServerMutation<ShopWritePayload | null>('db/shop_write:upsertShop', {
            legacyId: f.id,
            upsert: (options as { upsert?: boolean } | undefined)?.upsert === true,
            shop: split ? { ...shop, commerceProvider: split.provider } : shop,
            credentials: split?.credentials,
            collaborators,
        });
        return payload ? writePayloadToShop(payload, split?.credentials ?? {}) : null;
    },
};

/**
 * Read service for the `shops` tenant roots. Extends the generic `Service` base with shop-specific
 * queries (domain lookup, collaborator listing) on the deployed `db/shops` Convex functions. The
 * credential masking is structural — the public shop row physically carries no secret; only the
 * `sensitiveData` path joins the split-out `shopCredentials` table and re-taints the secrets after
 * they cross the HTTP boundary.
 *
 * @example
 * ```ts
 * import { Shop } from '@nordcom/commerce-db';
 * const shop = await Shop.findByDomain('acme.myshopify.com');
 * ```
 */
export class ShopService extends Service<ShopBase> {
    /**
     * Binds the service to the `db/shops` Convex backend.
     *
     * @example
     * ```ts
     * import { ShopService } from '@nordcom/commerce-db';
     * const service = new ShopService();
     * ```
     */
    public constructor() {
        super(shopsBackend);
    }

    /**
     * Resolves a shop by its public id, stripping backend internals and returning the masked
     * `OnlineShop` shape. Overrides the base `findById` to always throw rather than return `null`.
     *
     * @param id - Public shop id (the migrated Mongo id) to load.
     * @returns The shop as `OnlineShop`.
     * @throws {UnknownShopIdError} When no shop with that id exists.
     * @example
     * ```ts
     * const shop = await Shop.findById(shopId);
     * ```
     */
    // Override the base method with a narrowed return: the base resolves `Promise<ShopBase | null>`;
    // here we narrow to `Promise<OnlineShop>` (always resolves or throws). Cast through the
    // intersection to satisfy the override checker — the frozen snapshot pins this exact shape.
    public override findById(id: string, ...[]: never[]): Promise<OnlineShop> & Promise<ShopBase | null> {
        return (async () => {
            const payload = await convexServerQuery<ShopReadPayload | null>('db/shops:byId', { id });
            if (!payload) throw new UnknownShopIdError(id);
            return docToOnlineShop(shopPayloadToDoc(payload));
        })() as Promise<OnlineShop> & Promise<ShopBase | null>;
    }

    /**
     * Returns all shops where the given user is listed as a collaborator, walking the de-embedded
     * `shopCollaborators` join (see {@link ShopCollaborator}) — each returned shop carries its
     * collaborator rows as `{ user, permissions }` id refs, never an embedded user document.
     *
     * @param options.collaboratorId - The user's id string matched against the join's `user` ref.
     * @param options.email - The user's unique email, preferred over `collaboratorId` for resolution:
     *   a session minted before the Convex cutover carries a legacy id that no longer resolves, so the
     *   stable email keeps shops visible without forcing a re-login.
     * @returns Shops the collaborator has access to; empty array when none.
     * @example
     * ```ts
     * const myShops = await Shop.findByCollaborator({ collaboratorId: user.id, email: user.email });
     * ```
     */
    public async findByCollaborator({
        collaboratorId,
        email,
    }: {
        collaboratorId: string;
        email?: string;
    }): Promise<OnlineShop[]> {
        const payloads = await convexServerQuery<CollaboratedShopPayload[]>('db/shops:byCollaborator', {
            userId: collaboratorId,
            email,
        });
        return payloads
            .map(({ shop, collaborators }) => docToOnlineShop({ ...shop, collaborators }))
            .filter((shop) => shop);
    }

    /**
     * Resolves a shop by its primary domain or any listed alternative domain via the Convex
     * `shopDomains` routing index. By default strips backend internals and returns the masked
     * `OnlineShop`; `sensitiveData: true` joins the split-out credentials and re-applies the React
     * taint to them after deserialization.
     *
     * @param domain - Fully-qualified hostname to look up (no scheme, no port).
     * @param options.convert - When `false`, returns the raw doc as `ShopBase`. Defaults to `true`.
     * @param options.sensitiveData - When `true`, attaches `commerceProvider.authentication.token`
     *   (and `customers.clientSecret`) from the credentials table. Defaults to `false`.
     * @param options.populate - Inert on the Convex seam (flags always arrive populated).
     * @param options.projection - Include-style field projection applied to the returned doc.
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
    public async findByDomain(domain: string, options: FindOptions = {}): Promise<OnlineShop | ShopBase> {
        const sensitiveData = options.sensitiveData ?? false;
        const convert = options.convert ?? true;

        const payload = sensitiveData
            ? await convexServerQuery<SensitiveShopReadPayload | null>('db/shops:byDomainWithCredentials', { domain })
            : await convexServerQuery<ShopReadPayload | null>('db/shops:byDomain', { domain });

        if (!payload) {
            if (!domain) {
                throw new InvalidShopDomainError(domain);
            }
            throw new UnknownShopDomainError(domain);
        }

        let doc = shopPayloadToDoc(payload);
        if (sensitiveData) {
            const credentials = (payload as SensitiveShopReadPayload).credentials ?? {};
            doc = attachCredentials(doc, credentials);
            // The taint registered at the Shopify-client boundary does not survive the HTTP
            // round-trip; re-taint the secrets the moment they re-enter the process.
            await taintSecret(credentials.token);
            await taintSecret(credentials.clientSecret);
        }

        if (!convert) {
            const raw = stripInternals(doc) as ConvexDoc;
            return (options.projection ? applyProjection(raw, options.projection) : raw) as unknown as ShopBase;
        }
        if (sensitiveData) {
            return stripInternals(doc) as unknown as OnlineShop;
        }
        return docToOnlineShop(doc);
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
            const rows = await convexServerQuery<ConvexDoc[]>('db/shops:findAll', {});
            return rows.map((row) => docToOnlineShop(row)).filter((shop) => shop);
        } catch (error: unknown) {
            console.warn(error);
            return [];
        }
    }

    /**
     * Reads a routable domain's connection state for the admin connect screen, coalescing legacy
     * rows (no stored `status`) to `verified`/`service_domain` — those domains predate verification
     * and are already live. Returns `null` when the domain is unclaimed.
     *
     * @param domain - The normalized customer-facing hostname.
     * @returns The {@link DomainVerification}, or `null` when no routing row exists.
     * @example
     * ```ts
     * const state = await Shop.getDomainVerification('shop.acme.com');
     * ```
     */
    public async getDomainVerification(domain: string): Promise<DomainVerification | null> {
        const row = await convexServerQuery<{
            domain: string;
            status?: 'pending' | 'verified' | 'failed';
            via?: 'vercel' | 'service_domain' | 'localhost';
            verifiedAt?: number;
            lastCheckedAt?: number;
        } | null>('db/shops:domainVerification', { domain });
        if (!row) {
            return null;
        }
        return {
            domain: row.domain,
            status: row.status ?? 'verified',
            via: row.via ?? (row.status ? null : 'service_domain'),
            verifiedAt: row.verifiedAt ?? null,
            lastCheckedAt: row.lastCheckedAt ?? null,
        };
    }

    /**
     * Persists the outcome of a verify attempt onto the routing row. Informational only — never
     * affects routing. No-ops silently at the seam when the domain has no row.
     *
     * @param domain - The normalized customer-facing hostname.
     * @param input - The new status plus optional `via`/`verifiedAt`.
     * @example
     * ```ts
     * await Shop.setDomainVerification('shop.acme.com', { status: 'verified', via: 'vercel' });
     * ```
     */
    public async setDomainVerification(domain: string, input: DomainVerificationInput): Promise<void> {
        await convexServerMutation<{ ok: boolean }>('db/shop_domain_write:setDomainVerification', { domain, ...input });
    }
}

export const Shop = new ShopService();
