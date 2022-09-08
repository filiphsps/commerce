import { FiShoppingCart, FiUser, FiX } from 'react-icons/fi';
import React, { FunctionComponent, useEffect, useRef, useState } from 'react';

import Button from '../Button';
import { Config } from '../../util/Config';
import { HeaderApi } from '../../api/header';
import Image from 'next/image';
import Link from 'next/link';
import { ProductIdApi } from '../../api/product';
import SearchBar from '../SearchBar';
import styled from 'styled-components';
import { useCart } from 'react-use-cart';
import { useRouter } from 'next/router';
import useSWR from 'swr';
import { useStore } from 'react-context-hook';

const Content = styled.div`
    display: grid;
    justify-content: center;
    align-items: center;
    grid-template-columns: auto 1fr 1fr;
    gap: 4rem;
    max-width: 1465px;
    width: 100%;
    padding: 0.75rem 1.5rem;

    @media (max-width: 950px) {
        grid-template-columns: auto 1fr;
    }
`;
const Logo = styled.div`
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 1rem;
    cursor: pointer;
    background: var(--accent-primary);
    border-radius: var(--block-border-radius);

    div {
        position: relative;
        height: 2.5rem;
        width: 7rem;
    }
`;
const Navigation = styled.nav`
    display: flex;
    justify-content: flex-start;
    align-items: center;
    gap: 1.5rem;
    text-transform: uppercase;
    font-size: 1.5rem;
    letter-spacing: 0.05rem;

    @media (max-width: 950px) {
        display: none;
    }

    a {
        transition: 250ms all ease-in-out;
        cursor: pointer;
        border-bottom: solid 0.2rem transparent;
        transform: translateY(0.2rem);
        transition: 250ms ease-in-out;

        &:hover,
        &:active {
            border-bottom: solid 0.2rem var(--accent-primary);
            transform: translateY(0px);
        }

        &.Active {
            color: var(--accent-primary);
            font-weight: 700;
        }
    }
`;
const Actions = styled.div`
    display: flex;
    justify-content: flex-end;
    align-items: center;
    gap: 1rem;

    .SearchBar {
        max-width: 24rem;
        input {
            height: 3.25rem;
            border-radius: var(--block-border-radius);
            color: #0e0e0e;
        }
    }
`;

const CartIconWrapper = styled.div`
    position: relative;
    .Wrapper {
        display: flex;
        justify-content: center;
        align-items: center;
        position: relative;
        padding: 0.5rem 1rem;
        border-radius: 1.5rem;
        cursor: pointer;
        border: 0.2rem solid transparent;
    }

    .Icon {
        font-size: 1.75rem;
        line-height: 75px;
        cursor: pointer;
        transition: 250ms all ease-in-out;

        &:hover,
        &:active {
            transform: scale(1.15);
            color: var(--accent-primary);
        }
    }

    &.Active {
        .Icon {
            margin-left: 0.75rem;
        }

        .Wrapper {
            background: var(--accent-primary);
            color: var(--color-text-primary);
            border-color: var(--accent-primary);
            box-shadow: 0px 0px 10px -5px rgba(0, 0, 0, 0.25);

            &:hover,
            &:active {
                background: var(--accent-secondary-dark);
                color: var(--color-text-primary);

                .Icon {
                    color: var(--color-text-primary);
                    transform: none;
                }
            }
        }
    }
`;
const CartIcon = styled.span`
    font-size: 1.25rem;
    font-weight: 700;
    text-align: center;
    transition: 250ms all ease-in-out;
`;

const CartPopup = styled.section`
    z-index: 999;
    position: absolute;
    width: 32rem;
    padding: 1rem;
    right: -1rem;
    top: 4rem;
    background: #efefef;
    border-radius: var(--block-border-radius);
    box-shadow: 0px 0px 10px -5px rgba(0, 0, 0, 0.75);
    border: 0.2rem solid var(--accent-primary);
    opacity: 0;
    transition: 250ms ease-in-out;
    pointer-events: none;

    &.Open {
        opacity: 1;
        pointer-events: unset;
    }
`;
const CartPopupItem = styled.div`
    display: grid;
    grid-template-columns: auto 1fr;
    gap: 1rem;
    margin-bottom: 1rem;
    text-transform: uppercase;
`;
const CartPopupItemHeader = styled.div`
    display: grid;
    justify-content: center;
    align-items: center;
    grid-template-columns: 1fr auto;
    margin-bottom: 1rem;

    svg {
        font-size: 2rem;
    }
`;
const CartPopupItemTitle = styled.div`
    text-transform: uppercase;
    font-size: 1.5rem;
    font-weight: 700;
`;
const CartPopupItemImageWrapper = styled.div`
    background: #fefefe;
    border-radius: var(--block-border-radius);
    overflow: hidden;
    padding: 1rem;
`;
const CartPopupItemImage = styled.div`
    position: relative;
    width: 6rem;
    height: 6rem;
    img {
        height: 100%;
        width: 100%;
        object-fit: contain;
    }
`;
const CartPopupItemMeta = styled.div`
    display: flex;
    flex-direction: column;
    justify-content: center;
`;
const CartPopupItemMetaVendor = styled.div`
    font-size: 1.25rem;
    font-weight: 600;
    letter-spacing: 0.05rem;
    opacity: 0.75;
`;
const CartPopupItemMetaTitle = styled.div`
    font-size: 1.75rem;
    font-weight: 600;
    color: var(--accent-primary);
`;
const CartPopupItemMetaVariant = styled.div`
    display: flex;
    gap: 0.5rem;
    margin-top: 0.5rem;
`;
const Badge = styled.div`
    padding: 0.5rem;
    font-size: 0.75rem;
    background: var(--accent-secondary-dark);
    color: var(--color-text-primary);
`;

const Header = styled.header`
    display: flex;
    justify-content: center;
    align-items: center;
    background: #fefefe;
    border-bottom: 0.5rem solid var(--accent-primary);

    &.Modern {
        border: none;
        background: var(--accent-primary);

        ${Navigation} {
            color: #fefefe;

            a.Active {
                color: #fefefe;
            }
        }

        ${CartIconWrapper} {
            &.Active {
                .Wrapper {
                    background: #fefefe;
                    color: #0e0e0e;
                }
            }
        }
    }

    @media (max-width: 950px) {
        border-bottom: none;
        box-shadow: none;
    }
`;

interface HeaderProps {
    store?: any;
    navigation?: any;
}
const HeaderComponent: FunctionComponent<HeaderProps> = ({
    store,
    navigation
}) => {
    const cart = useCart();
    const router = useRouter();
    const [totalItems, setTotalItem] = useState(0);
    const [cartStore, setCartStore] = useStore<any>('cart');
    const { data } = useSWR(['header'], () => HeaderApi() as any);
    const timer = useRef(null);

    const { data: added_product } = useSWR(
        [cartStore.item?.id?.split('#')[0] || 'product'],
        () =>
            ProductIdApi({
                id: cartStore.item?.id?.split('#')[0],
                locale: router.locale
            })
    ) as any;

    useEffect(() => {
        if (totalItems === cart.totalItems) return;
        setTotalItem(cart.totalItems);
    }, [cart.totalItems]);
    useEffect(() => {
        cart.items.forEach((item) => {
            if (!item.id.includes('/')) return;

            // Clear cart if we find old product ids
            cart.emptyCart();
        });
    }, []);

    useEffect(() => {
        if (router.asPath === '/cart/')
            return setCartStore({ ...cartStore, open: false });

        if (timer.current) clearTimeout(timer.current);

        if (cartStore.open) {
            timer.current = setTimeout(() => {
                if (!cartStore.open) return;

                setCartStore({ ...cartStore, open: false });
            }, 5000);
        }

        return () => {
            clearInterval(timer.current);
            timer.current = null;
        };
    }, [cart.totalItems]);

    return (
        <Header className={data?.style === 'modern' ? 'Modern' : ''}>
            <Content>
                <Logo>
                    <div>
                        <Link href={'/'}>
                            <Image src={store?.logo?.src} layout="fill" />
                        </Link>
                    </div>
                </Logo>

                <Navigation>
                    {navigation?.map((item: any, index: number) => {
                        return (
                            <Link key={index} href={`/${item?.handle || ''}`}>
                                <a
                                    className={
                                        (router.asPath === '/' &&
                                            item?.handle === null) ||
                                        `/${item?.handle}` === router.asPath
                                            ? 'Active'
                                            : ''
                                    }
                                >
                                    {item?.title}
                                </a>
                            </Link>
                        );
                    })}
                </Navigation>

                <Actions>
                    <SearchBar />
                    <div>
                        {Config.features.accounts && (
                            <Link href={'/account'}>
                                <FiUser className="Icon" />
                            </Link>
                        )}

                        <CartIconWrapper
                            className={totalItems > 0 ? 'Active' : ''}
                        >
                            <Link href={'/cart'}>
                                <div className="Wrapper">
                                    {totalItems > 0 && (
                                        <CartIcon className="Header-Content-CartBadge">
                                            {totalItems}
                                        </CartIcon>
                                    )}
                                    <FiShoppingCart className="Icon" />
                                </div>
                            </Link>

                            {added_product && cartStore.item ? (
                                <CartPopup
                                    className={cartStore.open ? 'Open' : ''}
                                >
                                    <CartPopupItemHeader>
                                        <CartPopupItemTitle>
                                            Added to the cart
                                        </CartPopupItemTitle>
                                        <FiX
                                            style={{ cursor: 'pointer' }}
                                            onClick={() =>
                                                setCartStore({
                                                    ...cartStore,
                                                    open: false
                                                })
                                            }
                                        />
                                    </CartPopupItemHeader>
                                    <CartPopupItem>
                                        <CartPopupItemImageWrapper>
                                            <CartPopupItemImage>
                                                <Image
                                                    src={
                                                        added_product.images[0]
                                                            .src
                                                    }
                                                    layout="fill"
                                                />
                                            </CartPopupItemImage>
                                        </CartPopupItemImageWrapper>
                                        <CartPopupItemMeta>
                                            <CartPopupItemMetaVendor>
                                                {added_product.vendor.title}
                                            </CartPopupItemMetaVendor>
                                            <CartPopupItemMetaTitle>
                                                {cartStore.item.title}
                                            </CartPopupItemMetaTitle>
                                            <CartPopupItemMetaVariant>
                                                <Badge>
                                                    {
                                                        cartStore.item
                                                            .variant_title
                                                    }
                                                </Badge>
                                            </CartPopupItemMetaVariant>
                                        </CartPopupItemMeta>
                                    </CartPopupItem>
                                    <Button
                                        onClick={() => {
                                            setCartStore({
                                                ...cartStore,
                                                open: false
                                            });
                                            router.push('/cart');
                                        }}
                                    >
                                        View cart
                                    </Button>
                                </CartPopup>
                            ) : null}
                        </CartIconWrapper>
                    </div>
                </Actions>
            </Content>
        </Header>
    );
};

export default HeaderComponent;
