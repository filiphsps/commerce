import React, { FunctionComponent, useState } from 'react';

import Breadcrumbs from '../../src/components/Breadcrumbs';
import Button from '../../src/components/Button';
import CartItem from '../../src/components/CartItem';
import { CheckoutApi } from '../../src/api';
import Currency from '../../src/components/Currency';
import Head from 'next/head';
import LanguageString from '../../src/components/LanguageString';
import Page from '../../src/components/Page';
import PageContent from '../../src/components/PageContent';
import PageHeader from '../../src/components/PageHeader';
import PageLoader from '../../src/components/PageLoader';
import PaymentProviders from '../../src/components/PaymentProviders';
import { StoreModel } from '../../src/models/StoreModel';
import { useStore } from 'react-context-hook';

interface CartPageProps {
    store: StoreModel;
}
const CartPage: FunctionComponent<CartPageProps> = (props: any) => {
    const { store } = props;
    const [cart] = useStore<any>('cart');
    const [loading, setLoading] = useState(false);

    const savings = cart?.price - (cart?.price_with_savings || 0);
    return (
        <Page className="CartPage">
            <Head>
                <title>Cart | {store?.name}</title>
            </Head>

            <PageContent>
                <Breadcrumbs
                    pages={[
                        {
                            title: <LanguageString id={'cart'} />,
                            url: '/cart'
                        }
                    ]}
                    store={store}
                />

                <PageHeader
                    title={
                        <>
                            <LanguageString id={'cart'} />{' '}
                            {cart?.total_items >= 1 && `(${cart?.total_items})`}
                        </>
                    }
                />

                <div className="CartPage-Content">
                    {(cart?.items?.length >= 1 && (
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

                            {cart?.items?.map((item) => {
                                return (
                                    <CartItem
                                        key={`${item.id}_${item.variant_id}`}
                                        data={item}
                                        total_items={cart?.total_items}
                                    />
                                );
                            })}
                        </div>
                    )) || (
                        <div className="CartPage-Content-Items">
                            {!cart?.items && <PageLoader />}
                        </div>
                    )}

                    <div className="CartPage-Content-Total">
                        <div className="CartPage-Content-Total-Content">
                            <div className="CartPage-Content-Total-Content-Items">
                                {cart?.items?.map((line_item) => {
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
                                                    <LanguageString
                                                        id={
                                                            line_item?.variant_title ||
                                                            'variant'
                                                        }
                                                    />
                                                </div>
                                            </div>
                                            <div className="CartPage-Content-Total-Content-Items-Item-Prices">
                                                {line_item?.total_compare_at_price && (
                                                    <Currency
                                                        price={
                                                            line_item?.total_compare_at_price
                                                        }
                                                        currency={
                                                            cart?.currency
                                                        }
                                                        className="Currency-Sale"
                                                    />
                                                )}
                                                <Currency
                                                    price={
                                                        line_item?.total_price
                                                    }
                                                    currency={cart?.currency}
                                                    className={
                                                        line_item.total_compare_at_price &&
                                                        line_item?.total_price !==
                                                            line_item?.total_compare_at_price &&
                                                        'Currency-Discount'
                                                    }
                                                />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            <Currency
                                className="CartPage-Content-Total-Before"
                                price={cart?.price}
                                currency={cart?.currency}
                            />
                            {savings > 0 && (
                                <Currency
                                    className="CartPage-Content-Total-Discount"
                                    price={savings}
                                    currency={cart?.currency}
                                    prefix={'-'}
                                    suffix={
                                        <>
                                            (
                                            {Math.ceil(
                                                (savings / cart?.price) * 100
                                            ) || 0}
                                            % <LanguageString id={'discount'} />
                                            )
                                        </>
                                    }
                                />
                            )}

                            <div className="CartPage-Content-Total-Div" />
                            <LanguageString id={'incl_vat'} />
                            <Currency
                                className="CartPage-Content-Total-Total"
                                price={cart?.price_with_savings}
                                currency={cart?.currency}
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
                                    cart?.items?.length <= 0 ||
                                    !cart?.items ||
                                    loading
                                }
                                onClick={async () => {
                                    try {
                                        const url = (
                                            (await CheckoutApi(cart)) as string
                                        ).replace(
                                            'candy-by-sweden.myshopify.com',
                                            'checkout.candybysweden.com'
                                        );

                                        if ((window as any)?.ga) {
                                            (window as any).ga((tracker) => {
                                                window.location.href = `${url}&${tracker.get(
                                                    'linkerParam'
                                                )}`;
                                            });
                                        } else window.location.href = url;
                                    } catch (err) {
                                        console.error(err);
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

export default CartPage;
