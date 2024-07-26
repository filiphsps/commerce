'use client';

import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';

import type { OnlineShop } from '@nordcom/commerce-db';
import { MissingContextProviderError } from '@nordcom/commerce-errors';
import type { As } from '@nordcom/nordstar';

import { cn } from '@/utils/tailwind';
import { parseGid } from '@shopify/hydrogen-react';

import { useShop } from '@/components/shop/provider';

import type { Product } from '@/api/product';
import type { HTMLProps, ReactNode } from 'react';

export type OkendoContextReturns = {};
export type OkendoProviderBase = {
    ready: boolean;
    initializeWidget: (container: any) => Promise<void>;
};
export interface OkendoContextValue extends OkendoProviderBase, OkendoContextReturns {}

export const OkendoContext = createContext<OkendoContextValue | null>(null);

export type OkendoProviderProps = {
    shop: OnlineShop;
    children: ReactNode;
};
export const OkendoProvider = ({ shop, children }: OkendoProviderProps) => {
    const { locale } = useShop();
    const okendoAvailable = !!shop.integrations.okendo;

    const [ready, setReady] = useState(false);
    useEffect(() => {
        const notifyReady = () => setReady(true);

        if (okendoAvailable && !ready && !!window.okeWidgetApi?.initWidget) {
            return notifyReady();
        }

        document.addEventListener('oke-script-loaded', notifyReady);
        return () => document.removeEventListener('oke-script-loaded', notifyReady);
    }, [, okendoAvailable]);

    const value = useMemo(
        () => ({
            ready: ready && !!window.okeWidgetApi?.initWidget,
            initializeWidget: async (container: any) => {
                if (!ready && !!window.okeWidgetApi?.initWidget) {
                    throw new Error('Okendo widget not ready');
                }

                await window.okeWidgetApi.setWidgetLocale(locale);
                //await window.okeWidgetApi.setWidgetSettings();
                await window.okeWidgetApi.initWidget(container, true);
            }
        }),
        [, ready]
    );

    return <OkendoContext.Provider value={okendoAvailable ? value : null}>{children}</OkendoContext.Provider>;
};

export const useOkendo = (): OkendoContextValue => {
    const context = useContext(OkendoContext);
    if (!context) {
        throw new MissingContextProviderError('useOkendo', 'OkendoProvider');
    }

    return context;
};

export type OkendoReviewsWidgetProps = {
    product: Product;
    as?: As;
} & HTMLProps<HTMLDivElement>;
export const OkendoReviewsWidget = ({
    as: Tag = 'div',
    product,
    children,
    className,
    ...props
}: OkendoReviewsWidgetProps) => {
    const { newShop: shop } = useShop();
    const { ready, initializeWidget } = useOkendo();

    const [] = useState(false);
    const widget = useRef<HTMLDivElement>(null);

    const okendoAvailable = !!shop.integrations.okendo;
    useEffect(() => {
        if (!okendoAvailable || !ready || !widget.current) {
            return;
        }

        void initializeWidget(widget.current);
    }, [ready, widget, ready]);

    if (!okendoAvailable) {
        return null;
    }

    const gid = parseGid(product.id).id;
    return (
        <>
            <Tag
                ref={widget}
                data-oke-widget
                data-oke-reviews-product-id={`shopify-${gid}`}
                className={cn('empty:hidden', className)}
                suppressHydrationWarning={true}
                {...props}
            >
                {children}
            </Tag>
        </>
    );
};

export type OkendoStarsWidgetProps = {
    product: Product;
    as?: As;
} & HTMLProps<HTMLDivElement>;
export const OkendoStarsWidget = ({
    as: Tag = 'div',
    product,
    children,
    className,
    ...props
}: OkendoStarsWidgetProps) => {
    const { newShop: shop } = useShop();
    const { ready, initializeWidget } = useOkendo();
    const widget = useRef<HTMLDivElement>(null);

    const [initialized, setInitialized] = useState(false);
    const [jsonLd, setJsonLd] = useState<string | null>(null);

    const okendoAvailable = !!shop.integrations.okendo;

    useEffect(() => {
        if (!okendoAvailable || !ready || !widget.current) {
            return;
        }

        void initializeWidget(widget.current).then(() => setInitialized(true));
    }, [ready, widget, ready]);

    useEffect(() => {
        if (!okendoAvailable || !initialized || !widget.current) {
            return;
        }

        const jsonLd = widget.current.querySelector('[data-oke-metafield-data]')?.innerHTML;

        // Remove jsonLd from the widget element.
        widget.current.querySelector('[data-oke-metafield-data]')?.remove();

        if (!jsonLd) return;
        setJsonLd(jsonLd);
    }, [, initialized, widget]);

    if (!okendoAvailable) {
        return null;
    }

    const gid = parseGid(product.id).id;
    return (
        <>
            <Tag
                ref={widget}
                data-oke-star-rating
                data-oke-reviews-product-id={`shopify-${gid}`}
                className={cn('empty:hidden', className)}
                suppressHydrationWarning={true}
                {...props}
            >
                {children}
            </Tag>

            {/* Metadata */}
            {jsonLd ? (
                <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
            ) : null}
        </>
    );
};
