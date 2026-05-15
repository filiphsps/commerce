import 'server-only';

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildNextAuthStrategy, computeRolesFromShopMembership } from '@nordcom/commerce-cms/auth';
import { buildPayloadConfig } from '@nordcom/commerce-cms/config';
import { attachShopSync, seedTenantsForExistingShops } from '@nordcom/commerce-cms/shop-sync';
import { Shop, User as UserService } from '@nordcom/commerce-db';
import { getPayload } from 'payload';
import sharp from 'sharp';

// Anchor Payload's import map / dependency resolution at the admin app's `src`
// directory. Without this the runtime resolves component paths against the
// @nordcom/commerce-cms package's own folder under node_modules, which makes
// every importMap lookup miss in prod and silently leaves Create / Edit views
// blank because Payload can't load the field/cell components.
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const IMPORT_MAP_BASE_DIR = path.resolve(__dirname);
const IMPORT_MAP_FILE = path.resolve(__dirname, 'app', '(payload)', 'cms', 'importMap.js');

const PAYLOAD_SECRET = process.env.PAYLOAD_SECRET;
const MONGODB_URI = process.env.MONGODB_URI;
const NEXTAUTH_SECRET = process.env.NEXTAUTH_SECRET ?? process.env.AUTH_SECRET;

if (!PAYLOAD_SECRET) throw new Error('PAYLOAD_SECRET is required');
if (!MONGODB_URI) throw new Error('MONGODB_URI is required');
if (!NEXTAUTH_SECRET) throw new Error('NEXTAUTH_SECRET (or AUTH_SECRET) is required');

const storefrontBaseUrl = process.env.STOREFRONT_BASE_URL ?? 'http://localhost:1337';

export const buildLivePreviewUrl = ({
    tenantId,
    collection,
    data,
    locale,
}: {
    tenantId: string;
    collection: string;
    data: { slug?: string; shopifyHandle?: string };
    locale: string;
}) => {
    const handle = data.slug ?? data.shopifyHandle ?? 'home';
    const path =
        collection === 'pages'
            ? `/${locale}/${handle}`
            : collection === 'articles'
              ? `/${locale}/blog/${handle}`
              : collection === 'productMetadata'
                ? `/${locale}/products/${handle}`
                : collection === 'collectionMetadata'
                  ? `/${locale}/collections/${handle}`
                  : `/${locale}`;
    const secret = process.env.STOREFRONT_PREVIEW_SECRET ?? '';
    return `${storefrontBaseUrl}/__by-tenant/${tenantId}${path}?preview=1&secret=${encodeURIComponent(secret)}`;
};

const lookupUserId = async (email: string): Promise<string | undefined> => {
    try {
        const result = await UserService.model.findOne({ email }).select('_id').lean();
        return result?._id ? String(result._id) : undefined;
    } catch (err) {
        // The previous empty-catch returned `undefined` for both "no such
        // user" and "DB connection dropped" — and a dropped Mongo connection
        // would silently flow downstream to `findShopsForUser` → "no
        // tenants" → "user has no access to anything," with no log to
        // explain why. Log so the incident is visible.
        console.error('[payload-config] lookupUserId failed:', err);
        return undefined;
    }
};

const findShopsForUser = async (email: string): Promise<Array<{ shopId: string }>> => {
    const userId = await lookupUserId(email);
    if (!userId) return [];
    try {
        const shops = await Shop.model.find({ 'collaborators.user': userId }).select('_id').lean();
        return shops.map((s) => ({ shopId: String(s._id) }));
    } catch (err) {
        console.error('[payload-config] findShopsForUser failed:', err);
        return [];
    }
};

// Auth-bridge lookup. Runs BEFORE Payload knows who the user is, so every
// local-API call must pass `overrideAccess: true` — otherwise the users
// collection's `create: isAdmin` / `read: req.user` predicates reject us and
// the strategy returns `null user`, sending the visitor to /cms/login.
const findOrCreateUser = async (email: string) => {
    const payload = await getPayload({ config: configPromise });
    try {
        const { docs } = await payload.find({
            collection: 'users',
            where: { email: { equals: email } },
            limit: 1,
            overrideAccess: true,
        });
        if (docs[0]) {
            return {
                id: String(docs[0].id),
                email: docs[0].email as string,
                role: (docs[0].role as 'admin' | 'editor') ?? 'editor',
                tenants: [],
            };
        }
    } catch (err) {
        console.error('[payload-config] payload.find users failed:', err);
        throw err;
    }
    try {
        const created = await payload.create({
            collection: 'users',
            data: {
                email,
                role: 'editor',
                password: crypto.randomUUID(),
            } as never,
            overrideAccess: true,
        });
        return {
            id: String(created.id),
            email: created.email as string,
            role: (created.role as 'admin' | 'editor') ?? 'editor',
            tenants: [],
        };
    } catch (err) {
        console.error('[payload-config] payload.create users failed:', err);
        throw err;
    }
};

const recomputeRoles = async (email: string) => {
    const isOperator = false;
    const shopCollaborators = await findShopsForUser(email);
    return computeRolesFromShopMembership({ email, isOperator, shopCollaborators });
};

// Mirror the cookie naming in apps/admin/src/utils/auth.config.ts. Auth.js v5
// canonical session cookie name is `__Secure-authjs.session-token` (HTTPS) or
// `authjs.session-token` (HTTP). `NEXTAUTH_COOKIE_NAME` is an explicit
// override for non-default deployments.
//
// Pass an array of candidate names to the bridge so it accepts both the v5
// canonical and the legacy v4 `next-auth.*` name. This means existing logged-
// in users with the old cookie don't get bounced to login on the deploy that
// switches naming — both names work until the legacy cookie expires.
const isSecureCookie = process.env.NEXTAUTH_URL?.startsWith('https') ?? false;
const defaultCookieNames = isSecureCookie
    ? ['__Secure-authjs.session-token', '__Secure-next-auth.session-token']
    : ['authjs.session-token', 'next-auth.session-token'];
const cookieNameCandidates = process.env.NEXTAUTH_COOKIE_NAME
    ? [process.env.NEXTAUTH_COOKIE_NAME, ...defaultCookieNames]
    : defaultCookieNames;
const strategy = buildNextAuthStrategy({
    secret: NEXTAUTH_SECRET,
    cookieName: cookieNameCandidates,
    findOrCreateUser,
    recomputeRoles,
});

const configPromise = buildPayloadConfig({
    secret: PAYLOAD_SECRET,
    mongoUrl: MONGODB_URI,
    serverUrl: process.env.SERVER_URL,
    includeAdmin: true,
    enableStorage: true,
    authStrategies: [strategy],
    disablePasswordLogin: true,
    importMapBaseDir: IMPORT_MAP_BASE_DIR,
    importMapFile: IMPORT_MAP_FILE,
    livePreview: { url: buildLivePreviewUrl },
    // Wire sharp through so the `media` collection's `imageSizes` pipeline
    // actually runs — Payload doesn't auto-detect the package and logs
    // "sharp not installed" on every boot otherwise.
    sharp,
    // One-shot backfill via Payload's `onInit` so it BLOCKS the first
    // `getPayload` call. Shops created before `attachShopSync` was wired
    // (older deploys, mongorestore, manual inserts) have no mirrored
    // `tenants` doc — and the multi-tenant plugin's `GlobalViewRedirect`
    // bails to `/cms` when an editor opens a global like Business Data
    // because `getTenantOptions` returns an empty list. Running this in
    // `onInit` (instead of fire-and-forget at module load) guarantees the
    // tenants exist before any request handler runs.
    onInit: async (payload) => {
        const docs = await Shop.model.find({}).select('_id name domain i18n').lean();
        const shops = docs.map((d) => ({
            id: String((d as { _id: unknown })._id),
            name: String((d as { name?: unknown }).name ?? ''),
            domain: String((d as { domain?: unknown }).domain ?? ''),
            i18n: {
                defaultLocale: String((d as { i18n?: { defaultLocale?: unknown } }).i18n?.defaultLocale ?? 'en-US'),
                // Shop schema only persists `defaultLocale`. Let the
                // sync helper fall back to `[defaultLocale]` so the
                // required+hasMany `locales` field validates.
            },
        }));
        const result = await seedTenantsForExistingShops({
            payload,
            findShops: async () => shops,
        });
        payload.logger.info(
            `[tenant-backfill] examined ${shops.length} shop(s) — ${result.synced} synced, ${result.failed} failed`,
        );
    },
});

// Attach the Shop -> tenant sync listener synchronously so a Shop save during
// admin startup (seed scripts, webhook racing module load, etc.) can't slip in
// before the post-save hook is registered. The Payload instance is resolved
// lazily on first fire — by then `configPromise` will have settled.
attachShopSync(Shop.model as never, () => getPayload({ config: configPromise }));

export default configPromise;
