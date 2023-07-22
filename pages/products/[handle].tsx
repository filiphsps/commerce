import * as Sentry from '@sentry/nextjs';

import {
    AnalyticsPageType,
    ProductProvider,
    ShopifyAnalyticsProduct,
    ShopifyPageViewPayload,
    useCart,
    useProduct
} from '@shopify/hydrogen-react';
import { Badge, BadgeContainer } from '@/components/Badges';
import {
    Collection,
    Product,
    ProductEdge,
    ProductVariantEdge
} from '@shopify/hydrogen-react/storefront-api-types';
import { FiCheck, FiMinus, FiPlus, FiShoppingCart } from 'react-icons/fi';
import { FunctionComponent, useCallback, useEffect, useRef, useState } from 'react';
import type { GetStaticProps, InferGetStaticPropsType } from 'next';
import { NextSeo, ProductJsonLd } from 'next-seo';
import { ProductApi, ProductsApi } from '../../src/api/product';
import { StringParam, useQueryParam, withDefault } from 'use-query-params';
import styled, { css } from 'styled-components';

import Breadcrumbs from '@/components/Breadcrumbs';
import { Button } from '@/components/Button';
import CollectionBlock from '@/components/CollectionBlock';
import { Config } from '../../src/util/Config';
import Content from '@/components/Content';
import { Currency } from 'react-tender';
import Error from 'next/error';
import Gallery from '@/components/Gallery';
import { Input } from '@/components/Input';
import Link from 'next/link';
import Page from '@/components/Page';
import PageContent from '@/components/PageContent';
import PageHeader from '@/components/PageHeader';
import { ProductOptions } from '@/components/ProductOptions';
import { ProductPageDocument } from 'prismicio-types';
import { ProductToMerchantsCenterId } from 'src/util/MerchantsCenterId';
import { RecommendationApi } from '../../src/api/recommendation';
import { RedirectProductApi } from '../../src/api/redirects';
import Reviews from '@/components/Reviews';
import { ReviewsModel } from '../../src/models/ReviewsModel';
import { ReviewsProductApi } from '../../src/api/reviews';
import { SliceZone } from '@prismicio/react';
import { StoreModel } from '../../src/models/StoreModel';
import { Subtitle } from '@/components/PageHeader/PageHeader';
import TitleToHandle from '../../src/util/TitleToHandle';
import { components } from '../../slices';
import { createClient } from 'prismicio';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/router';
import useSWR from 'swr';

const ReviewStars = dynamic(() => import('@/components/ReviewStars'));

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

const AddToCart = styled(Button)<{ added: boolean }>`
    display: flex;
    justify-content: center;
    align-items: center;
    gap: var(--block-spacer);
    padding: var(--block-padding-large);
    height: 100%;
    width: 100%;
    font-size: 1.75rem;
    line-height: 2rem;

    ${({ added }) =>
        added &&
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
        stroke-width: 0.4ex;
        font-size: 1.75rem;
    }

    @media (min-width: 950px) {
        font-size: 1.5rem;
        line-height: 1.75rem;
        height: 5rem;
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
    grid-template-columns: 1fr auto;
    gap: var(--block-spacer-small);
    justify-content: space-between;
    margin-bottom: var(--block-padding-large);

    h3 {
        font-size: 2.25rem;
        line-height: 2.75rem;
        margin-bottom: calc(var(--block-spacer-small) * -1);
    }

    h2 {
        font-size: 2.75rem;
        line-height: 3.5rem;
        margin-bottom: calc(var(--block-spacer-small) * -1);
    }

    @media (min-width: 950px) {
        margin-bottom: 0px;
    }

    @media (min-width: 1200px) {
        h3 {
            font-size: 2.75rem;
            line-height: 3.25rem;
            margin-bottom: calc(var(--block-spacer-small) * -1);
        }

        h2 {
            font-size: 3.5rem;
            line-height: 4rem;
        }
    }
`;

const Price = styled.div<{ sale?: boolean; highlight?: boolean }>`
    position: relative;
    display: block;
    font-size: 3rem;
    line-height: 100%;
    font-weight: 600;

    ${(props) =>
        props.sale &&
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
    ${(props) =>
        props.highlight &&
        css`
            color: var(--color-sale);
        `}
`;

const PriceContainer = styled.div`
    grid-area: pricing;
    display: flex;
    justify-content: center;
    align-items: center;
    flex-direction: column;
    height: 100%;
    color: var(--accent-primary);
`;

const Recommendations = styled.div`
    display: flex;
    flex-direction: column;
    gap: var(--block-spacer);
    width: 100%;
    margin: var(--block-spacer) 0px;
    border-radius: var(--block-border-radius);
    overflow: hidden;

    background: var(--color-block);
    padding: var(--block-padding-large);
`;
const RecommendationsTitle = styled.h3`
    font-size: 2.5rem;
    font-weight: 600;
    color: var(--color-dark);

    @media (max-width: 950px) {
        font-size: 2.25rem;
        font-weight: 700;
    }
`;
const RecommendationsContent = styled(PageContent)`
    width: 100%;
`;

const Tabs = styled.div`
    display: flex;
    gap: var(--block-padding-large);
    width: 100%;
    margin-top: var(--block-spacer);
`;
const Tab = styled.div`
    //padding: calc(var(--block-padding) - var(--block-border-width))
    //    calc(var(--block-padding-large) - var(--block-border-width));
    //border: var(--block-border-width) solid var(--color-block);
    //border-radius: var(--block-border-radius);
    //background: var(--color-block);
    color: var(--color-gray);
    text-align: center;
    font-size: 1.5rem;
    line-height: 1.75rem;
    font-weight: 600;
    transition: 250ms ease-in-out;
    cursor: pointer;
    user-select: none;

    &.Active,
    &:hover {
        color: var(--accent-primary);
        border-color: var(--accent-primary);
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

const ProductPage: FunctionComponent<InferGetStaticPropsType<typeof getStaticProps>> = ({
    page,
    recommendations: recommendationsData,
    reviews: reviewsData,
    store,

    initialVariantId
}) => {
    const router = useRouter();
    const cart = useCart();
    const [variantQuery, setVariantQuery] = useQueryParam('variant', withDefault(StringParam, ''));
    const { product: data, setSelectedOption, selectedVariant } = useProduct();

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
            handle: data?.handle!,
            locale: router.locale
        },
        ProductApi,
        {
            fallbackData: data as Product
        }
    );

    const { data: recommendations } = useSWR(
        [`recommendations_${data?.id}`],
        () =>
            (data?.id &&
                RecommendationApi({
                    id: data?.id!,
                    locale: router.locale
                })) ||
            undefined,
        {
            fallbackData: recommendationsData || undefined
        }
    );

    const { data: reviews } = useSWR(
        [`reviews_${data?.id}`],
        () =>
            (data?.id &&
                ReviewsProductApi({
                    id: data?.id!,
                    locale: router.locale
                })) ||
            undefined,
        {
            fallbackData: reviewsData || undefined
        }
    );

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
                <Price sale>
                    <Currency
                        value={Number.parseFloat(selectedVariant?.compareAtPrice?.amount!)}
                        currency={
                            selectedVariant?.price?.currencyCode! || Config.i18n.currencies[0]
                        }
                    />
                </Price>
            )}
            <Price highlight={selectedVariant?.compareAtPrice != null}>
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
                        <Link href={`/collections/${TitleToHandle(product.vendor!)}/`}>
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
            title="Add to Cart"
            added={added}
            disabled={!cartReady || quantity <= 0 || !selectedVariant?.availableForSale}
            onClick={() =>
                cartReady && addOrUpdateCartLine({ quantity, variantId: selectedVariant?.id! })
            }
        >
            {(() => {
                if (!selectedVariant?.availableForSale)
                    return (
                        <>
                            <span data-nosnippet>Out of Stock</span>
                        </>
                    );
                else if (!cartReady)
                    return (
                        <>
                            <span data-nosnippet>Hang on...</span>
                        </>
                    );
                else if (added)
                    return (
                        <>
                            <FiCheck />
                            <span data-nosnippet>Added</span>
                        </>
                    );
                return (
                    <>
                        <FiShoppingCart />
                        <span data-nosnippet> Add to Cart</span>
                    </>
                );
            })()}
        </AddToCart>
    );
    const quantityAction = (
        <QuantitySelector>
            <Label>Quantity</Label>
            <QuantityWrapper>
                <Button type="button" onClick={() => setQuantity(quantity - 1)}>
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
                <Button type="button" onClick={() => setQuantity(quantity + 1)}>
                    <FiPlus />
                </Button>
            </QuantityWrapper>
        </QuantitySelector>
    );

    return (
        <Page
            className="ProductPage"
            style={
                {
                    '--accent-primary': (product as any).accent?.primary || undefined,
                    '--accent-primary-light': (product as any).accent?.primary_light || undefined,
                    '--accent-primary-dark': (product as any).accent?.primary_dark || undefined,
                    '--accent-primary-text':
                        (product as any).accent?.primary_foreground || undefined,

                    '--accent-secondary': (product as any).accent?.secondary || undefined,
                    '--accent-secondary-light':
                        (product as any).accent?.secondary_light || undefined,
                    '--accent-secondary-dark': (product as any).accent?.secondary_dark || undefined,
                    '--accent-secondary-text':
                        (product as any).accent?.secondary_foreground || undefined
                } as React.CSSProperties
            }
        >
            <NextSeo
                title={`${product?.seo?.title || product?.title}`}
                description={product?.seo?.description || product?.description || ''}
                canonical={`https://${Config.domain}/${router.locale}/products/${product.handle}/`}
                languageAlternates={
                    router?.locales?.map((locale) => ({
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
                    url: `https://${Config.domain}/${router.locale}/products/${product.handle}/`,
                    type: 'website',
                    title: `${product.seo?.title || product.title}`,
                    description: product?.seo?.description || product?.description || '',
                    siteName: store.name,
                    locale: (router.locale !== 'x-default' && router.locale) || router.locales?.[1],
                    images:
                        product.images?.edges
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
                            .filter((item) => item) || []
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
                                shippingDestination: store.payment?.countries.map(
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

            <PageContent primary>
                <ProductContainerWrapper>
                    <ProductContainer>
                        <Assets>
                            <Gallery
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
                                    {product?.tags?.map((tag) => (
                                        <Badge key={tag} className={tag}>
                                            {tag}
                                        </Badge>
                                    ))}
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
                    <Recommendations>
                        <RecommendationsTitle>
                            We think you&apos;ll also love these products
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
                )}

                <Breadcrumbs
                    pages={[
                        {
                            title: product.vendor,
                            url: `/collections/${TitleToHandle(product.vendor!)}`
                        },
                        {
                            title: product.title,
                            url: `/products/${product.handle}`
                        }
                    ]}
                    store={store}
                />
            </PageContent>
        </Page>
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
    if (props.errors && props.errors?.length > 0)
        return <Error statusCode={500} title={props.errors?.at(0)} />;
    else if (!props.product) return <Error statusCode={404} />;
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
                ...['en-US', 'en-GB', 'de-DE', 'sv-SE'].map((locale) => ({
                    params: { handle: product?.handle },
                    locale: locale
                }))
            ])
            .flat()
            .filter((a) => a?.params?.handle)
    ];

    return { paths, fallback: 'blocking' };
}

export const getStaticProps: GetStaticProps<{
    errors?: string[] | null;
    page?: ProductPageDocument<string> | null;
    product?: Product | null;
    recommendations?: Product[] | null;
    reviews?: ReviewsModel | null;
    store?: StoreModel;
    analytics?: ShopifyPageViewPayload;

    // Bogus, will actually come from the wrapper
    initialVariantId?: string | undefined;
}> = async ({ params, locale, previewData }) => {
    let handle = '';
    if (Array.isArray(params?.handle)) {
        handle = params?.handle?.join('') || '';
    } else {
        handle = params?.handle || '';
    }

    if (!handle || ['null', 'undefined', '[handle]'].includes(handle) || locale === 'x-default')
        return {
            props: {
                product: null
            },
            revalidate: false
        };

    const redirect = await RedirectProductApi(handle);
    if (redirect) {
        return {
            redirect: {
                permanent: true,
                destination: redirect
            },
            revalidate: 10
        };
    }

    const client = createClient({ previewData });

    let product: Product | null = null;
    let analyticsProducts: ShopifyAnalyticsProduct[] = [];
    let recommendations: Product[] | null = null;
    let reviews: ReviewsModel | null = null;
    let errors: string[] = [];
    let page: ProductPageDocument<string> | null = null;

    try {
        product = await ProductApi({
            handle,
            locale
        });
    } catch (error) {
        if (error?.message?.includes('404')) {
            return {
                notFound: true
            };
        }

        if (error) Sentry.captureException(error);
        return {
            props: {
                errors: (error?.message && [error?.message]) || null
            },
            revalidate: 60
        };
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

        try {
            page = await client.getByUID('product_page', handle, {
                lang: locale
            });
        } catch {
            try {
                page = await client.getByUID('product_page', handle);
            } catch {}
        }

        try {
            recommendations = await RecommendationApi({
                id: product?.id,
                locale
            });
        } catch (error: any) {
            Sentry.captureException(error);
            if (error) errors.push(error?.message?.toString());
        }

        try {
            reviews = await ReviewsProductApi({ id: product?.id });
        } catch (error: any) {
            Sentry.captureException(error);
            if (error) errors.push(error?.message?.toString());
        }
    }

    return {
        props: {
            product,
            page,
            recommendations,
            reviews,
            errors: (errors.length > 0 && errors) || null,
            analytics: {
                pageType: AnalyticsPageType.product,
                resourceId: product?.id || null,
                products: analyticsProducts
            } as any
        },
        revalidate: 60
    };
};

export default ProductPageWrapper;
