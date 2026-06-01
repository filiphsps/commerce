import { coerceObjectId, type Doc, deriveId, remapObjectId } from './id-remap';

export type { Doc } from './id-remap';

/**
 * One transformed row destined for a Convex table. `payloadId` is the stable `by_payloadId` key (the
 * deterministic surrogate Convex id derived from the source `ObjectId`) — it is used to link
 * cross-table references and to upsert idempotently, and is NEVER stored as a document field.
 * `document` carries only schema-shaped fields (so a per-table import passes schema validation).
 */
export interface TransformedDoc {
    payloadId: string;
    document: Doc;
}

/**
 * Raw mongoexport input keyed by source Mongo collection. Each value is the JSONL parse of one
 * `mongoexport` file. Only the Phase-0 unified-shape collections the transform understands are
 * listed; the pipeline is per-collection and extends by adding a key plus a transformer below.
 */
export interface SourceDataset {
    shops?: Doc[];
    featureFlags?: Doc[];
    reviews?: Doc[];
}

/**
 * Transformed output keyed by destination Convex table. `shops` fans out into its de-embedded side
 * tables (credentials/domains/collaborators/feature-flag joins) exactly as the committed `tables/`
 * validators require.
 */
export interface ConvexImportDataset {
    shops: TransformedDoc[];
    shopCredentials: TransformedDoc[];
    shopDomains: TransformedDoc[];
    shopCollaborators: TransformedDoc[];
    shopFeatureFlags: TransformedDoc[];
    featureFlags: TransformedDoc[];
    reviews: TransformedDoc[];
}

/** The full shop-family fan-out produced from a single source `shops` document. */
interface ShopFamily {
    shop: TransformedDoc;
    credentials: TransformedDoc;
    domains: TransformedDoc[];
    collaborators: TransformedDoc[];
    featureFlags: TransformedDoc[];
}

/**
 * Recursively rewrites mongoexport extended-JSON wrappers to their plain JS equivalents: `{ $oid }`
 * to its hex string, `{ $date }` to epoch-ms, and the `{ $number* }` wrappers to a `number`. Pure —
 * always returns a fresh value and never mutates the input, so callers can treat the source docs as
 * immutable. Normalizing first keeps every downstream read (ids, timestamps) shape-agnostic and the
 * output deterministic regardless of which extended-JSON dialect `mongoexport` emitted.
 *
 * @param value - Any value parsed from a mongoexport JSONL line.
 * @returns The value with extended-JSON wrappers resolved.
 */
export const normalizeExtendedJson = (value: unknown): unknown => {
    if (Array.isArray(value)) return value.map(normalizeExtendedJson);
    if (value && typeof value === 'object') {
        const obj = value as Record<string, unknown>;
        if (typeof obj.$oid === 'string') return obj.$oid;
        if ('$date' in obj) return parseExtendedDate(obj.$date);
        if (typeof obj.$numberLong === 'string') return Number(obj.$numberLong);
        if (typeof obj.$numberInt === 'string') return Number(obj.$numberInt);
        if (typeof obj.$numberDouble === 'string') return Number(obj.$numberDouble);
        if (typeof obj.$numberDecimal === 'string') return Number(obj.$numberDecimal);
        const out: Doc = {};
        for (const [key, nested] of Object.entries(obj)) out[key] = normalizeExtendedJson(nested);
        return out;
    }
    return value;
};

/**
 * Resolves a mongoexport `$date` payload to epoch-ms, matching the explicit numeric `createdAt`/
 * `updatedAt` fields the Convex `tables/` validators store (Convex's own `_creationTime` reflects the
 * migration insert, not the original creation, so the source timestamp is preserved verbatim).
 *
 * @param raw - The `$date` payload: an ISO string, a `{ $numberLong }` ms wrapper, or a number.
 * @returns The timestamp as epoch-ms, or `NaN` for a malformed payload.
 */
const parseExtendedDate = (raw: unknown): number => {
    if (typeof raw === 'string') return Date.parse(raw);
    if (typeof raw === 'number') return raw;
    if (raw && typeof raw === 'object') {
        const inner = (raw as Record<string, unknown>).$numberLong;
        if (typeof inner === 'string') return Number(inner);
    }
    return Number.NaN;
};

/**
 * Builds a new document holding only `keys` that are present and defined on `source`, in the given
 * key order. Pure — never mutates `source`. The fixed key order makes the emitted document
 * byte-stable for a given input regardless of the source's key order.
 *
 * @param source - The document to project.
 * @param keys - The keys to keep, in output order.
 * @returns A fresh document with the picked fields.
 */
const pick = (source: Doc, keys: readonly string[]): Doc => {
    const out: Doc = {};
    for (const key of keys) {
        if (key in source && source[key] !== undefined) out[key] = source[key];
    }
    return out;
};

/** Shop-row fields carried through verbatim (in schema order), minus the de-embedded/secret ones. */
const SHOP_PASSTHROUGH_KEYS = [
    'name',
    'description',
    'domain',
    'alternativeDomains',
    'i18n',
    'commerce',
    'showProductVendor',
    'design',
    'theme',
    'icons',
    'integrations',
    'thirdParty',
    'createdAt',
    'updatedAt',
] as const;

/**
 * Splits a shop's `commerceProvider` into the public, secret-free shape stored on the shop row and the
 * two masked credentials shredded into the `shopCredentials` table — structurally mirroring the
 * `shopValidator`/`shopCredentialsValidator` boundary so the public row physically cannot carry
 * `authentication.token` or `customers.clientSecret`. A non-Shopify provider passes through unchanged
 * and yields no credentials.
 *
 * @param raw - The normalized `commerceProvider` value off the shop document.
 * @returns The sanitized provider plus the extracted `token`/`clientSecret` (each `undefined` when absent).
 */
const sanitizeCommerceProvider = (
    raw: unknown,
): { provider: unknown; token: string | undefined; clientSecret: string | undefined } => {
    if (!raw || typeof raw !== 'object') return { provider: raw, token: undefined, clientSecret: undefined };
    const provider = raw as Doc;
    if (provider.type !== 'shopify') return { provider, token: undefined, clientSecret: undefined };

    const auth =
        provider.authentication && typeof provider.authentication === 'object' ? (provider.authentication as Doc) : {};
    const token = typeof auth.token === 'string' ? auth.token : undefined;
    const customers = auth.customers && typeof auth.customers === 'object' ? (auth.customers as Doc) : undefined;
    const clientSecret = customers && typeof customers.clientSecret === 'string' ? customers.clientSecret : undefined;

    const sanitizedAuth = pick(auth, ['publicToken', 'domain']);
    if (customers) sanitizedAuth.customers = pick(customers, ['id', 'clientId']);

    const sanitizedProvider: Doc = {
        type: 'shopify',
        authentication: sanitizedAuth,
        ...pick(provider, ['storefrontId', 'domain', 'id']),
    };
    return { provider: sanitizedProvider, token, clientSecret };
};

/**
 * Transforms one source `shops` document into its full Convex shop-family fan-out, or `null` when the
 * row has no resolvable `_id`. Preserves the source `ObjectId` as `legacyId` (the value the query
 * layer projects to the external `shop.id`, NEVER the surrogate id), shreds the masked credentials
 * into a `shopCredentials` row, and normalizes the primary `domain` plus each `alternativeDomains`
 * entry into one de-duplicated `shopDomains` row per `(domain -> shopId)`. De-embeds the collaborator
 * and feature-flag arrays into join rows whose foreign keys are the deterministic surrogate ids of the
 * referenced rows, keeping the reference graph internally consistent. Pure.
 *
 * @param raw - A source `shops` document in mongoexport extended JSON.
 * @returns The shop-family rows, or `null` when the document lacks an id.
 */
export const transformShop = (raw: Doc): ShopFamily | null => {
    const doc = normalizeExtendedJson(raw) as Doc;
    const legacyId = coerceObjectId(doc._id);
    if (!legacyId) return null;
    const payloadId = remapObjectId('shops', legacyId);

    const { provider, token, clientSecret } = sanitizeCommerceProvider(doc.commerceProvider);
    const document: Doc = { legacyId, ...pick(doc, SHOP_PASSTHROUGH_KEYS), commerceProvider: provider };
    const shop: TransformedDoc = { payloadId, document };

    const credentialDocument: Doc = { shop: payloadId };
    if (token !== undefined) credentialDocument.token = token;
    if (clientSecret !== undefined) credentialDocument.clientSecret = clientSecret;
    const credentials: TransformedDoc = {
        payloadId: deriveId('shopCredentials', payloadId),
        document: credentialDocument,
    };

    const domains: TransformedDoc[] = [];
    const seenDomains = new Set<string>();
    const addDomain = (candidate: unknown): void => {
        if (typeof candidate !== 'string') return;
        const domain = candidate.trim();
        if (domain.length === 0 || seenDomains.has(domain)) return;
        seenDomains.add(domain);
        domains.push({ payloadId: deriveId('shopDomains', payloadId, domain), document: { shop: payloadId, domain } });
    };
    addDomain(doc.domain);
    if (Array.isArray(doc.alternativeDomains)) for (const candidate of doc.alternativeDomains) addDomain(candidate);

    const collaborators: TransformedDoc[] = [];
    if (Array.isArray(doc.collaborators)) {
        for (const entry of doc.collaborators) {
            if (!entry || typeof entry !== 'object') continue;
            const collaborator = entry as Doc;
            const userHex = coerceObjectId(collaborator.user);
            if (!userHex) continue;
            const user = remapObjectId('users', userHex);
            const permissions = Array.isArray(collaborator.permissions)
                ? collaborator.permissions.filter((value): value is string => typeof value === 'string')
                : [];
            collaborators.push({
                payloadId: deriveId('shopCollaborators', payloadId, user),
                document: { shop: payloadId, user, permissions },
            });
        }
    }

    const featureFlags: TransformedDoc[] = [];
    if (Array.isArray(doc.featureFlags)) {
        for (const entry of doc.featureFlags) {
            if (!entry || typeof entry !== 'object') continue;
            const flagHex = coerceObjectId((entry as Doc).flag);
            if (!flagHex) continue;
            const flag = remapObjectId('featureFlags', flagHex);
            featureFlags.push({
                payloadId: deriveId('shopFeatureFlags', payloadId, flag),
                document: { shop: payloadId, flag },
            });
        }
    }

    return { shop, credentials, domains, collaborators, featureFlags };
};

/** Global feature-flag fields carried through verbatim (in schema order), minus `legacyId`. */
const FEATURE_FLAG_PASSTHROUGH_KEYS = [
    'key',
    'kind',
    'description',
    'defaultValue',
    'options',
    'targeting',
    'createdAt',
    'updatedAt',
] as const;

/**
 * Transforms one source `featureFlags` document into a global `featureFlags` row, or `null` when it
 * has no resolvable `_id`. Preserves the source `ObjectId` as `legacyId` so the de-embedded
 * `shopFeatureFlags.flag` surrogate refs resolve, and defaults the schema-required `targeting` array
 * when the source omits it. Pure.
 *
 * @param raw - A source `featureFlags` document in mongoexport extended JSON.
 * @returns The transformed row, or `null` when the document lacks an id.
 */
export const transformFeatureFlag = (raw: Doc): TransformedDoc | null => {
    const doc = normalizeExtendedJson(raw) as Doc;
    const legacyId = coerceObjectId(doc._id);
    if (!legacyId) return null;
    const fields = pick(doc, FEATURE_FLAG_PASSTHROUGH_KEYS);
    if (!('targeting' in fields)) fields.targeting = [];
    return { payloadId: remapObjectId('featureFlags', legacyId), document: { legacyId, ...fields } };
};

/**
 * Transforms one source `reviews` document into a `reviews` row, or `null` when its `_id` or `shop`
 * ref cannot be resolved. Remaps the source `shop` id-ref to the shop's surrogate `shopId`
 * (the committed `reviewValidator` is a minimal `{ shopId, createdAt, updatedAt }` and carries no
 * `legacyId` field, so none is stored). Pure.
 *
 * @param raw - A source `reviews` document in mongoexport extended JSON.
 * @returns The transformed row, or `null` when the document lacks an id or shop ref.
 */
export const transformReview = (raw: Doc): TransformedDoc | null => {
    const doc = normalizeExtendedJson(raw) as Doc;
    const legacyId = coerceObjectId(doc._id);
    if (!legacyId) return null;
    const shopHex = coerceObjectId(doc.shop);
    if (!shopHex) return null;
    const shopId = remapObjectId('shops', shopHex);
    return {
        payloadId: remapObjectId('reviews', legacyId),
        document: { shopId, ...pick(doc, ['createdAt', 'updatedAt']) },
    };
};

/**
 * Orders a table's rows by `payloadId` so the dataset is byte-stable regardless of source array
 * order. Pure — sorts a copy, leaving the input array untouched.
 *
 * @param rows - The rows to order.
 * @returns A new array sorted ascending by `payloadId`.
 */
const sortRows = (rows: readonly TransformedDoc[]): TransformedDoc[] =>
    [...rows].sort((left, right) => (left.payloadId < right.payloadId ? -1 : left.payloadId > right.payloadId ? 1 : 0));

/**
 * The pure deterministic ETL transform: maps a raw mongoexport {@link SourceDataset} to the
 * per-table {@link ConvexImportDataset} the Convex import stages. The contract is determinism — every
 * id is a stable derivation of its source `ObjectId`, so calling `transform` twice on the same input
 * produces a byte-identical result, which is what lets a re-import reproduce identical Convex state
 * (idempotent). Never mutates `input`.
 *
 * @param input - Raw documents keyed by source Mongo collection.
 * @returns The transformed rows keyed by destination Convex table, each table ordered by `payloadId`.
 */
export const transform = (input: SourceDataset): ConvexImportDataset => {
    const shops: TransformedDoc[] = [];
    const shopCredentials: TransformedDoc[] = [];
    const shopDomains: TransformedDoc[] = [];
    const shopCollaborators: TransformedDoc[] = [];
    const shopFeatureFlags: TransformedDoc[] = [];
    for (const raw of input.shops ?? []) {
        const family = transformShop(raw);
        if (!family) continue;
        shops.push(family.shop);
        shopCredentials.push(family.credentials);
        shopDomains.push(...family.domains);
        shopCollaborators.push(...family.collaborators);
        shopFeatureFlags.push(...family.featureFlags);
    }

    const featureFlags: TransformedDoc[] = [];
    for (const raw of input.featureFlags ?? []) {
        const row = transformFeatureFlag(raw);
        if (row) featureFlags.push(row);
    }

    const reviews: TransformedDoc[] = [];
    for (const raw of input.reviews ?? []) {
        const row = transformReview(raw);
        if (row) reviews.push(row);
    }

    return {
        shops: sortRows(shops),
        shopCredentials: sortRows(shopCredentials),
        shopDomains: sortRows(shopDomains),
        shopCollaborators: sortRows(shopCollaborators),
        shopFeatureFlags: sortRows(shopFeatureFlags),
        featureFlags: sortRows(featureFlags),
        reviews: sortRows(reviews),
    };
};
