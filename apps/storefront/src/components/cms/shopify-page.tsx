import 'server-only';

import { toReactNodes } from '@nordcom/commerce-shopify-html';
import type { NormalizedShopifyPage } from '@/api/shopify/page';

export default function ShopifyPage({ page }: { page: NormalizedShopifyPage }) {
    return <article>{toReactNodes(page.body)}</article>;
}
ShopifyPage.displayName = 'Nordcom.ShopifyPage';
