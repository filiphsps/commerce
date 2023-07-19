import * as Sentry from '@sentry/nextjs';

import { AnalyticsPageType, ProductProvider, useCart, useProduct } from '@shopify/hydrogen-react';
import { Badge, BadgeContainer } from '@/components/Badges';
import {
    Collection,
    Product,
    ProductEdge,
    ProductVariant,
    ProductVariantEdge
} from '@shopify/hydrogen-react/storefront-api-types';
import { FiMinus, FiPlus, FiShoppingCart } from 'react-icons/fi';
import { FunctionComponent, useCallback, useEffect, useState } from 'react';
import { NextSeo, ProductJsonLd } from 'next-seo';
import { ProductApi, ProductsApi } from '../../src/api/product';
import styled, { css } from 'styled-components';

import Breadcrumbs from '@/components/Breadcrumbs';
import { Button } from '@/components/Button';
import CollectionBlock from '@/components/CollectionBlock';
import { Config } from '../../src/util/Config';
import Content from '@/components/Content';
import { Currency } from 'react-tender';
import Error from 'next/error';
import Gallery from '@/components/Gallery';
import { GetStaticPropsResult } from 'next';
import { Input } from '@/components/Input';
import Link from 'next/link';
import Page from '@/components/Page';
import PageContent from '@/components/PageContent';
import PageHeader from '@/components/PageHeader';
import { ProductOptions } from '@/components/ProductOptions';
import { ProductToMerchantsCenterId } from 'src/util/MerchantsCenterId';
import { RecommendationApi } from '../../src/api/recommendation';
import { RedirectProductApi } from '../../src/api/redirects';
import Reviews from '@/components/Reviews';
import { ReviewsModel } from '../../src/models/ReviewsModel';
import { ReviewsProductApi } from '../../src/api/reviews';
import { StoreModel } from '../../src/models/StoreModel';
import { Subtitle } from '@/components/PageHeader/PageHeader';
import TitleToHandle from '../../src/util/TitleToHandle';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/router';
import useSWR from 'swr';
import { useStore } from 'react-context-hook';

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
    gap: var(--block-spacer-large);

    @media (min-width: 950px) {
        gap: var(--block-spacer-large) calc(var(--block-spacer-large) * 2);
        grid-template-areas:
            'assets header'
            'assets details';
        grid-template-columns: 1fr 1fr;
        grid-template-rows: auto 1fr;
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

// FIXME: Turn this into a component

const Description = styled(Content)`
    overflow-x: hidden;
`;

const Actions = styled.div`
    display: grid;
    gap: var(--block-spacer);
    align-items: start;
    flex-direction: column;

    @media (min-width: 950px) {
        flex-direction: row;
        align-items: end;
    }
`;
const AddToCart = styled(Button)<{ added: boolean }>`
    display: flex;
    justify-content: center;
    align-items: center;
    gap: var(--block-spacer);
    height: 6rem;
    width: auto;
    padding-left: 2rem;
    padding-right: 2rem;
    font-size: 1.5rem;
    line-height: 1.5rem;

    // TODO
    ${({ added }) => added && css``}

    svg {
        stroke-width: 0.4ex;
        font-size: 1.75rem;
    }

    @media (max-width: 950px) {
        height: 6rem;
        width: 100%;
    }
`;
const Quantity = styled(Input)`
    height: 4rem;
    padding: 0px;
    //max-width: 10rem;
    text-align: center;
    font-size: 1.5rem;

    @media (max-width: 950px) {
        height: 4.5rem;
        width: 100%;
        max-width: 100%;
    }
`;
const QuantitySelector = styled.div`
    display: grid;
    grid-template-rows: auto 1fr;
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
    height: 4.25rem;
    background: var(--color-bright);
    border-radius: var(--block-border-radius);
    border: 0.25rem solid var(--color-block);
    outline: none;

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
        width: auto;

        @media (min-width: 950px) {
            min-width: 4rem;
        }
    }

    @media (max-width: 950px) {
        height: 4.5rem;
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
    gap: var(--block-spacer-small);

    @media (min-width: 950px) {
        h3 {
            padding-bottom: 0.25rem;
        }
    }
`;

const Price = styled.div<{ sale?: boolean; highlight?: boolean }>`
    position: relative;
    display: block;
    font-size: 3rem;
    line-height: 100%;
    font-weight: 600;

    @media (max-width: 950px) {
        font-size: 2.5rem;
    }

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
    width: 100%;

    padding: var(--block-padding-large);
    border-radius: var(--block-border-radius);
    background: var(--accent-primary);
    color: var(--accent-primary-text);

    @media (min-width: 950px) {
        justify-content: end;
    }
`;

const Recommendations = styled.div`
    display: flex;
    flex-direction: column;
    gap: var(--block-spacer);
    width: 100%;
    margin-top: 1rem;
    border-radius: var(--block-border-radius);
    overflow: hidden;

    background: var(--color-block);
    padding: var(--block-padding-large);

    @media (max-width: 950px) {
        margin: 1rem 0px;
    }
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
    gap: var(--block-spacer);
    width: 100%;
    margin-top: 1rem;
`;
const Tab = styled.div`
    padding: var(--block-padding) var(--block-padding-large);
    border-radius: var(--block-border-radius);
    background: var(--color-block);
    color: var(--color-dark);
    text-align: center;
    font-size: 1.25rem;
    font-weight: 600;
    transition: 250ms ease-in-out;
    cursor: pointer;

    &.Active,
    &:hover {
        background: var(--accent-primary-light);
        color: var(--accent-primary-text);
    }

    &.Active {
        background: var(--accent-primary);
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
    padding: var(--block-padding) var(--block-padding-large);
    border-radius: var(--block-border-radius);
    background: var(--accent-primary);
    color: var(--accent-primary-text);
`;

const PageContainer = styled(Page)``;

interface ProductPageProps {
    error?: string;
    product: Product;
    recommendations?: Product[];
    reviews?: ReviewsModel;
    store: StoreModel;
}
const ProductPage: FunctionComponent<ProductPageProps> = ({
    recommendations: recommendationsData,
    reviews,
    store
}) => {
    const router = useRouter();
    const cart = useCart();
    const { product: data, variants, selectedVariant: initialVariant } = useProduct();
    const [addedToCart, setAddedToCart] = useState(false);
    const [quantity, setQuantity] = useState(1);
    const [tab, setTab] = useState('details');
    const [cartStore, setCartStore] = useStore<any>('cart');

    const { data: product } = useSWR(
        [`product_${data?.handle}`],
        () =>
            ProductApi({
                handle: data?.handle!,
                locale: router.locale
            }) as Promise<Product>,
        {
            fallbackData: data as Product
        }
    );

    const { data: recommendations } = useSWR(
        [(data?.id && `recommendations_${data?.id}`) || ''],
        () =>
            (data?.id &&
                RecommendationApi({
                    id: data?.id!,
                    locale: router.locale
                })) ||
            undefined,
        {
            fallbackData: recommendationsData
        }
    );

    // TODO: Better way to pick default
    const selectedVariant = initialVariant || (variants?.[0]! as ProductVariant);

    // FIXME: Utility function
    const addToCart = useCallback(() => {
        if (!selectedVariant || !selectedVariant.id) return;

        cart.linesAdd([
            {
                merchandiseId: selectedVariant.id,
                quantity
            }
        ]);

        setAddedToCart(true);
        setCartStore({
            ...cartStore,
            item: {
                title: product?.title,
                vendor: product?.vendor,
                variant: {
                    title: selectedVariant.title
                },
                images: [
                    {
                        src: product?.images?.edges?.[0]?.node?.url
                    }
                ]
            },
            open: true
        });

        setTimeout(() => {
            setAddedToCart(false);
        }, 3000);
    }, [product, selectedVariant, quantity, cart, cartStore, setCartStore]);

    // TODO: Move to useAnalytics
    useEffect(() => {
        if (!product || !selectedVariant) return;
        (window as any)?.dataLayer?.push(
            { ecommerce: null },
            {
                // https://developers.google.com/analytics/devguides/collection/ga4/reference/events?client_type=gtm#view_item
                event: 'view_item',

                currency: selectedVariant.price?.currencyCode,
                value: Number.parseFloat(selectedVariant.price?.amount || ''),
                ecommerce: {
                    items: [
                        {
                            item_id: ProductToMerchantsCenterId({
                                locale:
                                    (router.locale !== 'x-default' && router.locale) ||
                                    router.locales?.[1],
                                productId: product.id,
                                variantId: selectedVariant.id!
                            }),
                            item_name: product.title,
                            item_variant: selectedVariant.title,
                            item_brand: product.vendor,
                            currency: selectedVariant.price?.currencyCode,
                            price: Number.parseFloat(selectedVariant.price?.amount!) || undefined,
                            quantity: 1
                        }
                    ]
                }
            }
        );
    }, [cart.lines]);

    // NOTE: this should never happen
    if (!product) return null;

    const pricing = (
        <PriceContainer>
            {selectedVariant.compareAtPrice && (
                <Price sale>
                    <Currency
                        value={Number.parseFloat(selectedVariant.compareAtPrice?.amount!)}
                        currency={selectedVariant.price?.currencyCode! || Config.i18n.currencies[0]}
                    />
                </Price>
            )}
            <Price highlight={selectedVariant.compareAtPrice != null}>
                <Currency
                    value={Number.parseFloat(selectedVariant.price?.amount!)}
                    currency={selectedVariant.price?.currencyCode! || Config.i18n.currencies[0]}
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
            added={addedToCart}
            disabled={quantity <= 0 || !selectedVariant?.availableForSale}
            onClick={addToCart}
        >
            <FiShoppingCart />
            <span>
                {(selectedVariant?.availableForSale &&
                    ((addedToCart && 'Added!') || 'Add to Cart')) ||
                    'Out of Stock'}
            </span>
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
        <PageContainer
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
                    router?.locales
                        ?.filter((locale) => locale !== 'x-default')
                        .map((locale) => ({
                            hrefLang: locale,
                            href: `https://${Config.domain}/${locale}/products/${product.handle}/`
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
                            <ProductOptions />

                            <Actions>
                                {quantityAction}
                                {addToCartAction}
                            </Actions>

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

                {recommendations?.length && recommendations.length >= 1 && (
                    <Recommendations>
                        <RecommendationsTitle>People like you also loved</RecommendationsTitle>
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
        </PageContainer>
    );
};

const ProductPageWrapper: FunctionComponent<ProductPageProps> = (props) => {
    const router = useRouter();

    if (props.error || !props.product) return <Error statusCode={500} title={props.error} />;

    return (
        <ProductProvider
            data={props.product}
            initialVariantId={
                (router.query.variant && `gid://shopify/ProductVariant/${router.query.variant}`) ||
                props.product.variants.edges.at(-1)?.node.id ||
                undefined
            }
        >
            <ProductPage {...props} />
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
                ...locales
                    .filter((locale) => locale !== 'x-default')
                    .map((locale) => ({
                        params: { handle: product?.handle },
                        locale: locale
                    }))
            ])
            .flat()
            .filter((a) => a?.params?.handle)
    ];

    return { paths, fallback: 'blocking' };
}

export async function getStaticProps({ params, locale }): Promise<GetStaticPropsResult<{}>> {
    let handle = '';
    if (Array.isArray(params.handle)) {
        handle = params?.handle?.join('');
    } else {
        handle = params?.handle;
    }

    if (handle === 'undefined' || !handle)
        return {
            props: {
                data: {
                    product: null
                }
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

    let product: Product | null = null;
    let recommendations: Product[] | null = null;
    let reviews: ReviewsModel | null = null;
    let errors: any[] = [];

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
                error: error?.message || null
            },
            revalidate: 60
        };
    }

    try {
        if (product)
            recommendations = await RecommendationApi({
                id: product?.id,
                locale
            });
    } catch (error) {
        Sentry.captureException(error);
        if (error) errors.push(error);
    }

    try {
        if (product) reviews = await ReviewsProductApi(product?.id);
    } catch (error) {
        Sentry.captureException(error);
        if (error) errors.push(error);
    }

    return {
        props: {
            product,
            recommendations,
            reviews,
            errors,
            analytics: {
                pageType: AnalyticsPageType.product,
                resourceId: product?.id || null
            }
        },
        revalidate: 10
    };
}

export default ProductPageWrapper;
