import 'server-only';

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildPayloadConfig } from '@nordcom/commerce-cms/config';
import { attachShopSync } from '@nordcom/commerce-cms/shop-sync';
import { Shop } from '@nordcom/commerce-db';
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

const PAYLOAD_SECRET = process.env.PAYLOAD_SECRET;
const MONGODB_URI = process.env.MONGODB_URI;

if (!PAYLOAD_SECRET) throw new Error('PAYLOAD_SECRET is required');
if (!MONGODB_URI) throw new Error('MONGODB_URI is required');

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

const configPromise = buildPayloadConfig({
    secret: PAYLOAD_SECRET,
    mongoUrl: MONGODB_URI,
    serverUrl: process.env.SERVER_URL,
    includeAdmin: true,
    enableStorage: true,
    // Payload's mounted /cms admin shell has been removed; auth happens entirely
    // via NextAuth in the co-located routes. Keep disablePasswordLogin: true so
    // Payload's REST /api/users/login refuses password auth — the `disableLocalStrategy`
    // that flows from this value keeps the REST endpoint locked even though
    // there is no UI login form any more.
    disablePasswordLogin: true,
    importMapBaseDir: IMPORT_MAP_BASE_DIR,
    livePreview: { url: buildLivePreviewUrl },
    // Wire sharp through so the `media` collection's `imageSizes` pipeline
    // actually runs — Payload doesn't auto-detect the package and logs
    // "sharp not installed" on every boot otherwise.
    sharp,
});

// Attach the Shop -> tenant sync listener synchronously so a Shop save during
// admin startup (seed scripts, webhook racing module load, etc.) can't slip in
// before the post-save hook is registered. The Payload instance is resolved
// lazily on first fire — by then `configPromise` will have settled.
attachShopSync(Shop.model as never, () => getPayload({ config: configPromise }));

export default configPromise;
