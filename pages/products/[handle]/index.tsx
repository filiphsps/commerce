import { FunctionComponent, useCallback, useEffect, useState } from 'react';
import { NextSeo, ProductJsonLd } from 'next-seo';
import { ProductApi, ProductsApi } from '../../../src/api/product';

import Breadcrumbs from '../../../src/components/Breadcrumbs';
import Button from '../../../src/components/Button';
import CollectionBlock from '../../../src/components/CollectionBlock';
import { Config } from '../../../src/util/Config';
import Currency from '../../../src/components/Currency';
import Error from 'next/error';
import FloatingAddToCart from '../../../src/components/FloatingAddToCart';
import Gallery from '../../../src/components/Gallery';
import Input from '../../../src/components/Input';
import Link from 'next/link';
import Page from '../../../src/components/Page';
import PageContent from '../../../src/components/PageContent';
import PageHeader from '../../../src/components/PageHeader';
import { ProductModel } from '../../../src/models/ProductModel';
import { RecommendationApi } from '../../../src/api/recommendation';
import { RedirectProductApi } from '../../../src/api/redirects';
import Reviews from '../../../src/components/Reviews';
import { ReviewsModel } from '../../../src/models/ReviewsModel';
import { ReviewsProductApi } from '../../../src/api/reviews';
import Weight from '../../../src/components/Weight';
import dynamic from 'next/dynamic';
import styled from 'styled-components';
import { useCart } from 'react-use-cart';

const ReviewStars = dynamic(
    () => import('../../../src/components/ReviewStars'),
    { ssr: false }
);

// TODO: replace this with generic label.
const Label = styled.label`
    text-transform: uppercase;
    font-weight: 700;
    font-size: 1.15rem;
    color: #404756;
`;

const ProductContainerWrapper = styled.div`
    display: grid;
    justify-content: center;
    align-items: center;
    padding-top: 0.5rem;
`;
const ProductContainer = styled.div`
    overflow: hidden;
    display: grid;
    grid-template-columns: 53% 1fr;
    grid-gap: 1.5rem;
    min-height: calc(100vh - 42rem);
    min-height: calc(100dvh - 42rem);
    width: calc(1465px - 4rem);
    max-width: calc(100vw - 4rem);
    margin: 0px 1.5rem;

    @media (max-width: 950px) {
        grid-template-columns: 1fr;
        max-width: calc(100vw - 3rem);
        margin: 0px;
    }
`;
const Assets = styled.div`
    overflow: hidden;
    display: flex;
    justify-content: center;
    align-items: center;
    width: 100%;
    max-height: 60rem;

    @media (max-width: 950px) {
        height: 28rem;
        max-height: 30vh;
    }
`;
const Details = styled.div`
    width: 100%;

    @media (max-width: 950px) {
        margin: 2rem 0px;
        max-width: calc(100vw - 2rem);
    }
`;

const Tags = styled.div`
    display: flex;
    grid-gap: 0.55rem;
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
    &.Raspberry {
        background: #e30b5c;
    }
    &.Strawberry {
        background: #fb2943;
    }
    &.Fruity {
        background: #663046;
    }
    &.Chocolate {
        background: #7f4e1e;
    }
    &.Marshmallow {
        background: #f0eee4;
        color: #333;
    }
    &.Licorice {
        background: #333;
    }
    &.Toffee {
        background: #cc8149;
    }
    &.Creamy {
        background: #b3956c;
    }
    &.Coffee {
        background: #6f4d3f;
    }
    &.Salty {
        background: #4d423e;
    }
    &.Soft {
        background: #ace1f0;
        color: #333;
    }
`;
const Description = styled.div`
    margin-top: 1.5rem;
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
        color: #404756;
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
    }

    @media (min-width: 950px) {
        margin-top: 1.5rem;
    }
`;
const Actions = styled.div`
    display: flex;
    grid-gap: 1rem;
    grid-gap: 1rem;
    margin-top: 0.5rem;
`;
const Quantity = styled(Input)`
    max-width: 10rem;
    text-align: center;
    font-size: 1.5rem;
    box-shadow: 0px 0px 10px -5px rgba(0, 0, 0, 0.25);
`;
const Metadata = styled.div`
    font-size: 1.05rem;
    line-height: 1.5rem;
    letter-spacing: -0.065rem;
    color: #404756;
    opacity: 0.75;

    ${Label} {
        letter-spacing: unset;
        padding-right: 0.5rem;
    }
`;

const Variants = styled.div`
    display: flex;
    grid-gap: 1rem;
    flex-wrap: wrap;
    margin-top: 2.5rem;
`;
const VariantTitle = styled.div`
    font-size: 2.15rem;
    font-weight: 700;
    color: #404756;
`;
const VariantSubTitle = styled.div`
    display: flex;
    justify-content: center;
    align-items: center;
    grid-gap: 0.25rem;
    font-size: 1.15rem;
    font-weight: 500;
    color: #404756;
`;

const VariantWeight = styled(Weight)``;

const Variant = styled.div`
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    grid-gap: 0.25rem;
    max-width: 18rem;
    padding: 1rem 1.5rem;
    margin: 0px 0px 0.5rem 0px;
    text-transform: uppercase;
    background: #efefef;
    border: 0.2rem solid #efefef;
    border-radius: var(--block-border-radius);
    font-weight: 700;
    cursor: pointer;
    box-shadow: 0px 0px 10px -5px rgba(0, 0, 0, 0.25);
    transition: 150ms all ease-in-out;

    &.Selected,
    &:hover {
        color: var(--accent-primary);
        border-color: var(--accent-primary);

        ${VariantTitle}, ${VariantSubTitle} {
            color: var(--accent-primary);
        }
    }
`;

const VariantQuantity = styled.div`
    display: grid;
    grid-template-rows: auto 1fr;
    grid-gap: 0.65rem;
    margin: 0px 0px 0.5rem 0px;
`;

const Recommendations = styled.div`
    margin: 2rem 0px 1rem 0px;
`;

const Tabs = styled.div`
    display: flex;
    gap: 1rem;
    margin-top: 1rem;
`;
const Tab = styled.div`
    padding: 0.8rem;
    background: #efefef;
    text-transform: uppercase;
    font-weight: 600;
    font-size: 1.15rem;
    border: 0.2rem solid #efefef;
    border-radius: var(--block-border-radius);
    cursor: pointer;
    transition: 150ms ease-in-out;

    &:hover {
        border-color: var(--accent-primary);
    }

    &.Active,
    &.Active:hover {
        border-color: #404756;
    }
`;
const TabContent = styled.div`
    display: none;
    overflow: hidden;
    padding: 1rem;
    margin-top: 1rem;
    background: #efefef;
    border-radius: var(--block-border-radius);

    &.Active {
        display: block;
    }
`;

interface ProductPageProps {
    errors?: any[];
    product: ProductModel;
    recommendations?: ProductModel[];
    reviews?: ReviewsModel;
    store: any;
}
const ProductPage: FunctionComponent<ProductPageProps> = ({
    errors,
    product,
    recommendations,
    reviews,
    store
}) => {
    const cart = useCart();
    const [addedToCart, setAddedToCart] = useState(false);
    const [quantity, setQuantity] = useState(1);
    const [tab, setTab] = useState('metadata');
    const [variant, setVariant] = useState(
        product ? product.variants.length - 1 : 0
    );

    const addToCart = useCallback(() => {
        setAddedToCart(true);
        cart.addItem(
            {
                id: `${product?.id}#${product?.variants[variant]?.id}`,
                price: product?.variants[variant]?.pricing.range,
                quantity: quantity,

                title: product?.title,
                variant_title: product?.variants[variant].title
            },
            quantity
        );

        setTimeout(() => {
            setAddedToCart(false);
        }, 3000);
    }, [product, variant]);

    if (errors?.length) console.error(errors);

    useEffect(() => {
        if (!product) return;

        (window as any)?.dataLayer?.push({ ecommerce: null });
        (window as any)?.dataLayer?.push({
            event: 'view_item',
            currency: product.pricing.currency,
            value: parseFloat(product.variants[variant].pricing.range as any),
            ecommerce: {
                items: [
                    {
                        item_id:
                            product.variants[variant].sku ||
                            product.variants[variant]?.id.split('/').at(-1),
                        item_name: product.title,
                        item_variant: product.variants[variant].title,
                        item_brand: product.vendor.title,
                        currency: product.pricing.currency,
                        price: parseFloat(
                            product.variants[variant].pricing.range as any
                        ),
                        quantity
                    }
                ]
            }
        });
    }, []);

    if (!product) return <Error statusCode={404} />;

    return (
        <Page className="ProductPage">
            <NextSeo
                title={`${product?.seo?.title || product?.title}`}
                description={
                    product?.seo?.description || product?.description || ''
                }
                canonical={`https://${Config.domain}/products/${product.handle}/`}
                additionalMetaTags={[
                    {
                        property: 'keywords',
                        content: product?.seo?.keywords
                    }
                ]}
                openGraph={{
                    url: `https://${Config.domain}/products/${product.handle}/`,
                    title: `${product?.seo?.title || product?.title}`,
                    description:
                        product?.seo?.description || product?.description || '',
                    images: product?.images?.map((image) => ({
                        url: image.src,
                        width: image.width,
                        height: image.height,
                        alt: image.alt
                    }))
                }}
            />

            {product.variants?.map?.((variant) => (
                <ProductJsonLd
                    key={variant?.id}
                    keyOverride={variant?.id}
                    productName={`${product.title} - ${variant.title}`}
                    brand={product.vendor.title}
                    sku={variant.sku || variant?.id}
                    mpn={variant.barcode || variant.sku || variant?.id}
                    images={product.images?.map?.((image) => image.src) || []}
                    description={product.description || ''}
                    aggregateRating={{
                        ratingValue: `${reviews?.rating || 5}`,
                        reviewCount: `${reviews?.count || 1}`
                    }}
                    offers={[
                        {
                            price: variant.pricing.range,
                            priceCurrency: variant.pricing.currency,
                            priceValidUntil: `${new Date().getFullYear()}-12-31`,
                            itemCondition: 'https://schema.org/NewCondition',
                            availability: variant.available
                                ? 'https://schema.org/InStock'
                                : 'https://schema.org/SoldOut',
                            url: `https://${Config.domain}/products/${product.handle}`
                        }
                    ]}
                />
            ))}

            <PageContent>
                <ProductContainerWrapper>
                    <ProductContainer>
                        <Assets>
                            <Gallery
                                selected={
                                    product?.variants?.[variant]
                                        ?.default_image || 0
                                }
                                images={product?.images}
                            />
                        </Assets>
                        <Details>
                            <PageHeader
                                title={product?.title}
                                subtitle={
                                    <Link
                                        href={`/collections/${product?.vendor?.handle}`}
                                    >
                                        {product?.vendor?.title?.toLocaleUpperCase?.()}
                                    </Link>
                                }
                                reverse
                                noMargin
                            />
                            <Tags>
                                {product?.tags?.map((tag) => (
                                    <Tag key={tag} className={tag}>
                                        {tag}
                                    </Tag>
                                ))}
                            </Tags>
                            {false && reviews?.rating && (
                                <ReviewStars
                                    score={reviews?.rating || 5}
                                    totalReviews={reviews?.count || 0}
                                />
                            )}

                            <Description
                                dangerouslySetInnerHTML={{
                                    __html: product?.body
                                }}
                            />

                            {/* FIXME: Use options instead */}
                            <Variants>
                                {product.variants.map((item, index) => (
                                    <Variant
                                        key={item?.id}
                                        onClick={() => setVariant(index)}
                                        className={
                                            index === variant ? 'Selected' : ''
                                        }
                                    >
                                        <VariantTitle>
                                            {item.title}
                                        </VariantTitle>
                                        <VariantSubTitle>
                                            <Currency
                                                price={item?.pricing?.range}
                                                currency={
                                                    item?.pricing?.currency
                                                }
                                                store={store}
                                            />
                                            {' | '}
                                            <VariantWeight
                                                data={item?.weight}
                                            />
                                        </VariantSubTitle>
                                    </Variant>
                                ))}
                                <VariantQuantity>
                                    <Label>Quantity</Label>
                                    <Quantity
                                        type="number"
                                        value={quantity}
                                        onChange={(event) => {
                                            const val = parseInt(
                                                event.target.value
                                            );
                                            setQuantity(val <= 0 ? 1 : val);
                                        }}
                                    />
                                </VariantQuantity>
                            </Variants>
                            <Actions>
                                <Button
                                    className={`Button ${
                                        addedToCart ? 'Added' : ''
                                    }`}
                                    disabled={
                                        !product?.variants[variant]
                                            ?.available || quantity < 1
                                    }
                                    onClick={addToCart}
                                >
                                    {product?.variants[variant].available ? (
                                        <>
                                            {addedToCart
                                                ? 'Added!'
                                                : 'Add to Cart'}
                                        </>
                                    ) : (
                                        <>Out of Stock</>
                                    )}
                                </Button>
                            </Actions>

                            <Tabs>
                                <Tab
                                    className={
                                        tab == 'metadata' ? 'Active' : ''
                                    }
                                    onClick={() => setTab('metadata')}
                                >
                                    Metadata
                                </Tab>
                                {false && (
                                    <Tab
                                        className={
                                            tab == 'reviews' ? 'Active' : ''
                                        }
                                        onClick={() => setTab('reviews')}
                                    >
                                        Reviews
                                    </Tab>
                                )}
                            </Tabs>
                            <TabContent
                                className={tab == 'metadata' ? 'Active' : ''}
                            >
                                {product?.metadata?.ingredients && (
                                    <Metadata>
                                        <Label>Ingredients</Label>
                                        {product?.metadata?.ingredients}
                                    </Metadata>
                                )}
                                {product?.variants[variant].sku && (
                                    <Metadata>
                                        <Label>SKU</Label>
                                        {product?.variants[variant].sku}
                                    </Metadata>
                                )}
                            </TabContent>
                            {false && (
                                <TabContent
                                    className={tab == 'reviews' ? 'Active' : ''}
                                >
                                    <Reviews
                                        product={product}
                                        reviews={reviews}
                                    />
                                </TabContent>
                            )}
                        </Details>
                    </ProductContainer>
                </ProductContainerWrapper>

                {recommendations && recommendations?.length >= 1 && (
                    <Recommendations>
                        <div className="ProductPage-Content-Recommendations-Content">
                            <CollectionBlock
                                data={{
                                    items: recommendations
                                }}
                                isHorizontal
                                store={store}
                            />
                        </div>
                    </Recommendations>
                )}

                <Breadcrumbs
                    pages={[
                        {
                            title: product?.vendor?.title,
                            url: `/collections/${product?.vendor?.handle}`
                        },
                        {
                            title: product?.title,
                            url: `/products/${product?.handle}`
                        }
                    ]}
                    store={store}
                />
            </PageContent>

            <FloatingAddToCart
                product={product}
                variant={variant}
                addToCart={addToCart}
                addedToCart={addedToCart}
            />
        </Page>
    );
};

export async function getStaticPaths({ locales }) {
    const products_data = await ProductsApi();
    let paths = [
        ...products_data.products
            ?.map((product) => [
                {
                    params: { handle: product?.handle }
                },
                ...locales.map((locale) => ({
                    params: { handle: product?.handle },
                    locale: locale
                }))
            ])
            .flat()
            .filter((a) => a?.params?.handle)
    ];

    return { paths, fallback: 'blocking' };
}

export async function getStaticProps({ params, locale }) {
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

    if (locale === '__default') {
        return {
            props: {},
            revalidate: false
        };
    }

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

    let product: ProductModel | null = null;
    let recommendations: ProductModel[] | null = null;
    let reviews: ReviewsModel | null = null;
    let errors: any[] = [];

    try {
        product = (await ProductApi({
            handle,
            locale
        })) as any;
    } catch (err) {
        console.error('ProductApi', err);
        if (err) errors.push(err);

        return {
            notFound: true
        };
    }

    try {
        if (product)
            recommendations = (await RecommendationApi({
                id: product?.id,
                locale
            })) as any;
    } catch (err) {
        console.warn('RecommendationApi', err);
        if (err) errors.push(err);
    }

    try {
        if (product) reviews = await ReviewsProductApi(product?.id);
    } catch (err) {
        console.warn('ReviewsProductApi', err);
        if (err) errors.push(err);
    }

    return {
        props: {
            product,
            recommendations,
            reviews,
            errors
        },
        revalidate: 10
    };
}

export default ProductPage;
