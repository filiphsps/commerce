import 'server-only';

import { buildNextAuthStrategy, computeRolesFromShopMembership } from '@nordcom/commerce-cms/auth';
import { buildPayloadConfig } from '@nordcom/commerce-cms/config';
import { attachShopSync } from '@nordcom/commerce-cms/shop-sync';
import { Shop, User as UserService } from '@nordcom/commerce-db';
import { getPayload } from 'payload';

const PAYLOAD_SECRET = process.env.PAYLOAD_SECRET;
const MONGODB_URI = process.env.MONGODB_URI;
const NEXTAUTH_SECRET = process.env.NEXTAUTH_SECRET ?? process.env.AUTH_SECRET;

if (!PAYLOAD_SECRET) throw new Error('PAYLOAD_SECRET is required');
if (!MONGODB_URI) throw new Error('MONGODB_URI is required');
if (!NEXTAUTH_SECRET) throw new Error('NEXTAUTH_SECRET (or AUTH_SECRET) is required');

const OPERATOR_EMAILS = new Set(
    (process.env.NORDCOM_OPERATOR_EMAILS ?? '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
);

const storefrontBaseUrl = process.env.STOREFRONT_BASE_URL ?? 'http://localhost:1337';

const buildLivePreviewUrl = ({
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
    } catch {
        return undefined;
    }
};

const findShopsForUser = async (email: string): Promise<Array<{ shopId: string }>> => {
    const userId = await lookupUserId(email);
    if (!userId) return [];
    try {
        const shops = await Shop.model.find({ 'collaborators.user': userId }).select('_id').lean();
        return shops.map((s) => ({ shopId: String(s._id) }));
    } catch {
        return [];
    }
};

// Auth-bridge lookup. Runs BEFORE Payload knows who the user is, so every
// local-API call must pass `overrideAccess: true` — otherwise the users
// collection's `create: isAdmin` / `read: req.user` predicates reject us and
// the strategy returns `null user`, sending the visitor to /cms/login.
const findOrCreateUser = async (email: string) => {
    const payload = await getPayload({ config: configPromise });
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
    const created = await payload.create({
        collection: 'users',
        data: {
            email,
            role: OPERATOR_EMAILS.has(email) ? 'admin' : 'editor',
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
};

const recomputeRoles = async (email: string) => {
    const isOperator = OPERATOR_EMAILS.has(email);
    const shopCollaborators = await findShopsForUser(email);
    return computeRolesFromShopMembership({ email, isOperator, shopCollaborators });
};

// Mirror the cookie naming in apps/admin/src/utils/auth.config.ts. In prod
// (NEXTAUTH_URL is set) NextAuth writes a `__Secure-` prefixed cookie; locally
// it uses the bare name. NEXTAUTH_COOKIE_NAME is an explicit override for
// non-default deployments.
const defaultCookieName =
    process.env.NEXTAUTH_URL ? '__Secure-next-auth.session-token' : 'next-auth.session-token';
const strategy = buildNextAuthStrategy({
    secret: NEXTAUTH_SECRET,
    cookieName: process.env.NEXTAUTH_COOKIE_NAME ?? defaultCookieName,
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
    livePreview: { url: buildLivePreviewUrl },
});

// Attach Shop -> tenant sync side-effect once Payload is up.
configPromise
    .then(async () => {
        const payload = await getPayload({ config: configPromise });
        attachShopSync(Shop.model as never, payload);
    })
    .catch((err) => {
        console.error('[payload-config] Failed to attach shop sync:', err);
    });

export default configPromise;
