import * as Sentry from '@sentry/nextjs';

import { AnalyticsPageType, ProductProvider, useCart, useProduct } from '@shopify/hydrogen-react';
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
import { ProductApi, ProductsApi } from '../../../src/api/product';
import styled, { css } from 'styled-components';

import Breadcrumbs from '../../../src/components/Breadcrumbs';
import Button from '../../../src/components/Button';
import CollectionBlock from '../../../src/components/CollectionBlock';
import { Config } from '../../../src/util/Config';
import ContentBlock from '../../../src/components/ContentBlock';
import { Currency } from 'react-tender';
import Error from 'next/error';
import Gallery from '../../../src/components/Gallery';
import { GetStaticPropsResult } from 'next';
import Input from '../../../src/components/Input';
import Link from 'next/link';
import Page from '../../../src/components/Page';
import PageContent from '../../../src/components/PageContent';
import PageHeader from '../../../src/components/PageHeader';
import { ProductOptions } from '../../../src/components/ProductOptions';
import { RecommendationApi } from '../../../src/api/recommendation';
import { RedirectProductApi } from '../../../src/api/redirects';
import Reviews from '../../../src/components/Reviews';
import { ReviewsModel } from '../../../src/models/ReviewsModel';
import { ReviewsProductApi } from '../../../src/api/reviews';
import { StoreModel } from '../../../src/models/StoreModel';
import TitleToHandle from '../../../src/util/TitleToHandle';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/router';
import { useStore } from 'react-context-hook';
import { useWindowSize } from 'rooks';

const ReviewStars = dynamic(() => import('../../../src/components/ReviewStars'), { ssr: false });

// TODO: replace this with generic label.
const Label = styled.label`
    text-transform: uppercase;
    font-weight: 700;
    font-size: 1.5rem;
    color: #404756;
`;

const ProductContainerWrapper = styled.div`
    display: grid;
    justify-content: center;
    align-items: center;
    padding-top: 0.5rem;
`;
const ProductContainer = styled.div`
    position: relative;
    display: grid;
    grid-template-columns: 1.15fr 1fr;
    gap: 2rem;
    min-height: calc(100vh - 42rem);
    min-height: calc(100dvh - 42rem);
    width: calc(1465px - 4rem);
    max-width: calc(100vw - 4rem);
    margin: 0px 1.5rem;

    @media (max-width: 950px) {
        grid-template-columns: 1fr;
        gap: 0rem;
        max-width: calc(100vw - 3rem);
        margin: 0px;
    }
`;
const Assets = styled.div`
    display: flex;
    justify-content: center;
    align-items: center;
    width: 100%;
    max-height: 60rem;

    @media (max-width: 950px) {
        overflow: hidden;
        height: 28rem;
        max-height: 30vh;
        margin-bottom: 1.5rem;
    }

    @media (min-width: 950px) {
        position: sticky;
        top: 8rem;
    }
`;
const Details = styled.div`
    display: flex;
    flex-direction: column;
    gap: 1rem;
    width: 100%;
    margin: 1rem 0px;
`;

const Tags = styled.div`
    display: flex;
    gap: 0.5rem;

    @media (max-width: 950px) {
        margin: 0px 0px 0.5rem 0px;
    }
`;
export const Tag = styled.div`
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 0.5rem 1rem;
    text-transform: uppercase;
    font-size: 1.25rem;
    background: var(--accent-secondary-dark);
    color: var(--color-text-primary);

    &.Vegan {
        background: #228b22;
    }
`;
const Description = styled.div`
    font-size: 1.5rem;
    line-height: 2.25rem;

    h1 {
        margin-bottom: 1rem;
        font-size: 2.5rem;
        font-weight: 600;
        line-height: 2.75rem;
        letter-spacing: 0.05rem;
        text-transform: uppercase;
    }
    h2 {
        margin-bottom: 1rem;
        font-size: 2rem;
        font-weight: 600;
        line-height: 2.25rem;
        letter-spacing: 0.05rem;
        text-transform: uppercase;
    }
    h3 {
        font-size: 1.75rem;
        font-weight: 600;
        line-height: 2rem;
        letter-spacing: 0.05rem;
        color: #404756;
    }

    p {
        margin-bottom: 1rem;

        &:last-of-type {
            margin-bottom: 0px;
        }
    }
`;

const Actions = styled.div`
    display: flex;
    align-items: end;
    gap: 1rem;

    @media (max-width: 950px) {
        align-items: start;
        flex-direction: column;
    }
`;
const AddToCart = styled(Button)`
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 1.5rem;
    height: 4rem;
    width: auto;
    padding-left: 2rem;
    padding-right: 2rem;
    font-weight: 600;

    svg {
        font-size: 1.75rem;
    }

    @media (max-width: 950px) {
        height: 5rem;
        width: 100%;
    }
`;
const Quantity = styled(Input)`
    height: 4rem;
    max-width: 10rem;
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
    gap: 0.5rem;

    input {
        border-width: 0px;
    }

    @media (max-width: 950px) {
        width: 100%;
        margin-top: -0.5rem;
    }
`;
const QuantityWrapper = styled.div`
    display: grid;
    grid-template-columns: 4.5rem 1fr 4.5rem;
    height: 4rem;
    border: 0.2rem solid #efefef;
    background: var(--color-text-primary);
    border-radius: var(--block-border-radius);
    outline: none;

    button {
        display: flex;
        justify-content: center;
        align-items: center;
        height: 100%;
        width: 100%;
        font-size: 1.5rem;

        &:hover {
            color: var(--accent-primary);
        }
    }

    input {
        height: 100%;

        @media (min-width: 950px) {
            width: 4rem;
        }
    }

    @media (max-width: 950px) {
        height: 4.5rem;
    }
`;

const Header = styled.div`
    display: grid;
    grid-template-columns: 1fr minmax(8rem, auto);
    gap: 0.5rem;
    margin-bottom: 1rem;

    @media (min-width: 950px) {
        h3 {
            padding-bottom: 0.25rem;
        }
    }

    @media (max-width: 950px) {
        margin-bottom: 1rem;
        grid-template-columns: 1fr;
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
    display: flex;
    justify-content: end;
    align-items: end;
    flex-direction: column;
    height: 100%;
    width: 100%;

    @media (max-width: 950px) {
        justify-content: center;
        align-items: center;
    }
`;

const Recommendations = styled(ContentBlock)`
    display: block;
    width: 100%;
    margin-top: 4rem;
    border-radius: var(--block-border-radius);

    @media (max-width: 950px) {
        margin: 1.5rem 0px;
    }
`;
const RecommendationsTitle = styled.h3`
    text-transform: uppercase;
    font-size: 2.5rem;
    font-weight: 600;
    color: var(--accent-primary);

    @media (max-width: 950px) {
        font-size: 2.25rem;
        font-weight: 700;
    }
`;
const RecommendationsContent = styled(PageContent)`
    width: 100%;

    @media (max-width: 950px) {
        width: calc(100vw - 3rem);
        max-width: calc(100vw - 3rem);
        padding: 0px;
    }
`;

const Tabs = styled.div`
    display: flex;
    gap: 1.5rem;
    width: 100%;
    margin-top: 0.5rem;
    border-bottom: 0.15rem solid #efefef;
`;
const Tab = styled.div`
    padding: 1rem 0.25rem 0.5rem 0.25rem;
    text-transform: uppercase;
    font-weight: 800;
    font-size: 1.5rem;
    text-align: center;
    border-bottom: 0.4rem solid transparent;
    cursor: pointer;
    transition: 150ms ease-in-out;
    opacity: 0.5;

    &.Active {
        border-bottom-color: var(--accent-primary);
        opacity: 1;
    }
`;
const TabContent = styled.div`
    display: none;
    overflow: hidden;
    padding: 0.5rem 0px;

    &.Active {
        display: block;
    }
`;

const AddToCartCTA = styled.div`
    z-index: 5;
    position: fixed;
    display: grid;
    grid-template-columns: minmax(8rem, auto) 1fr;
    justify-content: center;
    align-items: center;
    gap: 2rem;
    right: 0px;
    bottom: 0px;
    left: 0px;
    width: 100vw;
    padding: 1.5rem 2rem;
    background: var(--color-text-primary);
    box-shadow: 0px 0px 10px 0px rgba(0, 0, 0, 0.25);
    border-top-left-radius: var(--block-border-radius);
    border-top-right-radius: var(--block-border-radius);

    ${PriceContainer} {
        align-items: start;
    }
`;

interface ProductPageProps {
    error?: string;
    product: Product;
    recommendations?: Product[];
    reviews?: ReviewsModel;
    store: StoreModel;
}
const ProductPage: FunctionComponent<ProductPageProps> = ({ recommendations, reviews, store }) => {
    const router = useRouter();
    const cart = useCart();
    const { product, variants, selectedVariant: initialVariant } = useProduct();
    const [addedToCart, setAddedToCart] = useState(false);
    const [quantity, setQuantity] = useState(1);
    const [tab, setTab] = useState('details');
    const { outerWidth } = useWindowSize();
    const [isMobile, setIsMobile] = useState(false);
    const [cartStore, setCartStore] = useStore<any>('cart');
    useEffect(() => {
        if (!outerWidth) return;

        if (outerWidth >= 950 && isMobile) setIsMobile(false);
        else if (outerWidth <= 950 && !isMobile) setIsMobile(true);
    }, [outerWidth]);

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

    useEffect(() => {
        if (!product || !selectedVariant) return;
        (window as any)?.dataLayer?.push(
            { ecommerce: null },
            {
                event: 'view_item',
                currency: selectedVariant.price?.currencyCode,
                value: Number.parseFloat(selectedVariant.price?.amount || ''),
                ecommerce: {
                    items: [
                        {
                            item_id: selectedVariant.sku || selectedVariant.id?.split('/').at(-1),
                            item_name: product.title,
                            item_variant: selectedVariant.title,
                            item_brand: product.vendor,
                            currency: selectedVariant.price?.currencyCode,
                            price: Number.parseFloat(selectedVariant.price?.amount || ''),
                            quantity
                        }
                    ]
                }
            }
        );
    }, [cart.lines]);

    // NOTE: this should never happen
    if (!product) return null;

    const tags = (
        <Tags>
            {product?.tags?.map((tag) => (
                <Tag key={tag} className={tag}>
                    {tag}
                </Tag>
            ))}
        </Tags>
    );
    const pricing = (
        <PriceContainer>
            {selectedVariant.compareAtPrice && (
                <Price sale>
                    <Currency
                        value={Number.parseFloat(selectedVariant.compareAtPrice?.amount!)}
                        currency={selectedVariant.price?.currencyCode!}
                    />
                </Price>
            )}
            <Price highlight={selectedVariant.compareAtPrice != null}>
                <Currency
                    value={Number.parseFloat(selectedVariant.price?.amount!)}
                    currency={selectedVariant.price?.currencyCode!}
                />
            </Price>
        </PriceContainer>
    );
    const information = (
        <>
            <Header>
                <div>
                    <PageHeader
                        title={product.title!}
                        subtitle={
                            <Link href={`/collections/${TitleToHandle(product.vendor!)}`}>
                                {product.vendor!.toLocaleUpperCase?.()}
                            </Link>
                        }
                        reverse
                        noMargin
                    />
                    {(reviews?.count && reviews.count > 0 && (
                        <ReviewStars
                            score={reviews?.rating || 0}
                            totalReviews={reviews?.count || 0}
                        />
                    )) ||
                        null}
                </div>
                {!isMobile && pricing}
            </Header>
        </>
    );
    const addToCartAction = (
        <AddToCart
            className={`Button ${addedToCart ? 'Added' : ''}`}
            disabled={quantity <= 0 || !selectedVariant?.availableForSale}
            onClick={addToCart}
        >
            <FiShoppingCart />
            <span data-nosnippet>
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
                <button onClick={() => setQuantity(quantity - 1)}>
                    <FiMinus />
                </button>
                <Quantity
                    type="number"
                    value={quantity}
                    onChange={(event) => {
                        const val = parseInt(event.target.value);
                        setQuantity(val);
                    }}
                />
                <button onClick={() => setQuantity(quantity + 1)}>
                    <FiPlus />
                </button>
            </QuantityWrapper>
        </QuantitySelector>
    );

    return (
        <Page className="ProductPage">
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
                                    alt: image!.altText || ''
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
                    sku={`shopify_${(router?.locale || 'en-US').split('-')[1]}_${product.id
                        ?.split('/')
                        .at(-1)}_${variant?.id.split('/').at(-1)}`}
                    mpn={variant.barcode || undefined}
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

            <PageContent>
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
                <ProductContainerWrapper>
                    <ProductContainer>
                        {isMobile && information}
                        <Assets>
                            <Gallery
                                selected={selectedVariant?.image?.id || null}
                                images={(product as any).images || null}
                            />
                        </Assets>
                        <Details>
                            {!isMobile && information}

                            {false && reviews?.rating && (
                                <ReviewStars
                                    score={reviews?.rating || 5}
                                    totalReviews={reviews?.count || 0}
                                />
                            )}

                            <ProductOptions />
                            <Actions>
                                {quantityAction}
                                {!isMobile && addToCartAction}
                            </Actions>

                            {isMobile && (
                                <AddToCartCTA>
                                    {pricing}
                                    {addToCartAction}
                                </AddToCartCTA>
                            )}

                            <>
                                <Tabs>
                                    <Tab
                                        className={tab == 'details' ? 'Active' : ''}
                                        onClick={() => setTab('details')}
                                    >
                                        Details
                                    </Tab>
                                    <Tab
                                        className={tab == 'ingredients' ? 'Active' : ''}
                                        onClick={() => setTab('ingredients')}
                                    >
                                        Ingredients
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
                                </TabContent>
                                <TabContent className={tab == 'ingredients' ? 'Active' : ''}>
                                    <Description>
                                        <h2>Ingredients</h2>
                                        {(product as any)?.ingredients?.value ||
                                            `No ingredients found.`}{' '}
                                        <br />
                                        {selectedVariant.sku && (
                                            <>
                                                <h2>SKU</h2>
                                                {selectedVariant.sku}
                                            </>
                                        )}
                                    </Description>
                                </TabContent>
                                <TabContent className={tab == 'reviews' ? 'Active' : ''}>
                                    <Reviews product={product as any} reviews={reviews} />
                                </TabContent>
                            </>

                            {tags}
                        </Details>
                    </ProductContainer>
                </ProductContainerWrapper>

                {recommendations?.length && recommendations.length >= 1 && (
                    <Recommendations>
                        <RecommendationsTitle>You might also like</RecommendationsTitle>
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
            </PageContent>
        </Page>
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

    return { paths, fallback: true };
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
                resourceId: product?.id
            }
        },
        revalidate: 10
    };
}

export default ProductPageWrapper;
