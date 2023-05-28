import {
    FiChevronDown,
    FiMenu,
    FiShoppingCart,
    FiUser,
    FiX
} from 'react-icons/fi';
import React, { FunctionComponent, useEffect, useRef, useState } from 'react';

import Button from '../Button';
import { Checkout } from '../../../pages/cart';
import { Config } from '../../util/Config';
import { HeaderApi } from '../../api/header';
import Image from 'next/legacy/image';
import Link from 'next/link';
import { ProductIdApi } from '../../api/product';
import SearchBar from '../SearchBar';
import { Tag } from '../../../pages/products/[handle]';
import styled from 'styled-components';
import { useCart } from 'react-use-cart';
import { useRouter } from 'next/router';
import useSWR from 'swr';
import { useStore } from 'react-context-hook';

export enum HeaderStyle {
    // eslint-disable-next-line no-unused-vars
    Modern = 'Modern',
    // eslint-disable-next-line no-unused-vars
    Simple = 'Simple'
}

const Content = styled.div`
    display: grid;
    justify-content: center;
    align-items: center;
    grid-template-columns: auto 1fr 1fr;
    gap: 1.5rem;
    max-width: 1465px;
    width: 100%;
    padding: 0.75rem 1.5rem;

    @media (max-width: 950px) {
        grid-template-columns: auto auto 1fr;
        gap: 1rem;
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
    user-select: none;

    a {
        position: relative;
        display: block;
        height: 2.5rem;
        width: 7rem;
    }
`;
const Navigation = styled.nav`
    display: flex;
    justify-content: flex-start;
    align-items: center;
    gap: 2rem;
    text-transform: uppercase;
    font-size: 1.5rem;
    letter-spacing: 0.05rem;

    @media (max-width: 950px) {
        display: none;
    }

    a {
        transition: 150ms all ease-in-out;
        cursor: pointer;
        border-bottom: solid 0.2rem transparent;
        transform: translateY(0.2rem);
        transition: 150ms ease-in-out;

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
    user-select: none;

    .Wrapper {
        display: flex;
        justify-content: center;
        align-items: center;
        position: relative;
        padding: 0.5rem 1rem;
        border-radius: 1.75rem;
        cursor: pointer;
        border: 0.2rem solid transparent;
    }

    .Icon {
        font-size: 1.75rem;
        line-height: 75px;
        cursor: pointer;
        transition: 150ms all ease-in-out;

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
    transition: 150ms all ease-in-out;
`;

const CartPopup = styled.section`
    z-index: 999;
    position: absolute;
    display: grid;
    width: 32rem;
    padding: 1.5rem;
    right: -0.5rem;
    top: 4rem;
    background: var(--accent-secondary-light);
    color: #0e0e0e;
    border-radius: var(--block-border-radius);
    box-shadow: 0px 0px 50px -10px rgba(0, 0, 0, 0.75);
    grid-template-rows: auto 1fr auto;
    gap: 1rem;
    opacity: 0;
    transition: 150ms ease-in-out;
    pointer-events: none;

    @media (min-width: 950px) {
        width: 36rem;
    }

    &.Open {
        opacity: 1;
        pointer-events: unset;
    }
`;
const CartPopupItem = styled.div`
    display: grid;
    grid-template-columns: auto 1fr;
    gap: 1rem;
    justify-content: center;
    align-items: center;
    margin-bottom: 1rem;
    text-transform: uppercase;
`;
const CartPopupItemHeader = styled.div`
    display: grid;
    justify-content: center;
    align-items: center;
    grid-template-columns: 1fr 2rem;
    gap: 0px;
    margin-bottom: 1rem;
    color: var(--color-text-primary);
    background: var(--accent-primary);
    padding: 1.25rem 1.5rem;
    border-radius: var(--block-border-radius);

    svg {
        font-size: 2rem;
    }
`;
const CartPopupItemTitle = styled.div`
    text-transform: uppercase;
    font-size: 1.25rem;
    line-height: 1.25rem;
    font-weight: 900;
    text-align: left;

    span {
        display: inline-block;
        font-size: 1.5rem;
    }
`;
const CartPopupItemImageWrapper = styled.div`
    background: #fefefe;
    border-radius: var(--block-border-radius);
    overflow: hidden;
    height: 100%;
    padding: 1rem;
`;
const CartPopupItemImage = styled.div`
    position: relative;
    width: 6rem;
    min-height: 6rem;
    height: 100%;

    img {
        height: 100%;
        width: 100%;
        object-fit: contain;
    }
`;
const CartPopupItemMeta = styled.div`
    display: grid;
    grid-template-rows: auto 1fr auto;
    gap: 0px;
    flex-direction: column;
    justify-content: start;
    width: 100%;
    height: 100%;
    padding: 1rem;
    background: #fefefe;
    border-radius: var(--block-border-radius);
`;
const CartPopupItemMetaVendor = styled.div`
    font-size: 1.25rem;
    font-weight: 600;
    letter-spacing: 0.05rem;
    opacity: 0.75;
    color: #404756;
`;
const CartPopupItemMetaTitle = styled.div`
    margin-bottom: 1rem;
    font-size: 2.15rem;
    line-height: 2.25rem;
    font-weight: 600;
    color: var(--accent-primary);
`;
const CartPopupItemMetaVariant = styled.div`
    display: flex;
    align-items: flex-end;
`;
const CartPopupContent = styled.div`
    display: grid;
    grid-template-columns: 1fr auto;
    gap: 1rem;
    width: 100%;
`;

const NavigationItemChildren = styled.div`
    overflow: hidden;
    position: fixed;
    top: 4rem;
    left: 0px;
    right: 0px;
    height: 0px;
    transition: 150ms ease-in-out;
    opacity: 0;
`;

const NavigationItem = styled.div`
    display: flex;
    justify-content: center;
    align-items: flex-start;
    gap: 0.25rem;
    height: 2rem;
    svg {
        font-size: 1.25rem;
        line-height: 100%;
    }
`;
const NavigationItemChildrenWrapper = styled.div`
    background: #fefefe;
    border-bottom: 0.5rem solid var(--accent-primary);
`;
const NavigationItemChildrenContainer = styled.div`
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(16rem, 1fr));
    gap: 1rem;
    padding: 2rem;
    max-width: 1465px;
    margin: 0px auto;

    ${NavigationItem} {
        overflow: hidden;
        height: auto;
        background: #efefef;
        border-radius: var(--block-border-radius);
        font-size: 1.25rem;
        font-weight: 600;
        text-align: center;

        a {
            display: block;
            width: 100%;
            padding: 1rem;
        }
    }
`;

const HamburgerMenu = styled.div`
    display: flex;
    justify-content: center;
    align-items: center;
    height: 100%;
    width: 4rem;
    margin: 0px -0.75rem 0px -1.25rem;
    font-size: 2.5rem;
    cursor: pointer;

    @media (min-width: 950px) {
        display: none;
    }
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
        top: 8rem;
        height: 6rem;
        ${Navigation} {
            color: #fefefe;

            a.Active {
                color: #fefefe;
            }
        }

        ${NavigationItemChildren} {
            ${NavigationItemChildrenContainer} {
                ${NavigationItem} {
                    color: #0e0e0e;
                }
            }
        }

        ${CartIconWrapper} {
            color: #fefefe;

            &.Active {
                .Wrapper {
                    background: #fefefe;
                    color: #0e0e0e;
                    padding: 0.75rem 1.25rem;

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
        }

        ${Actions}, ${HamburgerMenu} {
            color: #fefefe;
        }

        .SearchBar {
            input {
                border-width: 0px;
                height: 3.25rem;
            }
        }

        ${Logo} {
            padding: 0px;
            padding-right: 1rem;

            @media (max-width: 950px) {
                padding-right: 0.25rem;
            }
        }

        ${CartPopup} {
            top: 5.5rem;
        }
    }

    &:hover {
        ${NavigationItem} {
            &:hover {
                ${NavigationItemChildren} {
                    height: auto;
                    opacity: 1;
                    padding: 2.6rem 0px;
                }
            }
        }
    }
`;

interface HeaderProps {
    store?: any;
    navigation?: any;
    sidebarToggle?: any;
    sidebarOpen?: boolean;
}
const HeaderComponent: FunctionComponent<HeaderProps> = ({
    store,
    navigation,
    sidebarToggle,
    sidebarOpen
}) => {
    const cart = useCart();
    const router = useRouter();
    const [totalItems, setTotalItem] = useState(0);
    const [beginCheckout, setBeginCheckout] = useState(false);
    const [cartStore, setCartStore] = useStore<any>('cart');
    const { data } = useSWR(['header'], () => HeaderApi(router.locale) as any);
    const timer: any = useRef(null);

    // TODO: Switch-case
    const style =
        data?.style?.toLowerCase() === 'modern'
            ? HeaderStyle.Modern
            : HeaderStyle.Simple;

    const { data: added_product } = useSWR(
        [cartStore.item?.id?.split('#')[0] || 'product'],
        () =>
            ProductIdApi({
                id: cartStore.item?.id?.split('#')[0],
                locale: router?.locale
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
        <Header className={style}>
            <Content>
                <HamburgerMenu onClick={() => sidebarToggle?.()}>
                    {sidebarOpen ? <FiX /> : <FiMenu />}
                </HamburgerMenu>

                <Logo>
                    <Link href={'/'}>
                        <Image
                            src={store?.logo?.src}
                            layout="fill"
                            alt="Logo"
                        />
                    </Link>
                </Logo>

                <Navigation>
                    {navigation?.map((item: any, index) => {
                        return (
                            <NavigationItem key={item.handle + `${index}`}>
                                <Link
                                    href={`/${item?.handle || ''}`}
                                    title={item.title}
                                    className={
                                        (router.asPath === '/' &&
                                            item?.handle === null) ||
                                        `/${item?.handle}` === router.asPath
                                            ? 'Active'
                                            : ''
                                    }
                                >
                                    {item?.title}{' '}
                                    {item?.children?.length > 0 ? (
                                        <FiChevronDown />
                                    ) : null}
                                </Link>
                                {item.children.length ? (
                                    <NavigationItemChildren>
                                        <NavigationItemChildrenWrapper>
                                            <NavigationItemChildrenContainer>
                                                {item.children.map(
                                                    (item, index) => (
                                                        <NavigationItem
                                                            key={
                                                                item.handle +
                                                                `${index}`
                                                            }
                                                        >
                                                            <Link
                                                                href={`/${
                                                                    item?.handle ||
                                                                    ''
                                                                }`}
                                                                title={
                                                                    item.title
                                                                }
                                                                className={
                                                                    (router.asPath ===
                                                                        '/' &&
                                                                        item?.handle ===
                                                                            null) ||
                                                                    `/${item?.handle}` ===
                                                                        router.asPath
                                                                        ? 'Active'
                                                                        : ''
                                                                }
                                                            >
                                                                {item.title}
                                                            </Link>
                                                        </NavigationItem>
                                                    )
                                                )}
                                            </NavigationItemChildrenContainer>
                                        </NavigationItemChildrenWrapper>
                                    </NavigationItemChildren>
                                ) : null}
                            </NavigationItem>
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
                            <Link href={'/cart/'} className="Wrapper">
                                {totalItems > 0 && (
                                    <CartIcon className="Header-Content-CartBadge">
                                        {totalItems}
                                    </CartIcon>
                                )}
                                <FiShoppingCart className="Icon" />
                            </Link>

                            {added_product && cartStore.item ? (
                                <CartPopup
                                    className={
                                        (cartStore.open || beginCheckout) &&
                                        router.asPath !== '/cart/'
                                            ? 'Open'
                                            : ''
                                    }
                                >
                                    <CartPopupItemHeader>
                                        <CartPopupItemTitle>
                                            <span>✓</span> Added to the cart
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
                                                <Tag>
                                                    {
                                                        cartStore.item
                                                            .variant_title
                                                    }
                                                </Tag>
                                            </CartPopupItemMetaVariant>
                                        </CartPopupItemMeta>
                                    </CartPopupItem>
                                    <CartPopupContent>
                                        <Link
                                            href="/cart"
                                            onClick={() => {
                                                setCartStore({
                                                    ...cartStore,
                                                    open: false
                                                });
                                            }}
                                        >
                                            <Button
                                                className="Secondary"
                                                disabled={beginCheckout}
                                            >
                                                View cart
                                            </Button>
                                        </Link>
                                        <Button
                                            disabled={beginCheckout}
                                            onClick={async () => {
                                                try {
                                                    if (beginCheckout) return;

                                                    setBeginCheckout(true);

                                                    await Checkout({
                                                        data: cart,
                                                        locale: router.locale,
                                                        price: cart.items.reduce(
                                                            (
                                                                previousValue,
                                                                item
                                                            ) =>
                                                                previousValue +
                                                                item.price *
                                                                    (item.quantity ||
                                                                        1),
                                                            0
                                                        )
                                                    });
                                                } catch (error) {
                                                    console.error(error);
                                                    alert(error.message);
                                                    setBeginCheckout(false);
                                                }
                                            }}
                                        >
                                            Checkout
                                        </Button>
                                    </CartPopupContent>
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
