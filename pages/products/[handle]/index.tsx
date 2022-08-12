import { FunctionComponent, useEffect, useState } from 'react';
import { NextSeo, ProductJsonLd } from 'next-seo';
import { ProductApi, ProductsApi } from '../../../src/api/product';

import Breadcrumbs from '../../../src/components/Breadcrumbs';
import Button from '../../../src/components/Button';
import Cart from '../../../src/util/cart';
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
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import styled from 'styled-components';
import { useRouter } from 'next/router';
import { useStore } from 'react-context-hook';
import { useTranslation } from 'next-i18next';

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
const Ingredients = styled.div`
    margin-top: 1.5rem;
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
    product: ProductModel;
    recommendations?: ProductModel[];
    reviews?: ReviewsModel;
    redirect?: string;
    store: any;
}
const ProductPage: FunctionComponent<ProductPageProps> = ({
    product,
    recommendations,
    reviews,
    redirect,
    store
}) => {
    const router = useRouter();
    const [quantity, setQuantity] = useState(1);
    const [variant, setVariant] = useState(product.variants.length - 1);
    const [loading, setLoading] = useState(false);
    const [cart, setCart] = useStore<any>('cart');
    const { t } = useTranslation('product');

    // Handle redirect.
    useEffect(() => {
        setVariant(product.variants.length - 1);
        if (!redirect) return;

        router.replace(redirect);
    }, []);

    useEffect(() => {
        if (redirect || (window as any)?.dataLayer) return;

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
                title={`${product?.seo?.title || product?.title} | ${
                    product?.vendor?.title
                }`}
                description={
                    product?.seo?.description || product?.description || ''
                }
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
                        priceCurrency: 'USD',
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
                                <Label>{t('quantity')}</Label>
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
                                disabled={
                                    !product?.variants[variant]?.available ||
                                    quantity < 1 ||
                                    loading
                                }
                                onClick={() => {
                                    setLoading(true);

                                    Cart.Add([cart, setCart], {
                                        id: product?.id,
                                        variant_id:
                                            product?.variants[variant]?.id,
                                        quantity: quantity,
                                        price: product?.variants[variant]
                                            ?.pricing.range,
                                        data: {
                                            product,
                                            variant: product?.variants[variant]
                                        }
                                    })
                                        .then(() => {
                                            setLoading(false);
                                        })
                                        .catch((err) => {
                                            console.error(err);
                                            // FIXME: notify error
                                        });
                                }}
                            >
                                {t('add_to_cart')}
                            </Button>
                        </Actions>

                        {product?.metadata?.ingredients && (
                            <Ingredients>
                                <Label>{t('ingredients')}</Label>
                                {product?.metadata?.ingredients}
                            </Ingredients>
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

    if (handle === 'undefined')
        return {
            revalidate: false
        };

    const redirect = await RedirectProductApi(handle);
    if (redirect) {
        return {
            props: {
                redirect: redirect
            },
            revalidate: 10
        };
    }

    const product: ProductModel = (await ProductApi(handle)) as any;

    let recommendations: Array<ProductModel> = null;
    let reviews: ReviewsModel = null;

    try {
        recommendations = (await RecommendationApi(product?.id)) as any;
    } catch (err) {
        console.warn(err);
    }

    try {
        reviews = await ReviewsProductApi(product.id);
    } catch (err) {
        console.warn(err);
    }

    return {
        props: {
            ...(await serverSideTranslations(locale, ['common', 'product'])),
            product,
            recommendations,
            reviews
        },
        revalidate: 10
    };
}

export default ProductPage;
