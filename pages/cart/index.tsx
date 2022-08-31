import React, { FunctionComponent, useState } from 'react';

import Breadcrumbs from '../../src/components/Breadcrumbs';
import Button from '../../src/components/Button';
import CartItem from '../../src/components/CartItem';
import { CheckoutApi } from '../../src/api/checkout';
import { Config } from '../../src/util/Config';
import Currency from '../../src/components/Currency';
import LanguageString from '../../src/components/LanguageString';
import { NextSeo } from 'next-seo';
import Page from '../../src/components/Page';
import PageContent from '../../src/components/PageContent';
import PageHeader from '../../src/components/PageHeader';
import PageLoader from '../../src/components/PageLoader';
import PaymentProviders from '../../src/components/PaymentProviders';
import { StoreModel } from '../../src/models/StoreModel';
import { useCart } from 'react-use-cart';

interface CartPageProps {
    store: StoreModel;
}
const CartPage: FunctionComponent<CartPageProps> = (props: any) => {
    const { store } = props;
    const cart = useCart();
    const [loading, setLoading] = useState(false);

    const currency = 'USD';
    const price = cart.items.reduce(
        (previousValue, item) => previousValue + item.price * item.quantity,
        0
    );

    return (
        <Page className="CartPage">
            <NextSeo title="Cart" />

            <PageContent>
                <Breadcrumbs
                    pages={[
                        {
                            title: <LanguageString id={'cart'} />,
                            url: '/cart'
                        }
                    ]}
                    store={store}
                    hideSocial={true}
                />

                {
                    <PageHeader
                        title="Cart"
                        subtitle="Free shipping on orders above $75!"
                    />
                }

                <div className="CartPage-Content">
                    {(cart.items?.length >= 1 && (
                        <div className="CartPage-Content-Items">
                            <div className="CartPage-Content-Items-Header">
                                <div>
                                    <LanguageString id={'product'} />
                                </div>
                                <div className="details">
                                    <LanguageString id={'details'} />
                                </div>
                                {/*<div className="actions">
                                    <LanguageString id={'actions'} />
                                </div>*/}
                                <div className="quantity">
                                    <LanguageString id={'quantity'} />
                                </div>
                                <div className="total_price">
                                    <LanguageString id={'price'} />
                                </div>
                            </div>

                            {cart.items?.map((item) => {
                                return (
                                    <CartItem
                                        key={`${item.id}_${item.variant_id}`}
                                        data={item}
                                        total_items={cart.totalItems}
                                    />
                                );
                            })}
                        </div>
                    )) || (
                        <div className="CartPage-Content-Items">
                            {!cart.items && <PageLoader />}
                        </div>
                    )}

                    <div className="CartPage-Content-Total">
                        <div className="CartPage-Content-Total-Content">
                            <div className="CartPage-Content-Total-Content-Items">
                                {cart.items?.map((line_item) => {
                                    return (
                                        <div
                                            key={line_item.id}
                                            className="CartPage-Content-Total-Content-Items-Item"
                                        >
                                            <div className="CartPage-Content-Total-Content-Items-Item-Meta">
                                                <div className="CartPage-Content-Total-Content-Items-Item-Meta-Product">
                                                    {line_item?.title || (
                                                        <LanguageString
                                                            id={'product'}
                                                        />
                                                    )}
                                                </div>
                                                <div className="CartPage-Content-Total-Content-Items-Item-Meta-Variant">
                                                    {`${line_item?.quantity}pc(s) - ${line_item?.variant_title}`}
                                                </div>
                                            </div>
                                            <div className="CartPage-Content-Total-Content-Items-Item-Prices">
                                                {line_item?.total_compare_at_price && (
                                                    <Currency
                                                        price={
                                                            line_item?.total_compare_at_price *
                                                            line_item?.quantity
                                                        }
                                                        currency={
                                                            line_item.currency
                                                        }
                                                        className="Currency-Sale"
                                                    />
                                                )}
                                                <Currency
                                                    price={
                                                        line_item?.price *
                                                        line_item?.quantity
                                                    }
                                                    currency={
                                                        line_item.currency
                                                    }
                                                    className={
                                                        line_item.total_compare_at_price &&
                                                        line_item?.price !==
                                                            line_item?.total_compare_at_price &&
                                                        'Currency-Discount'
                                                    }
                                                />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            <div className="CartPage-Content-Total-Div" />
                            <div className="CartPage-Content-Total-Notice">
                                <LanguageString id={'excl_shipping'} />
                            </div>
                            <Currency
                                className="CartPage-Content-Total-Total"
                                price={price}
                                currency={currency}
                                prefix={
                                    <>
                                        <LanguageString id={'total'} />:{' '}
                                    </>
                                }
                            />
                        </div>
                        <div className="CartPage-Content-Total-Actions">
                            <Button
                                disabled={
                                    cart.items?.length <= 0 ||
                                    !cart.items ||
                                    loading
                                }
                                onClick={async () => {
                                    setLoading(true);

                                    try {
                                        const url = (
                                            (await CheckoutApi(
                                                cart.items
                                            )) as string
                                        ).replace(
                                            Config.shopify.domain,
                                            'checkout.candybysweden.com'
                                        );

                                        /* if ((window as any)?.ga) {
                                            (window as any).ga((tracker) => {
                                                window.location.href = `${url}&${tracker.get(
                                                    'linkerParam'
                                                )}`;
                                            });
                                        } else */
                                        window.location.href = url;
                                    } catch (err) {
                                        console.error(err);
                                        alert(err.message);
                                        setLoading(false);
                                    }
                                }}
                            >
                                <LanguageString
                                    id={(loading && 'loading...') || 'checkout'}
                                />
                            </Button>
                            <PaymentProviders />
                        </div>
                    </div>
                </div>
            </PageContent>
        </Page>
    );
};

export async function getStaticProps({ locale }) {
    return {
        props: {},
        revalidate: 5
    };
}

export default CartPage;
