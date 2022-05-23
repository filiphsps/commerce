import { ProductApi, ProductsApi, RecommendationApi } from '../../../src/api';
import React, { memo, useEffect, useState } from 'react';

import Breadcrumbs from '../../../src/components/Breadcrumbs';
import Button from '../../../src/components/Button';
import Cart from '../../../src/util/cart';
import Currency from '../../../src/components/Currency';
import Error from 'next/error';
import Head from 'next/head';
import LanguageString from '../../../src/components/LanguageString';
import Link from '../../../src/components/Link';
import Page from '../../../src/components/Page';
import PageContent from '../../../src/components/PageContent';
import PageLoader from '../../../src/components/PageLoader';
import { ProductJsonLd } from 'next-seo';
import { ProductModel } from '../../../src/models/ProductModel';
import ProductVariants from '../../../src/components/ProductVariants';
import dynamic from 'next/dynamic';
import styled from 'styled-components';
import { useRouter } from 'next/router';
import { useStore } from 'react-context-hook';

const ImageGallery: any = dynamic(() => import('react-image-gallery'), {
    ssr: false
});
const CollectionBlock: any = dynamic(
    () => import('../../../src/components/CollectionBlock')
);

const ProductTags = styled.div`
    display: flex;
    grid-gap: 0.55rem;
    padding: 1rem 0px;
`;
const ProductTag = styled.div`
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 0.5rem 1rem;
    text-transform: uppercase;
    background: var(--accent-secondary-dark);
    color: var(--color-text-primary);
    //border-radius: var(--block-border-radius);
`;

const Product = memo((props: any) => {
    const { store } = props;

    const router = useRouter();
    const language = router.locale || 'en-US';
    const [cart, setCart] = useStore<any>('cart');
    const [selectedVariant, setSelectedVariant] = useState(null);

    const product: ProductModel = props?.data?.product || null;
    const related_products: Array<ProductModel> = props?.data?.related_products;

    useEffect(() => {
        if (selectedVariant || !product) return;

        setSelectedVariant((product?.variants?.length || 1) - 1);

        if (window) (window as any).resourceId = product.id;
    }, [product]);

    const variant = product?.variants?.[selectedVariant] || null;
    const packages = product?.variants?.[selectedVariant]?.packages || [];

    if (!product) return <Error statusCode={404} />;

    return (
        <Page className="ProductPage">
            <Head>
                <title>
                    {product?.seo?.title ? product?.seo?.title : product?.title}{' '}
                    | {product?.vendor?.title} | {store?.name || ''}
                </title>
                <meta
                    name="description"
                    content={
                        product?.seo?.description || product?.description || ''
                    }
                />
                <meta name="canonical" ref="/shop" />
            </Head>
            <ProductJsonLd
                productName={product?.title?.replace?.(/"/gi, '\\"')}
                brand={product?.vendor?.title?.replace?.(/"/gi, '\\"')}
                sku={product?.sku || product?.id}
                mpn={product?.sku || product?.id}
                images={product?.images?.map?.((image) => image?.src) || []}
                description={product?.description || ''}
                offers={
                    (product?.variants?.map?.((variant) => ({
                        price: variant?.from_price || variant?.price,
                        priceCurrency:
                            variant?.currency ||
                            product?.currency ||
                            store?.currency,
                        priceValidUntil: `${new Date().getFullYear()}-12-31`,
                        itemCondition: 'https://schema.org/NewCondition',
                        availability:
                            (variant?.available &&
                                'https://schema.org/InStock') ||
                            'https://schema.org/SoldOut',
                        url: `https://${process.env.DOMAIN}/${
                            (props?.country && `${props?.country}/`) || ''
                        }products/${product?.handle}`
                    })) || []) as any
                }
            />

            <PageContent>
                <Breadcrumbs
                    pages={[
                        {
                            title:
                                product?.vendor?.title &&
                                (product?.vendor?.title?.[
                                    language.replace('-', '_')
                                ] ||
                                    product?.vendor?.title),
                            url: `/collections/${product?.vendor?.handle}`
                        },
                        {
                            title:
                                product?.title &&
                                (product?.title?.[language.replace('-', '_')] ||
                                    product?.title),
                            url: `/products/${router?.query?.handle}`
                        }
                    ]}
                    store={store}
                />
            </PageContent>

            <PageContent className="ProductPage-Content">
                {(product && (
                    <>
                        <div className="ProductPage-Content-Blocks">
                            <div className="ProductPage-Content-Blocks-Block ProductPage-Content-Blocks-Block-Gallery">
                                <div className="ProductPage-Content-Gallery">
                                    {product?.images && (
                                        <ImageGallery
                                            lazyLoad={true}
                                            showBullets={
                                                product?.images?.length > 0
                                            }
                                            showNav={
                                                product?.images?.length > 0
                                            }
                                            showFullscreenButton={false}
                                            showPlayButton={false}
                                            showThumbnails={false}
                                            items={
                                                product?.images?.map?.(
                                                    (image) => {
                                                        return {
                                                            original:
                                                                image?.src,
                                                            thumbnail:
                                                                image?.src
                                                        };
                                                    }
                                                ) || []
                                            }
                                        />
                                    )}
                                </div>
                                {(product?.details &&
                                    product?.details?.length > 0 && (
                                        <div className="ProductPage-Content-Details">
                                            {product?.details?.map?.(
                                                (detail, index) => {
                                                    if (!detail) return null;

                                                    return (
                                                        <div
                                                            key={index}
                                                            className="ProductPage-Content-Details-Detail"
                                                        >
                                                            <div className="ProductPage-Content-Details-Detail-Title">
                                                                {detail
                                                                    ?.title?.[
                                                                    language
                                                                ] ||
                                                                    detail
                                                                        ?.title?.[
                                                                        'en_US'
                                                                    ] ||
                                                                    detail?.title}
                                                            </div>
                                                            <div>
                                                                {detail
                                                                    ?.value?.[
                                                                    language
                                                                ] ||
                                                                    detail
                                                                        ?.value?.[
                                                                        'en_US'
                                                                    ] ||
                                                                    detail?.value}
                                                            </div>
                                                        </div>
                                                    );
                                                }
                                            )}
                                        </div>
                                    )) ||
                                    null}
                            </div>
                            <div className="ProductPage-Content-Blocks-Block">
                                <div className="ProductPage-Content-Header">
                                    <Link
                                        to={`/collections/${product?.vendor?.handle}`}
                                        className="ProductPage-Content-Header-Vendor"
                                    >
                                        <h2>
                                            {product?.vendor?.title &&
                                                (product?.vendor?.title?.[
                                                    language
                                                ] ||
                                                    product?.vendor?.title?.[
                                                        'en_US'
                                                    ] ||
                                                    product?.vendor?.title)}
                                        </h2>
                                    </Link>
                                    {product?.body?.includes('<h1>') ? (
                                        <h3 className="ProductPage-Content-Header-Title">
                                            {product?.title &&
                                                (product?.title?.[
                                                    language.replace('-', '_')
                                                ] ||
                                                    product?.title)}
                                        </h3>
                                    ) : (
                                        <h1 className="ProductPage-Content-Header-Title">
                                            {product?.title &&
                                                (product?.title?.[
                                                    language.replace('-', '_')
                                                ] ||
                                                    product?.title)}
                                        </h1>
                                    )}
                                    <ProductTags>
                                        {product?.tags?.map((tag) => (
                                            <ProductTag key={tag}>
                                                {tag}
                                            </ProductTag>
                                        ))}
                                    </ProductTags>
                                </div>

                                <div className="ProductPage-Content-Body">
                                    <div
                                        className="MarkdownBody"
                                        dangerouslySetInnerHTML={{
                                            __html: product?.body
                                        }}
                                    />
                                    {product?.metadata?.ingredients && (
                                        <div className="ProductPage-Content-Body-Ingredients">
                                            <b>
                                                <LanguageString
                                                    id={'ingredients'}
                                                />
                                                :{' '}
                                            </b>
                                            {product?.metadata?.ingredients}.
                                        </div>
                                    )}
                                </div>

                                <ProductVariants
                                    data={product?.variants}
                                    selected={selectedVariant}
                                    onSelect={(variant) => {
                                        setSelectedVariant(variant);
                                    }}
                                />

                                <div className="ProductPage-Content-Actions">
                                    <div className="ProductPage-Content-Actions-Action ProductPage-Content-Actions-Action-Price">
                                        <div className="ProductPage-Content-Prices">
                                            {(packages?.length && (
                                                <>
                                                    <Currency
                                                        price={variant?.price}
                                                        currency={
                                                            variant?.currency
                                                        }
                                                    />
                                                </>
                                            )) || (
                                                <Currency
                                                    price={variant?.price}
                                                    currency={variant?.currency}
                                                />
                                            )}
                                        </div>
                                        <div className="ProductPage-Content-Prices-Meta">
                                            <div>
                                                <LanguageString
                                                    id={'total_price'}
                                                />
                                            </div>
                                            <div>
                                                <LanguageString
                                                    id={'incl_vat'}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                    <div className="ProductPage-Content-Actions-Action">
                                        <Button
                                            className="ProductPage-Content-Actions-Action-Button"
                                            disabled={!variant?.available}
                                            onClick={async () => {
                                                await Cart.Add(
                                                    [cart, setCart],
                                                    {
                                                        id: product?.id,
                                                        variant_id: variant?.id,
                                                        quantity: 1
                                                    }
                                                );
                                                await router.push('/cart');
                                            }}
                                        >
                                            {(variant?.available && (
                                                <LanguageString
                                                    id={'add_to_cart'}
                                                />
                                            )) || (
                                                <LanguageString
                                                    id={'out_of_stock'}
                                                />
                                            )}
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {related_products?.length >= 1 && (
                            <div className="ProductPage-Content-Recommendations">
                                <div className="ProductPage-Content-Recommendations-Title">
                                    <LanguageString id={'recommendations'} />
                                </div>
                                <div className="ProductPage-Content-Recommendations-Content">
                                    {related_products && (
                                        <CollectionBlock
                                            data={{
                                                items: related_products
                                            }}
                                            isHorizontal
                                        />
                                    )}
                                </div>
                            </div>
                        )}
                    </>
                )) || <PageLoader />}
            </PageContent>
        </Page>
    );
});

export async function getStaticPaths({ locales }) {
    try {
        const products = ((await ProductsApi()) as any) || null;

        let paths = [];
        locales.forEach((locale) => {
            paths.push(
                ...products
                    ?.map((product) => ({
                        params: { handle: product?.handle },
                        locale: locale
                    }))
                    .filter((a) => a.params.handle)
            );
        });

        return { paths, fallback: 'blocking' };
    } catch {
        return { paths: [], fallback: 'blocking' };
    }
}

export async function getStaticProps({ params, locale }) {
    try {
        const product: ProductModel = (await ProductApi(params?.handle)) as any;
        let related_products: Array<ProductModel> = null;

        try {
            related_products = (await RecommendationApi(product?.id)) as any;
        } catch (err) {
            console.warn(err);
        }

        return {
            props: {
                data: {
                    product,
                    related_products
                }
            },
            revalidate: 1
        };
    } catch (err) {
        return {
            props: {},
            revalidate: 1
        };
    }
}

export default Product;
