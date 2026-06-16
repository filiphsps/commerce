import type { OnlineShop } from '@nordcom/commerce-db';
import { Error, UnknownShopDomainError } from '@nordcom/commerce-errors';
import type { Metadata } from 'next';
import { cacheLife, cacheTag } from 'next/cache';
import { notFound, unstable_rethrow } from 'next/navigation';
import { Suspense } from 'react';
import { LocalesApi, Shop } from '@/api/_loaders';
import { ShopifyApolloApiClient } from '@/api/shopify';
import { tenantRootTags } from '@/cache';
import { AcceptedPaymentMethods } from '@/components/informational/accepted-payment-methods';
import Breadcrumbs from '@/components/informational/breadcrumbs';
import { BreadcrumbsSkeleton } from '@/components/informational/breadcrumbs.skeleton';
import Heading from '@/components/typography/heading';
import { getDictionary } from '@/i18n/dictionary';
import { NOT_FOUND_HANDLE } from '@/utils/handle';
import { capitalize, getTranslations, Locale } from '@/utils/locale';
import CartContent from './cart-content';

export type CartPageParams = Promise<{ domain: string; locale: string }>;

/**
 * Resolves the shop record for a cart-route domain, cached in isolation.
 *
 * The shop record is keyed only by domain and changes rarely, so it is the one
 * genuinely static fragment of the cart route worth persisting at `max`. The
 * per-locale dictionary is intentionally fetched outside this boundary so cart
 * copy is never frozen at `max` alongside the shop record.
 *
 * Tagged with the tenant-root tags so a shop-record admin edit (theme, locales,
 * credentials) evicts the `max`-lived entry via `revalidateTag`; without a tag
 * the record would stay frozen for the `max` lifetime.
 *
 * @param domain - The tenant hostname to resolve.
 * @returns The matching shop record.
 * @throws Triggers `notFound()` when no shop matches the domain.
 */
async function getCartShop(domain: string): Promise<OnlineShop> {
    'use cache';
    cacheLife('max');

    try {
        const shop = await Shop.findByDomain(domain);
        cacheTag(...tenantRootTags(shop));
        return shop;
    } catch (error: unknown) {
        if (Error.isNotFound(error) || error instanceof UnknownShopDomainError) {
            notFound();
        }

        unstable_rethrow(error);
        throw error;
    }
}

export async function generateMetadata({ params }: { params: CartPageParams }): Promise<Metadata> {
    'use cache';
    cacheLife('max');

    const { domain, locale: localeData } = await params;
    if (!domain || domain === NOT_FOUND_HANDLE) {
        notFound();
    }

    const shop = await getCartShop(domain);
    cacheTag(...tenantRootTags(shop));

    const locale = Locale.from(localeData);
    const api = await ShopifyApolloApiClient({ shop, locale });

    const [locales, i18n] = await Promise.all([LocalesApi({ api }), getDictionary(locale)]);
    const { t } = getTranslations('common', i18n);

    const title = capitalize(t('cart'));
    return {
        title,
        alternates: {
            canonical: `https://${shop.domain}/${locale.code}/cart/`,
            languages: Object.fromEntries(locales.map(({ code }) => [code, `https://${shop.domain}/${code}/cart/`])),
        },
        openGraph: {
            url: `/cart/`,
            type: 'website',
            title,
            siteName: shop.name,
            locale: locale.code,
        },
    };
}

export default async function CartPage({ params }: { params: CartPageParams }) {
    const { domain, locale: localeData } = await params;
    if (!domain || domain === NOT_FOUND_HANDLE) {
        notFound();
    }

    const locale = Locale.from(localeData);

    // Fetched outside any `'use cache'` boundary so updated cart copy is picked
    // up on the next request instead of being frozen for the lifetime of a
    // `max`-cached page entry.
    const i18n = await getDictionary(locale);
    const { t } = getTranslations('common', i18n);

    return (
        <>
            <Suspense key={`pages.cart.breadcrumbs`} fallback={<BreadcrumbsSkeleton />}>
                <div className="-mb-5 empty:hidden md:-mb-9">
                    <Breadcrumbs locale={locale} />
                </div>
            </Suspense>

            <Suspense>
                <CartContent
                    locale={locale}
                    header={<Heading title={capitalize(t('cart'))} />}
                    i18n={i18n}
                    paymentMethods={<CartPaymentMethods domain={domain} locale={locale} />}
                />
            </Suspense>
        </>
    );
}

/**
 * Cached accepted-payment-methods row for the cart summary footer.
 *
 * The badges flow into the client {@link CartContent} → `CartSidebar` → `CartSummary` tree as a
 * serialized `paymentMethods` prop. Rendering the privileged payment-settings read inside this
 * `'use cache'` boundary — instead of a request-time `connection()` defer — is what keeps the
 * Shopify private token off that boundary: the cache serializes only this component's resolved
 * icon output, never the tainted token the underlying `ShopifyApiClient` carries. The same
 * cache-safe contract the footer relies on (see {@link AcceptedPaymentMethods}); a `connection()`
 * defer here instead leaks the token into the dynamic cart prerender's resume payload.
 *
 * @param props.domain - Tenant hostname, resolved to the shop inside the cache boundary.
 * @param props.locale - Active locale forwarded to the payment-settings client.
 * @returns The accepted-payment-methods badge row, or `null` when none are configured.
 */
async function CartPaymentMethods({ domain, locale }: { domain: string; locale: Locale }): Promise<React.JSX.Element> {
    'use cache';
    cacheLife('days');

    const shop = await getCartShop(domain);
    cacheTag(...tenantRootTags(shop));

    const { t } = getTranslations('common', await getDictionary(locale));

    return <AcceptedPaymentMethods shop={shop} locale={locale} label={t('accepted-payment-methods')} />;
}
