import { FunctionComponent, useEffect, useState } from 'react';
import { NextSeo, ProductJsonLd } from 'next-seo';
import { ProductApi, ProductsApi } from '../../../src/api/product';

import Breadcrumbs from '../../../src/components/Breadcrumbs';
import Button from '../../../src/components/Button';
import CollectionBlock from '../../../src/components/CollectionBlock';
import { Config } from '../../../src/util/Config';
import Currency from '../../../src/components/Currency';
import Error from 'next/error';
import Image from 'next/image';
import Input from '../../../src/components/Input';
import Link from 'next/link';
import Page from '../../../src/components/Page';
import PageContent from '../../../src/components/PageContent';
import PageHeader from '../../../src/components/PageHeader';
import { ProductModel } from '../../../src/models/ProductModel';
import { RecommendationApi } from '../../../src/api/recommendation';
import { RedirectProductApi } from '../../../src/api/redirects';
import ReviewStars from '../../../src/components/ReviewStars';
import { ReviewsModel } from '../../../src/models/ReviewsModel';
import { ReviewsProductApi } from '../../../src/api/reviews';
import Weight from '../../../src/components/Weight';
import styled from 'styled-components';
import { useCart } from 'react-use-cart';
import { useRouter } from 'next/router';

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
`;
const ProductContainer = styled.div`
    overflow: hidden;
    display: grid;
    grid-template-columns: 53% 1fr;
    grid-gap: 1.5rem;
    min-height: calc(100vh - 42rem);
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
    padding: 4rem;
    background: #efefef;

    @media (max-width: 950px) {
        height: 28rem;
        max-height: 30vh;
        padding: 1.5rem;
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
const Tag = styled.div`
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 0.5rem 1rem;
    text-transform: uppercase;
    background: var(--accent-secondary-dark);
    color: var(--color-text-primary);
`;
const Description = styled.div`
    margin-top: 1.5rem;
    font-size: 1.5rem;
    line-height: 2.25rem;

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
    margin-top: 0.75rem;
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
    transition: 250ms all ease-in-out;

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

const Carousel = styled.div`
    position: relative;
    width: 100%;
    height: 100%;

    max-width: 42rem;
    max-width: 38rem;

    img {
        mix-blend-mode: multiply;
    }
`;

const Recommendations = styled.div`
    margin: 2rem 0px 1rem 0px;
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
    const router = useRouter();
    const cart = useCart();
    const [addedToCart, setAddedToCart] = useState(false);
    const [quantity, setQuantity] = useState(1);
    const [variant, setVariant] = useState(
        product ? product.variants.length - 1 : 0
    );
    const [loading, setLoading] = useState(false);

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
                            product.variants[variant].id.split('/').at(-1),
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
                additionalMetaTags={[
                    {
                        property: 'keywords',
                        content: product?.seo?.keywords
                    }
                ]}
            />
            <ProductJsonLd
                productName={product.title.replace(/"/gi, '\\"')}
                brand={product.vendor.title.replace(/"/gi, '\\"')}
                sku={product.sku || product.id}
                mpn={product.sku || product.id}
                images={product.images?.map?.((image) => image.src) || []}
                description={product.description || ''}
                offers={
                    (product.variants?.map?.((variant) => ({
                        price: variant.pricing.range,
                        priceCurrency: variant.pricing.currency,
                        priceValidUntil: `${new Date().getFullYear()}-12-31`,
                        itemCondition: 'https://schema.org/NewCondition',
                        availability: variant.available
                            ? 'https://schema.org/InStock'
                            : 'https://schema.org/SoldOut',
                        url: `https://${Config.domain}/products/${product.handle}`
                    })) || []) as any
                }
            />

            <PageContent>
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

            <ProductContainerWrapper>
                <ProductContainer>
                    <Assets>
                        <Carousel>
                            <Image
                                src={
                                    product?.images?.[
                                        product?.variants?.[variant]
                                            ?.default_image
                                    ]?.src
                                }
                                layout="fill"
                                objectFit="contain"
                            />
                        </Carousel>
                    </Assets>
                    <Details>
                        <PageHeader
                            title={product?.title}
                            subtitle={
                                <Link
                                    href={`/collections/${product?.vendor?.handle}`}
                                >
                                    {product?.vendor?.title}
                                </Link>
                            }
                            reverse
                            noMargin
                        />
                        {Config.features.reviews && (
                            <ReviewStars
                                score={reviews?.rating}
                                totalReviews={reviews?.count}
                            />
                        )}
                        <Tags>
                            {product?.tags.map((tag) => (
                                <Tag key={tag}>{tag}</Tag>
                            ))}
                        </Tags>

                        <Description
                            dangerouslySetInnerHTML={{
                                __html: product?.body
                            }}
                        />

                        {/* FIXME: Use options instead */}
                        <Variants>
                            {product.variants.map((item, index) => (
                                <Variant
                                    key={item.id}
                                    onClick={() => setVariant(index)}
                                    className={
                                        index === variant ? 'Selected' : ''
                                    }
                                >
                                    <VariantTitle>{item.title}</VariantTitle>
                                    <VariantSubTitle>
                                        <Currency
                                            price={item?.pricing?.range}
                                            currency={item?.pricing?.currency}
                                        />
                                        {' | '}
                                        <VariantWeight data={item?.weight} />
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
                                    !product?.variants[variant]?.available ||
                                    quantity < 1 ||
                                    loading
                                }
                                onClick={() => {
                                    setAddedToCart(true);
                                    cart.addItem({
                                        id: `${product?.id}#${product?.variants[variant]?.id}`,
                                        price: product?.variants[variant]
                                            ?.pricing.range,
                                        quantity: quantity,

                                        title: product?.title,
                                        variant_title:
                                            product?.variants[variant].title
                                    });

                                    setTimeout(() => {
                                        setAddedToCart(false);
                                    }, 3000);
                                }}
                            >
                                {addedToCart ? 'Added!' : 'Add to Cart'}
                            </Button>
                        </Actions>

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
                    </Details>
                </ProductContainer>
            </ProductContainerWrapper>

            <PageContent>
                {recommendations && recommendations?.length >= 1 && (
                    <Recommendations>
                        <div className="ProductPage-Content-Recommendations-Content">
                            <CollectionBlock
                                data={{
                                    items: recommendations
                                }}
                                isHorizontal
                            />
                        </div>
                    </Recommendations>
                )}
            </PageContent>
        </Page>
    );
};

export async function getStaticPaths() {
    const products_data = await ProductsApi();

    let paths = [
        ...products_data.products
            ?.map((product) => ({
                params: { handle: product?.handle }
            }))
            .filter((a) => a.params.handle)
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

    let product: ProductModel = null;
    let recommendations: Array<ProductModel> = null;
    let reviews: ReviewsModel = null;
    let errors = [];

    try {
        product = (await ProductApi({ handle, locale })) as any;
    } catch (err) {
        console.error(err);
        if (err) errors.push(err);
    }

    try {
        recommendations = (await RecommendationApi({
            id: product?.id,
            locale
        })) as any;
    } catch (err) {
        console.warn(err);
        if (err) errors.push(err);
    }

    if (Config.features.reviews) {
        try {
            reviews = await ReviewsProductApi(product.id);
        } catch (err) {
            console.warn(err);
            if (err) errors.push(err);
        }
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
