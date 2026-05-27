'use client';

import type { OnlineShop } from '@nordcom/commerce-db';
import { UnknownCommerceProviderError } from '@nordcom/commerce-errors';
import { trace } from '@opentelemetry/api';
import { ShopifyProvider } from '@shopify/hydrogen-react';
import { Fragment, type ReactNode, Suspense } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { Toaster as ToasterProvider } from 'sonner';
import { LiveChatProvider } from '@/components/live-chat-provider';
import { ShopProvider } from '@/components/shop/provider';
import { useCartUtils } from '@/hooks/useCartUtils';
import { BuildConfig } from '@/utils/build-config';
import type { CurrencyCode, Locale } from '@/utils/locale';

/**
 * Mounts required cart utilities hooks inside a Suspense boundary without rendering visible content.
 *
 * @param props.locale - Locale forwarded to cart utilities.
 * @param props.children - Optional children passed through unchanged.
 * @returns The `children` node, or `null` when none are provided.
 */
const RequiredHooks = ({ locale, children = null }: { shop: OnlineShop; locale: Locale; children?: ReactNode }) => {
    void useCartUtils({ locale });

    return children;
};

/**
 * Wraps children with the commerce provider that matches the shop's configured commerce provider type.
 *
 * @param props.shop - Shop record supplying the commerce provider configuration.
 * @param props.locale - Locale used to configure country and language on the provider.
 * @param props.children - Subtree that consumes commerce context.
 * @returns The Shopify provider wrapping `children`, or a passthrough fragment when the domain is missing.
 * @throws {UnknownCommerceProviderError} When the shop's commerce provider type is not supported.
 */
const CommerceProvider = ({ shop, locale, children }: { shop: OnlineShop; locale: Locale; children: ReactNode }) => {
    switch (shop.commerceProvider.type) {
        case 'shopify': {
            if (!shop.commerceProvider.domain) {
                // TODO: Surface this as a tenant-config validation error during shop lookup.
                //       For now, render without the Shopify cart provider — content pages still work,
                //       cart/checkout features will be unavailable.
                trace.getActiveSpan()?.addEvent('providers_registry.missing_commerce_domain', {
                    'shop.domain': shop.domain,
                });
                return <>{children}</>;
            }

            return (
                <ShopifyProvider
                    storefrontId={shop.commerceProvider.storefrontId}
                    storeDomain={`https://${shop.commerceProvider.domain}`}
                    storefrontApiVersion={BuildConfig.shopify.api}
                    storefrontToken={shop.commerceProvider.authentication.publicToken}
                    countryIsoCode={locale.country!}
                    languageIsoCode={locale.language}
                >
                    {children}
                </ShopifyProvider>
            );
        }
        default: {
            throw new UnknownCommerceProviderError(shop.commerceProvider.type);
        }
    }
};

/**
 * Root client provider tree composing shop, commerce, cart utilities, live chat, and toast providers.
 *
 * @param props.shop - Shop record forwarded to every nested provider.
 * @param props.currency - ISO currency code; defaults to `'USD'`.
 * @param props.locale - Locale forwarded to every nested provider.
 * @param props.children - Application subtree rendered inside the full provider stack.
 * @param props.toolbars - When `true` (default), mounts the live-chat provider and toast notifications.
 * @returns The composed provider tree wrapping `children`.
 */
const ProvidersRegistry = ({
    shop,
    currency = 'USD',
    locale,
    children,
    toolbars = true,
}: {
    shop: OnlineShop;
    domain: string;
    currency?: CurrencyCode;
    locale: Locale;
    children: ReactNode;
    toolbars?: boolean;
}) => {
    return (
        <ErrorBoundary fallbackRender={() => null}>
            <ShopProvider shop={shop} currency={currency} locale={locale}>
                <CommerceProvider shop={shop} locale={locale}>
                    <ErrorBoundary fallbackRender={() => null}>
                        <Suspense fallback={<Fragment />}>
                            <RequiredHooks shop={shop} locale={locale} />
                        </Suspense>

                        {toolbars ? (
                            <Suspense fallback={children}>
                                <LiveChatProvider shop={shop} locale={locale}>
                                    {children}
                                </LiveChatProvider>

                                <ToasterProvider
                                    theme="dark"
                                    position="bottom-left"
                                    expand={true}
                                    duration={5000}
                                    gap={4}
                                    visibleToasts={2}
                                    toastOptions={{
                                        duration: 2500,
                                        classNames: {
                                            toast: 'toast-notification',
                                        },
                                    }}
                                />
                            </Suspense>
                        ) : (
                            children
                        )}
                    </ErrorBoundary>
                </CommerceProvider>
            </ShopProvider>
        </ErrorBoundary>
    );
};
export default ProvidersRegistry;
