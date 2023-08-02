import {
    AnalyticsPageType,
    ProductProvider,
    ShopifyAnalyticsProduct,
    ShopifyPageViewPayload,
    useCart,
    useProduct
} from '@shopify/hydrogen-react';
import { Badge, BadgeContainer } from '@/components/Badges';
import type {
    Collection,
    Product,
    ProductEdge,
    ProductVariantEdge
} from '@shopify/hydrogen-react/storefront-api-types';
import { FiCheck, FiMinus, FiPlus, FiShoppingCart } from 'react-icons/fi';
import type { GetStaticProps, InferGetStaticPropsType } from 'next';
import { NextSeo, ProductJsonLd } from 'next-seo';
import { ProductApi, ProductVisuals, ProductVisualsApi, ProductsApi } from '../../src/api/product';
import React, { FunctionComponent, useCallback, useEffect, useRef, useState } from 'react';
import { SSRConfig, useTranslation } from 'next-i18next';
import { StringParam, useQueryParam, withDefault } from 'use-query-params';
import styled, { css } from 'styled-components';

import Breadcrumbs from '@/components/Breadcrumbs';
import { Button } from '@/components/Button';
import CollectionBlock from '@/components/CollectionBlock';
import { Config } from '../../src/util/Config';
import Content from '@/components/Content';
import { Currency } from 'react-tender';
import Error from 'next/error';
import { Input } from '@/components/Input';
import Link from 'next/link';
import { NextLocaleToLocale } from 'src/util/Locale';
import Page from '@/components/Page';
import PageContent from '@/components/PageContent';
import PageHeader from '@/components/PageHeader';
import type { ProductPageDocument } from 'prismicio-types';
import { ProductToMerchantsCenterId } from 'src/util/MerchantsCenterId';
import { RecommendationApi } from '../../src/api/recommendation';
import { RedirectProductApi } from '../../src/api/redirects';
import type { ReviewsModel } from '../../src/models/ReviewsModel';
import { ReviewsProductApi } from '../../src/api/reviews';
import { SliceZone } from '@prismicio/react';
import type { StoreModel } from '../../src/models/StoreModel';
import { Subtitle } from '@/components/PageHeader/PageHeader';
import { asText } from '@prismicio/client';
import { captureException } from '@sentry/nextjs';
import { components } from '../../slices';
import { createClient } from 'prismicio';
import dynamic from 'next/dynamic';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { titleToHandle } from '../../src/util/TitleToHandle';
import { useRouter } from 'next/router';
import useSWR from 'swr';

const Gallery = dynamic(() => import('@/components/Gallery'), { ssr: false });
const ProductOptions = dynamic(() =>
    import('@/components/ProductOptions').then((c) => c.ProductOptions)
);
const InfoLines = dynamic(
    () => import('@/components/products/InfoLines').then((c) => c.InfoLines),
    { ssr: false }
);
const Reviews = dynamic(() => import('@/components/Reviews'), { ssr: false });
const ReviewStars = dynamic(() => import('@/components/ReviewStars'), { ssr: false });

// TODO: replace this with generic label.
const Label = styled.label`
    text-transform: uppercase;
    font-weight: 700;
    font-size: 1.5rem;
    line-height: 1.75rem;
`;

const ProductContainerWrapper = styled.div`
    position: relative;
    display: grid;
    justify-content: stretch;
    align-items: center;
`;
const ProductContainer = styled.div`
    position: relative;
    display: grid;
    grid-template-areas: 'assets' 'header' 'details';
    grid-template-columns: 1fr;
    gap: var(--block-spacer);

    @media (min-width: 950px) {
        gap: var(--block-spacer-large) calc(var(--block-spacer-large) * 2);
        grid-template-areas:
            'assets header'
            'assets details';
        grid-template-columns: 1fr 1fr;
        grid-template-rows: auto 1fr;
        gap: var(--block-spacer-large);
    }
    @media (min-width: 1260px) {
        grid-template-columns: 1fr 52rem;
        gap: calc(var(--block-padding-large) * 2);
    }
`;
const Assets = styled.div`
    grid-area: assets;
    display: flex;
    justify-content: center;
    align-items: start;
    width: 100%;
    height: fit-content;

    @media (min-width: 950px) {
        position: sticky;
        top: 8rem;
    }
`;
const Details = styled.div`
    grid-area: details;
    display: flex;
    flex-direction: column;
    gap: var(--block-spacer);
    width: 100%;

    @media (min-width: 950px) {
        position: sticky;
        top: 8rem;
    }
`;
const Options = styled.div`
    display: flex;
    flex-direction: row;
    flex-wrap: wrap;
    justify-content: start;
    align-items: start;
    gap: var(--block-spacer);
`;

// FIXME: Turn this into a component

const Description = styled(Content)`
    overflow-x: hidden;
`;
const AddToCart = styled(Button)<{ $added?: boolean }>`
    display: flex;
    justify-content: center;
    align-items: center;
    gap: var(--block-spacer);
    height: 100%;
    width: 100%;
    padding: var(--block-padding-large);
    margin: var(--block-padding-small) 0px;
    background-color: var(--accent-secondary);
    color: var(--accent-secondary-text);
    border-radius: var(--block-border-radius-large);
    font-size: 2rem;
    line-height: 2.25rem;
    font-weight: 600;

    ${({ $added }) =>
        $added &&
        css`
            &&,
            &:hover,
            &:active {
                outline: var(--color-green) solid var(--block-border-width);
                outline-offset: calc(var(--block-border-width) * -1);
                background: var(--color-green-light);
                color: var(--color-green);
            }
        `}

    svg {
        stroke-width: 0.3ex;
        font-size: 1.75rem;
    }

    @media (min-width: 950px) {
        height: 5.5rem;
        margin: 0px;
        font-size: 2rem;
        line-height: 2rem;
    }
`;
const Quantity = styled(Input)`
    padding: 0px;
    height: 100%;
    width: 100%;
    text-align: center;
    font-size: 1.5rem;
`;
const QuantitySelector = styled.div`
    display: grid;
    grid-template-rows: auto 1fr;
    grid-template-columns: 1fr;
    gap: var(--block-spacer-small);
    color: var(--color-dark);

    ${Input} {
        border-width: 0px;
    }
`;
const QuantityWrapper = styled.div`
    overflow: hidden;
    display: grid;
    grid-template-columns: 4rem 1fr 4rem;
    height: 3.75rem;
    width: min-content;
    background: var(--color-bright);
    border-radius: var(--block-border-radius);
    border: 0.25rem solid var(--color-block);
    outline: none;

    @media (min-width: 950px) {
        height: 4.25rem;
        width: min-content;
    }

    ${Button} {
        display: flex;
        justify-content: center;
        align-items: center;
        height: 100%;
        width: 100%;
        font-size: 1.75rem;
        line-height: 1.75rem;
        background: none;
        color: var(--color-dark);

        &:enabled:hover {
            background: var(--accent-primary);
            color: var(--accent-primary-text);
        }

        svg {
            stroke-width: 0.4ex;
            font-size: 2rem;
        }
    }

    ${Input} {
        height: 100%;
        min-width: 4rem;

        @media (min-width: 950px) {
            min-width: 4rem;
        }
    }
`;

const Header = styled.div`
    display: flex;
    flex-direction: column;
    gap: var(--block-spacer);
`;
const HeaderContent = styled.div`
    grid-area: header;
    display: grid;
    grid-template-areas:
        'page-header pricing'
        'reviews reviews';
    grid-template-columns: auto 1fr;
    gap: var(--block-spacer);
    justify-content: space-between;
    margin-bottom: var(--block-padding-large);

    h3 {
        font-size: 2.25rem;
        line-height: 2.25rem;
        margin-bottom: calc(var(--block-spacer-small) * -1);
    }

    h2 {
        font-size: 3rem;
        line-height: 3rem;
        margin-bottom: calc(var(--block-spacer-small) * -1);
        color: var(--accent-secondary-dark);
    }

    @media (min-width: 950px) {
        margin-bottom: 0px;
    }

    @media (min-width: 1260px) {
        h3 {
            font-size: 2.75rem;
            line-height: 3.25rem;
            margin-bottom: calc(var(--block-spacer-small) * -1);
        }

        h2 {
            font-size: 3.25rem;
            line-height: 3.5rem;
        }
    }
`;

const Price = styled.div<{ $sale?: boolean; $highlight?: boolean }>`
    position: relative;
    display: block;
    font-size: 3rem;
    line-height: 100%;
    font-weight: 600;

    ${({ $sale }) =>
        $sale &&
        css`
            font-size: 2rem;

            @media (max-width: 950px) {
                font-size: 1.75rem;
            }

            &:before {
                position: absolute;
                content: '';
                left: 0;
                top: 50%;
                right: 0;
                border-top: 0.2rem solid;
                border-color: inherit;
                transform: rotate(-5deg);
            }
        `}
    ${({ $highlight }) =>
        $highlight &&
        css`
            color: var(--color-sale);
        `}
`;

const PriceContainer = styled.div`
    grid-area: pricing;
    display: flex;
    justify-content: center;
    align-items: end;
    flex-direction: column;
    height: 100%;
    color: var(--accent-primary-dark);

    @media (min-width: 1260px) {
        min-width: 12rem;
    }
`;

const RecommendationsContent = styled(PageContent)`
    z-index: 1;
    width: 100%;
`;
const Recommendations = styled.div`
    z-index: 0;
    display: flex;
    flex-direction: column;
    gap: var(--block-spacer-large);
    width: 100%;
    margin: var(--block-spacer) 0px;
    padding: var(--block-padding-large);
    border-radius: var(--block-border-radius);
    background: var(--color-block);

    &::before {
        z-index: -1;
        content: '';
        position: absolute;
        inset: 0;
        background: transparent;
        transition: 250ms ease-in-out all;
        pointer-events: none;

        @media (min-width: 1465px) {
            --size: calc(var(--page-width) + var(--block-padding-large));
            left: calc(-100vw / 2 + var(--size) / 2);
            right: calc(-100vw / 2 + var(--size) / 2);
            bottom: calc(var(--block-spacer-large) * -1);
        }
    }
`;
const RecommendationsTitle = styled.h3`
    //max-width: 50vw;
    font-weight: 500;
    font-size: 2.5rem;
    line-height: 3.25rem;
    color: var(--color-dark);
    text-wrap: balance;
    text-align: center;

    @media (max-width: 950px) {
        font-size: 2.25rem;
        line-height: 2.75rem;
    }
`;

const Tabs = styled.div`
    display: flex;
    gap: var(--block-padding-large);
    width: 100%;
    margin-top: var(--block-spacer);
`;
const Tab = styled.div`
    color: var(--color-gray);
    text-align: center;
    font-size: 1.5rem;
    line-height: 1.75rem;
    font-weight: 500;
    transition: 250ms ease-in-out;
    cursor: pointer;
    user-select: none;

    &.Active,
    &:hover {
        color: var(--accent-primary-dark);
        font-weight: 700;
    }
`;
const TabContent = styled.div`
    display: none;
    overflow: hidden;
    height: 0px;

    &.Active {
        display: flex;
        overflow: unset;
        flex-direction: column;
        flex-grow: 1;
        gap: var(--block-spacer);
        height: 100%;

        ${Description} {
            overflow: unset;
        }
    }
`;
const InformationContent = styled(TabContent)`
    color: var(--color-dark);

    &.Active {
        gap: 1.5rem;

        p {
            font-size: 1.5rem;
            line-height: 1.75rem;
        }

        ${Content} {
            padding: var(--block-padding-large);
            border-radius: var(--block-border-radius);
            background: var(--color-block);
        }
    }
`;

const ReviewsContainer = styled.div`
    grid-area: reviews;
`;

const ProductPageContent = styled(PageContent)<{ background?: string }>`
    position: relative;

    &::before {
        content: '';
        position: absolute;
        inset: 0;
        height: 0;
        pointer-events: none;
        background: ${({ background }) => background || 'var(--accent-secondary-light)'};
        transition:
            400ms ease-in-out height,
            250ms ease-in-out right;

        @media (min-width: 1260px) {
            top: 0;
            left: -50vw;
            right: 100vw;
            height: 100%;
        }
    }
`;

const Container = styled(Page)`
    &.Pastel {
        ${ProductPageContent} {
            &::before {
                inset: 0;
                height: 40vh;

                @media (min-width: 1260px) {
                    left: -50vw;
                    right: calc(52rem + var(--block-padding-large) * 2);
                    height: 100%;
                }
            }
        }
    }
`;

const ProductPage: FunctionComponent<InferGetStaticPropsType<typeof getStaticProps>> = ({
    page,
    visuals: visualsData,
    recommendations: recommendationsData,
    reviews: reviewsData,
    store,

    initialVariantId
}) => {
    const router = useRouter();
    const { t } = useTranslation('common');
    const cart = useCart();
    const [variantQuery, setVariantQuery] = useQueryParam('variant', withDefault(StringParam, ''));
    const { product: productData, setSelectedOption, selectedVariant } = useProduct();
    const [pastel, setPastel] = useState(false);

    const addedTimeout = useRef<ReturnType<typeof setTimeout>>();

    const [added, setAdded] = useState(false);
    const [quantity, setQuantity] = useState(1);
    const [tab, setTab] = useState('details');

    useEffect(() => {
        if (
            !router.isReady ||
            !initialVariantId ||
            variantQuery !== initialVariantId ||
            !selectedVariant?.id
        )
            return;

        const id = selectedVariant?.id?.split('/').at(-1);
        setVariantQuery(id, 'replaceIn');
    }, [router.isReady, selectedVariant]);

    const { data: product } = useSWR(
        {
            handle: productData?.handle!,
            locale: router.locale
        },
        ProductApi,
        {
            fallbackData: productData as Product
        }
    );

    const { data: visuals } = useSWR(
        {
            id: (product as any).visuals?.value,
            locale: router.locale
        },
        ProductVisualsApi,
        {
            fallbackData: visualsData as ProductVisuals | undefined
        }
    );

    const { data: recommendations } = useSWR(
        [`recommendations_${product?.id}`],
        () =>
            (product?.id &&
                RecommendationApi({
                    id: product?.id!,
                    locale: router.locale
                })) ||
            undefined,
        {
            fallbackData: recommendationsData || undefined
        }
    );

    const { data: reviews } = useSWR(
        [`reviews_${product?.id}`],
        () =>
            (product?.id &&
                ReviewsProductApi({
                    id: product?.id!,
                    locale: router.locale
                })) ||
            undefined,
        {
            fallbackData: reviewsData || undefined
        }
    );

    useEffect(() => {
        if (!visuals?.transparentBackgrounds || pastel) return;
        setTimeout(() => {
            setPastel(true);
        }, 250);
    }, [visuals]);

    const setProductOption = useCallback(
        ({ name, value }: { name: string; value: string }) => {
            setSelectedOption(name, value);
        },
        [setSelectedOption, product, selectedVariant]
    );

    const addOrUpdateCartLine = useCallback(
        ({ quantity, variantId }: { quantity: number; variantId: string }) => {
            cart.linesAdd([
                {
                    merchandiseId: variantId,
                    quantity: quantity
                }
            ]);

            if (addedTimeout.current) clearTimeout(addedTimeout.current);
            setAdded(true);
            addedTimeout.current = setTimeout(() => {
                setAdded(false);
            }, 3000);
        },
        [cart, selectedVariant, quantity, addedTimeout]
    );

    // This should never be able to happen at this moment.
    // TODO: Placeholders to support things like this?
    if (!store || !product) return null;

    // TODO: this wont be needed once we properly init it ourselves
    const cartReady = ['uninitialized', 'idle'].includes(cart.status);

    const pricing = (
        <PriceContainer>
            {selectedVariant?.compareAtPrice && (
                <Price $sale>
                    <Currency
                        value={Number.parseFloat(selectedVariant?.compareAtPrice?.amount!)}
                        currency={
                            selectedVariant?.price?.currencyCode! || Config.i18n.currencies[0]
                        }
                    />
                </Price>
            )}
            <Price $highlight={selectedVariant?.compareAtPrice != null}>
                <Currency
                    value={Number.parseFloat(selectedVariant?.price?.amount!)}
                    currency={selectedVariant?.price?.currencyCode! || Config.i18n.currencies[0]}
                />
            </Price>
        </PriceContainer>
    );
    const information = (
        <Header>
            <HeaderContent>
                <PageHeader
                    title={product.title!}
                    subtitle={
                        <Link href={`/collections/${titleToHandle(product.vendor!)}/`}>
                            {product.vendor}
                        </Link>
                    }
                    reverse
                />

                {pricing}

                {(reviews?.count && reviews.count > 0 && (
                    <ReviewsContainer>
                        <ReviewStars
                            score={reviews?.rating || 0}
                            totalReviews={reviews?.count || 0}
                        />
                    </ReviewsContainer>
                )) ||
                    null}
            </HeaderContent>
        </Header>
    );
    const addToCartAction = (
        <AddToCart
            type="button"
            title={t('add-to-cart')}
            $added={added}
            disabled={!cartReady || quantity <= 0 || !selectedVariant?.availableForSale}
            onClick={() =>
                cartReady && addOrUpdateCartLine({ quantity, variantId: selectedVariant?.id! })
            }
        >
            {(() => {
                if (!selectedVariant?.availableForSale)
                    return (
                        <>
                            <span data-nosnippet>{t('out-of-stock')}</span>
                        </>
                    );
                else if (!cartReady)
                    return (
                        <>
                            <span data-nosnippet>{t('cart-not-ready')}.</span>
                        </>
                    );
                else if (added)
                    return (
                        <>
                            <FiCheck />
                            <span data-nosnippet>{t('added-to-cart')}</span>
                        </>
                    );
                return (
                    <>
                        <FiShoppingCart />
                        <span data-nosnippet> {t('add-to-cart')}</span>
                    </>
                );
            })()}
        </AddToCart>
    );
    const quantityAction = (
        <QuantitySelector>
            <Label>Quantity</Label>
            <QuantityWrapper>
                <Button type="button" title="Decrease" onClick={() => setQuantity(quantity - 1)}>
                    <FiMinus />
                </Button>
                <Quantity
                    type="number"
                    value={quantity}
                    onChange={(event) => {
                        const val = parseInt(event.target.value);
                        setQuantity(val);
                    }}
                />
                <Button type="button" title="Increase" onClick={() => setQuantity(quantity + 1)}>
                    <FiPlus />
                </Button>
            </QuantityWrapper>
        </QuantitySelector>
    );

    return (
        <Container
            className={`ProductPage ${(pastel && 'Pastel') || ''}`}
            style={
                (visuals &&
                    ({
                        '--accent-primary': visuals?.primaryAccent || '#F9EFD2',
                        '--accent-primary-text':
                            (visuals.primaryAccentDark && 'var(--color-bright)') ||
                            'var(--color-dark)',

                        '--accent-secondary': visuals?.secondaryAccent || '#E8A0BF',
                        '--accent-secondary-text':
                            (visuals.secondaryAccentDark && 'var(--color-bright)') ||
                            'var(--color-dark)',
                        '--accent-primary-light':
                            'color-mix(in srgb, var(--accent-primary) 65%, var(--color-bright))',
                        '--accent-primary-dark':
                            'color-mix(in srgb, var(--accent-primary) 65%, var(--color-dark))',
                        '--accent-secondary-light':
                            'color-mix(in srgb, var(--accent-secondary) 35%, var(--color-bright))',
                        '--accent-secondary-dark':
                            'color-mix(in srgb, var(--accent-secondary) 65%, var(--color-dark))'
                    } as React.CSSProperties)) ||
                {}
            }
        >
            <NextSeo
                title={`${product?.seo?.title || product?.title}`}
                description={product?.seo?.description || product?.description || ''}
                canonical={`https://${Config.domain}/${router.locale}/products/${product.handle}/`}
                languageAlternates={
                    router.locales?.map((locale) => ({
                        hrefLang: locale,
                        href: `https://${Config.domain}/${
                            (locale !== 'x-default' && `${locale}/`) || ''
                        }products/${product.handle}/`
                    })) || []
                }
                additionalMetaTags={
                    ((product as any).keywords?.value && [
                        {
                            property: 'keywords',
                            content: (product as any).keywords?.value
                        }
                    ]) ||
                    []
                }
                openGraph={{
                    url: `https://${Config.domain}/products/${product.handle}/`,
                    type: 'website',
                    title: page?.data.meta_title || product.seo?.title || product.title,
                    description:
                        (page?.data.meta_description && asText(page?.data.meta_description)) ||
                        product?.seo?.description ||
                        product?.description ||
                        '',
                    siteName: store?.name,
                    locale: (router.locale !== 'x-default' && router.locale) || router.locales?.[1],
                    images: [
                        ...((page?.data?.meta_image && [
                            {
                                url: page?.data?.meta_image!.url as string,
                                width: page?.data?.meta_image.dimensions?.width as number,
                                height: page?.data?.meta_image.dimensions?.height as number,
                                alt: page?.data?.meta_image.alt || '',
                                secureUrl: page?.data?.meta_image.url as string
                            }
                        ]) ||
                            []),
                        ...(product.images?.edges
                            ?.map((edge) => {
                                const image = edge!.node;

                                return {
                                    url: image!.url as string,
                                    width: image!.width as number,
                                    height: image!.height as number,
                                    alt: image!.altText || '',
                                    secureUrl: image!.url as string
                                };
                            })
                            .filter((item) => item) || [])
                    ]
                }}
            />

            {product.variants?.edges?.map?.(({ node: variant }: ProductVariantEdge) => (
                <ProductJsonLd
                    key={variant?.id}
                    keyOverride={`item_${variant?.id}`}
                    productName={`${product.vendor} ${product.title} ${variant.title}`}
                    brand={product.vendor}
                    sku={ProductToMerchantsCenterId({
                        locale:
                            (router.locale !== 'x-default' && router.locale) || router.locales?.[1],
                        productId: product.id,
                        variantId: variant.id
                    })}
                    mpn={variant.barcode || variant.sku || undefined}
                    images={
                        (product.images?.edges
                            ?.map?.((edge) => edge?.node?.url)
                            .filter((i) => i) as string[]) || []
                    }
                    description={product.description || ''}
                    aggregateRating={
                        (reviews?.count || 0) > 0 && {
                            ratingValue: `${reviews?.rating || 5}`,
                            reviewCount: `${reviews?.count || 1}`
                        }
                    }
                    offers={[
                        {
                            price: Number.parseFloat(variant.price.amount!),
                            priceCurrency: variant.price.currencyCode,
                            priceValidUntil: `${new Date().getFullYear() + 1}-12-31`,
                            itemCondition: 'https://schema.org/NewCondition',
                            availability: variant.availableForSale
                                ? 'https://schema.org/InStock'
                                : 'https://schema.org/SoldOut',
                            url: `https://${Config.domain}/${router.locale}/products/${
                                product.handle
                            }/?variant=${variant.id.split('/').at(-1)}`,

                            hasMerchantReturnPolicy: {
                                '@type': 'MerchantReturnPolicy',
                                returnPolicyCategory:
                                    'https://schema.org/MerchantReturnNotPermitted'
                            },

                            shippingDetails: {
                                '@type': 'OfferShippingDetails',
                                shippingRate: {
                                    '@type': 'MonetaryAmount',
                                    maxValue: 25,
                                    minValue: 0,
                                    currency: 'USD' //variant.price.currencyCode
                                },
                                shippingDestination: store?.payment?.countries?.map(
                                    ({ isoCode }) => ({
                                        '@type': 'DefinedRegion',
                                        addressCountry: isoCode
                                    })
                                ) || [
                                    {
                                        '@type': 'DefinedRegion',
                                        addressCountry:
                                            (router.locale !== 'x-default' &&
                                                router.locale?.split('-')[1]) ||
                                            router.locales?.[0].split('-')[1]
                                    }
                                ],
                                cutoffTime: '12:00:15Z',
                                deliveryTime: {
                                    '@type': 'ShippingDeliveryTime',
                                    handlingTime: {
                                        '@type': 'QuantitativeValue',
                                        minValue: 0,
                                        maxValue: 3,
                                        unitCode: 'd'
                                    },
                                    transitTime: {
                                        '@type': 'QuantitativeValue',
                                        minValue: 2,
                                        maxValue: 12,
                                        unitCode: 'd'
                                    }
                                }
                            }
                        }
                    ]}
                />
            ))}

            <ProductPageContent
                primary
                background={
                    (visuals?.transparentBackgrounds && 'var(--accent-primary-light)') || undefined
                }
            >
                <ProductContainerWrapper>
                    <ProductContainer>
                        <Assets>
                            <Gallery
                                pastel={visuals?.transparentBackgrounds}
                                background={
                                    (visuals?.transparentBackgrounds && 'transparent') || undefined
                                }
                                previewBackground={
                                    (visuals?.transparentBackgrounds &&
                                        'var(--accent-secondary-light)') ||
                                    undefined
                                }
                                selected={selectedVariant?.image?.id || null}
                                images={(product as any).images || null}
                            />
                        </Assets>

                        {information}

                        <Details>
                            <Options>
                                {quantityAction}
                                <ProductOptions onOptionChange={setProductOption} />
                            </Options>

                            {addToCartAction}
                            <InfoLines product={product} />

                            <SliceZone
                                slices={page?.data.slices}
                                components={components}
                                context={{ store }}
                            />

                            <Tabs>
                                <Tab
                                    className={tab == 'details' ? 'Active' : ''}
                                    onClick={() => setTab('details')}
                                >
                                    Details
                                </Tab>
                                <Tab
                                    className={tab == 'information' ? 'Active' : ''}
                                    onClick={() => setTab('information')}
                                >
                                    Information
                                </Tab>
                                <Tab
                                    className={tab == 'reviews' ? 'Active' : ''}
                                    onClick={() => setTab('reviews')}
                                >
                                    Reviews
                                </Tab>
                            </Tabs>
                            <TabContent className={tab == 'details' ? 'Active' : ''}>
                                <Description
                                    dangerouslySetInnerHTML={{
                                        __html: product.descriptionHtml || ''
                                    }}
                                />

                                <BadgeContainer>
                                    {product?.tags?.map((tag: string) => {
                                        let content: React.ReactNode = tag;
                                        // TODO: make this a lookup somewhere
                                        if (['vegan'].includes(tag.toLowerCase())) {
                                            content = (
                                                <Link
                                                    title={tag}
                                                    href={`/collections/${titleToHandle(tag)}`}
                                                >
                                                    {tag}
                                                </Link>
                                            );
                                        }

                                        return (
                                            <Badge key={tag} className={tag}>
                                                {content}
                                            </Badge>
                                        );
                                    })}
                                </BadgeContainer>
                            </TabContent>

                            <InformationContent className={tab == 'information' ? 'Active' : ''}>
                                <Description>
                                    <Subtitle>Ingredients</Subtitle>
                                    <p>
                                        {(product as any)?.ingredients?.value ||
                                            `No ingredients found.`}
                                    </p>
                                </Description>

                                {(product as any)?.originalName?.value && (
                                    <Description>
                                        <Subtitle>Local Product Name</Subtitle>
                                        <p>{(product as any)?.originalName?.value}</p>
                                    </Description>
                                )}

                                <Description>
                                    <Subtitle>SKU/EAN</Subtitle>
                                    <ul>
                                        {product.variants.edges.map((variant) => (
                                            <li key={variant.node.id}>{`${variant.node.title} - ${
                                                variant.node.barcode || 'N/A'
                                            }`}</li>
                                        ))}
                                    </ul>
                                </Description>
                            </InformationContent>

                            <TabContent className={tab == 'reviews' ? 'Active' : ''}>
                                <Reviews product={product as any} reviews={reviews} />
                            </TabContent>
                        </Details>
                    </ProductContainer>
                </ProductContainerWrapper>

                <SliceZone
                    slices={page?.data.slices2}
                    components={components}
                    context={{ store }}
                />

                {recommendations?.length && recommendations.length >= 1 && (
                    <PageContent
                        style={
                            ((pastel && { '--color-block': 'var(--accent-secondary-light)' }) ||
                                {}) as React.CSSProperties
                        }
                    >
                        <Recommendations>
                            <RecommendationsTitle>
                                Frequently enjoyed together with these
                            </RecommendationsTitle>
                            <RecommendationsContent>
                                <CollectionBlock
                                    data={
                                        {
                                            products: {
                                                edges: recommendations.map((item) => ({
                                                    node: item
                                                }))
                                            }
                                        } as Collection
                                    }
                                    isHorizontal
                                    store={store}
                                />
                            </RecommendationsContent>
                        </Recommendations>
                    </PageContent>
                )}

                <Breadcrumbs
                    pages={[
                        {
                            title: product.vendor,
                            url: `/collections/${titleToHandle(product.vendor!)}`
                        },
                        {
                            title: product.title,
                            url: `/products/${product.handle}`
                        }
                    ]}
                    store={store}
                />
            </ProductPageContent>
        </Container>
    );
};

const ProductPageWrapper: FunctionComponent<InferGetStaticPropsType<typeof getStaticProps>> = (
    props
) => {
    const router = useRouter();
    const [variantQuery] = useQueryParam('variant', withDefault(StringParam, null));
    const [initialVariantId, setInitialVariantId] = useState<string | undefined>(undefined);

    useEffect(() => {
        if (
            !router.isReady ||
            variantQuery === null ||
            initialVariantId !== undefined ||
            variantQuery === initialVariantId
        )
            return;

        setInitialVariantId(variantQuery);
    }, [router.isReady, variantQuery]);

    // TODO: Proper error page
    if (!props.product) return <Error statusCode={404} />;
    return (
        <ProductProvider
            data={props.product}
            initialVariantId={
                (initialVariantId &&
                    `gid://shopify/ProductVariant/${initialVariantId?.toString()}`) ||
                undefined
            }
        >
            <ProductPage {...props} initialVariantId={initialVariantId || undefined} />
        </ProductProvider>
    );
};

export async function getStaticPaths({ locales }) {
    const data = await ProductsApi();
    let paths = [
        ...data.products
            ?.map(({ node: product }: ProductEdge) => [
                {
                    params: { handle: product?.handle }
                },
                ...(locales?.map((locale) => ({
                    params: { handle: product?.handle },
                    locale: locale
                })) || [])
            ])
            .flat()
            .filter((a) => a?.params?.handle)
    ];

    return { paths, fallback: 'blocking' };
}

export const getStaticProps: GetStaticProps<{
    page?: ProductPageDocument<string> | null;
    product?: Product | null;
    visuals?: ProductVisuals | null;
    recommendations?: Product[] | null;
    reviews?: ReviewsModel | null;
    store?: StoreModel;
    analytics?: Partial<ShopifyPageViewPayload>;

    // Bogus, will actually come from the wrapper
    initialVariantId?: string | undefined;
}> = async ({ params, locale: localeData, previewData }) => {
    const locale = NextLocaleToLocale(localeData);

    let handle = '';
    if (Array.isArray(params?.handle)) {
        handle = params?.handle?.join('') || '';
    } else {
        handle = params?.handle || '';
    }

    if (!handle || ['null', 'undefined', '[handle]'].includes(handle))
        return {
            notFound: true,
            revalidate: false
        };
    else if (localeData === 'x-default') {
        return {
            props: {} as any,
            revalidate: false
        };
    }

    const redirect = await RedirectProductApi({ handle, locale: locale.locale });
    if (redirect) {
        return {
            redirect: {
                permanent: false,
                destination: redirect
            },
            revalidate: false
        };
    }

    const client = createClient({ previewData });

    let product: Product | null = null;
    let visuals: ProductVisuals | null = null;
    let analyticsProducts: ShopifyAnalyticsProduct[] = [];
    let recommendations: Product[] | null = null;
    let reviews: ReviewsModel | null = null;
    let page: ProductPageDocument<string> | null = null;
    let translations: SSRConfig | undefined = undefined;

    try {
        product = await ProductApi({
            handle,
            locale: locale.locale
        });
    } catch (error) {
        if (error?.message?.includes('404')) {
            return {
                notFound: true
            };
        }

        if (error) captureException(error);
        throw error;
    }

    try {
        translations = await serverSideTranslations(locale.language.toLowerCase(), ['common']);
    } catch (error) {
        console.warn(error);
    }

    if (product) {
        // TODO: Find a better way of handling variants here
        const variant = product?.variants.edges.at(0)?.node!;
        analyticsProducts.push({
            productGid: product?.id!,
            variantGid: variant.id,
            name: product.title!,
            variantName: variant.title,
            brand: product.vendor,
            category: product.productType,
            price: variant.price.amount,
            sku: variant.sku || variant.barcode,
            quantity: 1
        });

        if ((product as any)?.visuals?.value)
            try {
                visuals = await ProductVisualsApi({
                    id: (product as any)?.visuals?.value,
                    locale: locale.locale
                });
            } catch (error: any) {
                if (error) captureException(error);
            }

        try {
            page = await client.getByUID('product_page', handle, {
                lang: locale.locale
            });
        } catch (error) {
            try {
                page = await client.getByUID('product_page', handle);
            } catch {}
        }

        try {
            recommendations = await RecommendationApi({
                id: product?.id,
                locale: locale.locale
            });
        } catch (error: any) {
            if (error) captureException(error);
        }

        try {
            reviews = await ReviewsProductApi({ id: product?.id });
        } catch (error: any) {
            if (error) captureException(error);
        }
    }

    return {
        props: {
            ...translations,
            product,
            visuals,
            page,
            recommendations,
            reviews,
            analytics: {
                pageType: AnalyticsPageType.product,
                resourceId: product?.id || '',
                products: analyticsProducts
            }
        },
        revalidate: 60
    };
};

export default ProductPageWrapper;
